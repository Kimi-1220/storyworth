import { prisma } from "@/lib/db";
import { chapterTitle, draftSection, llmConfigured } from "@/lib/llm";

// 1質問=1セクション。回答が来たら、その質問のセクションだけを生成/追記する。
// 既存セクションがあれば「追記モード」で、本人の編集・既存の言い回しを壊さない。
// LLM未設定や失敗時は静かに何もしない（保存処理を止めない）。
export async function regenerateSection(
  promptId: string,
  newAnswerText: string,
): Promise<void> {
  if (!llmConfigured()) return;
  if (!newAnswerText.trim()) return;
  try {
    const prompt = await prisma.prompt.findUnique({
      where: { id: promptId },
      include: { question: true, storyteller: true, section: true },
    });
    if (!prompt) return;

    const body = await draftSection(
      prompt.storyteller.name,
      prompt.question.text,
      newAnswerText,
      prompt.section?.body, // あれば追記モード（編集後の本文が土台になる）
    );
    if (!body) return;

    await prisma.section.upsert({
      where: { promptId },
      // 本人編集フラグ(edited)は触らない。本文だけを更新する。
      update: { body, category: prompt.question.category },
      create: {
        promptId,
        storytellerId: prompt.storytellerId,
        category: prompt.question.category,
        body,
        sortOrder: prompt.question.sortOrder,
      },
    });

    await refreshChapterTitle(prompt.storytellerId, prompt.question.category);
  } catch (err) {
    console.error("regenerateSection error:", err);
  }
}

// 章のタイトルだけを、いまのセクション群に合わせて付け直す。
export async function refreshChapterTitle(
  storytellerId: string,
  category: string,
): Promise<void> {
  if (!llmConfigured()) return;
  try {
    const sections = await prisma.section.findMany({
      where: { storytellerId, category },
      orderBy: { sortOrder: "asc" },
    });
    if (sections.length === 0) return;

    const title = await chapterTitle(
      category,
      sections.map((s) => s.body),
    );
    if (!title) return;

    const sortOrder = sections[0]?.sortOrder ?? 0;
    await prisma.chapter.upsert({
      where: { storytellerId_category: { storytellerId, category } },
      update: { title, sortOrder },
      create: { storytellerId, category, title, sortOrder },
    });
  } catch (err) {
    console.error("refreshChapterTitle error:", err);
  }
}
