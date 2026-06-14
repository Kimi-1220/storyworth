"use client";

import { useTransition } from "react";
import { answerNextQuestion } from "@/app/studio/actions";

// 本の最後の「次の質問」ページに置く、大きな回答ボタン。
// 押すと回答待ちの出題（なければ次の質問を用意）のスタジオへ移動する。
export default function AnswerNextButton() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="answer-cta"
      disabled={pending}
      onClick={() => start(async () => { await answerNextQuestion(); })}
    >
      <span className="answer-cta-main">
        {pending ? "用意しています…" : "この質問に答える"}
      </span>
    </button>
  );
}
