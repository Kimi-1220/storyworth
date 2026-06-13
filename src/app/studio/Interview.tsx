"use client";

import { useEffect, useRef, useState } from "react";
import AnswerForm from "@/app/studio/AnswerForm";

// 取材タブのチャット1件分。語り手の発言とAIの発言を時系列で並べる。
export type TLItem =
  | { kind: "user-text"; id: string; text: string }
  | { kind: "user-audio"; id: string; src: string }
  | { kind: "user-image"; id: string; src: string }
  | { kind: "ai-reaction"; id: string; text: string }
  | { kind: "ai-followup"; id: string; text: string };

// 送信後にAIの返答が立ち上がるまでの進捗ラベル。
// 「短文で済ませがち」を避け、書いている手応えを出すための演出。
const TYPING_LABELS = [
  "うなずいています",
  "あなたの言葉を本のページに書き加えています",
  "次に聞きたいことを考えています",
];

// 取材タブ＝完全なチャットUI。
// ・履歴は内側でスクロールし、入力欄（composer）は常に下に見える
// ・送信直後に自分の吹き出し＋「考え中…」を即座に出す（楽観的更新）
export default function Interview({
  promptId,
  novelText,
  category,
  timeline,
}: {
  promptId: string;
  novelText: string;
  category: string;
  timeline: TLItem[];
}) {
  const [echo, setEcho] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);

  // 新しい発言・タイピングが出たら最下部へ。
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [timeline.length, busy, echo]);

  // 進捗ラベルを順に切り替える。
  useEffect(() => {
    if (!busy) {
      setPhase(0);
      return;
    }
    const t1 = setTimeout(() => setPhase(1), 1300);
    const t2 = setTimeout(() => setPhase(2), 3300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [busy]);

  return (
    <div className="interview">
      <div className="chat-log">
        <p className="chat-day">{category}</p>
        <div className="bubble ask">{novelText}</div>

        {timeline.map((m) => {
          switch (m.kind) {
            case "user-text":
              return (
                <div className="bubble me" key={m.id}>
                  {m.text}
                </div>
              );
            case "user-audio":
              return (
                <div className="bubble me" key={m.id}>
                  <audio controls src={m.src} />
                </div>
              );
            case "user-image":
              return (
                <div className="bubble me image" key={m.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.src} alt="思い出の写真" />
                </div>
              );
            case "ai-reaction":
              return (
                <div className="bubble ask warm" key={m.id}>
                  {m.text}
                </div>
              );
            case "ai-followup":
              return (
                <div className="bubble ask" key={m.id}>
                  {m.text}
                </div>
              );
          }
        })}

        {echo && <div className="bubble me pending">{echo}</div>}
        {busy && (
          <div className="bubble ask typing">
            <span className="typing-label">{TYPING_LABELS[phase]}</span>
            <span className="dots">
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="composer-dock">
        <AnswerForm
          promptId={promptId}
          placeholder="思い出すまま、ゆっくりどうぞ。ひと続きの長さでも大丈夫です…"
          onSending={(preview) => setEcho(preview)}
          onPendingChange={(pending) => {
            setBusy(pending);
            if (!pending) setEcho(null);
          }}
        />
      </div>
    </div>
  );
}
