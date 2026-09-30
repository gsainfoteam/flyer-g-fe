import type {
  DeviceList,
  DisplayDevice,
  DisplayDeviceDto,
  TargetGroup,
  UpdateDeviceInput,
} from "@/entities/device/model/types";
import {
  DEVICE_LIMITS,
  TARGET_GROUP_LIMITS,
  findSameNameGroup,
  toDisplayDevice,
} from "@/entities/device/model/types";
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
import {
  REVIEW_DECISIONS,
  toSubmissionEvent,
} from "@/entities/review/model/types";
import type {
  DecisionRecord,
  ReviewDecision,
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
  StatsRepository,
  SubmissionRepository,
  SubmissionVersionInput,
  SuspendInput,
  UpdateSubmissionInput,
} from "@/shared/api/repositories";
import type { Clock } from "@/shared/lib/clock";
import { systemClock } from "@/shared/lib/clock";
import {
  fromSeoulInput,
  parseIsoUtc,
  toIsoUtc,
  toSeoulDateInputValue,
} from "@/shared/lib/datetime";
import type { ImpressionStatsItem } from "@/entities/impression/model/types";
import { ziggleNoticeIdOf } from "@/shared/lib/ziggle-url";
import type { DeviceSeed, TargetGroupSeed } from "./fixtures";
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
/** 공지 하나에 신청 하나 규칙에서 세지 않는 끝난 상태. 다시 살아나지 않는다. */
const FINISHED_STATUSES: readonly SubmissionStatus[] = [
  "CANCELED",
  "ENDED",
  "ARCHIVED",
];
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

const HOUR_MS = 60 * 60 * 1000;
/** 서버가 노출을 모으는 주기 */
const AGGREGATE_INTERVAL_MS = 10 * 60 * 1000;
/** 노출 통계 기간의 최대 길이(일). 서버와 같다. */
const MAX_STATS_DAYS = 366;
/** 게시를 한 번이라도 시작했을 수 있는 상태 */
const ON_AIR_ONCE: readonly SubmissionStatus[] = [
  "PUBLISHED",
  "ENDED",
  "SUSPENDED",
];

/** 같은 게시물은 늘 같은 값이 나오게 id로 흔든다. */
function spread(id: string, range: number): number {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return hash % range;
}

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

  allEvents(): SubmissionEventDto[] {
    return this.events;
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
    // 실패는 호출부가 받는다. 여기서는 정리만 하고, 실패를 한 번 더 흘리지 않는다.
    const forget = () => void this.inFlightCreates.delete(key);
    running.then(forget, forget);
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
  let deviceSeeds: DeviceSeed[] = [...DEVICE_FIXTURES];
  let groupSeeds: TargetGroupSeed[] = [...TARGET_GROUP_FIXTURES];
  let createdGroupCount = 0;
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

  /** 중단한 시각. 이력의 마지막 중단 기록이고, 없으면 마지막으로 바뀐 때다. */
  const suspendedAtOf = (dto: SignageSubmissionExpandedDto): string =>
    store
      .eventsOf(dto.id)
      .filter((event) => event.type === "SUSPENDED")
      .at(-1)?.occurredAt ?? dto.updatedAt;

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
   * 공지 하나에 신청 하나(서버의 부분 unique index). 끝난 신청(취소·종료·보관)은
   * 세지 않아 같은 공지로 다시 신청할 수 있다. 반려·중단된 신청은 새로 만들지 않고
   * 고쳐서 다시 낸다.
   */
  const assertNoticeFree = (noticeId: string | null, exceptId?: string) => {
    if (noticeId === null) return;
    const taken = store
      .all()
      .some(
        (item) =>
          item.id !== exceptId &&
          item.ziggleNoticeId === noticeId &&
          !FINISHED_STATUSES.includes(effectiveOf(item)),
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

  const toTargetGroup = (seed: TargetGroupSeed): TargetGroup => ({
    ...seed,
    deviceCount: deviceSeeds.filter(
      (device) => device.isActive && device.groupIds.includes(seed.id),
    ).length,
  });

  /**
   * 새로 추가한 그룹 중 없거나 숨긴 것. 이미 연결된 그룹(`current`)은 숨겼어도 그대로
   * 둘 수 있다. (`flyer-g-be` PR 16)
   */
  const unselectableGroupIds = (
    next: readonly string[] | undefined,
    current: readonly string[] = [],
  ): string[] =>
    (next ?? []).filter(
      (id) =>
        !current.includes(id) &&
        !groupSeeds.some((group) => group.id === id && !group.isHidden),
    );

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
    const badGroups = unselectableGroupIds(input.targetGroupIds);
    if (badGroups.length > 0) {
      errors.targetGroupIds = `선택할 수 없는 대상 위치가 있습니다: ${badGroups.join(", ")}`;
    }
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
      lastDecision: null,
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

  /**
   * 같은 key로 이미 처리한 요청이면 처리하지 않고 지금 상태를 돌려준다. 서버는 처음
   * 응답을 그대로 주는데, mock은 그사이 바뀐 것이 없다고 보고 지금 상태로 대신한다.
   */
  const replayed = (
    scope: string,
    id: string,
    mutationOptions: MutationOptions | undefined,
  ): SignageSubmissionExpanded | null =>
    store.resolveIdempotency(scope, mutationOptions?.idempotencyKey) === id
      ? toSignageSubmissionExpanded(store.find(id))
      : null;

  /** 검토 결정을 저장하고 key를 기억한다. */
  const decided = (
    scope: string,
    next: SignageSubmissionExpandedDto,
    mutationOptions: MutationOptions | undefined,
  ): SignageSubmissionExpanded => {
    const saved = store.replace(next);
    store.rememberIdempotency(scope, mutationOptions?.idempotencyKey, saved.id);
    return toSignageSubmissionExpanded(saved);
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
      const badGroups = unselectableGroupIds(
        input.targetGroupIds,
        current.targetGroupIds,
      );
      if (badGroups.length > 0) {
        errors.targetGroupIds = `선택할 수 없는 대상 위치가 있습니다: ${badGroups.join(", ")}`;
      }
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
      const replay = replayed("cancel", id, mutationOptions);
      if (replay) return replay;
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
      store.rememberIdempotency("cancel", mutationOptions?.idempotencyKey, id);
      return toSignageSubmissionExpanded(canceled);
    },
  };

  /**
   * 서버 주기 작업이 남기는 게시 시작·종료 기록. mock은 따로 돌지 않으니 게시 기간과
   * 지금 상태로 만든다. 중단된 게시물은 중단 전에 시작했을 때만 걸렸다.
   */
  const postingEventsOf = (
    dto: SignageSubmissionExpandedDto,
  ): SubmissionEventDto[] => {
    const status = effectiveOf(dto);
    if (!ON_AIR_ONCE.includes(status)) return [];
    const stoppedAt =
      status === "SUSPENDED" ? suspendedAtOf(dto) : toIsoUtc(clock.now());
    const system = {
      reasonCode: null,
      comment: null,
      actorId: "",
      actorName: "",
    };
    const events: SubmissionEventDto[] = [];
    if (dto.startAt < stoppedAt) {
      events.push({
        id: `event-publish-${dto.id}`,
        submissionId: dto.id,
        revision: dto.version,
        type: "PUBLISHED",
        ...system,
        occurredAt: dto.startAt,
      });
    }
    if (status === "ENDED") {
      events.push({
        id: `event-end-${dto.id}`,
        submissionId: dto.id,
        revision: dto.version,
        type: "ENDED",
        ...system,
        occurredAt: dto.endAt,
      });
    }
    return events;
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
      const submission = findVisible(submissionId);
      return [...store.eventsOf(submissionId), ...postingEventsOf(submission)]
        .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
        .map((event): SubmissionEvent => toSubmissionEvent(event));
    },

    async listRecentDecisions({ limit }, signal) {
      await settle(signal);
      requireReviewer();
      return store
        .allEvents()
        .filter((event) =>
          (REVIEW_DECISIONS as readonly string[]).includes(event.type),
        )
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
        .slice(0, limit)
        .map((event): DecisionRecord => ({
          id: event.id,
          submissionId: event.submissionId,
          submissionTitle:
            store.all().find((item) => item.id === event.submissionId)?.title ??
            null,
          decision: event.type as ReviewDecision,
          actorName: event.actorName,
          occurredAt: parseIsoUtc(event.occurredAt),
        }));
    },

    async approve(input: ApproveInput, mutationOptions?: MutationOptions) {
      await settle(mutationOptions?.signal);
      const reviewer = requireReviewer();
      const replay = replayed("approve", input.submissionId, mutationOptions);
      if (replay) return replay;
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
      return decided(
        "approve",
        touch(current, now, { status, lastDecision: "APPROVED" }),
        mutationOptions,
      );
    },

    async reject(input: RejectInput, mutationOptions?: MutationOptions) {
      await settle(mutationOptions?.signal);
      const reviewer = requireReviewer();
      const replay = replayed("reject", input.submissionId, mutationOptions);
      if (replay) return replay;
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
      return decided(
        "reject",
        touch(current, now, { status: "REJECTED", lastDecision: "REJECTED" }),
        mutationOptions,
      );
    },

    async suspend(input: SuspendInput, mutationOptions?: MutationOptions) {
      await settle(mutationOptions?.signal);
      const reviewer = requireReviewer();
      const replay = replayed("suspend", input.submissionId, mutationOptions);
      if (replay) return replay;
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
      return decided(
        "suspend",
        touch(current, now, {
          status: "SUSPENDED",
          lastDecision: "SUSPENDED",
        }),
        mutationOptions,
      );
    },
  };

  const displays: DisplayRepository = {
    async getPlaylist(deviceId, signal): Promise<Playlist> {
      await settle(signal);
      const now = clock.now();
      // 기기는 자기 위치가 대상인 게시물만 받는다. 등록되지 않은 id(미리보기)는
      // 모든 위치의 게시물을 본다.
      const device = deviceSeeds.find((item) => item.id === deviceId);
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
        // 등록된 기기는 운영자가 정한 화면 설정을, 미리보기는 기본값을 쓴다.
        refreshAfterSeconds: device?.refreshAfterSeconds ?? 60,
        layout: device?.layout ?? { type: "SINGLE", rotationSeconds: 10 },
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

  /** 기기 관리(등록·수정·재발급)는 운영자만 한다. */
  const requireSuperAdmin = (): SessionUser => {
    const user = actor();
    if (user && !hasAnyRole(user, ["SUPER_ADMIN"])) {
      throw forbidden("시스템 운영자만 할 수 있는 작업입니다.");
    }
    return user ?? MOCK_USERS.SUPER_ADMIN;
  };

  /** 서버 DTO와 같은 범위로 검사한다. (`flyer-g-be` `device-input.dto.ts`) */
  const checkDeviceInput = (
    input: UpdateDeviceInput,
    currentGroupIds: readonly string[] = [],
  ) => {
    const errors: Record<string, string> = {};
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (name.length === 0 || name.length > DEVICE_LIMITS.nameMaxLength) {
        errors.name = `기기 이름은 1~${DEVICE_LIMITS.nameMaxLength}자여야 합니다.`;
      }
    }
    if (
      input.location &&
      input.location.trim().length > DEVICE_LIMITS.locationMaxLength
    ) {
      errors.location = `위치는 ${DEVICE_LIMITS.locationMaxLength}자 이하여야 합니다.`;
    }
    const inRange = (
      value: number | undefined,
      { min, max }: { min: number; max: number },
    ) =>
      value === undefined ||
      (Number.isInteger(value) && value >= min && value <= max);
    if (!inRange(input.rotationSeconds, DEVICE_LIMITS.rotationSeconds)) {
      errors.rotationSeconds = `전환 간격은 ${DEVICE_LIMITS.rotationSeconds.min}~${DEVICE_LIMITS.rotationSeconds.max}초여야 합니다.`;
    }
    if (
      !inRange(input.refreshAfterSeconds, DEVICE_LIMITS.refreshAfterSeconds)
    ) {
      errors.refreshAfterSeconds = `갱신 주기는 ${DEVICE_LIMITS.refreshAfterSeconds.min}~${DEVICE_LIMITS.refreshAfterSeconds.max}초여야 합니다.`;
    }
    const badGroups = unselectableGroupIds(input.groupIds, currentGroupIds);
    if (badGroups.length > 0) {
      errors.groupIds = `선택할 수 없는 위치 그룹이 있습니다: ${badGroups.join(", ")}`;
    }
    throwIfInvalid(errors);
  };

  const issueToken = (deviceId: string) =>
    `fgd_mock_${deviceId}_${clock.now().getTime().toString(36)}`;

  const toDevice = (seed: DeviceSeed): DisplayDevice => {
    const { silentSinceMs, isActive, ...device } = seed;
    const now = clock.now();
    const heartbeat = heartbeats.read()[device.id];
    const heartbeatAt = heartbeat ? Date.parse(heartbeat.at) : Number.NaN;
    // 정상 기기는 1분마다 heartbeat를 보낸다고 치고, 끊긴 기기는 끊긴 시점에
    // 멈춰 있다. 실제 TV 탭이 보낸 기록이 더 최근이면 그것을 쓴다.
    const simulated =
      silentSinceMs === "never"
        ? Number.NaN
        : silentSinceMs === null
          ? now.getTime() - (now.getTime() % HEARTBEAT_INTERVAL_MS)
          : startedAt.getTime() - silentSinceMs;
    const candidates = [heartbeatAt, simulated].filter(Number.isFinite);
    const lastSeen = candidates.length > 0 ? Math.max(...candidates) : null;

    // 흉내 낸 기기는 연결이 살아 있는 동안 계속 정상 재생한다. 실제 TV 탭은 자기가
    // 알린 재생 시각을 쓴다.
    const simulatedRender = Number.isFinite(simulated)
      ? toIsoUtc(new Date(simulated))
      : device.lastRenderOkAt;
    const fromTab =
      heartbeat !== undefined &&
      (!Number.isFinite(simulated) || heartbeatAt >= simulated);
    const lastRenderOkAt = fromTab
      ? (heartbeat.lastRenderOkAt ?? null)
      : simulatedRender;

    const dto: DisplayDeviceDto = {
      ...device,
      appVersion: heartbeat?.appVersion ?? device.appVersion,
      resolution: heartbeat?.resolution ?? device.resolution,
      lastSeenAt: lastSeen === null ? null : toIsoUtc(new Date(lastSeen)),
      lastRenderOkAt,
      status: !isActive
        ? "DISABLED"
        : lastSeen !== null && now.getTime() - lastSeen <= ONLINE_WINDOW_MS
          ? "ONLINE"
          : "OFFLINE",
    };
    return toDisplayDevice(dto);
  };

  const findDevice = (id: string): DeviceSeed => {
    const found = deviceSeeds.find((item) => item.id === id);
    if (!found) throw httpError(404, `기기를 찾을 수 없습니다: ${id}`);
    return found;
  };

  const findGroup = (id: string): TargetGroupSeed => {
    const found = groupSeeds.find((group) => group.id === id);
    if (!found) throw httpError(404, `그룹을 찾을 수 없습니다: ${id}`);
    return found;
  };

  /** 서버와 같은 규칙: 앞뒤 공백을 지운 뒤 1~40자, 대소문자를 무시하고 중복 금지. */
  const checkGroupName = (raw: string, exceptId?: string): string => {
    const name = raw.trim();
    const max = TARGET_GROUP_LIMITS.nameMaxLength;
    if (name.length === 0) {
      throwIfInvalid({ name: "그룹 이름을 입력하세요." });
    }
    if (name.length > max) {
      throwIfInvalid({ name: `그룹 이름은 ${max}자 이하여야 합니다.` });
    }
    const groups = groupSeeds.map(toTargetGroup);
    if (findSameNameGroup(groups, name, exceptId)) {
      throwIfInvalid({ name: "같은 이름의 그룹이 이미 있습니다." });
    }
    return name;
  };

  const devices: DeviceRepository = {
    async list(signal): Promise<DeviceList> {
      await settle(signal);
      requireReviewer();
      const items = [...deviceSeeds]
        .sort((a, b) => a.name.localeCompare(b.name, "ko"))
        .map(toDevice);
      return { items, serverTime: clock.now() };
    },

    async create(input, signal) {
      await settle(signal);
      requireSuperAdmin();
      checkDeviceInput(input);
      const issuedAt = toIsoUtc(clock.now());
      const id = `device-${deviceSeeds.length + 1}-${clock.now().getTime().toString(36)}`;
      const seed: DeviceSeed = {
        id,
        name: input.name.trim(),
        location: input.location?.trim() || null,
        groupIds: input.groupIds,
        orientation: input.orientation,
        resolution: null,
        appVersion: null,
        layout: { type: input.layout, rotationSeconds: input.rotationSeconds },
        refreshAfterSeconds: input.refreshAfterSeconds,
        lastPlaylistVersion: null,
        lastRenderOkAt: null,
        tokenIssuedAt: issuedAt,
        silentSinceMs: "never",
        isActive: true,
      };
      deviceSeeds = [...deviceSeeds, seed];
      return { device: toDevice(seed), token: issueToken(id) };
    },

    async update(id, input, signal) {
      await settle(signal);
      requireSuperAdmin();
      const current = findDevice(id);
      checkDeviceInput(input, current.groupIds);
      const next: DeviceSeed = {
        ...current,
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.location !== undefined
          ? { location: input.location?.trim() || null }
          : {}),
        ...(input.groupIds !== undefined ? { groupIds: input.groupIds } : {}),
        ...(input.orientation !== undefined
          ? { orientation: input.orientation }
          : {}),
        layout: {
          type: input.layout ?? current.layout.type,
          rotationSeconds:
            input.rotationSeconds ?? current.layout.rotationSeconds,
        },
        refreshAfterSeconds:
          input.refreshAfterSeconds ?? current.refreshAfterSeconds,
        isActive: input.isActive ?? current.isActive,
      };
      deviceSeeds = deviceSeeds.map((item) => (item.id === id ? next : item));
      return toDevice(next);
    },

    async rotateToken(id, signal) {
      await settle(signal);
      requireSuperAdmin();
      const current = findDevice(id);
      const next: DeviceSeed = {
        ...current,
        tokenIssuedAt: toIsoUtc(clock.now()),
      };
      deviceSeeds = deviceSeeds.map((item) => (item.id === id ? next : item));
      return { device: toDevice(next), token: issueToken(id) };
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
      return [...groupSeeds]
        .sort((a, b) => a.name.localeCompare(b.name, "ko"))
        .map(toTargetGroup);
    },

    async createTargetGroup(input, signal) {
      await settle(signal);
      requireSuperAdmin();
      const name = checkGroupName(input.name);
      const seed: TargetGroupSeed = {
        id: `grp_mock_${++createdGroupCount}`,
        name,
        isHidden: false,
      };
      groupSeeds = [...groupSeeds, seed];
      return toTargetGroup(seed);
    },

    async updateTargetGroup(id, input, signal) {
      await settle(signal);
      requireSuperAdmin();
      const current = findGroup(id);
      const next: TargetGroupSeed = {
        ...current,
        ...(input.name !== undefined
          ? { name: checkGroupName(input.name, id) }
          : {}),
        ...(input.isHidden !== undefined ? { isHidden: input.isHidden } : {}),
      };
      groupSeeds = groupSeeds.map((group) => (group.id === id ? next : group));
      return toTargetGroup(next);
    },

    async deleteTargetGroup(id, signal) {
      await settle(signal);
      requireSuperAdmin();
      findGroup(id);
      const inUse =
        deviceSeeds.some((device) => device.groupIds.includes(id)) ||
        store.all().some((dto) => dto.targetGroupIds.includes(id));
      if (inUse) {
        throw conflict("기기나 신청이 쓰고 있는 그룹은 지울 수 없습니다.");
      }
      groupSeeds = groupSeeds.filter((group) => group.id !== id);
    },
  };

  /**
   * 노출 통계. 서버는 기기가 보낸 재생 기록을 10분마다 모으지만, mock은 게시 기간과
   * 대상 기기 수로 그럴듯한 값을 계산한다. 같은 조건이면 늘 같은 값이 나온다.
   *
   * 기기 한 대가 한 시간에 6~10번 띄운다고 본다(전환 10초, 한 바퀴 여러 장).
   * 중단된 게시물은 중단한 시각까지만 센다.
   */
  const impressionsOf = (
    dto: SignageSubmissionExpandedDto,
    rangeStart: number,
    rangeEnd: number,
  ): ImpressionStatsItem | null => {
    const status = effectiveOf(dto);
    if (!ON_AIR_ONCE.includes(status)) return null;
    const stoppedAt =
      status === "SUSPENDED"
        ? parseIsoUtc(suspendedAtOf(dto)).getTime()
        : Number.POSITIVE_INFINITY;
    const start = Math.max(parseIsoUtc(dto.startAt).getTime(), rangeStart);
    const end = Math.min(parseIsoUtc(dto.endAt).getTime(), rangeEnd, stoppedAt);
    if (end <= start) return null;

    const deviceCount = deviceSeeds.filter(
      (seed) =>
        seed.isActive &&
        (dto.targetGroupIds.length === 0 ||
          seed.groupIds.some((groupId) =>
            dto.targetGroupIds.includes(groupId),
          )),
    ).length;
    const perDeviceHour = 6 + spread(dto.id, 5);
    const impressions = Math.round(
      ((end - start) / HOUR_MS) * perDeviceHour * deviceCount,
    );
    if (impressions === 0) return null;
    return {
      submissionId: dto.id,
      title: dto.title,
      impressions,
      completedImpressions: Math.floor(
        impressions * (0.95 + spread(dto.id, 4) / 100),
      ),
      deviceCount,
    };
  };

  const stats: StatsRepository = {
    async getImpressions(params, signal) {
      await settle(signal);
      const now = clock.now();
      const rows = inScope(params.scope ?? "me");
      const to = params.to ?? toSeoulDateInputValue(now);
      const from =
        params.from ??
        toSeoulDateInputValue(
          new Date(fromSeoulInput(to).getTime() - 29 * 24 * HOUR_MS),
        );
      const rangeStart = fromSeoulInput(from).getTime();
      const rangeEnd = fromSeoulInput(to).getTime() + 24 * HOUR_MS;
      if (rangeEnd <= rangeStart) {
        throw invalid("시작 날짜가 끝 날짜보다 늦습니다.", {
          from: "시작 날짜가 끝 날짜보다 늦습니다.",
        });
      }
      if (rangeEnd - rangeStart > MAX_STATS_DAYS * 24 * HOUR_MS) {
        throw invalid(`기간은 최대 ${MAX_STATS_DAYS}일입니다.`, {
          from: `기간은 최대 ${MAX_STATS_DAYS}일입니다.`,
        });
      }
      // 아직 모으지 않은 최근 기록은 빠진다.
      const aggregatedAt = new Date(
        Math.floor(now.getTime() / AGGREGATE_INTERVAL_MS) *
          AGGREGATE_INTERVAL_MS,
      );
      const items = rows
        .map((dto) =>
          impressionsOf(
            dto,
            rangeStart,
            Math.min(rangeEnd, aggregatedAt.getTime()),
          ),
        )
        .filter((item): item is ImpressionStatsItem => item !== null)
        .sort((a, b) => b.impressions - a.impressions);
      return { from, to, aggregatedAt, items };
    },
  };

  // 개발 중 오류·지연을 화면에서 재현할 수 있게 주입 검사를 끼운다.
  return {
    submissions: withInjection("submissions", submissions),
    reviews: withInjection("reviews", reviews),
    displays: withInjection("displays", displays),
    devices: withInjection("devices", devices),
    reference: withInjection("reference", reference),
    stats: withInjection("stats", stats),
  };
}
