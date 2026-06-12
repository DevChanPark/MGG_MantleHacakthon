import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const DEFAULT_DATABASE_URL = "postgresql://mgg:mgg@localhost:5432/mgg?schema=public";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = DEFAULT_DATABASE_URL;
  console.warn("[prisma] DATABASE_URL is not set; using the local development default.");
}

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: node scripts/prisma.js <prisma arguments>");
  process.exit(1);
}

const require = createRequire(import.meta.url);
let prismaCliPath;

try {
  prismaCliPath = require.resolve("prisma/build/index.js");
} catch {
  console.error("Prisma CLI is not installed. Run npm install first.");
  process.exit(1);
}

const child = spawn(process.execPath, [prismaCliPath, ...args], {
  stdio: "inherit",
  env: process.env
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
