# Intake — live demo delta

## ADDED: Live demo call session

The intake page SHALL offer a live demo call panel beside the file uploader.

- Starting a live session SHALL require microphone permission.
- Audio SHALL be segmented by client-side VAD; each segment sent as a chunk after speech pause or max 10s.
- Upload and live session SHALL be mutually exclusive on the same case.

## ADDED: Live transcription

- Each VAD segment SHALL be transcribed via HF Whisper (batch per chunk).
- Transcript lines SHALL use speaker label **Live** (`L`).
- Lines SHALL appear via `transcript.line` WebSocket events and persist incrementally.

## ADDED: Incremental form extraction

- After each chunk transcription, the worker SHALL run incremental NLP on the full transcript so far.
- New fields SHALL merge without overwriting human edits or confirmed AI values.

## ADDED: Gap coach

- After incremental NLP, the worker SHALL invoke an LLM gap coach.
- The assistant SHALL suggest 1 natural question for the highest-priority missing required field.
- Coach messages SHALL appear in the AIT Assistant sidebar with optional field jump.

## ADDED: End of live session

- Ending the session SHALL run triage and risk scoring on the full stitched transcript.
- Batch file upload workflow SHALL remain unchanged.
