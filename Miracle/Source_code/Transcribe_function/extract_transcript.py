import boto3
import json
import re

s3 = boto3.client("s3")

SOURCE_BUCKET = "miracle-ai-source-bkt"

def clean_transcript(text):
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\b(\w+)( \1\b)+", r"\1", text)
    return text.strip()


def process_transcribe_output(bucket, key):

    print("Processing:", key)

    # Skip & delete temp file
    if key.startswith("Transcribe_Output/."):
        print("Deleting temp file")
        s3.delete_object(Bucket=bucket, Key=key)
        return {"statusCode": 200}

    obj = s3.get_object(Bucket=bucket, Key=key)
    data = json.loads(obj["Body"].read().decode("utf-8"))

    if data.get("status") != "COMPLETED":
        return {"statusCode": 200}

    transcript = data["results"]["transcripts"][0]["transcript"]

    cleaned = clean_transcript(transcript)


    file_name = key.split("/")[-1].replace(".json", "")

    # Extract only job_ib
    file_id = file_name.split(".")[0]

    txt_key = f"Txt_Input/{file_id}.txt"

    s3.put_object(
        Bucket=SOURCE_BUCKET,
        Key=txt_key,
        Body=cleaned.encode("utf-8")
    )

    print("Saved to Txt_Input")

    return {"statusCode": 200}