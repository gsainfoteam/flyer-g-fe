import type { Playlist } from "@/entities/playlist/model/types";
import type { Review, RejectionReasonCode } from "@/entities/review/model/types";
import type {
  Page,
  SignageSubmissionExpanded,
  SubmissionListParams,
  SubmissionSummary,
} from "@/entities/submission/model/types";

/**
 * 데이터 접근 경계. 화면은 이 인터페이스만 알고 구현체는 모른다.
 * mock 구현과 실제 HTTP 구현을 같은 타입으로 교체할 수 있어야 한다.
 *
 * 모든 메서드는 AbortSignal을 받아 취소 가능하고, 실패 시 ApiError를 던진다.
 */

export interface CreateSubmissionInput {
  ziggleNoticeId: string;
  title: string;
  categoryId: string;
  assetId: string;
  detailUrl: string;
  startAt: Date;
  endAt: Date;
  targetGroupIds: string[];
}

export interface MutationOptions {
  /** 명세 FR-SUB-04: 중복 생성 방지 */
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface SubmissionRepository {
  list(
    params: SubmissionListParams,
    signal?: AbortSignal,
  ): Promise<Page<SignageSubmissionExpanded>>;

  getById(
    id: string,
    signal?: AbortSignal,
  ): Promise<SignageSubmissionExpanded>;

  /** 운영 요약. 목록과 같은 기준 시각을 쓰도록 서버가 함께 계산한다. */
  getSummary(
    params: Pick<SubmissionListParams, "scope">,
    signal?: AbortSignal,
  ): Promise<SubmissionSummary>;

  create(
    input: CreateSubmissionInput,
    options?: MutationOptions,
  ): Promise<SignageSubmissionExpanded>;

  submit(
    id: string,
    options?: MutationOptions,
  ): Promise<SignageSubmissionExpanded>;

  cancel(
    id: string,
    options?: MutationOptions,
  ): Promise<SignageSubmissionExpanded>;
}

export interface ApproveInput {
  submissionId: string;
  /** 검토한 버전. 서버는 이 값으로 동시 처리 충돌을 판정한다. 명세 FR-REV-03 */
  revision: number;
}

export interface RejectInput extends ApproveInput {
  reasonCode: RejectionReasonCode;
  /** 게시자에게 공개되는 사유. 비워 둘 수 없다. 명세 FR-REV-04 */
  comment: string;
}

export interface SuspendInput {
  submissionId: string;
  /** 중단 사유는 필수이며 게시자에게 표시한다. 명세 FR-REV-05 */
  reason: string;
}

export interface ReviewRepository {
  listPending(
    params: Omit<SubmissionListParams, "status" | "scope">,
    signal?: AbortSignal,
  ): Promise<Page<SignageSubmissionExpanded>>;

  listHistory(submissionId: string, signal?: AbortSignal): Promise<Review[]>;

  approve(
    input: ApproveInput,
    options?: MutationOptions,
  ): Promise<SignageSubmissionExpanded>;

  reject(
    input: RejectInput,
    options?: MutationOptions,
  ): Promise<SignageSubmissionExpanded>;

  suspend(
    input: SuspendInput,
    options?: MutationOptions,
  ): Promise<SignageSubmissionExpanded>;
}

export interface DisplayRepository {
  /** 기기별 유효 편성. 사용자 세션이 아니라 기기 자격 증명으로 접근한다. */
  getPlaylist(deviceId: string, signal?: AbortSignal): Promise<Playlist>;
}

export interface Repositories {
  submissions: SubmissionRepository;
  reviews: ReviewRepository;
  displays: DisplayRepository;
}
