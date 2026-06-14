"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editSection } from "@/app/studio/actions";
import { paginateBody } from "@/lib/paginate";

// 本のこのページ（セクション）を本人が直接書き直せるエディタ。
// 読み表示はホームと同じ「全画面ページめくり」（縦組み・右→左・長文は自動ページ分割）。
// 編集に入ると横書きの原稿エディタになる。保存後はこの本文が土台になる。
export default function SectionEditor({
  promptId,
  question,
  body,
}: {
  promptId: string;
  question: string;
  body: string;
}) {
  const router = useRouter();
  const [text, setText] = useState(body);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!editing) {
    const pages = paginateBody(body);
    return (
      <div className="book-read">
        <div className="book-pager">
          {pages.map((p, i) => (
            <article className="leaf section-leaf" key={i}>
              <div className="leaf-inner">
                {i === 0 && <h4 className="leaf-q">{question}</h4>}
                <p className="leaf-body">{p}</p>
              </div>
              {pages.length > 1 && (
                <span className="leaf-folio">
                  {i + 1} / {pages.length}
                </span>
              )}
            </article>
          ))}
        </div>
        <button
          type="button"
          className="edit-btn book-edit-btn"
          onClick={() => {
            setText(body);
            setEditing(true);
          }}
        >
          ✎ この文章を直す
        </button>
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
