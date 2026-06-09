import { createServer } from "node:http";
import { join } from "node:path";
import { loadConfig } from "./config.js";
import { createApiApp } from "./app.js";
import { JsonFileRepository } from "./repositories/fileRepository.js";

const config = loadConfig();
const repository = await JsonFileRepository.open(join(".data", "mgg-api.json"));
const app = createApiApp({ repository, config });

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("access-control-allow-origin", config.corsOrigin);
    res.setHeader("access-control-allow-headers", "content-type, x-user-id");
    res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
    res.end();
    return;
  }

  await app.respond(req, res);
});

server.listen(config.apiPort, () => {
  console.log(`MGG API listening on http://localhost:${config.apiPort}`);
});
