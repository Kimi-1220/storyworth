import Anthropic from "@anthropic-ai/sdk";

// プロダクトの肝①②を支えるLLM層（→ docs/line-experience.md / docs/novel.md）。
// ・リアクション生成（聞き上手な反応）
// ・やさしい深掘り質問の生成
// ・質問文を小説的にする（五感を誘発する問いかけ）
// ・回答群 → 章の下書き執筆
//
// ANTHROPIC_API_KEY が無い環境（ローカル/未設定）でも Web は動くよう、
// すべてフォールバック付き。設定があれば claude-opus-4-8 を使う。

const MODEL = "claude-opus-4-8";

export function llmConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let _client: Anthropic | null = null;
function client(): Anthropic {
  _client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

// 共通のテキスト生成。失敗時は null を返し、呼び出し側でフォールバックする。
async function generateText(
  system: string,
  user: string,
  maxTokens = 1024,
): Promise<string | null> {
  if (!llmConfigured()) return null;
  try {
    const res = await client().messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system: `${system}\n\n求められた本文だけを返してください。前置き・説明・思考の手順は書かないこと。`,
      messages: [{ role: "user", content: user }],
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return text || null;
  } catch (err) {
    console.error("LLM generateText error:", err);
    return null;
  }
}

const TONE = `あなたは家族の伝記をつくるサービスの、温かく聞き上手な「聞き手・編集者」です。
語り手は60〜90代の方が多く、その人生の話を本にして家族に贈ります。
敬語ベースですが硬すぎず、孫世代が話しかけるような温かいトーンで。絵文字は控えめに。`;

// 回答に対する人間らしいリアクション（固有名詞・具体を拾う）。
// → docs/line-experience.md「1. リアクション」
export async function generateReaction(
  questionText: string,
  answerText: string,
): Promise<string | null> {
  return generateText(
    TONE,
    `語り手はいま「${questionText}」という質問に、こう答えてくれました。

「${answerText}」

この回答の具体的な中身（出てきた地名・人物・できごと・気持ち）を一つ拾って、
心のこもった短い相づちを1〜2文で返してください。質問を新たに足さず、
「聞けてうれしい」という気持ちが伝わる返事だけにしてください。`,
    300,
  );
}

// やさしい深掘り質問を1〜2問。情景・感情・五感を引き出す。
// → docs/writing-studio.md「やさしい深掘り」/ docs/novel.md 素材要件
export async function generateFollowups(
  questionText: string,
  answerText: string,
): Promise<string[]> {
  const raw = await generateText(
    TONE,
    `語り手はいま「${questionText}」という質問に、こう答えてくれました。

「${answerText}」

この話をもっと味わい深い物語にするために、やさしい深掘りの問いかけを
1〜2問だけ作ってください。情景（匂い・音・色）、そのときの気持ち、
年代や場所など、答えやすく具体的なものを。しつこくせず、温かく。
出力は質問文だけを1行に1問ずつ。記号や番号は付けないでください。`,
    400,
  );
  if (!raw) return [];
  return raw
    .split("\n")
    .map((l) => l.replace(/^[\-・*\d.\s）)]+/, "").trim())
    .filter((l) => l.length > 0)
    .slice(0, 2);
}

// 質問文を小説的にする（五感・情景描写を誘発する問いかけに）。
// → docs/writing-studio.md「質問文を小説的にする」
export async function novelizeQuestion(
  questionText: string,
  category: string,
): Promise<string | null> {
  return generateText(
    TONE,
    `次の質問を、語り手が情景を思い浮かべて語りたくなるような、
小説的で五感を誘う問いかけに書き換えてください（章テーマ: ${category}）。
1〜2文で。説明や前置きは付けず、問いかけ本文だけを返してください。

元の質問: 「${questionText}」`,
    300,
  );
}

const BIOGRAPHER = `${TONE}

あなたは伝記作家です。語り手本人の回答だけを素材に、読み物として面白い一人称の文章を書きます。
鉄則:
・語られていないエピソードを創作しない。描写の肉付けは本人の言葉の範囲内で。
・本人の口癖・言い回しはできるだけ残す（標準語に均しすぎない）。
・「醤油を借りに走った」のように具体的な情景で書く。羅列にしない。`;

// 1質問=1セクションの本文を生成する。
// existingBody が無ければ新規執筆、あれば「追記モード」:
// 既存の言い回し・事実は極力保ち、新しい回答の内容だけを自然に織り込む。
// → docs/novel.md / セクション単位の編集を壊さないための設計
export async function draftSection(
  storytellerName: string,
  questionText: string,
  newAnswerText: string,
  existingBody?: string,
): Promise<string | null> {
  if (existingBody && existingBody.trim()) {
    return generateText(
      BIOGRAPHER,
      `語り手「${storytellerName}」さんの、ある質問への一人称の文章があります。
本人が手で直している場合もあるので、既存の文章はできるだけ尊重してください。

【質問】${questionText}

【いまの文章】
${existingBody}

【あとから加わった本人の話】
${newAnswerText}

この「あとから加わった話」の内容を、いまの文章に自然に追記してください。
既存の事実・言い回し・本人の編集はできるだけ変えず、新しい内容の文脈だけを足します。
全体を書き直さないこと。更新後の本文だけを返してください（見出し不要）。`,
      1500,
    );
  }
  return generateText(
    BIOGRAPHER,
    `語り手「${storytellerName}」さんの、次の質問への回答をもとに、一人称の短い文章（150〜400字程度）を書いてください。
素材が薄ければ無理に膨らませず、今ある分だけで自然に。見出しは付けず本文だけを返してください。

【質問】${questionText}
【回答】${newAnswerText}`,
    1200,
  );
}

// 章タイトルだけを内容に合わせて付け直す（短く情緒のある見出し）。
export async function chapterTitle(
  category: string,
  sectionBodies: string[],
): Promise<string | null> {
  if (sectionBodies.length === 0) return null;
  const joined = sectionBodies.join("\n\n").slice(0, 3000);
  return generateText(
    TONE,
    `次の文章群は、ある自伝の「${category}」の章を構成するものです。
この章にふさわしい、短く情緒のある章タイトルを1つだけ提案してください（15文字以内・記号や鉤括弧なし・タイトルのみ）。

${joined}`,
    100,
  );
}
