import { useRef, useState } from "react";
import { C } from "../../theme/tokens";
import { Chip } from "../atoms";
import { LoadingSpinner } from "../ui/LoadingSpinner";

export type TxState = "idle" | "uploading" | "processing" | "complete";

export function AudioUpload({
  state,
  file,
  onUpload,
}: {
  state: TxState;
  file: File | null;
  onUpload: (f: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  if (state === "complete") {
    return (
      <div className="card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: C.greenPale,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
          }}
        >
          🎵
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.textDark }}>{file?.name ?? "Recording"}</div>
          <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>
            Transcription complete · Speaker diarization: Screener & Caller
          </div>
        </div>
        <Chip color={C.green} bg={C.greenPale}>
          ✓ Transcribed
        </Chip>
      </div>
    );
  }

  if (state === "uploading" || state === "processing") {
    return (
      <div className="card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: C.tealPale,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <LoadingSpinner size={26} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.textDark }}>{file?.name ?? "Processing audio…"}</div>
          <div className="pulsing" style={{ fontSize: 11, color: C.teal, marginTop: 2 }}>
            {state === "uploading"
              ? "Uploading audio…"
              : "AI pipeline running (Hugging Face ASR + LLM) — may take several minutes…"}
          </div>
          <div style={{ marginTop: 8, height: 3, background: C.border, borderRadius: 3, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: state === "uploading" ? "30%" : "72%",
                background: C.teal,
                borderRadius: 3,
                transition: "width 1.2s ease",
                animation: state === "processing" ? "shimmer 2s ease-in-out infinite" : undefined,
              }}
            />
          </div>
        </div>
        <Chip color={C.teal} bg={C.tealPale}>
          Processing…
        </Chip>
      </div>
    );
  }

  return (
    <div
      className="card"
      role="button"
      tabIndex={0}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files[0];
        if (f) onUpload(f);
      }}
      onClick={() => ref.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && ref.current?.click()}
      style={{
        padding: 28,
        textAlign: "center",
        cursor: "pointer",
        border: `2px dashed ${drag ? C.tealBright : C.border}`,
        background: drag ? C.tealPale : C.white,
        transition: "all 0.2s",
      }}
    >
      <input
        ref={ref}
        type="file"
        accept=".mp3,.wav,.m4a,.ogg"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
        }}
      />
      <div style={{ fontSize: 32, marginBottom: 10 }}>🎙</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.textDark, marginBottom: 4 }}>Upload Call Recording</div>
      <div style={{ fontSize: 12, color: C.textLight, marginBottom: 16 }}>
        Drag & drop or click · MP3, WAV, M4A · End-to-end encrypted
      </div>
      <button
        type="button"
        className="app-btn"
        style={{ background: C.teal, color: "#fff" }}
        onClick={(e) => {
          e.stopPropagation();
          ref.current?.click();
        }}
      >
        ⬆ Select Audio File
      </button>
    </div>
  );
}
