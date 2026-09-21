import { useEffect, useRef } from "react";
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
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!live || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [segments.length, live, segments]);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: segments.length ? 12 : 0 }}>
        {live ? (
          <Chip color={C.teal} bg={C.tealPale}>
            <span className="pulsing">Live</span>
          </Chip>
        ) : segments.length > 0 ? (
          <Chip color={C.teal} bg={C.tealPale}>
            AI-generated
          </Chip>
        ) : null}
      </div>
      {segments.length === 0 ? (
        <p style={{ fontSize: 12, color: C.textLight, margin: 0, lineHeight: 1.5 }}>
          {live
            ? "Live transcription — lines appear every 5s initially, then every 15s…"
            : "No transcript yet. Upload a recording or start a live demo call."}
        </p>
      ) : (
        <div
          ref={scrollRef}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            maxHeight: 220,
            overflowY: "auto",
            paddingTop: 4,
            paddingBottom: 4,
            scrollPaddingTop: 8,
          }}
        >
          {segments.map((line, i) => {
            const isLive = line.speaker === "L";
            const badgeLabel = isLive ? "Live" : line.speaker;
            return (
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
                    minWidth: isLive ? 36 : 22,
                    height: 22,
                    borderRadius: isLive ? 6 : "50%",
                    padding: isLive ? "0 6px" : 0,
                    background: isLive ? C.amberPale : line.speaker === "S" ? C.navy : C.tealPale,
                    color: isLive ? C.amber : line.speaker === "S" ? "#fff" : C.teal,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: isLive ? 8 : 9,
                    fontWeight: 700,
                  }}
                >
                  {badgeLabel}
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
            );
          })}
        </div>
      )}
    </>
  );
}
