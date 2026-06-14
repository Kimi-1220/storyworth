import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Stepper from "@/app/register/Stepper";
import { saveRecipientAction } from "@/app/register/actions";

export const dynamic = "force-dynamic";

// [4]【ギフト時のみ】相手の情報。※連絡先はまだ聞かない。
// 送る相手のフルネーム・送信手段・送信文言（prefill編集可）を取る。
// 狙い:「こうやって相手に届くんだ」を理解させる“予告”。実宛先はオンボで取得。
// → docs/registration-flow.md「[4]」
export default async function RegisterRecipient({
  searchParams,
}: {
  searchParams: Promise<{ account?: string; relationship?: string; error?: string }>;
}) {
  const { account: accountId = "", relationship = "その他", error } =
    await searchParams;
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) redirect("/register");
  if (account.kind !== "gift") redirect(`/register/copies?account=${accountId}`);

  const existing = await prisma.storyteller.findFirst({ where: { accountId } });

  // 送信文言のデフォルト（prefill・編集可）
  const defaultMessage = `お母さん、いつもありがとう。あなたの人生を一冊の本に残したくて、この贈り物をしました。\n毎週ひとつ質問が届くので、思い出すままに話したり書いたりしてくれたら嬉しいです。`;

  return (
    <div>
      <Stepper current={4} kind="gift" />
      <h1>贈る相手のこと</h1>
      <p className="muted">
        {relationship}（主役）の情報を入力します。
        <strong>連絡先はまだ入力しません。</strong>
        実際の送り先は、お支払いのあとのご案内で設定します。
      </p>

      {error && <p className="form-error">お名前を入力してください。</p>}

      <div className="card">
        <form action={saveRecipientAction} className="stack">
          <input type="hidden" name="account" value={accountId} />
          <input type="hidden" name="relationship" value={relationship} />

          <label className="field">
            <span>{relationship}のお名前（フルネーム）</span>
            <input
              type="text"
              name="name"
              defaultValue={existing?.name ?? ""}
              placeholder="山田 花子"
              required
            />
          </label>

          <fieldset className="field choice-set">
            <legend>どうやって届けますか？</legend>
            <label className="choice">
              <input
                type="radio"
                name="inviteMethod"
                value="line"
                defaultChecked={(existing?.inviteMethod ?? "line") === "line"}
              />
              <span>LINEで送る（連携コード／QRを渡す）</span>
            </label>
            <label className="choice">
              <input
                type="radio"
                name="inviteMethod"
                value="email"
                defaultChecked={existing?.inviteMethod === "email"}
              />
              <span>メールで送る</span>
            </label>
            <label className="choice">
              <input
                type="radio"
                name="inviteMethod"
                value="print"
                defaultChecked={existing?.inviteMethod === "print"}
              />
              <span>印刷して手渡しする</span>
            </label>
          </fieldset>

          <label className="field">
            <span>そえる言葉（あとで編集できます）</span>
            <textarea
              name="inviteMessage"
              defaultValue={existing?.inviteMessage ?? defaultMessage}
            />
          </label>

          <button type="submit">この内容ですすむ</button>
        </form>
      </div>

      <p className="muted reg-note">
        ここで選んだ届け方は、お支払い後のご案内で実際の宛先を設定する“予告”です。
      </p>
    </div>
  );
}
