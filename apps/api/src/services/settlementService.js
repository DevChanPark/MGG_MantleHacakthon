import {
  AIVerdictRegistryAbi,
  normalizeOptionalHash,
  sha256Hex,
  ZERO_HASH
} from "../../../../packages/core/src/index.js";

export function createSettlementService(config) {
  return {
    recordVerdictOnMantle: (payload) => recordVerdictOnMantle(payload, config),
    mockRecordVerdict: (payload) => mockRecordVerdict(payload, config),
    getExplorerUrl
  };
}

export async function recordVerdictOnMantle(payload, config = {}) {
  if (config.mockMantle) {
    return mockRecordVerdict(payload, config);
  }

  assertRealMantleConfig(config);
  const [{ createWalletClient, http }, { privateKeyToAccount }] = await Promise.all([
    import("viem"),
    import("viem/accounts")
  ]);

  const account = privateKeyToAccount(config.serverWalletPrivateKey);
  const walletClient = createWalletClient({
    account,
    chain: {
      id: config.mantleChainId,
      name: `Mantle ${config.mantleChainId}`,
      nativeCurrency: { name: "MNT", symbol: "MNT", decimals: 18 },
      rpcUrls: { default: { http: [config.mantleRpcUrl] } }
    },
    transport: http(config.mantleRpcUrl)
  });

  const txHash = await walletClient.writeContract({
    address: config.verdictRegistryAddress,
    abi: AIVerdictRegistryAbi,
    functionName: "recordVerdict",
    args: [
      payload.contentHash,
      normalizeOptionalHash(payload.optionsHash),
      payload.entriesRoot,
      payload.rulesHash,
      payload.modelVersionHash,
      payload.winnerHash,
      normalizeOptionalHash(payload.mvpEntryHash),
      payload.verdictHash
    ]
  });

  return {
    chainId: config.mantleChainId,
    contractAddress: config.verdictRegistryAddress,
    txHash,
    explorerUrl: getExplorerUrl(config.mantleChainId, txHash)
  };
}

export function mockRecordVerdict(payload, config = {}) {
  const txHash = sha256Hex({ mock: "mantle", verdictHash: payload.verdictHash });
  return {
    chainId: config.mantleChainId ?? 5003,
    contractAddress: config.verdictRegistryAddress || ZERO_HASH,
    txHash,
    explorerUrl: getExplorerUrl(config.mantleChainId ?? 5003, txHash)
  };
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

function assertRealMantleConfig(config) {
  const missing = [];
  for (const key of ["mantleRpcUrl", "mantleChainId", "verdictRegistryAddress", "serverWalletPrivateKey"]) {
    if (!config[key]) {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    throw new Error(`Missing Mantle settlement config: ${missing.join(", ")}`);
  }
}
