import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { C } from "../../theme/tokens";
import type { CaseAudioArtifact } from "../../api/types";
import { stitchAudioBlobs } from "../../utils/stitchAudio";
import { LoadingSpinner } from "../ui/LoadingSpinner";

export function CaseAudioReview({
  caseId,
  refreshKey,
}: {
  caseId: string;
  /** Bump to reload artifacts (e.g. live chunk count or transcript length). */
  refreshKey?: string | number;
}) {
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
  }, [caseId, refreshKey]);

  const playbackGroups = useMemo(() => groupArtifactsForPlayback(artifacts), [artifacts]);

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
      {playbackGroups.map((group) => (
        <StitchedAudioPlayer
          key={group.key}
          caseId={caseId}
          artifacts={group.artifacts}
          label={group.label}
          refreshKey={refreshKey}
        />
      ))}
    </div>
  );
}

type PlaybackGroup = {
  key: string;
  label: string;
  artifacts: CaseAudioArtifact[];
};

function groupArtifactsForPlayback(artifacts: CaseAudioArtifact[]): PlaybackGroup[] {
  const live = artifacts
    .filter((a) => a.source === "live")
    .sort((a, b) => (a.chunkIndex ?? 0) - (b.chunkIndex ?? 0) || a.createdAt.localeCompare(b.createdAt));

  const uploads = artifacts.filter((a) => a.source === "upload");

  const groups: PlaybackGroup[] = [];
  const bySession = new Map<string, CaseAudioArtifact[]>();
  for (const item of live) {
    const sid = item.sessionId ?? "live";
    const list = bySession.get(sid) ?? [];
    list.push(item);
    bySession.set(sid, list);
  }

  for (const [sessionId, items] of bySession) {
    groups.push({
      key: `live-${sessionId}`,
      label: items.length > 1 ? "Full live call recording" : "Live call recording",
      artifacts: items,
    });
  }

  for (const item of uploads) {
    groups.push({
      key: `upload-${item.id}`,
      label: item.label || "Uploaded recording",
      artifacts: [item],
    });
  }

  return groups;
}

function StitchedAudioPlayer({
  caseId,
  artifacts,
  label,
  refreshKey,
}: {
  caseId: string;
  artifacts: CaseAudioArtifact[];
  label: string;
  refreshKey?: string | number;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const artifactKey = artifacts.map((a) => a.id).join(",");

  const pendingTranscription = artifacts.some((a) => !a.transcribed);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setSrc(null);
    setLoadError(null);

    void (async () => {
      try {
        const blobs = await Promise.all(
          artifacts.map((artifact) => api.fetchCaseAudioBlob(caseId, artifact.id)),
        );
        const stitched = await stitchAudioBlobs(blobs);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(stitched);
        setSrc(objectUrl);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Playback unavailable");
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [caseId, artifactKey, refreshKey]);

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
        {label}
        {artifacts.length > 1 ? (
          <span style={{ color: C.textLight, fontWeight: 500 }}> · {artifacts.length} segments stitched</span>
        ) : null}
        {pendingTranscription ? (
          <span style={{ color: C.amber, fontWeight: 500 }}> · transcription in progress</span>
        ) : null}
      </div>
      {loadError ? (
        <p style={{ fontSize: 11, color: C.coral, margin: 0 }}>{loadError}</p>
      ) : src ? (
        <audio controls preload="none" src={src} style={{ width: "100%", height: 32 }} />
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.textLight }}>
          <LoadingSpinner size={12} />
          Stitching segments for playback…
        </div>
      )}
    </div>
  );
}
