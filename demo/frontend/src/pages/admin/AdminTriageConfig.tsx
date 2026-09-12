import { useMemo, useState } from "react";
import { api } from "../../api/client";
import { C } from "../../theme/tokens";
import { PageShell } from "../../components/ui/PageShell";
import { QueryState } from "../../components/ui/QueryState";
import { useApiQuery } from "../../hooks/useApiQuery";
import type { TriageConfig } from "../../api/types";

type TriageIndicator = TriageConfig["triageIndicators"][number];

function promptPreview(config: TriageConfig): string {
  return config.triageIndicators
    .map((ind) => `- indicatorId "${ind.id}": ${ind.label} (severity: ${ind.severity})`)
    .join("\n");
}

function newIndicator(): TriageIndicator {
  return { id: `indicator_${Date.now()}`, label: "", severity: "high" };
}

export function AdminTriageConfig() {
  const { data, loading, error, reload } = useApiQuery(() => api.getTriageConfig(), []);
  const [draft, setDraft] = useState<TriageConfig | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const config = draft ?? data?.config ?? null;
  const defaults = data?.defaults;
  const preview = useMemo(() => (config ? promptPreview(config) : ""), [config]);

  const save = async () => {
    if (!config) return;
    if (!config.triageIndicators.length) {
      setMsg("Add at least one LLM triage indicator before saving.");
      return;
    }
    setSaving(true);
    try {
      await api.saveTriageConfig(config);
      setMsg(
        "Configuration saved. New indicators and keywords apply on the next intake pipeline run (transcript triage prompt reloads from database).",
      );
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

  return (
    <PageShell>
      {msg && (
        <div className="card" style={{ padding: 12, background: C.greenPale, color: C.green, fontSize: 13 }}>
          {msg}
        </div>
      )}
      <QueryState
        loading={loading}
        loadingMessage="Loading triage configuration…"
        empty={
          !loading && !config ? (
            <div className="card" style={{ padding: 16 }}>
              <p style={{ color: C.coral, fontSize: 13, marginBottom: 10 }}>
                {error ?? "Could not load triage configuration."}
              </p>
              <button type="button" className="app-btn ghost-btn" onClick={() => void reload()}>
                Retry
              </button>
            </div>
          ) : undefined
        }
      >
        {config && (
          <>
            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title">Escalation threshold</div>
              <p style={{ fontSize: 12, color: C.textLight, marginBottom: 10 }}>
                Number of confirmed emergency indicators before escalation messaging appears on intake.
              </p>
              <input
                className="app-input"
                type="number"
                min={1}
                max={10}
                value={config.escalationThreshold}
                onChange={(e) =>
                  setDraft({
                    ...config,
                    escalationThreshold: Math.max(1, parseInt(e.target.value, 10) || 1),
                  })
                }
                style={{ maxWidth: 120 }}
              />
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title">Transcript keyword patterns</div>
              <p style={{ fontSize: 11, color: C.textLight, marginBottom: 12 }}>
                Regex patterns scanned during transcription and triage. Label is shown when matched.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {config.keywordPatterns.map((kw, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "120px 1fr 60px auto", gap: 8, alignItems: "center" }}>
                    <input
                      className="app-input"
                      value={kw.label}
                      placeholder="Label"
                      onChange={(e) => {
                        const next = [...config.keywordPatterns];
                        next[i] = { ...next[i], label: e.target.value };
                        setDraft({ ...config, keywordPatterns: next });
                      }}
                    />
                    <input
                      className="app-input"
                      value={kw.pattern}
                      placeholder="Regex pattern"
                      onChange={(e) => {
                        const next = [...config.keywordPatterns];
                        next[i] = { ...next[i], pattern: e.target.value };
                        setDraft({ ...config, keywordPatterns: next });
                      }}
                    />
                    <input
                      className="app-input"
                      value={kw.flags ?? "i"}
                      placeholder="flags"
                      onChange={(e) => {
                        const next = [...config.keywordPatterns];
                        next[i] = { ...next[i], flags: e.target.value };
                        setDraft({ ...config, keywordPatterns: next });
                      }}
                    />
                    <button
                      type="button"
                      className="app-btn ghost-btn"
                      style={{ fontSize: 11, padding: "5px 8px", color: C.coral }}
                      title="Remove pattern"
                      onClick={() =>
                        setDraft({
                          ...config,
                          keywordPatterns: config.keywordPatterns.filter((_, j) => j !== i),
                        })
                      }
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="app-btn ghost-btn"
                style={{ marginTop: 10 }}
                onClick={() =>
                  setDraft({
                    ...config,
                    keywordPatterns: [...config.keywordPatterns, { label: "new", pattern: "", flags: "i" }],
                  })
                }
              >
                + Add keyword pattern
              </button>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title">LLM triage indicators</div>
              <p style={{ fontSize: 11, color: C.textLight, marginBottom: 12 }}>
                Indicators evaluated by the AI during the triage stage. Each row is injected into the transcript triage
                prompt on the next pipeline run. Use a stable id (snake_case); label is what staff see on flags.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {config.triageIndicators.map((ind, i) => (
                  <div
                    key={`${ind.id}-${i}`}
                    style={{ display: "grid", gridTemplateColumns: "140px 1fr 100px auto", gap: 8, alignItems: "center" }}
                  >
                    <input
                      className="app-input"
                      value={ind.id}
                      placeholder="id"
                      onChange={(e) => {
                        const next = [...config.triageIndicators];
                        next[i] = { ...next[i], id: e.target.value };
                        setDraft({ ...config, triageIndicators: next });
                      }}
                    />
                    <input
                      className="app-input"
                      value={ind.label}
                      placeholder="Label shown to staff"
                      onChange={(e) => {
                        const next = [...config.triageIndicators];
                        next[i] = { ...next[i], label: e.target.value };
                        setDraft({ ...config, triageIndicators: next });
                      }}
                    />
                    <select
                      className="app-input"
                      value={ind.severity}
                      onChange={(e) => {
                        const next = [...config.triageIndicators];
                        next[i] = { ...next[i], severity: e.target.value as "high" | "critical" };
                        setDraft({ ...config, triageIndicators: next });
                      }}
                    >
                      <option value="high">high</option>
                      <option value="critical">critical</option>
                    </select>
                    <button
                      type="button"
                      className="app-btn ghost-btn"
                      style={{ fontSize: 11, padding: "5px 8px", color: C.coral }}
                      title="Remove indicator"
                      onClick={() =>
                        setDraft({
                          ...config,
                          triageIndicators: config.triageIndicators.filter((_, j) => j !== i),
                        })
                      }
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="app-btn ghost-btn"
                style={{ marginTop: 10 }}
                onClick={() =>
                  setDraft({
                    ...config,
                    triageIndicators: [...config.triageIndicators, newIndicator()],
                  })
                }
              >
                + Add LLM indicator
              </button>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title">Transcript triage prompt preview</div>
              <p style={{ fontSize: 11, color: C.textLight, marginBottom: 8 }}>
                This block is sent to the LLM when evaluating a call transcript (after Save).
              </p>
              <pre
                style={{
                  fontSize: 11,
                  background: C.bg,
                  padding: 12,
                  borderRadius: 8,
                  overflow: "auto",
                  margin: 0,
                  color: C.textDark,
                  whiteSpace: "pre-wrap",
                }}
              >
                {preview || "(no indicators configured)"}
              </pre>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className="app-btn"
                style={{ background: C.teal, color: "#fff" }}
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? "Saving…" : "Save configuration"}
              </button>
              <button type="button" className="app-btn ghost-btn" onClick={resetDefaults}>
                Reset to defaults
              </button>
            </div>
          </>
        )}
      </QueryState>
    </PageShell>
  );
}
