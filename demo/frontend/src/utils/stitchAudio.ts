/** Decode WebM/Opus segments and merge into one WAV blob for reliable `<audio>` playback. */
export async function stitchAudioBlobs(blobs: Blob[]): Promise<Blob> {
  if (blobs.length === 0) throw new Error("No audio to stitch");
  if (blobs.length === 1) return blobs[0]!;

  const ctx = new AudioContext();
  try {
    const decoded: AudioBuffer[] = [];
    for (const blob of blobs) {
      const ab = await blob.arrayBuffer();
      decoded.push(await ctx.decodeAudioData(ab.slice(0)));
    }

    const sampleRate = decoded[0]!.sampleRate;
    const channels = decoded[0]!.numberOfChannels;
    const totalFrames = decoded.reduce((sum, buf) => sum + buf.length, 0);
    const merged = ctx.createBuffer(channels, totalFrames, sampleRate);

    let offset = 0;
    for (const buf of decoded) {
      for (let ch = 0; ch < channels; ch++) {
        merged.getChannelData(ch).set(buf.getChannelData(ch), offset);
      }
      offset += buf.length;
    }

    return audioBufferToWav(merged);
  } finally {
    await ctx.close();
  }
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const frames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataSize = frames * blockAlign;
  const headerSize = 44;
  const out = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(out);

  const writeStr = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  let pos = headerSize;
  for (let i = 0; i < frames; i++) {
    for (let ch = 0; ch < channels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i] ?? 0));
      view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      pos += 2;
    }
  }

  return new Blob([out], { type: "audio/wav" });
}
