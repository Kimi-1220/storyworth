"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { mediaTypeOf, saveMedia } from "@/lib/storage";
import { sendNextQuestion } from "@/lib/prompts";
import { createMagicLink } from "@/lib/auth";

async function uniqueLinkCode(): Promise<string> {
  for (;;) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const exists = await prisma.storyteller.findUnique({
      where: { linkCode: code },
    });
    if (!exists) return code;
  }
}

export async function createStoryteller(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const storyteller = await prisma.storyteller.create({
    data: { name, linkCode: await uniqueLinkCode() },
  });
  redirect(`/storytellers/${storyteller.id}`);
}

// ダッシュボードから手動で次の質問を出題する（cronを待たずに試せる）
export async function sendNextQuestionAction(formData: FormData) {
  const storytellerId = String(formData.get("storytellerId") ?? "");
  if (!storytellerId) return;
  await sendNextQuestion(storytellerId);
  revalidatePath(`/storytellers/${storytellerId}`);
}

// 動作確認用: その語り手として執筆スタジオを開く（マジックリンクを発行して飛ぶ）
export async function openStudioAction(formData: FormData) {
  const storytellerId = String(formData.get("storytellerId") ?? "");
  if (!storytellerId) return;
  const url = await createMagicLink(storytellerId);
  redirect(url);
}

// Webの回答フォーム: テキスト + 任意の画像/音声ファイル
export async function submitWebAnswer(formData: FormData) {
  const promptId = String(formData.get("promptId") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  const file = formData.get("file");

  const prompt = await prisma.prompt.findUniqueOrThrow({
    where: { id: promptId },
  });

  if (text) {
    await prisma.answer.create({
      data: { promptId, type: "text", text, via: "web" },
    });
  }

  if (file instanceof File && file.size > 0) {
    const type = mediaTypeOf(file.type);
    if (type) {
      const mediaPath = await saveMedia(
        Buffer.from(await file.arrayBuffer()),
        file.type,
      );
      await prisma.answer.create({
        data: { promptId, type, mediaPath, via: "web" },
      });
    }
  }

  if (text || (file instanceof File && file.size > 0)) {
    await prisma.prompt.update({
      where: { id: promptId },
      data: { status: "answered" },
    });
  }

  revalidatePath(`/storytellers/${prompt.storytellerId}/prompts/${promptId}`);
}
