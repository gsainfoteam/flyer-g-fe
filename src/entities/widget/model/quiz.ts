import { seededRandom } from "./content";
import { QUIZ_BANK, QUIZ_CATEGORIES } from "./quiz-bank";

/**
 * 오늘의 퀴즈. TV가 문제를 보여 주고, 학생은 QR로 폰에서 답을 고른다. 정답은 다음
 * 날 TV에서 공개한다. 한 번에 모두 같은 문제를 보도록 서울 날짜로 고른다.
 *
 * 정답률·랭킹은 서버가 답을 모아야 해서 아직 없다. 지금은 화면만 있다. 문제는
 * 화면이 들고 있다(`quiz-bank.ts`, 약 300문제). 서버가 생기면 운영자가 관리한다.
 */
export interface QuizQuestion {
  id: string;
  question: string;
  choices: [string, string, string, string];
  answerIndex: 0 | 1 | 2 | 3;
}

/** 숫자로 시작하는 보기("206개", "-273℃", "1.6km")의 수. 분수처럼 애매하면 null */
function leadingNumber(choice: string): number | null {
  if (choice.includes("/")) return null;
  const match = choice.match(/^-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other]!, copy[index]!];
  }
  return copy;
}

/**
 * 보기 순서. 모두 숫자로 시작하고 서로 다르면 작은 수부터 둔다(읽기 쉽다). 나머지는
 * 문제 id를 씨앗으로 섞어 정답 자리가 고르게 퍼지게 한다.
 */
function arrange(id: string, answer: string, wrongs: readonly string[]): QuizQuestion {
  const all = [answer, ...wrongs];
  const numbers = all.map(leadingNumber);
  const sortable =
    numbers.every((value) => value !== null) && new Set(numbers).size === all.length;
  const choices = sortable
    ? [...all].sort((a, b) => leadingNumber(a)! - leadingNumber(b)!)
    : shuffled(all, seededRandom(`choices:${id}`));
  return {
    id,
    question: "",
    choices: choices as QuizQuestion["choices"],
    answerIndex: choices.indexOf(answer) as QuizQuestion["answerIndex"],
  };
}

/** 전체 문제. id는 분야와 순번이다("science-012"). */
export const QUIZ_POOL: readonly QuizQuestion[] = QUIZ_CATEGORIES.flatMap((category) =>
  QUIZ_BANK[category].map(([question, answer, ...wrongs], index) => {
    const id = `${category}-${String(index + 1).padStart(3, "0")}`;
    return { ...arrange(id, answer, wrongs), question };
  }),
);

/** 하루에 한 문제씩 도는 순서. 분야가 섞이게 한 번 섞어 둔다. */
const DAILY_ORDER = shuffled(QUIZ_POOL, seededRandom("quiz-order"));

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 그날의 문제. 정해 둔 순서를 하루에 하나씩 따라가므로 전체를 다 돌기 전에는 같은
 * 문제가 다시 나오지 않는다(약 300일). 어제와 오늘도 늘 다르다.
 */
export function quizOfDay(dateKey: string): QuizQuestion {
  const day = Math.round(Date.parse(`${dateKey}T00:00:00Z`) / DAY_MS);
  const index = ((day % DAILY_ORDER.length) + DAILY_ORDER.length) % DAILY_ORDER.length;
  return DAILY_ORDER[index]!;
}

/** "2026-10-29" → "2026-10-28" */
export function previousDateKey(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/** 보기 번호. 폰과 TV가 같은 표기를 쓴다. */
export const CHOICE_MARKS = ["①", "②", "③", "④"] as const;
