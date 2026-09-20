# Live intake demo — design

## Architecture

```
Browser (MediaRecorder + client VAD)
  → POST /cases/:id/live/chunks (webm blob per VAD segment)
  → API stores chunk → enqueue live_chunk job
  → Worker: HF Whisper → append transcript → incremental NLP → gap coach LLM
  → WS events → IntakePage (transcript, form, assistant)
```

## VAD segmentation (client)

| Parameter | Value |
|-----------|-------|
| Silence end threshold | ~800ms below energy threshold |
| Max chunk duration | 15s (force send even without pause) |
| Min chunk duration | 0.8s (discard noise) |
| Format | `audio/webm;codecs=opus` |

## Per-chunk worker pipeline

1. `transcribe_live_chunk()` — one **Live** line per VAD segment
2. `append_transcript_segment()` — incremental DB insert
3. `run_incremental_nlp()` — extract unfilled fields from full transcript
4. `run_gap_coach()` — LLM suggests next question for top missing field

## End of call

`POST /live/end` enqueues `live_end` job:

- Final incremental NLP pass
- `keywords_triage` → `risk` on stitched transcript
- Set `live_session_status = ended`

## Data model

- `cases.live_session_status`: `idle` | `recording` | `ended`
- `cases.live_session_id`: UUID per session
- `transcript_segments.speaker`: extended to allow `L` (Live)

## Merge policy (incremental NLP)

- Skip fields with `source = human` and non-empty value
- Skip confirmed AI fields
- Fill empty fields; update AI fields only if new confidence is higher
