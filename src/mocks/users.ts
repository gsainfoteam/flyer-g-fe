import type { Role, SessionUser } from "@/features/auth/model/types";

/**
 * 개발용 사용자와 주최 이름.
 *
 * 서버에는 조직 모델이 없다. 세션의 `organizationIds`는 항상 빈 배열이고, 주최는
 * 신청마다 자유 입력한다(`API-CHANGES-BACKEND.md` 2절). `MOCK_ORGANIZATIONS`는
 * fixture의 주최 이름으로만 쓴다.
 *
 * mock 세션(`features/auth/api/mock-auth.ts`)과 mock repository가 같은 사람을
 * 가리키도록 한 곳에 둔다. 신청의 소유자(`requesterId`)와 검토 기록자가 실제
 * 로그인한 역할과 이어져야 권한 경계를 화면에서 확인할 수 있다.
 *
 * 로그인할 수 있는 사람은 역할별 세 명이다. 그 밖의 신청자는 fixture에만 있는
 * 다른 학생·부서다.
 */
export const MOCK_ORGANIZATIONS = {
  superficial: { id: "org-superficial", name: "슈퍼-피셜" },
  piano: { id: "org-piano", name: "GISRI 피아노 동아리" },
  houseOffice: { id: "org-house-office", name: "학사기숙사 하우스오피스" },
  infoteam: { id: "org-infoteam", name: "GSA Infoteam" },
} as const;

export const MOCK_USERS: Record<Role, SessionUser> = {
  SUBMITTER: {
    id: "user-submitter",
    displayName: "정하윤",
    roles: ["SUBMITTER"],
    organizationIds: [],
  },
  REVIEWER: {
    id: "user-reviewer",
    displayName: "이수현",
    roles: ["SUBMITTER", "REVIEWER"],
    organizationIds: [],
  },
  SUPER_ADMIN: {
    id: "user-operator",
    displayName: "김도윤",
    roles: ["SUBMITTER", "REVIEWER", "SUPER_ADMIN"],
    organizationIds: [],
  },
};
