import io
import json
import logging
from typing import Any

from minio import Minio

from . import config

logger = logging.getLogger(__name__)


def client() -> Minio:
    host, _, port = config.MINIO_ENDPOINT.partition(":")
    return Minio(
        host,
        port=int(port or "9000"),
        access_key=config.MINIO_ACCESS_KEY,
        secret_key=config.MINIO_SECRET_KEY,
        secure=config.MINIO_USE_SSL,
    )


def put_json(key: str, data: Any) -> None:
    body = json.dumps(data, indent=2).encode("utf-8")
    client().put_object(
        config.MINIO_BUCKET,
        key,
        io.BytesIO(body),
        length=len(body),
        content_type="application/json",
    )


def get_json(key: str) -> Any:
    resp = client().get_object(config.MINIO_BUCKET, key)
    try:
        return json.loads(resp.read().decode("utf-8"))
    finally:
        resp.close()
        resp.release_conn()


def put_bytes(key: str, data: bytes, content_type: str = "application/octet-stream") -> None:
    client().put_object(config.MINIO_BUCKET, key, io.BytesIO(data), length=len(data), content_type=content_type)


def get_bytes(key: str) -> bytes:
    resp = client().get_object(config.MINIO_BUCKET, key)
    try:
        return resp.read()
    finally:
        resp.close()
        resp.release_conn()


def find_latest_audio_key(case_id: str) -> str | None:
    prefix = f"audio/input/{case_id}/"
    c = client()
    keys = [o.object_name for o in c.list_objects(config.MINIO_BUCKET, prefix=prefix, recursive=True)]
    keys = [k for k in keys if not k.endswith(".keep")]
    return sorted(keys)[-1] if keys else None
