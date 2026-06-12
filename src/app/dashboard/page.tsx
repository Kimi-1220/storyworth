import Link from "next/link";
import { prisma } from "@/lib/db";
import { createStoryteller } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const storytellers = await prisma.storyteller.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { prompts: true } } },
  });

  return (
    <div>
      <h1>ダッシュボード</h1>

      <div className="card">
        <h2>語り手を追加</h2>
        <form action={createStoryteller} className="stack">
          <input
            type="text"
            name="name"
            placeholder="お名前（例: 山田 花子）"
            required
          />
          <button type="submit">追加する</button>
        </form>
      </div>

      <h2>語り手一覧</h2>
      {storytellers.length === 0 && (
        <p className="muted">まだ語り手が登録されていません。</p>
      )}
      {storytellers.map((s) => (
        <div className="card" key={s.id}>
          <Link href={`/storytellers/${s.id}`}>{s.name}</Link>
          <span className="badge">
            {s.lineUserId ? "LINE連携済み" : "LINE未連携"}
          </span>
          <span className="badge">出題 {s._count.prompts}問</span>
        </div>
      ))}
    </div>
  );
}
