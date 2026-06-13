"use client";

import { useState } from "react";
import AnswerForm from "@/app/studio/AnswerForm";
import SectionEditor from "@/app/studio/SectionEditor";

type Ans = {
  id: string;
  type: string;
  text: string | null;
  mediaPath: string | null;
};

// 質問回答ページを「取材（会話）」と「本のこのページ」の2タブに分ける。
// ・取材: 問いかけ→回答→相づち→追加質問 を上から並べ、入力欄は一番下
//   （追加質問のすぐ下で書ける）。入力は大きな原稿エディタのまま=執筆感を維持。
// ・本: シンプルな質問を見出しに、起こした文章（編集可）＋写真。
export default function PromptTabs({
  promptId,
  novelText,
  plainQuestion,
  category,
  answers,
  reaction,
  followups,
  section,
}: {
  promptId: string;
  novelText: string;
  plainQuestion: string;
  category: string;
  answers: Ans[];
  reaction: string | null;
  followups: string[];
  section: { body: string; edited: boolean } | null;
}) {
  const [tab, setTab] = useState<"interview" | "book">("interview");

  const textAnswers = answers.filter((a) => a.type === "text" && a.text);
  const audioAnswers = answers.filter((a) => a.type === "audio" && a.mediaPath);
  const photos = answers.filter((a) => a.type === "image" && a.mediaPath);

  return (
    <div>
      <div className="studio-tabs">
        <button
          type="button"
          className={tab === "interview" ? "stab active" : "stab"}
          onClick={() => setTab("interview")}
        >
          取材
        </button>
        <button
          type="button"
          className={tab === "book" ? "stab active" : "stab"}
          onClick={() => setTab("book")}
        >
          本のこのページ
        </button>
      </div>

      {tab === "interview" ? (
        <div className="interview">
          <p className="muted">{category}</p>
          <div className="bubble ask">{novelText}</div>

          {textAnswers.map((a) => (
            <div className="bubble me" key={a.id}>
              {a.text}
            </div>
          ))}
          {audioAnswers.map((a) => (
            <div className="bubble me" key={a.id}>
              <audio controls src={a.mediaPath!} />
            </div>
          ))}

          {reaction && <div className="bubble ask warm">{reaction}</div>}
          {followups.map((q, i) => (
            <div className="bubble ask" key={i}>
              {q}
            </div>
          ))}

          <div className="interview-input">
            <p className="muted">
              {followups.length
                ? "つづけて、下にそのまま書いても話しても大丈夫です。"
                : "下の欄に、書いても話しても答えられます。思い出すまま、ゆっくりどうぞ。"}
            </p>
            <AnswerForm
              promptId={promptId}
              placeholder="わたしが最初に覚えているのは…"
            />
          </div>
        </div>
      ) : (
        <div className="book-page">
          <p className="muted">{category}</p>
          <h2 className="book-q">{plainQuestion}</h2>
          {section ? (
            <>
              <SectionEditor promptId={promptId} body={section.body} />
              <p className="muted">
                縦書きのページです。横にスワイプすると読み進められます。あなたの言葉から起こした文章なので、直したいところはいつでも書き直せます。
                {section.edited && " （編集済み）"}
              </p>
            </>
          ) : (
            <p className="muted">
              まだこのページは書かれていません。「取材」で答えると、ここに文章が立ち上がります。
            </p>
          )}
          {photos.length > 0 && (
            <div className="photos">
              {photos.map((a) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={a.id} src={a.mediaPath!} alt="思い出の写真" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
