"use client";

import { useState } from "react";
import Link from "next/link";
import SectionEditor from "@/app/studio/SectionEditor";
import Interview, { type TLItem } from "@/app/studio/Interview";

// 質問回答ページを「取材（チャット）」と「本のこのページ」の2タブに分ける。
// ・取材: 完全なチャットUI。問いかけ→回答→相づち→追加質問…の履歴が全部残り、
//   入力欄は常に下に見える。送信中は進捗ラベルで「書いている手応え」を出す。
// ・本: シンプルな質問を見出しに、起こした文章（編集可・縦組み）＋写真。
export default function PromptTabs({
  backHref,
  promptId,
  novelText,
  plainQuestion,
  category,
  timeline,
  photos,
  section,
}: {
  backHref: string;
  promptId: string;
  novelText: string;
  plainQuestion: string;
  category: string;
  timeline: TLItem[];
  photos: { id: string; src: string }[];
  section: { body: string; edited: boolean } | null;
}) {
  const [tab, setTab] = useState<"interview" | "book">("interview");

  return (
    <>
      <header className="prompt-topbar">
        <Link className="topbar-back" href={backHref} aria-label="戻る">
          ←
        </Link>
        <div className="topbar-tabs">
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
      </header>

      {tab === "interview" ? (
        <Interview
          promptId={promptId}
          novelText={novelText}
          category={category}
          timeline={timeline}
        />
      ) : (
        <div className="book-read-wrap prompt-body-scroll">
          {section ? (
            <>
              <SectionEditor
                promptId={promptId}
                category={category}
                question={plainQuestion}
                body={section.body}
              />
              <p className="muted book-read-hint">
                縦書きのページです。横にめくって読めます。あなたの言葉から起こした文章なので、直したいところはいつでも書き直せます。
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
              {photos.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={p.src} alt="思い出の写真" />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
