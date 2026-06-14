import Link from "next/link";
import { redirect } from "next/navigation";
import { PLANS, isPlanId } from "@/lib/billing";
import Stepper from "@/app/register/Stepper";
import { createAccountAction } from "@/app/register/actions";

export const dynamic = "force-dynamic";

// [3] 購入者のメール＋フルネーム → アカウント作成（未決済）。
// アカウントのアンカー＝このメール。Stripe任せにせず自前で先に取る。
// 誤入力対策に2回入力。検証は決済後の初回マジックリンクで回収。
// → docs/registration-flow.md「[3]」
export default async function RegisterAccount({
  searchParams,
}: {
  searchParams: Promise<{
    plan?: string;
    kind?: string;
    relationship?: string;
    error?: string;
  }>;
}) {
  const { plan = "", kind = "", relationship = "self", error } = await searchParams;
  if (!isPlanId(plan) || (kind !== "self" && kind !== "gift")) {
    redirect("/register");
  }

  const isGift = kind === "gift";
  const relLabel = relationship === "self" ? "自分の自伝" : `${relationship}へ贈る`;

  return (
    <div>
      <Stepper current={3} kind={kind} />
      <h1>アカウントをつくる</h1>
      <p className="muted">
        {PLANS[plan].name}・{relLabel}。
        {isGift
          ? "まずは購入されるあなたの情報を登録します（贈り主）。"
          : "まずはあなたの情報を登録します。"}
        このメールアドレスがアカウントの基準になります。
      </p>

      {error && (
        <p className="form-error">
          入力内容をご確認ください。メールアドレスは2回とも同じものを、正しい形式でご入力ください。
        </p>
      )}

      <div className="card">
        <form action={createAccountAction} className="stack">
          <input type="hidden" name="plan" value={plan} />
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="relationship" value={relationship} />

          <label className="field">
            <span>お名前（フルネーム）</span>
            <input type="text" name="fullName" placeholder="山田 太郎" required />
          </label>

          <label className="field">
            <span>メールアドレス</span>
            <input type="email" name="email" placeholder="you@example.com" required />
          </label>

          <label className="field">
            <span>メールアドレス（確認のためもう一度）</span>
            <input
              type="email"
              name="emailConfirm"
              placeholder="you@example.com"
              required
            />
          </label>

          <button type="submit">この内容ですすむ</button>
        </form>
      </div>

      <p className="muted reg-note">
        まだお支払いは発生しません。
        <Link href={`/register/use?plan=${plan}`}>← 用途の選択にもどる</Link>
      </p>
    </div>
  );
}
