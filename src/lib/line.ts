import { messagingApi } from "@line/bot-sdk";

export const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "",
  channelSecret: process.env.LINE_CHANNEL_SECRET ?? "",
};

export function lineConfigured(): boolean {
  return Boolean(lineConfig.channelAccessToken && lineConfig.channelSecret);
}

let _client: messagingApi.MessagingApiClient | null = null;
let _blobClient: messagingApi.MessagingApiBlobClient | null = null;

export function lineClient(): messagingApi.MessagingApiClient {
  _client ??= new messagingApi.MessagingApiClient({
    channelAccessToken: lineConfig.channelAccessToken,
  });
  return _client;
}

export function lineBlobClient(): messagingApi.MessagingApiBlobClient {
  _blobClient ??= new messagingApi.MessagingApiBlobClient({
    channelAccessToken: lineConfig.channelAccessToken,
  });
  return _blobClient;
}

export async function pushText(to: string, text: string): Promise<void> {
  await lineClient().pushMessage({ to, messages: [{ type: "text", text }] });
}

export async function replyText(
  replyToken: string,
  text: string,
): Promise<void> {
  await lineClient().replyMessage({
    replyToken,
    messages: [{ type: "text", text }],
  });
}

// LINEのコンテンツAPIから画像・音声のバイナリを取得する
export async function fetchMessageContent(messageId: string): Promise<Buffer> {
  const stream = await lineBlobClient().getMessageContent(messageId);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
