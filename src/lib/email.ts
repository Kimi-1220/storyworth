// メール送信の差し替え可能な薄いラッパ。通知層のベンダーロックを避けるため、
// 呼び出し口をここに集約する。プロバイダ未設定（開発）はコンソールに出力する。
// → docs/registration-flow.md「通知チャネル」/ docs/writing-studio.md

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY || process.env.SMTP_URL);
}

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
): Promise<void> {
  if (!emailConfigured()) {
    // 開発環境ではログに出すだけ（実際の配信はしない）。
    console.log(`[email:dev] to=${to}\nsubject=${subject}\n${body}\n`);
    return;
  }
  // 実プロバイダ連携を入れる場所（Resend / SMTP 等。ここだけ差し替える）。
  console.log(`[email] (provider) to=${to} subject=${subject}`);
}
