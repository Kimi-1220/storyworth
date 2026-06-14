import { NextRequest, NextResponse } from "next/server";
import { markAccountPaid } from "@/lib/registration";

// 実 Stripe の success_url の着地点。?account=...&session_id=... を受けて paid に。
// （モック決済は /register/checkout/mock 側で確定する。こちらは本番Checkout用。）
export async function GET(req: NextRequest) {
  const accountId = req.nextUrl.searchParams.get("account") ?? "";
  const sessionId = req.nextUrl.searchParams.get("session_id") ?? "";
  const ok = accountId ? await markAccountPaid(accountId, sessionId) : false;
  const dest = ok
    ? `/register/onboarding?account=${accountId}`
    : "/register";
  return NextResponse.redirect(new URL(dest, req.url));
}
