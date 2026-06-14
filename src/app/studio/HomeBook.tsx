"use client";

import Link from "next/link";
import { useRef } from "react";
import { paginateBody } from "@/lib/paginate";
import {
  useMeasuredSplits,
  type SectionInput,
} from "@/app/studio/useMeasuredSplits";
import AnswerNextButton from "@/app/studio/AnswerNextButton";

export type BookItem =
  | { kind: "chapter"; key: string; num: string; title: string }
  | {
      kind: "section";
      key: string;
      promptId: string;
      category: string;
      question: string;
      body: string;
      edited: boolean;
    }
  | { kind: "next"; key: string; question: string };

// ホームの「育っていく、あなたの本」。実測ベースのページ分割で画面にぴったり収める。
export default function HomeBook({ items }: { items: BookItem[] }) {
  const pagerRef = useRef<HTMLDivElement>(null);
  const sections: SectionInput[] = items
    .filter((it): it is Extract<BookItem, { kind: "section" }> => it.kind === "section")
    .map((s) => ({ key: s.key, question: s.question, body: s.body }));
  const splits = useMeasuredSplits(pagerRef, sections);

  return (
    <div className="book">
      <div className="book-pager" ref={pagerRef}>
        {items.flatMap((it) => {
          if (it.kind === "chapter") {
            return [
              <div className="leaf chapter-leaf" key={it.key}>
                <div className="leaf-inner">
                  <p className="chapter-num">第{it.num}章</p>
                  <h3 className="chapter-title">{it.title}</h3>
                  <span className="chapter-orn">❦</span>
                </div>
              </div>,
            ];
          }
          if (it.kind === "next") {
            return [
              <article className="leaf next-leaf" key={it.key}>
                <div className="leaf-inner">
                  <h4 className="leaf-q">{it.question}</h4>
                </div>
                <AnswerNextButton />
              </article>,
            ];
          }
          const pages = splits?.[it.key] ?? paginateBody(it.body);
          return pages.map((p, i) => (
            <article className="leaf section-leaf" key={`${it.key}-${i}`}>
              <div className="leaf-head">
                <span className="leaf-tag">
                  <span className="tag-chapter">{it.category}</span> ／{" "}
                  {it.question}
                </span>
                <Link
                  className="leaf-edit"
                  href={`/studio/prompts/${it.promptId}`}
                >
                  ✎ {it.edited ? "編集済み" : "直す"}
                </Link>
              </div>
              <div className="leaf-inner">
                {i === 0 && <h4 className="leaf-q">{it.question}</h4>}
                <p className="leaf-body">{p}</p>
              </div>
            </article>
          ));
        })}
      </div>
      <p className="book-hint muted">← 横にめくって読む</p>
    </div>
  );
}
