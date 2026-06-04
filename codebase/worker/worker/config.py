import os

DATABASE_URL = os.environ.get("DATABASE_URL", "")


def _validate_database_url() -> None:
    """DCF AIT uses PostgreSQL only (ADR-DCF-0003). SQLite is not supported."""
    url = DATABASE_URL.strip()
    if not url:
        raise RuntimeError("DATABASE_URL is required — PostgreSQL only (SQLite is not supported)")
    if not url.startswith(("postgresql://", "postgres://")):
        scheme = url.split(":", 1)[0] if ":" in url else "unknown"
        raise RuntimeError(
            f"DATABASE_URL must be a PostgreSQL connection string (postgresql://…); got scheme '{scheme}'"
        )


_validate_database_url()
REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379")
MINIO_ENDPOINT = os.environ.get("MINIO_ENDPOINT", "minio:9000")
MINIO_ACCESS_KEY = os.environ.get("MINIO_ACCESS_KEY", "aitminio")
MINIO_SECRET_KEY = os.environ.get("MINIO_SECRET_KEY", "change-me")
MINIO_BUCKET = os.environ.get("MINIO_BUCKET", "ait-artifacts")
MINIO_USE_SSL = os.environ.get("MINIO_USE_SSL", "false").lower() == "true"

OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://ollama:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2:3b")
WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "base")
WHISPER_DEVICE = os.environ.get("WHISPER_DEVICE", "cpu")
NLP_CONFIDENCE_THRESHOLD = float(os.environ.get("NLP_CONFIDENCE_THRESHOLD", "0.65"))

API_BASE_URL = os.environ.get("API_BASE_URL", "http://api:8080/api/v1")
INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "dev-internal-key-change-me")

PIPELINE_QUEUE = "ait:pipeline:jobs"
OUTPUT_PREFIXES = (
    "transcribe/output/",
    "nlp/output/",
    "risk/output/",
    "background/output/",
    "documents/",
)
