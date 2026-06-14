import Link from "next/link";
import { PLAN_IDS, PLANS, formatYen } from "@/lib/billing";

// 決済前に価値を体感させる仕掛け（サンプルの問い・本のプレビュー見本）。
// 先払い×最短執筆の両立のため、LPでできあがりイメージを必ず見せる。
// → docs/registration-flow.md「未解決・要検討」
const SAMPLE_QUESTIONS = [
  "いちばん古い記憶は何ですか？",
  "初めて子どもを抱いたとき、何を思いましたか？",
  "人生でいちばん勇気を出した瞬間は？",
  "あの頃の自分に、いま伝えたいことは？",
];

export default function Home() {
  return (
    <div>
      <h1>家族の人生を、一冊の本に。</h1>
      <p>
        毎週1つ、LINE（またはメール）で質問が届きます。文章でも、写真でも、声でも——
        答えていくだけで、親や祖父母、あるいはあなた自身の人生の物語が少しずつ集まり、
        最後にハードカバーの一冊になります。
      </p>

      <p>
        <Link className="cta" href="/register">
          はじめる
        </Link>
      </p>

      <div className="card">
        <h2>こんな質問が、毎週ひとつ届きます</h2>
        <ul className="sample-q">
          {SAMPLE_QUESTIONS.map((q) => (
            <li key={q}>「{q}」</li>
          ))}
        </ul>
        <p className="muted">
          むずかしく考えず、思い出すままに。あとからいくらでも直せます。
        </p>
      </div>

      {/* できあがりイメージ（本のプレビュー見本） */}
      <div className="card">
        <h2>できあがりは、こんな一冊に</h2>
        <div className="book-cover preview">
          <p className="cover-kicker">自伝</p>
          <h3 className="cover-title">山田 花子の物語</h3>
          <p className="cover-author">著 山田 花子</p>
        </div>
        <p className="muted">
          表紙にお名前が入り、章ごとに人生がまとまります。写真もそのまま本に載ります。
        </p>
      </div>

      <div className="card">
        <h2>つかいかた</h2>
        <ol>
          <li>プランと「だれの物語か（自分／家族）」を選ぶ</li>
          <li>アカウントをつくって購入する</li>
          <li>毎週届く質問に、書く・話す・写真で答える</li>
          <li>集まった物語が、一冊の本になる</li>
        </ol>
      </div>

      <div className="card">
        <h2>プラン</h2>
        <ul className="plan-mini">
          {PLAN_IDS.map((id) => (
            <li key={id}>
              <strong>{PLANS[id].name}</strong>（{PLANS[id].tagline}）—{" "}
              {formatYen(PLANS[id].price)}〜<span className="muted">（仮）</span>
            </li>
          ))}
        </ul>
        <p>
          <Link href="/register">→ プランを見て、はじめる</Link>
          {"　"}
          <Link href="/dashboard" className="muted">
            ダッシュボード（運用）
          </Link>
        </p>
      </div>
    </div>
  );
}
