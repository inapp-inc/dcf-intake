import * as Minio from "minio";
import { config } from "../config.js";

const PREFIXES = [
  "audio/input/",
  "transcribe/output/",
  "nlp/output/",
  "risk/output/",
  "background/output/",
  "documents/",
  "documents/validated/",
  "failed/",
];

export function createMinioClient(): Minio.Client {
  const [host, portStr] = config.minio.endpoint.split(":");
  const port = portStr ? parseInt(portStr, 10) : config.minio.useSsl ? 443 : 9000;
  return new Minio.Client({
    endPoint: host,
    port,
    useSSL: config.minio.useSsl,
    accessKey: config.minio.accessKey,
    secretKey: config.minio.secretKey,
  });
}

export async function bootstrapMinio(): Promise<void> {
  const client = createMinioClient();
  const bucket = config.minio.bucket;
  const exists = await client.bucketExists(bucket);
  if (!exists) {
    await client.makeBucket(bucket, "us-east-1");
  }
  for (const prefix of PREFIXES) {
    await client.putObject(bucket, `${prefix}.keep`, Buffer.from(""), 0, {
      "Content-Type": "application/octet-stream",
    });
  }
}
