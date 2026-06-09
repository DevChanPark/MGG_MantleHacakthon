export const BattleType = Object.freeze({
  OPTION: "OPTION",
  TEXT_OPEN: "TEXT_OPEN",
  IMAGE_CAPTION: "IMAGE_CAPTION"
});

export const BattleStatus = Object.freeze({
  OPEN: "OPEN",
  CLOSED: "CLOSED",
  JUDGING: "JUDGING",
  SETTLED: "SETTLED",
  FAILED: "FAILED"
});

export const WinnerType = Object.freeze({
  OPTION: "OPTION",
  ENTRY: "ENTRY"
});

export const BattleTypeValues = Object.freeze(Object.values(BattleType));
export const BattleStatusValues = Object.freeze(Object.values(BattleStatus));
export const WinnerTypeValues = Object.freeze(Object.values(WinnerType));

export const JudgeOutputFields = Object.freeze([
  "winnerType",
  "winnerOptionId",
  "winnerEntryId",
  "topEntries",
  "optionScores",
  "scoreTable",
  "verdictTitle",
  "verdictText",
  "shareSummary"
]);

export const ResultResponseFields = Object.freeze([
  "battle",
  "entries",
  "verdict",
  "hashPackage",
  "settlement"
]);

export const MAX_ANSWER_LENGTH = 500;
export const MAX_PROMPT_LENGTH = 300;
export const MAX_OPTION_LENGTH = 80;
export const MIN_OPTION_COUNT = 2;
export const MAX_OPTION_COUNT = 4;

export class ContractValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "ContractValidationError";
    this.details = details;
  }
}

export function isBattleType(value) {
  return BattleTypeValues.includes(value);
}

export function isBattleStatus(value) {
  return BattleStatusValues.includes(value);
}

export function assertValidBattleType(value) {
  if (!isBattleType(value)) {
    throw new ContractValidationError("Invalid battleType", [
      `battleType must be one of ${BattleTypeValues.join(", ")}`
    ]);
  }
}

export function validateCreateBattleRequest(input) {
  const body = ensureObject(input, "request body");
  const details = [];
  const battleType = body.battleType;

  if (!isBattleType(battleType)) {
    details.push(`battleType must be one of ${BattleTypeValues.join(", ")}`);
  }

  const prompt = normalizeOptionalString(body.prompt);
  const imageUrl = normalizeOptionalString(body.imageUrl);
  const normalized = {
    battleType,
    prompt,
    imageUrl,
    options: [],
    createdByUserId: normalizeOptionalString(body.createdByUserId)
  };

  if (battleType === BattleType.OPTION || battleType === BattleType.TEXT_OPEN) {
    if (!prompt) {
      details.push("prompt is required");
    } else if (prompt.length > MAX_PROMPT_LENGTH) {
      details.push(`prompt must be ${MAX_PROMPT_LENGTH} characters or fewer`);
    }
  }

  if (battleType === BattleType.IMAGE_CAPTION) {
    if (!imageUrl) {
      details.push("imageUrl is required for IMAGE_CAPTION battles");
    }
    if (prompt && prompt.length > MAX_PROMPT_LENGTH) {
      details.push(`prompt must be ${MAX_PROMPT_LENGTH} characters or fewer`);
    }
  }

  if (battleType === BattleType.OPTION) {
    if (!Array.isArray(body.options)) {
      details.push("options must be an array");
    } else {
      if (body.options.length < MIN_OPTION_COUNT || body.options.length > MAX_OPTION_COUNT) {
        details.push(`OPTION battles require ${MIN_OPTION_COUNT} to ${MAX_OPTION_COUNT} options`);
      }

      normalized.options = body.options.map((option, index) => {
        const text = typeof option === "string" ? option.trim() : normalizeOptionalString(option?.text);
        if (!text) {
          details.push(`options[${index}] text is required`);
        } else if (text.length > MAX_OPTION_LENGTH) {
          details.push(`options[${index}] must be ${MAX_OPTION_LENGTH} characters or fewer`);
        }
        return { text };
      });
    }
  }

  if (battleType !== BattleType.OPTION && body.options !== undefined) {
    details.push("options are only allowed for OPTION battles");
  }

  if (details.length > 0) {
    throw new ContractValidationError("Invalid create battle request", details);
  }

  return normalized;
}

export function validateCreateEntryRequest(input, battle) {
  const body = ensureObject(input, "request body");
  const details = [];
  const content = normalizeOptionalString(body.content);
  const optionId = normalizeOptionalString(body.optionId);

  if (!content) {
    details.push("content is required");
  } else if (content.length > MAX_ANSWER_LENGTH) {
    details.push(`content must be ${MAX_ANSWER_LENGTH} characters or fewer`);
  }

  if (battle.battleType === BattleType.OPTION && !optionId) {
    details.push("optionId is required for OPTION battle entries");
  }

  if (battle.battleType !== BattleType.OPTION && optionId) {
    details.push("optionId is only allowed for OPTION battle entries");
  }

  if (details.length > 0) {
    throw new ContractValidationError("Invalid create entry request", details);
  }

  return {
    content,
    optionId: optionId || null,
    submittedByUserId: normalizeOptionalString(body.submittedByUserId)
  };
}

export function validateJudgeInput(input) {
  const body = ensureObject(input, "judge input");
  const details = [];
  const battle = ensureNestedObject(body.battle, "battle", details);
  const entries = Array.isArray(body.entries) ? body.entries : [];
  const rules = ensureNestedObject(body.rules, "rules", details);

  if (battle && !normalizeOptionalString(battle.id)) {
    details.push("battle.id is required");
  }

  if (battle && !isBattleType(battle.battleType)) {
    details.push(`battle.battleType must be one of ${BattleTypeValues.join(", ")}`);
  }

  if (battle?.status !== undefined && !isBattleStatus(battle.status)) {
    details.push(`battle.status must be one of ${BattleStatusValues.join(", ")}`);
  }

  if (battle?.battleType === BattleType.OPTION) {
    if (!Array.isArray(battle.options)) {
      details.push("battle.options must be an array for OPTION judge input");
    } else if (battle.options.length < MIN_OPTION_COUNT || battle.options.length > MAX_OPTION_COUNT) {
      details.push(`battle.options must contain ${MIN_OPTION_COUNT} to ${MAX_OPTION_COUNT} options`);
    }
  }

  if (!Array.isArray(body.entries)) {
    details.push("entries must be an array");
  } else if (body.entries.length === 0) {
    details.push("entries must contain at least one entry");
  } else {
    body.entries.forEach((entry, index) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        details.push(`entries[${index}] must be an object`);
        return;
      }
      if (!normalizeOptionalString(entry.id)) {
        details.push(`entries[${index}].id is required`);
      }
      if (!normalizeOptionalString(entry.content)) {
        details.push(`entries[${index}].content is required`);
      }
      if (battle?.battleType === BattleType.OPTION && !normalizeOptionalString(entry.optionId)) {
        details.push(`entries[${index}].optionId is required for OPTION judge input`);
      }
    });
  }

  if (rules && !Array.isArray(rules.criteria)) {
    details.push("rules.criteria must be an array");
  }

  if (details.length > 0) {
    throw new ContractValidationError("Invalid judge input", details);
  }

  return {
    battle,
    entries,
    rules
  };
}

export function validateJudgeOutput(output, battleType) {
  assertValidBattleType(battleType);
  const body = ensureObject(output, "judge output");
  const details = [];

  if (!WinnerTypeValues.includes(body.winnerType)) {
    details.push("winnerType must be OPTION or ENTRY");
  }

  if (battleType === BattleType.OPTION) {
    if (body.winnerType !== WinnerType.OPTION) {
      details.push("OPTION battles must return winnerType OPTION");
    }
    if (!normalizeOptionalString(body.winnerOptionId)) {
      details.push("winnerOptionId is required for OPTION battles");
    }
    if (!Array.isArray(body.optionScores) || body.optionScores.length === 0) {
      details.push("optionScores is required for OPTION battles");
    }
    validateOptionScores(body.optionScores, details);
  } else {
    if (body.winnerType !== WinnerType.ENTRY) {
      details.push(`${battleType} battles must return winnerType ENTRY`);
    }
    if (!normalizeOptionalString(body.winnerEntryId)) {
      details.push("winnerEntryId is required");
    }
  }

  if (!Array.isArray(body.topEntries) || body.topEntries.length === 0) {
    details.push("topEntries must be a non-empty array");
  } else {
    validateTopEntries(body.topEntries, details);
  }

  if (!Array.isArray(body.scoreTable) || body.scoreTable.length === 0) {
    details.push("scoreTable must be a non-empty array");
  } else {
    validateScoreTable(body.scoreTable, details);
  }

  for (const field of ["verdictTitle", "verdictText", "shareSummary"]) {
    if (!normalizeOptionalString(body[field])) {
      details.push(`${field} is required`);
    }
  }

  if (details.length > 0) {
    throw new ContractValidationError("Invalid judge output", details);
  }

  return {
    winnerType: body.winnerType,
    winnerOptionId: normalizeOptionalString(body.winnerOptionId) || null,
    winnerEntryId: normalizeOptionalString(body.winnerEntryId) || null,
    topEntries: body.topEntries.map((entry) => ({
      rank: Number(entry.rank),
      entryId: String(entry.entryId),
      score: normalizeScore(entry.score),
      reason: normalizeOptionalString(entry.reason)
    })),
    optionScores:
      battleType === BattleType.OPTION
        ? body.optionScores.map((option) => ({
            optionId: String(option.optionId),
            score: normalizeScore(option.score),
            reason: normalizeOptionalString(option.reason)
          }))
        : undefined,
    scoreTable: body.scoreTable.map((entry) => ({
      ...entry,
      entryId: String(entry.entryId),
      optionId: normalizeOptionalString(entry.optionId) || null,
      score: normalizeScore(entry.score),
      reason: normalizeOptionalString(entry.reason)
    })),
    verdictTitle: String(body.verdictTitle),
    verdictText: String(body.verdictText),
    shareSummary: String(body.shareSummary)
  };
}

export function toResultResponse({ battle, entries, verdict, settlement }) {
  return validateResultResponse({
    battle: {
      id: battle.id,
      battleType: battle.battleType,
      status: battle.status,
      prompt: battle.prompt,
      imageUrl: battle.imageUrl,
      options: battle.options,
      createdAt: battle.createdAt,
      closedAt: battle.closedAt,
      settledAt: battle.settledAt
    },
    entries,
    verdict: verdict?.judgeOutput ?? null,
    hashPackage: verdict?.hashPackage ?? null,
    settlement: settlement
      ? {
          id: settlement.id,
          chainId: settlement.chainId,
          contractAddress: settlement.contractAddress,
          txHash: settlement.txHash,
          explorerUrl: settlement.explorerUrl,
          settledAt: settlement.settledAt
        }
      : null
  });
}

export function validateResultResponse(response) {
  const body = ensureObject(response, "result response");
  const details = [];
  const battle = ensureNestedObject(body.battle, "battle", details);

  if (battle && !normalizeOptionalString(battle.id)) {
    details.push("battle.id is required");
  }
  if (battle && !isBattleType(battle.battleType)) {
    details.push(`battle.battleType must be one of ${BattleTypeValues.join(", ")}`);
  }
  if (battle && !isBattleStatus(battle.status)) {
    details.push(`battle.status must be one of ${BattleStatusValues.join(", ")}`);
  }

  if (!Array.isArray(body.entries)) {
    details.push("entries must be an array");
  }

  if (body.verdict !== null && body.verdict !== undefined) {
    validateNestedJudgeOutput(body.verdict, battle?.battleType, details);
  }

  if (body.hashPackage !== null && body.hashPackage !== undefined) {
    validateHashPackage(body.hashPackage, details);
  }

  if (body.settlement !== null && body.settlement !== undefined) {
    validateSettlementSummary(body.settlement, details);
  }

  if (details.length > 0) {
    throw new ContractValidationError("Invalid result response", details);
  }

  return {
    battle: body.battle,
    entries: body.entries,
    verdict: body.verdict ?? null,
    hashPackage: body.hashPackage ?? null,
    settlement: body.settlement ?? null
  };
}

function ensureObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractValidationError(`Invalid ${label}`, [`${label} must be an object`]);
  }
  return value;
}

function ensureNestedObject(value, label, details) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    details.push(`${label} must be an object`);
    return null;
  }
  return value;
}

function normalizeOptionalString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeScore(value) {
  return Number(value);
}

function isValidScore(value) {
  return Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100;
}

function validateTopEntries(topEntries, details) {
  topEntries.forEach((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      details.push(`topEntries[${index}] must be an object`);
      return;
    }
    if (!Number.isInteger(Number(entry.rank)) || Number(entry.rank) < 1) {
      details.push(`topEntries[${index}].rank must be a positive integer`);
    }
    if (!normalizeOptionalString(entry.entryId)) {
      details.push(`topEntries[${index}].entryId is required`);
    }
    if (!isValidScore(entry.score)) {
      details.push(`topEntries[${index}].score must be between 0 and 100`);
    }
  });
}

function validateOptionScores(optionScores, details) {
  if (!Array.isArray(optionScores)) {
    return;
  }

  optionScores.forEach((option, index) => {
    if (!option || typeof option !== "object" || Array.isArray(option)) {
      details.push(`optionScores[${index}] must be an object`);
      return;
    }
    if (!normalizeOptionalString(option.optionId)) {
      details.push(`optionScores[${index}].optionId is required`);
    }
    if (!isValidScore(option.score)) {
      details.push(`optionScores[${index}].score must be between 0 and 100`);
    }
  });
}

function validateScoreTable(scoreTable, details) {
  scoreTable.forEach((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      details.push(`scoreTable[${index}] must be an object`);
      return;
    }
    if (!normalizeOptionalString(entry.entryId)) {
      details.push(`scoreTable[${index}].entryId is required`);
    }
    if (!isValidScore(entry.score)) {
      details.push(`scoreTable[${index}].score must be between 0 and 100`);
    }
  });
}

function validateNestedJudgeOutput(verdict, battleType, details) {
  try {
    validateJudgeOutput(verdict, battleType);
  } catch (error) {
    details.push(...(error.details ?? [error.message]));
  }
}

function validateHashPackage(hashPackage, details) {
  const required = [
    "contentHash",
    "entriesRoot",
    "rulesHash",
    "modelVersionHash",
    "winnerHash",
    "verdictHash"
  ];
  for (const field of required) {
    if (!normalizeOptionalString(hashPackage[field])) {
      details.push(`hashPackage.${field} is required`);
    }
  }
}

function validateSettlementSummary(settlement, details) {
  for (const field of ["id", "contractAddress", "txHash", "explorerUrl", "settledAt"]) {
    if (!normalizeOptionalString(settlement[field])) {
      details.push(`settlement.${field} is required`);
    }
  }
  if (!Number.isFinite(Number(settlement.chainId))) {
    details.push("settlement.chainId must be a number");
  }
}
