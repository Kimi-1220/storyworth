import { NextRequest, NextResponse } from "next/server";
import { consumeMagicToken, sessionCookie } from "@/lib/auth";

// マジックリンクの着地点。?token=... を消費して本人セッションを確立し、
// スタジオへリダイレクトする。パスワード入力もアプリ起動もなし。
// → docs/writing-studio.md「着地の設計」
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const result = token ? await consumeMagicToken(token) : null;

  if (!result) {
    // 期限切れ・使用済み・不正トークン
    return NextResponse.redirect(new URL("/studio?error=link", req.url));
  }

  const dest = result.promptId
    ? `/studio/prompts/${result.promptId}`
    : "/studio";
  const res = NextResponse.redirect(new URL(dest, req.url));
  res.cookies.set(sessionCookie(result.storytellerId));
  return res;
}
