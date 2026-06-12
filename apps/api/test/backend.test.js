import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApiApp } from "../src/app.js";
import { createHttpServer } from "../src/server.js";
import { MemoryRepository } from "../src/repositories/memoryRepository.js";
import { JsonFileRepository } from "../src/repositories/fileRepository.js";
import { createAiJudgeService, mockJudgeBattle, validateJudgeOutputReferences } from "../src/services/aiJudgeService.js";
import {
  ZERO_ADDRESS,
  createSettlementService,
  getSettlementReadiness,
  mockRecordVerdict,
  validateMantleConfig,
  validateSettlementPayload
} from "../src/services/settlementService.js";
import {
  BattleStatus,
  BattleType,
  validateJudgeInput,
  validateJudgeOutput,
  validateResultResponse
} from "../../../packages/shared/src/index.js";
import { getJudgingRules, sha256Hex } from "../../../packages/core/src/index.js";

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

test("health reports backend readiness without exposing secrets", async () => {
  const configWithSecrets = {
    ...testConfig,
    mockAi: false,
    openAiApiKey: "sk-test-secret",
    openAiModel: "gpt-test-model",
    mockMantle: false,
    mantleRpcUrl: "https://secret-rpc.example",
    mantleChainId: 5003,
    verdictRegistryAddress: "0x1111111111111111111111111111111111111111",
    serverWalletPrivateKey: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    localStorageDir: "secret-local-storage-dir"
  };
  const app = createApiApp({
    repository: new MemoryRepository(),
    config: configWithSecrets
  });

  const health = await request(app, "GET", "/api/health");

  assert.equal(health.statusCode, 200);
  assert.equal(health.body.ok, true);
  assert.equal(health.body.service, "mgg-api");
  assert.equal(health.body.ai.ready, true);
  assert.equal(health.body.ai.mode, "real");
  assert.equal(health.body.ai.model, "gpt-test-model");
  assert.equal(health.body.mantle.ready, true);
  assert.equal(health.body.mantle.chainId, 5003);
  assert.equal(health.body.storage.ready, true);
  assert.equal(health.body.storage.provider, "local");

  const serialized = JSON.stringify(health.body);
  assert.equal(serialized.includes(configWithSecrets.openAiApiKey), false);
  assert.equal(serialized.includes(configWithSecrets.mantleRpcUrl), false);
  assert.equal(serialized.includes(configWithSecrets.serverWalletPrivateKey), false);
  assert.equal(serialized.includes(configWithSecrets.localStorageDir), false);
});

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

test("updates MVP user profile metadata and rejects duplicate nicknames", async () => {
  const app = makeApp();

  const initial = await app.inject({
    method: "GET",
    url: "/api/users/me",
    headers: { "x-user-id": "profile-user" }
  });
  assert.equal(initial.statusCode, 200);
  assert.equal(initial.body.nickname, null);

  const updated = await app.inject({
    method: "PATCH",
    url: "/api/users/me",
    headers: { "x-user-id": "profile-user" },
    body: {
      nickname: "demo-captain",
      intro: "Turns unlikely arguments into demo data.",
      avatarUrl: "/uploads/profile.gif",
      walletProvider: "MetaMask",
      walletAddress: "0x1111111111111111111111111111111111111111"
    }
  });
  assert.equal(updated.statusCode, 200);
  assert.equal(updated.body.nickname, "demo-captain");
  assert.equal(updated.body.displayName, "demo-captain");
  assert.equal(updated.body.intro, "Turns unlikely arguments into demo data.");
  assert.equal(updated.body.avatarUrl, "/uploads/profile.gif");
  assert.equal(updated.body.walletProvider, "MetaMask");
  assert.equal(updated.body.walletAddress, "0x1111111111111111111111111111111111111111");

  const duplicate = await app.inject({
    method: "PATCH",
    url: "/api/users/me",
    headers: { "x-user-id": "other-profile-user" },
    body: { nickname: "demo-captain" }
  });
  assert.equal(duplicate.statusCode, 409);
  assert.equal(duplicate.body.error.code, "NICKNAME_TAKEN");

  const invalid = await app.inject({
    method: "PATCH",
    url: "/api/users/me",
    headers: { "x-user-id": "profile-user" },
    body: { walletAddress: "not-a-wallet" }
  });
  assert.equal(invalid.statusCode, 400);
  assert.equal(invalid.body.error.code, "VALIDATION_ERROR");

  const reservedNickname = await app.inject({
    method: "PATCH",
    url: "/api/users/me",
    headers: { "x-user-id": "profile-user" },
    body: { nickname: "MGG" }
  });
  assert.equal(reservedNickname.statusCode, 400);
  assert.equal(reservedNickname.body.error.code, "VALIDATION_ERROR");
});

test("stores judging rules snapshot and uses it for verdict hashing", async () => {
  const repository = new MemoryRepository();
  const app = createApiApp({
    repository,
    config: testConfig,
    aiJudgeService: createAiJudgeService(testConfig),
    settlementService: createSettlementService(testConfig)
  });
  const created = await request(app, "POST", "/api/battles", {
    battleType: BattleType.TEXT_OPEN,
    prompt: "Defend a suspicious toaster."
  });
  assert.equal(created.statusCode, 201);

  const battle = created.body.battle;
  const expectedRules = getJudgingRules(BattleType.TEXT_OPEN);
  const expectedRulesHash = sha256Hex(expectedRules);
  const rulesAfterCreate = repository.exportState().judgingRules.filter((rule) => rule.battleId === battle.id);
  assert.equal(rulesAfterCreate.length, 1);
  assert.deepEqual(rulesAfterCreate[0].rulesJson, expectedRules);
  assert.equal(rulesAfterCreate[0].rulesHash, expectedRulesHash);

  await request(app, "POST", `/api/battles/${battle.id}/entries`, {
    content: "The toaster is not suspicious; it is conducting thermal research."
  });
  await request(app, "POST", `/api/battles/${battle.id}/close`);

  const judged = await request(app, "POST", `/api/battles/${battle.id}/judge`);
  assert.equal(judged.statusCode, 200);
  assert.equal(judged.body.hashPackage.rulesHash, expectedRulesHash);
  assert.equal(repository.exportState().judgingRules.filter((rule) => rule.battleId === battle.id).length, 1);
});

test("JSON file repository backfills judgingRules for legacy local data", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "mgg-legacy-json-"));
  const filePath = join(tempDir, "mgg-api.json");
  await writeFile(
    filePath,
    JSON.stringify({
      users: [],
      battles: [],
      entries: [],
      verdicts: [],
      settlements: [],
      reports: []
    })
  );

  try {
    const repository = await JsonFileRepository.open(filePath);
    const app = createApiApp({
      repository,
      config: testConfig,
      aiJudgeService: createAiJudgeService(testConfig),
      settlementService: createSettlementService(testConfig)
    });

    const created = await request(app, "POST", "/api/battles", {
      battleType: BattleType.TEXT_OPEN,
      prompt: "Explain why old data still deserves a chair."
    });

    assert.equal(created.statusCode, 201);
    assert.equal(repository.exportState().judgingRules.length, 1);
    assert.ok(Array.isArray(repository.exportState().reports));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
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

test("creates reports for battles and validates report targets", async () => {
  const repository = new MemoryRepository();
  const app = createApiApp({
    repository,
    config: testConfig,
    aiJudgeService: createAiJudgeService(testConfig),
    settlementService: createSettlementService(testConfig)
  });
  const created = await request(app, "POST", "/api/battles", {
    battleType: BattleType.TEXT_OPEN,
    prompt: "Defend a suspicious mug."
  });
  assert.equal(created.statusCode, 201);
  const battleId = created.body.battle.id;

  const submitted = await request(app, "POST", `/api/battles/${battleId}/entries`, {
    content: "The mug is not suspicious; it is just holding evidence."
  });
  assert.equal(submitted.statusCode, 201);

  const report = await request(app, "POST", `/api/battles/${battleId}/reports`, {
    targetEntryId: submitted.body.entry.id,
    reason: "Spam or unsafe content review request"
  });
  assert.equal(report.statusCode, 201);
  assert.equal(report.body.report.battleId, battleId);
  assert.equal(report.body.report.targetEntryId, submitted.body.entry.id);
  assert.equal(report.body.report.reporterUserId, "test-user");
  assert.equal(report.body.report.status, "OPEN");
  assert.equal(repository.exportState().reports.length, 1);

  const invalidTarget = await request(app, "POST", `/api/battles/${battleId}/reports`, {
    targetEntryId: "missing-entry",
    reason: "This target does not belong here"
  });
  assert.equal(invalidTarget.statusCode, 400);
  assert.equal(invalidTarget.body.error.code, "INVALID_REPORT_TARGET");

  const missingReason = await request(app, "POST", `/api/battles/${battleId}/reports`, {
    targetEntryId: submitted.body.entry.id
  });
  assert.equal(missingReason.statusCode, 400);
  assert.equal(missingReason.body.error.code, "VALIDATION_ERROR");
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

test("AI judge output references must match existing entries and options", () => {
  const input = {
    battle: {
      id: "battle-1",
      battleType: BattleType.OPTION,
      status: BattleStatus.CLOSED,
      prompt: "Pick a mascot.",
      options: [
        { id: "option-1", text: "Spoon" },
        { id: "option-2", text: "Umbrella" }
      ]
    },
    entries: [
      { id: "entry-1", content: "The spoon has range.", optionId: "option-1" },
      { id: "entry-2", content: "The umbrella owns the sky.", optionId: "option-2" }
    ],
    rules: getJudgingRules(BattleType.OPTION)
  };

  const valid = validateJudgeOutputReferences(
    {
      winnerType: "OPTION",
      winnerOptionId: "option-1",
      winnerEntryId: "entry-1",
      topEntries: [{ rank: 1, entryId: "entry-1", score: 90, reason: "Strong bit." }],
      optionScores: [
        { optionId: "option-1", score: 90, reason: "Best comments." },
        { optionId: "option-2", score: 70, reason: "Still good." }
      ],
      scoreTable: [
        { entryId: "entry-1", optionId: "option-1", score: 90, reason: "Strong bit." },
        { entryId: "entry-2", optionId: "option-2", score: 70, reason: "Still good." }
      ],
      verdictTitle: "Spoon wins",
      verdictText: "The spoon argument landed harder.",
      shareSummary: "AI picked spoon."
    },
    input
  );
  assert.equal(valid.winnerOptionId, "option-1");

  assert.throws(
    () =>
      validateJudgeOutputReferences(
        {
          ...valid,
          winnerEntryId: "missing-entry",
          topEntries: [{ rank: 1, entryId: "missing-entry", score: 91, reason: "Invalid ref." }]
        },
        input
      ),
    /AI judge output referenced unknown battle data/
  );
});

test("invalid AI judge references fail safely without settlement", async () => {
  const repository = new MemoryRepository();
  const app = createApiApp({
    repository,
    config: testConfig,
    aiJudgeService: {
      judgeBattle: async () => ({
        winnerType: "ENTRY",
        winnerEntryId: "missing-entry",
        topEntries: [{ rank: 1, entryId: "missing-entry", score: 88, reason: "Unknown entry." }],
        scoreTable: [{ entryId: "missing-entry", optionId: null, score: 88, reason: "Unknown entry." }],
        verdictTitle: "Invalid AI output",
        verdictText: "This output points outside the battle.",
        shareSummary: "Invalid output should not settle."
      })
    },
    settlementService: createSettlementService(testConfig)
  });

  const battle = await createBattleWithEntries(
    app,
    {
      battleType: BattleType.TEXT_OPEN,
      prompt: "Defend a paperclip in court."
    },
    [{ content: "The paperclip kept the evidence together." }]
  );

  const closed = await request(app, "POST", `/api/battles/${battle.id}/close`);
  assert.equal(closed.statusCode, 200);

  const judged = await request(app, "POST", `/api/battles/${battle.id}/judge`);
  assert.equal(judged.statusCode, 502);
  assert.equal(judged.body.error.code, "JUDGE_OR_SETTLEMENT_FAILED");
  assert.match(judged.body.error.details[0], /AI judge output referenced unknown battle data/);

  const result = await request(app, "GET", `/api/battles/${battle.id}/result`);
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.battle.status, BattleStatus.FAILED);
  assert.match(result.body.failureReason, /AI judge output referenced unknown battle data/);
  assert.equal(await repository.getVerdictByBattle(battle.id), null);
  assert.equal(await repository.getSettlementByBattle(battle.id), null);
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
  assert.equal(first.contractAddress, ZERO_ADDRESS);
});

test("Mantle settlement validation rejects malformed payload and config", () => {
  assert.throws(
    () => validateSettlementPayload({ verdictHash: "0x1234" }),
    /Invalid Mantle settlement payload/
  );

  const payload = {
    contentHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
    entriesRoot: "0x2222222222222222222222222222222222222222222222222222222222222222",
    rulesHash: "0x3333333333333333333333333333333333333333333333333333333333333333",
    modelVersionHash: "0x4444444444444444444444444444444444444444444444444444444444444444",
    winnerHash: "0x5555555555555555555555555555555555555555555555555555555555555555",
    optionsHash: null,
    mvpEntryHash: null,
    verdictHash: "0x6666666666666666666666666666666666666666666666666666666666666666"
  };
  assert.deepEqual(validateSettlementPayload(payload), payload);

  assert.throws(() => validateMantleConfig({ mantleChainId: 5003 }), /Invalid Mantle settlement config/);

  const realConfig = {
    mantleRpcUrl: "https://rpc.test",
    mantleChainId: 5003,
    verdictRegistryAddress: "0x1111111111111111111111111111111111111111",
    serverWalletPrivateKey: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  };
  assert.equal(validateMantleConfig(realConfig).mantleChainId, 5003);

  assert.equal(getSettlementReadiness({ mockMantle: true, verdictRegistryAddress: "not-an-address" }).ready, true);
  assert.equal(
    getSettlementReadiness({ mockMantle: true, verdictRegistryAddress: "not-an-address" }).contractAddress,
    ZERO_ADDRESS
  );
  assert.equal(getSettlementReadiness({ mockMantle: false, mantleChainId: 5003 }).ready, false);
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
