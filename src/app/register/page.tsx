import Link from "next/link";
import { PLAN_IDS, PLANS, formatYen } from "@/lib/billing";
import Stepper from "@/app/register/Stepper";

export const dynamic = "force-dynamic";

// [1] プランを選ぶ（最初の意思決定＝価格）。差分（モノクロ/カラー・音声・電話取材）が要点。
// → docs/registration-flow.md「購入の導線」
export default function RegisterPlans() {
  return (
    <div>
      <Stepper current={1} />
      <h1>プランを選ぶ</h1>
      <p className="muted">
        毎週1問に答えていくと、親や祖父母（または自分）の人生がハードカバー1冊になります。
        まずはプランから。あとから変更できます。
      </p>

      <div className="plan-grid">
        {PLAN_IDS.map((id) => {
          const plan = PLANS[id];
          return (
            <div className={`plan-card${plan.highlight ? " highlight" : ""}`} key={id}>
              {plan.highlight && <span className="plan-tag">おすすめ</span>}
              <h2 className="plan-name">{plan.name}</h2>
              <p className="plan-tagline">{plan.tagline}</p>
              <p className="plan-price">
                {formatYen(plan.price)}
                <span className="plan-unit">／1冊・税込（仮）</span>
              </p>
              <ul className="plan-features">
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Link className="cta plan-cta" href={`/register/use?plan=${id}`}>
                {plan.name}で進む
              </Link>
            </div>
          );
        })}
      </div>

      <p className="muted reg-note">
        価格・プラン名は仮です。お支払いは次のステップ以降、内容を確認してから行います。
      </p>
    </div>
  );
}
