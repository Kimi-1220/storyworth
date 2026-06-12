import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { put } from "@vercel/blob";

// Vercel上は Vercel Blob（BLOB_READ_WRITE_TOKEN があれば自動で使う）。
// ローカル開発は public/uploads に保存。
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "audio/mpeg": ".mp3",
  "audio/mp4": ".m4a",
  "audio/x-m4a": ".m4a",
  "audio/aac": ".aac",
  "audio/wav": ".wav",
  "audio/ogg": ".ogg",
};

export function mediaTypeOf(mime: string): "image" | "audio" | null {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  return null;
}

// 保存してURL（Blob: 絶対URL / ローカル: /uploads/xxx.jpg）を返す
export async function saveMedia(data: Buffer, mime: string): Promise<string> {
  const ext = EXT_BY_MIME[mime] ?? "";
  const name = `${randomUUID()}${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`uploads/${name}`, data, {
      access: "public",
      contentType: mime,
    });
    return blob.url;
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), data);
  return `/uploads/${name}`;
}
