import { BattleType } from "../../shared/src/index.js";
import { getJudgingRules } from "./judgeRules.js";
import { canonicalJson, sha256Hex } from "./hashUtils.js";

export { ZERO_HASH, canonicalJson, normalizeOptionalHash, sha256Hex } from "./hashUtils.js";

export function buildVerdictHashPackage({ battle, entries, judgeOutput, modelVersion, rules }) {
  const contentHash = sha256Hex({
    battleId: battle.id,
    battleType: battle.battleType,
    prompt: battle.prompt || null,
    imageUrl: battle.imageUrl || null
  });

  const optionsHash =
    battle.battleType === BattleType.OPTION
      ? sha256Hex(battle.options.map((option) => ({ id: option.id, text: option.text })))
      : null;

  const entriesRoot = sha256Hex(
    entries.map((entry) => ({
      id: entry.id,
      optionId: entry.optionId || null,
      content: entry.content
    }))
  );

  const rulesHash = sha256Hex(rules ?? getJudgingRules(battle.battleType));
  const modelVersionHash = sha256Hex(modelVersion);
  const winnerHash = sha256Hex({
    winnerType: judgeOutput.winnerType,
    winnerOptionId: judgeOutput.winnerOptionId || null,
    winnerEntryId: judgeOutput.winnerEntryId || null
  });

  const mvpEntryHash = judgeOutput.topEntries?.[0]?.entryId
    ? sha256Hex({ entryId: judgeOutput.topEntries[0].entryId })
    : null;

  const verdictHash = sha256Hex({
    contentHash,
    optionsHash,
    entriesRoot,
    rulesHash,
    modelVersionHash,
    winnerHash,
    mvpEntryHash,
    judgeOutput: {
      winnerType: judgeOutput.winnerType,
      winnerOptionId: judgeOutput.winnerOptionId || null,
      winnerEntryId: judgeOutput.winnerEntryId || null,
      topEntries: judgeOutput.topEntries,
      optionScores: judgeOutput.optionScores || null,
      scoreTable: judgeOutput.scoreTable,
      verdictTitle: judgeOutput.verdictTitle,
      verdictText: judgeOutput.verdictText,
      shareSummary: judgeOutput.shareSummary
    }
  });

  return {
    contentHash,
    optionsHash,
    entriesRoot,
    rulesHash,
    modelVersionHash,
    winnerHash,
    mvpEntryHash,
    verdictHash
  };
}
