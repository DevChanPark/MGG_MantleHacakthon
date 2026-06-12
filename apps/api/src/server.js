import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { loadConfig } from "./config.js";
import { createApiApp } from "./app.js";
import { JsonFileRepository } from "./repositories/fileRepository.js";

export async function createHttpServer({ config = loadConfig(), repository } = {}) {
  const resolvedRepository = repository ?? (await createRepository(config));
  const app = createApiApp({ repository: resolvedRepository, config });

  return createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.setHeader("access-control-allow-origin", config.corsOrigin);
      res.setHeader("access-control-allow-headers", "content-type, x-user-id");
      res.setHeader("access-control-allow-methods", "GET,POST,PATCH,OPTIONS");
      res.end();
      return;
    }

    if (req.method === "GET" && req.url?.startsWith("/uploads/")) {
      await serveLocalUpload(req, res, config);
      return;
    }

    await app.respond(req, res);
  });
}

export async function createRepository(config) {
  if (config.repositoryProvider === "prisma") {
    if (!config.databaseUrl) {
      throw new Error("DATABASE_URL is required when REPOSITORY_PROVIDER=prisma");
    }
    const { PrismaRepository } = await import("./repositories/prismaRepository.js");
    return new PrismaRepository();
  }

  return JsonFileRepository.open(join(".data", "mgg-api.json"));
}

export async function serveLocalUpload(req, res, config) {
  let storageKey;
  try {
    storageKey = decodeURIComponent(new URL(req.url, "http://mgg.local").pathname.replace("/uploads/", ""));
  } catch {
    res.statusCode = 400;
    res.end("Invalid upload path");
    return;
  }

  if (!storageKey || storageKey.includes("/") || storageKey.includes("\\") || storageKey.includes("..")) {
    res.statusCode = 400;
    res.end("Invalid upload path");
    return;
  }

  const root = resolve(config.localStorageDir);
  const target = resolve(root, storageKey);
  if (!target.startsWith(root + sep)) {
    res.statusCode = 400;
    res.end("Invalid upload path");
    return;
  }

  try {
    const info = await stat(target);
    if (!info.isFile()) {
      res.statusCode = 404;
      res.end("Upload not found");
      return;
    }

    res.statusCode = 200;
    res.setHeader("content-type", contentTypeForPath(target));
    res.setHeader("content-length", info.size);
    res.setHeader("access-control-allow-origin", config.corsOrigin);
    createReadStream(target).pipe(res);
  } catch (error) {
    if (error.code === "ENOENT") {
      res.statusCode = 404;
      res.end("Upload not found");
      return;
    }
    res.statusCode = 500;
    res.end("Could not read upload");
  }
}

function contentTypeForPath(path) {
  const extension = extname(path).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  if (extension === ".gif") return "image/gif";
  return "application/octet-stream";
}

if (isMainModule()) {
  const config = loadConfig();
  const server = await createHttpServer({ config });
  server.listen(config.apiPort, () => {
    console.log(`MGG API listening on http://localhost:${config.apiPort}`);
    console.log(`Repository provider: ${config.repositoryProvider}`);
  });
}

function isMainModule() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}
