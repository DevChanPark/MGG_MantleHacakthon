import { randomBytes } from "node:crypto";
import {
  assertCanCloseBattle,
  assertCanJudgeBattle,
  assertCanSubmitEntry,
  assertBattleStatusTransition,
  buildVerdictHashPackage,
  getJudgingRules,
  sha256Hex
} from "../../../../packages/core/src/index.js";
import {
  BattleStatus,
  CreditTransactionReason,
  DEFAULT_CREDIT_PACKAGES,
  DEFAULT_PARTICIPATION_COST,
  DEFAULT_REWARD_CREDITS,
  MANTLE_TESTNET_CHAIN_ID,
  MNT_SYMBOL,
  isEvmAddress,
  normalizeEvmAddress,
  validateCreateBattleRequest,
  validateCreateEntryRequest,
  validateBattleShareRequest,
  validateCreditExchangeMetadata,
  validateCreditExchangeRequest,
  validateCreditExchangeResponse,
  validateCreditQuoteRequest,
  validateCreditQuoteResponse,
  validateDemoCreditChargeRequest,
  validateJudgeInput,
  validateParticipationRequest,
  validateSocialCommentRequest,
  validateUpdateUserProfileRequest,
  validateWalletChallengeRequest,
  validateWalletVerifyRequest,
  toResultResponse
} from "../../../../packages/shared/src/index.js";
import { ApiError, sanitizeFailureMessage } from "../errors.js";
import { validateJudgeOutputReferences } from "./aiJudgeService.js";
import { moderateEntryContent } from "./moderationService.js";

const MAX_REPORT_REASON_LENGTH = 240;
const WALLET_CHALLENGE_TTL_MS = 5 * 60 * 1000;
const CREDIT_QUOTE_TTL_MS = 5 * 60 * 1000;

export function createBattleService({ repository, aiJudgeService, settlementService, config }) {
  return {
    createBattle: (input, userId) => createBattle(repository, input, userId),
    listBattles: () => listBattles(repository),
    listFeedBattles: (userId) => listFeedBattles(repository, userId),
    getFeedBattle: (battleId, userId) => getFeedBattle(repository, battleId, userId),
    getBattle: (battleId) => getBattleOrThrow(repository, battleId),
    getBattleDetail: (battleId, userId) => getBattleDetail(repository, battleId, userId),
    submitEntry: (battleId, input, userId) => submitEntry(repository, battleId, input, userId),
    createReport: (battleId, input, userId) => createReport(repository, battleId, input, userId),
    createSocialComment: (battleId, input, userId) => createSocialComment(repository, battleId, input, userId),
    listSocialComments: (battleId) => listSocialComments(repository, battleId),
    setEntryLike: (entryId, userId, liked) => setEntryLike(repository, entryId, userId, liked),
    setBattleLike: (battleId, userId, liked) => setBattleLike(repository, battleId, userId, liked),
    shareBattle: (battleId, input, userId) => shareBattle(repository, battleId, input, userId),
    participateInBattle: (battleId, input, userId) => participateInBattle(repository, battleId, input, userId),
    createFeedComment: (battleId, input, userId) => createFeedComment(repository, battleId, input, userId),
    createFeedReply: (entryId, input, userId) => createFeedReply(repository, entryId, input, userId),
    evaluateFeedBattle: (battleId) => evaluateFeedBattle(repository, aiJudgeService, settlementService, config, battleId),
    claimFeedReward: (battleId, userId) => claimFeedReward(repository, battleId, userId),
    listNotifications: (userId) => listNotifications(repository, userId),
    markNotificationRead: (notificationId, userId) => markNotificationRead(repository, notificationId, userId),
    markAllNotificationsRead: (userId) => markAllNotificationsRead(repository, userId),
    closeBattle: (battleId) => closeBattle(repository, battleId),
    judgeBattle: (battleId) => judgeBattle(repository, aiJudgeService, settlementService, config, battleId),
    getResult: (battleId) => getResult(repository, battleId),
    listArchive: () => listArchive(repository),
    getOrCreateUser: (userId) => repository.getOrCreateUser(userId),
    updateUserProfile: (input, userId) => updateUserProfile(repository, input, userId),
    createWalletChallenge: (input, userId) => createWalletChallenge(repository, input, userId),
    verifyWallet: (input, userId) => verifyWallet(repository, input, userId),
    getCredits: (userId) => getCredits(repository, userId),
    chargeDemoCredits: (input, userId) => chargeDemoCredits(repository, input, userId),
    getCreditPackages: () => getCreditPackages(config),
    createCreditQuote: (input, userId) => createCreditQuote(repository, input, userId, config),
    exchangeCredits: (input, userId) => exchangeCredits(repository, input, userId, config),
    listMyBattles: (userId) => listMyBattles(repository, userId),
    listMyComments: (userId) => listMyComments(repository, userId),
    listMyLikes: (userId) => listMyLikes(repository, userId)
  };
}

async function createBattle(repository, input, userId) {
  const normalized = validateCreateBattleRequest(input);
  const user = await repository.getOrCreateUser(userId);
  const rulesJson = getJudgingRules(normalized.battleType);
  return repository.createBattle({
    ...normalized,
    createdByUserId: user.id,
    judgingRule: {
      rulesJson,
      rulesHash: sha256Hex(rulesJson)
    }
  });
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

  const user = await repository.getOrCreateUser(userId);
  const entry = await repository.addEntry({
    battleId,
    content: normalized.content,
    optionId: normalized.optionId,
    submittedByUserId: user.id,
    expectedBattleStatus: BattleStatus.OPEN
  });

  if (!entry) {
    throw new ApiError(409, "BATTLE_NOT_OPEN", "Entries can only be submitted while battle status is OPEN");
  }

  return entry;
}

async function listBattles(repository) {
  return addBattleStats(repository, await repository.listBattles());
}

async function listFeedBattles(repository, userId) {
  const user = await repository.getOrCreateUser(userId);
  const battles = await repository.listBattles();
  return Promise.all(battles.map((battle) => toFeedBattle(repository, battle, user.id)));
}

async function getFeedBattle(repository, battleId, userId) {
  const user = await repository.getOrCreateUser(userId);
  return toFeedBattle(repository, await getBattleOrThrow(repository, battleId), user.id);
}

async function listArchive(repository) {
  return addBattleStats(repository, await repository.listArchive());
}

async function getBattleDetail(repository, battleId, userId) {
  const [battle, entries] = await Promise.all([
    getBattleOrThrow(repository, battleId),
    repository.listEntriesByBattle(battleId)
  ]);

  return {
    battle: await addOneBattleStats(repository, battle),
    entries: await addEntryStats(repository, entries, userId)
  };
}

async function createReport(repository, battleId, input, userId) {
  await getBattleOrThrow(repository, battleId);
  const normalized = validateCreateReportRequest(input);

  if (normalized.targetEntryId) {
    const entries = await repository.listEntriesByBattle(battleId);
    if (!entries.some((entry) => entry.id === normalized.targetEntryId)) {
      throw new ApiError(400, "INVALID_REPORT_TARGET", "targetEntryId does not belong to this battle");
    }
  }

  const user = await repository.getOrCreateUser(userId);
  return repository.createReport({
    battleId,
    reporterUserId: user.id,
    targetEntryId: normalized.targetEntryId,
    reason: normalized.reason
  });
}

async function createSocialComment(repository, battleId, input, userId) {
  await getBattleOrThrow(repository, battleId);
  const normalized = validateSocialCommentRequest(input);

  if (normalized.targetEntryId) {
    const entry = await repository.getEntry(normalized.targetEntryId);
    if (!entry || entry.battleId !== battleId) {
      throw new ApiError(400, "INVALID_COMMENT_TARGET", "targetEntryId does not belong to this battle");
    }
  }

  const user = await repository.getOrCreateUser(userId);
  return repository.createSocialComment({
    battleId,
    targetEntryId: normalized.targetEntryId,
    authorUserId: user.id,
    content: normalized.content
  });
}

async function listSocialComments(repository, battleId) {
  await getBattleOrThrow(repository, battleId);
  return repository.listSocialCommentsByBattle(battleId);
}

async function setEntryLike(repository, entryId, userId, liked) {
  const entry = await repository.getEntry(entryId);
  if (!entry) {
    throw new ApiError(404, "ENTRY_NOT_FOUND", "Entry not found");
  }

  const user = await repository.getOrCreateUser(userId);
  return repository.setEntryLike(entryId, user.id, liked);
}

async function setBattleLike(repository, battleId, userId, liked) {
  await getBattleOrThrow(repository, battleId);
  const user = await repository.getOrCreateUser(userId);
  return repository.setBattleLike(battleId, user.id, liked);
}

async function participateInBattle(repository, battleId, input, userId) {
  const battle = await getBattleOrThrow(repository, battleId);
  if (getFeedStatus(battle) !== "OPEN") {
    throw new ApiError(409, "BATTLE_NOT_OPEN", "Only open battles can be participated in");
  }

  const normalized = validateParticipationRequest(input, battle);
  const user = await repository.getOrCreateUser(userId);
  const existing = await repository.getParticipation(battleId, user.id);
  if (existing) {
    return {
      participation: existing,
      balance: user.creditBalance ?? 0,
      selectedOption: getOptionTextById(battle, existing.optionId),
      alreadyParticipated: true
    };
  }

  let optionId = normalized.optionId;
  if (battle.battleType === "OPTION") {
    const option = optionId
      ? battle.options.find((item) => item.id === optionId)
      : battle.options.find((item) => item.text === normalized.optionText);
    if (!option) {
      throw new ApiError(400, "INVALID_OPTION", "Selected option does not belong to this battle");
    }
    optionId = option.id;
  }

  let participationResult;
  try {
    participationResult = await repository.createParticipationWithCreditSpend({
      battleId,
      userId: user.id,
      optionId,
      costCredits: DEFAULT_PARTICIPATION_COST,
      metadataJson: { battleId }
    });
  } catch (error) {
    if (error.code === "INSUFFICIENT_CREDITS") {
      throw new ApiError(402, "INSUFFICIENT_CREDITS", "Not enough demo credits to participate");
    }
    if (error.code === "PARTICIPATION_EXISTS") {
      throw new ApiError(409, "ALREADY_PARTICIPATED", "User already participated in this battle");
    }
    throw error;
  }
  if (!participationResult) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }

  await repository.createNotification?.({
    userId: battle.createdByUserId,
    battleId,
    title: `${user.displayName || user.nickname || "Someone"}님이 참여했습니다.`,
    body: "내 게시글에 새 참여자가 생겼습니다."
  });

  return {
    participation: participationResult.participation,
    balance: participationResult.transaction.balanceAfter,
    selectedOption: getOptionTextById(battle, optionId),
    alreadyParticipated: false
  };
}

async function createFeedComment(repository, battleId, input, userId) {
  const battle = await getBattleOrThrow(repository, battleId);
  if (getFeedStatus(battle) !== "OPEN") {
    throw new ApiError(409, "BATTLE_NOT_OPEN", "Only open battles accept comments");
  }

  const normalized = validateSocialCommentRequest(input);
  const moderation = moderateEntryContent(normalized.content);
  if (!moderation.allowed) {
    throw new ApiError(400, "ENTRY_REJECTED", "Comment did not pass moderation checks");
  }

  const user = await repository.getOrCreateUser(userId);
  const participation = await repository.getParticipation(battleId, user.id);
  if (!participation) {
    throw new ApiError(409, "PARTICIPATION_REQUIRED", "Participate before adding a comment");
  }

  const entry = await repository.addEntry({
    battleId,
    content: normalized.content,
    optionId: battle.battleType === "OPTION" ? participation.optionId : null,
    submittedByUserId: user.id,
    expectedBattleStatus: BattleStatus.OPEN
  });

  if (!entry) {
    throw new ApiError(409, "BATTLE_NOT_OPEN", "Only open battles accept comments");
  }

  await repository.attachEntryToParticipation(participation.id, entry.id);
  return toFeedComment(repository, entry, user.id);
}

async function createFeedReply(repository, parentEntryId, input, userId) {
  const parentEntry = await repository.getEntry(parentEntryId);
  if (!parentEntry) {
    throw new ApiError(404, "COMMENT_NOT_FOUND", "Feed comment not found");
  }

  const battle = await getBattleOrThrow(repository, parentEntry.battleId);
  if (getFeedStatus(battle) !== "OPEN") {
    throw new ApiError(409, "BATTLE_NOT_OPEN", "Only open battles accept replies");
  }

  const normalized = validateSocialCommentRequest(input);
  const moderation = moderateEntryContent(normalized.content);
  if (!moderation.allowed) {
    throw new ApiError(400, "ENTRY_REJECTED", "Reply did not pass moderation checks");
  }

  const user = await repository.getOrCreateUser(userId);
  const participation = await repository.getParticipation(battle.id, user.id);
  if (!participation) {
    throw new ApiError(409, "PARTICIPATION_REQUIRED", "Participate before adding a reply");
  }

  const entry = await repository.addEntry({
    battleId: battle.id,
    content: normalized.content,
    optionId: battle.battleType === "OPTION" ? participation.optionId : parentEntry.optionId || null,
    parentEntryId: parentEntry.id,
    submittedByUserId: user.id,
    expectedBattleStatus: BattleStatus.OPEN
  });

  if (!entry) {
    throw new ApiError(409, "BATTLE_NOT_OPEN", "Only open battles accept replies");
  }

  return toFeedComment(repository, entry, user.id);
}

async function evaluateFeedBattle(repository, aiJudgeService, settlementService, config, battleId) {
  const battle = await getBattleOrThrow(repository, battleId);
  if (battle.status === BattleStatus.OPEN) {
    await closeBattle(repository, battleId);
  }

  const current = await getBattleOrThrow(repository, battleId);
  if (current.status === BattleStatus.SETTLED) {
    const result = await getResult(repository, battleId);
    return {
      ...result,
      feedResult: toFeedResult(result)
    };
  }

  const result = await judgeBattle(repository, aiJudgeService, settlementService, config, battleId);
  return {
    ...result,
    feedResult: toFeedResult(result)
  };
}

async function claimFeedReward(repository, battleId, userId) {
  const user = await repository.getOrCreateUser(userId);
  const result = await getResult(repository, battleId);
  const winnerEntryId = result.verdict?.winnerEntryId;
  const winnerOptionId = result.verdict?.winnerOptionId;
  if (!winnerEntryId && !winnerOptionId) {
    throw new ApiError(409, "REWARD_NOT_AVAILABLE", "No reward winner is available");
  }

  const participation = await repository.getParticipation(battleId, user.id);
  if (!participation) {
    throw new ApiError(409, "PARTICIPATION_REQUIRED", "Participation is required to claim reward");
  }
  if (participation.rewardClaimedAt) {
    throw new ApiError(409, "REWARD_ALREADY_CLAIMED", "Reward was already claimed");
  }

  if (result.verdict?.winnerType === "OPTION" && winnerOptionId) {
    if (participation.optionId !== winnerOptionId) {
      throw new ApiError(403, "NOT_REWARD_WINNER", "Only participants on the winning option can claim this reward");
    }
  } else if (winnerEntryId) {
    const winningEntry = await repository.getEntry(winnerEntryId);
    if (!winningEntry || winningEntry.submittedByUserId !== user.id) {
      throw new ApiError(403, "NOT_REWARD_WINNER", "Only the winning participant can claim this reward");
    }
  }

  let rewardResult;
  try {
    rewardResult = await repository.claimParticipationReward({
      participationId: participation.id,
      userId: user.id,
      amount: DEFAULT_REWARD_CREDITS,
      claimedAt: new Date().toISOString(),
      metadataJson: { battleId, winnerEntryId, winnerOptionId }
    });
  } catch (error) {
    if (error.code === "REWARD_ALREADY_CLAIMED") {
      throw new ApiError(409, "REWARD_ALREADY_CLAIMED", "Reward was already claimed");
    }
    throw error;
  }
  if (!rewardResult) {
    throw new ApiError(409, "REWARD_ALREADY_CLAIMED", "Reward was already claimed");
  }

  await repository.createNotification?.({
    userId: user.id,
    battleId,
    title: "크레딧이 지급되었습니다!",
    body: `우승 보상 ${DEFAULT_REWARD_CREDITS}크레딧이 지급되었습니다.`
  });

  return {
    rewardCredits: DEFAULT_REWARD_CREDITS,
    balance: rewardResult.transaction.balanceAfter,
    transaction: rewardResult.transaction
  };
}

async function listNotifications(repository, userId) {
  const user = await repository.getOrCreateUser(userId);
  const notifications = await repository.listNotificationsByUser?.(user.id) ?? [];
  return notifications.map(toNotificationDto);
}

async function markNotificationRead(repository, notificationId, userId) {
  const user = await repository.getOrCreateUser(userId);
  const notification = await repository.markNotificationRead?.(notificationId, user.id, new Date().toISOString());
  if (!notification) {
    throw new ApiError(404, "NOTIFICATION_NOT_FOUND", "Notification not found");
  }
  return {
    notification: toNotificationDto(notification)
  };
}

async function markAllNotificationsRead(repository, userId) {
  const user = await repository.getOrCreateUser(userId);
  const result = await repository.markAllNotificationsRead?.(user.id, new Date().toISOString());
  return {
    readCount: result?.readCount ?? 0,
    notifications: (result?.notifications ?? []).map(toNotificationDto)
  };
}

async function shareBattle(repository, battleId, input, userId) {
  await getBattleOrThrow(repository, battleId);
  const normalized = validateBattleShareRequest(input);
  const user = await repository.getOrCreateUser(userId);
  const share = await repository.createBattleShare({
    battleId,
    userId: user.id,
    channel: normalized.channel
  });
  return {
    share,
    shareCount: await repository.getBattleShareCount(battleId)
  };
}

async function updateUserProfile(repository, input, userId) {
  const normalized = validateUpdateUserProfileRequest(input);
  const user = await repository.getOrCreateUser(userId);

  if (normalized.nickname && repository.getUserByNickname) {
    const existing = await repository.getUserByNickname(normalized.nickname);
    if (existing && existing.id !== user.id) {
      throw new ApiError(409, "NICKNAME_TAKEN", "Nickname is already taken");
    }
  }

  if (normalized.walletAddress && repository.getUserByWalletAddressNormalized) {
    const existing = await repository.getUserByWalletAddressNormalized(normalized.walletAddress.toLowerCase());
    if (existing && existing.id !== user.id) {
      throw new ApiError(409, "WALLET_ALREADY_LINKED", "Wallet is already linked to another user");
    }
  }

  try {
    const updated = await repository.updateUserProfile(user.id, normalized);
    if (!updated) {
      throw new ApiError(404, "USER_NOT_FOUND", "User not found");
    }
    return updated;
  } catch (error) {
    if (error.code === "NICKNAME_TAKEN") {
      throw new ApiError(409, "NICKNAME_TAKEN", "Nickname is already taken");
    }
    if (error.code === "WALLET_ALREADY_LINKED") {
      throw new ApiError(409, "WALLET_ALREADY_LINKED", "Wallet is already linked to another user");
    }
    throw error;
  }
}

async function createWalletChallenge(repository, input, userId) {
  const normalized = validateWalletChallengeRequest(input);
  const user = await repository.getOrCreateUser(userId);
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + WALLET_CHALLENGE_TTL_MS);
  const nonce = randomBytes(16).toString("hex");
  const message = buildWalletChallengeMessage({
    walletAddress: normalized.walletAddress,
    nonce,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString()
  });

  const challenge = await repository.createWalletChallenge({
    userId: user.id,
    walletAddress: normalized.walletAddress,
    walletAddressNormalized: normalized.walletAddressNormalized,
    walletProvider: normalized.walletProvider,
    nonce,
    message,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString()
  });

  return {
    challenge: publicWalletChallenge(challenge)
  };
}

async function verifyWallet(repository, input, userId) {
  const normalized = validateWalletVerifyRequest(input);
  const challenge = await repository.getWalletChallenge(normalized.challengeId);
  if (!challenge) {
    throw new ApiError(404, "WALLET_CHALLENGE_NOT_FOUND", "Wallet challenge not found");
  }
  if (challenge.usedAt) {
    throw new ApiError(409, "WALLET_CHALLENGE_USED", "Wallet challenge was already used");
  }
  if (new Date(challenge.expiresAt).getTime() < Date.now()) {
    throw new ApiError(409, "WALLET_CHALLENGE_EXPIRED", "Wallet challenge expired");
  }
  if (challenge.walletAddressNormalized !== normalized.walletAddressNormalized) {
    throw new ApiError(400, "WALLET_CHALLENGE_MISMATCH", "walletAddress does not match the challenge");
  }

  if (!(await verifyWalletSignature(challenge.message, normalized.walletAddress, normalized.signature))) {
    throw new ApiError(401, "INVALID_WALLET_SIGNATURE", "Wallet signature could not be verified");
  }

  const user = await repository.getOrCreateUser(challenge.userId || userId);
  const existing = await repository.getUserByWalletAddressNormalized?.(normalized.walletAddressNormalized);
  if (existing && existing.id !== user.id) {
    throw new ApiError(409, "WALLET_ALREADY_LINKED", "Wallet is already linked to another user");
  }

  let linked;
  try {
    linked = await repository.linkWalletToUser(user.id, {
      walletAddress: normalized.walletAddress,
      walletAddressNormalized: normalized.walletAddressNormalized,
      walletProvider: normalized.walletProvider || challenge.walletProvider
    });
  } catch (error) {
    if (error.code === "WALLET_ALREADY_LINKED") {
      throw new ApiError(409, "WALLET_ALREADY_LINKED", "Wallet is already linked to another user");
    }
    throw error;
  }

  const usedChallenge = await repository.markWalletChallengeUsed(challenge.id, new Date().toISOString());
  if (!usedChallenge) {
    throw new ApiError(409, "WALLET_CHALLENGE_USED", "Wallet challenge was already used");
  }

  return {
    user: linked,
    wallet: {
      walletAddress: normalized.walletAddress,
      walletProvider: normalized.walletProvider || challenge.walletProvider || null
    }
  };
}

async function getCredits(repository, userId) {
  const user = await repository.getOrCreateUser(userId);
  return {
    balance: user.creditBalance ?? 0,
    transactions: await repository.listCreditTransactionsByUser(user.id)
  };
}

async function chargeDemoCredits(repository, input, userId) {
  const normalized = validateDemoCreditChargeRequest(input);
  const user = await repository.getOrCreateUser(userId);
  const transaction = await repository.addCreditTransaction(user.id, {
    amount: normalized.credits,
    reason: "DEMO_CHARGE",
    metadataJson: {
      priceMnt: normalized.priceMnt
    }
  });

  if (!transaction) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }

  return {
    balance: transaction.balanceAfter,
    transaction
  };
}

function getCreditPackages(config) {
  return {
    enabled: Boolean(config.mantleCreditExchangeEnabled),
    tokenSymbol: MNT_SYMBOL,
    chainId: getCreditExchangeChainId(config),
    receiverAddress: config.mantleCreditTreasuryAddress || null,
    packages: DEFAULT_CREDIT_PACKAGES.map((creditPackage) => ({ ...creditPackage }))
  };
}

async function createCreditQuote(repository, input, userId, config) {
  ensureCreditExchangeEnabled(config);
  const user = await repository.getOrCreateUser(userId);
  ensureUserWalletLinked(user);
  const userWalletAddressNormalized = getLinkedWalletAddressNormalized(user);

  const normalized = validateCreditQuoteRequest({
    ...input,
    walletAddress: input?.walletAddress || user.walletAddress
  });

  if (normalized.walletAddressNormalized !== userWalletAddressNormalized) {
    throw new ApiError(403, "WALLET_MISMATCH", "Quote wallet must match the linked wallet");
  }

  const receiverAddress = getCreditTreasuryAddress(config);
  const expiresAt = new Date(Date.now() + CREDIT_QUOTE_TTL_MS).toISOString();
  const quote = await repository.createCreditQuote({
    userId: user.id,
    walletAddress: user.walletAddress,
    walletAddressNormalized: userWalletAddressNormalized,
    credits: normalized.credits,
    priceMnt: normalized.package.priceMnt,
    priceWei: normalized.package.priceWei,
    tokenSymbol: MNT_SYMBOL,
    chainId: getCreditExchangeChainId(config),
    receiverAddress,
    receiverAddressNormalized: normalizeEvmAddress(receiverAddress),
    expiresAt
  });

  return {
    quote: validateCreditQuoteResponse({ quote })
  };
}

async function exchangeCredits(repository, input, userId, config) {
  ensureCreditExchangeEnabled(config);
  const normalized = validateCreditExchangeRequest(input);
  const user = await repository.getOrCreateUser(userId);
  ensureUserWalletLinked(user);
  const userWalletAddressNormalized = getLinkedWalletAddressNormalized(user);

  const quote = await repository.getCreditQuote?.(normalized.quoteId);
  if (!quote) {
    throw new ApiError(404, "CREDIT_QUOTE_NOT_FOUND", "Credit quote not found");
  }
  if (quote.userId !== user.id) {
    throw new ApiError(403, "CREDIT_QUOTE_FORBIDDEN", "Credit quote belongs to another user");
  }
  if (quote.usedAt) {
    throw new ApiError(409, "CREDIT_QUOTE_USED", "Credit quote was already used");
  }
  if (quote.walletAddressNormalized !== userWalletAddressNormalized) {
    throw new ApiError(403, "WALLET_MISMATCH", "Quote wallet must match the linked wallet");
  }
  if (new Date(quote.expiresAt).getTime() <= Date.now()) {
    throw new ApiError(409, "CREDIT_QUOTE_EXPIRED", "Credit quote expired");
  }

  const existingTx = await repository.getCreditQuoteByTxHash?.(normalized.txHashNormalized);
  if (existingTx && existingTx.id !== quote.id) {
    throw new ApiError(409, "CREDIT_TX_ALREADY_USED", "Credit exchange transaction was already used");
  }

  const metadata = await verifyCreditExchangeTransaction(config, quote, normalized.txHashNormalized, user);
  let result;
  try {
    result = await repository.completeCreditQuoteExchange({
      quoteId: quote.id,
      txHash: normalized.txHashNormalized,
      usedAt: new Date().toISOString(),
      amount: quote.credits,
      reason: CreditTransactionReason.MNT_EXCHANGE,
      metadataJson: metadata
    });
  } catch (error) {
    if (error.code === "CREDIT_QUOTE_USED") {
      throw new ApiError(409, "CREDIT_QUOTE_USED", "Credit quote was already used");
    }
    if (error.code === "CREDIT_TX_ALREADY_USED") {
      throw new ApiError(409, "CREDIT_TX_ALREADY_USED", "Credit exchange transaction was already used");
    }
    throw error;
  }

  if (!result) {
    throw new ApiError(404, "CREDIT_QUOTE_NOT_FOUND", "Credit quote not found");
  }

  return validateCreditExchangeResponse({
    balance: result.transaction.balanceAfter,
    transaction: {
      ...result.transaction,
      metadata: result.transaction.metadataJson
    }
  });
}

async function listMyBattles(repository, userId) {
  const user = await repository.getOrCreateUser(userId);
  return addBattleStats(repository, await repository.listBattlesByUser(user.id));
}

async function listMyComments(repository, userId) {
  const user = await repository.getOrCreateUser(userId);
  const [socialComments, feedEntries] = await Promise.all([
    repository.listSocialCommentsByUser(user.id),
    repository.listEntriesByUser?.(user.id) ?? []
  ]);

  return [
    ...socialComments.map((comment) => ({
      kind: "SOCIAL_COMMENT",
      ...comment
    })),
    ...feedEntries.map((entry) => ({
      kind: "FEED_COMMENT",
      id: entry.id,
      battleId: entry.battleId,
      targetEntryId: null,
      authorUserId: entry.submittedByUserId,
      content: entry.content,
      createdAt: entry.createdAt,
      battle: entry.battle ?? null,
      entry
    }))
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function listMyLikes(repository, userId) {
  const user = await repository.getOrCreateUser(userId);
  const [entryLikes, battleLikes] = await Promise.all([
    repository.listEntryLikesByUser(user.id),
    repository.listBattleLikesByUser?.(user.id) ?? []
  ]);

  return [
    ...entryLikes.map((like) => ({
      kind: "ENTRY_LIKE",
      ...like
    })),
    ...battleLikes.map((like) => ({
      kind: "BATTLE_LIKE",
      ...like,
      entry: null
    }))
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function closeBattle(repository, battleId) {
  const battle = await getBattleOrThrow(repository, battleId);
  const entries = (await repository.listEntriesByBattle(battleId)).filter((entry) => !entry.parentEntryId);
  if (entries.length === 0) {
    throw new ApiError(409, "BATTLE_CANNOT_CLOSE", "Cannot close a battle without entries");
  }

  try {
    assertCanCloseBattle(battle);
    assertBattleStatusTransition(battle.status, BattleStatus.CLOSED);
  } catch (error) {
    throw new ApiError(409, "BATTLE_CANNOT_CLOSE", error.message);
  }

  const closed = await repository.transitionBattleStatus(battleId, BattleStatus.OPEN, {
    status: BattleStatus.CLOSED,
    closedAt: new Date().toISOString()
  });

  if (!closed) {
    throw new ApiError(409, "BATTLE_CANNOT_CLOSE", "Only OPEN battles can be closed");
  }

  return closed;
}

async function judgeBattle(repository, aiJudgeService, settlementService, config, battleId) {
  const battle = await getBattleOrThrow(repository, battleId);
  try {
    assertCanJudgeBattle(battle);
  } catch (error) {
    throw new ApiError(409, "BATTLE_CANNOT_JUDGE", error.message);
  }

  const entries = (await repository.listEntriesByBattle(battleId)).filter((entry) => !entry.parentEntryId);
  if (entries.length === 0) {
    throw new ApiError(409, "NO_ENTRIES", "Cannot judge a battle without entries");
  }

  const judgingBattle = await repository.transitionBattleStatus(battleId, BattleStatus.CLOSED, {
    status: BattleStatus.JUDGING,
    judgingStartedAt: new Date().toISOString(),
    failureReason: null
  });

  if (!judgingBattle) {
    throw new ApiError(409, "BATTLE_CANNOT_JUDGE", "Only one judge run can start from CLOSED status");
  }

  try {
    const currentBattle = judgingBattle;
    const judgingRule = await getOrCreateJudgingRule(repository, currentBattle);
    const judgeInput = validateJudgeInput({
      battle: currentBattle,
      entries,
      rules: judgingRule.rulesJson
    });
    const judgeOutput = validateJudgeOutputReferences(await aiJudgeService.judgeBattle(judgeInput), judgeInput);
    const modelVersion = config.mockAi ? "mock-mgg-judge-v1" : config.openAiModel;
    const hashPackage = buildVerdictHashPackage({
      battle: currentBattle,
      entries,
      judgeOutput,
      modelVersion,
      rules: judgingRule.rulesJson
    });

    if (hashPackage.rulesHash !== judgingRule.rulesHash) {
      throw new Error("Stored judging rules hash does not match verdict hash package");
    }

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
    repository.listEntriesByBattle(battleId).then((entries) => entries.filter((entry) => !entry.parentEntryId)),
    repository.getVerdictByBattle(battleId),
    repository.getSettlementByBattle(battleId)
  ]);

  return toResultResponse({ battle, entries, verdict, settlement });
}

function validateCreateReportRequest(input) {
  const body = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const details = [];
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const targetEntryId = typeof body.targetEntryId === "string" ? body.targetEntryId.trim() : "";

  if (!reason) {
    details.push("reason is required");
  } else if (reason.length > MAX_REPORT_REASON_LENGTH) {
    details.push(`reason must be ${MAX_REPORT_REASON_LENGTH} characters or fewer`);
  }

  if (body.targetEntryId !== undefined && !targetEntryId) {
    details.push("targetEntryId must be a non-empty string when provided");
  }

  if (details.length > 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid report request", details);
  }

  return {
    reason,
    targetEntryId: targetEntryId || null
  };
}

function ensureCreditExchangeEnabled(config) {
  if (!config.mantleCreditExchangeEnabled) {
    throw new ApiError(403, "CREDIT_EXCHANGE_DISABLED", "Credit exchange is disabled");
  }
  getCreditTreasuryAddress(config);
}

function ensureUserWalletLinked(user) {
  if (!user.walletAddress || !normalizeEvmAddress(user.walletAddress)) {
    throw new ApiError(409, "WALLET_REQUIRED", "Connect a wallet before exchanging credits");
  }
}

function getLinkedWalletAddressNormalized(user) {
  return normalizeEvmAddress(user.walletAddress);
}

function getCreditExchangeChainId(config) {
  return Number(config.mantleCreditChainId || config.mantleChainId || MANTLE_TESTNET_CHAIN_ID);
}

function getCreditTreasuryAddress(config) {
  const receiverAddress = config.mantleCreditTreasuryAddress || "";
  if (!isEvmAddress(receiverAddress)) {
    throw new ApiError(503, "CREDIT_EXCHANGE_NOT_READY", "Credit exchange treasury address is not configured");
  }
  return receiverAddress;
}

async function verifyCreditExchangeTransaction(config, quote, txHash, user) {
  if (config.mockMantle) {
    return validateCreditExchangeMetadata({
      quoteId: quote.id,
      chainId: quote.chainId,
      txHash,
      from: user.walletAddress,
      to: quote.receiverAddress,
      valueWei: quote.priceWei,
      confirmations: Number(config.mantleCreditConfirmations ?? 1)
    });
  }

  if (!config.mantleCreditRpcUrl) {
    throw new ApiError(503, "CREDIT_EXCHANGE_NOT_READY", "Mantle credit RPC URL is not configured");
  }

  const { createPublicClient, http } = await import("viem");
  const publicClient = createPublicClient({
    chain: {
      id: quote.chainId,
      name: "Mantle credit exchange",
      nativeCurrency: {
        name: MNT_SYMBOL,
        symbol: MNT_SYMBOL,
        decimals: 18
      },
      rpcUrls: {
        default: {
          http: [config.mantleCreditRpcUrl]
        }
      }
    },
    transport: http(config.mantleCreditRpcUrl)
  });

  let transaction;
  let receipt;
  try {
    [transaction, receipt] = await Promise.all([
      publicClient.getTransaction({ hash: txHash }),
      publicClient.getTransactionReceipt({ hash: txHash })
    ]);
  } catch {
    throw new ApiError(404, "CREDIT_TX_NOT_FOUND", "Credit exchange transaction was not found");
  }

  if (receipt.status !== "success") {
    throw new ApiError(409, "CREDIT_TX_FAILED", "Credit exchange transaction failed");
  }

  const fromNormalized = normalizeEvmAddress(transaction.from);
  const toNormalized = normalizeEvmAddress(transaction.to);
  if (fromNormalized !== quote.walletAddressNormalized) {
    throw new ApiError(403, "CREDIT_TX_SENDER_MISMATCH", "Credit exchange sender does not match linked wallet");
  }
  if (toNormalized !== quote.receiverAddressNormalized) {
    throw new ApiError(403, "CREDIT_TX_RECEIVER_MISMATCH", "Credit exchange receiver does not match treasury");
  }
  if (transaction.value !== BigInt(quote.priceWei)) {
    throw new ApiError(409, "CREDIT_TX_VALUE_MISMATCH", "Credit exchange value does not match quote");
  }

  const currentBlock = await publicClient.getBlockNumber();
  const confirmations = Number(currentBlock - receipt.blockNumber + 1n);
  const requiredConfirmations = Number(config.mantleCreditConfirmations ?? 1);
  if (confirmations < requiredConfirmations) {
    throw new ApiError(409, "CREDIT_TX_UNCONFIRMED", "Credit exchange transaction needs more confirmations");
  }

  return validateCreditExchangeMetadata({
    quoteId: quote.id,
    chainId: quote.chainId,
    txHash,
    from: transaction.from,
    to: transaction.to,
    valueWei: transaction.value.toString(),
    confirmations
  });
}

async function getOrCreateJudgingRule(repository, battle) {
  const existing = await repository.getJudgingRuleByBattle?.(battle.id);
  if (existing) {
    return existing;
  }

  const rulesJson = getJudgingRules(battle.battleType);
  const fallback = {
    battleId: battle.id,
    rulesJson,
    rulesHash: sha256Hex(rulesJson)
  };

  if (repository.createJudgingRule) {
    return repository.createJudgingRule(fallback);
  }

  return fallback;
}

async function getBattleOrThrow(repository, battleId) {
  const battle = await repository.getBattle(battleId);
  if (!battle) {
    throw new ApiError(404, "BATTLE_NOT_FOUND", "Battle not found");
  }
  return battle;
}

async function addBattleStats(repository, battles) {
  return Promise.all(battles.map((battle) => addOneBattleStats(repository, battle)));
}

async function toFeedBattle(repository, battle, userId) {
  const [entries, stats, isBattleLiked, participation] = await Promise.all([
    repository.listEntriesByBattle(battle.id),
    repository.getBattleStats?.(battle.id) ?? {},
    repository.getBattleLikeState?.(battle.id, userId) ?? false,
    repository.getParticipation?.(battle.id, userId) ?? null
  ]);
  const comments = await buildFeedCommentTree(repository, entries, userId);

  return {
    id: battle.id,
    type: battle.battleType,
    author: battle.isAnonymous ? "익명 우기미" : battle.createdByUserId,
    title: battle.title || battle.prompt || "새로운 우기기",
    description: battle.description || battle.prompt || "",
    likeCount: stats.battleLikeCount ?? 0,
    status: getFeedStatus(battle),
    recommendedScore: battle.recommendedScore ?? 50,
    createdAt: battle.createdAt,
    deadline: formatFeedDeadline(battle.deadlineAt),
    createdByMe: battle.createdByUserId === userId,
    imageUrl: battle.imageUrl || undefined,
    options: (battle.options || []).map((option) => option.text),
    comments,
    stats,
    isBattleLiked,
    isParticipated: Boolean(participation),
    selectedOption: getOptionTextById(battle, participation?.optionId) ?? null,
    selectedOptionId: participation?.optionId ?? null
  };
}

async function buildFeedCommentTree(repository, entries, userId) {
  const repliesByParentId = new Map();
  const topLevelEntries = [];

  for (const entry of entries) {
    if (entry.parentEntryId) {
      const replies = repliesByParentId.get(entry.parentEntryId) ?? [];
      replies.push(entry);
      repliesByParentId.set(entry.parentEntryId, replies);
    } else {
      topLevelEntries.push(entry);
    }
  }

  return Promise.all(topLevelEntries.map((entry) => toFeedComment(repository, entry, userId, repliesByParentId)));
}

async function toFeedComment(repository, entry, userId, repliesByParentId = new Map()) {
  const stats = await repository.getEntryStats?.(entry.id, userId);
  const replies = repliesByParentId.get(entry.id) ?? [];
  return {
    id: entry.id,
    entryId: entry.id,
    author: entry.submittedByUserId,
    text: entry.content,
    likeCount: stats?.likeCount ?? 0,
    likedByMe: stats?.likedByMe ?? false,
    optionId: entry.optionId || null,
    parentEntryId: entry.parentEntryId || null,
    replies: await Promise.all(replies.map((reply) => toFeedComment(repository, reply, userId, repliesByParentId))),
    createdAt: entry.createdAt
  };
}

function toFeedResult(result) {
  const verdict = result.verdict ?? {};
  const entries = result.entries ?? [];
  const participantCount = new Set(entries.map((entry) => entry.submittedByUserId).filter(Boolean)).size;
  const winnerEntry = verdict.winnerEntryId
    ? entries.find((entry) => entry.id === verdict.winnerEntryId)
    : null;
  const winnerOption = verdict.winnerOptionId
    ? result.battle.options?.find((option) => option.id === verdict.winnerOptionId)
    : null;
  const optionResults = Array.isArray(verdict.optionScores)
    ? verdict.optionScores.map((item) => {
        const option = result.battle.options?.find((candidate) => candidate.id === item.optionId);
        return {
          label: option?.text ?? item.optionId,
          percentage: Math.round(Number(item.score) || 0)
        };
      })
    : undefined;
  const optionStats = optionResults?.map((item, index) => ({
    optionId: verdict.optionScores[index].optionId,
    ...item
  }));

  return {
    winnerUserId: winnerEntry?.submittedByUserId ?? null,
    winnerEntryId: winnerEntry?.id ?? null,
    winnerCommentId: winnerEntry?.id ?? null,
    winnerOptionId: winnerOption?.id ?? null,
    winningOptionId: winnerOption?.id ?? null,
    winnerName:
      verdict.winnerType === "OPTION"
        ? winnerOption?.text ?? "우승 진영"
        : winnerEntry?.submittedByUserId ?? winnerOption?.text ?? "우승자",
    winnerDetail:
      verdict.winnerType === "OPTION"
        ? winnerOption
          ? `${winnerOption.text} 진영`
          : verdict.verdictText ?? ""
        : winnerEntry?.content ?? verdict.verdictText ?? "",
    participantCount,
    rewardCredits: DEFAULT_REWARD_CREDITS,
    aiSummary: verdict.shareSummary ?? verdict.verdictText ?? "",
    verdictLines: [verdict.verdictTitle, verdict.verdictText, verdict.shareSummary].filter(Boolean),
    optionStats,
    optionResults
  };
}

function getFeedStatus(battle) {
  if (battle.status === BattleStatus.JUDGING) return "EVALUATING";
  if (battle.status === BattleStatus.SETTLED) return "COMPLETED";
  if (battle.status === BattleStatus.FAILED) return "CLOSED";
  if (battle.status === BattleStatus.OPEN && battle.deadlineAt) {
    const deadline = new Date(battle.deadlineAt);
    if (Number.isFinite(deadline.getTime()) && deadline.getTime() <= Date.now()) {
      return "EVALUATING";
    }
  }
  return battle.status;
}

function toNotificationDto(notification) {
  return {
    ...notification,
    isRead: Boolean(notification.readAt),
    targetType: notification.battleId ? "battle" : "profile",
    time: notification.createdAt
  };
}

function formatFeedDeadline(deadlineAt) {
  if (!deadlineAt) {
    return "";
  }
  const date = new Date(deadlineAt);
  if (!Number.isFinite(date.getTime())) {
    return "";
  }
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getOptionTextById(battle, optionId) {
  if (!optionId) {
    return null;
  }
  return battle.options?.find((option) => option.id === optionId)?.text ?? null;
}

async function addOneBattleStats(repository, battle) {
  if (!repository.getBattleStats) {
    return battle;
  }
  return {
    ...battle,
    stats: await repository.getBattleStats(battle.id)
  };
}

async function addEntryStats(repository, entries, userId) {
  if (!repository.getEntryStats) {
    return entries;
  }
  const user = userId ? await repository.getOrCreateUser(userId) : null;
  return Promise.all(
    entries.map(async (entry) => ({
      ...entry,
      stats: await repository.getEntryStats(entry.id, user?.id)
    }))
  );
}

function buildWalletChallengeMessage({ walletAddress, nonce, issuedAt, expiresAt }) {
  return [
    "MGG wallet connection",
    "",
    `Address: ${walletAddress}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
    `Expires At: ${expiresAt}`
  ].join("\n");
}

function publicWalletChallenge(challenge) {
  return {
    id: challenge.id,
    walletAddress: challenge.walletAddress,
    walletProvider: challenge.walletProvider,
    message: challenge.message,
    nonce: challenge.nonce,
    issuedAt: challenge.issuedAt,
    expiresAt: challenge.expiresAt
  };
}

async function verifyWalletSignature(message, walletAddress, signature) {
  try {
    const { verifyMessage } = await import("viem");
    return verifyMessage({
      address: walletAddress,
      message,
      signature
    });
  } catch {
    return false;
  }
}
