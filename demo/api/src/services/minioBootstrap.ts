import * as artifacts from "./artifactStore.js";

export async function bootstrapMinio(): Promise<void> {
  await artifacts.bootstrapArtifacts();
}

export function createMinioClient(): {
  putObject: typeof artifacts.putObject;
  bucketExists: () => Promise<boolean>;
} {
  return {
    putObject: artifacts.putObject,
    bucketExists: artifacts.bucketReady,
  };
}
