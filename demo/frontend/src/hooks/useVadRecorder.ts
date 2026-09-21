import { useCallback, useEffect, useRef, useState } from "react";

/** First automatic upload after recording starts (no pause required). */
const FIRST_FLUSH_MS = 5_000;
/** Maximum gap between uploads while recording continues. */
const PERIODIC_FLUSH_MS = 15_000;
const MIN_CHUNK_MS = 600;

export type VadRecorderState = "idle" | "recording" | "error";

export function useVadRecorder({
  enabled,
  onChunk,
}: {
  enabled: boolean;
  onChunk: (blob: Blob, meta: { chunkIndex: number; durationMs: number }) => Promise<void>;
}) {
  const [state, setState] = useState<VadRecorderState>("idle");
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunkBlobsRef = useRef<Blob[]>([]);
  const chunkIndexRef = useRef(0);
  const segmentStartRef = useRef<number | null>(null);
  const lastFlushRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const enabledRef = useRef(enabled);

  enabledRef.current = enabled;

  const cleanup = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    recorderRef.current?.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    chunkBlobsRef.current = [];
    segmentStartRef.current = null;
    lastFlushRef.current = 0;
    setLevel(0);
  }, []);

  const flushChunk = useCallback(async () => {
    const blobs = chunkBlobsRef.current;
    chunkBlobsRef.current = [];
    const segmentStart = segmentStartRef.current;
    const now = performance.now();
    segmentStartRef.current = now;
    lastFlushRef.current = now;

    if (!blobs.length) return;
    const combined = new Blob(blobs, { type: blobs[0]?.type || "audio/webm" });
    if (combined.size < 256) return;

    const durationMs = segmentStart
      ? Math.max(MIN_CHUNK_MS, Math.round(now - segmentStart))
      : FIRST_FLUSH_MS;
    const index = chunkIndexRef.current;
    chunkIndexRef.current += 1;
    await onChunk(combined, { chunkIndex: index, durationMs });
  }, [onChunk]);

  const tick = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser || !enabledRef.current) return;

    const buf = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i]! - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / buf.length);
    setLevel(Math.min(1, rms * 8));

    const now = performance.now();
    const segmentStart = segmentStartRef.current ?? now;
    const elapsedSegment = now - segmentStart;
    const elapsedSinceFlush = now - lastFlushRef.current;

    if (chunkBlobsRef.current.length > 0) {
      const firstScheduledFlush =
        chunkIndexRef.current === 0 && elapsedSegment >= FIRST_FLUSH_MS;
      const periodicFlush = elapsedSinceFlush >= PERIODIC_FLUSH_MS;
      if (firstScheduledFlush || periodicFlush) {
        void flushChunk();
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [flushChunk]);

  const start = useCallback(async () => {
    setError(null);
    chunkIndexRef.current = 0;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunkBlobsRef.current.push(e.data);
      };
      recorder.start(100);
      recorderRef.current = recorder;

      const now = performance.now();
      lastFlushRef.current = now;
      segmentStartRef.current = now;

      setState("recording");
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      cleanup();
      setState("error");
      setError(e instanceof Error ? e.message : "Microphone access denied");
    }
  }, [cleanup, tick]);

  const stop = useCallback(async () => {
    if (chunkBlobsRef.current.length) {
      await flushChunk();
    }
    cleanup();
    setState("idle");
  }, [cleanup, flushChunk]);

  useEffect(() => {
    if (!enabled && state === "recording") {
      void stop();
    }
  }, [enabled, state, stop]);

  useEffect(() => () => cleanup(), [cleanup]);

  return { state, level, error, start, stop };
};
