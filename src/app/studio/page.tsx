import Link from "next/link";
import { prisma } from "@/lib/db";
import { getStudioStoryteller } from "@/lib/auth";

export const dynamic = "force-dynamic";

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

  const [totalQuestions, categoryGroups, prompts, chapters, sections] =
    await Promise.all([
      prisma.question.count(),
      prisma.question.findMany({
        distinct: ["category"],
        select: { category: true },
      }),
      prisma.prompt.findMany({
        where: { storytellerId: me.id },
        include: {
          question: true,
          _count: { select: { answers: true } },
        },
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

  const open = prompts.find((p) => p.status === "open");
  const answered = prompts.filter((p) => p.status === "answered").length;
  const remaining = Math.max(totalQuestions - answered, 0);
  const totalChapters = categoryGroups.length;

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

  return (
    <div className="studio">
      {/* 表紙モック: 初日から本人を「著者」として載せる */}
      <div className="book-cover">
        <p className="cover-kicker">自伝</p>
        <h1 className="cover-title">{me.name}の物語</h1>
        <p className="cover-author">著 {me.name}</p>
      </div>

      <div className="progress">
        <p>
          これまでに <strong>{answered}</strong> の質問にお答えいただきました。
          {remaining > 0 ? (
            <>本まで、あと {remaining} 問です。</>
          ) : (
            <>すべての質問にお答えいただきました。</>
          )}
        </p>
        <p className="muted">
          書きはじめた章: {chapterGroups.length} 章 / 全 {totalChapters} 章
        </p>
      </div>

      {open && (
        <div className="studio-card current-question">
          <p className="muted">今週の質問</p>
          <p className="question-text">{open.novelText ?? open.question.text}</p>
          <Link className="cta" href={`/studio/prompts/${open.id}`}>
            📝 / 🎙 書いて、または話して答える
          </Link>
        </div>
      )}

      {chapterGroups.length > 0 && (
        <section className="chapters">
          <h2>育っていく、あなたの本</h2>
          {chapterGroups.map((c, i) => (
            <article className="chapter" key={c.category}>
              <h3>
                第{i + 1}章「{c.title}」
              </h3>
              {c.sections.map((s) => (
                <Link
                  key={s.id}
                  className="section-link"
                  href={`/studio/prompts/${s.promptId}`}
                >
                  <span className="section-q">{s.prompt.question.text}</span>
                  <span className="section-body">{s.body.slice(0, 140)}…</span>
                  <span className="section-edit-hint">
                    ✎ {s.edited ? "編集済み" : "このページを直す"}
                  </span>
                </Link>
              ))}
            </article>
          ))}
        </section>
      )}

    </div>
  );
}
