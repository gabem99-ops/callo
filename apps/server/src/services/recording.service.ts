import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

// ── R2 Client ──────────────────────────────────────
// TODO: Initialize when R2 env vars are configured
let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (r2Client) return r2Client;

  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    throw new Error("R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.");
  }

  r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  return r2Client;
}

// ── Upload Recording ───────────────────────────────
export async function uploadRecording(
  callId: string,
  audioBuffer: Buffer
): Promise<string> {
  // TODO: Phase 3 - Full R2 implementation
  //
  // Implementation plan:
  // 1. Generate a storage key: recordings/{YYYY-MM}/{callId}.wav
  // 2. Upload the audio buffer to R2
  // 3. Return the storage key or public URL

  try {
    const client = getR2Client();
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const key = `recordings/${month}/${callId}.wav`;

    await client.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME || "callo-recordings",
        Key: key,
        Body: audioBuffer,
        ContentType: "audio/wav",
        Metadata: {
          callId,
          uploadedAt: now.toISOString(),
        },
      })
    );

    logger.info({ callId, key }, "Recording uploaded to R2");

    // Return public URL if configured, otherwise the key
    if (env.R2_PUBLIC_URL) {
      return `${env.R2_PUBLIC_URL}/${key}`;
    }

    return key;
  } catch (error) {
    logger.error({ error, callId }, "Failed to upload recording");
    throw error;
  }
}

// ── Get Recording URL ──────────────────────────────
export async function getRecordingUrl(callId: string): Promise<string> {
  // TODO: Phase 3 - Full R2 implementation
  //
  // Implementation plan:
  // 1. Determine the storage key from callId (or look up from DB)
  // 2. Generate a signed URL with expiration
  // 3. Return the signed URL

  try {
    const client = getR2Client();

    // Attempt to find the recording - check recent months
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const key = `recordings/${month}/${callId}.wav`;

    const command = new GetObjectCommand({
      Bucket: env.R2_BUCKET_NAME || "callo-recordings",
      Key: key,
    });

    // Generate signed URL valid for 1 hour
    const signedUrl = await getSignedUrl(client, command, {
      expiresIn: 3600,
    });

    logger.info({ callId, key }, "Generated signed recording URL");

    return signedUrl;
  } catch (error) {
    logger.error({ error, callId }, "Failed to get recording URL");
    throw error;
  }
}
