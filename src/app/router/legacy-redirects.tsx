import { legacyPaths, to } from "@/shared/config/routes";
import type { MineView } from "@/shared/config/routes";
import { LegacyRedirect } from "./LegacyRedirect";

/**
 * 개편 전 경로를 새 경로로 보낸다. (Phase 09)
 *
 * 공유된 링크·북마크·슬랙 메시지에 옛 주소가 남아 있다. 권한 확인은 도착한 새 경로의
 * guard가 하므로 여기서는 주소만 바꾼다. 상태 탭 같은 query는 그대로 넘긴다.
 */

/**
 * `/submissions?scope=all&status=x` → `/contents?status=x`.
 * 내 신청은 `/mine`의 보기(진행 중 · 지난 것)로 바꾼다. 내 컨텐츠에는 상태 탭이 없다.
 */
function listTarget(search: URLSearchParams): string {
  const status = search.get("status") ?? undefined;
  return search.get("scope") === "all"
    ? to.contents(status)
    : to.mine(mineViewOfStatusGroup(status));
}

/** 옛 상태 탭 → 내 컨텐츠 보기. 둘에 걸친 탭(중단/취소)과 전체는 전체로 본다. */
function mineViewOfStatusGroup(status: string | undefined): MineView | undefined {
  if (status === "ended") return "past";
  if (status && ["pending", "rejected", "approved", "published"].includes(status)) {
    return "active";
  }
  return undefined;
}

function keepQuery(path: string, search: URLSearchParams): string {
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export const legacyRoutes = [
  {
    path: legacyPaths.studio,
    element: (
      <LegacyRedirect build={({ search }) => keepQuery(to.newPoster(), search)} />
    ),
  },
  {
    path: legacyPaths.submissions,
    element: <LegacyRedirect build={({ search }) => listTarget(search)} />,
  },
  {
    path: legacyPaths.submissionDetail,
    element: (
      <LegacyRedirect
        build={({ submissionId }) => to.submissionDetail(submissionId)}
      />
    ),
  },
  {
    path: legacyPaths.reviews,
    element: (
      <LegacyRedirect build={({ search }) => keepQuery(to.review(), search)} />
    ),
  },
  {
    path: legacyPaths.reviewDetail,
    element: (
      <LegacyRedirect
        build={({ submissionId }) => to.reviewDetail(submissionId)}
      />
    ),
  },
  {
    path: legacyPaths.displays,
    element: <LegacyRedirect build={() => to.tv()} />,
  },
  {
    path: legacyPaths.users,
    element: <LegacyRedirect build={() => to.roleSettings()} />,
  },
];
