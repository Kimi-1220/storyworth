import { prisma } from "@/lib/db";
import { uniqueLinkCode } from "@/lib/storyteller";

// アカウントを paid にし、必要なら語り手を用意する共有処理。
// モック確認ページ・実Stripeのsuccess_url の両方から呼べるよう、アクションから分離する。
// 冪等: すでに paid なら何もしない（success_url の再読込・二重発火に耐える）。
export async function markAccountPaid(
  accountId: string,
  sessionId: string,
): Promise<boolean> {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) return false;
  if (account.status === "paid") return true;

  await prisma.account.update({
    where: { id: accountId },
    data: { status: "paid", paidAt: new Date(), stripeSessionId: sessionId },
  });

  // 自分用（A）はこの時点で語り手＝本人を作る（ギフトは[4]で作成済み）。
  if (account.kind === "self") {
    const existing = await prisma.storyteller.findFirst({ where: { accountId } });
    if (!existing) {
      await prisma.storyteller.create({
        data: {
          name: account.fullName,
          relationship: "self",
          accountId,
          status: "active",
          linkCode: await uniqueLinkCode(),
        },
      });
    }
  }
  return true;
}
