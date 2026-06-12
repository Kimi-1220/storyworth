import { prisma } from "@/lib/db";
import { lineConfigured, pushText } from "@/lib/line";

// 次の未出題の質問を選んで Prompt を作り、LINEに送る（連携済みの場合）。
// 戻り値: 作成した Prompt（出題できる質問が残っていなければ null）
export async function sendNextQuestion(storytellerId: string) {
  const storyteller = await prisma.storyteller.findUniqueOrThrow({
    where: { id: storytellerId },
  });

  const asked = await prisma.prompt.findMany({
    where: { storytellerId },
    select: { questionId: true },
  });

  const question = await prisma.question.findFirst({
    where: { id: { notIn: asked.map((p) => p.questionId) } },
    orderBy: { sortOrder: "asc" },
  });
  if (!question) return null;

  const prompt = await prisma.prompt.create({
    data: { storytellerId, questionId: question.id, sentAt: new Date() },
  });

  if (storyteller.lineUserId && lineConfigured()) {
    const url = `${process.env.APP_BASE_URL ?? ""}/storytellers/${storytellerId}/prompts/${prompt.id}`;
    await pushText(
      storyteller.lineUserId,
      `${storyteller.name}さん、今週の質問です。\n\n「${question.text}」\n\n文章でも、写真でも、音声メッセージでも大丈夫です。このトークにそのまま返信してください。\n\nWebで書く場合はこちら:\n${url}`,
    );
  }

  return prompt;
}

// 語り手の「回答待ち（open）」の最新の出題を返す
export async function latestOpenPrompt(storytellerId: string) {
  return prisma.prompt.findFirst({
    where: { storytellerId, status: "open" },
    orderBy: { createdAt: "desc" },
    include: { question: true },
  });
}
