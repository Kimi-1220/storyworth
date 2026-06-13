"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getStudioStoryteller } from "@/lib/auth";
import { mediaTypeOf, saveMedia } from "@/lib/storage";
import { transcribeAudio } from "@/lib/transcribe";
import { generateFollowups, generateReaction } from "@/lib/llm";
import { regenerateSection } from "@/lib/sections";

// 執筆スタジオから回答を受け取る。
// テキスト（書く）/ 録音音声（話す）→ 文字起こし、写真添付に対応。
// 保存後にリアクション・深掘り・章の下書きを生成して見せる。
export async function submitStudioAnswer(formData: FormData) {
  const me = await getStudioStoryteller();
  if (!me) return;

  const promptId = String(formData.get("promptId") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  const audio = formData.get("audio");
  const photo = formData.get("photo");

  const prompt = await prisma.prompt.findUnique({
    where: { id: promptId },
    include: { question: true },
  });
  // 他人の出題には書き込ませない
  if (!prompt || prompt.storytellerId !== me.id) return;

  // この回答ターンで素材になったテキスト（リアクション・章生成に使う）
  let answeredText = text;

  if (text) {
    await prisma.answer.create({
      data: { promptId, type: "text", text, via: "web" },
    });
  }

  // 録音音声: そのまま保存し、可能なら文字起こしもテキスト回答として保存
  if (audio instanceof File && audio.size > 0) {
    const mime = audio.type || "audio/webm";
    const buf = Buffer.from(await audio.arrayBuffer());
    const mediaPath = await saveMedia(buf, mime);
    await prisma.answer.create({
      data: { promptId, type: "audio", mediaPath, via: "web" },
    });
    const transcript = await transcribeAudio(buf, mime);
    if (transcript) {
      await prisma.answer.create({
        data: { promptId, type: "text", text: transcript, via: "web" },
      });
      answeredText = [answeredText, transcript].filter(Boolean).join("\n");
    }
  }

  // 写真添付
  if (photo instanceof File && photo.size > 0) {
    const type = mediaTypeOf(photo.type);
    if (type === "image") {
      const mediaPath = await saveMedia(
        Buffer.from(await photo.arrayBuffer()),
        photo.type,
      );
      await prisma.answer.create({
        data: { promptId, type: "image", mediaPath, via: "web" },
      });
    }
  }

  const hasContent =
    Boolean(answeredText) ||
    (photo instanceof File && photo.size > 0);
  if (!hasContent) return;

  // リアクション・深掘り（テキスト素材があるときだけ）
  let reaction: string | null = null;
  let followups: string[] = [];
  if (answeredText) {
    [reaction, followups] = await Promise.all([
      generateReaction(prompt.question.text, answeredText),
      generateFollowups(prompt.question.text, answeredText),
    ]);
  }

  await prisma.prompt.update({
    where: { id: promptId },
    data: {
      status: "answered",
      reaction: reaction ?? undefined,
      followups: followups.length ? followups.join("\n") : undefined,
    },
  });

  // この質問のセクションを生成/追記（既存があれば言い回しを保って追記）
  if (answeredText) {
    await regenerateSection(promptId, answeredText);
  }

  revalidatePath(`/studio/prompts/${promptId}`);
  revalidatePath("/studio");
}

// 本人がセクションの本文を手で編集する。以後この本文が土台になる。
export async function editSection(formData: FormData) {
  const me = await getStudioStoryteller();
  if (!me) return;

  const promptId = String(formData.get("promptId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!promptId || !body) return;

  const prompt = await prisma.prompt.findUnique({ where: { id: promptId } });
  if (!prompt || prompt.storytellerId !== me.id) return;

  await prisma.section.update({
    where: { promptId },
    data: { body, edited: true },
  });

  revalidatePath(`/studio/prompts/${promptId}`);
  revalidatePath("/studio");
}
