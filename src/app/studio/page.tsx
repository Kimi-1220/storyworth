import { prisma } from "@/lib/db";
import { getStudioStoryteller } from "@/lib/auth";
import HomeBook, { type BookItem } from "@/app/studio/HomeBook";

export const dynamic = "force-dynamic";

// 章番号を漢数字に（第一章…）。本らしい見出しにするため。
function kanjiNum(n: number): string {
  const d = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  if (n <= 0) return String(n);
  if (n < 10) return d[n];
  if (n < 20) return "十" + (n % 10 ? d[n % 10] : "");
  const tens = Math.floor(n / 10);
  return (tens > 1 ? d[tens] : "") + "十" + (n % 10 ? d[n % 10] : "");
}

export default async function StudioHome({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const me = await getStudioStoryteller();

  if (!me) {
    return (
      <div className="studio">
        <div className="studio-card">
          <h1>執筆スタジオ</h1>
          {error === "link" ? (
            <p>
              このリンクは期限が切れているか、すでに使われています。
              お手元の最新の通知から、もう一度開いてください。
            </p>
          ) : (
            <p>
              ご家族からお送りした通知のリンクをタップすると、
              あなたの執筆スタジオが開きます。
            </p>
          )}
        </div>
      </div>
    );
  }

  const [prompts, chapters, sections] = await Promise.all([
    prisma.prompt.findMany({
      where: { storytellerId: me.id },
      include: { question: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.chapter.findMany({
      where: { storytellerId: me.id },
    }),
    prisma.section.findMany({
      where: { storytellerId: me.id },
      include: { prompt: { include: { question: true } } },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  // 次に答える質問: 回答待ちの出題があればそれ、なければ次の未出題の質問。
  const open = prompts.find((p) => p.status === "open");
  let nextQuestion: { text: string } | null = open?.question ?? null;
  if (!nextQuestion) {
    nextQuestion = await prisma.question.findFirst({
      where: { id: { notIn: prompts.map((p) => p.questionId) } },
      orderBy: { sortOrder: "asc" },
      select: { text: true },
    });
  }

  // セクションを章（カテゴリ）ごとにまとめる。章の並びは最小sortOrderで決める。
  const titleByCategory = new Map(chapters.map((c) => [c.category, c.title]));
  const byCategory = new Map<string, typeof sections>();
  for (const s of sections) {
    const arr = byCategory.get(s.category) ?? [];
    arr.push(s);
    byCategory.set(s.category, arr);
  }
  const chapterGroups = [...byCategory.entries()]
    .map(([category, secs]) => ({
      category,
      title: titleByCategory.get(category) ?? category,
      sections: secs,
      order: secs[0]?.sortOrder ?? 0,
    }))
    .sort((a, b) => a.order - b.order);

  // 本の構成要素（章扉 → 既出の質問 → 末尾に「次の質問」）。
  // 本文のページ分割は実測ベースでクライアント側（HomeBook）が行う。
  const items: BookItem[] = [];
  chapterGroups.forEach((c, ci) => {
    items.push({
      kind: "chapter",
      key: `ch-${c.category}`,
      num: kanjiNum(ci + 1),
      title: c.title,
    });
    c.sections.forEach((s) => {
      items.push({
        kind: "section",
        key: s.id,
        promptId: s.promptId,
        category: c.category,
        question: s.prompt.question.text,
        body: s.body,
        edited: s.edited,
      });
    });
  });
  if (nextQuestion) {
    items.push({ kind: "next", key: "next", question: nextQuestion.text });
  }

  return (
    <div className="studio">
      {/* 表紙モック: 初日から本人を「著者」として載せる */}
      <div className="book-cover">
        <p className="cover-kicker">自伝</p>
        <h1 className="cover-title">{me.name}の物語</h1>
        <p className="cover-author">著 {me.name}</p>
      </div>

      {items.length > 0 && (
        <section className="chapters">
          <h2 className="chapters-title">育っていく、あなたの本</h2>
          {/* 一冊の本を横にめくって読む（右→左／和書の向き）。
              ページ分割は実測ベースで画面にぴったり収める（HomeBook）。 */}
          <HomeBook items={items} />
        </section>
      )}
    </div>
  );
}
