// 音声の文字起こし。話した内容をその場で読める原稿にする。
// → docs/writing-studio.md「話す」/ docs/novel.md（方言・言い回しの保持）
//
// OPENAI_API_KEY があれば Whisper を使う。無ければ null を返し、
// 音声はそのまま保存して「文字起こしは後ほど」とする（グレースフルに劣化）。
// 通知チャネル同様、文字起こしエンジンも将来差し替え可能な一点に閉じ込める。

export function transcribeConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function transcribeAudio(
  data: Buffer,
  mime: string,
): Promise<string | null> {
  if (!transcribeConfigured()) return null;
  try {
    const ext = mime.includes("mp4") || mime.includes("m4a") ? "m4a" : "webm";
    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(data)], { type: mime }),
      `audio.${ext}`,
    );
    form.append("model", "whisper-1");
    form.append("language", "ja");
    // 方言・言い回しを残したいので、過度な整形は避ける
    form.append("response_format", "text");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
    });
    if (!res.ok) {
      console.error("transcribe failed:", res.status, await res.text());
      return null;
    }
    const text = (await res.text()).trim();
    return text || null;
  } catch (err) {
    console.error("transcribe error:", err);
    return null;
  }
}
