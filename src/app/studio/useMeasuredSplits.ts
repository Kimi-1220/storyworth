"use client";

import { useEffect, useState, type RefObject } from "react";

// 実際に描画される1ページの大きさを測って、本文を「画面にぴったり収まる量」で分割する。
// 縦組みは全角主体で字幅がほぼ均一なので、ページ容量（文字数）さえ実測できれば
// 既存の均等割りロジック（paginateBody）で正確かつ偏りなく割れる。
export type SectionInput = { key: string; question: string; body: string };

function makeMeasurer(
  ref: CSSStyleDeclaration,
  innerH: number,
  indent: string,
): HTMLDivElement {
  const m = document.createElement("div");
  const s = m.style;
  s.position = "absolute";
  s.left = "-99999px";
  s.top = "0";
  s.visibility = "hidden";
  s.display = "inline-block";
  s.writingMode = "vertical-rl";
  s.textOrientation = "mixed";
  s.height = `${innerH}px`;
  s.whiteSpace = "pre-wrap";
  s.fontFamily = ref.fontFamily;
  s.fontSize = ref.fontSize;
  s.fontWeight = ref.fontWeight;
  s.lineHeight = ref.lineHeight;
  s.letterSpacing = ref.letterSpacing;
  s.textIndent = indent;
  return m;
}

// text.slice(start, …) が幅 avail に収まる最大文字数を二分探索で求める。
function fitLen(
  m: HTMLDivElement,
  text: string,
  start: number,
  avail: number,
): number {
  let lo = 1;
  let hi = text.length - start;
  let best = 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    m.textContent = text.slice(start, start + mid);
    if (m.offsetWidth <= avail) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

function measure(
  pager: HTMLElement,
  sections: SectionInput[],
): Record<string, string[]> | null {
  // 章扉・「次の質問」ページの .leaf-inner は width/height が auto なので測ってはいけない。
  // 必ず本文ページ（.section-leaf）の実寸を使う。
  const innerEl = pager.querySelector<HTMLElement>(".section-leaf .leaf-inner");
  const bodyEl = pager.querySelector<HTMLElement>(".section-leaf .leaf-body");
  if (!innerEl || !bodyEl) return null;
  const innerW = innerEl.clientWidth;
  const innerH = innerEl.clientHeight;
  if (innerW < 60 || innerH < 60) return null;

  const bodyStyle = getComputedStyle(bodyEl);
  const mBody = makeMeasurer(bodyStyle, innerH, bodyStyle.textIndent);
  document.body.appendChild(mBody);

  // 1ページ目は質問見出しが幅を取るので、そのぶんを差し引く。
  const qEl = pager.querySelector<HTMLElement>(".section-leaf .leaf-q");
  const qStyle = qEl ? getComputedStyle(qEl) : null;
  const mQ = qStyle ? makeMeasurer(qStyle, innerH, "0px") : null;
  if (mQ) document.body.appendChild(mQ);
  const questionWidth = (question: string): number => {
    if (!mQ || !qStyle) return 0;
    mQ.textContent = question;
    // 縦組みでは block-end（罫線・余白）= 物理left。見出しの占有幅に加える。
    return (
      mQ.offsetWidth +
      parseFloat(qStyle.paddingLeft || "0") +
      parseFloat(qStyle.borderLeftWidth || "0") +
      parseFloat(qStyle.marginLeft || "0")
    );
  };

  const trimEdges = (s: string) => s.replace(/^\n+/, "").replace(/\n+$/, "");
  const result: Record<string, string[]> = {};
  for (const sec of sections) {
    const text = sec.body.trim();
    if (!text) {
      result[sec.key] = [""];
      continue;
    }
    // 1ページ目は質問見出しのぶん幅が狭い。
    const page1Avail = Math.max(60, innerW - questionWidth(sec.question));
    const firstLen = fitLen(mBody, text, 0, page1Avail);
    // 異常に小さい＝測定失敗。空ページ量産を避け heuristic に委ねる。
    if (firstLen < 24) {
      mBody.remove();
      mQ?.remove();
      return null;
    }
    // max-fill: 各ページを「収まる最大」まで詰める。fitLed は列を完全に
    // 埋めた所で止まるので、左の余白も列の途中切れも出ない（最後のページのみ端数）。
    const bounds = [0, firstLen];
    let start = firstLen;
    while (start < text.length) {
      const len = Math.max(1, fitLen(mBody, text, start, innerW));
      start += len;
      bounds.push(start);
    }
    const pages: string[] = [];
    for (let i = 0; i < bounds.length - 1; i++) {
      pages.push(trimEdges(text.slice(bounds[i], bounds[i + 1])));
    }
    result[sec.key] = pages;
  }

  mBody.remove();
  mQ?.remove();
  return result;
}

export function useMeasuredSplits(
  pagerRef: RefObject<HTMLElement | null>,
  sections: SectionInput[],
): Record<string, string[]> | null {
  const [splits, setSplits] = useState<Record<string, string[]> | null>(null);
  // 本文や対象が変わったときだけ測り直す。
  const sig = sections.map((s) => `${s.key}:${s.body.length}`).join("|");

  useEffect(() => {
    const run = () => {
      const el = pagerRef.current;
      if (!el) return;
      const res = measure(el, sections);
      if (res) setSplits(res);
    };
    const raf = requestAnimationFrame(run);
    let t: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(run, 150);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  return splits;
}
