"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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

// モーダルの目次（章ごとに質問をまとめる）。本文ページャの順番に沿って組み立てる。
type NavChapter = {
  key: string;
  num: string;
  title: string;
  questions: { key: string; question: string }[];
};

function buildNav(items: BookItem[]): { chapters: NavChapter[]; nextKey: string | null } {
  const chapters: NavChapter[] = [];
  let nextKey: string | null = null;
  for (const it of items) {
    if (it.kind === "chapter") {
      chapters.push({ key: it.key, num: it.num, title: it.title, questions: [] });
    } else if (it.kind === "section") {
      chapters[chapters.length - 1]?.questions.push({
        key: it.key,
        question: it.question,
      });
    } else if (it.kind === "next") {
      nextKey = it.key;
    }
  }
  return { chapters, nextKey };
}

// ホームの本。実測ベースのページ分割で画面にぴったり収める。
// 章・質問の選択モーダルと「最後の質問へ」ボタンで、長くなっても目的のページに飛べる。
export default function HomeBook({ items }: { items: BookItem[] }) {
  const pagerRef = useRef<HTMLDivElement>(null);
  // 各アイテム（章扉・質問の先頭ページ・次の質問）の DOM をキーで覚えておき、ジャンプに使う。
  const leafRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [navOpen, setNavOpen] = useState(false);

  const sections: SectionInput[] = items
    .filter((it): it is Extract<BookItem, { kind: "section" }> => it.kind === "section")
    .map((s) => ({ key: s.key, question: s.question, body: s.body }));
  const splits = useMeasuredSplits(pagerRef, sections);

  const { chapters, nextKey } = useMemo(() => buildNav(items), [items]);

  function registerLeaf(key: string) {
    return (el: HTMLElement | null) => {
      if (el) leafRefs.current.set(key, el);
      else leafRefs.current.delete(key);
    };
  }

  function scrollToKey(key: string, behavior: ScrollBehavior = "smooth") {
    const el = leafRefs.current.get(key);
    if (el) {
      el.scrollIntoView({ behavior, inline: "start", block: "nearest" });
    }
  }

  // 開いた直後は「最後の質問」を表示しておく（毎回めくらず、続きから始められる）。
  // ページ幅は実測分割（splits）に依存するので、確定してから一度だけ即時ジャンプする。
  const didInitialScroll = useRef(false);
  useEffect(() => {
    if (didInitialScroll.current || !nextKey) return;
    if (sections.length > 0 && !splits) return; // 分割待ち
    scrollToKey(nextKey, "auto");
    didInitialScroll.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splits, nextKey]);

  return (
    <div className="book">
      <div className="book-toolbar">
        {nextKey && (
          <button
            type="button"
            className="book-nav-btn"
            onClick={() => scrollToKey(nextKey)}
          >
            最後の質問へ →
          </button>
        )}
        <button
          type="button"
          className="book-nav-btn"
          onClick={() => setNavOpen(true)}
        >
          ☰ 目次から選ぶ
        </button>
        {items[0] && (
          <button
            type="button"
            className="book-nav-btn"
            onClick={() => scrollToKey(items[0].key)}
          >
            ← 先頭へ
          </button>
        )}
      </div>

      <div className="book-pager" ref={pagerRef}>
        {items.flatMap((it) => {
          if (it.kind === "chapter") {
            return [
              <div className="leaf chapter-leaf" key={it.key} ref={registerLeaf(it.key)}>
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
              <article className="leaf next-leaf" key={it.key} ref={registerLeaf(it.key)}>
                <div className="leaf-inner">
                  <h4 className="leaf-q">{it.question}</h4>
                </div>
                <AnswerNextButton />
              </article>,
            ];
          }
          const pages = splits?.[it.key] ?? paginateBody(it.body);
          return pages.map((p, i) => (
            <article
              className="leaf section-leaf"
              key={`${it.key}-${i}`}
              ref={i === 0 ? registerLeaf(it.key) : undefined}
            >
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

      {navOpen && (
        <div
          className="nav-modal-backdrop"
          onClick={() => setNavOpen(false)}
          role="presentation"
        >
          <div
            className="nav-modal"
            role="dialog"
            aria-modal="true"
            aria-label="目次"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="nav-modal-head">
              <h2 className="nav-modal-title">目次</h2>
              <button
                type="button"
                className="nav-modal-close"
                aria-label="閉じる"
                onClick={() => setNavOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="nav-modal-body">
              {chapters.map((c) => (
                <div className="nav-chapter" key={c.key}>
                  <button
                    type="button"
                    className="nav-chapter-head"
                    onClick={() => {
                      scrollToKey(c.key);
                      setNavOpen(false);
                    }}
                  >
                    <span className="nav-chapter-num">第{c.num}章</span>
                    <span className="nav-chapter-title">{c.title}</span>
                  </button>
                  {c.questions.map((q) => (
                    <button
                      type="button"
                      className="nav-item"
                      key={q.key}
                      onClick={() => {
                        scrollToKey(q.key);
                        setNavOpen(false);
                      }}
                    >
                      {q.question}
                    </button>
                  ))}
                </div>
              ))}
              {nextKey && (
                <button
                  type="button"
                  className="nav-item nav-item-next"
                  onClick={() => {
                    scrollToKey(nextKey);
                    setNavOpen(false);
                  }}
                >
                  ✎ 次の質問に答える
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
