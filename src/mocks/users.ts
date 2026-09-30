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

/**
 * 역할 관리 화면(`/signage/users`)의 사용자. 한 번 이상 로그인한 사람들이다.
 *
 * 로그인할 수 있는 세 명(`MOCK_USERS`)을 같은 id로 넣어, 운영자로 들어왔을 때 본인
 * 행이 막히는지 확인할 수 있다. 신청 fixture의 신청자도 같은 id로 넣는다. 교직원은
 * 학번이 없고, 동명이인을 둬 이메일·학번으로 구분하는 모습을 본다.
 *
 * `lastLoginDaysAgo`·`joinedDaysAgo`는 mock이 시작한 시각에서 센다.
 */
export interface MockAccountSeed {
  id: string;
  name: string;
  email: string;
  studentId: string | null;
  grantedRoles: ("REVIEWER" | "SUPER_ADMIN")[];
  lastLoginDaysAgo: number;
  joinedDaysAgo: number;
}

export const MOCK_ACCOUNTS: readonly MockAccountSeed[] = [
  {
    id: MOCK_USERS.SUPER_ADMIN.id,
    name: MOCK_USERS.SUPER_ADMIN.displayName,
    email: "doyun.kim@gist.ac.kr",
    studentId: null,
    grantedRoles: ["SUPER_ADMIN"],
    lastLoginDaysAgo: 0,
    joinedDaysAgo: 210,
  },
  {
    id: "user-operator-2",
    name: "최인준",
    email: "injun.choi@gm.gist.ac.kr",
    studentId: "20215123",
    grantedRoles: ["REVIEWER", "SUPER_ADMIN"],
    lastLoginDaysAgo: 2,
    joinedDaysAgo: 205,
  },
  {
    id: MOCK_USERS.REVIEWER.id,
    name: MOCK_USERS.REVIEWER.displayName,
    email: "suhyun.lee@gist.ac.kr",
    studentId: null,
    grantedRoles: ["REVIEWER"],
    lastLoginDaysAgo: 0,
    joinedDaysAgo: 190,
  },
  {
    id: "user-house-office-2",
    name: "오세린",
    email: "serin.oh@gist.ac.kr",
    studentId: null,
    grantedRoles: ["REVIEWER"],
    lastLoginDaysAgo: 6,
    joinedDaysAgo: 120,
  },
  {
    id: "user-house-ra",
    name: "문태오",
    email: "taeo.moon@gm.gist.ac.kr",
    studentId: "20221187",
    grantedRoles: ["REVIEWER"],
    lastLoginDaysAgo: 34,
    joinedDaysAgo: 150,
  },
  {
    id: MOCK_USERS.SUBMITTER.id,
    name: MOCK_USERS.SUBMITTER.displayName,
    email: "hayun.jung@gm.gist.ac.kr",
    studentId: "20245012",
    grantedRoles: [],
    lastLoginDaysAgo: 1,
    joinedDaysAgo: 30,
  },
  {
    id: "user-ibs-lab",
    name: "박연구",
    email: "yeongu.park@gist.ac.kr",
    studentId: null,
    grantedRoles: [],
    lastLoginDaysAgo: 12,
    joinedDaysAgo: 60,
  },
  {
    id: "user-gist-news",
    name: "최기자",
    email: "gija.choi@gm.gist.ac.kr",
    studentId: "20231044",
    grantedRoles: [],
    lastLoginDaysAgo: 3,
    joinedDaysAgo: 80,
  },
  {
    id: "user-student-support",
    name: "한지원",
    email: "jiwon.han@gist.ac.kr",
    studentId: null,
    grantedRoles: [],
    lastLoginDaysAgo: 8,
    joinedDaysAgo: 95,
  },
  // 동명이인. 이메일과 학번으로 구분한다.
  {
    id: "user-kim-gist-1",
    name: "김지스트",
    email: "gist.kim@gm.gist.ac.kr",
    studentId: "20245001",
    grantedRoles: [],
    lastLoginDaysAgo: 4,
    joinedDaysAgo: 28,
  },
  {
    id: "user-kim-gist-2",
    name: "김지스트",
    email: "jiseu.kim@gm.gist.ac.kr",
    studentId: "20211093",
    grantedRoles: [],
    lastLoginDaysAgo: 40,
    joinedDaysAgo: 400,
  },
  ...(
    [
      ["강민서", "minseo.kang", "20241003", 5, 25],
      ["고은별", "eunbyeol.ko", "20231177", 14, 70],
      ["남궁윤", "yoon.namgung", "20221056", 2, 300],
      ["류하준", "hajun.ryu", "20245088", 0, 10],
      ["배서연", "seoyeon.bae", "20231020", 21, 190],
      ["서지호", "jiho.seo", "20211140", 60, 420],
      ["송예린", "yerin.song", "20245130", 1, 7],
      ["안도현", "dohyun.ahn", "20221199", 9, 240],
      ["윤채원", "chaewon.yoon", "20241066", 3, 45],
      ["임건우", "gunwoo.lim", "20231102", 17, 130],
      ["장나은", "naeun.jang", "20245021", 6, 15],
      ["조현우", "hyunwoo.cho", "20211077", 90, 500],
      ["천소율", "soyul.cheon", "20241149", 11, 33],
      ["하은찬", "eunchan.ha", "20231068", 25, 160],
      ["황보민", "min.hwangbo", null, 7, 110],
    ] as const
  ).map(
    ([name, handle, studentId, lastLoginDaysAgo, joinedDaysAgo], index) => ({
      id: `user-student-${index + 1}`,
      name,
      email: `${handle}@${studentId ? "gm.gist.ac.kr" : "gist.ac.kr"}`,
      studentId,
      grantedRoles: [],
      lastLoginDaysAgo,
      joinedDaysAgo,
    }),
  ),
];
