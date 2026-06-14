import { existsSync, readFileSync } from "node:fs";
import { MANTLE_TESTNET_CHAIN_ID } from "../../../packages/shared/src/index.js";

loadDotEnvFile();

export function loadConfig(env = process.env) {
  const databaseUrl = env.DATABASE_URL || "";
  return {
    apiPort: numberFromEnv(env.API_PORT, 4000),
    corsOrigin: env.CORS_ORIGIN || "*",
    databaseUrl,
    repositoryProvider: env.REPOSITORY_PROVIDER || (databaseUrl ? "prisma" : "json"),
    mockAi: booleanFromEnv(env.MOCK_AI, true),
    openAiApiKey: env.OPENAI_API_KEY || "",
    openAiModel: env.OPENAI_MODEL || "gpt-4.1-mini",
    aiFallbackToMock: booleanFromEnv(env.AI_FALLBACK_TO_MOCK, false),
    mockMantle: booleanFromEnv(env.MOCK_MANTLE, true),
    mantleRpcUrl: env.MANTLE_RPC_URL || "",
    mantleChainId: numberFromEnv(env.MANTLE_CHAIN_ID, 5003),
    verdictRegistryAddress: env.VERDICT_REGISTRY_ADDRESS || "",
    serverWalletPrivateKey: env.SERVER_WALLET_PRIVATE_KEY || "",
    mantleCreditExchangeEnabled: booleanFromEnv(env.MANTLE_CREDIT_EXCHANGE_ENABLED, false),
    mantleCreditTreasuryAddress: env.MANTLE_CREDIT_TREASURY_ADDRESS || "",
    mantleCreditChainId: numberFromEnv(env.MANTLE_CREDIT_CHAIN_ID, numberFromEnv(env.MANTLE_CHAIN_ID, MANTLE_TESTNET_CHAIN_ID)),
    mantleCreditRpcUrl: env.MANTLE_CREDIT_RPC_URL || env.MANTLE_RPC_URL || "",
    mantleCreditConfirmations: numberFromEnv(env.MANTLE_CREDIT_CONFIRMATIONS, 1),
    mntCreditRate: env.MNT_CREDIT_RATE || "1",
    storageProvider: env.STORAGE_PROVIDER || "local",
    storageBucket: env.STORAGE_BUCKET || "",
    storageAccessKey: env.STORAGE_ACCESS_KEY || "",
    storageSecretKey: env.STORAGE_SECRET_KEY || "",
    localStorageDir: env.LOCAL_STORAGE_DIR || ".data/uploads"
  };
}

function booleanFromEnv(value, fallback) {
  if (value === undefined || value === "") {
    return fallback;
  }
  return String(value).toLowerCase() === "true";
}

function numberFromEnv(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function loadDotEnvFile() {
  if (!existsSync(".env")) {
    return;
  }

  const lines = readFileSync(".env", "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = stripEnvQuotes(trimmed.slice(index + 1).trim());
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function stripEnvQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
