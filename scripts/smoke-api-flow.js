const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:4000";
const suffix = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const SMOKE_USER_ID = process.env.SMOKE_USER_ID || `api-smoke-flow-${suffix}`;
const prompt = `API smoke prompt flow ${suffix}`;
const entryContent = `API smoke entry content ${suffix}`;

const jsonHeaders = {
  "content-type": "application/json",
  "x-user-id": SMOKE_USER_ID
};

async function main() {
  const statusFlow = [];
  const health = await request("GET", "/api/health");
  assert(health.ai?.mode === "mock", "Expected ai.mode to be mock", health.ai);
  assert(health.mantle?.mode === "mock", "Expected mantle.mode to be mock", health.mantle);

  const profile = await request("PATCH", "/api/users/me", {
    nickname: `smoke-${suffix}`,
    intro: "API smoke profile",
    walletProvider: "MetaMask",
    walletAddress: "0x1111111111111111111111111111111111111111"
  });
  assert(profile.id === SMOKE_USER_ID, "Profile was not saved for the smoke user", profile);

  const createBattle = await request("POST", "/api/battles", {
    battleType: "TEXT_OPEN",
    prompt
  });
  const battle = createBattle.battle;
  assert(battle?.id, "Battle id missing", createBattle);
  assert(battle.status === "OPEN", "Created battle should be OPEN", battle);
  statusFlow.push(battle.status);

  const listBattles = await request("GET", "/api/battles");
  const listed = Array.isArray(listBattles.battles)
    ? listBattles.battles.find((item) => item.id === battle.id)
    : null;
  assert(Boolean(listed), "Created battle missing from GET /api/battles", listBattles);

  const detailBeforeEntry = await request("GET", `/api/battles/${battle.id}`);
  assert(detailBeforeEntry.battle.id === battle.id, "GET battle detail returned wrong battle", detailBeforeEntry);
  assert(
    Array.isArray(detailBeforeEntry.entries) && detailBeforeEntry.entries.length === 0,
    "New battle should start with no entries",
    detailBeforeEntry.entries
  );

  const entry = await request("POST", `/api/battles/${battle.id}/entries`, {
    content: entryContent
  });
  assert(entry.entry?.battleId === battle.id, "Entry battleId mismatch", entry);

  const close = await request("POST", `/api/battles/${battle.id}/close`);
  assert(close.battle.status === "CLOSED", "Closed battle should be CLOSED", close.battle);
  statusFlow.push(close.battle.status);

  const judge = await request("POST", `/api/battles/${battle.id}/judge`);
  assert(judge.battle.status === "SETTLED", "Judge response should settle battle", judge.battle);
  statusFlow.push("JUDGING");
  statusFlow.push(judge.battle.status);

  const result = await request("GET", `/api/battles/${battle.id}/result`);
  assert(result.battle.status === "SETTLED", "Result should be SETTLED", result.battle);
  assert(result.verdict?.winnerType === "ENTRY", "TEXT_OPEN verdict should pick an entry", result.verdict);
  assert(
    result.hashPackage && Object.values(result.hashPackage).filter(Boolean).every(isBytes32),
    "Hash package should contain only bytes32 hashes/nulls",
    result.hashPackage
  );
  assert(
    result.settlement?.txHash && isBytes32(result.settlement.txHash),
    "Mock settlement txHash should be bytes32-shaped",
    result.settlement
  );

  const serializedHashPackage = JSON.stringify(result.hashPackage);
  const serializedSettlement = JSON.stringify(result.settlement);
  assert(
    !serializedHashPackage.includes(prompt) && !serializedHashPackage.includes(entryContent),
    "Hash package leaked raw prompt or entry content",
    result.hashPackage
  );
  assert(
    !serializedSettlement.includes(prompt) && !serializedSettlement.includes(entryContent),
    "Settlement summary leaked raw prompt or entry content",
    result.settlement
  );

  const archive = await request("GET", "/api/archive");
  const archived = Array.isArray(archive.battles) ? archive.battles.find((item) => item.id === battle.id) : null;
  assert(Boolean(archived), "Settled battle missing from archive", archive);

  console.log(
    JSON.stringify(
      {
        apiBaseUrl: API_BASE_URL,
        userId: SMOKE_USER_ID,
        battleId: battle.id,
        health: {
          aiMode: health.ai.mode,
          mantleMode: health.mantle.mode
        },
        statusFlow,
        settlement: {
          modeConfirmedByHealth: health.mantle.mode,
          chainId: result.settlement.chainId,
          contractAddress: result.settlement.contractAddress,
          txHash: result.settlement.txHash,
          explorerUrl: result.settlement.explorerUrl
        },
        rawOnChainCheck: "hashPackage and settlement contain hashes and settlement metadata only"
      },
      null,
      2
    )
  );
}

async function request(method, path, body) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: jsonHeaders,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  const parsed = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`${method} ${path} failed with ${response.status}: ${text}`);
  }

  return parsed;
}

function assert(condition, message, details = undefined) {
  if (!condition) {
    const error = new Error(message);
    if (details !== undefined) {
      error.details = details;
    }
    throw error;
  }
}

function isBytes32(value) {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value);
}

main().catch((error) => {
  console.error(error.message);
  if (error.details) {
    console.error(JSON.stringify(error.details, null, 2));
  }
  process.exit(1);
});
