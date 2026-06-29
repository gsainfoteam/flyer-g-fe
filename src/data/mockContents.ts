import type { NoticeContent } from "../types/content";

export const mockContents: NoticeContent[] = [
  {
    id: "notice-001",
    title: "수리 전공 설명회",
    subtitle: "수리과학부 전공 탐색 세션",
    category: "학과",
    organizer: "GIST 수리과학부",
    status: "published",
    startDate: "2026-06-05",
    endDate: "2026-06-12",
    location: "대학 A동 115호",
    description:
      "전공 커리큘럼, 연구실 소개, 졸업 후 진로를 한 번에 살펴보는 설명회입니다.",
    posterUrl: "/posters/poster-1.png",
    linkUrl: "https://ziggle.gist.ac.kr/notices/math-major",
    qrCodeUrl: "/qr/math-major.svg",
    views: 328,
    likes: 42,
  },
  {
    id: "notice-002",
    title: "지구는 처음이야 동아리 부스",
    subtitle: "환경 동아리 신입 부원 모집",
    category: "동아리",
    organizer: "지구는 처음이야",
    status: "published",
    startDate: "2026-06-06",
    endDate: "2026-06-20",
    location: "제1학생회관 로비",
    description:
      "업사이클링 워크숍과 캠퍼스 플로깅을 함께할 신입 부원을 모집합니다.",
    posterUrl: "/posters/poster-2.png",
    linkUrl: "https://ziggle.gist.ac.kr/notices/earth-club",
    qrCodeUrl: "/qr/earth-club.svg",
    views: 214,
    likes: 31,
  },
  {
    id: "notice-003",
    title: "도백 도둑 정기공연",
    subtitle: "여름밤 밴드 라이브",
    category: "공연",
    organizer: "도백 도둑",
    status: "scheduled",
    startDate: "2026-06-10",
    endDate: "2026-06-17",
    location: "오룡관 소극장",
    description:
      "기숙사에서 만나는 에너지 넘치는 밴드 공연. QR로 좌석 정보를 확인하세요.",
    posterUrl: "/posters/poster-3.png",
    linkUrl: "https://ziggle.gist.ac.kr/notices/band-live",
    qrCodeUrl: "/qr/band-live.svg",
    views: 509,
    likes: 88,
  },
  {
    id: "notice-004",
    title: "MACMOO 정기공연",
    subtitle: "무대 위에서 만나는 춤과 음악",
    category: "공연",
    organizer: "MACMOO",
    status: "published",
    startDate: "2026-06-12",
    endDate: "2026-06-19",
    location: "GIST 중앙광장",
    description:
      "MACMOO의 정기공연이 중앙광장에서 열립니다. 공연 순서를 확인해보세요.",
    posterUrl: "/posters/poster-4.png",
    linkUrl: "https://ziggle.gist.ac.kr/notices/macmoo",
    qrCodeUrl: "/qr/macmoo.svg",
    views: 441,
    likes: 73,
  },
  {
    id: "notice-005",
    title: "사라진 교수님을 찾아라",
    subtitle: "캠퍼스 추리형 이벤트",
    category: "행사",
    organizer: "총학생회 이벤트팀",
    status: "pending",
    startDate: "2026-06-15",
    endDate: "2026-06-21",
    location: "학사 기숙사 일대",
    description:
      "단서를 따라 캠퍼스를 탐험하고 최종 미션을 해결하는 참여형 이벤트입니다.",
    posterUrl: "/posters/poster-5.png",
    linkUrl: "https://ziggle.gist.ac.kr/notices/missing-professor",
    qrCodeUrl: "/qr/missing-professor.svg",
    views: 187,
    likes: 29,
  },
  {
    id: "notice-006",
    title: "어쩌면 해피엔딩",
    subtitle: "뮤지컬 상영회",
    category: "행사",
    organizer: "문화기획단",
    status: "scheduled",
    startDate: "2026-06-20",
    endDate: "2026-06-28",
    location: "기숙사 B동 라운지",
    description:
      "기숙사 라운지에서 함께 보는 따뜻한 뮤지컬 상영회입니다.",
    posterUrl: "/posters/poster-6.png",
    linkUrl: "https://ziggle.gist.ac.kr/notices/happy-ending",
    qrCodeUrl: "/qr/happy-ending.svg",
    views: 276,
    likes: 51,
  },
  {
    id: "notice-007",
    title: "오픈 동방",
    subtitle: "동아리방 투어 주간",
    category: "동아리",
    organizer: "GIST 동아리연합회",
    status: "ended",
    startDate: "2026-05-28",
    endDate: "2026-06-03",
    location: "학생회관 2층",
    description:
      "여러 동아리방을 자유롭게 둘러보고 동아리 문화를 경험하는 오픈 투어입니다.",
    posterUrl: "/posters/poster-7.png",
    linkUrl: "https://ziggle.gist.ac.kr/notices/open-clubroom",
    qrCodeUrl: "/qr/open-clubroom.svg",
    views: 612,
    likes: 96,
  },
  {
    id: "notice-008",
    title: "인포팀 OTL 앱 출시 이벤트",
    subtitle: "새로운 캠퍼스 앱 체험",
    category: "공지",
    organizer: "GIST 인포팀",
    status: "pending",
    startDate: "2026-06-06",
    endDate: "2026-06-18",
    location: "온라인",
    description:
      "OTL 앱 출시를 기념해 피드백 이벤트와 작은 선물을 준비했습니다.",
    posterUrl: "/posters/poster-8.png",
    linkUrl: "https://ziggle.gist.ac.kr/notices/otl-launch",
    qrCodeUrl: "/qr/otl-launch.svg",
    views: 135,
    likes: 18,
  },
];

type ScheduleTone = "violet" | "green" | "orange" | "gray";

export interface ScheduleItem {
  date: string;
  day: string;
  time: string;
  title: string;
  tone: ScheduleTone;
}

export const scheduleItems: ScheduleItem[] = [
  {
    date: "5.25",
    day: "일",
    time: "20:00",
    title: "도백 도둑 정기공연 시작",
    tone: "violet",
  },
  {
    date: "5.28",
    day: "금",
    time: "18:00",
    title: "지구는 처음이야 동아리 부스 시작",
    tone: "green",
  },
  {
    date: "6.05",
    day: "금",
    time: "13:30",
    title: "수리 전공 설명회 종료",
    tone: "gray",
  },
  {
    date: "6.10",
    day: "화",
    time: "11:00",
    title: "진로 페스티벌 안내 시작",
    tone: "orange",
  },
];

export interface ApprovalItem {
  id: string;
  title: string;
  uploader: string;
  uploadedAt: string;
  posterId: string;
}

export const pendingApprovals: ApprovalItem[] = [
  {
    id: "approval-1",
    title: "어쩌면 해피엔딩 공연",
    uploader: "문화기획단",
    uploadedAt: "2026.05.30",
    posterId: "notice-006",
  },
  {
    id: "approval-2",
    title: "GIST 개발자 세미나",
    uploader: "인포팀",
    uploadedAt: "2026.05.30",
    posterId: "notice-008",
  },
  {
    id: "approval-3",
    title: "어쩌면 봉사연합 활동",
    uploader: "박서연",
    uploadedAt: "2026.05.29",
    posterId: "notice-005",
  },
];

export const weeklyViews = [
  { label: "5.29", value: 1820 },
  { label: "5.30", value: 2380 },
  { label: "5.31", value: 1960 },
  { label: "6.01", value: 1840 },
  { label: "6.02", value: 2040 },
  { label: "6.03", value: 1880 },
  { label: "6.04", value: 2560 },
];
