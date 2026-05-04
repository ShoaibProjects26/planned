"use client";

import { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface QuizSectionProps {
  questions: QuizQuestion[];
}

export function QuizSection({ questions }: QuizSectionProps) {
  const [answers, setAnswers] = useState<(number | null)[]>(
    Array(questions.length).fill(null)
  );
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = answers.every((a) => a !== null);
  const score = submitted
    ? answers.filter((a, i) => a === questions[i].correctIndex).length
    : 0;

  function select(qIdx: number, optIdx: number) {
    if (submitted) return;
    setAnswers((prev) => prev.map((a, i) => (i === qIdx ? optIdx : a)));
  }

  function submit() {
    if (allAnswered) setSubmitted(true);
  }

  function reset() {
    setAnswers(Array(questions.length).fill(null));
    setSubmitted(false);
  }

  return (
    <div className="space-y-6">
      {submitted && (
        <div
          className={cn(
            "rounded-xl px-5 py-4 flex items-center gap-3",
            score === questions.length
              ? "bg-brand-mint border border-brand-green/30"
              : "bg-brand-amber border border-amber-300/50"
          )}
        >
          {score === questions.length ? (
            <CheckCircle className="w-5 h-5 text-brand-green shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-amber-600 shrink-0" />
          )}
          <div>
            <p className="font-semibold text-brand-green-deep">
              {score === questions.length
                ? "🎉 Perfect score!"
                : `${score} out of ${questions.length} correct`}
            </p>
            <p className="text-xs text-brand-green-deep/70 mt-0.5">
              {score === questions.length
                ? "Brilliant work — all answers correct!"
                : "Review the highlighted answers and try again."}
            </p>
          </div>
        </div>
      )}

      {questions.map((q, qIdx) => {
        const chosen = answers[qIdx];
        const isCorrect = submitted && chosen === q.correctIndex;
        const isWrong = submitted && chosen !== null && chosen !== q.correctIndex;

        return (
          <div key={qIdx} className="space-y-2.5">
            <p className="font-medium text-brand-green-deep text-sm">
              <span className="text-brand-green font-bold mr-1.5">Q{qIdx + 1}.</span>
              {q.question}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {q.options.map((opt, optIdx) => {
                const isSelected = chosen === optIdx;
                const isAnswer = q.correctIndex === optIdx;

                let stateClass = "bg-white border-[hsl(var(--border))] hover:border-brand-green/40 hover:bg-brand-mint/20";
                if (!submitted && isSelected) {
                  stateClass = "bg-brand-mint border-brand-green";
                }
                if (submitted) {
                  if (isAnswer) {
                    stateClass = "bg-brand-mint border-brand-green";
                  } else if (isSelected && !isAnswer) {
                    stateClass = "bg-red-50 border-red-300";
                  } else {
                    stateClass = "bg-white border-[hsl(var(--border))] opacity-60";
                  }
                }

                return (
                  <button
                    key={optIdx}
                    onClick={() => select(qIdx, optIdx)}
                    disabled={submitted}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left text-sm transition-all",
                      stateClass,
                      !submitted && "cursor-pointer"
                    )}
                  >
                    <span
                      className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold",
                        !submitted && isSelected
                          ? "border-brand-green bg-brand-green text-white"
                          : submitted && isAnswer
                          ? "border-brand-green bg-brand-green text-white"
                          : submitted && isSelected && !isAnswer
                          ? "border-red-400 bg-red-400 text-white"
                          : "border-muted-foreground/30 text-muted-foreground"
                      )}
                    >
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span
                      className={cn(
                        submitted && isAnswer && "font-semibold text-brand-green-deep",
                        submitted && isSelected && !isAnswer && "text-red-600"
                      )}
                    >
                      {opt}
                    </span>
                    {submitted && isAnswer && (
                      <CheckCircle className="w-4 h-4 text-brand-green ml-auto shrink-0" />
                    )}
                    {submitted && isSelected && !isAnswer && (
                      <XCircle className="w-4 h-4 text-red-400 ml-auto shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {!submitted ? (
        <button
          onClick={submit}
          disabled={!allAnswered}
          className={cn(
            "w-full py-3 rounded-xl font-semibold text-sm transition-all",
            allAnswered
              ? "bg-brand-green text-white hover:bg-brand-green-deep"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          {allAnswered ? "Check my answers" : `Answer all ${questions.length} questions to submit`}
        </button>
      ) : (
        <button
          onClick={reset}
          className="w-full py-3 rounded-xl font-semibold text-sm border border-brand-green/30 text-brand-green hover:bg-brand-mint transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
