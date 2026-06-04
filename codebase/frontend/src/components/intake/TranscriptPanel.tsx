import { C } from "../../theme/tokens";
import { Chip } from "../atoms";
import type { TranscriptSegment } from "../../api/types";

export function TranscriptPanel({
  segments,
  live = false,
}: {
  segments: TranscriptSegment[];
  live?: boolean;
}) {
  if (!segments.length && !live) return null;
  return (
    <div className="card fade-up" style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.textDark }}>📝 Call Transcript — Speaker Attributed</div>
        {live ? (
          <Chip color={C.teal} bg={C.tealPale}>
            <span className="pulsing">Live</span>
          </Chip>
        ) : (
          <Chip color={C.teal} bg={C.tealPale}>
            AI-generated
          </Chip>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto" }}>
        {segments.length === 0 && live && (
          <p style={{ fontSize: 12, color: C.teal }} className="pulsing">
            Transcribing call — speaker-attributed lines will appear here…
          </p>
        )}
        {segments.map((line, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              background: line.keywordFlag ? C.coralPale : "transparent",
              borderRadius: 8,
              padding: line.keywordFlag ? "8px 10px" : "2px 0",
              border: line.keywordFlag ? `1px solid ${C.coral}33` : "none",
            }}
          >
            <div
              style={{
                flexShrink: 0,
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: line.speaker === "S" ? C.navy : C.tealPale,
                color: line.speaker === "S" ? "#fff" : C.teal,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                fontWeight: 700,
              }}
            >
              {line.speaker}
            </div>
            <div style={{ flex: 1, fontSize: 12, lineHeight: 1.65, color: line.keywordFlag ? C.coral : C.textMid }}>
              {line.text}
              {line.keywordFlag && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: C.coral,
                    marginLeft: 8,
                    background: C.coralPale,
                    padding: "1px 7px",
                    borderRadius: 4,
                  }}
                >
                  ⚠ KEYWORD FLAGGED
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
