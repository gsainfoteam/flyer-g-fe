import { AlertTriangle, ExternalLink, FileText } from "lucide-react";
import type { ZiggleNotice } from "@/entities/notice";
import { getCategoryName } from "@/entities/submission";
import { useSubmittableNotices } from "@/features/ziggle-notice/api/queries";
import { PageState } from "@/shared/components";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { formatSeoulDate } from "@/shared/lib/datetime";
import type { ApiError } from "@/shared/api/error";

/**
 * Ziggle 공지 연결 (명세 FR-INT-01).
 *
 * 신청 하나는 공지 하나를 반드시 참조한다. 실제 진입 경로는 Ziggle 공지 작성
 * 화면이며 `?noticeId=`로 넘어온다. 그 값이 없을 때를 위해 목록에서 고를 수도 있게
 * 해 두었다.
 *
 * 없는 공지나 권한 없는 공지는 신청 자체를 막는다. 서버가 최종 판단하며, 여기서는
 * 사용자가 왜 막혔는지 알 수 있게만 한다.
 */
interface NoticePanelProps {
  notice: ZiggleNotice | null;
  noticeId: string | null;
  isLoading: boolean;
  error: ApiError | null;
  onSelectNotice: (noticeId: string) => void;
  onClearNotice: () => void;
}

export function NoticePanel({
  notice,
  noticeId,
  isLoading,
  error,
  onSelectNotice,
  onClearNotice,
}: NoticePanelProps) {
  if (noticeId && error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle aria-hidden="true" />
        <AlertTitle>이 공지로는 신청할 수 없어요</AlertTitle>
        <AlertDescription className="space-y-2">
          <span>
            {error.code === "FORBIDDEN"
              ? "이 공지를 신청할 권한이 없습니다."
              : "공지를 찾을 수 없습니다. 삭제되었거나 주소가 잘못되었을 수 있어요."}
          </span>
          <Button variant="secondary" size="sm" onClick={onClearNotice}>
            다른 공지 고르기
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (notice) {
    return (
      <div className="rounded-card border border-line bg-surface-muted p-3">
        <div className="flex items-start gap-2">
          <FileText
            className="mt-0.5 size-4 shrink-0 text-ink-muted"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="text-caption text-ink-subtle">연결된 Ziggle 공지</p>
            <p className="mt-0.5 truncate text-label text-ink">{notice.title}</p>
            <p className="mt-0.5 truncate text-caption text-ink-muted">
              {notice.organizationName ?? "조직 없음"} ·{" "}
              {getCategoryName(notice.categoryId)} ·{" "}
              {formatSeoulDate(notice.publishedAt)}
            </p>
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <a href={notice.detailUrl} target="_blank" rel="noreferrer noopener">
              <ExternalLink aria-hidden="true" />
              원문 보기
            </a>
          </Button>
          <Button variant="ghost" size="sm" onClick={onClearNotice}>
            공지 바꾸기
          </Button>
        </div>
      </div>
    );
  }

  return <NoticePicker onSelectNotice={onSelectNotice} isBusy={isLoading} />;
}

function NoticePicker({
  onSelectNotice,
  isBusy,
}: {
  onSelectNotice: (noticeId: string) => void;
  isBusy: boolean;
}) {
  const notices = useSubmittableNotices();
  const items = notices.data ?? [];

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-label text-ink">Ziggle 공지 연결</h3>
        <p className="mt-0.5 text-caption text-ink-muted">
          게시할 공지를 고르세요. 신청은 공지 하나에 연결됩니다.
        </p>
      </div>

      <PageState
        isLoading={notices.isPending || isBusy}
        error={notices.error}
        onRetry={() => void notices.refetch()}
        isEmpty={items.length === 0}
        empty={{
          title: "신청할 수 있는 공지가 없어요",
          description: "Ziggle에서 공지를 먼저 작성해 주세요.",
        }}
      >
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelectNotice(item.id)}
                className="w-full rounded-control border border-line bg-surface px-3 py-2 text-left transition hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <span className="block truncate text-label text-ink">
                  {item.title}
                </span>
                <span className="mt-0.5 block truncate text-caption text-ink-muted">
                  {item.organizationName ?? "조직 없음"} ·{" "}
                  {getCategoryName(item.categoryId)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </PageState>
    </div>
  );
}
