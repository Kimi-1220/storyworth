import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { lineConfigured, pushText } from "@/lib/line";
import { latestOpenPrompt, sendNextQuestion } from "@/lib/prompts";

// 週1回、外部cron（Vercel Cron等）から叩く。
// - 回答待ちの質問が残っている語り手には、やさしくリマインド
// - それ以外には次の質問を出題
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const storytellers = await prisma.storyteller.findMany({
    where: { lineUserId: { not: null } },
  });

  const results: Array<{ storytellerId: string; action: string }> = [];
  for (const s of storytellers) {
    const open = await latestOpenPrompt(s.id);
    if (open) {
      // TODO(肝①): 2週間無回答なら贈り主にリマインドを依頼する → docs/line-experience.md
      if (lineConfigured() && s.lineUserId) {
        await pushText(
          s.lineUserId,
          `${s.name}さん、先週の質問「${open.question.text}」はいかがでしたか？\n短いひとことでも、写真1枚でも大丈夫です。お待ちしていますね。`,
        );
      }
      results.push({ storytellerId: s.id, action: "reminded" });
    } else {
      const prompt = await sendNextQuestion(s.id);
      results.push({
        storytellerId: s.id,
        action: prompt ? "sent" : "no-questions-left",
      });
    }
  }

  return NextResponse.json({ results });
}
