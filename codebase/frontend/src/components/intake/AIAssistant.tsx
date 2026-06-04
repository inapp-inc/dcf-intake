import { RefObject } from "react";
import { C } from "../../theme/tokens";
import type { AssistantMessage } from "../../api/types";

const MSG_STYLE: Record<string, { bg: string; bdr: string; ico: string; clr: string; lbl: string }> = {
  success: { bg: C.greenPale, bdr: `${C.green}33`, ico: "✓", clr: C.green, lbl: "Complete" },
  warning: { bg: C.amberPale, bdr: `${C.amber}33`, ico: "!", clr: C.amber, lbl: "Action Needed" },
  critical: { bg: C.coralPale, bdr: `${C.coral}33`, ico: "⚠", clr: C.coral, lbl: "Alert" },
  info: { bg: C.tealPale, bdr: `${C.teal}33`, ico: "i", clr: C.teal, lbl: "Update" },
  user: { bg: C.navy, bdr: "transparent", ico: "›", clr: "#fff", lbl: "" },
};

export function AIAssistant({
  messages,
  input,
  setInput,
  onSend,
  msgRef,
  onJump,
  monitoring = false,
}: {
  messages: AssistantMessage[];
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  msgRef: RefObject<HTMLDivElement | null>;
  onJump?: (fieldId: string) => void;
  monitoring?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#FFFDF8" }}>
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, background: C.white, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${C.teal}, ${C.navy})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
            }}
          >
            🤖
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.textDark }}>AIT Assistant</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: monitoring ? C.green : C.textLight,
                  display: "inline-block",
                }}
              />
              <span style={{ fontSize: 10, color: monitoring ? C.green : C.textLight, fontWeight: 600 }}>
                {monitoring ? "Active · Monitoring intake" : "Standby"}
              </span>
            </div>
          </div>
        </div>
        <p style={{ fontSize: 11, color: C.textLight }}>
          I'll flag missing fields, surface risks, and answer your questions.
        </p>
      </div>

      <div
        ref={msgRef}
        style={{ flex: 1, overflow: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 9 }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: "center", paddingTop: 40, color: C.textLight, fontSize: 12 }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>🎙</div>
            Upload an audio file to begin. I'll analyze the call and guide you through the intake form, flagging
            anything that needs attention.
          </div>
        )}
        {messages.map((m) => {
          const isUser = m.type === "user";
          const t = MSG_STYLE[m.type] ?? MSG_STYLE.info;
          return (
            <div
              key={m.id}
              className="slide-r"
              style={{
                background: t.bg,
                border: `1px solid ${t.bdr}`,
                borderRadius: isUser ? "12px 12px 4px 12px" : "4px 12px 12px 12px",
                padding: "9px 11px",
                alignSelf: isUser ? "flex-end" : "flex-start",
                maxWidth: "92%",
              }}
            >
              {!isUser && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                  <span
                    style={{
                      width: 15,
                      height: 15,
                      borderRadius: "50%",
                      background: t.clr,
                      color: "#fff",
                      fontSize: 8,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {t.ico}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: t.clr,
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                    }}
                  >
                    {t.lbl}
                  </span>
                </div>
              )}
              <p style={{ fontSize: 12, lineHeight: 1.65, color: isUser ? "#fff" : C.textDark }}>{m.message}</p>
              {m.fieldJump && onJump && (
                <button
                  type="button"
                  className="dcf-btn"
                  style={{
                    marginTop: 7,
                    fontSize: 10,
                    padding: "3px 9px",
                    background: "rgba(0,0,0,0.05)",
                    color: t.clr,
                    border: `1px solid ${t.clr}33`,
                  }}
                  onClick={() => onJump(m.fieldJump!)}
                >
                  ↗ Jump to field
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ padding: "11px 14px", borderTop: `1px solid ${C.border}`, background: C.white, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 7 }}>
          <input
            className="dcf-input"
            style={{ flex: 1, fontSize: 12 }}
            placeholder="Ask me anything about this case…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSend()}
          />
          <button type="button" className="dcf-btn" style={{ background: C.teal, color: "#fff", padding: "7px 13px" }} onClick={onSend}>
            ↑
          </button>
        </div>
        <p style={{ fontSize: 10, color: C.textLight, marginTop: 5 }}>
          Press Enter to send · All conversations are logged for audit
        </p>
      </div>
    </div>
  );
}
