"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitStudioAnswer } from "@/app/studio/actions";

type Mode = "write" | "speak";

// 取材チャットの入力欄（composer）。「書く」と「話す」を切り替えられ、写真も添付できる。
// 既定でマルチライン前提の高さを持たせ、短文で済ませず書ける雰囲気にする。
// onSending: 送信した瞬間に親へプレビュー文字列を渡す（楽観的な吹き出し用）。
// onPendingChange: 送信〜AI返答反映までの pending を親へ伝える（進捗ラベル用）。
// → docs/writing-studio.md
export default function AnswerForm({
  promptId,
  placeholder,
  onSending,
  onPendingChange,
}: {
  promptId: string;
  placeholder: string;
  onSending?: (preview: string) => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("write");
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // pending（送信中〜サーバー再取得の反映まで）を親に伝える。
  useEffect(() => {
    onPendingChange?.(pending);
  }, [pending, onPendingChange]);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError("マイクを使えませんでした。ブラウザの許可をご確認ください。");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  function submit() {
    const hasText = mode === "write" && text.trim().length > 0;
    const hasAudio = mode === "speak" && audioBlob;
    if (!hasText && !hasAudio && !photo) {
      setError("書くか、話すか、写真を添えてから送ってください。");
      return;
    }
    setError(null);

    // 楽観的な吹き出し用のプレビュー文字列。
    const preview = hasText
      ? text.trim()
      : hasAudio
        ? "🎙 録音を送りました"
        : "📷 写真を送りました";
    onSending?.(preview);

    const fd = new FormData();
    fd.set("promptId", promptId);
    if (hasText) fd.set("text", text.trim());
    if (hasAudio && audioBlob) {
      const ext = audioBlob.type.includes("mp4") ? "m4a" : "webm";
      fd.set(
        "audio",
        new File([audioBlob], `answer.${ext}`, { type: audioBlob.type }),
      );
    }
    if (photo) fd.set("photo", photo);

    startTransition(async () => {
      await submitStudioAnswer(fd);
      setText("");
      setAudioBlob(null);
      setAudioUrl(null);
      setPhoto(null);
      setMode("write");
      router.refresh();
    });
  }

  return (
    <div className="composer">
      {mode === "write" ? (
        <textarea
          className="chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          rows={3}
        />
      ) : (
        <div className="recorder">
          {!recording ? (
            <button
              type="button"
              className="record-btn"
              onClick={startRecording}
            >
              ● 録音をはじめる
            </button>
          ) : (
            <button
              type="button"
              className="record-btn recording"
              onClick={stopRecording}
            >
              ■ 録音をとめる
            </button>
          )}
          {audioUrl && (
            <div className="playback">
              <audio controls src={audioUrl} />
              <p className="muted">
                話した内容は、送ったあとに文字にしてお見せします。
              </p>
            </div>
          )}
        </div>
      )}

      {photo && (
        <p className="photo-attached muted">📷 {photo.name} を添付しました</p>
      )}
      {error && <p className="form-error">{error}</p>}

      <div className="composer-bar">
        <div className="composer-tools">
          <button
            type="button"
            className="tool-btn"
            onClick={() => setMode(mode === "write" ? "speak" : "write")}
          >
            {mode === "write" ? "🎙 話す" : "📝 書く"}
          </button>
          <label className="tool-btn photo-chip">
            📷
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <button
          type="button"
          className="send-btn"
          onClick={submit}
          disabled={pending}
        >
          {pending ? "書き加えています…" : "本に書き加える"}
        </button>
      </div>
    </div>
  );
}
