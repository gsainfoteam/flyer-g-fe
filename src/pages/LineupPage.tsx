import { useState } from "react";
import { useParams } from "react-router";
import { ListVideo } from "lucide-react";
import { useDevices, useTargetGroups } from "@/entities/device/api/queries";
import {
  useLineup,
  useLineupPrograms,
} from "@/features/devices/model/use-lineup";
import { LineupEditor } from "@/features/devices/ui/LineupEditor";
import { isApiError } from "@/shared/api/error";
import { BackLink, EmptyState, IconTile, PageState, Panel } from "@/shared/components";
import { to } from "@/shared/config/routes";

/**
 * 위치 그룹 편성 (9.3). TV 관리의 대화상자였던 것을 화면 하나로 옮겼다. 블록이 많고
 * 한 바퀴 요약을 옆에 두어야 해서 대화상자 폭으로는 좁았다.
 *
 * 이 그룹을 편성 그룹으로 쓰는 TV에 적용된다.
 */
export function LineupPage() {
  const { groupId = "" } = useParams();
  const groups = useTargetGroups();
  const devices = useDevices();
  const query = useLineup(groupId);
  const programs = useLineupPrograms();
  const [reload, setReload] = useState(0);

  const group = groups.data?.find((item) => item.id === groupId);
  const assigned = (devices.data?.items ?? []).filter(
    (device) => device.programGroupId === groupId,
  );

  return (
    <>
      <div>
        <BackLink to={to.tv()}>TV 관리</BackLink>
        <div className="mt-2 flex items-center gap-3.5">
          <IconTile
            icon={ListVideo}
            size="lg"
            className="bg-surface-muted text-ink"
          />
          <div className="min-w-0">
            <h1 className="text-display text-ink">
              {group ? `${group.name} 편성` : "편성"}
            </h1>
            <p className="mt-0.5 text-label text-ink-muted">
              적용 TV {assigned.length}대
              {assigned.length > 0
                ? ` · ${assigned.map((device) => device.name).join(", ")}`
                : " · 이 그룹을 편성 그룹으로 쓰는 TV 없음"}
            </p>
          </div>
        </div>
      </div>

      {groups.data && !group ? (
        <Panel>
          <EmptyState
            title="위치 그룹을 찾을 수 없음"
            description="지워졌거나 주소가 잘못되었습니다. TV 관리에서 다시 고르세요."
          />
        </Panel>
      ) : query.error &&
        isApiError(query.error) &&
        query.error.status === 404 ? (
        <p role="alert" className="text-body text-ink-muted">
          편성 API를 사용할 수 없습니다. 백엔드 편성 API 배포와 그룹 존재 여부를
          확인하세요.
        </p>
      ) : (
        <PageState
          isLoading={query.isPending || devices.isPending}
          error={query.error ?? devices.error}
          onRetry={() => {
            void query.refetch();
            void devices.refetch();
          }}
          loadingRows={4}
        >
          {query.data && devices.data && (
            <LineupEditor
              // 저장하면 새 버전으로 다시 연다. 저장된 블록 id를 받아 다음 저장에 쓴다.
              key={`${groupId}:${query.data.version}:${reload}`}
              lineup={query.data}
              devices={assigned}
              programs={programs.data ?? []}
              programsError={programs.error}
              onReload={async () => {
                const result = await query.refetch();
                if (result.isSuccess) setReload((n) => n + 1);
              }}
            />
          )}
        </PageState>
      )}
    </>
  );
}
