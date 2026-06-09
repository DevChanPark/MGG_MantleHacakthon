import { createHash } from "node:crypto";

export const ZERO_HASH = `0x${"0".repeat(64)}`;

export function canonicalJson(value) {
  return JSON.stringify(sortForCanonicalJson(value));
}

export function sha256Hex(value) {
  const input = typeof value === "string" ? value : canonicalJson(value);
  return `0x${createHash("sha256").update(input).digest("hex")}`;
}

export function normalizeOptionalHash(value) {
  return value || ZERO_HASH;
}

function sortForCanonicalJson(value) {
  if (Array.isArray(value)) {
    return value.map(sortForCanonicalJson);
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        const item = value[key];
        if (item !== undefined) {
          acc[key] = sortForCanonicalJson(item);
        }
        return acc;
      }, {});
  }

  return value;
}
