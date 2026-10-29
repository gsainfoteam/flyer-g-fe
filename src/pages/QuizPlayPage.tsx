import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useSearchParams } from "react-router";
import { seoulDateKey } from "@/entities/widget/model/content";
import { CHOICE_MARKS, quizOfDay } from "@/entities/widget/model/quiz";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

/**
 * 오늘의 퀴즈 답하기 (폰). TV의 QR로 로그인 없이 들어온다.
 *
 * 정답은 바로 알려 주지 않는다. 다음 날 TV에서 공개해 다시 TV 앞에 서게 한다.
 * 답을 모으는 서버가 없어 지금은 이 폰에만 기억한다. 정답률·랭킹은 서버가 생기면 붙인다.
 */
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function storageKey(dateKey: string) {
  return `flyerg:quiz:${dateKey}`;
}

function readAnswer(dateKey: string): number | null {
  try {
    const value = window.localStorage.getItem(storageKey(dateKey));
    return value === null ? null : Number(value);
  } catch {
    return null;
  }
}

function saveAnswer(dateKey: string, index: number) {
  try {
    window.localStorage.setItem(storageKey(dateKey), String(index));
  } catch {
    // 저장소를 못 쓰는 브라우저(사생활 보호 모드)에서도 이번 화면에서는 제출된다.
  }
}

export function QuizPlayPage() {
  const [searchParams] = useSearchParams();
  const requested = searchParams.get("d");
  // 자정 직전에 QR을 찍어도 TV에 떠 있던 문제를 푼다. 날짜가 이상하면 오늘 문제다.
  const dateKey =
    requested && DATE_KEY.test(requested) ? requested : seoulDateKey(new Date());
  const quiz = quizOfDay(dateKey);

  const [submitted, setSubmitted] = useState<number | null>(() => readAnswer(dateKey));
  const [selected, setSelected] = useState<number | null>(submitted);

  return (
    <div className="flex flex-1 flex-col gap-6 pt-4">
      <div>
        <p className="text-label font-bold text-accent">오늘의 퀴즈 · {dateKey}</p>
        <h1 className="mt-2 text-title text-ink">{quiz.question}</h1>
      </div>

      <div role="radiogroup" aria-label="보기" className="flex flex-col gap-3">
        {quiz.choices.map((choice, index) => {
          const checked = selected === index;
          return (
            <button
              key={choice}
              type="button"
              role="radio"
              aria-checked={checked}
              disabled={submitted !== null}
              onClick={() => setSelected(index)}
              className={cn(
                "flex min-h-14 items-center gap-3 rounded-card border bg-surface px-5 text-left text-subhead transition-colors duration-(--duration-fast)",
                checked ? "border-ink ring-2 ring-ink" : "border-line",
                submitted !== null && !checked && "opacity-50",
              )}
            >
              <span className="text-ink-subtle">{CHOICE_MARKS[index]}</span>
              {choice}
            </button>
          );
        })}
      </div>

      {submitted === null ? (
        <Button
          size="lg"
          className="mt-auto h-14 text-subhead"
          disabled={selected === null}
          onClick={() => {
            if (selected === null) return;
            saveAnswer(dateKey, selected);
            setSubmitted(selected);
          }}
        >
          제출하기
        </Button>
      ) : (
        <div
          role="status"
          className="mt-auto flex items-start gap-3 rounded-card bg-surface-muted px-5 py-4"
        >
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
          <div>
            <p className="text-label font-bold text-ink">
              {CHOICE_MARKS[submitted]} {quiz.choices[submitted]}(으)로 제출했어요
            </p>
            <p className="mt-1 text-caption text-ink-muted">
              정답은 내일 로비 TV에서 공개돼요.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
