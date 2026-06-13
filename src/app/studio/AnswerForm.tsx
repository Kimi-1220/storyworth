"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitStudioAnswer } from "@/app/studio/actions";

type Mode = "write" | "speak";

// 「書く」と「話す」を対等に並べる取材フォーム。
// 途中で切り替えてもOK。写真も添付できる。→ docs/writing-studio.md
export default function AnswerForm({
  promptId,
  placeholder,
}: {
  promptId: string;
  placeholder: string;
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
    const fd = new FormData();
    fd.set("promptId", promptId);
    if (hasText) fd.set("text", text.trim());
    if (hasAudio && audioBlob) {
      const ext = audioBlob.type.includes("mp4") ? "m4a" : "webm";
      fd.set("audio", new File([audioBlob], `answer.${ext}`, { type: audioBlob.type }));
    }
    if (photo) fd.set("photo", photo);

    startTransition(async () => {
      await submitStudioAnswer(fd);
      setText("");
      setAudioBlob(null);
      setAudioUrl(null);
      setPhoto(null);
      router.refresh();
    });
  }

  return (
    <div className="answer-form">
      <div className="mode-tabs">
        <button
          type="button"
          className={mode === "write" ? "tab active" : "tab"}
          onClick={() => setMode("write")}
        >
          📝 書いて答える
        </button>
        <button
          type="button"
          className={mode === "speak" ? "tab active" : "tab"}
          onClick={() => setMode("speak")}
        >
          🎙 話して答える
        </button>
      </div>
      <p className="muted switch-hint">途中で切り替えても大丈夫です。</p>

      {mode === "write" ? (
        <textarea
          className="manuscript-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <div className="recorder">
          {!recording ? (
            <button type="button" className="record-btn" onClick={startRecording}>
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

      <label className="photo-field muted">
        📷 写真を添える（任意）
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
        />
      </label>

      {error && <p className="form-error">{error}</p>}

      <button
        type="button"
        className="submit-btn"
        onClick={submit}
        disabled={pending}
      >
        {pending ? "本に書き加えています…" : "本に書き加える"}
      </button>
    </div>
  );
}
