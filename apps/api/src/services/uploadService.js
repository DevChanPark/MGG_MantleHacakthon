import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { ApiError } from "../errors.js";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export function createUploadService(config) {
  return {
    uploadImage: (input) => uploadImage(input, config)
  };
}

export async function uploadImage(input, config) {
  if (config.storageProvider !== "local") {
    throw new ApiError(501, "STORAGE_NOT_IMPLEMENTED", "Only local image storage is implemented for MVP");
  }

  const fileName = typeof input?.fileName === "string" ? input.fileName : "upload";
  const contentType = typeof input?.contentType === "string" ? input.contentType : "";
  const base64Data = typeof input?.base64Data === "string" ? input.base64Data : "";

  if (!ALLOWED_TYPES.has(contentType)) {
    throw new ApiError(400, "INVALID_IMAGE_TYPE", "Unsupported image content type");
  }

  const bytes = Buffer.from(base64Data, "base64");
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) {
    throw new ApiError(400, "INVALID_IMAGE_SIZE", "Image must be between 1 byte and 3MB");
  }

  const extension = safeExtension(fileName, contentType);
  const digest = createHash("sha256").update(bytes).digest("hex").slice(0, 24);
  const storageKey = `${digest}${extension}`;
  await mkdir(config.localStorageDir, { recursive: true });
  await writeFile(join(config.localStorageDir, storageKey), bytes);

  return {
    imageUrl: `/uploads/${storageKey}`,
    storageKey,
    contentType,
    size: bytes.length
  };
}

function safeExtension(fileName, contentType) {
  const extension = extname(fileName).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(extension)) {
    return extension;
  }
  if (contentType === "image/png") return ".png";
  if (contentType === "image/jpeg") return ".jpg";
  if (contentType === "image/webp") return ".webp";
  return ".gif";
}
