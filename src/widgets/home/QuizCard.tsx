import { ChevronRight, Sparkles } from "lucide-react";
import { Link } from "react-router";
import { quizOfDay } from "@/entities/widget/model/quiz";
import { IconTile } from "@/shared/components";
import { to } from "@/shared/config/routes";
import { toSeoulDateInputValue } from "@/shared/lib/datetime";

/**
 * 오늘의 퀴즈로 가는 칸. TV에 나오는 문제와 같은 문제다(서울 날짜 기준).
 * 참여 수는 퀴즈 서버 저장(9.7) 뒤에 붙인다.
 */
export function QuizCard({ now }: { now: Date }) {
  const dateKey = toSeoulDateInputValue(now);
  const quiz = quizOfDay(dateKey);

  return (
    <Link
      to={to.playQuiz(dateKey)}
      className="flex items-center gap-4 rounded-block bg-accent-100 px-6 py-5.5 text-accent-800 transition-colors hover:bg-accent-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <IconTile icon={Sparkles} size="lg" className="bg-accent text-accent-on" />
      <span className="min-w-0 flex-1">
        <b className="block text-subhead">오늘의 퀴즈</b>
        <span className="line-clamp-2 text-label">{quiz.question}</span>
      </span>
      <ChevronRight size={20} aria-hidden="true" />
    </Link>
  );
}
