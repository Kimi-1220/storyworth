import { prisma } from "@/lib/db";
import { draftChapter, llmConfigured, type AnswerMaterial } from "@/lib/llm";

// あるカテゴリ（＝章テーマ）の回答が増えたら、章の下書きを書き直す。
// 「あなたの言葉が本になっていく」を可視化する（→ docs/writing-studio.md）。
// LLM未設定や失敗時は静かに何もしない（保存処理を止めない）。
export async function regenerateChapter(
  storytellerId: string,
  category: string,
): Promise<void> {
  if (!llmConfigured()) return;
  try {
    const storyteller = await prisma.storyteller.findUnique({
      where: { id: storytellerId },
    });
    if (!storyteller) return;

    // このカテゴリの、テキスト回答（音声の文字起こし含む）を集める
    const prompts = await prisma.prompt.findMany({
      where: { storytellerId, question: { category } },
      include: {
        question: true,
        answers: { where: { type: "text" }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { question: { sortOrder: "asc" } },
    });

    const materials: AnswerMaterial[] = [];
    for (const p of prompts) {
      const text = p.answers
        .map((a) => a.text)
        .filter((t): t is string => Boolean(t && t.trim()))
        .join("\n");
      if (text) materials.push({ question: p.question.text, text });
    }
    if (materials.length === 0) return;

    const draft = await draftChapter(storyteller.name, category, materials);
    if (!draft) return;

    const sortOrder = prompts[0]?.question.sortOrder ?? 0;
    await prisma.chapter.upsert({
      where: { storytellerId_category: { storytellerId, category } },
      update: { title: draft.title, body: draft.body, sortOrder },
      create: {
        storytellerId,
        category,
        title: draft.title,
        body: draft.body,
        sortOrder,
      },
    });
  } catch (err) {
    console.error("regenerateChapter error:", err);
  }
}
