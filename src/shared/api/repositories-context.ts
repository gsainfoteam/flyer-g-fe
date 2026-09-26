import { createContext, useContext } from "react";
import type { Repositories } from "@/shared/api/repositories";

export const RepositoriesContext = createContext<Repositories | null>(null);

/** 화면과 feature hook이 데이터 접근 경계를 얻는 유일한 통로다. */
export function useRepositories(): Repositories {
  const value = useContext(RepositoriesContext);
  if (value === null) {
    throw new Error("useRepositories는 RepositoriesProvider 안에서만 쓸 수 있습니다.");
  }
  return value;
}
