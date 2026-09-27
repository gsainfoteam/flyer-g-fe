import type {
  DeviceList,
  DisplayDeviceDto,
} from "@/entities/device/model/types";
import { toDisplayDevice } from "@/entities/device/model/types";
import {
  canReviewerDecide,
  canReviewerSuspend,
  canSubmitterCancel,
  canSubmitterEdit,
  canSubmitterResubmit,
  checkSchedule,
  isAllowedDetailUrl,
  needsReapproval,
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
import { toSubmissionEvent } from "@/entities/review/model/types";
import type {
  SubmissionEvent,
  SubmissionEventDto,
  SubmissionEventType,
} from "@/entities/review/model/types";
import { toPlaylist } from "@/entities/playlist";
import type { Playlist } from "@/entities/playlist/model/types";
import { hasAnyRole } from "@/features/auth/model/types";
import type { SessionUser } from "@/features/auth/model/types";
import { getMockAssetUrl } from "@/features/media-upload/api/fake-upload-service";
import { ApiError, codeForStatus } from "@/shared/api/error";
import type {
  ApproveInput,
  CreateSubmissionInput,
  DeviceRepository,
  DisplayRepository,
  MutationOptions,
  ReferenceRepository,
  RejectInput,
  Repositories,
  ReviewRepository,
  SubmissionRepository,
  SubmissionVersionInput,
  SuspendInput,
  UpdateSubmissionInput,
} from "@/shared/api/repositories";
import type { Clock } from "@/shared/lib/clock";
import { systemClock } from "@/shared/lib/clock";
import { parseIsoUtc, toIsoUtc } from "@/shared/lib/datetime";
import { ziggleNoticeIdOf } from "@/shared/lib/ziggle-url";
import {
  DEVICE_FIXTURES,
  TARGET_GROUP_FIXTURES,
  createEventFixtures,
  createSubmissionFixtures,
} from "./fixtures";
import { createStorageHeartbeatLog } from "./heartbeats";
import type { HeartbeatLog } from "./heartbeats";
import { withInjection } from "./injection";
import {
  CATEGORY_FIXTURES,
  SIGNAGE_CONFIG_FIXTURE,
  categoryNameOf,
} from "./reference";
import { MOCK_USERS } from "./users";

/**
 * 개발·테스트용 in-memory 구현. 실제 서버 대신 같은 repository 인터페이스를 만족한다.
 *
 * 화면이 실제 서버에서 만날 응답을 미리 겪도록 백엔드(`flyer-g-be`)의 규칙을 흉내
 * 낸다. 세션 사용자로 조회 범위와 소유권을 판단하고, 권한이 없으면 403, 남의
 * 신청은 404, 세션이 없으면 401을 준다. mock이 서버보다 관대하면 권한·충돌 버그가
 * 숨는다. (`API-CHANGES-BACKEND.md`)
 *
 * 서버는 1분마다 승인 건의 저장 상태를 기간에 맞추지만, mock은 요청마다 기간으로
 * 판정한 실제 상태를 쓴다. 결과는 같다.
 */
const DEFAULT_PAGE_SIZE = 8;

/** 이 시간 안에 heartbeat가 있으면 온라인이다. 서버 기준(3분)과 같다. */
const ONLINE_WINDOW_MS = 3 * 60 * 1000;
/** 정상 기기가 heartbeat를 보내는 간격. 플레이어(`use-device-telemetry`)와 같다. */
const HEARTBEAT_INTERVAL_MS = 60 * 1000;

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

const notFound = (id: string) =>
  httpError(404, `신청을 찾을 수 없습니다: ${id}`);
const alreadySubmitted = () =>
  new ApiError({
    kind: "http",
    code: "ALREADY_SUBMITTED",
    message: "이 공지로 이미 신청한 게시물이 있습니다.",
    status: 409,
    requestId: "mock-request",
    fields: { detailUrl: "이 공지로 이미 신청한 게시물이 있습니다." },
  });
const conflict = (message: string) => httpError(409, message);
const invalid = (message: string, fields?: Record<string, string>) =>
  httpError(422, message, fields);
const forbidden = (message = "이 작업을 수행할 권한이 없습니다.") =>
  httpError(403, message);
const unauthenticated = () => httpError(401, "로그인이 필요합니다.");

class MockStore {
  private submissions: SignageSubmissionExpandedDto[];
  private events: SubmissionEventDto[];
  private readonly seenIdempotencyKeys = new Map<string, string>();
  private readonly inFlightCreates = new Map<
    string,
    Promise<SignageSubmissionExpanded>
  >();

  constructor(now: Date) {
    this.submissions = createSubmissionFixtures(now);
    this.events = createEventFixtures(now);
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

  eventsOf(submissionId: string): SubmissionEventDto[] {
    return this.events
      .filter((item) => item.submissionId === submissionId)
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  }

  addEvent(event: SubmissionEventDto): void {
    this.events = [...this.events, event];
  }

  /**
   * 같은 key로 두 번 요청해도 한 번만 처리된다. (`API-REQUIREMENTS.md` 1.3)
   * key는 요청 종류별로 나눠 기억한다. 생성 key와 제출 key가 우연히 같아도
   * 서로 다른 요청이다.
   */
  rememberIdempotency(
    scope: string,
    key: string | undefined,
    id: string,
  ): void {
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

let eventSequence = 0;

function eventOf(
  submission: SignageSubmissionExpandedDto,
  type: SubmissionEventType,
  actor: SessionUser,
  now: Date,
  detail: Pick<SubmissionEventDto, "reasonCode" | "comment"> = {
    reasonCode: null,
    comment: null,
  },
): SubmissionEventDto {
  eventSequence += 1;
  return {
    id: `event-${now.getTime()}-${eventSequence}`,
    submissionId: submission.id,
    revision: submission.version,
    type,
    ...detail,
    actorId: actor.id,
    actorName: actor.displayName,
    occurredAt: toIsoUtc(now),
  };
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
  const config = SIGNAGE_CONFIG_FIXTURE;

  const settle = async (signal?: AbortSignal): Promise<void> => {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, latencyMs));
    }
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  };

  /** 저장된 값이 아니라 지금 서버 시각 기준 실제 상태로 전이를 판단한다. */
  const effectiveOf = (dto: SignageSubmissionExpandedDto): SubmissionStatus =>
    resolveEffectiveStatus(toSignageSubmissionExpanded(dto), clock.now());

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

  /** 본인 신청이거나 관리자면 볼 수 있다. 그 외에는 있는지도 알리지 않는다(404). */
  const findVisible = (id: string): SignageSubmissionExpandedDto => {
    const user = actor();
    const found = store.find(id);
    if (user && found.requesterId !== user.id && !isReviewer(user)) {
      throw notFound(id);
    }
    return found;
  };

  /**
   * 신청을 고치고 내리는 것은 본인만 한다. 관리자도 남의 신청은 404다.
   * 서버와 같은 순서로 판정한다: 없음·남의 것(404) → 버전(409).
   */
  const findOwned = (
    id: string,
    version: number,
  ): SignageSubmissionExpandedDto => {
    const user = actor();
    const found = store.find(id);
    if (user && found.requesterId !== user.id) throw notFound(id);
    if (found.version !== version) {
      throw conflict("다른 곳에서 먼저 바뀌었습니다. 새로 고침해 주세요.");
    }
    return found;
  };

  /** scope가 all이면 관리자만(아니면 403), me(기본)면 본인 신청만. */
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

  /**
   * 공지 하나에 신청 하나. 취소한 신청만 세지 않는다(서버의 부분 unique index).
   * 종료·중단된 신청이 있어도 같은 공지로 다시 신청할 수 없다
   * (`API-FOLLOWUP-2026-09.md` 1-2에서 완화를 요청했다).
   */
  const assertNoticeFree = (noticeId: string | null, exceptId?: string) => {
    if (noticeId === null) return;
    const taken = store
      .all()
      .some(
        (item) =>
          item.id !== exceptId &&
          item.ziggleNoticeId === noticeId &&
          item.status !== "CANCELED",
      );
    if (taken) throw alreadySubmitted();
  };

  /** 상세 링크를 검증하고 공지 ID를 뽑는다. 빈 값은 링크 없음이다. */
  const parseDetail = (
    raw: string | null | undefined,
    errors: Record<string, string>,
  ): { url: string; noticeId: string | null } | null => {
    const value = raw?.trim();
    if (!value) return null;
    if (!isAllowedDetailUrl(value, config)) {
      errors.detailUrl = `${config.allowedDetailUrlHosts.join(", ")} 의 https 주소만 쓸 수 있어요.`;
      return null;
    }
    return { url: value, noticeId: ziggleNoticeIdOf(value) };
  };

  const optionalText = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  };

  const checkReferences = (
    input: Pick<UpdateSubmissionInput, "title" | "categoryId">,
    errors: Record<string, string>,
  ) => {
    if (input.title !== undefined) {
      const title = input.title.trim();
      if (title.length === 0 || title.length > config.titleMaxLength) {
        errors.title = `제목은 1~${config.titleMaxLength}자여야 해요.`;
      }
    }
    if (
      input.categoryId !== undefined &&
      !CATEGORY_FIXTURES.some((category) => category.id === input.categoryId)
    ) {
      errors.categoryId = "선택할 수 없는 카테고리예요.";
    }
  };

  const throwIfInvalid = (errors: Record<string, string>) => {
    if (Object.keys(errors).length > 0) {
      throw invalid("입력을 확인해 주세요.", errors);
    }
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

    const now = clock.now();
    // 실서버처럼 필드 단위 오류를 담는다. (`API-REQUIREMENTS.md` 1.2)
    const errors: Record<string, string> = {
      ...checkSchedule(input.startAt, input.endAt, now, config),
    };
    checkReferences(input, errors);
    const detail = parseDetail(input.detailUrl, errors);
    throwIfInvalid(errors);
    assertNoticeFree(detail?.noticeId ?? null);

    // 만들면 바로 검토 대기다(생성과 제출이 한 번). 서버는 만든 시각을 낸 시각으로 둔다.
    const id = `submission-${store.all().length + 1}-${now.getTime()}`;
    // 실제 서버는 assetId로 저장소 URL을 돌려준다. mock은 방금 올린 미리보기를 쓴다.
    const posterUrl = getMockAssetUrl(input.assetId) ?? "";
    const created: SignageSubmissionExpandedDto = {
      id,
      ziggleNoticeId: detail?.noticeId ?? null,
      requesterId: user.id,
      requesterName: user.displayName,
      type: "POSTER",
      title: input.title.trim(),
      categoryId: input.categoryId,
      assetId: input.assetId,
      detailUrl: detail?.url ?? null,
      startAt: toIsoUtc(input.startAt),
      endAt: toIsoUtc(input.endAt),
      status: "PENDING_REVIEW",
      priority: 0,
      targetGroupIds: input.targetGroupIds,
      createdAt: toIsoUtc(now),
      updatedAt: toIsoUtc(now),
      submittedAt: toIsoUtc(now),
      version: 1,
      categoryName: categoryNameOf(input.categoryId),
      organizerName: optionalText(input.organizerName),
      posterUrl,
      posterThumbUrl: posterUrl,
      subtitle: optionalText(input.subtitle),
      location: optionalText(input.location),
      description: optionalText(input.description),
    };
    store.insert(created);
    store.addEvent(eventOf(created, "SUBMITTED", user, now));
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

    async create(
      input: CreateSubmissionInput,
      mutationOptions?: MutationOptions,
    ) {
      const key = mutationOptions?.idempotencyKey;
      if (key) {
        const pending = store.pendingCreate(key);
        if (pending) return pending;
      }

      const running = runCreate(input, mutationOptions);
      if (key) store.rememberPendingCreate(key, running);
      return running;
    },

    /**
     * 신청자 본인만 고친다. 값이 실제로 바뀐 필드만 반영하고, 바뀐 것이 없으면
     * version도 그대로다. 게시 시작 전 승인 건을 고치면 승인 대기로 돌아간다(재승인).
     */
    async update(id, input: UpdateSubmissionInput, mutationOptions) {
      await settle(mutationOptions?.signal);
      const current = findOwned(id, input.version);
      const status = effectiveOf(current);
      if (!canSubmitterEdit(status)) {
        throw conflict("게시가 시작되어 수정할 수 없습니다.");
      }

      const errors: Record<string, string> = {};
      checkReferences(input, errors);
      const changes: Partial<SignageSubmissionExpandedDto> = {};
      const setIfChanged = <K extends keyof SignageSubmissionExpandedDto>(
        key: K,
        value: SignageSubmissionExpandedDto[K] | undefined,
      ) => {
        if (value !== undefined && value !== current[key]) changes[key] = value;
      };

      setIfChanged("title", input.title?.trim());
      setIfChanged("categoryId", input.categoryId);
      setIfChanged("assetId", input.assetId);
      for (const key of [
        "organizerName",
        "subtitle",
        "location",
        "description",
      ] as const) {
        if (input[key] !== undefined)
          setIfChanged(key, optionalText(input[key]));
      }
      setIfChanged(
        "startAt",
        input.startAt ? toIsoUtc(input.startAt) : undefined,
      );
      setIfChanged("endAt", input.endAt ? toIsoUtc(input.endAt) : undefined);
      if (input.detailUrl !== undefined) {
        const detail = parseDetail(input.detailUrl, errors);
        setIfChanged("detailUrl", detail?.url ?? null);
        setIfChanged("ziggleNoticeId", detail?.noticeId ?? null);
      }
      const groupsChanged =
        input.targetGroupIds !== undefined &&
        (input.targetGroupIds.length !== current.targetGroupIds.length ||
          input.targetGroupIds.some(
            (groupId) => !current.targetGroupIds.includes(groupId),
          ));
      if (groupsChanged) changes.targetGroupIds = input.targetGroupIds;

      if (Object.keys(changes).length === 0) {
        throwIfInvalid(errors);
        return toSignageSubmissionExpanded(current);
      }

      const now = clock.now();
      const reapproval = needsReapproval(status);
      if (changes.startAt || changes.endAt || reapproval) {
        Object.assign(
          errors,
          checkSchedule(
            parseIsoUtc(changes.startAt ?? current.startAt),
            parseIsoUtc(changes.endAt ?? current.endAt),
            now,
            config,
          ),
        );
      }
      throwIfInvalid(errors);
      if (changes.ziggleNoticeId !== undefined) {
        assertNoticeFree(changes.ziggleNoticeId, current.id);
      }

      if (changes.assetId) {
        const posterUrl = getMockAssetUrl(changes.assetId) ?? current.posterUrl;
        changes.posterUrl = posterUrl;
        changes.posterThumbUrl = posterUrl;
      }
      if (changes.categoryId) {
        changes.categoryName = categoryNameOf(changes.categoryId);
      }

      const next = store.replace(
        touch(current, now, {
          ...changes,
          ...(reapproval
            ? { status: "PENDING_REVIEW", submittedAt: toIsoUtc(now) }
            : {}),
        }),
      );
      if (reapproval) {
        store.addEvent(
          eventOf(next, "RESUBMITTED", actor() ?? MOCK_USERS.SUBMITTER, now),
        );
      }
      return toSignageSubmissionExpanded(next);
    },

    /** 반려된 신청을 고친 뒤 다시 검토를 요청한다. 기간 규칙을 지금 시각으로 다시 본다. */
    async submit(id, input: SubmissionVersionInput, mutationOptions) {
      await settle(mutationOptions?.signal);
      // 응답을 못 받아 같은 key로 다시 보낸 요청은 처음 결과를 돌려준다.
      if (
        store.resolveIdempotency("submit", mutationOptions?.idempotencyKey) ===
        id
      ) {
        return toSignageSubmissionExpanded(store.find(id));
      }
      const current = findOwned(id, input.version);
      if (!canSubmitterResubmit(effectiveOf(current))) {
        throw conflict("다시 검토를 요청할 수 있는 상태가 아닙니다.");
      }
      const now = clock.now();
      throwIfInvalid({
        ...checkSchedule(
          parseIsoUtc(current.startAt),
          parseIsoUtc(current.endAt),
          now,
          config,
        ),
      });
      const submitted = store.replace(
        touch(current, now, {
          status: "PENDING_REVIEW",
          submittedAt: toIsoUtc(now),
        }),
      );
      store.addEvent(
        eventOf(submitted, "RESUBMITTED", actor() ?? MOCK_USERS.SUBMITTER, now),
      );
      store.rememberIdempotency("submit", mutationOptions?.idempotencyKey, id);
      return toSignageSubmissionExpanded(submitted);
    },

    async cancel(id, input: SubmissionVersionInput, mutationOptions) {
      await settle(mutationOptions?.signal);
      const current = findOwned(id, input.version);
      if (!canSubmitterCancel(effectiveOf(current))) {
        throw conflict("이미 게시가 시작되어 취소할 수 없습니다.");
      }
      const now = clock.now();
      const canceled = store.replace(
        touch(current, now, { status: "CANCELED" }),
      );
      store.addEvent(
        eventOf(canceled, "CANCELED", actor() ?? MOCK_USERS.SUBMITTER, now),
      );
      return toSignageSubmissionExpanded(canceled);
    },
  };

  const reviews: ReviewRepository = {
    async listPending(params, signal) {
      await settle(signal);
      requireReviewer();
      // 오래 기다린 순. 관리자가 먼저 처리해야 하는 건이 위로 온다.
      // 초안을 만든 시각이 아니라 마지막으로 낸 시각으로 센다.
      const waitingSince = (item: SignageSubmissionExpandedDto) =>
        item.submittedAt ?? item.createdAt;
      const pending = store
        .all()
        .filter(
          (item) =>
            item.status === "PENDING_REVIEW" &&
            (!params.categoryId || item.categoryId === params.categoryId),
        )
        .sort((a, b) => waitingSince(a).localeCompare(waitingSince(b)));
      return paginate(pending, params, clock.now());
    },

    async listHistory(submissionId, signal) {
      await settle(signal);
      findVisible(submissionId);
      return store
        .eventsOf(submissionId)
        .map((event): SubmissionEvent => toSubmissionEvent(event));
    },

    async approve(input: ApproveInput, mutationOptions?: MutationOptions) {
      await settle(mutationOptions?.signal);
      const reviewer = requireReviewer();
      const current = store.find(input.submissionId);
      if (!canReviewerDecide(effectiveOf(current))) {
        throw conflict("다른 관리자가 이미 처리했습니다.");
      }
      if (current.version !== input.revision) {
        throw conflict("검토한 버전이 최신이 아닙니다.");
      }

      const now = clock.now();
      // 기간이 끝난 신청은 승인하지 않는다. 기간 문제로 반려한다.
      if (parseIsoUtc(current.endAt).getTime() <= now.getTime()) {
        throw conflict("게시 기간이 이미 끝났습니다.");
      }
      const status =
        parseIsoUtc(current.startAt).getTime() > now.getTime()
          ? "SCHEDULED"
          : "PUBLISHED";
      store.addEvent(eventOf(current, "APPROVED", reviewer, now));
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
      if (!canReviewerDecide(effectiveOf(current))) {
        throw conflict("다른 관리자가 이미 처리했습니다.");
      }
      if (current.version !== input.revision) {
        throw conflict("검토한 버전이 최신이 아닙니다.");
      }

      const now = clock.now();
      store.addEvent(
        eventOf(current, "REJECTED", reviewer, now, {
          reasonCode: input.reasonCode,
          comment: input.comment,
        }),
      );
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
      if (!canReviewerSuspend(effectiveOf(current))) {
        throw conflict("예약 또는 게시 중인 신청만 중단할 수 있습니다.");
      }
      const now = clock.now();
      // 중단 사유는 게시자에게 표시되어야 한다(FR-REV-05). 처리 이력에 남긴다.
      store.addEvent(
        eventOf(current, "SUSPENDED", reviewer, now, {
          reasonCode: null,
          comment: input.reason,
        }),
      );
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
        deviceName: device?.name ?? null,
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
          organizerName: item.organizerName,
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
  };

  const reference: ReferenceRepository = {
    async getConfig(signal) {
      await settle(signal);
      actor();
      return { ...config };
    },

    async listCategories(signal) {
      await settle(signal);
      actor();
      return CATEGORY_FIXTURES.map((category) => ({ ...category }));
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
    reference: withInjection("reference", reference),
  };
}
