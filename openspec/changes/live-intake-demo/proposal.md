# Live intake demo — proposal

## Goal

Add a **live demo call** mode beside the existing file uploader on the intake page. As participants speak near the laptop microphone, VAD-segmented audio is transcribed via the existing HF Whisper path, the transcript grows in near-real time, Form 51A fields populate incrementally, and the AIT Assistant suggests questions for missing required fields.

## Non-goals

- Telephony / call-center integration
- Streaming ASR vendors (Deepgram, etc.)
- Speaker diarization (single **Live** label only)
- Replacing batch upload workflow

## User-visible outcome

1. Screener opens a new intake case.
2. Clicks **Start live demo call** (upload card remains available but mutually exclusive).
3. Speaks; after each natural pause (~1s silence), a transcript line appears and form fields update.
4. Assistant sidebar surfaces LLM-generated prompts for missing required fields.
5. Clicks **End call** → triage and risk pipeline runs on the full stitched transcript.

## Constraints

- Demo-only changes under `demo/`
- Reuse HF Whisper (`whisper_asr.py`) and HF Llama for NLP/coach
- Reuse existing WebSocket event types (`transcript.line`, `form.field.updated`, `assistant.refresh`)
