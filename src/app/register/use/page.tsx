import Link from "next/link";
import { redirect } from "next/navigation";
import { PLANS, isPlanId } from "@/lib/billing";
import Stepper from "@/app/register/Stepper";

export const dynamic = "force-dynamic";

// 続柄の選択肢（ギフト時）。質問セットと主語の出し分けに使う。
const RELATIONSHIPS = ["母", "父", "祖母", "祖父", "その他"];

// [2] 用途フォーク：自分用（A）/ ギフト用（B）。
// ギフトは続柄まで選び、対象者別の質問セットを確定する。
// → docs/registration-flow.md「[2] 用途フォーク」
export default async function RegisterUse({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; rel?: string }>;
}) {
  const { plan = "", rel } = await searchParams;
  if (!isPlanId(plan)) redirect("/register");

  return (
    <div>
      <Stepper current={2} />
      <h1>どなたの物語を本にしますか？</h1>
      <p className="muted">
        選んだプラン: <strong>{PLANS[plan].name}</strong>（{PLANS[plan].tagline}）
      </p>

      <div className="fork-grid">
        <div className="fork-card">
          <h2>自分自身の物語</h2>
          <p className="muted">
            あなた自身が著者になって、自分の人生を一冊にします。質問に答えるのもあなたです。
          </p>
          <Link
            className="cta"
            href={`/register/account?plan=${plan}&kind=self&relationship=self`}
          >
            自分の自伝をつくる
          </Link>
        </div>

        <div className="fork-card">
          <h2>家族へ贈る物語</h2>
          <p className="muted">
            親や祖父母を主役に、贈り物として。質問に答えるのは主役ご本人です。続柄を選んでください。
          </p>
          <div className="rel-row">
            {RELATIONSHIPS.map((r) => (
              <Link
                key={r}
                className={`rel-chip${rel === r ? " selected" : ""}`}
                href={`/register/use?plan=${plan}&rel=${encodeURIComponent(r)}`}
              >
                {r}
              </Link>
            ))}
          </div>
          <Link
            className={`cta${rel ? "" : " disabled"}`}
            href={
              rel
                ? `/register/account?plan=${plan}&kind=gift&relationship=${encodeURIComponent(rel)}`
                : `/register/use?plan=${plan}`
            }
            aria-disabled={!rel}
          >
            {rel ? `${rel}に贈る` : "続柄を選んでください"}
          </Link>
        </div>
      </div>

      <p className="muted reg-note">
        <Link href="/register">← プラン選択にもどる</Link>
      </p>
    </div>
  );
}
