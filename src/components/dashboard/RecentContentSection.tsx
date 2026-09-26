import { useState } from "react";
import { Link } from "react-router";
import { to } from "@/app/router/routes";
import {
  STATUS_GROUPS,
  countByStatusGroup,
  findStatusGroup,
  getStatusSentence,
} from "@/entities/submission";
import type { SubmissionView } from "@/entities/submission/model/types";
import {
  useSubmissionSummary,
  useSubmissionViews,
} from "@/features/submissions/api/queries";
import { StatusGroupTabs } from "@/features/submissions/list/ui/StatusGroupTabs";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Panel,
  StatusBadge,
} from "@/shared/components";
import {
  formatSeoulDateTime,
  formatSeoulShortDate,
} from "@/shared/lib/datetime";
import { Button } from "@/shared/ui/button";
import { SubmissionRow } from "../common/SubmissionRow";

/**
 * 내 신청 미리보기 (대시보드).
 *
 * 각 행은 상태 배지와 함께 "지금 어떤 상황인지" 한 문장을 보여준다. 배지 색을
 * 구분하지 못해도 무엇을 해야 하는지 알 수 있어야 한다.
 *
 * 탭과 건수는 목록 화면과 같다(`StatusGroupTabs`). 탭을 고르면 그 상태의 신청을
 * 서버에서 몇 건만 받아 온다. 건수는 서버 요약에서 온다.
 */
const PREVIEW_COUNT = 6;
const PANEL_ID = "recent-submissions";

function sentenceFor(submission: SubmissionView): string {
  return getStatusSentence({
    status: submission.status,
    startsAtLabel: formatSeoulDateTime(submission.startAt),
    endsAtLabel: formatSeoulShortDate(submission.endAt),
  });
}

export function RecentContentSection() {
  const [groupKey, setGroupKey] = useState(STATUS_GROUPS[0]!.key);
  const group = findStatusGroup(groupKey);

  const summary = useSubmissionSummary("me");
  const list = useSubmissionViews(
    { statuses: group.statuses, scope: "me", limit: PREVIEW_COUNT },
    { keepPrevious: true },
  );
  const counts = summary.data
    ? countByStatusGroup(summary.data.byStatus)
    : undefined;
  const groupCount = counts?.[group.key];

  return (
    <Panel
      title="내 신청"
      action={
        <Button variant="link" size="xs" asChild>
          <Link to={to.studio()}>새 게시 신청 →</Link>
        </Button>
      }
      flush
    >
      <StatusGroupTabs
        activeKey={group.key}
        onSelect={setGroupKey}
        counts={counts}
        panelId={PANEL_ID}
        className="mb-1.5 px-3"
      />

      <div
        id={PANEL_ID}
        role="tabpanel"
        aria-labelledby={`status-tab-${group.key}`}
      >
        {list.isPending ? (
          <LoadingState rows={3} className="px-3" />
        ) : list.error ? (
          <ErrorState
            error={list.error}
            onRetry={() => void list.refetch()}
            className="px-3"
          />
        ) : list.data.items.length === 0 ? (
          <EmptyState
            title={
              group.statuses.length === 0
                ? "아직 신청이 없어요"
                : `${group.label} 상태의 신청이 없어요`
            }
            description={
              group.statuses.length === 0
                ? "Ziggle 공지를 연결해 첫 게시를 신청해 보세요."
                : "다른 상태를 눌러 보세요."
            }
            className="px-3"
          />
        ) : (
          // 구분선은 li에 그린다. rounded가 걸린 행 안쪽에 그리면 모서리를 따라 휜다.
          <ul className="flex flex-col divide-y divide-line">
            {list.data.items.map((submission) => (
              <SubmissionRow
                key={submission.id}
                submission={submission}
                sentence={sentenceFor(submission)}
                href={to.submissionDetail(submission.id)}
                trailing={<StatusBadge status={submission.status} />}
              />
            ))}
          </ul>
        )}
      </div>

      {list.data && list.data.totalCount > PREVIEW_COUNT && (
        <div className="border-t border-line px-3 pt-2 pb-1">
          <Button variant="link" size="xs" asChild>
            <Link to={to.submissions(group.key)}>
              전체 {groupCount ?? list.data.totalCount}건 보기 →
            </Link>
          </Button>
        </div>
      )}
    </Panel>
  );
}
