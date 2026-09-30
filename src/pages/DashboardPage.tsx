import { useSessionUser } from "@/features/auth/model/auth-context";
import { getPrimaryRole } from "@/features/auth/model/types";
import { ReviewerHome } from "@/widgets/dashboard/admin/ReviewerHome";
import { SubmitterHome } from "@/widgets/dashboard/submitter/SubmitterHome";

/**
 * 홈. 역할마다 여는 이유가 달라서 화면을 따로 둔다.
 *
 * - 게시자: 내 신청이 지금 어디쯤인지, 그사이 무엇이 바뀌었는지
 * - 하우스 관리자: 처리할 신청, 지금 걸린 포스터, 기기와 오늘의 변화
 */
export function DashboardPage() {
  const user = useSessionUser();

  switch (getPrimaryRole(user)) {
    case "SUBMITTER":
      return <SubmitterHome />;
    default:
      return <ReviewerHome />;
  }
}
