import { useState } from "react";
import { toast } from "sonner";
import type { TargetGroup } from "@/entities/device/model/types";
import { isApiError, toUserMessage } from "@/shared/api/error";
import {
  ConfirmActionDialog,
  EmptyState,
  PageState,
  Panel,
  SectionHeader,
} from "@/shared/components";
import { Button } from "@/shared/ui/button";
import { useDeleteTargetGroup } from "../model/use-target-group-mutations";
import { TargetGroupFormDialog } from "./TargetGroupFormDialog";

/**
 * 위치 그룹 관리 (`flyer-g-be` PR 16). 기기 관리 화면 아래에 둔다.
 *
 * 그룹을 추가하고 이름을 바꾸고 숨긴다. 삭제는 TV나 신청이 한 번도 쓰지 않은
 * 그룹만 된다(오타 정리용). 쓰는 곳이 있으면 서버가 409를 주고, 그때는 숨긴다.
 */
interface TargetGroupsSectionProps {
  groups: readonly TargetGroup[] | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}

export function TargetGroupsSection({
  groups,
  isLoading,
  error,
  onRetry,
}: TargetGroupsSectionProps) {
  const [editing, setEditing] = useState<TargetGroup | "new" | null>(null);
  const [deleting, setDeleting] = useState<TargetGroup | null>(null);
  const remove = useDeleteTargetGroup();
  const list = groups ?? [];

  return (
    <section className="flex flex-col gap-4">
      <SectionHeader
        title={groups ? `위치 그룹 ${groups.length}개` : "위치 그룹"}
        action={
          <Button
            variant="secondary"
            size="sm"
            disabled={!groups}
            onClick={() => setEditing("new")}
          >
            그룹 추가
          </Button>
        }
      />

      <Panel flush>
        <PageState
          isLoading={isLoading}
          error={error}
          onRetry={onRetry}
          loadingRows={2}
        >
          {list.length === 0 ? (
            <EmptyState
              title="위치 그룹이 없어요"
              description="그룹이 없으면 모든 게시물이 모든 TV에 나가요."
              className="px-5"
            />
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {list.map((group) => (
                <TargetGroupRow
                  key={group.id}
                  group={group}
                  onEdit={() => setEditing(group)}
                  onDelete={() => setDeleting(group)}
                />
              ))}
            </ul>
          )}
        </PageState>
      </Panel>

      {editing !== null && (
        <TargetGroupFormDialog
          // 그룹마다 새 폼으로 연다. 다른 그룹의 입력이 남지 않게.
          key={editing === "new" ? "new" : editing.id}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          group={editing === "new" ? null : editing}
          groups={list}
        />
      )}

      <ConfirmActionDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={`${deleting?.name ?? ""} 그룹을 삭제할까요?`}
        description="TV나 신청이 한 번이라도 쓴 그룹은 지울 수 없어요. 그때는 수정에서 숨겨 주세요."
        confirmLabel="삭제"
        tone="destructive"
        onConfirm={async () => {
          if (!deleting) return;
          await remove.mutateAsync(deleting.id);
          toast.success(`${deleting.name} 그룹을 삭제했어요`);
        }}
        onError={(cause) => {
          if (isApiError(cause) && cause.status === 409) {
            setDeleting(null);
            toast.error("쓰고 있는 그룹이라 지울 수 없어요", {
              description: "수정에서 숨기면 새 기기·신청에서 고를 수 없어요.",
            });
            return;
          }
          toast.error("삭제하지 못했어요", {
            description: isApiError(cause)
              ? toUserMessage(cause)
              : "잠시 후 다시 시도해 주세요.",
          });
        }}
      />
    </section>
  );
}

function TargetGroupRow({
  group,
  onEdit,
  onDelete,
}: {
  group: TargetGroup;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const facts = [
    group.deviceCount > 0
      ? `사용 중 TV ${group.deviceCount}대`
      : "사용 중 TV 없음",
    group.isHidden && "숨김 · 새 기기·신청에서 제외",
  ].filter(Boolean);

  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p
          className={
            group.isHidden
              ? "truncate text-label font-bold text-ink-muted"
              : "truncate text-label font-bold text-ink"
          }
        >
          {group.name}
        </p>
        <p className="mt-0.5 text-caption text-ink-subtle">
          {facts.join(" · ")}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="secondary" size="sm" onClick={onEdit}>
          수정
        </Button>
        <Button variant="outline" size="sm" onClick={onDelete}>
          삭제
        </Button>
      </div>
    </li>
  );
}
