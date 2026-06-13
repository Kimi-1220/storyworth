import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getStudioStoryteller } from "@/lib/auth";
import AnswerForm from "@/app/studio/AnswerForm";

export const dynamic = "force-dynamic";

export default async function StudioPromptPage({
  params,
}: {
  params: Promise<{ promptId: string }>;
}) {
  const { promptId } = await params;
  const me = await getStudioStoryteller();
  if (!me) redirect("/studio");

  const prompt = await prisma.prompt.findUnique({
    where: { id: promptId },
    include: {
      question: true,
      answers: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!prompt || prompt.storytellerId !== me.id) notFound();

  const chapter = await prisma.chapter.findUnique({
    where: {
      storytellerId_category: {
        storytellerId: me.id,
        category: prompt.question.category,
      },
    },
  });

  const followups = (prompt.followups ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const textAnswers = prompt.answers.filter((a) => a.type === "text");

  return (
    <div className="studio">
      <p className="muted">
        <Link href="/studio">← {me.name}の物語へ戻る</Link>
      </p>

      <div className="studio-card current-question">
        <p className="muted">取材 · {prompt.question.category}</p>
        <p className="question-text">
          {prompt.novelText ?? prompt.question.text}
        </p>
      </div>

      <AnswerForm
        promptId={prompt.id}
        placeholder="わたしが最初に覚えているのは…"
      />

      {prompt.reaction && (
        <div className="reaction">
          <p>{prompt.reaction}</p>
        </div>
      )}

      {followups.length > 0 && (
        <div className="studio-card followups">
          <p className="muted">よかったら、もう少しだけ聞かせてください</p>
          <ul>
            {followups.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
          <p className="muted">
            上の「書く / 話す」から、続きをそのまま書き加えられます。
          </p>
        </div>
      )}

      {prompt.answers.length > 0 && (
        <section className="your-words">
          <h2>あなたの言葉</h2>
          {textAnswers.map((a) => (
            <p className="manuscript" key={a.id}>
              {a.text}
            </p>
          ))}
          {prompt.answers
            .filter((a) => a.type === "audio" && a.mediaPath)
            .map((a) => (
              <audio key={a.id} controls src={a.mediaPath!} />
            ))}
          <div className="photos">
            {prompt.answers
              .filter((a) => a.type === "image" && a.mediaPath)
              .map((a) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={a.id} src={a.mediaPath!} alt="思い出の写真" />
              ))}
          </div>
        </section>
      )}

      {chapter && (
        <section className="chapters">
          <h2>この話が、本になっていきます</h2>
          <article className="chapter">
            <h3>「{chapter.title}」</h3>
            <p className="chapter-body">{chapter.body}</p>
          </article>
        </section>
      )}
    </div>
  );
}
