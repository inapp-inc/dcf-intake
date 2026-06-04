"""Limit text sent to Hugging Face to control token cost."""

HF_MAX_TRANSCRIPT_CHARS = 14_000
HF_MAX_PROMPT_CHARS = 16_000


def truncate_for_llm(text: str, max_chars: int = HF_MAX_TRANSCRIPT_CHARS) -> str:
    t = text.strip()
    if len(t) <= max_chars:
        return t
    return f"{t[:max_chars]}\n\n[… truncated for model context limit …]"
