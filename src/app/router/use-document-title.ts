import { useEffect } from "react";
import { useMatches } from "react-router";

/**
 * 브라우저 탭 제목을 지금 화면에 맞춘다.
 *
 * 탭 여러 개를 띄워 두는 관리자가 어느 탭이 무엇인지 알 수 있어야 한다. 제목은
 * route의 `handle.title`에서 가장 안쪽 것을 쓴다.
 */
const SERVICE_NAME = "전단지";
const DEFAULT_TITLE = `${SERVICE_NAME} · GIST 학사기숙사 로비 TV 게시판`;

export interface RouteHandle {
  title?: string;
}

export function useDocumentTitle() {
  const matches = useMatches();
  const title = [...matches]
    .reverse()
    .map((match) => (match.handle as RouteHandle | undefined)?.title)
    .find(Boolean);

  useEffect(() => {
    document.title = title ? `${title} · ${SERVICE_NAME}` : DEFAULT_TITLE;
  }, [title]);
}
