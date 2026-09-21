import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { C } from "../../theme/tokens";
import type { CaseAudioArtifact } from "../../api/types";
import { LoadingSpinner } from "../ui/LoadingSpinner";

export function CaseAudioReview({ caseId }: { caseId: string }) {
  const [artifacts, setArtifacts] = useState<CaseAudioArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void api
      .getCaseAudioArtifacts(caseId)
      .then((res) => {
        if (!cancelled) setArtifacts(res.artifacts);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load audio");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.textLight }}>
        <LoadingSpinner size={14} />
        Loading saved intake audio…
      </div>
    );
  }

  if (error) {
    return <p style={{ fontSize: 12, color: C.coral }}>{error}</p>;
  }

  if (artifacts.length === 0) {
    return (
      <p style={{ fontSize: 12, color: C.textLight }}>
        No saved intake audio for this case (live demo or upload may not have run).
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <p style={{ fontSize: 11, color: C.textLight, margin: 0 }}>
        Intake audio is retained until you approve, screen out, or request clarification.
      </p>
      {artifacts.map((a) => (
        <CaseAudioPlayer key={a.id} caseId={caseId} artifact={a} />
      ))}
    </div>
  );
}

function CaseAudioPlayer({ caseId, artifact }: { caseId: string; artifact: CaseAudioArtifact }) {
  const [src, setSrc] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    void api
      .fetchCaseAudioBlobUrl(caseId, artifact.id)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setSrc(url);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Playback unavailable");
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [caseId, artifact.id]);

  return (
    <div
      style={{
        padding: "8px 10px",
        borderRadius: 8,
        border: `1px solid ${C.border}`,
        background: C.bg,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: C.textMid, marginBottom: 6 }}>
        {artifact.label}
        {!artifact.transcribed ? (
          <span style={{ color: C.amber, fontWeight: 500 }}> · not transcribed</span>
        ) : null}
      </div>
      {loadError ? (
        <p style={{ fontSize: 11, color: C.coral, margin: 0 }}>{loadError}</p>
      ) : src ? (
        <audio controls preload="none" src={src} style={{ width: "100%", height: 32 }} />
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.textLight }}>
          <LoadingSpinner size={12} />
          Preparing playback…
        </div>
      )}
    </div>
  );
}
