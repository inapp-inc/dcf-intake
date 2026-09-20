import { useCallback, useEffect, useRef, useState } from "react";

const SILENCE_MS = 800;
const FORCE_FLUSH_MS = 15_000;
const MIN_CHUNK_MS = 800;
const SPEECH_THRESHOLD = 0.012;
const SPEECH_START_MS = 200;

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
  const speakingRef = useRef(false);
  const hadSpeechRef = useRef(false);
  const speechStartRef = useRef<number | null>(null);
  const silenceStartRef = useRef<number | null>(null);
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
    speakingRef.current = false;
    hadSpeechRef.current = false;
    speechStartRef.current = null;
    silenceStartRef.current = null;
    segmentStartRef.current = null;
    lastFlushRef.current = 0;
    setLevel(0);
  }, []);

  const flushChunk = useCallback(async () => {
    const blobs = chunkBlobsRef.current;
    chunkBlobsRef.current = [];
    const segmentStart = segmentStartRef.current;
    segmentStartRef.current = performance.now();
    lastFlushRef.current = performance.now();
    speakingRef.current = false;
    hadSpeechRef.current = false;
    speechStartRef.current = null;
    silenceStartRef.current = null;

    if (!blobs.length) return;
    const combined = new Blob(blobs, { type: blobs[0]?.type || "audio/webm" });
    if (combined.size < 512) return;

    const durationMs = segmentStart
      ? Math.max(MIN_CHUNK_MS, Math.round(performance.now() - segmentStart))
      : FORCE_FLUSH_MS;
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
    const loud = rms >= SPEECH_THRESHOLD;

    if (loud) {
      if (!speakingRef.current) {
        if (speechStartRef.current == null) speechStartRef.current = now;
        if (now - speechStartRef.current >= SPEECH_START_MS) {
          speakingRef.current = true;
          hadSpeechRef.current = true;
          if (segmentStartRef.current == null) segmentStartRef.current = now;
          silenceStartRef.current = null;
        }
      } else {
        silenceStartRef.current = null;
      }
    } else if (speakingRef.current && hadSpeechRef.current) {
      if (silenceStartRef.current == null) silenceStartRef.current = now;
      else if (now - silenceStartRef.current >= SILENCE_MS) {
        void flushChunk();
      }
    } else if (!speakingRef.current) {
      speechStartRef.current = null;
    }

    if (
      chunkBlobsRef.current.length > 0 &&
      now - lastFlushRef.current >= FORCE_FLUSH_MS
    ) {
      void flushChunk();
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
