import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// デプロイ診断用: 環境変数の有無とDB接続を確認する（秘密情報は返さない）
export async function GET() {
  const env = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    LINE_CHANNEL_ACCESS_TOKEN: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN),
    LINE_CHANNEL_SECRET: Boolean(process.env.LINE_CHANNEL_SECRET),
    CRON_SECRET: Boolean(process.env.CRON_SECRET),
    APP_BASE_URL: process.env.APP_BASE_URL ?? null,
    BLOB_READ_WRITE_TOKEN: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
  };

  let db: { ok: boolean; questionCount?: number; error?: string };
  try {
    const questionCount = await prisma.question.count();
    db = { ok: true, questionCount };
  } catch (err) {
    db = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  return NextResponse.json({ env, db }, { status: db.ok ? 200 : 500 });
}
