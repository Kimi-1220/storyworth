import { NextRequest, NextResponse } from "next/server";
import { validateSignature, webhook } from "@line/bot-sdk";
import { prisma } from "@/lib/db";
import {
  fetchMessageContent,
  lineConfig,
  lineConfigured,
  replyText,
} from "@/lib/line";
import { latestOpenPrompt } from "@/lib/prompts";
import { saveMedia } from "@/lib/storage";
import { createMagicLink } from "@/lib/auth";
import { generateReaction } from "@/lib/llm";
import { regenerateChapter } from "@/lib/chapters";

export async function POST(req: NextRequest) {
  if (!lineConfigured()) {
    return NextResponse.json(
      { error: "LINE credentials not configured" },
      { status: 503 },
    );
  }

  const body = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";
  if (!validateSignature(body, lineConfig.channelSecret, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const { events } = JSON.parse(body) as webhook.CallbackRequest;
  for (const event of events ?? []) {
    try {
      await handleEvent(event);
    } catch (err) {
      // 1イベントの失敗で他のイベントの処理を止めない
      console.error("webhook event error:", err);
    }
  }
  return NextResponse.json({ ok: true });
}

async function handleEvent(event: webhook.Event) {
  if (event.type === "follow" && event.source?.type === "user") {
    if ("replyToken" in event && event.replyToken) {
      await replyText(
        event.replyToken,
        "友だち追加ありがとうございます。\nご家族からお伝えしている6桁の連携コードを、このトークに送ってください。",
      );
    }
    return;
  }

  if (event.type !== "message" || event.source?.type !== "user") return;
  const lineUserId = event.source.userId;
  const replyToken = event.replyToken;
  if (!lineUserId || !replyToken) return;

  const storyteller = await prisma.storyteller.findUnique({
    where: { lineUserId },
  });
  const message = event.message;

  // 未連携ユーザー: 6桁コードによる連携だけ受け付ける
  if (!storyteller) {
    if (message.type === "text") {
      const code = message.text.trim();
      if (/^\d{6}$/.test(code)) {
        const target = await prisma.storyteller.findUnique({
          where: { linkCode: code },
        });
        if (target && !target.lineUserId) {
          await prisma.storyteller.update({
            where: { id: target.id },
            data: { lineUserId },
          });
          await replyText(
            replyToken,
            `${target.name}さん、連携が完了しました！\nこれから毎週、ひとつずつ質問をお送りします。文章でも、写真でも、音声メッセージでも、お好きな形で答えてくださいね。`,
          );
          return;
        }
      }
    }
    await replyText(
      replyToken,
      "はじめに連携が必要です。ご家族からお伝えしている6桁の連携コードを送ってください。",
    );
    return;
  }

  // 連携済みユーザー: 回答として保存する
  const prompt = await latestOpenPrompt(storyteller.id);
  if (!prompt) {
    await replyText(
      replyToken,
      "ありがとうございます。いまお答えいただける質問がありません。次の質問をお楽しみに！",
    );
    return;
  }

  let answeredText = "";
  if (message.type === "text") {
    answeredText = message.text;
    await prisma.answer.create({
      data: {
        promptId: prompt.id,
        type: "text",
        text: message.text,
        via: "line",
      },
    });
  } else if (message.type === "image" || message.type === "audio") {
    const data = await fetchMessageContent(message.id);
    const mime =
      message.type === "image" ? "image/jpeg" : "audio/mp4"; // LINEの既定フォーマット
    const mediaPath = await saveMedia(data, mime);
    await prisma.answer.create({
      data: { promptId: prompt.id, type: message.type, mediaPath, via: "line" },
    });
  } else {
    await replyText(
      replyToken,
      "ありがとうございます。文章・写真・音声メッセージでお答えいただけます。",
    );
    return;
  }

  await prisma.prompt.update({
    where: { id: prompt.id },
    data: { status: "answered" },
  });

  // 肝①: 回答内容に即したリアクションをLLMで生成（失敗時は温かい定型文）。
  // 深掘りそのものはスタジオの仕事なので、LINEは火種と反応に徹し、
  // 「もっと話したくなったら」スタジオへ橋渡しする。→ docs/line-experience.md
  const reaction =
    (answeredText ? await generateReaction(prompt.question.text, answeredText) : null) ??
    "すてきなお話をありがとうございます。本に書き加えておきますね。";

  // テキスト回答なら章の下書きも更新（本が育つ）
  if (answeredText) {
    await regenerateChapter(storyteller.id, prompt.question.category);
  }

  const studioUrl = await createMagicLink(storyteller.id, prompt.id);
  await replyText(
    replyToken,
    `${reaction}\n\nもっと話したくなったら、こちらで続きを書いたり話したりできますよ。\n▼ あなたの自伝に書き加える\n${studioUrl}`,
  );
}
