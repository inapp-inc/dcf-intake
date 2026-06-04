import json
import os
import urllib.parse
from pathlib import Path

import boto3

from assessment_ai import (
    load_questions_from_csv,
    invoke_bedrock_section,
    merge_section_outputs,
    EXPECTED_SECTION_IDS,
)

AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")
QUESTIONS_CSV_PATH = os.getenv("QUESTIONS_CSV_PATH", "/var/task/questions.csv")

s3 = boto3.client("s3", region_name=AWS_REGION)

# Load questions once when container starts
QUESTIONS_BY_SECTION = load_questions_from_csv(Path(QUESTIONS_CSV_PATH))


def extract_translated_text(payload):
    """Extract translated text from translation JSON"""
    return (payload.get("translated_text") or payload.get("text") or "").strip()


def lambda_handler(event, context):

    # ---------- GET S3 EVENT ----------
    record = event["Records"][0]
    bucket = record["s3"]["bucket"]["name"]
    key = urllib.parse.unquote_plus(record["s3"]["object"]["key"])

    print("Triggered by:", bucket, key)

    # ---------- PREVENT RECURSION ----------
    if key.startswith("assessments/"):
        print("Skipping assessment output file")
        return {"statusCode": 200}

    # ---------- READ TRANSLATION JSON ----------
    obj = s3.get_object(Bucket=bucket, Key=key)
    payload = json.loads(obj["Body"].read().decode("utf-8"))

    translated_text = extract_translated_text(payload)

    if not translated_text:
        raise ValueError("No translated_text found in input JSON")

    print("Translated text:", translated_text[:200])

    # ---------- RUN DOMAIN ASSESSMENT ----------
    section_outputs = []

    for section_id in EXPECTED_SECTION_IDS:

        questions = QUESTIONS_BY_SECTION[section_id]

        section_json = invoke_bedrock_section(
            context_text=translated_text,
            section_id=section_id,
            questions=questions,
        )

        section_outputs.append(section_json)

    # ---------- MERGE ALL SECTIONS ----------
    merged = merge_section_outputs(section_outputs)

    # ---------- ADD TRANSLATION METADATA ----------
    merged["translation_meta"] = {
        "source_bucket": payload.get("source_bucket"),
        "source_key": payload.get("source_key"),
        "detected_language": payload.get("detected_language"),
        "detected_language_display": payload.get("detected_language_display"),
    }

    # ---------- OUTPUT LOCATION ----------

    file_name = key.split("/")[-1]         
    file_id = file_name.split(".")[0]      

    base_key = f"{file_id}.json"
    output_key = f"assessments/{base_key}"

    print("Saving result to:", output_key)

    # ---------- SAVE RESULT ----------
    s3.put_object(
        Bucket=bucket,
        Key=output_key,
        Body=json.dumps(merged, ensure_ascii=False, indent=2).encode("utf-8"),
        ContentType="application/json",
    )

    return {
        "statusCode": 200,
        "message": "Assessment completed",
        "output_key": output_key,
    }