import { APP_TITLE, APP_TITLE_SHORT, INAPP_DEMO_LABEL, INAPP_LOGO_SRC } from "../../constants/branding";
import { C } from "../../theme/tokens";

export function DemoBanner({ compact }: { compact?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 10 : 14,
        minWidth: 0,
        flex: compact ? undefined : 1,
      }}
    >
      <img
        src={INAPP_LOGO_SRC}
        alt="InApp"
        style={{
          height: compact ? 28 : 34,
          width: "auto",
          objectFit: "contain",
          flexShrink: 0,
        }}
      />
      <div style={{ minWidth: 0, borderLeft: `1px solid ${C.border}`, paddingLeft: compact ? 10 : 14 }}>
        <div
          style={{
            fontSize: compact ? 10 : 11,
            fontWeight: 700,
            color: C.inappRed,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            lineHeight: 1.2,
          }}
        >
          {INAPP_DEMO_LABEL}
        </div>
        <div
          style={
            compact
              ? {
                  fontSize: 10,
                  fontWeight: 600,
                  color: C.textLight,
                  lineHeight: 1.25,
                  marginTop: 4,
                }
              : {
                  fontSize: 13,
                  fontWeight: 700,
                  color: C.textDark,
                  lineHeight: 1.25,
                  fontFamily: "'Fraunces', Georgia, serif",
                }
          }
          title={APP_TITLE}
        >
          {compact ? APP_TITLE_SHORT : APP_TITLE}
        </div>
      </div>
    </div>
  );
}
