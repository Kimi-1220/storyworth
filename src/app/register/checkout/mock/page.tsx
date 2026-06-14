import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { PLANS, formatYen, isPlanId, orderTotal } from "@/lib/billing";
import { confirmPaymentAction } from "@/app/register/actions";

export const dynamic = "force-dynamic";

// モック決済ページ（STRIPE_SECRET_KEY 未設定時のみ）。実 Stripe の Checkout 画面の代役。
// 「支払う」で confirmPaymentAction が走り、アカウントを paid にしてオンボへ進む。
export default async function MockCheckout({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const { account: accountId = "" } = await searchParams;
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account || !isPlanId(account.plan)) redirect("/register");
  if (account.status === "paid") redirect(`/register/onboarding?account=${accountId}`);

  const total = orderTotal(account.plan, account.copies ?? 1);

  return (
    <div>
      <h1>お支払い（モック）</h1>
      <div className="card mock-pay">
        <p className="muted">
          これは開発用のダミー決済画面です。実際のカード情報は不要で、請求も発生しません。
          本番では Stripe の決済ページに置き換わります。
        </p>
        <div className="order-row total">
          <span>{PLANS[account.plan].name} × {account.copies ?? 1}冊</span>
          <strong>{formatYen(total)}</strong>
        </div>

        <div className="mock-card">
          <div className="mock-card-row">カード番号　4242 4242 4242 4242</div>
          <div className="mock-card-row">有効期限 12/34　　CVC 123</div>
        </div>

        <form action={confirmPaymentAction}>
          <input type="hidden" name="account" value={accountId} />
          <input type="hidden" name="session_id" value={`mock_${account.id}`} />
          <button type="submit" className="pay-btn">
            {formatYen(total)} を支払う
          </button>
        </form>
      </div>
      <p className="muted reg-note">
        <Link href={`/register/checkout?account=${accountId}`}>← 注文の確認にもどる</Link>
      </p>
    </div>
  );
}
