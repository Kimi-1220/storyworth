// 本文を「縦組み1ページに収まる量」で区切る。本物の本のようにページ送りで読むため。
// ホームの本プレビューと「本のこのページ」タブで共通利用する。
// スマホ縦画面・16px・行間2.0でのおおよその1ページ容量。
// 1ページ目は質問見出しのぶん少なめ。
export const FIRST_PAGE_CHARS = 135;
export const CONT_PAGE_CHARS = 170;

function trimEdges(s: string): string {
  // ページ境界に来た改行は、先頭/末尾の空き列にならないよう落とす。
  return s.replace(/^\n+/, "").replace(/\n+$/, "");
}

export function paginateBody(
  body: string,
  firstCap: number = FIRST_PAGE_CHARS,
  contCap: number = CONT_PAGE_CHARS,
): string[] {
  const text = body.trim();
  if (!text) return [""];
  const total = text.length;

  // 1ページに収まるならそのまま。
  if (total <= firstCap) return [trimEdges(text)];

  // 必要ページ数（1ページ目は質問のぶん容量が小さい）。
  const numPages = 1 + Math.ceil((total - firstCap) / contCap);
  // できるだけ均等割り。均等値が1ページ目の容量を超えるときだけ、
  // 1ページ目を上限で固定して残りを均等に分ける。
  const even = Math.ceil(total / numPages);
  const pages: string[] = [];
  if (even <= firstCap) {
    for (let i = 0; i < total; i += even) {
      pages.push(trimEdges(text.slice(i, i + even)));
    }
  } else {
    pages.push(trimEdges(text.slice(0, firstCap)));
    const rest = text.slice(firstCap);
    const per = Math.ceil(rest.length / (numPages - 1));
    for (let i = 0; i < rest.length; i += per) {
      pages.push(trimEdges(rest.slice(i, i + per)));
    }
  }
  return pages;
}
