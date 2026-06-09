import { createBattleService } from "./services/battleService.js";
import { createAiJudgeService } from "./services/aiJudgeService.js";
import { createSettlementService } from "./services/settlementService.js";
import { createUploadService } from "./services/uploadService.js";
import { ApiError, toApiError } from "./errors.js";

const JSON_LIMIT_BYTES = 4 * 1024 * 1024;

export function createApiApp({ repository, config }) {
  const battleService = createBattleService({
    repository,
    config,
    aiJudgeService: createAiJudgeService(config),
    settlementService: createSettlementService(config)
  });
  const uploadService = createUploadService(config);

  async function handle(request) {
    try {
      const url = new URL(request.url, "http://mgg.local");
      const headers = normalizeHeaders(request.headers);
      const userId = headers["x-user-id"] || undefined;
      const method = request.method.toUpperCase();
      const path = url.pathname;

      if (method === "GET" && path === "/api/health") {
        return ok({ ok: true, service: "mgg-api" });
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
        return created({ upload: await uploadService.uploadImage(request.body) });
      }

      const battleMatch = path.match(/^\/api\/battles\/([^/]+)(?:\/([^/]+))?$/);
      if (battleMatch) {
        const battleId = decodeURIComponent(battleMatch[1]);
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
    const body = await readJsonBody(req);
    const result = await handle({
      method: req.method,
      url: req.url,
      headers: req.headers,
      body
    });

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
