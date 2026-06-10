import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApiApp } from "../src/app.js";
import { createHttpServer } from "../src/server.js";
import { MemoryRepository } from "../src/repositories/memoryRepository.js";
import { createAiJudgeService, mockJudgeBattle } from "../src/services/aiJudgeService.js";
import { createSettlementService, mockRecordVerdict } from "../src/services/settlementService.js";
import {
  BattleStatus,
  BattleType,
  validateJudgeInput,
  validateJudgeOutput,
  validateResultResponse
} from "../../../packages/shared/src/index.js";
import { getJudgingRules } from "../../../packages/core/src/index.js";

const testConfig = {
  corsOrigin: "*",
  mockAi: true,
  openAiApiKey: "",
  openAiModel: "mock-mgg-judge-v1",
  aiFallbackToMock: false,
  mockMantle: true,
  mantleChainId: 5003,
  verdictRegistryAddress: "0x0000000000000000000000000000000000000000",
  storageProvider: "local",
  localStorageDir: ".data/test-uploads"
};

test("creates battles for all three battle types", async () => {
  const app = makeApp();

  const option = await request(app, "POST", "/api/battles", {
    battleType: BattleType.OPTION,
    prompt: "Best emergency snack?",
    options: ["A", "B"]
  });
  assert.equal(option.statusCode, 201);
  assert.equal(option.body.battle.battleType, BattleType.OPTION);

  const text = await request(app, "POST", "/api/battles", {
    battleType: BattleType.TEXT_OPEN,
    prompt: "Defend a broken chair."
  });
  assert.equal(text.statusCode, 201);
  assert.equal(text.body.battle.battleType, BattleType.TEXT_OPEN);

  const image = await request(app, "POST", "/api/battles", {
    battleType: BattleType.IMAGE_CAPTION,
    imageUrl: "/uploads/mock.webp"
  });
  assert.equal(image.statusCode, 201);
  assert.equal(image.body.battle.battleType, BattleType.IMAGE_CAPTION);
});

test("validates OPTION battles require 2 to 4 options", async () => {
  const app = makeApp();

  const tooFew = await request(app, "POST", "/api/battles", {
    battleType: BattleType.OPTION,
    prompt: "Pick one",
    options: ["A"]
  });
  assert.equal(tooFew.statusCode, 400);

  const tooMany = await request(app, "POST", "/api/battles", {
    battleType: BattleType.OPTION,
    prompt: "Pick one",
    options: ["A", "B", "C", "D", "E"]
  });
  assert.equal(tooMany.statusCode, 400);
});

test("enforces entry submission state and blocks entries after CLOSED", async () => {
  const app = makeApp();
  const created = await request(app, "POST", "/api/battles", {
    battleType: BattleType.TEXT_OPEN,
    prompt: "Pitch a spoon as mayor."
  });
  const battleId = created.body.battle.id;

  const entry = await request(app, "POST", `/api/battles/${battleId}/entries`, {
    content: "The spoon already has public service experience."
  });
  assert.equal(entry.statusCode, 201);

  const closed = await request(app, "POST", `/api/battles/${battleId}/close`);
  assert.equal(closed.statusCode, 200);
  assert.equal(closed.body.battle.status, BattleStatus.CLOSED);

  const lateEntry = await request(app, "POST", `/api/battles/${battleId}/entries`, {
    content: "Too late."
  });
  assert.equal(lateEntry.statusCode, 409);
});

test("requires optionId for OPTION entries", async () => {
  const app = makeApp();
  const created = await request(app, "POST", "/api/battles", {
    battleType: BattleType.OPTION,
    prompt: "Best excuse?",
    options: ["Traffic", "Mercury"]
  });

  const missingOption = await request(app, "POST", `/api/battles/${created.body.battle.id}/entries`, {
    content: "Mercury is in retrograde and also parked badly."
  });
  assert.equal(missingOption.statusCode, 400);
});

test("closes, judges, settles, and returns result shape", async () => {
  const app = makeApp();
  const created = await request(app, "POST", "/api/battles", {
    battleType: BattleType.OPTION,
    prompt: "Which object is more CEO-coded?",
    options: ["Stapler", "Rice cooker"]
  });
  const battle = created.body.battle;

  await request(app, "POST", `/api/battles/${battle.id}/entries`, {
    optionId: battle.options[0].id,
    content: "The stapler literally consolidates departments."
  });
  await request(app, "POST", `/api/battles/${battle.id}/entries`, {
    optionId: battle.options[1].id,
    content: "The rice cooker has a boardroom beep and quarterly steam."
  });
  await request(app, "POST", `/api/battles/${battle.id}/close`);

  const judged = await request(app, "POST", `/api/battles/${battle.id}/judge`);
  assert.equal(judged.statusCode, 200);
  assert.equal(judged.body.battle.status, BattleStatus.SETTLED);
  assert.ok(judged.body.verdict.winnerOptionId);
  assert.ok(judged.body.hashPackage.verdictHash);
  assert.ok(judged.body.settlement.txHash);

  const result = await request(app, "GET", `/api/battles/${battle.id}/result`);
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.battle.id, battle.id);
  assert.ok(Array.isArray(result.body.verdict.scoreTable));
  assert.ok(result.body.settlement.explorerUrl.includes(result.body.settlement.txHash));
});

test("blocks repeated close and judge lifecycle calls", async () => {
  const app = makeApp();
  const battle = await createBattleWithEntries(app, {
    battleType: BattleType.TEXT_OPEN,
    prompt: "Give a vending machine a campaign slogan."
  }, [
    { content: "Exact change, exact justice." }
  ]);

  const firstClose = await request(app, "POST", `/api/battles/${battle.id}/close`);
  assert.equal(firstClose.statusCode, 200);

  const secondClose = await request(app, "POST", `/api/battles/${battle.id}/close`);
  assert.equal(secondClose.statusCode, 409);

  const firstJudge = await request(app, "POST", `/api/battles/${battle.id}/judge`);
  assert.equal(firstJudge.statusCode, 200);

  const secondJudge = await request(app, "POST", `/api/battles/${battle.id}/judge`);
  assert.equal(secondJudge.statusCode, 409);
});

test("settles TEXT_OPEN and IMAGE_CAPTION through the common pipeline", async () => {
  const app = makeApp();

  const textBattle = await createBattleWithEntries(app, {
    battleType: BattleType.TEXT_OPEN,
    prompt: "Convince me a keyboard is a legal advisor."
  }, [
    { content: "It objects every time you press escape." },
    { content: "It has a space bar, so clearly it understands jurisdiction." }
  ]);

  const textResult = await closeAndJudge(app, textBattle.id);
  assert.equal(textResult.body.battle.status, BattleStatus.SETTLED);
  assert.equal(textResult.body.verdict.winnerType, "ENTRY");
  assert.ok(textResult.body.verdict.winnerEntryId);

  const imageBattle = await createBattleWithEntries(app, {
    battleType: BattleType.IMAGE_CAPTION,
    imageUrl: "/uploads/mock.webp"
  }, [
    { content: "When the group project finally compiles." },
    { content: "POV: the Wi-Fi heard your deadline." }
  ]);

  const imageResult = await closeAndJudge(app, imageBattle.id);
  assert.equal(imageResult.body.battle.status, BattleStatus.SETTLED);
  assert.equal(imageResult.body.verdict.winnerType, "ENTRY");
  assert.ok(imageResult.body.hashPackage.verdictHash);
});

test("mock AI judge is deterministic", async () => {
  const input = {
    battle: {
      id: "battle-1",
      battleType: BattleType.TEXT_OPEN,
      prompt: "Argue for a tiny hat.",
      options: []
    },
    entries: [
      { id: "entry-1", content: "Tiny hat, massive confidence.", optionId: null },
      { id: "entry-2", content: "The hat is small because the ego is huge.", optionId: null }
    ],
    rules: getJudgingRules(BattleType.TEXT_OPEN)
  };

  assert.deepEqual(mockJudgeBattle(input), mockJudgeBattle(input));
  assert.equal(mockJudgeBattle(input).winnerType, "ENTRY");
});

test("shared judge and result contracts validate required shape", () => {
  const judgeInput = validateJudgeInput({
    battle: {
      id: "battle-1",
      battleType: BattleType.TEXT_OPEN,
      status: BattleStatus.CLOSED,
      prompt: "Argue for a tiny hat.",
      options: []
    },
    entries: [{ id: "entry-1", content: "Tiny hat, massive confidence.", optionId: null }],
    rules: getJudgingRules(BattleType.TEXT_OPEN)
  });
  assert.equal(judgeInput.battle.battleType, BattleType.TEXT_OPEN);

  assert.throws(
    () => validateJudgeInput({ battle: { id: "bad", battleType: "BAD" }, entries: [], rules: {} }),
    /Invalid judge input/
  );

  assert.throws(
    () =>
      validateJudgeOutput(
        {
          winnerType: "ENTRY",
          winnerEntryId: "entry-1",
          topEntries: [],
          scoreTable: [],
          verdictTitle: "Bad",
          verdictText: "Bad",
          shareSummary: "Bad"
        },
        BattleType.TEXT_OPEN
      ),
    /Invalid judge output/
  );

  const result = validateResultResponse({
    battle: {
      id: "battle-1",
      battleType: BattleType.TEXT_OPEN,
      status: BattleStatus.SETTLED,
      prompt: "Prompt",
      imageUrl: null,
      options: [],
      createdAt: new Date().toISOString(),
      closedAt: new Date().toISOString(),
      settledAt: new Date().toISOString()
    },
    entries: [{ id: "entry-1", content: "Answer", optionId: null }],
    verdict: {
      winnerType: "ENTRY",
      winnerEntryId: "entry-1",
      topEntries: [{ rank: 1, entryId: "entry-1", score: 88, reason: "Strong" }],
      scoreTable: [{ entryId: "entry-1", optionId: null, score: 88, reason: "Strong" }],
      verdictTitle: "Winner",
      verdictText: "A clear winner.",
      shareSummary: "Entry won."
    },
    hashPackage: {
      contentHash: "0x1",
      entriesRoot: "0x2",
      rulesHash: "0x3",
      modelVersionHash: "0x4",
      winnerHash: "0x5",
      verdictHash: "0x6"
    },
    settlement: {
      id: "settlement-1",
      chainId: 5003,
      contractAddress: "0x0000000000000000000000000000000000000000",
      txHash: "0x7",
      explorerUrl: "https://sepolia.mantlescan.xyz/tx/0x7",
      settledAt: new Date().toISOString()
    }
  });
  assert.equal(result.battle.id, "battle-1");
});

test("Prisma schema does not duplicate shared BattleType or BattleStatus enums", () => {
  const schema = readFileSync(new URL("../../../prisma/schema.prisma", import.meta.url), "utf8");
  assert.equal(schema.includes("enum BattleType"), false);
  assert.equal(schema.includes("enum BattleStatus"), false);
  assert.match(schema, /battleType\s+String/);
  assert.match(schema, /status\s+String\s+@default\("OPEN"\)/);
});

test("mock Mantle settlement returns deterministic tx metadata", () => {
  const payload = {
    contentHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
    entriesRoot: "0x2222222222222222222222222222222222222222222222222222222222222222",
    rulesHash: "0x3333333333333333333333333333333333333333333333333333333333333333",
    modelVersionHash: "0x4444444444444444444444444444444444444444444444444444444444444444",
    winnerHash: "0x5555555555555555555555555555555555555555555555555555555555555555",
    verdictHash: "0x6666666666666666666666666666666666666666666666666666666666666666"
  };

  const first = mockRecordVerdict(payload, testConfig);
  const second = mockRecordVerdict(payload, testConfig);
  assert.deepEqual(first, second);
  assert.equal(first.chainId, 5003);
});

test("local image upload stores and serves uploaded file over HTTP", async () => {
  const localStorageDir = await mkdtemp(join(tmpdir(), "mgg-upload-"));
  const server = await createHttpServer({
    repository: new MemoryRepository(),
    config: { ...testConfig, localStorageDir }
  });
  const baseUrl = await listenOnRandomPort(server);

  try {
    const uploadResponse = await fetch(`${baseUrl}/api/uploads/image`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: "pixel.gif",
        contentType: "image/gif",
        base64Data: "R0lGODlhAQABAAAAACw="
      })
    });

    assert.equal(uploadResponse.status, 201);
    const uploadBody = await uploadResponse.json();
    assert.match(uploadBody.upload.imageUrl, /^\/uploads\/[a-f0-9]+\.gif$/);

    const imageResponse = await fetch(`${baseUrl}${uploadBody.upload.imageUrl}`);
    assert.equal(imageResponse.status, 200);
    assert.equal(imageResponse.headers.get("content-type"), "image/gif");
    assert.ok((await imageResponse.arrayBuffer()).byteLength > 0);

    const traversalResponse = await fetch(`${baseUrl}/uploads/%2e%2e%2fsecret.gif`);
    assert.equal(traversalResponse.status, 400);
  } finally {
    await closeServer(server);
    await rm(localStorageDir, { recursive: true, force: true });
  }
});

test("HTTP server returns safe 400 responses for malformed mobile requests", async () => {
  const localStorageDir = await mkdtemp(join(tmpdir(), "mgg-bad-request-"));
  const server = await createHttpServer({
    repository: new MemoryRepository(),
    config: { ...testConfig, localStorageDir }
  });
  const baseUrl = await listenOnRandomPort(server);

  try {
    const badJsonResponse = await fetch(`${baseUrl}/api/battles`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{"
    });
    assert.equal(badJsonResponse.status, 400);
    assert.equal((await badJsonResponse.json()).error.code, "INVALID_JSON");

    const badBattlePathResponse = await fetch(`${baseUrl}/api/battles/%E0%A4%A`);
    assert.equal(badBattlePathResponse.status, 400);
    assert.equal((await badBattlePathResponse.json()).error.code, "INVALID_PATH");

    const badUploadPathResponse = await fetch(`${baseUrl}/uploads/%E0%A4%A`);
    assert.equal(badUploadPathResponse.status, 400);
  } finally {
    await closeServer(server);
    await rm(localStorageDir, { recursive: true, force: true });
  }
});

function makeApp() {
  return createApiApp({
    repository: new MemoryRepository(),
    config: testConfig,
    aiJudgeService: createAiJudgeService(testConfig),
    settlementService: createSettlementService(testConfig)
  });
}

async function request(app, method, url, body) {
  return app.inject({ method, url, body, headers: { "x-user-id": "test-user" } });
}

async function createBattleWithEntries(app, battleInput, entries) {
  const created = await request(app, "POST", "/api/battles", battleInput);
  assert.equal(created.statusCode, 201);
  const battle = created.body.battle;

  for (const entry of entries) {
    const submitted = await request(app, "POST", `/api/battles/${battle.id}/entries`, entry);
    assert.equal(submitted.statusCode, 201);
  }

  return battle;
}

async function closeAndJudge(app, battleId) {
  const closed = await request(app, "POST", `/api/battles/${battleId}/close`);
  assert.equal(closed.statusCode, 200);

  const judged = await request(app, "POST", `/api/battles/${battleId}/judge`);
  assert.equal(judged.statusCode, 200);
  return judged;
}

async function listenOnRandomPort(server) {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

async function closeServer(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
