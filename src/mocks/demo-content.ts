/**
 * 개발 서버 전용 예시 게시물. 비율이 섞인 게시물이 TV에서 어떻게 도는지 보려고 둔다.
 *
 * 이미지는 지어낸 행사 포스터·배너이며 `src/dev/tv-samples`에 있다. 개발 서버는
 * 소스 파일을 `/src/...` 경로 그대로 내주므로 번들에 넣지 않고 그 경로로 그린다.
 * 그래서 개발 서버에서만 켤 수 있다(`VITE_MOCK_DEMO_CONTENT=true`).
 *
 * 테스트는 기본 fixture의 건수에 기대므로 켜지 않는다.
 */
export interface DemoSample {
  file: string;
  title: string;
  /** `reference.ts`의 카테고리 id */
  categoryId: string;
  location: string;
  width: number;
  height: number;
}

export const DEMO_SAMPLES: readonly DemoSample[] = [
  {
    file: "open-dongbang",
    title: "오픈 동방",
    categoryId: "club",
    location: "학생회관 2층",
    width: 1600,
    height: 900,
  },
  {
    file: "sketch-day",
    title: "슈퍼-피셜 야외 스케치 데이",
    categoryId: "club",
    location: "잔디광장",
    width: 1080,
    height: 1080,
  },
  {
    file: "band-live",
    title: "도백 도둑 정기공연",
    categoryId: "performance",
    location: "오룡관 소극장",
    width: 1800,
    height: 600,
  },
  {
    file: "coding-study",
    title: "알고리즘 스터디 신입 모집",
    categoryId: "club",
    location: "온라인",
    width: 1400,
    height: 788,
  },
  {
    file: "boardgame-night",
    title: "보드게임 나이트",
    categoryId: "event",
    location: "학생회관 2층 라운지",
    width: 1080,
    height: 1080,
  },
  {
    file: "movie-night",
    title: "야외 영화 상영회",
    categoryId: "event",
    location: "대운동장",
    width: 1400,
    height: 467,
  },
  {
    file: "flea-market",
    title: "가을 축제 플리마켓",
    categoryId: "event",
    location: "잔디광장",
    width: 990,
    height: 1400,
  },
  {
    file: "library-night",
    title: "도서관 야간 개방",
    categoryId: "notice",
    location: "중앙도서관",
    width: 1400,
    height: 788,
  },
  {
    file: "running-crew",
    title: "새벽 러닝 크루",
    categoryId: "club",
    location: "운동장",
    width: 1050,
    height: 1400,
  },
  {
    file: "dorm-cleaning",
    title: "기숙사 대청소 안내",
    categoryId: "notice",
    location: "기숙사 전 동",
    width: 1400,
    height: 1050,
  },
  {
    file: "photo-exhibit",
    title: "사진전 〈빛의 기록〉",
    categoryId: "event",
    location: "도서관 1층",
    width: 990,
    height: 1400,
  },
  {
    file: "jazz-night",
    title: "재즈 나이트",
    categoryId: "performance",
    location: "소극장",
    width: 1080,
    height: 1080,
  },
  {
    file: "startup-contest",
    title: "창업 아이디어 경진대회",
    categoryId: "department",
    location: "온라인",
    width: 1400,
    height: 700,
  },
  {
    file: "blood-drive",
    title: "헌혈 캠페인",
    categoryId: "notice",
    location: "학생회관 앞",
    width: 1080,
    height: 1350,
  },
  {
    file: "esports",
    title: "캠퍼스 e스포츠 대회",
    categoryId: "event",
    location: "정보관",
    width: 1400,
    height: 788,
  },
  {
    file: "choir-concert",
    title: "합창단 정기연주회",
    categoryId: "performance",
    location: "대강당",
    width: 990,
    height: 1400,
  },
  {
    file: "recycling",
    title: "분리수거 요일이 바뀝니다",
    categoryId: "notice",
    location: "생활관 행정실",
    width: 1400,
    height: 350,
  },
  {
    file: "stargazing",
    title: "천문 관측회",
    categoryId: "event",
    location: "옥상 관측소",
    width: 787,
    height: 1400,
  },
  {
    file: "volunteer",
    title: "연탄 나눔 봉사단 모집",
    categoryId: "club",
    location: "정문 집결",
    width: 1400,
    height: 1050,
  },
  {
    file: "yoga-class",
    title: "아침 요가 클래스",
    categoryId: "event",
    location: "체육관",
    width: 1080,
    height: 1080,
  },
  {
    file: "language-exchange",
    title: "언어 교환 모임",
    categoryId: "club",
    location: "국제관",
    width: 1050,
    height: 1400,
  },
  {
    file: "hiking-club",
    title: "등산 동아리 정기 산행",
    categoryId: "club",
    location: "정문 집결",
    width: 1400,
    height: 1050,
  },
  {
    file: "coffee-class",
    title: "핸드드립 커피 클래스",
    categoryId: "event",
    location: "학생회관 카페",
    width: 1080,
    height: 1350,
  },
  {
    file: "seminar",
    title: "AI 학술 세미나",
    categoryId: "department",
    location: "오룡관 101호",
    width: 1050,
    height: 1400,
  },
  {
    file: "graduation-photo",
    title: "졸업사진 촬영 일정",
    categoryId: "notice",
    location: "본관 앞",
    width: 990,
    height: 1400,
  },
  {
    file: "book-club",
    title: "한 달 한 권 독서 모임",
    categoryId: "club",
    location: "도서관 세미나실",
    width: 990,
    height: 1400,
  },
];

/** 개발 서버가 소스 경로 그대로 내주는 예시 이미지 주소 */
export function demoPosterUrl(file: string): string {
  return `/src/dev/tv-samples/${file}.webp`;
}
