import {
  resolveEffectiveStatus,
  summarizeSubmissions,
  toSignageSubmissionExpanded,
} from "@/entities/submission";
import type {
  Page,
  SignageSubmissionExpanded,
  SignageSubmissionExpandedDto,
  SubmissionListParams,
  SubmissionSummary,
} from "@/entities/submission/model/types";
import type { Review, ReviewDto } from "@/entities/review/model/types";
import { toPlaylist } from "@/entities/playlist";
import type { Playlist } from "@/entities/playlist/model/types";
import { ApiError } from "@/shared/api/error";
import type {
  ApproveInput,
  DisplayRepository,
  MutationOptions,
  RejectInput,
  Repositories,
  ReviewRepository,
  SubmissionRepository,
  SuspendInput,
  CreateSubmissionInput,
} from "@/shared/api/repositories";
import type { Clock } from "@/shared/lib/clock";
import { systemClock } from "@/shared/lib/clock";
import { parseIsoUtc, toIsoUtc } from "@/shared/lib/datetime";
import { createReviewFixtures, createSubmissionFixtures } from "./fixtures";

/**
 * 개발·테스트용 in-memory 구현. 실제 서버 대신 같은 repository 인터페이스를 만족한다.
 * 상태 전이와 권한의 최종 판단은 실제로는 서버 책임이며, 여기서는 화면 흐름을 확인할
 * 최소한의 규칙만 흉내 낸다.
 */
const DEFAULT_PAGE_SIZE = 8;

function notFound(id: string): ApiError {
  return new ApiError({
    kind: "http",
    code: "NOT_FOUND",
    message: `신청을 찾을 수 없습니다: ${id}`,
    status: 404,
    requestId: "mock-request",
  });
}

function conflict(message: string): ApiError {
  return new ApiError({
    kind: "http",
    code: "CONFLICT",
    message,
    status: 409,
    requestId: "mock-request",
  });
}

function invalid(message: string): ApiError {
  return new ApiError({
    kind: "http",
    code: "VALIDATION_FAILED",
    message,
    status: 422,
    requestId: "mock-request",
  });
}

class MockStore {
  private submissions: SignageSubmissionExpandedDto[];
  private reviews: ReviewDto[];
  private readonly seenIdempotencyKeys = new Map<string, string>();

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

  /** 명세 FR-SUB-04: 같은 key로 두 번 요청해도 하나만 만들어진다. */
  rememberIdempotency(key: string | undefined, id: string): void {
    if (key) this.seenIdempotencyKeys.set(key, id);
  }

  resolveIdempotency(key: string | undefined): string | null {
    if (!key) return null;
    return this.seenIdempotencyKeys.get(key) ?? null;
  }
}

function paginate(
  items: SignageSubmissionExpandedDto[],
  params: SubmissionListParams,
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

export interface MockRepositoryOptions {
  clock?: Clock;
  /** 개발 환경에서 로딩 상태를 확인하기 위한 지연. 테스트에서는 0으로 둔다. */
  latencyMs?: number;
}

export function createMockRepositories(
  options: MockRepositoryOptions = {},
): Repositories {
  const clock = options.clock ?? systemClock;
  const latencyMs = options.latencyMs ?? 0;
  const store = new MockStore(clock.now());

  const settle = async (signal?: AbortSignal): Promise<void> => {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, latencyMs));
    }
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  };

  const submissions: SubmissionRepository = {
    async list(params, signal) {
      await settle(signal);
      const now = clock.now();
      const filtered = store.all().filter((item) => {
        if (!params.status || params.status === "ALL") return true;
        return (
          resolveEffectiveStatus(toSignageSubmissionExpanded(item), now) ===
          params.status
        );
      });
      return paginate(filtered, params);
    },

    async getById(id, signal) {
      await settle(signal);
      return toSignageSubmissionExpanded(store.find(id));
    },

    async getSummary(_params, signal) {
      await settle(signal);
      const now = clock.now();
      return summarizeSubmissions(
        store.all().map(toSignageSubmissionExpanded),
        now,
      ) satisfies SubmissionSummary;
    },

    async create(input: CreateSubmissionInput, mutationOptions?: MutationOptions) {
      await settle(mutationOptions?.signal);
      const existingId = store.resolveIdempotency(
        mutationOptions?.idempotencyKey,
      );
      if (existingId) {
        return toSignageSubmissionExpanded(store.find(existingId));
      }

      if (input.endAt.getTime() <= input.startAt.getTime()) {
        throw invalid("종료 시각은 시작 시각보다 뒤여야 합니다.");
      }

      const now = clock.now();
      const id = `submission-${store.all().length + 1}-${now.getTime()}`;
      const created: SignageSubmissionExpandedDto = {
        id,
        ziggleNoticeId: input.ziggleNoticeId,
        requesterId: "requester-mock",
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
        categoryName: input.categoryId,
        organizationName: "미지정",
        posterUrl: "",
        subtitle: null,
        location: null,
        description: null,
      };
      store.insert(created);
      store.rememberIdempotency(mutationOptions?.idempotencyKey, id);
      return toSignageSubmissionExpanded(created);
    },

    async submit(id, mutationOptions) {
      await settle(mutationOptions?.signal);
      const current = store.find(id);
      if (current.status !== "DRAFT" && current.status !== "REJECTED") {
        throw conflict("제출할 수 있는 상태가 아닙니다.");
      }
      return toSignageSubmissionExpanded(
        store.replace(
          touch(current, clock.now(), { status: "PENDING_REVIEW" }),
        ),
      );
    },

    async cancel(id, mutationOptions) {
      await settle(mutationOptions?.signal);
      const current = store.find(id);
      const cancelable = ["PENDING_REVIEW", "REJECTED", "SCHEDULED"];
      if (!cancelable.includes(current.status)) {
        throw conflict("이미 게시가 시작되어 취소할 수 없습니다.");
      }
      return toSignageSubmissionExpanded(
        store.replace(touch(current, clock.now(), { status: "CANCELED" })),
      );
    },
  };

  const reviews: ReviewRepository = {
    async listPending(params, signal) {
      await settle(signal);
      const pending = store
        .all()
        .filter((item) => item.status === "PENDING_REVIEW")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return paginate(pending, params);
    },

    async listHistory(submissionId, signal) {
      await settle(signal);
      return store.reviewsOf(submissionId).map(toReview);
    },

    async approve(input: ApproveInput, mutationOptions?: MutationOptions) {
      await settle(mutationOptions?.signal);
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
        reviewerId: "reviewer-mock",
        reviewedAt: toIsoUtc(now),
      });
      return toSignageSubmissionExpanded(
        store.replace(touch(current, now, { status })),
      );
    },

    async reject(input: RejectInput, mutationOptions?: MutationOptions) {
      await settle(mutationOptions?.signal);
      if (input.comment.trim().length === 0) {
        throw invalid("반려 사유를 입력해야 합니다.");
      }
      const current = store.find(input.submissionId);
      if (current.status !== "PENDING_REVIEW") {
        throw conflict("다른 관리자가 이미 처리했습니다.");
      }

      const now = clock.now();
      store.addReview({
        id: `review-${now.getTime()}`,
        submissionId: current.id,
        revision: current.version,
        decision: "REJECTED",
        reasonCode: input.reasonCode,
        comment: input.comment,
        reviewerId: "reviewer-mock",
        reviewedAt: toIsoUtc(now),
      });
      return toSignageSubmissionExpanded(
        store.replace(touch(current, now, { status: "REJECTED" })),
      );
    },

    async suspend(input: SuspendInput, mutationOptions?: MutationOptions) {
      await settle(mutationOptions?.signal);
      if (input.reason.trim().length === 0) {
        throw invalid("중단 사유를 입력해야 합니다.");
      }
      const current = store.find(input.submissionId);
      const suspendable = ["APPROVED", "SCHEDULED", "PUBLISHED"];
      if (!suspendable.includes(current.status)) {
        throw conflict("예약 또는 게시 중인 콘텐츠만 중단할 수 있습니다.");
      }
      return toSignageSubmissionExpanded(
        store.replace(touch(current, clock.now(), { status: "SUSPENDED" })),
      );
    },
  };

  const displays: DisplayRepository = {
    async getPlaylist(_deviceId, signal): Promise<Playlist> {
      await settle(signal);
      const now = clock.now();
      const playable = store
        .all()
        .map(toSignageSubmissionExpanded)
        .filter(
          (item) =>
            resolveEffectiveStatus(item, now) === "PUBLISHED" &&
            item.posterUrl.length > 0,
        );

      return toPlaylist({
        serverTime: toIsoUtc(now),
        playlistVersion: `mock:${playable.length}`,
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

  return { submissions, reviews, displays };
}
