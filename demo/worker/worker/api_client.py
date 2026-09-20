import logging
from typing import Any

import httpx

from . import config

logger = logging.getLogger(__name__)


def merge_nlp_fields(
    case_id: str,
    fields: list[dict[str, Any]],
    *,
    incremental: bool = False,
) -> None:
    url = f"{config.API_BASE_URL}/internal/cases/{case_id}/nlp-merge"
    with httpx.Client(timeout=60.0) as client:
        r = client.post(
            url,
            json={"fields": fields, "incremental": incremental},
            headers={"X-Internal-Key": config.INTERNAL_API_KEY},
        )
        if r.status_code >= 400:
            logger.error("nlp-merge failed %s: %s", r.status_code, r.text[:500])
        r.raise_for_status()


def audit_model_unavailable(case_id: str, stage: str) -> None:
    try:
        url = f"{config.API_BASE_URL}/internal/audit"
        with httpx.Client(timeout=10.0) as client:
            client.post(
                url,
                json={"caseId": case_id, "eventType": "model.unavailable", "stage": stage},
                headers={"X-Internal-Key": config.INTERNAL_API_KEY},
            )
    except Exception as e:
        logger.warning("audit callback failed: %s", e)
