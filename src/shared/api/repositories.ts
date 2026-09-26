import type { DeviceList, TargetGroup } from "@/entities/device/model/types";
import type { Playlist } from "@/entities/playlist/model/types";
import type {
  RejectionReasonCode,
  SubmissionEvent,
} from "@/entities/review/model/types";
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
 *
 * 권한은 서버가 세션으로 판단한다. 화면은 역할에 맞는 메서드만 부르지만, 잘못
 * 부르면 401(세션 없음)이나 403(권한 없음)이 온다. (명세 3.2 권한 매트릭스)
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

/**
 * 제출 전(DRAFT·REJECTED) 수정. 명세 FR-INT-02.
 * 승인 후 변경의 재승인 여부는 서버 정책이며, 프론트는 응답 상태를 그대로 따른다.
 */
export interface UpdateSubmissionInput
  extends Partial<Omit<CreateSubmissionInput, "ziggleNoticeId">> {
  /** 화면이 본 버전. 서버는 이 값으로 동시 수정 충돌을 판정한다. */
  version: number;
}

/** 신청 취소. `API-REQUIREMENTS.md` 5.7 */
export interface CancelSubmissionInput {
  /** 화면이 본 버전. 최신이 아니면 서버가 409를 준다. */
  version: number;
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

  update(
    id: string,
    input: UpdateSubmissionInput,
    options?: MutationOptions,
  ): Promise<SignageSubmissionExpanded>;

  submit(
    id: string,
    options?: MutationOptions,
  ): Promise<SignageSubmissionExpanded>;

  cancel(
    id: string,
    input: CancelSubmissionInput,
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

  /** 신청의 처리 이력. 제출·재제출·검토 결정·취소를 시간 순으로 준다. */
  listHistory(
    submissionId: string,
    signal?: AbortSignal,
  ): Promise<SubmissionEvent[]>;

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

export interface DeviceRepository {
  /** 기기 목록과 연결 상태. 하우스 관리자 이상. `API-REQUIREMENTS.md` 11.1 */
  list(signal?: AbortSignal): Promise<DeviceList>;

  /** 게시 대상 위치 묶음. 로그인한 누구나. `API-REQUIREMENTS.md` 10.2 */
  listTargetGroups(signal?: AbortSignal): Promise<TargetGroup[]>;
}

export interface Repositories {
  submissions: SubmissionRepository;
  reviews: ReviewRepository;
  displays: DisplayRepository;
  devices: DeviceRepository;
}
