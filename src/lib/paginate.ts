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
    // 文字数だけで区切る（段落の改行ではページを割らない）。
    // ページの境目に来た改行は、先頭/末尾の空き列にならないよう表示時に落とす。
    const chunk = text.slice(i, i + cap).replace(/^\n+/, "").replace(/\n+$/, "");
    pages.push(chunk);
    i += cap;
    cap = contCap;
  }
  return pages.length ? pages : [""];
}
