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

export const BattleDisplayStatus = Object.freeze({
  OPEN: "OPEN",
  CLOSED: "CLOSED",
  EVALUATING: "EVALUATING",
  COMPLETED: "COMPLETED",
  EXPIRED: "EXPIRED",
  FAILED: "FAILED"
});

export const WinnerType = Object.freeze({
  OPTION: "OPTION",
  ENTRY: "ENTRY"
});

export const WalletProvider = Object.freeze({
  METAMASK: "MetaMask",
  OKX: "OKX Wallet",
  WALLET_CONNECT: "WalletConnect",
  INJECTED: "Injected",
  OTHER: "Other"
});

export const CreditTransactionReason = Object.freeze({
  DEMO_CHARGE: "DEMO_CHARGE",
  MNT_EXCHANGE: "MNT_EXCHANGE",
  PARTICIPATION_SPEND: "PARTICIPATION_SPEND",
  REWARD_CLAIM: "REWARD_CLAIM"
});

export const BattleTypeValues = Object.freeze(Object.values(BattleType));
export const BattleStatusValues = Object.freeze(Object.values(BattleStatus));
export const BattleDisplayStatusValues = Object.freeze(Object.values(BattleDisplayStatus));
export const WinnerTypeValues = Object.freeze(Object.values(WinnerType));
export const WalletProviderValues = Object.freeze(Object.values(WalletProvider));
export const CreditTransactionReasonValues = Object.freeze(Object.values(CreditTransactionReason));

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
export const MAX_TITLE_LENGTH = 120;
export const MAX_DESCRIPTION_LENGTH = 1000;
export const MAX_OPTION_LENGTH = 80;
export const MIN_OPTION_COUNT = 2;
export const MAX_OPTION_COUNT = 4;
export const MAX_NICKNAME_LENGTH = 32;
export const MAX_INTRO_LENGTH = 160;
export const MAX_PROFILE_IMAGE_URL_LENGTH = 2048;
export const MAX_WALLET_PROVIDER_LENGTH = 32;
export const MAX_SHARE_CHANNEL_LENGTH = 32;
export const MAX_SOCIAL_COMMENT_LENGTH = 500;
export const MAX_DEMO_CREDIT_CHARGE = 1000;
export const MAX_CREDIT_EXCHANGE_CREDITS = 1000;
export const DEFAULT_PARTICIPATION_COST = 3;
export const DEFAULT_REWARD_CREDITS = 30;
export const MANTLE_TESTNET_CHAIN_ID = 5003;
export const MNT_SYMBOL = "MNT";
export const MNT_DECIMALS = 18;
export const DEFAULT_CREDIT_EXCHANGE_CONFIRMATIONS = 1;
export const RESERVED_NICKNAMES = Object.freeze(["무기기", "mgg", "관리자", "admin"]);
export const CREDIT_EXCHANGE_ENV_KEYS = Object.freeze([
  "MANTLE_CREDIT_EXCHANGE_ENABLED",
  "MOCK_CREDIT_EXCHANGE",
  "MANTLE_CREDIT_TREASURY_ADDRESS",
  "MANTLE_CREDIT_CHAIN_ID",
  "MANTLE_CREDIT_RPC_URL",
  "MANTLE_CREDIT_CONFIRMATIONS",
  "MNT_CREDIT_RATE"
]);
export const DEFAULT_CREDIT_PACKAGES = Object.freeze(
  [
    { credits: 10, priceMnt: "0.01", priceWei: mntToWeiString("0.01") },
    { credits: 30, priceMnt: "0.03", priceWei: mntToWeiString("0.03") },
    { credits: 50, priceMnt: "0.05", priceWei: mntToWeiString("0.05") },
    { credits: 100, priceMnt: "0.1", priceWei: mntToWeiString("0.1") },
    { credits: 200, priceMnt: "0.2", priceWei: mntToWeiString("0.2") },
    { credits: 300, priceMnt: "0.3", priceWei: mntToWeiString("0.3") }
  ].map((creditPackage) => Object.freeze(creditPackage))
);

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

export function isBattleDisplayStatus(value) {
  return BattleDisplayStatusValues.includes(value);
}

export function assertValidBattleType(value) {
  if (!isBattleType(value)) {
    throw new ContractValidationError("Invalid battleType", [
      `battleType must be one of ${BattleTypeValues.join(", ")}`
    ]);
  }
}

export function isEvmAddress(value) {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);
}

export function normalizeEvmAddress(value) {
  const walletAddress = normalizeOptionalString(value);
  return isEvmAddress(walletAddress) ? walletAddress.toLowerCase() : "";
}

export function assertValidEvmAddress(value, label = "walletAddress") {
  if (!isEvmAddress(value)) {
    throw new ContractValidationError(`Invalid ${label}`, [`${label} must be an EVM address`]);
  }
}

export function isTxHash(value) {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value);
}

export function normalizeTxHash(value) {
  const txHash = normalizeOptionalString(value);
  return isTxHash(txHash) ? txHash.toLowerCase() : "";
}

export function getDefaultCreditPackages() {
  return DEFAULT_CREDIT_PACKAGES.map((creditPackage) => ({ ...creditPackage }));
}

export function findCreditPackageByCredits(credits, packages = DEFAULT_CREDIT_PACKAGES) {
  const normalizedCredits = Number(credits);
  return packages.find((creditPackage) => creditPackage.credits === normalizedCredits) ?? null;
}

export function mntToWeiString(value) {
  const text = String(value).trim();
  if (!/^\d+(?:\.\d{1,18})?$/.test(text)) {
    throw new ContractValidationError("Invalid MNT amount", ["MNT amount must be a decimal string"]);
  }

  const [whole, fraction = ""] = text.split(".");
  const paddedFraction = fraction.padEnd(MNT_DECIMALS, "0");
  return (BigInt(whole) * 10n ** BigInt(MNT_DECIMALS) + BigInt(paddedFraction || "0")).toString();
}

export function validateCreateBattleRequest(input) {
  const body = ensureObject(input, "request body");
  const details = [];
  const battleType = body.battleType;

  if (!isBattleType(battleType)) {
    details.push(`battleType must be one of ${BattleTypeValues.join(", ")}`);
  }

  const title = normalizeOptionalString(body.title);
  const content = normalizeOptionalString(body.content);
  const description = normalizeOptionalString(body.description) || content;
  const prompt = normalizeOptionalString(body.prompt) || title || content;
  const imageUrl = normalizeOptionalString(body.imageUrl);
  const deadlineAt = normalizeDeadline(body.deadlineAt ?? body.deadline);
  const isAnonymous = Boolean(body.isAnonymous);
  const recommendedScore = normalizeRecommendedScore(body.recommendedScore);
  const normalized = {
    battleType,
    prompt,
    title: title || prompt,
    description: description || null,
    imageUrl,
    deadlineAt,
    isAnonymous,
    recommendedScore,
    options: [],
    createdByUserId: normalizeOptionalString(body.createdByUserId)
  };

  if (battleType === BattleType.OPTION || battleType === BattleType.TEXT_OPEN) {
    if (!prompt) {
      details.push("prompt or title is required");
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

  if (title && title.length > MAX_TITLE_LENGTH) {
    details.push(`title must be ${MAX_TITLE_LENGTH} characters or fewer`);
  }

  if (description && description.length > MAX_DESCRIPTION_LENGTH) {
    details.push(`description/content must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`);
  }

  if ((body.deadlineAt !== undefined || body.deadline !== undefined) && !deadlineAt) {
    details.push("deadline must be a valid date or YYYY-MM-DD HH:mm string");
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

export function validateParticipationRequest(input, battle) {
  const body = input === undefined ? {} : ensureObject(input, "request body");
  const details = [];
  const optionId = normalizeOptionalString(body.optionId);
  const optionText = normalizeOptionalString(body.optionText);

  if (battle.battleType === BattleType.OPTION && !optionId && !optionText) {
    details.push("optionId or optionText is required for OPTION battle participation");
  }

  if (battle.battleType !== BattleType.OPTION && (optionId || optionText)) {
    details.push("option selection is only allowed for OPTION battle participation");
  }

  if (details.length > 0) {
    throw new ContractValidationError("Invalid participation request", details);
  }

  return {
    optionId: optionId || null,
    optionText: optionText || null
  };
}

export function validateWalletChallengeRequest(input) {
  const body = ensureObject(input, "request body");
  const details = [];
  const walletAddress = normalizeOptionalString(body.walletAddress);
  const walletProvider = normalizeWalletProvider(body.walletProvider);

  if (!isEvmAddress(walletAddress)) {
    details.push("walletAddress must be an EVM address");
  }

  if (walletProvider && walletProvider.length > MAX_WALLET_PROVIDER_LENGTH) {
    details.push(`walletProvider must be ${MAX_WALLET_PROVIDER_LENGTH} characters or fewer`);
  }

  if (details.length > 0) {
    throw new ContractValidationError("Invalid wallet challenge request", details);
  }

  return {
    walletAddress,
    walletAddressNormalized: normalizeEvmAddress(walletAddress),
    walletProvider
  };
}

export function validateWalletVerifyRequest(input) {
  const body = ensureObject(input, "request body");
  const details = [];
  const challengeId = normalizeOptionalString(body.challengeId);
  const walletAddress = normalizeOptionalString(body.walletAddress);
  const walletProvider = normalizeWalletProvider(body.walletProvider);
  const signature = normalizeOptionalString(body.signature);

  if (!challengeId) {
    details.push("challengeId is required");
  }
  if (!isEvmAddress(walletAddress)) {
    details.push("walletAddress must be an EVM address");
  }
  if (!/^0x[a-fA-F0-9]+$/.test(signature)) {
    details.push("signature must be a hex string");
  }
  if (walletProvider && walletProvider.length > MAX_WALLET_PROVIDER_LENGTH) {
    details.push(`walletProvider must be ${MAX_WALLET_PROVIDER_LENGTH} characters or fewer`);
  }

  if (details.length > 0) {
    throw new ContractValidationError("Invalid wallet verification request", details);
  }

  return {
    challengeId,
    walletAddress,
    walletAddressNormalized: normalizeEvmAddress(walletAddress),
    walletProvider,
    signature
  };
}

export function validateDemoCreditChargeRequest(input) {
  const body = ensureObject(input, "request body");
  const details = [];
  const credits = Number(body.credits);
  const priceMnt = body.priceMnt === undefined || body.priceMnt === null ? null : Number(body.priceMnt);

  if (!Number.isInteger(credits) || credits <= 0 || credits > MAX_DEMO_CREDIT_CHARGE) {
    details.push(`credits must be an integer between 1 and ${MAX_DEMO_CREDIT_CHARGE}`);
  }

  if (priceMnt !== null && (!Number.isFinite(priceMnt) || priceMnt < 0)) {
    details.push("priceMnt must be a non-negative number when provided");
  }

  if (details.length > 0) {
    throw new ContractValidationError("Invalid demo credit charge request", details);
  }

  return {
    credits,
    priceMnt
  };
}

export function validateCreditPackage(input) {
  const body = ensureObject(input, "credit package");
  const details = [];
  const credits = Number(body.credits);
  const priceMnt = normalizeOptionalString(body.priceMnt);
  const priceWei = normalizeOptionalString(body.priceWei);

  if (!Number.isInteger(credits) || credits <= 0 || credits > MAX_CREDIT_EXCHANGE_CREDITS) {
    details.push(`credits must be an integer between 1 and ${MAX_CREDIT_EXCHANGE_CREDITS}`);
  }

  if (!priceMnt) {
    details.push("priceMnt is required");
  } else {
    try {
      const calculatedPriceWei = mntToWeiString(priceMnt);
      if (priceWei && priceWei !== calculatedPriceWei) {
        details.push("priceWei must match priceMnt");
      }
    } catch (error) {
      details.push(...(error.details ?? ["priceMnt must be a valid MNT amount"]));
    }
  }

  if (priceWei && !isPositiveIntegerString(priceWei)) {
    details.push("priceWei must be a positive integer string");
  }

  if (details.length > 0) {
    throw new ContractValidationError("Invalid credit package", details);
  }

  return {
    credits,
    priceMnt,
    priceWei: priceWei || mntToWeiString(priceMnt)
  };
}

export function validateCreditQuoteRequest(input, packages = DEFAULT_CREDIT_PACKAGES) {
  const body = ensureObject(input, "request body");
  const details = [];
  const credits = Number(body.credits);
  const walletAddress = normalizeOptionalString(body.walletAddress);
  const creditPackage = findCreditPackageByCredits(credits, packages);

  if (!Number.isInteger(credits) || credits <= 0 || credits > MAX_CREDIT_EXCHANGE_CREDITS) {
    details.push(`credits must be an integer between 1 and ${MAX_CREDIT_EXCHANGE_CREDITS}`);
  } else if (!creditPackage) {
    details.push("credits must match a supported credit package");
  }

  if (walletAddress && !isEvmAddress(walletAddress)) {
    details.push("walletAddress must be an EVM address when provided");
  }

  if (details.length > 0) {
    throw new ContractValidationError("Invalid credit quote request", details);
  }

  return {
    credits,
    walletAddress: walletAddress || null,
    walletAddressNormalized: walletAddress ? normalizeEvmAddress(walletAddress) : null,
    package: { ...creditPackage }
  };
}

export function validateCreditQuoteResponse(input) {
  const body = ensureObject(input, "credit quote response");
  const quote = body.quote && typeof body.quote === "object" && !Array.isArray(body.quote) ? body.quote : body;
  const details = [];
  const id = normalizeOptionalString(quote.id);
  const credits = Number(quote.credits);
  const priceMnt = normalizeOptionalString(quote.priceMnt);
  const priceWei = normalizeOptionalString(quote.priceWei);
  const tokenSymbol = normalizeOptionalString(quote.tokenSymbol) || MNT_SYMBOL;
  const chainId = Number(quote.chainId);
  const receiverAddress = normalizeOptionalString(quote.receiverAddress);
  const walletAddress = normalizeOptionalString(quote.walletAddress);
  const expiresAt = normalizeOptionalString(quote.expiresAt);

  if (!id) {
    details.push("quote.id is required");
  }
  if (!Number.isInteger(credits) || credits <= 0 || credits > MAX_CREDIT_EXCHANGE_CREDITS) {
    details.push(`quote.credits must be an integer between 1 and ${MAX_CREDIT_EXCHANGE_CREDITS}`);
  }
  if (!priceMnt) {
    details.push("quote.priceMnt is required");
  }
  if (!isPositiveIntegerString(priceWei)) {
    details.push("quote.priceWei must be a positive integer string");
  }
  if (!Number.isInteger(chainId) || chainId <= 0) {
    details.push("quote.chainId must be a positive integer");
  }
  if (!isEvmAddress(receiverAddress)) {
    details.push("quote.receiverAddress must be an EVM address");
  }
  if (walletAddress && !isEvmAddress(walletAddress)) {
    details.push("quote.walletAddress must be an EVM address when provided");
  }
  if (!isIsoDateString(expiresAt)) {
    details.push("quote.expiresAt must be an ISO date string");
  }

  if (details.length > 0) {
    throw new ContractValidationError("Invalid credit quote response", details);
  }

  return {
    id,
    credits,
    priceMnt,
    priceWei,
    tokenSymbol,
    chainId,
    receiverAddress,
    receiverAddressNormalized: normalizeEvmAddress(receiverAddress),
    walletAddress: walletAddress || null,
    walletAddressNormalized: walletAddress ? normalizeEvmAddress(walletAddress) : null,
    expiresAt
  };
}

export function validateCreditExchangeRequest(input) {
  const body = ensureObject(input, "request body");
  const details = [];
  const quoteId = normalizeOptionalString(body.quoteId);
  const txHash = normalizeOptionalString(body.txHash);

  if (!quoteId) {
    details.push("quoteId is required");
  }
  if (!isTxHash(txHash)) {
    details.push("txHash must be a 32-byte transaction hash");
  }

  if (details.length > 0) {
    throw new ContractValidationError("Invalid credit exchange request", details);
  }

  return {
    quoteId,
    txHash,
    txHashNormalized: normalizeTxHash(txHash)
  };
}

export function validateCreditExchangeMetadata(input) {
  const body = ensureObject(input, "credit exchange metadata");
  const details = [];
  const quoteId = normalizeOptionalString(body.quoteId);
  const chainId = Number(body.chainId);
  const txHash = normalizeOptionalString(body.txHash);
  const from = normalizeOptionalString(body.from);
  const to = normalizeOptionalString(body.to);
  const valueWei = normalizeOptionalString(body.valueWei);
  const confirmations = body.confirmations === undefined || body.confirmations === null ? null : Number(body.confirmations);

  if (quoteId === "") {
    details.push("quoteId is required");
  }
  if (!Number.isInteger(chainId) || chainId <= 0) {
    details.push("chainId must be a positive integer");
  }
  if (!isTxHash(txHash)) {
    details.push("txHash must be a 32-byte transaction hash");
  }
  if (!isEvmAddress(from)) {
    details.push("from must be an EVM address");
  }
  if (!isEvmAddress(to)) {
    details.push("to must be an EVM address");
  }
  if (!isPositiveIntegerString(valueWei)) {
    details.push("valueWei must be a positive integer string");
  }
  if (confirmations !== null && (!Number.isInteger(confirmations) || confirmations < 0)) {
    details.push("confirmations must be a non-negative integer when provided");
  }

  if (details.length > 0) {
    throw new ContractValidationError("Invalid credit exchange metadata", details);
  }

  return {
    quoteId,
    chainId,
    txHash,
    txHashNormalized: normalizeTxHash(txHash),
    from,
    fromNormalized: normalizeEvmAddress(from),
    to,
    toNormalized: normalizeEvmAddress(to),
    valueWei,
    confirmations
  };
}

export function validateCreditExchangeResponse(input) {
  const body = ensureObject(input, "credit exchange response");
  const transaction = ensureNestedObject(body.transaction, "transaction", []);
  const details = [];
  const balance = Number(body.balance);

  if (!Number.isInteger(balance) || balance < 0) {
    details.push("balance must be a non-negative integer");
  }

  if (!transaction) {
    details.push("transaction must be an object");
  } else {
    if (!normalizeOptionalString(transaction.id)) {
      details.push("transaction.id is required");
    }
    if (!Number.isInteger(Number(transaction.amount)) || Number(transaction.amount) <= 0) {
      details.push("transaction.amount must be a positive integer");
    }
    if (transaction.reason !== CreditTransactionReason.MNT_EXCHANGE) {
      details.push(`transaction.reason must be ${CreditTransactionReason.MNT_EXCHANGE}`);
    }
    if (!Number.isInteger(Number(transaction.balanceAfter)) || Number(transaction.balanceAfter) < 0) {
      details.push("transaction.balanceAfter must be a non-negative integer");
    }
    try {
      validateCreditExchangeMetadata(transaction.metadata ?? transaction.metadataJson);
    } catch (error) {
      details.push(...(error.details ?? [error.message]));
    }
  }

  if (details.length > 0) {
    throw new ContractValidationError("Invalid credit exchange response", details);
  }

  return {
    balance,
    transaction: {
      id: String(transaction.id),
      amount: Number(transaction.amount),
      reason: transaction.reason,
      balanceAfter: Number(transaction.balanceAfter),
      metadata: validateCreditExchangeMetadata(transaction.metadata ?? transaction.metadataJson)
    }
  };
}

export function validateSocialCommentRequest(input) {
  const body = ensureObject(input, "request body");
  const details = [];
  const content = normalizeOptionalString(body.content) || normalizeOptionalString(body.text);
  const targetEntryId = normalizeOptionalString(body.targetEntryId);

  if (!content) {
    details.push("content or text is required");
  } else if (content.length > MAX_SOCIAL_COMMENT_LENGTH) {
    details.push(`content must be ${MAX_SOCIAL_COMMENT_LENGTH} characters or fewer`);
  }

  if (body.targetEntryId !== undefined && !targetEntryId) {
    details.push("targetEntryId must be a non-empty string when provided");
  }

  if (details.length > 0) {
    throw new ContractValidationError("Invalid social comment request", details);
  }

  return {
    content,
    targetEntryId: targetEntryId || null
  };
}

export function validateBattleShareRequest(input) {
  const body = input === undefined ? {} : ensureObject(input, "request body");
  const channel = normalizeNullableString(body.channel);

  if (channel && channel.length > MAX_SHARE_CHANNEL_LENGTH) {
    throw new ContractValidationError("Invalid battle share request", [
      `channel must be ${MAX_SHARE_CHANNEL_LENGTH} characters or fewer`
    ]);
  }

  return { channel };
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

export function validateUpdateUserProfileRequest(input) {
  const body = ensureObject(input, "request body");
  const details = [];
  const normalized = {};

  if (Object.hasOwn(body, "nickname")) {
    const nickname = normalizeOptionalString(body.nickname);
    if (!nickname) {
      details.push("nickname must be a non-empty string");
    } else if (nickname.length > MAX_NICKNAME_LENGTH) {
      details.push(`nickname must be ${MAX_NICKNAME_LENGTH} characters or fewer`);
    } else if (isReservedNickname(nickname)) {
      details.push("nickname is reserved");
    }
    normalized.nickname = nickname;
  }

  if (Object.hasOwn(body, "intro")) {
    const intro = normalizeNullableString(body.intro);
    if (intro && intro.length > MAX_INTRO_LENGTH) {
      details.push(`intro must be ${MAX_INTRO_LENGTH} characters or fewer`);
    }
    normalized.intro = intro;
  }

  if (Object.hasOwn(body, "avatarUrl")) {
    const avatarUrl = normalizeNullableString(body.avatarUrl);
    if (avatarUrl && avatarUrl.length > MAX_PROFILE_IMAGE_URL_LENGTH) {
      details.push(`avatarUrl must be ${MAX_PROFILE_IMAGE_URL_LENGTH} characters or fewer`);
    }
    normalized.avatarUrl = avatarUrl;
  }

  if (Object.hasOwn(body, "walletProvider") || Object.hasOwn(body, "walletAddress")) {
    details.push("wallet fields must be linked through wallet challenge verification");
  }

  if (Object.keys(normalized).length === 0) {
    details.push("At least one profile field is required");
  }

  if (details.length > 0) {
    throw new ContractValidationError("Invalid user profile update request", details);
  }

  return normalized;
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

function normalizeNullableString(value) {
  if (value === null) {
    return null;
  }
  const normalized = normalizeOptionalString(value);
  return normalized || null;
}

function normalizeWalletProvider(value) {
  return normalizeNullableString(value);
}

function isPositiveIntegerString(value) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return false;
  }
  try {
    return BigInt(value) > 0n;
  } catch {
    return false;
  }
}

function isIsoDateString(value) {
  if (!normalizeOptionalString(value)) {
    return false;
  }
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

function isReservedNickname(value) {
  const normalized = value.toLowerCase();
  return RESERVED_NICKNAMES.some((nickname) => nickname.toLowerCase() === normalized);
}

function normalizeScore(value) {
  return Number(value);
}

function normalizeRecommendedScore(value) {
  if (value === undefined || value === null || value === "") {
    return 50;
  }

  const score = Number(value);
  if (!Number.isFinite(score)) {
    return 50;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeDeadline(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  const simple = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?$/);
  if (simple) {
    const [, year, month, day, hour = "23", minute = "59"] = simple;
    const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
    if (
      date.getFullYear() === Number(year) &&
      date.getMonth() === Number(month) - 1 &&
      date.getDate() === Number(day) &&
      date.getHours() === Number(hour) &&
      date.getMinutes() === Number(minute)
    ) {
      return date.toISOString();
    }
    return null;
  }

  const parsed = new Date(trimmed);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
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
