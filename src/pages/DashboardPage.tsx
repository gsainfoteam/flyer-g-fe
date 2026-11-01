import { useSessionUser } from "@/features/auth/model/auth-context";
import { getPrimaryRole } from "@/features/auth/model/types";
import { OperatorHome } from "@/widgets/home/OperatorHome";
import { ReviewerHome } from "@/widgets/home/ReviewerHome";
import { UserHome } from "@/widgets/home/UserHome";

/**
 * 로그인한 사람의 첫 화면. 역할마다 온 이유가 달라서 화면을 따로 둔다. (기획 4-0)
 *
 * - 사용자: 무엇을 올릴지, 내 것이 어떻게 됐는지
 * - 하우스 관리자: 쌓인 심사를 처리
 * - 운영자: 문제 없는지, TV에 지금 뭐가 나오는지
 */
export function DashboardPage() {
  const user = useSessionUser();

  switch (getPrimaryRole(user)) {
    case "SUBMITTER":
      return <UserHome />;
    case "REVIEWER":
      return <ReviewerHome />;
    case "SUPER_ADMIN":
      return <OperatorHome />;
  }
}
