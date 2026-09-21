import { useCallback, useEffect, useRef, useState } from "react";

/** First automatic upload after recording starts (no pause required). */
const FIRST_FLUSH_MS = 5_000;
/** Maximum gap between uploads while recording continues. */
const PERIODIC_FLUSH_MS = 15_000;
const MIN_CHUNK_MS = 600;
const MIN_CHUNK_BYTES = 256;
const MIN_FORCE_CHUNK_BYTES = 32;

export type VadRecorderState = "idle" | "recording" | "error";

function pickMimeType(): string {
  return MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : "audio/webm";
}

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
  const rafRef = useRef<number | null>(null);
  const flushingRef = useRef(false);
  const stoppingRef = useRef(false);
  const stopPromiseRef = useRef<Promise<void> | null>(null);
  const enabledRef = useRef(enabled);
  const mimeRef = useRef(pickMimeType());

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
    flushingRef.current = false;
    setLevel(0);
  }, []);

  const attachRecorder = useCallback((stream: MediaStream) => {
    chunkBlobsRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: mimeRef.current });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunkBlobsRef.current.push(e.data);
    };
    recorder.start(250);
    recorderRef.current = recorder;
    segmentStartRef.current = performance.now();
  }, []);

  const stopRecorderAndCollect = useCallback((): Promise<Blob | null> => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      const blobs = chunkBlobsRef.current;
      chunkBlobsRef.current = [];
      if (!blobs.length) return Promise.resolve(null);
      return Promise.resolve(new Blob(blobs, { type: mimeRef.current }));
    }

    return new Promise((resolve) => {
      recorder.onstop = () => {
        const blobs = chunkBlobsRef.current;
        chunkBlobsRef.current = [];
        recorderRef.current = null;
        if (!blobs.length) {
          resolve(null);
          return;
        }
        resolve(new Blob(blobs, { type: mimeRef.current }));
      };
      try {
        recorder.stop();
      } catch {
        recorderRef.current = null;
        resolve(null);
      }
    });
  }, []);

  const flushChunk = useCallback(
    async (force = false) => {
      if (flushingRef.current) {
        if (force) {
          while (flushingRef.current) {
            await new Promise((r) => setTimeout(r, 50));
          }
        } else {
          return;
        }
      }

      const segmentStart = segmentStartRef.current ?? performance.now();
      const elapsed = performance.now() - segmentStart;
      const threshold = chunkIndexRef.current === 0 ? FIRST_FLUSH_MS : PERIODIC_FLUSH_MS;
      if (!force && elapsed < threshold - 50) return;

      flushingRef.current = true;
      try {
        const combined = await stopRecorderAndCollect();
        const minBytes = force ? MIN_FORCE_CHUNK_BYTES : MIN_CHUNK_BYTES;
        if (!combined || combined.size < minBytes) {
          if (enabledRef.current && !stoppingRef.current && streamRef.current) {
            attachRecorder(streamRef.current);
          }
          return;
        }

        const durationMs = Math.max(MIN_CHUNK_MS, Math.round(elapsed));
        const index = chunkIndexRef.current;
        chunkIndexRef.current += 1;

        if (enabledRef.current && !stoppingRef.current && streamRef.current) {
          attachRecorder(streamRef.current);
        }

        await onChunk(combined, { chunkIndex: index, durationMs });
      } finally {
        flushingRef.current = false;
      }
    },
    [attachRecorder, onChunk, stopRecorderAndCollect],
  );

  const tick = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser || !enabledRef.current || stoppingRef.current) return;

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
    const threshold = chunkIndexRef.current === 0 ? FIRST_FLUSH_MS : PERIODIC_FLUSH_MS;

    if (
      !flushingRef.current &&
      recorderRef.current?.state === "recording" &&
      elapsedSegment >= threshold
    ) {
      void flushChunk();
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [flushChunk]);

  const start = useCallback(async () => {
    setError(null);
    chunkIndexRef.current = 0;
    stoppingRef.current = false;
    mimeRef.current = pickMimeType();
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

      attachRecorder(stream);

      setState("recording");
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      cleanup();
      setState("error");
      setError(e instanceof Error ? e.message : "Microphone access denied");
    }
  }, [attachRecorder, cleanup, tick]);

  const stop = useCallback(async () => {
    if (stopPromiseRef.current) return stopPromiseRef.current;

    stopPromiseRef.current = (async () => {
      stoppingRef.current = true;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      await flushChunk(true);
      cleanup();
      stoppingRef.current = false;
      setState("idle");
    })();

    try {
      await stopPromiseRef.current;
    } finally {
      stopPromiseRef.current = null;
    }
  }, [cleanup, flushChunk]);

  useEffect(() => {
    if (!enabled && state === "recording" && !stoppingRef.current) {
      void stop();
    }
  }, [enabled, state, stop]);

  useEffect(() => () => cleanup(), [cleanup]);

  return { state, level, error, start, stop, flushNow: () => flushChunk(true) };
}
