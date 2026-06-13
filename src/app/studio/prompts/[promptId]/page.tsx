import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getStudioStoryteller } from "@/lib/auth";
import PromptTabs from "@/app/studio/PromptTabs";

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
      section: true,
      answers: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!prompt || prompt.storytellerId !== me.id) notFound();

  const followups = (prompt.followups ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="studio">
      <p className="muted">
        <Link href="/studio">← {me.name}の物語へ戻る</Link>
      </p>

      <PromptTabs
        promptId={prompt.id}
        novelText={prompt.novelText ?? prompt.question.text}
        plainQuestion={prompt.question.text}
        category={prompt.question.category}
        answers={prompt.answers.map((a) => ({
          id: a.id,
          type: a.type,
          text: a.text,
          mediaPath: a.mediaPath,
        }))}
        reaction={prompt.reaction}
        followups={followups}
        section={
          prompt.section
            ? { body: prompt.section.body, edited: prompt.section.edited }
            : null
        }
      />
    </div>
  );
}
