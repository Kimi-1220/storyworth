import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

// 執筆スタジオの「着地」を担うマジックリンク＋セッション。
// 通知に貼ったリンクをタップするだけで、パスワード入力なしで本人のスタジオが開く。
// → docs/writing-studio.md「着地の設計」

const SESSION_COOKIE = "studio_session";
const LINK_TTL_MS = 14 * 24 * 60 * 60 * 1000; // マジックリンクは14日・1回限り
const SESSION_TTL_S = 90 * 24 * 60 * 60; // 一度入れば90日ログイン継続（高齢者UX）

function secret(): string {
  return (
    process.env.SESSION_SECRET ??
    process.env.CRON_SECRET ??
    "dev-insecure-secret-change-me"
  );
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

// 署名付きセッション値（storytellerId.署名）を作る／検証する
export function signSession(storytellerId: string): string {
  return `${storytellerId}.${sign(storytellerId)}`;
}

function verifySession(raw: string | undefined): string | null {
  if (!raw) return null;
  const i = raw.lastIndexOf(".");
  if (i < 0) return null;
  const id = raw.slice(0, i);
  const sig = raw.slice(i + 1);
  const expected = sign(id);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return id;
}

// 短命・1回限りのマジックリンクを発行し、フルURLを返す
export async function createMagicLink(
  storytellerId: string,
  promptId?: string,
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await prisma.magicLink.create({
    data: {
      token,
      storytellerId,
      promptId: promptId ?? null,
      expiresAt: new Date(Date.now() + LINK_TTL_MS),
    },
  });
  const base = process.env.APP_BASE_URL ?? "";
  return `${base}/studio/enter?token=${token}`;
}

// マジックリンクを消費（1回限り）。成功なら語り手情報を返す
export async function consumeMagicToken(
  token: string,
): Promise<{ storytellerId: string; promptId: string | null } | null> {
  const link = await prisma.magicLink.findUnique({ where: { token } });
  if (!link) return null;
  if (link.usedAt) return null;
  if (link.expiresAt < new Date()) return null;
  await prisma.magicLink.update({
    where: { token },
    data: { usedAt: new Date() },
  });
  return { storytellerId: link.storytellerId, promptId: link.promptId };
}

// セッションCookieの属性（Route Handlerで使う）
export function sessionCookie(storytellerId: string) {
  return {
    name: SESSION_COOKIE,
    value: signSession(storytellerId),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_S,
  };
}

// いまスタジオにログイン中の語り手を返す（Cookieから）
export async function getStudioStoryteller() {
  const store = await cookies();
  const id = verifySession(store.get(SESSION_COOKIE)?.value);
  if (!id) return null;
  return prisma.storyteller.findUnique({ where: { id } });
}
