import { prisma } from "@/lib/db";
import { lineConfigured, pushText } from "@/lib/line";
import { createMagicLink } from "@/lib/auth";
import { novelizeQuestion } from "@/lib/llm";

// 次の未出題の質問を選んで Prompt を作り、LINEに送る（連携済みの場合）。
// 通知にはマジックリンク（タップでログイン不要のスタジオが開く）を添える。
// → docs/line-experience.md「2. スタジオへの橋渡し」/ docs/writing-studio.md
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

  // 質問文を小説的な問いかけに（失敗時は元の質問のまま）
  const novelText = await novelizeQuestion(question.text, question.category);

  const prompt = await prisma.prompt.create({
    data: {
      storytellerId,
      questionId: question.id,
      novelText,
      sentAt: new Date(),
    },
  });

  if (storyteller.lineUserId && lineConfigured()) {
    const studioUrl = await createMagicLink(storytellerId, prompt.id);
    await pushText(
      storyteller.lineUserId,
      `${storyteller.name}さん、今週の質問です。\n\n「${novelText ?? question.text}」\n\nこちらから、書いても話しても答えられます。\nタップするだけで、あなたの執筆スタジオが開きます。\n\n▼ あなたの自伝に書き加える\n${studioUrl}`,
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
