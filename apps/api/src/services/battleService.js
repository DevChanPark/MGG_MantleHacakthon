import {
  assertCanCloseBattle,
  assertCanJudgeBattle,
  assertCanSubmitEntry,
  assertBattleStatusTransition,
  buildVerdictHashPackage,
  getJudgingRules
} from "../../../../packages/core/src/index.js";
import {
  BattleStatus,
  validateCreateBattleRequest,
  validateCreateEntryRequest,
  validateJudgeInput,
  validateJudgeOutput,
  toResultResponse
} from "../../../../packages/shared/src/index.js";
import { ApiError, sanitizeFailureMessage } from "../errors.js";
import { moderateEntryContent } from "./moderationService.js";

export function createBattleService({ repository, aiJudgeService, settlementService, config }) {
  return {
    createBattle: (input, userId) => createBattle(repository, input, userId),
    listBattles: () => repository.listBattles(),
    getBattle: (battleId) => getBattleOrThrow(repository, battleId),
    submitEntry: (battleId, input, userId) => submitEntry(repository, battleId, input, userId),
    closeBattle: (battleId) => closeBattle(repository, battleId),
    judgeBattle: (battleId) => judgeBattle(repository, aiJudgeService, settlementService, config, battleId),
    getResult: (battleId) => getResult(repository, battleId),
    listArchive: () => repository.listArchive(),
    getOrCreateUser: (userId) => repository.getOrCreateUser(userId)
  };
}

async function createBattle(repository, input, userId) {
  const normalized = validateCreateBattleRequest({ ...input, createdByUserId: input?.createdByUserId || userId });
  const user = await repository.getOrCreateUser(normalized.createdByUserId || userId);
  return repository.createBattle({ ...normalized, createdByUserId: user.id });
}

async function submitEntry(repository, battleId, input, userId) {
  const battle = await getBattleOrThrow(repository, battleId);
  try {
    assertCanSubmitEntry(battle);
  } catch (error) {
    throw new ApiError(409, "BATTLE_NOT_OPEN", error.message);
  }

  const normalized = validateCreateEntryRequest(input, battle);
  if (normalized.optionId && !battle.options.some((option) => option.id === normalized.optionId)) {
    throw new ApiError(400, "INVALID_OPTION", "optionId does not belong to this battle");
  }

  const moderation = moderateEntryContent(normalized.content);
  if (!moderation.allowed) {
    throw new ApiError(400, "ENTRY_REJECTED", "Entry did not pass moderation checks");
  }

  const user = await repository.getOrCreateUser(normalized.submittedByUserId || userId);
  return repository.addEntry({
    battleId,
    content: normalized.content,
    optionId: normalized.optionId,
    submittedByUserId: user.id
  });
}

async function closeBattle(repository, battleId) {
  const battle = await getBattleOrThrow(repository, battleId);
  try {
    assertCanCloseBattle(battle);
    assertBattleStatusTransition(battle.status, BattleStatus.CLOSED);
  } catch (error) {
    throw new ApiError(409, "BATTLE_CANNOT_CLOSE", error.message);
  }

  return repository.updateBattle(battleId, {
    status: BattleStatus.CLOSED,
    closedAt: new Date().toISOString()
  });
}

async function judgeBattle(repository, aiJudgeService, settlementService, config, battleId) {
  const battle = await getBattleOrThrow(repository, battleId);
  try {
    assertCanJudgeBattle(battle);
  } catch (error) {
    throw new ApiError(409, "BATTLE_CANNOT_JUDGE", error.message);
  }

  const entries = await repository.listEntriesByBattle(battleId);
  if (entries.length === 0) {
    throw new ApiError(409, "NO_ENTRIES", "Cannot judge a battle without entries");
  }

  await repository.updateBattle(battleId, {
    status: BattleStatus.JUDGING,
    judgingStartedAt: new Date().toISOString(),
    failureReason: null
  });

  try {
    const currentBattle = await getBattleOrThrow(repository, battleId);
    const judgeInput = validateJudgeInput({
      battle: currentBattle,
      entries,
      rules: getJudgingRules(currentBattle.battleType)
    });
    const judgeOutput = validateJudgeOutput(await aiJudgeService.judgeBattle(judgeInput), currentBattle.battleType);
    const modelVersion = config.mockAi ? "mock-mgg-judge-v1" : config.openAiModel;
    const hashPackage = buildVerdictHashPackage({
      battle: currentBattle,
      entries,
      judgeOutput,
      modelVersion
    });

    const verdict = await repository.createVerdict({
      battleId,
      judgeOutput,
      hashPackage,
      modelVersion
    });

    const settlementResult = await settlementService.recordVerdictOnMantle(hashPackage);
    const settledAt = new Date().toISOString();
    const settlement = await repository.createSettlement({
      battleId,
      ...settlementResult,
      ...hashPackage,
      settledAt,
      payloadJson: hashPackage
    });

    await repository.updateBattle(battleId, {
      status: BattleStatus.SETTLED,
      settledAt,
      failureReason: null
    });

    return toResultResponse({
      battle: { ...currentBattle, status: BattleStatus.SETTLED, settledAt },
      entries,
      verdict,
      settlement
    });
  } catch (error) {
    await repository.updateBattle(battleId, {
      status: BattleStatus.FAILED,
      failureReason: sanitizeFailureMessage(error)
    });
    throw new ApiError(502, "JUDGE_OR_SETTLEMENT_FAILED", "Battle judging or Mantle settlement failed", [
      sanitizeFailureMessage(error)
    ]);
  }
}

async function getResult(repository, battleId) {
  const battle = await getBattleOrThrow(repository, battleId);
  if (battle.status === BattleStatus.FAILED) {
    return {
      battle,
      failureReason: battle.failureReason || "Battle failed during judging or settlement"
    };
  }

  if (battle.status !== BattleStatus.SETTLED) {
    throw new ApiError(409, "RESULT_NOT_READY", "Battle result is not settled yet");
  }

  const [entries, verdict, settlement] = await Promise.all([
    repository.listEntriesByBattle(battleId),
    repository.getVerdictByBattle(battleId),
    repository.getSettlementByBattle(battleId)
  ]);

  return toResultResponse({ battle, entries, verdict, settlement });
}

async function getBattleOrThrow(repository, battleId) {
  const battle = await repository.getBattle(battleId);
  if (!battle) {
    throw new ApiError(404, "BATTLE_NOT_FOUND", "Battle not found");
  }
  return battle;
}
