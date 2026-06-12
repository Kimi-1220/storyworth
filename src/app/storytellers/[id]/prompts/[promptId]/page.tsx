import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { submitWebAnswer } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function PromptPage({
  params,
}: {
  params: Promise<{ id: string; promptId: string }>;
}) {
  const { id, promptId } = await params;
  const prompt = await prisma.prompt.findUnique({
    where: { id: promptId },
    include: {
      question: true,
      storyteller: true,
      answers: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!prompt || prompt.storytellerId !== id) notFound();

  return (
    <div>
      <p className="muted">
        <Link href={`/storytellers/${id}`}>
          ← {prompt.storyteller.name}さんの物語へ戻る
        </Link>
      </p>
      <h1>{prompt.question.text}</h1>
      <p className="muted">カテゴリ: {prompt.question.category}</p>

      <h2>回答</h2>
      {prompt.answers.length === 0 && (
        <p className="muted">まだ回答がありません。</p>
      )}
      {prompt.answers.map((a) => (
        <div className="card" key={a.id}>
          {a.type === "text" && <p>{a.text}</p>}
          {a.type === "image" && a.mediaPath && (
            <p className="answer-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.mediaPath} alt="回答の写真" />
            </p>
          )}
          {a.type === "audio" && a.mediaPath && (
            <audio controls src={a.mediaPath} />
          )}
          <p className="muted">
            {a.via === "line" ? "LINEから" : "Webから"} ·{" "}
            {a.createdAt.toLocaleString("ja-JP")}
          </p>
        </div>
      ))}

      <div className="card">
        <h2>Webで回答する</h2>
        <form action={submitWebAnswer} className="stack">
          <input type="hidden" name="promptId" value={prompt.id} />
          <textarea
            name="text"
            placeholder="思い出したことを、自由に書いてください。あとから追記もできます。"
          />
          <label className="muted">
            写真・音声を添付（任意）
            <input type="file" name="file" accept="image/*,audio/*" />
          </label>
          <button type="submit">送信する</button>
        </form>
      </div>
    </div>
  );
}
