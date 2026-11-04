import { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router";
import { to } from "@/shared/config/routes";
import { getRejectionReasonLabel } from "@/entities/review";
import { KIND_INFO, SUBMISSION_KINDS } from "@/entities/submission/model/kind";
import type { SubmissionKind } from "@/entities/submission/model/kind";
import type { SubmissionView } from "@/entities/submission/model/types";
import { TypeIcon } from "@/entities/submission/ui/TypeIcon";
import { useInfinitePendingReviews } from "@/features/reviews/api/queries";
import { useDeferredDecisions } from "@/features/reviews/model/use-deferred-decisions";
import type { DecisionActionsHandle } from "@/features/reviews/ui/DecisionActions";
import { ReviewPanel } from "@/widgets/review/ReviewPanel";
import { useSubmissionSummary } from "@/features/submissions/api/queries";
import { EmptyState, Kbd, PageState } from "@/shared/components";
import { formatElapsed } from "@/shared/lib/datetime";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";
import { LONG_WAIT_MS } from "@/widgets/home/OldestQueue";

/**
 * 심사 (기획 4-2, 명세 FR-REV-01 ~ FR-REV-05).
 *
 * 왼쪽 대기열과 오른쪽 고른 건을 한 화면에 둔다. 목록 → 상세 → 목록으로 오가지
 * 않고 쌓인 건을 빠르게 쳐낸다. 주소의 id가 오른쪽 칸이고, 없으면 대기열 맨 앞이다.
 *
 * - 키보드: `J`·`K` 다음·이전, `A` 승인, `R` 반려(사유는 숫자 키), `S` 나중에.
 * - 결정하면 다음 건으로 넘어가고, 요청은 5초 뒤에 보낸다. 그 사이 되돌릴 수 있다.
 * - 대기열은 오래 기다린 순이다. 기다린 시간은 마지막으로 검토에 낸 때부터 센다.
 * - 대기 중이 아닌 건(전체 컨텐츠에서 연 게시 중 건 등)도 오른쪽에서 볼 수 있다.
 *   그때는 중단만 할 수 있다.
 *
 * 모바일은 한 칸이라 id가 없으면 대기열만, 있으면 고른 건만 보인다.
 */
const TYPE_PARAM = "type";

function readKind(value: string | null): SubmissionKind | null {
  return SUBMISSION_KINDS.find((kind) => kind === value) ?? null;
}

/** 입력 중이거나 대화상자가 열려 있으면 단축키를 쓰지 않는다. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
    target.closest("[role=dialog], [role=listbox], [role=menu]") !== null
  );
}

export function ReviewsPage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const kind = readKind(searchParams.get(TYPE_PARAM));

  const summary = useSubmissionSummary("all");
  const pending = useInfinitePendingReviews(kind ? [kind] : []);
  const decisions = useDeferredDecisions();
  const actionsRef = useRef<DecisionActionsHandle>(null);
  /**
   * 제보 목록의 "반려"로 연 건. 그 건의 칸이 열리면 반려 대화상자를 바로 띄운다.
   * 이동 상태(state)에 실어, 다른 건으로 옮기면 저절로 사라진다.
   */
  const location = useLocation();
  const rejectingId =
    (location.state as { reject?: string } | null)?.reject ?? null;

  const serverTime = pending.data?.serverTime ?? null;
  const queue = (pending.data?.items ?? []).filter(
    (item) => !decisions.hiddenIds.has(item.id),
  );
  const selectedId = submissionId ?? queue[0]?.id ?? null;
  const selectedIndex = queue.findIndex((item) => item.id === selectedId);

  const search = searchParams.toString();
  const hrefOf = (id: string | null) =>
    `${id ? to.reviewDetail(id) : to.review()}${search ? `?${search}` : ""}`;
  const select = (id: string | null) =>
    void navigate(hrefOf(id), { replace: true });

  /** 지금 건 다음에 볼 건. 마지막이면 앞 건, 하나뿐이면 없다. */
  const nextAfter = (id: string) => {
    const index = queue.findIndex((item) => item.id === id);
    const rest = queue.filter((item) => item.id !== id);
    if (index < 0) return rest[0]?.id ?? null;
    return (rest[index] ?? rest[index - 1])?.id ?? null;
  };

  const move = (step: 1 | -1) => {
    if (queue.length === 0) return;
    const from = selectedIndex < 0 ? (step === 1 ? -1 : 0) : selectedIndex;
    const index = Math.min(queue.length - 1, Math.max(0, from + step));
    select(queue[index]!.id);
  };

  // 키 처리는 렌더마다 바뀌는 대기열을 보므로 ref로 최신 함수를 든다.
  const keyHandlerRef = useRef<(event: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    keyHandlerRef.current = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      switch (event.key.toLowerCase()) {
        case "j":
          move(1);
          break;
        case "k":
          move(-1);
          break;
        case "a":
          actionsRef.current?.approve();
          break;
        case "r":
          actionsRef.current?.openReject();
          break;
        case "s":
          if (selectedId) select(nextAfter(selectedId) ?? selectedId);
          break;
        default:
          return;
      }
      event.preventDefault();
    };
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => keyHandlerRef.current(event);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const setKind = (next: SubmissionKind | null) => {
    const params = new URLSearchParams(searchParams);
    if (next) params.set(TYPE_PARAM, next);
    else params.delete(TYPE_PARAM);
    const query = params.toString();
    // 종류를 바꾸면 그 종류의 맨 앞 건부터 본다.
    void navigate(`${to.review()}${query ? `?${query}` : ""}`, {
      replace: true,
    });
  };

  const approve = (submission: {
    id: string;
    version: number;
    title: string;
  }) => {
    decisions.schedule(
      {
        kind: "approve",
        submissionId: submission.id,
        revision: submission.version,
      },
      `승인 · ${submission.title}`,
    );
    if (submission.id === selectedId) select(nextAfter(submission.id));
  };

  const askReject = (id: string) => {
    if (id === selectedId) {
      actionsRef.current?.openReject();
      return;
    }
    void navigate(hrefOf(id), { replace: true, state: { reject: id } });
  };

  const total = summary.data?.pendingReview ?? null;
  const countOf = (value: SubmissionKind | null) =>
    value === null
      ? total
      : (summary.data?.byType[value].pendingReview ?? null);
  const oldest = pending.data?.items[0];

  return (
    <PageState
      isLoading={pending.isPending}
      error={pending.error}
      onRetry={() => void pending.refetch()}
      loadingRows={6}
    >
      {pending.data && serverTime && (
        <>
          <div
            className={cn(
              "flex flex-wrap items-end gap-x-6 gap-y-2",
              submissionId && "max-lg:hidden",
            )}
          >
            <div className="min-w-0 flex-1">
              <h1 className="text-display text-ink">심사</h1>
              <p className="mt-1.5 text-label text-ink-muted">
                {[
                  `대기 ${total ?? pending.data.totalCount}건`,
                  oldest &&
                    `가장 오래 기다림 ${formatElapsed(
                      oldest.submittedAt ?? oldest.createdAt,
                      serverTime,
                    )}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <p className="flex flex-wrap items-center gap-1.5 text-caption text-ink-muted max-md:hidden">
              <Kbd>J</Kbd>
              <Kbd>K</Kbd> 이동 · <Kbd>A</Kbd> 승인 · <Kbd>R</Kbd> 반려 ·{" "}
              <Kbd>S</Kbd> 나중에
            </p>
          </div>

          <div
            role="tablist"
            aria-label="종류"
            className={cn(
              "flex flex-wrap gap-x-6 border-b border-line",
              submissionId && "max-lg:hidden",
            )}
          >
            {([null, ...SUBMISSION_KINDS] as const).map((value) => {
              const active = value === kind;
              const count = countOf(value);
              return (
                <button
                  key={value ?? "all"}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setKind(value)}
                  className={cn(
                    "-mb-px border-b-2 py-2.5 text-label transition-colors",
                    active
                      ? "border-ink font-bold text-ink"
                      : "border-transparent text-ink-muted hover:text-ink",
                  )}
                >
                  {value ? KIND_INFO[value].short : "전체"}
                  {count !== null && ` ${count}`}
                </button>
              );
            })}
          </div>

          <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(300px,400px)_minmax(0,1fr)]">
            <section
              aria-label="대기열"
              className={cn(
                "overflow-hidden rounded-block bg-surface ring-1 ring-line",
                submissionId && "max-lg:hidden",
              )}
            >
              {queue.length === 0 ? (
                <EmptyState
                  title={
                    kind
                      ? `기다리는 ${KIND_INFO[kind].short} 없음`
                      : "기다리는 컨텐츠 없음"
                  }
                  description="새로 들어오면 여기에 가장 먼저 보여드려요."
                  className="px-4"
                />
              ) : (
                <ul>
                  {queue.map((item) => (
                    <QueueRow
                      key={item.id}
                      item={item}
                      now={serverTime}
                      href={hrefOf(item.id)}
                      selected={item.id === selectedId}
                      // 주소에 id가 없으면 넓은 화면만 맨 앞 건을 오른쪽에 띄운다.
                      implicit={!submissionId}
                      // 제보는 본문이 짧아 목록에서 바로 처리한다. 일괄 처리는 두지 않는다.
                      inline={
                        kind === "STORY" && item.type === "STORY"
                          ? {
                              onApprove: () => approve(item),
                              onReject: () => askReject(item.id),
                            }
                          : undefined
                      }
                    />
                  ))}
                </ul>
              )}
              {pending.hasNextPage && (
                <div className="border-t border-line p-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    disabled={pending.isFetchingNextPage}
                    onClick={() => void pending.fetchNextPage()}
                  >
                    {pending.isFetchingNextPage && (
                      <Spinner aria-hidden="true" />
                    )}
                    더 보기 ({pending.data.items.length} /{" "}
                    {pending.data.totalCount})
                  </Button>
                </div>
              )}
            </section>

            <section
              aria-label="고른 컨텐츠"
              className={cn(
                "flex min-w-0 flex-col gap-5",
                !submissionId && "max-lg:hidden",
              )}
            >
              {selectedId ? (
                <ReviewPanel
                  submissionId={selectedId}
                  actionsRef={actionsRef}
                  openReject={rejectingId === selectedId}
                  header={
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="mb-2 -ml-2.5 lg:hidden"
                    >
                      <Link to={hrefOf(null)}>
                        <ArrowLeft aria-hidden="true" />
                        대기열로
                      </Link>
                    </Button>
                  }
                  onApprove={approve}
                  onReject={(submission, values) => {
                    decisions.schedule(
                      {
                        kind: "reject",
                        submissionId: submission.id,
                        revision: submission.version,
                        ...values,
                      },
                      `반려 · ${getRejectionReasonLabel(values.reasonCode)} · ${submission.title}`,
                    );
                    select(nextAfter(submission.id));
                  }}
                />
              ) : (
                <EmptyState
                  title="모두 처리함"
                  description="다른 종류 탭에 남은 건이 있는지 보세요."
                  className="rounded-block bg-surface ring-1 ring-line"
                />
              )}
            </section>
          </div>
        </>
      )}
    </PageState>
  );
}

function QueueRow({
  item,
  now,
  href,
  selected,
  implicit,
  inline,
}: {
  item: SubmissionView;
  now: Date;
  href: string;
  selected: boolean;
  implicit: boolean;
  /** 제보 탭에서 행마다 바로 승인·반려 */
  inline?: { onApprove: () => void; onReject: () => void };
}) {
  const since = item.submittedAt ?? item.createdAt;
  const old = now.getTime() - since.getTime() > LONG_WAIT_MS;
  return (
    <li className="border-b border-surface-muted last:border-b-0">
      <Link
        to={href}
        replace
        aria-current={selected && !implicit ? "true" : undefined}
        className={cn(
          "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
          selected && (implicit ? "lg:bg-surface-muted" : "bg-surface-muted"),
        )}
      >
        <TypeIcon kind={item.type} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-caption text-ink-subtle">
            {KIND_INFO[item.type].short} · {item.requesterName ?? "작성자 가림"}
          </p>
          {/* 제보 제목은 본문 앞부분이라, 본문을 펼쳐 보일 때는 뺀다. */}
          {!inline && (
            <p className="truncate text-label font-semibold text-ink">
              {item.title}
            </p>
          )}
        </div>
        <span
          className={cn(
            "shrink-0 text-caption whitespace-nowrap tabular-nums",
            old ? "font-bold text-accent-700" : "text-ink-muted",
          )}
        >
          {formatElapsed(since, now)}
        </span>
      </Link>
      {inline && item.story && (
        <div className="px-4 pb-3 pl-15">
          <p className="text-label whitespace-pre-line text-ink">
            {item.story.body}
          </p>
          <div className="mt-2 flex gap-2">
            <Button size="xs" onClick={inline.onApprove}>
              승인
            </Button>
            <Button size="xs" variant="secondary" onClick={inline.onReject}>
              반려
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
