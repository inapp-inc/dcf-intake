import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../api/client";
import { C } from "../../theme/tokens";
import { formatCaseName, formatCaseNumber, formatStatus } from "../../utils/format";
import type { CaseSearchResult, UserRole } from "../../api/types";

export function CaseSearchBar({
  role,
  onOpenCase,
}: {
  role: UserRole;
  onOpenCase: (caseId: string, status: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CaseSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [adminPreview, setAdminPreview] = useState<CaseSearchResult | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setAdminPreview(null);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    const t = window.setTimeout(() => {
      setLoading(true);
      api
        .searchCases(q)
        .then((r) => {
          setResults(r.items);
          setOpen(true);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 280);

    return () => window.clearTimeout(t);
  }, [query]);

  const handleSelect = useCallback(
    (item: CaseSearchResult) => {
      if (role === "admin") {
        setAdminPreview(item);
        setOpen(false);
        return;
      }
      setQuery("");
      setOpen(false);
      onOpenCase(item.caseId, item.status);
    },
    [onOpenCase, role],
  );

  return (
    <div ref={wrapRef} style={{ position: "relative", width: 280, flexShrink: 0 }}>
      <input
        type="search"
        className="app-input"
        placeholder="Search case # or child name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        aria-label="Search cases"
        style={{
          width: "100%",
          fontSize: 12,
          padding: "6px 10px",
          borderRadius: 8,
          border: `1px solid ${C.border}`,
          background: C.bg,
        }}
      />
      {loading && (
        <span style={{ position: "absolute", right: 10, top: 8, fontSize: 10, color: C.textLight }}>
          …
        </span>
      )}

      {open && results.length > 0 && (
        <div
          className="card"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 50,
            maxHeight: 280,
            overflowY: "auto",
            padding: 4,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          {results.map((item) => (
            <button
              key={item.caseId}
              type="button"
              onClick={() => handleSelect(item)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                border: "none",
                background: "transparent",
                padding: "8px 10px",
                borderRadius: 6,
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = C.bg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: C.textDark }}>
                {formatCaseName(item.childDisplay)}
              </div>
              <div style={{ fontSize: 11, color: C.textLight }}>
                {formatCaseNumber(item.externalId)} · {formatStatus(item.status)}
                {item.relatedCount != null && item.relatedCount > 0
                  ? ` · ${item.relatedCount} related`
                  : ""}
              </div>
            </button>
          ))}
        </div>
      )}

      {open && !loading && query.trim().length >= 2 && results.length === 0 && (
        <div
          className="card"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 50,
            padding: "10px 12px",
            fontSize: 12,
            color: C.textLight,
          }}
        >
          No cases found
        </div>
      )}

      {adminPreview && (
        <div
          className="card"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 50,
            padding: "12px 14px",
          }}
        >
          <div style={{ fontSize: 11, color: C.textLight, fontWeight: 600, marginBottom: 6 }}>
            Case metadata (admin — no narrative access)
          </div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{formatCaseName(adminPreview.childDisplay)}</div>
          <div style={{ fontSize: 11, color: C.textMid, marginTop: 4 }}>
            {formatCaseNumber(adminPreview.externalId)} · {formatStatus(adminPreview.status)}
          </div>
          {adminPreview.relatedCount != null && adminPreview.relatedCount > 0 && (
            <div style={{ fontSize: 11, color: C.amber, marginTop: 6 }}>
              {adminPreview.relatedCount} related report(s) on file
            </div>
          )}
          <button
            type="button"
            className="app-btn ghost-btn"
            style={{ marginTop: 8, fontSize: 11 }}
            onClick={() => setAdminPreview(null)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
