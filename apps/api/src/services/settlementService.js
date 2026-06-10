import {
  AIVerdictRegistryAbi,
  normalizeOptionalHash,
  sha256Hex,
} from "../../../../packages/core/src/index.js";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export class SettlementValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "SettlementValidationError";
    this.details = details;
  }
}

export function createSettlementService(config) {
  return {
    recordVerdictOnMantle: (payload) => recordVerdictOnMantle(payload, config),
    mockRecordVerdict: (payload) => mockRecordVerdict(payload, config),
    validateSettlementPayload,
    validateMantleConfig: () => validateMantleConfig(config),
    getSettlementReadiness: () => getSettlementReadiness(config),
    getExplorerUrl
  };
}

export async function recordVerdictOnMantle(payload, config = {}) {
  const hashPackage = validateSettlementPayload(payload);
  if (config.mockMantle) {
    return mockRecordVerdict(hashPackage, config);
  }

  const mantleConfig = validateMantleConfig(config);
  const [{ createWalletClient, http }, { privateKeyToAccount }] = await Promise.all([
    import("viem"),
    import("viem/accounts")
  ]);

  const account = privateKeyToAccount(mantleConfig.serverWalletPrivateKey);
  const walletClient = createWalletClient({
    account,
    chain: {
      id: mantleConfig.mantleChainId,
      name: `Mantle ${mantleConfig.mantleChainId}`,
      nativeCurrency: { name: "MNT", symbol: "MNT", decimals: 18 },
      rpcUrls: { default: { http: [mantleConfig.mantleRpcUrl] } }
    },
    transport: http(mantleConfig.mantleRpcUrl)
  });

  const txHash = await walletClient.writeContract({
    address: mantleConfig.verdictRegistryAddress,
    abi: AIVerdictRegistryAbi,
    functionName: "recordVerdict",
    args: [
      hashPackage.contentHash,
      normalizeOptionalHash(hashPackage.optionsHash),
      hashPackage.entriesRoot,
      hashPackage.rulesHash,
      hashPackage.modelVersionHash,
      hashPackage.winnerHash,
      normalizeOptionalHash(hashPackage.mvpEntryHash),
      hashPackage.verdictHash
    ]
  });

  return {
    chainId: mantleConfig.mantleChainId,
    contractAddress: mantleConfig.verdictRegistryAddress,
    txHash,
    explorerUrl: getExplorerUrl(mantleConfig.mantleChainId, txHash)
  };
}

export function mockRecordVerdict(payload, config = {}) {
  const hashPackage = validateSettlementPayload(payload);
  const txHash = sha256Hex({ mock: "mantle", verdictHash: hashPackage.verdictHash });
  const chainId = normalizeMockChainId(config.mantleChainId);
  return {
    chainId,
    contractAddress: getMockContractAddress(config),
    txHash,
    explorerUrl: getExplorerUrl(chainId, txHash)
  };
}

export function validateSettlementPayload(payload) {
  const details = [];
  const body = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const requiredBytes32 = [
    "contentHash",
    "entriesRoot",
    "rulesHash",
    "modelVersionHash",
    "winnerHash",
    "verdictHash"
  ];
  const optionalBytes32 = ["optionsHash", "mvpEntryHash"];

  for (const field of requiredBytes32) {
    if (!isBytes32Hex(body[field])) {
      details.push(`${field} must be a bytes32 hex string`);
    }
  }

  for (const field of optionalBytes32) {
    if (body[field] !== null && body[field] !== undefined && !isBytes32Hex(body[field])) {
      details.push(`${field} must be a bytes32 hex string when provided`);
    }
  }

  if (details.length > 0) {
    throw new SettlementValidationError("Invalid Mantle settlement payload", details);
  }

  return {
    contentHash: body.contentHash,
    optionsHash: body.optionsHash || null,
    entriesRoot: body.entriesRoot,
    rulesHash: body.rulesHash,
    modelVersionHash: body.modelVersionHash,
    winnerHash: body.winnerHash,
    mvpEntryHash: body.mvpEntryHash || null,
    verdictHash: body.verdictHash
  };
}

export function validateMantleConfig(config = {}) {
  const details = [];
  const chainId = Number(config.mantleChainId);

  if (!config.mantleRpcUrl) {
    details.push("MANTLE_RPC_URL is required when MOCK_MANTLE=false");
  }
  if (!Number.isInteger(chainId) || chainId <= 0) {
    details.push("MANTLE_CHAIN_ID must be a positive integer");
  }
  if (!isAddress(config.verdictRegistryAddress)) {
    details.push("VERDICT_REGISTRY_ADDRESS must be an EVM address");
  }
  if (!isPrivateKey(config.serverWalletPrivateKey)) {
    details.push("SERVER_WALLET_PRIVATE_KEY must be a 32-byte hex private key");
  }

  if (details.length > 0) {
    throw new SettlementValidationError("Invalid Mantle settlement config", details);
  }

  return {
    mantleRpcUrl: config.mantleRpcUrl,
    mantleChainId: chainId,
    verdictRegistryAddress: config.verdictRegistryAddress,
    serverWalletPrivateKey: config.serverWalletPrivateKey
  };
}

export function getSettlementReadiness(config = {}) {
  if (config.mockMantle) {
    return {
      mode: "mock",
      ready: true,
      chainId: normalizeMockChainId(config.mantleChainId),
      contractAddress: getMockContractAddress(config)
    };
  }

  try {
    const validated = validateMantleConfig(config);
    return {
      mode: "real",
      ready: true,
      chainId: validated.mantleChainId,
      contractAddress: validated.verdictRegistryAddress
    };
  } catch (error) {
    return {
      mode: "real",
      ready: false,
      details: error.details ?? [error.message]
    };
  }
}

export function getExplorerUrl(chainId, txHash) {
  const id = Number(chainId);
  if (id === 5000) {
    return `https://mantlescan.xyz/tx/${txHash}`;
  }
  if (id === 5003) {
    return `https://sepolia.mantlescan.xyz/tx/${txHash}`;
  }
  return `https://explorer.mantle.xyz/tx/${txHash}`;
}

function isBytes32Hex(value) {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value);
}

function isAddress(value) {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);
}

function isPrivateKey(value) {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value);
}

function getMockContractAddress(config) {
  return isAddress(config.verdictRegistryAddress) ? config.verdictRegistryAddress : ZERO_ADDRESS;
}

function normalizeMockChainId(value) {
  const chainId = Number(value ?? 5003);
  return Number.isInteger(chainId) && chainId > 0 ? chainId : 5003;
}
