import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { openStudioAction, sendNextQuestionAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function StorytellerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const storyteller = await prisma.storyteller.findUnique({
    where: { id },
    include: {
      prompts: {
        orderBy: { createdAt: "desc" },
        include: { question: true, _count: { select: { answers: true } } },
      },
    },
  });
  if (!storyteller) notFound();

  return (
    <div>
      <h1>{storyteller.name}さんの物語</h1>

      {!storyteller.lineUserId && (
        <div className="card">
          <h2>LINE連携</h2>
          <p>
            LINE公式アカウントを友だち追加して、この連携コードをトークに送ってください:
          </p>
          <p className="link-code">{storyteller.linkCode}</p>
        </div>
      )}

      <div className="card">
        <form action={sendNextQuestionAction} className="stack">
          <input type="hidden" name="storytellerId" value={storyteller.id} />
          <button type="submit">次の質問を出題する</button>
        </form>
        <p className="muted">
          通常は毎週自動で出題されます（cron）。ボタンで手動でも出題できます。
        </p>
        <form action={openStudioAction} className="stack">
          <input type="hidden" name="storytellerId" value={storyteller.id} />
          <button type="submit">この語り手として執筆スタジオを開く</button>
        </form>
        <p className="muted">
          マジックリンクを発行して、語り手が見る「書く / 話す」スタジオを確認できます。
        </p>
      </div>

      <h2>出題ずみの質問</h2>
      {storyteller.prompts.length === 0 && (
        <p className="muted">まだ出題がありません。</p>
      )}
      {storyteller.prompts.map((p) => (
        <div className="card" key={p.id}>
          <Link href={`/storytellers/${storyteller.id}/prompts/${p.id}`}>
            {p.question.text}
          </Link>
          <span className={`badge ${p.status}`}>
            {p.status === "answered" ? "回答あり" : "回答待ち"}
          </span>
          <span className="badge">{p._count.answers}件の回答</span>
        </div>
      ))}
    </div>
  );
}
