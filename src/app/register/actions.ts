"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { uniqueLinkCode } from "@/lib/storyteller";
import { createCheckout, isPlanId } from "@/lib/billing";
import { createMagicLink } from "@/lib/auth";
import { sendNextQuestion } from "@/lib/prompts";
import { sendEmail } from "@/lib/email";
import { markAccountPaid } from "@/lib/registration";

// メールの簡易検証（funnelは止めず、最終的な到達確認は決済後のマジックリンクで回収）。
function looksLikeEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// [3] 購入者のメール＋フルネーム → アカウント作成（この時点は未決済）。
// email をアンカーにし、同一メールの再訪はupsertでカゴ落ち分を引き継ぐ。
export async function createAccountAction(formData: FormData) {
  const plan = String(formData.get("plan") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const relationship = String(formData.get("relationship") ?? "self").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const emailConfirm = String(formData.get("emailConfirm") ?? "").trim();

  const back = `/register/account?plan=${plan}&kind=${kind}&relationship=${encodeURIComponent(relationship)}`;
  if (!isPlanId(plan) || (kind !== "self" && kind !== "gift")) {
    redirect("/register");
  }
  if (!fullName || !looksLikeEmail(email) || email !== emailConfirm) {
    redirect(`${back}&error=1`);
  }

  const account = await prisma.account.upsert({
    where: { email },
    // 既存の未決済アカウントは選び直しを反映。決済済みは新規購入として扱わずそのまま更新。
    update: { fullName, kind, plan },
    create: { email, fullName, kind, plan },
  });

  redirect(
    kind === "gift"
      ? `/register/recipient?account=${account.id}&relationship=${encodeURIComponent(relationship)}`
      : `/register/copies?account=${account.id}`,
  );
}

// [4]【ギフト時のみ】相手の情報（連絡先はまだ聞かない＝“予告”）。
// 語り手レコードを pending-invite で作る。実際の宛先はオンボで埋める。
export async function saveRecipientAction(formData: FormData) {
  const accountId = String(formData.get("account") ?? "");
  const relationship = String(formData.get("relationship") ?? "その他").trim();
  const name = String(formData.get("name") ?? "").trim();
  const inviteMethod = String(formData.get("inviteMethod") ?? "line");
  const inviteMessage = String(formData.get("inviteMessage") ?? "").trim();

  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) redirect("/register");
  if (!name) {
    redirect(
      `/register/recipient?account=${accountId}&relationship=${encodeURIComponent(relationship)}&error=1`,
    );
  }

  // 語り手は account につき1人想定だが、再訪時は既存を更新する。
  const existing = await prisma.storyteller.findFirst({
    where: { accountId },
  });
  if (existing) {
    await prisma.storyteller.update({
      where: { id: existing.id },
      data: { name, relationship, inviteMethod, inviteMessage, status: "pending-invite" },
    });
  } else {
    await prisma.storyteller.create({
      data: {
        name,
        relationship,
        accountId,
        inviteMethod,
        inviteMessage,
        status: "pending-invite",
        linkCode: await uniqueLinkCode(),
      },
    });
  }

  redirect(`/register/copies?account=${accountId}`);
}

// [5] 発行部数を選ぶ。
export async function saveCopiesAction(formData: FormData) {
  const accountId = String(formData.get("account") ?? "");
  const copies = Math.max(1, Math.min(20, Number(formData.get("copies") ?? 1)));
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) redirect("/register");

  await prisma.account.update({ where: { id: accountId }, data: { copies } });
  redirect(`/register/checkout?account=${accountId}`);
}

// [6] 決済へ。Stripe設定時はCheckoutへ、未設定時はモック確認ページへ。
export async function startCheckoutAction(formData: FormData) {
  const accountId = String(formData.get("account") ?? "");
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) redirect("/register");
  const url = await createCheckout(accountId);
  redirect(url);
}

// 決済完了（モック確認ページ）。アカウントを paid にしてオンボへ。
export async function confirmPaymentAction(formData: FormData) {
  const accountId = String(formData.get("account") ?? "");
  const sessionId = String(formData.get("session_id") ?? `mock_${Date.now()}`);
  const ok = await markAccountPaid(accountId, sessionId);
  redirect(ok ? `/register/onboarding?account=${accountId}` : "/register");
}

// [7-A] 自分用オンボ: 質問配信チャネルを確定 → スタジオへ着地（1問目）。
export async function finishSelfOnboardingAction(formData: FormData) {
  const accountId = String(formData.get("account") ?? "");
  const channel = String(formData.get("channel") ?? "line");
  const notifyEmail = String(formData.get("notifyEmail") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const callDay = String(formData.get("callDay") ?? "").trim();
  const callTime = String(formData.get("callTime") ?? "").trim();

  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) redirect("/register");
  const storyteller = await prisma.storyteller.findFirst({ where: { accountId } });
  if (!storyteller) redirect("/register");

  await prisma.storyteller.update({
    where: { id: storyteller.id },
    data: {
      notifyChannel: channel,
      notifyEmail: channel === "email" ? notifyEmail || account.email : null,
      ...(account.plan === "premium" ? { phone, callDay, callTime } : {}),
    },
  });

  // 1問目を用意して、そのままスタジオに着地（マジックリンクでログイン済みに）。
  const prompt = await sendNextQuestion(storyteller.id);
  if (channel === "email") {
    const url = await createMagicLink(storyteller.id, prompt?.id);
    await sendEmail(
      storyteller.notifyEmail ?? account.email,
      "さっそく1通目をお送りしました",
      `${account.fullName}さん、あなたの自伝づくりが始まりました。\n\n下のリンクから、最初の質問に書いても話しても答えられます。\n${url}`,
    );
  }
  const studioUrl = await createMagicLink(storyteller.id, prompt?.id);
  redirect(studioUrl);
}

// [7-B] ギフト用オンボ: ①語り手への配信チャネル ②贈り主への連絡チャネル を確定。
// 語り手は pending-invite のまま、宛先を実値化して受け渡し情報を整える。
export async function finishGiftOnboardingAction(formData: FormData) {
  const accountId = String(formData.get("account") ?? "");
  const tellerChannel = String(formData.get("tellerChannel") ?? "line");
  const tellerEmail = String(formData.get("tellerEmail") ?? "").trim();
  const giverChannel = String(formData.get("giverChannel") ?? "email");
  const giverEmail = String(formData.get("giverEmail") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const callDay = String(formData.get("callDay") ?? "").trim();
  const callTime = String(formData.get("callTime") ?? "").trim();

  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) redirect("/register");
  const storyteller = await prisma.storyteller.findFirst({ where: { accountId } });
  if (!storyteller) redirect("/register");

  // ① 語り手＝質問配信
  await prisma.storyteller.update({
    where: { id: storyteller.id },
    data: {
      notifyChannel: tellerChannel,
      notifyEmail: tellerChannel === "email" ? tellerEmail : null,
      ...(account.plan === "premium" ? { phone, callDay, callTime } : {}),
    },
  });
  // ② 贈り主＝進捗・完成連絡
  await prisma.account.update({
    where: { id: accountId },
    data: {
      notifyChannel: giverChannel,
      notifyEmail: giverChannel === "email" ? giverEmail || account.email : null,
    },
  });

  // メール手段なら、語り手に案内＋1通目を送る（宛先が分かったので実値化）。
  if (tellerChannel === "email" && tellerEmail) {
    const prompt = await sendNextQuestion(storyteller.id);
    const url = await createMagicLink(storyteller.id, prompt?.id);
    const intro = storyteller.inviteMessage
      ? `${storyteller.inviteMessage}\n\n`
      : "";
    await sendEmail(
      tellerEmail,
      "あなたの自伝づくりへのご案内",
      `${intro}${storyteller.name}さんへ。\n\n下のリンクをひらくと、あなたの執筆スタジオが開きます。\n最初の質問に、書いても話しても答えられます。\n${url}`,
    );
  }

  // 受け渡し（LINEコード提示 or 送信完了）の確認ページへ。
  redirect(`/register/done?account=${accountId}`);
}
