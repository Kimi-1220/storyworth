// 課金の単一の出どころ。プラン定義・金額計算と、決済セッションの発行を担う。
// 方針: ベンダーロックを避けるため決済の呼び出し口をここに集約し、
// STRIPE_SECRET_KEY 未設定の開発環境ではモック決済にフォールバックする。
// 実 Stripe 連携（@stripe/stripe-js 等）はこの関数の中だけで差し替えられる。
// → docs/registration-flow.md「[6] Stripe でカード入力 → 購入」

export type PlanId = "basic" | "standard" | "premium";

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string; // 差分の要点（モノクロ/カラー・音声有無・電話取材）
  features: string[];
  price: number; // 1冊ぶんの基本価格（税込・円）※プラン名・価格は仮
  highlight?: boolean;
};

// プラン名・価格は仮（差分が要点）。→ docs/registration-flow.md [1]
export const PLANS: Record<PlanId, Plan> = {
  basic: {
    id: "basic",
    name: "ベーシック",
    tagline: "モノクロ写真・テキスト回答",
    features: [
      "毎週1問、LINEまたはメールで質問が届く",
      "テキストで回答",
      "モノクロ写真を本に掲載",
      "ハードカバー1冊",
    ],
    price: 11_000,
  },
  standard: {
    id: "standard",
    name: "スタンダード",
    tagline: "カラー写真・音声回答",
    features: [
      "ベーシックのすべて",
      "音声でも回答できる（自動で文字に）",
      "カラー写真を本に掲載",
      "ハードカバー1冊",
    ],
    price: 16_500,
    highlight: true,
  },
  premium: {
    id: "premium",
    name: "プレミアム",
    tagline: "毎週プロが電話で取材",
    features: [
      "スタンダードのすべて",
      "毎週プロのインタビュアーが電話で取材",
      "書くのが苦手でも話すだけで物語になる",
      "ハードカバー1冊",
    ],
    price: 33_000,
  },
};

// 2冊目以降の追加部数の単価（仮）。→ docs/registration-flow.md [5]
export const EXTRA_COPY_PRICE = 3_300;

export const PLAN_IDS = Object.keys(PLANS) as PlanId[];

export function isPlanId(v: string): v is PlanId {
  return (PLAN_IDS as string[]).includes(v);
}

// 金額の整形（¥11,000）
export function formatYen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

// 注文合計＝プラン基本価格 ＋ 追加部数 × 単価
export function orderTotal(plan: PlanId, copies: number): number {
  const extra = Math.max(0, copies - 1);
  return PLANS[plan].price + extra * EXTRA_COPY_PRICE;
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

// 決済セッションを発行する。
// - Stripe 設定時: ここで Checkout Session を作り、その URL を返す（要 SDK 連携）。
// - 未設定（開発）: モックの確認ページ URL を返し、そこで擬似決済する。
// 戻り値は遷移先 URL。
export async function createCheckout(accountId: string): Promise<string> {
  const base = process.env.APP_BASE_URL ?? "";
  if (!stripeConfigured()) {
    // モック: 決済の体裁を保った確認ページへ。完了で paid に更新する。
    return `${base}/register/checkout/mock?account=${accountId}`;
  }
  // 実 Stripe 連携を入れる場所（SDK導入後にここだけ差し替える）:
  //   const session = await stripe.checkout.sessions.create({ ... ,
  //     success_url: `${base}/register/checkout/complete?account=${accountId}&session_id={CHECKOUT_SESSION_ID}`,
  //     cancel_url:  `${base}/register/checkout?account=${accountId}` });
  //   return session.url;
  throw new Error("Stripe 連携は未実装です（STRIPE_SECRET_KEY は設定済み）");
}
