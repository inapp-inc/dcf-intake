"""Additive statistical risk score — deterministic points, not LLM / probability."""

from __future__ import annotations

from . import keywords, risk_framework


def _label_for_score(fw: dict, score: int) -> str:
    for band in fw.get("bands", []):
        if score >= int(band.get("min", 0)):
            return str(band.get("label", "Lower"))
    return "Lower"


def compute_statistical_risk(
    transcript: str,
    triage_flags: list[dict],
    emergency: bool,
) -> dict:
    fw = risk_framework.load_risk_framework()
    scale_min = int(fw.get("scaleMin", 1))
    scale_max = int(fw.get("scaleMax", 20))
    breakdown: list[dict] = []
    raw = float(fw.get("baselinePoints", 2))
    breakdown.append({"component": "Baseline intake score", "points": raw})

    kw_points_map = fw.get("keywordPoints") or {}
    default_kw = float(fw.get("defaultKeywordPoints", 2))
    seen_kw: set[str] = set()
    for label in keywords.scan_keywords(transcript):
        if label in seen_kw:
            continue
        seen_kw.add(label)
        pts = float(kw_points_map.get(label, default_kw))
        raw += pts
        breakdown.append({"component": f"Keyword: {label}", "points": pts})

    sev_pts = fw.get("triageSeverityPoints") or {}
    crit = float(sev_pts.get("critical", 4))
    high = float(sev_pts.get("high", 2))
    pending_mult = float(fw.get("pendingTriageMultiplier", 0.5))

    for flag in triage_flags:
        if flag.get("status") == "dismissed":
            continue
        base = crit if flag.get("severity") == "critical" else high
        mult = 1.0 if flag.get("status") == "confirmed" else pending_mult
        pts = round(base * mult, 1)
        raw += pts
        status_note = "confirmed" if flag.get("status") == "confirmed" else "pending"
        breakdown.append(
            {
                "component": f"Triage: {flag.get('label', 'indicator')} ({status_note})",
                "points": pts,
            }
        )

    if emergency:
        epts = float(fw.get("emergencyPoints", 5))
        raw += epts
        breakdown.append({"component": "Emergency escalation active", "points": epts})

    score = min(scale_max, max(scale_min, round(raw)))
    label = _label_for_score(fw, score)
    factors = [f"{b['component']} (+{b['points']})" for b in breakdown if b.get("points", 0) > 0]
    if not factors:
        factors = [f"Baseline only (total {score}/{scale_max})"]

    return {
        "score": score,
        "label": label,
        "rawTotal": round(raw, 1),
        "contributingFactors": factors,
        "breakdown": breakdown,
        "modelVersion": str(fw.get("version", "statistical-v1")),
    }
