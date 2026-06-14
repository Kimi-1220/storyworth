import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { PLANS, isPlanId } from "@/lib/billing";
import {
  finishGiftOnboardingAction,
  finishSelfOnboardingAction,
} from "@/app/register/actions";

export const dynamic = "force-dynamic";

// プレミアム（電話取材）の連絡先入力。招待が繋がった後＝オンボで取得する。
// → docs/registration-flow.md「プレミアム（電話取材）の連絡先」
function PremiumFields({ subject }: { subject: string }) {
  return (
    <fieldset className="field choice-set">
      <legend>プレミアム：{subject}への電話取材の連絡先</legend>
      <label className="field">
        <span>電話番号</span>
        <input type="tel" name="phone" placeholder="090-1234-5678" />
      </label>
      <div className="phone-when">
        <label className="field">
          <span>希望の曜日</span>
          <input type="text" name="callDay" placeholder="日曜" />
        </label>
        <label className="field">
          <span>希望の時間帯</span>
          <input type="text" name="callTime" placeholder="14:00頃" />
        </label>
      </div>
    </fieldset>
  );
}

// [7] 決済後オンボーディング：通知チャネルの確定。
// → docs/registration-flow.md「決済後オンボーディング」
export default async function RegisterOnboarding({
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
  if (account.status !== "paid") redirect(`/register/checkout?account=${accountId}`);

  const isPremium = account.plan === "premium";
  const teller = account.storytellers[0];

  // ───────── 自分用（A）: チャネルは1本 ─────────
  if (account.kind === "self") {
    return (
      <div>
        <h1>お支払いありがとうございます</h1>
        <p className="muted">
          {PLANS[account.plan].name}・{account.fullName}さんの自伝づくりを始めます。
          毎週の質問をどこで受け取りますか？
        </p>

        <div className="card">
          <form action={finishSelfOnboardingAction} className="stack">
            <input type="hidden" name="account" value={accountId} />

            <fieldset className="field channel-set">
              <legend>毎週の質問を受け取る方法</legend>
              <label className="choice">
                <input type="radio" name="channel" value="line" defaultChecked />
                <span>LINEで受け取る</span>
              </label>
              <div className="reveal line-reveal">
                <p className="muted">
                  LINE公式アカウントを友だち追加し、この連携コードをトークに送ってください:
                </p>
                <p className="link-code">{teller?.linkCode}</p>
              </div>

              <label className="choice">
                <input type="radio" name="channel" value="email" />
                <span>メールで受け取る</span>
              </label>
              <div className="reveal email-reveal">
                <label className="field">
                  <span>配信先メール</span>
                  <input
                    type="email"
                    name="notifyEmail"
                    defaultValue={account.email}
                    placeholder="you@example.com"
                  />
                </label>
              </div>
            </fieldset>

            {isPremium && <PremiumFields subject="あなた" />}

            <button type="submit">スタジオへすすむ（1問目）</button>
          </form>
        </div>
        <p className="muted reg-note">
          「すすむ」を押すと、あなたの執筆スタジオが開き、最初の質問が表示されます。
        </p>
      </div>
    );
  }

  // ───────── ギフト用（B）: チャネルは2本 ─────────
  const methodDefault = teller?.inviteMethod === "email" ? "email" : "line";
  return (
    <div>
      <h1>お支払いありがとうございます</h1>
      <p className="muted">
        {PLANS[account.plan].name}・{teller?.name ?? "ご家族"}（{teller?.relationship}）への贈り物。
        2つの連絡先を設定します。
      </p>

      <div className="card">
        <form action={finishGiftOnboardingAction} className="stack">
          <input type="hidden" name="account" value={accountId} />

          {/* ① 語り手＝質問配信 */}
          <fieldset className="field channel-set teller-set">
            <legend>① {teller?.name ?? "語り手"}さんへ、毎週の質問を届ける方法</legend>
            <label className="choice">
              <input
                type="radio"
                name="tellerChannel"
                value="line"
                defaultChecked={methodDefault === "line"}
              />
              <span>LINEで届ける（コードを渡す）</span>
            </label>
            <div className="reveal line-reveal">
              <p className="muted">
                この連携コード／QRを{teller?.relationship}に渡してください。
                友だち追加とスタジオ着地は{teller?.name ?? "語り手"}さんの端末で後から行います。
              </p>
              <p className="link-code">{teller?.linkCode}</p>
            </div>

            <label className="choice">
              <input
                type="radio"
                name="tellerChannel"
                value="email"
                defaultChecked={methodDefault === "email"}
              />
              <span>メールで届ける</span>
            </label>
            <div className="reveal email-reveal">
              <label className="field">
                <span>{teller?.name ?? "語り手"}さんのメール</span>
                <input
                  type="email"
                  name="tellerEmail"
                  placeholder="family@example.com"
                />
              </label>
              <p className="muted">案内＋1通目をこの宛先にお送りします。</p>
            </div>
          </fieldset>

          {/* ② 贈り主＝進捗・完成連絡 */}
          <fieldset className="field channel-set giver-set">
            <legend>② あなた（贈り主）への進捗・完成のお知らせ</legend>
            <label className="choice">
              <input type="radio" name="giverChannel" value="email" defaultChecked />
              <span>メールで受け取る</span>
            </label>
            <div className="reveal email-reveal">
              <label className="field">
                <span>あなたの連絡先メール</span>
                <input
                  type="email"
                  name="giverEmail"
                  defaultValue={account.email}
                  placeholder="you@example.com"
                />
              </label>
            </div>
            <label className="choice">
              <input type="radio" name="giverChannel" value="line" />
              <span>LINEで受け取る</span>
            </label>
          </fieldset>

          {isPremium && <PremiumFields subject={teller?.name ?? "語り手"} />}

          <button type="submit">設定して受け渡しへすすむ</button>
        </form>
      </div>
    </div>
  );
}
