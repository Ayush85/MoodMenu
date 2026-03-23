import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

const s3 = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT || "https://sgp1.digitaloceanspaces.com",
  region: "sgp1",
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY || "",
    secretAccessKey: process.env.DO_SPACES_SECRET || "",
  },
  forcePathStyle: false,
});

const BUCKET = process.env.DO_SPACES_BUCKET || "aydexis";
const FOLDER = process.env.DO_SPACES_FOLDER || "menuor";
const CDN_BASE = process.env.DO_SPACES_CDN || `https://${BUCKET}.sgp1.digitaloceanspaces.com`;

export async function uploadImage(buffer: Buffer, contentType: string): Promise<string> {
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const filename = `${FOLDER}/${crypto.randomUUID()}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: filename,
      Body: buffer,
      ContentType: contentType,
      ACL: "public-read",
    })
  );

  return `${CDN_BASE}/${filename}`;
}
