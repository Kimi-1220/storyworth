"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editSection } from "@/app/studio/actions";

// 本のこのページ（セクション）を本人が直接書き直せるエディタ。
// 保存すると以後この本文が土台になり、勝手に書き換わらない。
export default function SectionEditor({
  promptId,
  body,
}: {
  promptId: string;
  body: string;
}) {
  const router = useRouter();
  const [text, setText] = useState(body);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!editing) {
    return (
      <div className="section-view">
        <p className="manuscript">{body}</p>
        <button
          type="button"
          className="edit-btn"
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
