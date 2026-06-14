import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  EXTRA_COPY_PRICE,
  PLANS,
  formatYen,
  isPlanId,
  orderTotal,
  stripeConfigured,
} from "@/lib/billing";
import Stepper from "@/app/register/Stepper";
import { startCheckoutAction } from "@/app/register/actions";

export const dynamic = "force-dynamic";

// [6] Stripe でカード入力 → 購入（アカウントを paid に）。
// → docs/registration-flow.md「[6]」
export default async function RegisterCheckout({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const { account: accountId = "" } = await searchParams;
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: { storytellers: true },
  });
  if (!account || !isPlanId(account.plan)) redirect("/register");
  if (account.status === "paid") redirect(`/register/onboarding?account=${accountId}`);

  const plan = PLANS[account.plan];
  const copies = account.copies ?? 1;
  const total = orderTotal(account.plan, copies);
  const teller = account.storytellers[0];

  return (
    <div>
      <Stepper current={account.kind === "gift" ? 6 : 5} kind={account.kind as "self" | "gift"} />
      <h1>ご注文の確認</h1>

      <div className="card order-summary">
        <div className="order-row">
          <span>プラン</span>
          <strong>
            {plan.name}（{plan.tagline}）
          </strong>
        </div>
        <div className="order-row">
          <span>主役</span>
          <strong>
            {account.kind === "self"
              ? `${account.fullName}（自分の自伝）`
              : `${teller?.name ?? "ご家族"}（${teller?.relationship ?? ""}へ贈る）`}
          </strong>
        </div>
        <div className="order-row">
          <span>部数</span>
          <strong>{copies}冊</strong>
        </div>
        <hr />
        <div className="order-row">
          <span>{plan.name} 基本（1冊）</span>
          <span>{formatYen(plan.price)}</span>
        </div>
        {copies > 1 && (
          <div className="order-row">
            <span>
              追加 {copies - 1}冊 × {formatYen(EXTRA_COPY_PRICE)}
            </span>
            <span>{formatYen((copies - 1) * EXTRA_COPY_PRICE)}</span>
          </div>
        )}
        <div className="order-row total">
          <span>合計（税込・仮）</span>
          <strong>{formatYen(total)}</strong>
        </div>
      </div>

      <form action={startCheckoutAction}>
        <input type="hidden" name="account" value={accountId} />
        <button type="submit" className="pay-btn">
          カードで支払う（{formatYen(total)}）
        </button>
      </form>

      <p className="muted reg-note">
        {stripeConfigured()
          ? "安全な決済ページ（Stripe）に移動します。"
          : "※ 開発モード: 実際の請求は発生しません（モック決済）。"}
        <br />
        <Link href={`/register/copies?account=${accountId}`}>← 部数の選択にもどる</Link>
      </p>
    </div>
  );
}
