import { C } from "../../theme/tokens";
import { Chip } from "../atoms";
import { LoadingSpinner } from "../ui/LoadingSpinner";

export type LiveState = "idle" | "starting" | "recording" | "stopping" | "complete";

export function LiveCallPanel({
  state,
  level,
  error,
  disabled,
  onStart,
  onStop,
}: {
  state: LiveState;
  level: number;
  disabled?: boolean;
  error?: string | null;
  onStart: () => void;
  onStop: () => void;
}) {
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
          📡
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.textDark }}>Live demo call</div>
          <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>
            Session ended · Triage and risk scoring running on full transcript
          </div>
        </div>
        <Chip color={C.green} bg={C.greenPale}>
          ✓ Ended
        </Chip>
      </div>
    );
  }

  if (state === "recording" || state === "starting" || state === "stopping") {
    const busy = state === "starting" || state === "stopping";
    return (
      <div className="card" style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
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
            {busy ? <LoadingSpinner size={26} /> : <span className="pulsing" style={{ fontSize: 18 }}>🎙</span>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.textDark }}>Live demo call</div>
            <div className="pulsing" style={{ fontSize: 11, color: C.teal, marginTop: 2 }}>
              {state === "starting"
                ? "Starting microphone…"
                : state === "stopping"
                  ? "Ending session…"
                  : "Listening — transcription runs every ~15s or on a natural pause"}
            </div>
          </div>
          <Chip color={C.teal} bg={C.tealPale}>
            <span className="pulsing">● Live</span>
          </Chip>
        </div>
        <div style={{ height: 6, background: C.border, borderRadius: 4, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${Math.round(level * 100)}%`,
              background: C.teal,
              borderRadius: 4,
              transition: "width 0.08s linear",
            }}
          />
        </div>
        <button
          type="button"
          className="app-btn"
          style={{ background: C.coral, color: "#fff", alignSelf: "flex-start" }}
          disabled={busy}
          onClick={onStop}
        >
          ■ End live call
        </button>
        {error && (
          <div style={{ fontSize: 11, color: C.coral }}>{error}</div>
        )}
      </div>
    );
  }

  return (
    <div
      className="card"
      style={{
        padding: 22,
        textAlign: "center",
        border: `2px dashed ${disabled ? C.border : C.tealBright}`,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 10 }}>📡</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.textDark, marginBottom: 4 }}>Live Demo Call</div>
      <div style={{ fontSize: 12, color: C.textLight, marginBottom: 16, lineHeight: 1.5 }}>
        Simulate a hotline call with your microphone. Transcript and form fields update every ~15 seconds or when speech pauses.
      </div>
      {error && (
        <div style={{ fontSize: 11, color: C.coral, marginBottom: 10 }}>{error}</div>
      )}
      <button
        type="button"
        className="app-btn"
        style={{ background: C.navy, color: "#fff" }}
        disabled={disabled}
        onClick={onStart}
      >
        ● Start live demo call
      </button>
    </div>
  );
}
