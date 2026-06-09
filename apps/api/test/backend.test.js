import test from "node:test";
import assert from "node:assert/strict";
import { createApiApp } from "../src/app.js";
import { MemoryRepository } from "../src/repositories/memoryRepository.js";
import { createAiJudgeService, mockJudgeBattle } from "../src/services/aiJudgeService.js";
import { createSettlementService, mockRecordVerdict } from "../src/services/settlementService.js";
import { BattleStatus, BattleType } from "../../../packages/shared/src/index.js";
import { getJudgingRules, buildVerdictHashPackage } from "../../../packages/core/src/index.js";

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
