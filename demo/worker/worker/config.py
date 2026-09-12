import os

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:////data/ait.db")
ARTIFACT_DIR = os.environ.get("ARTIFACT_DIR", "/data/artifacts")

LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "huggingface")
HF_API_TOKEN = os.environ.get("HF_API_TOKEN", os.environ.get("HUGGINGFACE_API_KEY", ""))
HF_MODEL = os.environ.get("HF_MODEL", "meta-llama/Llama-3.1-8B-Instruct")
HF_API_BASE = os.environ.get("HF_API_BASE", "https://router.huggingface.co/v1")
LLM_REQUEST_TIMEOUT_S = float(
    os.environ.get("LLM_REQUEST_TIMEOUT_MS", os.environ.get("OLLAMA_REQUEST_TIMEOUT_MS", "600000"))
) / 1000

OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2:3b")
HF_ASR_MODEL = os.environ.get("HF_ASR_MODEL", "openai/whisper-large-v3")
HF_ASR_API_URL = os.environ.get("HF_ASR_API_URL", "")
ASR_REQUEST_TIMEOUT_S = float(
    os.environ.get("ASR_REQUEST_TIMEOUT_MS", os.environ.get("LLM_REQUEST_TIMEOUT_MS", "600000"))
) / 1000

NLP_CONFIDENCE_THRESHOLD = float(os.environ.get("NLP_CONFIDENCE_THRESHOLD", "0.65"))

# Mock CCWIS prior incidents for clinical-review triage demo (0 = disabled, 3+ triggers flag)
DEMO_MOCK_CCWIS_PRIOR_INCIDENTS = int(os.environ.get("DEMO_MOCK_CCWIS_PRIOR_INCIDENTS", "0"))

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


def llm_model_label() -> str:
    return OLLAMA_MODEL if LLM_PROVIDER == "ollama" else HF_MODEL


def sqlite_path() -> str:
    url = DATABASE_URL.strip()
    if url.startswith("sqlite:"):
        path = url.replace("sqlite://", "", 1)
        if path.startswith("//"):
            return path[1:]
        return path
    return url
