import { useState } from "react";
import { api } from "../../api/client";
import { C } from "../../theme/tokens";
import { PageShell } from "../../components/ui/PageShell";
import { QueryState } from "../../components/ui/QueryState";
import { useApiQuery } from "../../hooks/useApiQuery";
import type { RiskFramework } from "../../api/types";

function numField(
  label: string,
  value: number,
  onChange: (n: number) => void,
  min = 0,
  max = 20,
) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.textMid }}>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={0.5}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        style={{ display: "block", width: "100%", marginTop: 4, padding: "8px 10px", fontSize: 13 }}
      />
    </label>
  );
}

export function AdminRiskFramework() {
  const { data, loading, error, reload } = useApiQuery(() => api.getRiskFramework(), []);
  const [draft, setDraft] = useState<RiskFramework | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const config = draft ?? data?.config ?? null;
  const defaults = data?.defaults;

  const patch = (partial: Partial<RiskFramework>) => {
    if (!config) return;
    setDraft({ ...config, ...partial });
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.saveRiskFramework(config);
      setMsg("Risk framework saved. New weights apply on the next risk scoring run or recompute.");
      setDraft(null);
      await reload();
    } catch {
      setMsg("Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = () => {
    if (defaults) {
      setDraft({ ...defaults });
      setMsg("Loaded defaults — click Save to apply.");
    }
  };

  const kwLabels = config ? Object.keys(config.keywordPoints) : [];

  return (
    <PageShell>
      {msg && (
        <div className="card" style={{ padding: 12, background: C.greenPale, color: C.green, fontSize: 13 }}>
          {msg}
        </div>
      )}
      <QueryState
        loading={loading}
        loadingMessage="Loading risk framework…"
        empty={
          !loading && !config ? (
            <div className="card" style={{ padding: 16 }}>
              <p style={{ color: C.coral, fontSize: 13, marginBottom: 10 }}>
                {error ?? "Could not load risk framework."}
              </p>
              <button type="button" className="dcf-btn ghost-btn" onClick={() => void reload()}>
                Retry
              </button>
            </div>
          ) : undefined
        }
      >
        {config && (
          <div className="card" style={{ padding: 20, maxWidth: 560 }}>
            <h2 style={{ fontSize: 16, margin: "0 0 8px", color: C.textDark }}>Statistical risk scoring</h2>
            <p style={{ fontSize: 12, color: C.textLight, marginBottom: 20, lineHeight: 1.5 }}>
              Additive point weights — not LLM or probability. Keyword labels must match triage keyword patterns.
              Version: <strong>{config.version}</strong>
            </p>

            {numField("Baseline points", config.baselinePoints, (n) => patch({ baselinePoints: n }))}
            {numField("Emergency escalation bonus", config.emergencyPoints, (n) => patch({ emergencyPoints: n }))}
            {numField("Default keyword points (unknown label)", config.defaultKeywordPoints, (n) =>
              patch({ defaultKeywordPoints: n }),
            )}
            {numField(
              "Pending triage multiplier (0–1)",
              config.pendingTriageMultiplier,
              (n) => patch({ pendingTriageMultiplier: Math.min(1, Math.max(0, n)) }),
              0,
              1,
            )}

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.textMid, marginBottom: 8 }}>Triage severity points</div>
              {numField("Critical (confirmed)", config.triageSeverityPoints.critical, (n) =>
                patch({ triageSeverityPoints: { ...config.triageSeverityPoints, critical: n } }),
              )}
              {numField("High (confirmed)", config.triageSeverityPoints.high, (n) =>
                patch({ triageSeverityPoints: { ...config.triageSeverityPoints, high: n } }),
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.textMid, marginBottom: 8 }}>
                Keyword points (per label)
              </div>
              {kwLabels.map((label) => (
                <label key={label} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ width: 100, fontSize: 12, color: C.textMid }}>{label}</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={config.keywordPoints[label] ?? 0}
                    onChange={(e) =>
                      patch({
                        keywordPoints: {
                          ...config.keywordPoints,
                          [label]: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    style={{ flex: 1, padding: "6px 8px", fontSize: 13 }}
                  />
                </label>
              ))}
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.textMid, marginBottom: 8 }}>Score bands (label)</div>
              {config.bands.map((band, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={band.min}
                    onChange={(e) => {
                      const bands = [...config.bands];
                      bands[i] = { ...band, min: parseInt(e.target.value, 10) || 0 };
                      patch({ bands });
                    }}
                    style={{ width: 64, padding: "6px 8px", fontSize: 13 }}
                  />
                  <span style={{ alignSelf: "center", fontSize: 12, color: C.textLight }}>≥ →</span>
                  <input
                    type="text"
                    value={band.label}
                    onChange={(e) => {
                      const bands = [...config.bands];
                      bands[i] = { ...band, label: e.target.value };
                      patch({ bands });
                    }}
                    style={{ flex: 1, padding: "6px 8px", fontSize: 13 }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" className="dcf-btn primary-btn" disabled={saving} onClick={() => void save()}>
                {saving ? "Saving…" : "Save framework"}
              </button>
              <button type="button" className="dcf-btn ghost-btn" onClick={resetDefaults}>
                Reset to defaults
              </button>
            </div>
          </div>
        )}
      </QueryState>
    </PageShell>
  );
}
