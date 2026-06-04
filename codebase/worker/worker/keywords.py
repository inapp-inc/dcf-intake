import re

KEYWORD_PATTERNS = [
    (re.compile(r"\b(gun|firearm|weapon|knife|pistol|rifle)\b", re.I), "weapon"),
    (re.compile(r"\b(bruise|bruising|hit|beat|abuse|hurt)\b", re.I), "injury"),
    (re.compile(r"\b(removal|removed|foster)\b", re.I), "removal"),
]

TRIAGE_INDICATORS = [
    ("young_child", "Very young child in household", "high"),
    ("weapon", "Weapon present", "critical"),
    ("prior_removal", "Prior removal history", "high"),
    ("perp_in_home", "Perpetrator currently in home", "high"),
    ("imminent_fear", "Reporter expressing imminent fear", "critical"),
]


def scan_keywords(text: str) -> list[str]:
    hits = []
    for pattern, label in KEYWORD_PATTERNS:
        if pattern.search(text):
            hits.append(label)
    return hits
