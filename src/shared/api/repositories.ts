import type {
  DeviceInput,
  DeviceList,
  DeviceWithToken,
  DisplayDevice,
  TargetGroup,
  TargetGroupInput,
  UpdateDeviceInput,
  UpdateTargetGroupInput,
} from "@/entities/device/model/types";
import type {
  Category,
  SignageConfig,
} from "@/entities/submission/model/policy";
import type { Playlist } from "@/entities/playlist/model/types";
import type {
  ImpressionStats,
  ImpressionStatsParams,
} from "@/entities/impression/model/types";
import type {
  DecisionRecord,
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

/**
 * 게시 신청. 만들면 바로 검토 대기가 된다(생성과 제출이 한 번).
 * (`API-CHANGES-BACKEND.md` 5.2)
 *
 * Ziggle 공지를 조회할 API가 없어 주최·부제·장소·설명은 신청자가 직접 입력한다.
 * 공지 ID는 서버가 `detailUrl`에서 뽑는다.
 */
export interface CreateSubmissionInput {
  title: string;
  categoryId: string;
  assetId: string;
  /** 상세 링크(QR). 없으면 QR 없이 게시한다. */
  detailUrl: string | null;
  organizerName: string | null;
  subtitle: string | null;
  location: string | null;
  description: string | null;
  startAt: Date;
  endAt: Date;
  targetGroupIds: string[];
}

/**
 * 신청 수정. 명세 FR-INT-02.
 *
 * 선택 입력(`detailUrl` 등)은 null이면 비운다. 게시 시작 전 승인 건을 고치면 서버가
 * 승인 대기로 되돌린다(재승인). 프론트는 응답 상태를 그대로 따른다.
 */
export interface UpdateSubmissionInput extends Partial<CreateSubmissionInput> {
  /** 화면이 본 버전. 서버는 이 값으로 동시 수정 충돌을 판정한다. */
  version: number;
}

/** 버전만 싣는 상태 변경(재검토 요청, 취소). 최신이 아니면 서버가 409를 준다. */
export interface SubmissionVersionInput {
  /** 화면이 본 버전 */
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

  getById(id: string, signal?: AbortSignal): Promise<SignageSubmissionExpanded>;

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

  /** 반려된 신청을 고친 뒤 다시 검토를 요청한다. (`API-CHANGES-BACKEND.md` 5.3) */
  submit(
    id: string,
    input: SubmissionVersionInput,
    options?: MutationOptions,
  ): Promise<SignageSubmissionExpanded>;

  cancel(
    id: string,
    input: SubmissionVersionInput,
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

export interface PendingReviewParams extends Omit<
  SubmissionListParams,
  "status" | "statuses" | "scope"
> {
  /** 카테고리로 거른다. 서버가 거른다. */
  categoryId?: string | null;
}

export interface ReviewRepository {
  /** 승인 대기 목록. 오래 기다린 순(마지막 검토 요청 시각 오름차순). */
  listPending(
    params: PendingReviewParams,
    signal?: AbortSignal,
  ): Promise<Page<SignageSubmissionExpanded>>;

  /**
   * 신청의 처리 이력. 제출·재제출·검토 결정·취소와 게시 시작·종료를 시간 순으로
   * 준다.
   */
  listHistory(
    submissionId: string,
    signal?: AbortSignal,
  ): Promise<SubmissionEvent[]>;

  /** 모든 신청에 걸친 최근 검토 결정(승인·반려·중단). 최신순. 검토자만. */
  listRecentDecisions(
    params: { limit: number },
    signal?: AbortSignal,
  ): Promise<DecisionRecord[]>;

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

  /** 기기 등록. SUPER_ADMIN만. 응답에 토큰 원문이 한 번만 온다. */
  create(input: DeviceInput, signal?: AbortSignal): Promise<DeviceWithToken>;

  /** 이름·위치·그룹·화면 설정 수정, 사용 안 함. SUPER_ADMIN만. */
  update(
    id: string,
    input: UpdateDeviceInput,
    signal?: AbortSignal,
  ): Promise<DisplayDevice>;

  /** 토큰 재발급. 이전 토큰은 즉시 무효다. SUPER_ADMIN만. */
  rotateToken(id: string, signal?: AbortSignal): Promise<DeviceWithToken>;
}

/**
 * 참조 데이터와 운영 설정. 조회는 로그인한 누구나. (`API-REQUIREMENTS.md` 10절)
 * 위치 그룹 관리만 SUPER_ADMIN이 한다.
 */
export interface ReferenceRepository {
  /** 게시 운영 제한값. 폼이 서버와 같은 규칙으로 미리 막는다. */
  getConfig(signal?: AbortSignal): Promise<SignageConfig>;
  /** 게시 카테고리. 숨긴 카테고리는 빠진다. */
  listCategories(signal?: AbortSignal): Promise<Category[]>;
  /** 위치 그룹. 이름순이고 숨긴 그룹도 온다. 선택 목록에서는 화면이 거른다. */
  listTargetGroups(signal?: AbortSignal): Promise<TargetGroup[]>;
  /** 그룹 추가. 대소문자를 무시하고 이름이 겹치면 422 `fields.name`. */
  createTargetGroup(
    input: TargetGroupInput,
    signal?: AbortSignal,
  ): Promise<TargetGroup>;
  /** 이름 변경·숨김. 숨겨도 이미 연결된 기기·신청은 그대로다. */
  updateTargetGroup(
    id: string,
    input: UpdateTargetGroupInput,
    signal?: AbortSignal,
  ): Promise<TargetGroup>;
  /** 삭제. 기기나 신청(취소·종료 포함)이 쓰고 있으면 409다. */
  deleteTargetGroup(id: string, signal?: AbortSignal): Promise<void>;
}

/** 노출 통계. 사람이 본 횟수가 아니라 기기가 포스터를 정상으로 띄운 횟수다. */
export interface StatsRepository {
  /** 기간 안의 게시물별 노출. 노출이 많은 순이다. `scope: "all"`은 검토자만. */
  getImpressions(
    params: ImpressionStatsParams,
    signal?: AbortSignal,
  ): Promise<ImpressionStats>;
}

export interface Repositories {
  submissions: SubmissionRepository;
  reviews: ReviewRepository;
  displays: DisplayRepository;
  devices: DeviceRepository;
  reference: ReferenceRepository;
  stats: StatsRepository;
}
