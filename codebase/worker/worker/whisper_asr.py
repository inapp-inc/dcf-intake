import logging
import os
import tempfile
from typing import Any, Callable

from . import config

logger = logging.getLogger(__name__)
_model = None


def get_model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel

        device = config.WHISPER_DEVICE
        compute_type = "int8" if device == "cpu" else "float16"
        logger.info("Loading Whisper model %s on %s", config.WHISPER_MODEL, device)
        _model = WhisperModel(config.WHISPER_MODEL, device=device, compute_type=compute_type)
    return _model


def transcribe_audio(
    audio_bytes: bytes,
    suffix: str = ".wav",
    on_segment: Callable[[dict[str, Any], int], None] | None = None,
) -> list[dict[str, Any]]:
    from .keywords import scan_keywords

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
        f.write(audio_bytes)
        path = f.name

    segments_out: list[dict[str, Any]] = []
    try:
        model = get_model()
        segments, _info = model.transcribe(path, beam_size=5, vad_filter=True)
        offset = 0
        speaker_toggle = True
        for seg in segments:
            text = seg.text.strip()
            if not text:
                continue
            speaker = "S" if speaker_toggle else "C"
            speaker_toggle = not speaker_toggle
            kw = len(scan_keywords(text)) > 0
            row = {
                "speaker": speaker,
                "text": text,
                "offset_ms": int(seg.start * 1000) if seg.start is not None else offset,
                "keyword_flag": kw,
            }
            segments_out.append(row)
            if on_segment:
                on_segment(row, len(segments_out) - 1)
            offset += int((seg.end - seg.start) * 1000) if seg.end and seg.start else 3000
    finally:
        os.unlink(path)

    if not segments_out:
        segments_out.append(
            {
                "speaker": "C",
                "text": "Transcription produced no speech segments.",
                "offset_ms": 0,
                "keyword_flag": False,
            }
        )
    return segments_out
