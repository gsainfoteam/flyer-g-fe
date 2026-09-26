import type {
  DeviceList,
  DisplayDeviceDto,
} from "@/entities/device/model/types";
import { toDisplayDevice } from "@/entities/device/model/types";
import {
  getCategoryName,
  resolveEffectiveStatus,
  summarizeSubmissions,
  toSignageSubmissionExpanded,
} from "@/entities/submission";
import type {
  Page,
  SignageSubmissionExpanded,
  SignageSubmissionExpandedDto,
  SubmissionListParams,
  SubmissionStatus,
  SubmissionSummary,
} from "@/entities/submission/model/types";
import type { Review, ReviewDto } from "@/entities/review/model/types";
import { toPlaylist } from "@/entities/playlist";
import type { Playlist } from "@/entities/playlist/model/types";
import { hasAnyRole } from "@/features/auth/model/types";
import type { SessionUser } from "@/features/auth/model/types";
import { getMockAssetUrl } from "@/features/media-upload/api/fake-upload-service";
import { findMockNoticeDetails } from "@/features/ziggle-notice/api/mock-notices";
import { ApiError, codeForStatus } from "@/shared/api/error";
import type {
  ApproveInput,
  CancelSubmissionInput,
  CreateSubmissionInput,
  DeviceRepository,
  DisplayRepository,
  MutationOptions,
  RejectInput,
  Repositories,
  ReviewRepository,
  SubmissionRepository,
  SuspendInput,
  UpdateSubmissionInput,
} from "@/shared/api/repositories";
import type { Clock } from "@/shared/lib/clock";
import { systemClock } from "@/shared/lib/clock";
import { parseIsoUtc, toIsoUtc } from "@/shared/lib/datetime";
import {
  DEVICE_FIXTURES,
  TARGET_GROUP_FIXTURES,
  createReviewFixtures,
  createSubmissionFixtures,
} from "./fixtures";
import { createStorageHeartbeatLog } from "./heartbeats";
import type { HeartbeatLog } from "./heartbeats";
import { withInjection } from "./injection";
import { MOCK_USERS } from "./users";

/**
 * 개발·테스트용 in-memory 구현. 실제 서버 대신 같은 repository 인터페이스를 만족한다.
 *
 * 화면이 실제 서버에서 만날 응답을 미리 겪도록, 서버 계약(`API-REQUIREMENTS.md`)의
 * 규칙을 흉내 낸다. 세션 사용자로 조회 범위와 소유권을 판단하고, 권한이 없으면
 * 403, 세션이 없으면 401을 준다. mock이 서버보다 관대하면 권한·충돌 버그가 숨는다.
 */
const DEFAULT_PAGE_SIZE = 8;

/** 이 시간 안에 heartbeat가 있으면 온라인이다. 명세 9.7 경보 기준(5분)과 같다. */
const ONLINE_WINDOW_MS = 5 * 60 * 1000;
/** 정상 기기가 heartbeat를 보내는 간격. 플레이어(`use-device-telemetry`)와 같다. */
const HEARTBEAT_INTERVAL_MS = 60 * 1000;

/** 같은 공지로 다시 신청할 수 없는 상태. 끝났거나 취소된 건은 새로 신청할 수 있다. */
const CLOSED_STATUSES: readonly SubmissionStatus[] = [
  "ENDED",
  "CANCELED",
  "ARCHIVED",
];

function httpError(
  status: number,
  message: string,
  fields?: Record<string, string>,
): ApiError {
  return new ApiError({
    kind: "http",
    code: codeForStatus(status),
    message,
    status,
    requestId: "mock-request",
    fields,
  });
}

const notFound = (id: string) => httpError(404, `신청을 찾을 수 없습니다: ${id}`);
const conflict = (message: string) => httpError(409, message);
const invalid = (message: string, fields?: Record<string, string>) =>
  httpError(422, message, fields);
const forbidden = (message = "이 작업을 수행할 권한이 없습니다.") =>
  httpError(403, message);
const unauthenticated = () => httpError(401, "로그인이 필요합니다.");

class MockStore {
  private submissions: SignageSubmissionExpandedDto[];
  private reviews: ReviewDto[];
  private readonly seenIdempotencyKeys = new Map<string, string>();
  private readonly inFlightCreates = new Map<
    string,
    Promise<SignageSubmissionExpanded>
  >();

  constructor(now: Date) {
    this.submissions = createSubmissionFixtures(now);
    this.reviews = createReviewFixtures(now);
  }

  all(): SignageSubmissionExpandedDto[] {
    return this.submissions;
  }

  find(id: string): SignageSubmissionExpandedDto {
    const found = this.submissions.find((item) => item.id === id);
    if (!found) throw notFound(id);
    return found;
  }

  replace(next: SignageSubmissionExpandedDto): SignageSubmissionExpandedDto {
    this.submissions = this.submissions.map((item) =>
      item.id === next.id ? next : item,
    );
    return next;
  }

  insert(next: SignageSubmissionExpandedDto): SignageSubmissionExpandedDto {
    this.submissions = [next, ...this.submissions];
    return next;
  }

  reviewsOf(submissionId: string): ReviewDto[] {
    return this.reviews.filter((item) => item.submissionId === submissionId);
  }

  addReview(review: ReviewDto): void {
    this.reviews = [...this.reviews, review];
  }

  /**
   * 같은 key로 두 번 요청해도 한 번만 처리된다. (`API-REQUIREMENTS.md` 1.3)
   * key는 요청 종류별로 나눠 기억한다. 생성 key와 제출 key가 우연히 같아도
   * 서로 다른 요청이다.
   */
  rememberIdempotency(scope: string, key: string | undefined, id: string): void {
    if (key) this.seenIdempotencyKeys.set(`${scope}:${key}`, id);
  }

  resolveIdempotency(scope: string, key: string | undefined): string | null {
    if (!key) return null;
    return this.seenIdempotencyKeys.get(`${scope}:${key}`) ?? null;
  }

  /**
   * 아직 끝나지 않은 같은 key의 생성 요청.
   *
   * 완료된 요청만 기억하면 더블 클릭처럼 겹쳐 들어온 두 요청이 모두 통과한다.
   * 실제 서버도 key 단위로 직렬화해야 하는 지점이다.
   */
  pendingCreate(key: string): Promise<SignageSubmissionExpanded> | null {
    return this.inFlightCreates.get(key) ?? null;
  }

  rememberPendingCreate(
    key: string,
    running: Promise<SignageSubmissionExpanded>,
  ): void {
    this.inFlightCreates.set(key, running);
    void running.finally(() => this.inFlightCreates.delete(key));
  }
}

function paginate(
  items: SignageSubmissionExpandedDto[],
  params: SubmissionListParams,
  serverTime: Date,
): Page<SignageSubmissionExpanded> {
  const limit = params.limit ?? DEFAULT_PAGE_SIZE;
  const offset = params.cursor ? Number(params.cursor) : 0;
  const start = Number.isFinite(offset) && offset > 0 ? offset : 0;
  const slice = items.slice(start, start + limit);
  const nextOffset = start + limit;

  return {
    items: slice.map(toSignageSubmissionExpanded),
    nextCursor: nextOffset < items.length ? String(nextOffset) : null,
    totalCount: items.length,
    serverTime,
  };
}

function touch(
  dto: SignageSubmissionExpandedDto,
  now: Date,
  overrides: Partial<SignageSubmissionExpandedDto>,
): SignageSubmissionExpandedDto {
  return {
    ...dto,
    ...overrides,
    updatedAt: toIsoUtc(now),
    version: dto.version + 1,
  };
}

function toReview(dto: ReviewDto): Review {
  return { ...dto, reviewedAt: parseIsoUtc(dto.reviewedAt) };
}

/** 편성 내용이 같으면 같은 값이 나온다. 개수만 보면 교체를 놓친다. */
function hashPlaylist(items: SignageSubmissionExpanded[]): string {
  const source = items
    .map((item) => `${item.id}@${item.version}`)
    .sort()
    .join("|");
  let hash = 5381;
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) + hash + source.charCodeAt(index)) >>> 0;
  }
  return `mock-${hash.toString(36)}`;
}

function isReviewer(user: SessionUser): boolean {
  return hasAnyRole(user, ["REVIEWER", "SUPER_ADMIN"]);
}

export interface MockRepositoryOptions {
  clock?: Clock;
  /** 개발 환경에서 로딩 상태를 확인하기 위한 지연. 테스트에서는 0으로 둔다. */
  latencyMs?: number;
  /**
   * 요청한 사람. 실제 서버는 세션 쿠키로 안다.
   *
   * 생략하면 권한과 조회 범위를 검사하지 않는다. 상태 전이처럼 권한과 무관한
   * 동작만 확인하는 단위 테스트용이다. 앱과 route 테스트는 mock 세션을 연결한다.
   */
  session?: () => SessionUser | null;
  /** TV 탭이 남긴 heartbeat. 기본은 탭 사이에 공유되는 localStorage다. */
  heartbeats?: HeartbeatLog;
}

export function createMockRepositories(
  options: MockRepositoryOptions = {},
): Repositories {
  const clock = options.clock ?? systemClock;
  const latencyMs = options.latencyMs ?? 0;
  const heartbeats = options.heartbeats ?? createStorageHeartbeatLog();
  const startedAt = clock.now();
  const store = new MockStore(startedAt);

  const settle = async (signal?: AbortSignal): Promise<void> => {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, latencyMs));
    }
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  };

  /** 요청한 사람. 세션을 연결하지 않았으면 null이며 권한을 검사하지 않는다. */
  const actor = (): SessionUser | null => {
    if (!options.session) return null;
    const user = options.session();
    if (!user) throw unauthenticated();
    return user;
  };

  const requireReviewer = (): SessionUser => {
    const user = actor();
    if (user && !isReviewer(user)) {
      throw forbidden("하우스 관리자만 할 수 있는 작업입니다.");
    }
    return user ?? MOCK_USERS.REVIEWER;
  };

  /** 본인 신청이거나 관리자면 볼 수 있다. (명세 3.2 "본인 신청 조회") */
  const findVisible = (id: string): SignageSubmissionExpandedDto => {
    const user = actor();
    const found = store.find(id);
    if (user && found.requesterId !== user.id && !isReviewer(user)) {
      throw forbidden("이 신청을 볼 권한이 없습니다.");
    }
    return found;
  };

  /** 신청을 고치고 내리는 것은 본인만 한다. 관리자도 남의 신청을 대신 고치지 않는다. */
  const findOwned = (id: string): SignageSubmissionExpandedDto => {
    const user = actor();
    const found = store.find(id);
    if (user && found.requesterId !== user.id) {
      throw forbidden("본인 신청만 바꿀 수 있습니다.");
    }
    return found;
  };

  /** scope가 all이면 관리자만, me(기본)면 본인 신청만. */
  const inScope = (
    scope: SubmissionListParams["scope"],
  ): SignageSubmissionExpandedDto[] => {
    if (scope === "all") {
      requireReviewer();
      return store.all();
    }
    const user = actor();
    return user
      ? store.all().filter((item) => item.requesterId === user.id)
      : store.all();
  };

  const runCreate = async (
    input: CreateSubmissionInput,
    mutationOptions?: MutationOptions,
  ): Promise<SignageSubmissionExpanded> => {
    await settle(mutationOptions?.signal);
    const user = actor() ?? MOCK_USERS.SUBMITTER;
    const existingId = store.resolveIdempotency(
      "create",
      mutationOptions?.idempotencyKey,
    );
    if (existingId) {
      return toSignageSubmissionExpanded(store.find(existingId));
    }

    if (input.endAt.getTime() <= input.startAt.getTime()) {
      // 실서버 계약처럼 필드 단위 오류를 담는다. (`API-REQUIREMENTS.md` 1.2)
      throw invalid("종료 시각은 시작 시각보다 뒤여야 합니다.", {
        endAt: "종료 시각은 시작 시각보다 뒤여야 합니다.",
      });
    }

    const now = clock.now();
    // 공지 하나에는 진행 중인 신청 하나만 있다. 반려된 건은 새로 만들지 않고
    // 고쳐서 다시 제출한다. (명세 FR-INT-01)
    const duplicate = store
      .all()
      .find(
        (item) =>
          item.ziggleNoticeId === input.ziggleNoticeId &&
          !CLOSED_STATUSES.includes(
            resolveEffectiveStatus(toSignageSubmissionExpanded(item), now),
          ),
      );
    if (duplicate) {
      throw conflict("이 공지로 진행 중인 신청이 이미 있습니다.");
    }

    // 조직·부제·장소는 연결한 공지에서 서버가 채운다.
    const notice = findMockNoticeDetails(input.ziggleNoticeId);
    const id = `submission-${store.all().length + 1}-${now.getTime()}`;
    const created: SignageSubmissionExpandedDto = {
      id,
      ziggleNoticeId: input.ziggleNoticeId,
      requesterId: user.id,
      organizationId: null,
      type: "POSTER",
      title: input.title,
      categoryId: input.categoryId,
      assetId: input.assetId,
      detailUrl: input.detailUrl,
      startAt: toIsoUtc(input.startAt),
      endAt: toIsoUtc(input.endAt),
      status: "DRAFT",
      priority: 0,
      targetGroupIds: input.targetGroupIds,
      createdAt: toIsoUtc(now),
      updatedAt: toIsoUtc(now),
      version: 1,
      categoryName: getCategoryName(input.categoryId),
      organizationName: notice?.organizationName ?? user.displayName,
      // 실제 서버는 assetId로 저장소 URL을 돌려준다. mock은 방금 올린 미리보기를 쓴다.
      posterUrl: getMockAssetUrl(input.assetId) ?? "",
      subtitle: notice?.summary ?? null,
      location: notice?.location ?? null,
      description: null,
    };
    store.insert(created);
    store.rememberIdempotency("create", mutationOptions?.idempotencyKey, id);
    return toSignageSubmissionExpanded(created);
  };

  const submissions: SubmissionRepository = {
    async list(params, signal) {
      await settle(signal);
      const now = clock.now();
      const filtered = inScope(params.scope).filter((item) => {
        const effective = resolveEffectiveStatus(
          toSignageSubmissionExpanded(item),
          now,
        );
        if (params.statuses && params.statuses.length > 0) {
          return params.statuses.includes(effective);
        }
        if (!params.status || params.status === "ALL") {
          // 보관은 운영 목록에서 숨긴다. 명시적으로 요청할 때만 보여준다. (명세 6.3)
          return effective !== "ARCHIVED";
        }
        return effective === params.status;
      });
      return paginate(filtered, params, now);
    },

    async getById(id, signal) {
      await settle(signal);
      return toSignageSubmissionExpanded(findVisible(id));
    },

    async getSummary(params, signal) {
      await settle(signal);
      const now = clock.now();
      return summarizeSubmissions(
        inScope(params.scope).map(toSignageSubmissionExpanded),
        now,
      ) satisfies SubmissionSummary;
    },

    async create(input: CreateSubmissionInput, mutationOptions?: MutationOptions) {
      const key = mutationOptions?.idempotencyKey;
      if (key) {
        const pending = store.pendingCreate(key);
        if (pending) return pending;
      }

      const running = runCreate(input, mutationOptions);
      if (key) store.rememberPendingCreate(key, running);
      return running;
    },

    async update(id, input: UpdateSubmissionInput, mutationOptions) {
      await settle(mutationOptions?.signal);
      const current = findOwned(id);
      // 제출 전 상태만 자유롭게 고칠 수 있다. 승인 후 변경의 재승인 정책은
      // 서버 몫이며 mock은 흉내 내지 않는다. (명세 FR-INT-02)
      if (current.status !== "DRAFT" && current.status !== "REJECTED") {
        throw conflict("제출 전 상태에서만 수정할 수 있습니다.");
      }
      if (current.version !== input.version) {
        throw conflict("다른 곳에서 먼저 수정했습니다. 새로 고침해 주세요.");
      }

      const startAt = input.startAt ?? parseIsoUtc(current.startAt);
      const endAt = input.endAt ?? parseIsoUtc(current.endAt);
      if (endAt.getTime() <= startAt.getTime()) {
        throw invalid("종료 시각은 시작 시각보다 뒤여야 합니다.", {
          endAt: "종료 시각은 시작 시각보다 뒤여야 합니다.",
        });
      }

      const next = touch(current, clock.now(), {
        title: input.title ?? current.title,
        categoryId: input.categoryId ?? current.categoryId,
        categoryName: input.categoryId
          ? getCategoryName(input.categoryId)
          : current.categoryName,
        assetId: input.assetId ?? current.assetId,
        posterUrl: input.assetId
          ? (getMockAssetUrl(input.assetId) ?? current.posterUrl)
          : current.posterUrl,
        detailUrl: input.detailUrl ?? current.detailUrl,
        startAt: toIsoUtc(startAt),
        endAt: toIsoUtc(endAt),
        targetGroupIds: input.targetGroupIds ?? current.targetGroupIds,
      });
      return toSignageSubmissionExpanded(store.replace(next));
    },

    async submit(id, mutationOptions) {
      await settle(mutationOptions?.signal);
      const current = findOwned(id);
      // 응답을 못 받아 같은 key로 다시 보낸 제출은 처음 결과를 돌려준다.
      if (store.resolveIdempotency("submit", mutationOptions?.idempotencyKey) === id) {
        return toSignageSubmissionExpanded(current);
      }
      if (current.status !== "DRAFT" && current.status !== "REJECTED") {
        throw conflict("제출할 수 있는 상태가 아닙니다.");
      }
      const submitted = store.replace(
        touch(current, clock.now(), { status: "PENDING_REVIEW" }),
      );
      store.rememberIdempotency("submit", mutationOptions?.idempotencyKey, id);
      return toSignageSubmissionExpanded(submitted);
    },

    async cancel(id, input: CancelSubmissionInput, mutationOptions) {
      await settle(mutationOptions?.signal);
      const current = findOwned(id);
      const cancelable = ["PENDING_REVIEW", "REJECTED", "SCHEDULED"];
      if (!cancelable.includes(current.status)) {
        throw conflict("이미 게시가 시작되어 취소할 수 없습니다.");
      }
      if (current.version !== input.version) {
        throw conflict("다른 곳에서 먼저 바뀌었습니다. 새로 고침해 주세요.");
      }
      return toSignageSubmissionExpanded(
        store.replace(touch(current, clock.now(), { status: "CANCELED" })),
      );
    },
  };

  const reviewerOf = (user: SessionUser) => ({
    reviewerId: user.id,
    reviewerName: user.displayName,
  });

  const reviews: ReviewRepository = {
    async listPending(params, signal) {
      await settle(signal);
      requireReviewer();
      // 오래 기다린 순. 관리자가 먼저 처리해야 하는 건이 위로 온다.
      const pending = store
        .all()
        .filter((item) => item.status === "PENDING_REVIEW")
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return paginate(pending, params, clock.now());
    },

    async listHistory(submissionId, signal) {
      await settle(signal);
      findVisible(submissionId);
      return store.reviewsOf(submissionId).map(toReview);
    },

    async approve(input: ApproveInput, mutationOptions?: MutationOptions) {
      await settle(mutationOptions?.signal);
      const reviewer = requireReviewer();
      const current = store.find(input.submissionId);
      if (current.status !== "PENDING_REVIEW") {
        throw conflict("다른 관리자가 이미 처리했습니다.");
      }
      if (current.version !== input.revision) {
        throw conflict("검토한 버전이 최신이 아닙니다.");
      }

      const now = clock.now();
      const status =
        parseIsoUtc(current.startAt).getTime() > now.getTime()
          ? "SCHEDULED"
          : "PUBLISHED";
      store.addReview({
        id: `review-${now.getTime()}`,
        submissionId: current.id,
        revision: current.version,
        decision: "APPROVED",
        reasonCode: null,
        comment: null,
        ...reviewerOf(reviewer),
        reviewedAt: toIsoUtc(now),
      });
      return toSignageSubmissionExpanded(
        store.replace(touch(current, now, { status })),
      );
    },

    async reject(input: RejectInput, mutationOptions?: MutationOptions) {
      await settle(mutationOptions?.signal);
      const reviewer = requireReviewer();
      if (input.comment.trim().length === 0) {
        throw invalid("반려 사유를 입력해야 합니다.", {
          comment: "반려 사유를 입력해야 합니다.",
        });
      }
      const current = store.find(input.submissionId);
      if (current.status !== "PENDING_REVIEW") {
        throw conflict("다른 관리자가 이미 처리했습니다.");
      }
      if (current.version !== input.revision) {
        throw conflict("검토한 버전이 최신이 아닙니다.");
      }

      const now = clock.now();
      store.addReview({
        id: `review-${now.getTime()}`,
        submissionId: current.id,
        revision: current.version,
        decision: "REJECTED",
        reasonCode: input.reasonCode,
        comment: input.comment,
        ...reviewerOf(reviewer),
        reviewedAt: toIsoUtc(now),
      });
      return toSignageSubmissionExpanded(
        store.replace(touch(current, now, { status: "REJECTED" })),
      );
    },

    async suspend(input: SuspendInput, mutationOptions?: MutationOptions) {
      await settle(mutationOptions?.signal);
      const reviewer = requireReviewer();
      if (input.reason.trim().length === 0) {
        throw invalid("중단 사유를 입력해야 합니다.", {
          reason: "중단 사유를 입력해야 합니다.",
        });
      }
      const current = store.find(input.submissionId);
      const suspendable = ["APPROVED", "SCHEDULED", "PUBLISHED"];
      if (!suspendable.includes(current.status)) {
        throw conflict("예약 또는 게시 중인 콘텐츠만 중단할 수 있습니다.");
      }
      const now = clock.now();
      // 중단 사유는 게시자에게 표시되어야 한다(FR-REV-05). 검토 이력에 남긴다.
      store.addReview({
        id: `review-${now.getTime()}`,
        submissionId: current.id,
        revision: current.version,
        decision: "SUSPENDED",
        reasonCode: null,
        comment: input.reason,
        ...reviewerOf(reviewer),
        reviewedAt: toIsoUtc(now),
      });
      return toSignageSubmissionExpanded(
        store.replace(touch(current, now, { status: "SUSPENDED" })),
      );
    },
  };

  const displays: DisplayRepository = {
    async getPlaylist(deviceId, signal): Promise<Playlist> {
      await settle(signal);
      const now = clock.now();
      // 기기는 자기 위치가 대상인 게시물만 받는다. 등록되지 않은 id(미리보기)는
      // 모든 위치의 게시물을 본다.
      const device = DEVICE_FIXTURES.find((item) => item.id === deviceId);
      const playable = store
        .all()
        .map(toSignageSubmissionExpanded)
        .filter(
          (item) =>
            resolveEffectiveStatus(item, now) === "PUBLISHED" &&
            item.posterUrl.length > 0 &&
            (!device ||
              item.targetGroupIds.length === 0 ||
              item.targetGroupIds.some((id) => device.groupIds.includes(id))),
        );

      return toPlaylist({
        serverTime: toIsoUtc(now),
        playlistVersion: hashPlaylist(playable),
        refreshAfterSeconds: 60,
        layout: { type: "SINGLE", rotationSeconds: 10 },
        items: playable.map((item) => ({
          submissionId: item.id,
          revision: item.version,
          title: item.title,
          category: item.categoryName,
          assetUrl: item.posterUrl,
          detailUrl: item.detailUrl,
          startsAt: toIsoUtc(item.startAt),
          endsAt: toIsoUtc(item.endAt),
          priority: item.priority,
          checksum: `mock-${item.id}`,
          subtitle: item.subtitle,
          location: item.location,
          organizerName: item.organizationName,
        })),
      });
    },
  };

  const devices: DeviceRepository = {
    async list(signal): Promise<DeviceList> {
      await settle(signal);
      requireReviewer();
      const now = clock.now();
      const recorded = heartbeats.read();

      const items = DEVICE_FIXTURES.map(({ silentSinceMs, ...device }) => {
        // 정상 기기는 1분마다 heartbeat를 보낸다고 치고, 끊긴 기기는 끊긴
        // 시점에 멈춰 있다. 실제 TV 탭이 보낸 기록이 더 최근이면 그것을 쓴다.
        const simulated =
          silentSinceMs === null
            ? now.getTime() - (now.getTime() % HEARTBEAT_INTERVAL_MS)
            : startedAt.getTime() - silentSinceMs;
        const heartbeat = recorded[device.id];
        const heartbeatAt = heartbeat ? Date.parse(heartbeat.at) : Number.NaN;
        const lastSeen =
          Number.isFinite(heartbeatAt) && heartbeatAt > simulated
            ? heartbeatAt
            : simulated;

        const dto: DisplayDeviceDto = {
          ...device,
          appVersion: heartbeat?.appVersion ?? device.appVersion,
          resolution: heartbeat?.resolution ?? device.resolution,
          lastSeenAt: toIsoUtc(new Date(lastSeen)),
          status:
            now.getTime() - lastSeen <= ONLINE_WINDOW_MS ? "ONLINE" : "OFFLINE",
        };
        return toDisplayDevice(dto);
      });
      return { items, serverTime: now };
    },

    async listTargetGroups(signal) {
      await settle(signal);
      actor();
      return TARGET_GROUP_FIXTURES.map((group) => ({ ...group }));
    },
  };

  // 개발 중 오류·지연을 화면에서 재현할 수 있게 주입 검사를 끼운다.
  return {
    submissions: withInjection("submissions", submissions),
    reviews: withInjection("reviews", reviews),
    displays: withInjection("displays", displays),
    devices: withInjection("devices", devices),
  };
}
