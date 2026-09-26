import { createContext, useContext } from "react";
import type { ZiggleNoticeAdapter } from "./notice-adapter";

/** Ziggle 공지 조회 경계를 화면에 넘긴다. 앱은 `AppProviders`가 넣는다. */
export const NoticeAdapterContext = createContext<ZiggleNoticeAdapter | null>(
  null,
);

export function useNoticeAdapter(): ZiggleNoticeAdapter {
  const value = useContext(NoticeAdapterContext);
  if (value === null) {
    throw new Error("useNoticeAdapter는 AppProviders 안에서만 쓸 수 있습니다.");
  }
  return value;
}
