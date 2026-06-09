export function loadConfig(env = process.env) {
  return {
    apiPort: numberFromEnv(env.API_PORT, 4000),
    corsOrigin: env.CORS_ORIGIN || "*",
    databaseUrl: env.DATABASE_URL || "",
    mockAi: booleanFromEnv(env.MOCK_AI, true),
    openAiApiKey: env.OPENAI_API_KEY || "",
    openAiModel: env.OPENAI_MODEL || "gpt-4.1-mini",
    aiFallbackToMock: booleanFromEnv(env.AI_FALLBACK_TO_MOCK, false),
    mockMantle: booleanFromEnv(env.MOCK_MANTLE, true),
    mantleRpcUrl: env.MANTLE_RPC_URL || "",
    mantleChainId: numberFromEnv(env.MANTLE_CHAIN_ID, 5003),
    verdictRegistryAddress: env.VERDICT_REGISTRY_ADDRESS || "",
    serverWalletPrivateKey: env.SERVER_WALLET_PRIVATE_KEY || "",
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
