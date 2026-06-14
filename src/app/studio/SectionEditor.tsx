"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editSection } from "@/app/studio/actions";
import { paginateBody } from "@/lib/paginate";
import { useMeasuredSplits } from "@/app/studio/useMeasuredSplits";

// 本のこのページ（セクション）を本人が直接書き直せるエディタ。
// 読み表示はホームと同じ「全画面ページめくり」（実測ベースで画面にぴったり）。
// 編集に入ると横書きの原稿エディタになる。保存後はこの本文が土台になる。
export default function SectionEditor({
  promptId,
  category,
  question,
  body,
}: {
  promptId: string;
  category: string;
  question: string;
  body: string;
}) {
  const router = useRouter();
  const [text, setText] = useState(body);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const pagerRef = useRef<HTMLDivElement>(null);
  const splits = useMeasuredSplits(pagerRef, [{ key: promptId, question, body }]);

  if (!editing) {
    const pages = splits?.[promptId] ?? paginateBody(body);
    const startEditing = () => {
      setText(body);
      setEditing(true);
    };
    return (
      <div className="book-read">
        <div className="book-pager" ref={pagerRef}>
          {pages.map((p, i) => (
            <article className="leaf section-leaf" key={i}>
              <div className="leaf-head">
                <span className="leaf-tag">
                  <span className="tag-chapter">{category}</span> ／ {question}
                </span>
                <button
                  type="button"
                  className="leaf-edit"
                  onClick={startEditing}
                >
                  ✎ 直す
                </button>
              </div>
              <div className="leaf-inner">
                <p className="leaf-body">{p}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  }

  function save() {
    const fd = new FormData();
    fd.set("promptId", promptId);
    fd.set("body", text);
    startTransition(async () => {
      await editSection(fd);
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div className="section-edit">
      <textarea
        className="manuscript-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="edit-actions">
        <button
          type="button"
          className="submit-btn"
          onClick={save}
          disabled={pending}
        >
          {pending ? "保存しています…" : "保存する"}
        </button>
        <button
          type="button"
          className="cancel-btn"
          onClick={() => setEditing(false)}
          disabled={pending}
        >
          やめる
        </button>
      </div>
    </div>
  );
}
