// 本文を「縦組み1ページに収まる量」で区切る。本物の本のようにページ送りで読むため。
// ホームの本プレビューと「本のこのページ」タブで共通利用する。
// 1ページの目安文字数（スマホ基準・控えめ）。1ページ目は質問見出しのぶん少なめ。
export const FIRST_PAGE_CHARS = 110;
export const CONT_PAGE_CHARS = 150;

export function paginateBody(
  body: string,
  firstCap: number = FIRST_PAGE_CHARS,
  contCap: number = CONT_PAGE_CHARS,
): string[] {
  const text = body.trim();
  if (!text) return [""];
  const pages: string[] = [];
  let i = 0;
  let cap = firstCap;
  while (i < text.length) {
    let chunk = text.slice(i, i + cap);
    // ページ途中で切れる場合、近くに改行があれば段落の切れ目で割る。
    if (i + cap < text.length) {
      const nl = chunk.lastIndexOf("\n");
      if (nl > cap * 0.5) chunk = chunk.slice(0, nl + 1);
    }
    pages.push(chunk.replace(/^\n+/, "").replace(/\n+$/, ""));
    i += chunk.length;
    cap = contCap;
  }
  return pages.length ? pages : [""];
}
