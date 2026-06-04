from . import triage_config


def scan_keywords(text: str) -> list[str]:
    hits = []
    for pattern, label in triage_config.compiled_keyword_patterns():
        if pattern.search(text):
            hits.append(label)
    return hits


def triage_indicators():
    return triage_config.triage_indicator_tuples()


def triage_indicators_prompt_block() -> str:
    return triage_config.triage_indicators_prompt_block()


def escalation_threshold() -> int:
    return int(triage_config.load_triage_config().get("escalationThreshold", 2))
