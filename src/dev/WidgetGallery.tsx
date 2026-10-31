import type { WidgetContent } from "@/entities/widget/model/content";
import { quizOfDay } from "@/entities/widget/model/quiz";
import type { QuizQuestion } from "@/entities/widget/model/quiz";
import { WidgetDisplay } from "@/entities/widget/ui/WidgetDisplay";
import { DisplayPreviewFrame } from "@/features/display-preview/ui/DisplayPreviewFrame";
import { BattlePreview } from "@/features/click-battle/ui/BattlePreview";

/**
 * 개발 전용. TV 위젯을 경계 사례와 함께 한눈에 본다.
 *
 * 긴 이름, 세 자리 D-day, 영하 기온, 메뉴가 많은 날처럼 화면이 넘치기 쉬운 값을 모았다.
 * 각 칸에 `data-widget-case`를 달아 자동 점검 스크립트가 넘침을 잴 수 있게 한다.
 */
const NOW = new Date("2026-10-29T03:00:00Z");
const hour = (offset: number) => new Date(NOW.getTime() + offset * 3_600_000);

const LONG_QUIZ: QuizQuestion = {
  id: "q-long",
  question: "광주과학기술원 학사기숙사에서 가장 먼저 지어진 건물은 어느 동일까요?",
  choices: ["A동 (학사기숙사 1동)", "B동 (학사기숙사 2동)", "C동 (대학원 기숙사)", "모두 같은 해"],
  answerIndex: 0,
};

const CASES: { id: string; title: string; content: WidgetContent }[] = [
  {
    id: "dday-normal",
    title: "D-day · 기본",
    content: { type: "DDAY", label: "종강", days: 51, targetDate: new Date("2026-12-18T15:00:00Z") },
  },
  {
    id: "dday-long",
    title: "D-day · 긴 이름, 세 자리",
    content: {
      type: "DDAY",
      label: "2027학년도 1학기 수강신청 시작",
      days: 128,
      targetDate: new Date("2027-03-05T15:00:00Z"),
    },
  },
  {
    id: "dday-today",
    title: "D-day · 당일",
    content: { type: "DDAY", label: "종강", days: 0, targetDate: NOW },
  },
  {
    id: "exam-during-long",
    title: "시험 응원 · 긴 이름",
    content: {
      type: "EXAM_CHEER",
      label: "2026학년도 2학기 기말고사",
      phase: "during",
      days: 3,
      message: "끝까지 힘내요, 거의 다 왔어요",
    },
  },
  {
    id: "meal-pick",
    title: "메뉴 추천",
    content: { type: "MEAL_PICK", meal: "DINNER", menu: "닭볶음탕", alternatives: ["샤브샤브", "감자탕", "닭갈비"] },
  },
  {
    id: "cafeteria-many",
    title: "학식 · 메뉴가 많고 이름이 긴 날",
    content: {
      type: "CAFETERIA",
      place: "제2학생식당 (학사기숙사 B동 지하 1층)",
      current: "LUNCH",
      meals: [
        { type: "BREAKFAST", hours: "07:30~09:00", menus: ["흰쌀밥", "북엇국", "계란말이"] },
        {
          type: "LUNCH",
          hours: "11:30~13:30",
          menus: [
            "잡곡밥",
            "돼지고기김치찌개&두부조림",
            "치킨너겟/허니머스타드소스",
            "콩나물무침",
            "깍두기",
            "요구르트",
            "샐러드바(셀프)",
            "누룽지",
            "배추김치",
            "식혜",
          ],
        },
        { type: "DINNER", hours: "17:30~19:00", menus: ["카레라이스", "미소된장국"] },
      ],
    },
  },
  {
    id: "cafeteria-two",
    title: "학식 · 아침 없는 날",
    content: {
      type: "CAFETERIA",
      place: "제2학생식당",
      current: "LUNCH",
      meals: [
        { type: "LUNCH", hours: null, menus: ["비빔밥", "된장국"] },
        { type: "DINNER", hours: "17:30~19:00", menus: ["돈까스", "우동"] },
      ],
    },
  },
  {
    id: "weather-cold",
    title: "날씨 · 영하, 강수 100%, 긴 지명",
    content: {
      type: "WEATHER",
      location: "광주광역시 북구 오룡동 광주과학기술원",
      source: "기상청 제공",
      temperature: -12,
      sky: "SNOW",
      high: -3,
      low: -15,
      precipitationChance: 100,
      fetchedAt: NOW,
      hourly: [0, 1, 2, 3, 4, 5].map((offset) => ({
        at: hour(offset + 1),
        temperature: -12 - offset,
        sky: "SNOW" as const,
      })),
    },
  },
  {
    id: "weather-no-hourly",
    title: "날씨 · 시간별 예보 없음",
    content: {
      type: "WEATHER",
      location: "",
      source: "",
      temperature: 31,
      sky: "CLEAR",
      high: 34,
      low: 25,
      precipitationChance: 0,
      fetchedAt: NOW,
      hourly: [],
    },
  },
  {
    id: "restaurant-long",
    title: "맛집 · 긴 가게 이름 + 원본 QR",
    content: {
      type: "RESTAURANT",
      featured: {
        name: "첨단과기로 원조 할머니 손칼국수 본점",
        category: "한식 · 칼국수 · 수제비 · 보리밥",
        address: "광주광역시 북구 첨단과기로 208번길 43-22, 1층 101호",
        url: "https://map.naver.com/p/search/%EC%B9%BC%EA%B5%AD%EC%88%98",
      },
      others: [
        { name: "오룡 숯불닭갈비 첨단직영점", category: "", address: "", url: null },
        { name: "기숙사앞 분식 & 김밥천국", category: "", address: "", url: null },
      ],
      source: "네이버 지역검색 제공",
    },
  },
  {
    id: "restaurant-bare",
    title: "맛집 · 분류·주소 없음, 한 곳",
    content: {
      type: "RESTAURANT",
      featured: { name: "오룡 칼국수", category: "", address: "", url: null },
      others: [],
      source: "",
    },
  },
  {
    id: "quiz-long",
    title: "퀴즈 · 긴 문제와 보기",
    content: { type: "QUIZ", dateKey: "2026-10-29", quiz: LONG_QUIZ, yesterday: LONG_QUIZ },
  },
  {
    id: "quiz-normal",
    title: "퀴즈 · 기본",
    content: {
      type: "QUIZ",
      dateKey: "2026-10-29",
      quiz: quizOfDay("2026-10-29"),
      yesterday: quizOfDay("2026-10-28"),
    },
  },
];

export function WidgetGallery() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {CASES.map((item) => (
        <figure key={item.id} className="space-y-2">
          <figcaption className="text-label font-bold text-ink">{item.title}</figcaption>
          <div data-widget-case={item.id}>
            <DisplayPreviewFrame>
              <WidgetDisplay content={item.content} deviceLabel="A동 로비" serverTime={NOW} />
            </DisplayPreviewFrame>
          </div>
        </figure>
      ))}
      <figure className="space-y-2">
        <figcaption className="text-label font-bold text-ink">
          클릭 배틀 · 미리보기(방 없이 모양만)
        </figcaption>
        <div data-widget-case="click-battle-preview">
          <DisplayPreviewFrame>
            <BattlePreview deviceLabel="A동 로비" serverTime={NOW} />
          </DisplayPreviewFrame>
        </div>
      </figure>
    </div>
  );
}
