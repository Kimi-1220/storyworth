import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// ギフトの受け渡し完了。贈り主の画面は「コードの受け渡し」までで、
// 友だち追加・スタジオ着地は語り手の端末で後から（語り手オンボ＝別フロー）。
// → docs/registration-flow.md「ギフト用（B）」
export default async function RegisterDone({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const { account: accountId = "" } = await searchParams;
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: { storytellers: true },
  });
  if (!account) redirect("/register");
  const teller = account.storytellers[0];
  const method = teller?.notifyChannel ?? teller?.inviteMethod ?? "line";

  return (
    <div>
      <h1>準備ができました</h1>
      <p className="muted">
        {teller?.name ?? "ご家族"}さんへの贈り物の用意が整いました。
        ここから先は{teller?.name ?? "語り手"}さんが主役です。
      </p>

      <div className="card">
        {method === "line" && (
          <>
            <h2>LINEのコードを渡してください</h2>
            <p>
              {teller?.name ?? "語り手"}さんに、LINE公式アカウントの友だち追加と、
              この6桁コードの送信をお願いしてください。
            </p>
            <p className="link-code">{teller?.linkCode}</p>
            <p className="muted">
              追加してコードを送ると連携が完了し、最初の質問が届きます。
              スタジオへの着地は{teller?.name ?? "語り手"}さんの端末で行われます。
            </p>
          </>
        )}
        {method === "email" && (
          <>
            <h2>メールをお送りしました</h2>
            <p>
              {teller?.name ?? "語り手"}さん（{teller?.notifyEmail}）宛てに、
              ご案内と最初の質問をお送りしました。リンクをひらくと執筆スタジオが開きます。
            </p>
            <p className="muted">届かないときは、迷惑メールフォルダもご確認ください。</p>
          </>
        )}
        {method === "print" && (
          <>
            <h2>印刷して手渡してください</h2>
            <p>
              {teller?.name ?? "語り手"}さんへの案内状を印刷してお渡しください。
              案内に記載のコードからスタジオに着地できます。
            </p>
            <p className="link-code">{teller?.linkCode}</p>
          </>
        )}
      </div>

      <div className="card">
        <h2>あなた（贈り主）は</h2>
        <p>
          ダッシュボードから、{teller?.name ?? "語り手"}さんの執筆の進み具合を見守れます。
          進捗や本の完成は{account.notifyChannel === "line" ? "LINE" : "メール"}でお知らせします。
        </p>
        <p>
          <Link className="cta" href="/dashboard">
            ダッシュボードへ
          </Link>
        </p>
      </div>
    </div>
  );
}
