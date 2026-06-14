import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  EXTRA_COPY_PRICE,
  PLANS,
  formatYen,
  isPlanId,
  orderTotal,
} from "@/lib/billing";
import Stepper from "@/app/register/Stepper";
import { saveCopiesAction } from "@/app/register/actions";

export const dynamic = "force-dynamic";

// [5] 発行部数を選ぶ（価格の数量ライン）。
// → docs/registration-flow.md「[5]」
export default async function RegisterCopies({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const { account: accountId = "" } = await searchParams;
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account || !isPlanId(account.plan)) redirect("/register");

  const planId = account.plan;
  const plan = PLANS[planId];
  const current = account.copies ?? 1;

  return (
    <div>
      <Stepper current={account.kind === "gift" ? 5 : 4} kind={account.kind as "self" | "gift"} />
      <h1>何冊つくりますか？</h1>
      <p className="muted">
        {plan.name}は1冊ぶんが基本価格（{formatYen(plan.price)}）。2冊目以降は1冊
        {formatYen(EXTRA_COPY_PRICE)}（仮）で追加できます。ご家族で分けて持つ方に人気です。
      </p>

      <div className="card">
        <form action={saveCopiesAction} className="stack">
          <input type="hidden" name="account" value={accountId} />

          <label className="field">
            <span>発行部数</span>
            <select name="copies" defaultValue={String(current)} className="copies-select">
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}冊 — {formatYen(orderTotal(planId, n))}
                </option>
              ))}
            </select>
          </label>

          <button type="submit">お支払いへすすむ</button>
        </form>
      </div>
    </div>
  );
}
