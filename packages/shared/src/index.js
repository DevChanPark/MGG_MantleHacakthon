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
  return Object.values(BattleType).includes(value);
}

export function isBattleStatus(value) {
  return Object.values(BattleStatus).includes(value);
}

export function assertValidBattleType(value) {
  if (!isBattleType(value)) {
    throw new ContractValidationError("Invalid battleType", [
      `battleType must be one of ${Object.values(BattleType).join(", ")}`
    ]);
  }
}

export function validateCreateBattleRequest(input) {
  const body = ensureObject(input, "request body");
  const details = [];
  const battleType = body.battleType;

  if (!isBattleType(battleType)) {
    details.push(`battleType must be one of ${Object.values(BattleType).join(", ")}`);
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

export function validateJudgeOutput(output, battleType) {
  assertValidBattleType(battleType);
  const body = ensureObject(output, "judge output");
  const details = [];

  if (!Object.values(WinnerType).includes(body.winnerType)) {
    details.push("winnerType must be OPTION or ENTRY");
  }

  if (battleType === BattleType.OPTION) {
    if (body.winnerType !== WinnerType.OPTION) {
      details.push("OPTION battles must return winnerType OPTION");
    }
    if (!normalizeOptionalString(body.winnerOptionId)) {
      details.push("winnerOptionId is required for OPTION battles");
    }
    if (!Array.isArray(body.optionScores)) {
      details.push("optionScores is required for OPTION battles");
    }
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
  }

  if (!Array.isArray(body.scoreTable) || body.scoreTable.length === 0) {
    details.push("scoreTable must be a non-empty array");
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
    topEntries: body.topEntries,
    optionScores: battleType === BattleType.OPTION ? body.optionScores : undefined,
    scoreTable: body.scoreTable,
    verdictTitle: String(body.verdictTitle),
    verdictText: String(body.verdictText),
    shareSummary: String(body.shareSummary)
  };
}

export function toResultResponse({ battle, entries, verdict, settlement }) {
  return {
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
  };
}

function ensureObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractValidationError(`Invalid ${label}`, [`${label} must be an object`]);
  }
  return value;
}

function normalizeOptionalString(value) {
  return typeof value === "string" ? value.trim() : "";
}
