import urllib.parse
from transcribe import start_transcribe_job
from extract_transcript import process_transcribe_output

def lambda_handler(event, context):

    record = event["Records"][0]

    bucket = record["s3"]["bucket"]["name"]
    key = urllib.parse.unquote_plus(record["s3"]["object"]["key"])

    print("Triggered:", bucket, key)

    if key.startswith("Audio_Input_files/"):
        return start_transcribe_job(bucket, key)

    elif key.startswith("Transcribe_Output/"):
        return process_transcribe_output(bucket, key)

    else:
        print("No matching handler")
        return {"statusCode": 200}