import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

// 開発用: public/uploads にローカル保存。本番ではS3/R2に差し替える。
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

// 保存して public/ からの相対パス（例: /uploads/xxx.jpg）を返す
export async function saveMedia(data: Buffer, mime: string): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const ext = EXT_BY_MIME[mime] ?? "";
  const name = `${randomUUID()}${ext}`;
  await writeFile(path.join(UPLOAD_DIR, name), data);
  return `/uploads/${name}`;
}
