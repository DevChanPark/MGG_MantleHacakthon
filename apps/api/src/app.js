import { createBattleService } from "./services/battleService.js";
import { createAiJudgeService } from "./services/aiJudgeService.js";
import { createSettlementService } from "./services/settlementService.js";
import { createUploadService } from "./services/uploadService.js";
import { ApiError, toApiError } from "./errors.js";

const JSON_LIMIT_BYTES = 4 * 1024 * 1024;

export function createApiApp({ repository, config, aiJudgeService, settlementService, uploadService }) {
  const resolvedAiJudgeService = aiJudgeService ?? createAiJudgeService(config);
  const resolvedSettlementService = settlementService ?? createSettlementService(config);
  const resolvedUploadService = uploadService ?? createUploadService(config);
  const battleService = createBattleService({
    repository,
    config,
    aiJudgeService: resolvedAiJudgeService,
    settlementService: resolvedSettlementService
  });

  async function handle(request) {
    try {
      const url = new URL(request.url, "http://mgg.local");
      const headers = normalizeHeaders(request.headers);
      const userId = headers["x-user-id"] || undefined;
      const method = request.method.toUpperCase();
      const path = url.pathname;

      if (method === "GET" && path === "/api/health") {
        return ok({
          ok: true,
          service: "mgg-api",
          ai: resolvedAiJudgeService.getReadiness?.() ?? { ready: true, mode: "custom" },
          mantle: resolvedSettlementService.getSettlementReadiness?.() ?? { ready: true, mode: "custom" },
          storage: resolvedUploadService.getReadiness?.() ?? { ready: true, provider: "custom" }
        });
      }

      if (method === "GET" && path === "/api/users/me") {
        return ok(await battleService.getOrCreateUser(userId));
      }

      if (method === "GET" && path === "/api/battles") {
        return ok({ battles: await battleService.listBattles() });
      }

      if (method === "POST" && path === "/api/battles") {
        return created({ battle: await battleService.createBattle(request.body, userId) });
      }

      if (method === "GET" && path === "/api/archive") {
        return ok({ battles: await battleService.listArchive() });
      }

      if (method === "POST" && path === "/api/uploads/image") {
        return created({ upload: await resolvedUploadService.uploadImage(request.body) });
      }

      const battleMatch = path.match(/^\/api\/battles\/([^/]+)(?:\/([^/]+))?$/);
      if (battleMatch) {
        const battleId = safeDecodePathComponent(battleMatch[1]);
        const action = battleMatch[2];

        if (method === "GET" && !action) {
          const [battle, entries] = await Promise.all([
            battleService.getBattle(battleId),
            repository.listEntriesByBattle(battleId)
          ]);
          return ok({ battle, entries });
        }

        if (method === "POST" && action === "entries") {
          return created({ entry: await battleService.submitEntry(battleId, request.body, userId) });
        }

        if (method === "POST" && action === "reports") {
          return created({ report: await battleService.createReport(battleId, request.body, userId) });
        }

        if (method === "POST" && action === "close") {
          return ok({ battle: await battleService.closeBattle(battleId) });
        }

        if (method === "POST" && action === "judge") {
          return ok(await battleService.judgeBattle(battleId));
        }

        if (method === "GET" && action === "result") {
          return ok(await battleService.getResult(battleId));
        }
      }

      throw new ApiError(404, "NOT_FOUND", "Endpoint not found");
    } catch (error) {
      return errorResponse(error);
    }
  }

  async function respond(req, res) {
    let result;
    try {
      const body = await readJsonBody(req);
      result = await handle({
        method: req.method,
        url: req.url,
        headers: req.headers,
        body
      });
    } catch (error) {
      result = errorResponse(error);
    }

    res.statusCode = result.statusCode;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.setHeader("access-control-allow-origin", config.corsOrigin);
    res.setHeader("access-control-allow-headers", "content-type, x-user-id");
    res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
    res.end(JSON.stringify(result.body));
  }

  async function inject({ method = "GET", url, headers = {}, body }) {
    return handle({ method, url, headers, body });
  }

  return { handle, respond, inject };
}

function ok(body) {
  return { statusCode: 200, body };
}

function created(body) {
  return { statusCode: 201, body };
}

function errorResponse(error) {
  const apiError = toApiError(error);
  return {
    statusCode: apiError.statusCode,
    body: {
      error: {
        code: apiError.code,
        message: apiError.message,
        details: apiError.details
      }
    }
  };
}

function normalizeHeaders(headers = {}) {
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), String(value)]));
}

function safeDecodePathComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new ApiError(400, "INVALID_PATH", "URL path contains invalid encoding");
  }
}

async function readJsonBody(req) {
  if (req.method === "GET" || req.method === "OPTIONS") {
    return undefined;
  }

  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > JSON_LIMIT_BYTES) {
      throw new ApiError(413, "BODY_TOO_LARGE", "Request body is too large");
    }
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON");
  }
}
