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

  // AIの発言履歴。テーブル未適用（db push 前）でもページを壊さないよう
  // 別クエリ＋フォールバックで取得する。
  let interviewMessages: {
    id: string;
    role: string;
    text: string;
    createdAt: Date;
  }[] = [];
  try {
    interviewMessages = await prisma.interviewMessage.findMany({
      where: { promptId },
      orderBy: { createdAt: "asc" },
    });
  } catch (err) {
    console.error("interviewMessage.findMany skipped:", err);
  }

  // 取材タブ用の完全な会話履歴。語り手の回答（Answer）とAIの返答
  // （InterviewMessage）を createdAt で時系列マージしてチャットに並べる。
  type TLItem =
    | { kind: "user-text"; id: string; at: number; text: string }
    | { kind: "user-audio"; id: string; at: number; src: string }
    | { kind: "user-image"; id: string; at: number; src: string }
    | { kind: "ai-reaction"; id: string; at: number; text: string }
    | { kind: "ai-followup"; id: string; at: number; text: string };

  const timeline: TLItem[] = [];
  for (const a of prompt.answers) {
    const at = a.createdAt.getTime();
    if (a.type === "text" && a.text) {
      timeline.push({ kind: "user-text", id: a.id, at, text: a.text });
    } else if (a.type === "audio" && a.mediaPath) {
      timeline.push({ kind: "user-audio", id: a.id, at, src: a.mediaPath });
    } else if (a.type === "image" && a.mediaPath) {
      timeline.push({ kind: "user-image", id: a.id, at, src: a.mediaPath });
    }
  }
  for (const m of interviewMessages) {
    const at = m.createdAt.getTime();
    if (m.role === "reaction") {
      timeline.push({ kind: "ai-reaction", id: m.id, at, text: m.text });
    } else {
      // 深掘りは1問ずつ別の吹き出しに（順序維持のため微小オフセット）
      m.text
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((q, i) => {
          timeline.push({
            kind: "ai-followup",
            id: `${m.id}-${i}`,
            at: at + i,
            text: q,
          });
        });
    }
  }

  // この機能より前に回答済みのプロンプトには履歴が無いので、
  // 既存の reaction/followups を末尾の1ターンとして補う（移行のための保険）。
  if (interviewMessages.length === 0) {
    const last = timeline.length ? timeline[timeline.length - 1].at : 0;
    if (prompt.reaction) {
      timeline.push({
        kind: "ai-reaction",
        id: `${prompt.id}-legacy-reaction`,
        at: last + 1,
        text: prompt.reaction,
      });
    }
    (prompt.followups ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((q, i) => {
        timeline.push({
          kind: "ai-followup",
          id: `${prompt.id}-legacy-followup-${i}`,
          at: last + 2 + i,
          text: q,
        });
      });
  }

  timeline.sort((a, b) => a.at - b.at);

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
        timeline={timeline.map(({ at, ...rest }) => rest)}
        photos={prompt.answers
          .filter((a) => a.type === "image" && a.mediaPath)
          .map((a) => ({ id: a.id, src: a.mediaPath! }))}
        section={
          prompt.section
            ? { body: prompt.section.body, edited: prompt.section.edited }
            : null
        }
      />
    </div>
  );
}
