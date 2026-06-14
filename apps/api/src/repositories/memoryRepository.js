import { randomUUID } from "node:crypto";
import { BattleStatus } from "../../../../packages/shared/src/index.js";

export class MemoryRepository {
  constructor(initialState) {
    this.state = initialState ?? {
      users: [],
      battles: [],
      entries: [],
      judgingRules: [],
      verdicts: [],
      settlements: [],
      reports: [],
      walletChallenges: [],
      creditTransactions: [],
      creditQuotes: [],
      socialComments: [],
      entryLikes: [],
      battleLikes: [],
      participations: [],
      battleShares: [],
      notifications: []
    };
    this.normalizeState();
  }

  normalizeState() {
    this.state.users ??= [];
    this.state.battles ??= [];
    this.state.entries ??= [];
    this.state.judgingRules ??= [];
    this.state.verdicts ??= [];
    this.state.settlements ??= [];
    this.state.reports ??= [];
    this.state.walletChallenges ??= [];
    this.state.creditTransactions ??= [];
    this.state.creditQuotes ??= [];
    this.state.socialComments ??= [];
    this.state.entryLikes ??= [];
    this.state.battleLikes ??= [];
    this.state.participations ??= [];
    this.state.battleShares ??= [];
    this.state.notifications ??= [];
    this.state.users.forEach(normalizeUserProfileFields);
    this.state.entries.forEach((entry) => {
      entry.parentEntryId ??= null;
    });
  }

  exportState() {
    return clone(this.state);
  }

  async getOrCreateUser(userId) {
    const id = userId || "demo-user";
    const existing = this.state.users.find((user) => user.id === id);
    if (existing) {
      normalizeUserProfileFields(existing);
      return formatUser(existing);
    }

    const user = {
      id,
      displayName: id === "demo-user" ? "Demo User" : `User ${id.slice(0, 8)}`,
      nickname: null,
      intro: null,
      avatarUrl: null,
      walletAddress: null,
      walletAddressNormalized: null,
      walletProvider: null,
      creditBalance: 0,
      createdAt: now()
    };
    this.state.users.push(user);
    await this.afterMutation();
    return formatUser(user);
  }

  async getUserByNickname(nickname) {
    const user = this.state.users.find((item) => item.nickname === nickname) ?? null;
    return user ? formatUser(user) : null;
  }

  async getUserByWalletAddressNormalized(walletAddressNormalized) {
    const user = this.state.users.find((item) => item.walletAddressNormalized === walletAddressNormalized) ?? null;
    return user ? formatUser(user) : null;
  }

  async updateUserProfile(userId, patch) {
    const user = this.state.users.find((item) => item.id === userId);
    if (!user) {
      return null;
    }

    if (patch.nickname) {
      const existing = this.state.users.find((item) => item.nickname === patch.nickname && item.id !== userId);
      if (existing) {
        const error = new Error("Nickname is already taken");
        error.code = "NICKNAME_TAKEN";
        throw error;
      }
      user.displayName = patch.nickname;
    }

    Object.assign(user, patch);
    if (patch.walletAddress) {
      user.walletAddressNormalized = patch.walletAddress.toLowerCase();
    } else if (patch.walletAddress === null) {
      user.walletAddressNormalized = null;
    }
    await this.afterMutation();
    return formatUser(user);
  }

  async linkWalletToUser(userId, patch) {
    const user = this.state.users.find((item) => item.id === userId);
    if (!user) {
      return null;
    }

    user.walletAddress = patch.walletAddress;
    user.walletAddressNormalized = patch.walletAddressNormalized;
    user.walletProvider = patch.walletProvider ?? user.walletProvider ?? null;
    await this.afterMutation();
    return formatUser(user);
  }

  async createWalletChallenge(input) {
    const challenge = {
      id: randomUUID(),
      userId: input.userId || null,
      walletAddress: input.walletAddress,
      walletAddressNormalized: input.walletAddressNormalized,
      walletProvider: input.walletProvider || null,
      nonce: input.nonce,
      message: input.message,
      issuedAt: input.issuedAt || now(),
      expiresAt: input.expiresAt,
      usedAt: null
    };
    this.state.walletChallenges.push(challenge);
    await this.afterMutation();
    return clone(challenge);
  }

  async getWalletChallenge(challengeId) {
    return clone(this.state.walletChallenges.find((challenge) => challenge.id === challengeId) ?? null);
  }

  async markWalletChallengeUsed(challengeId, usedAt = now()) {
    const challenge = this.state.walletChallenges.find((item) => item.id === challengeId);
    if (!challenge || challenge.usedAt) {
      return null;
    }

    challenge.usedAt = usedAt;
    await this.afterMutation();
    return clone(challenge);
  }

  async addCreditTransaction(userId, input) {
    const user = this.state.users.find((item) => item.id === userId);
    if (!user) {
      return null;
    }

    normalizeUserProfileFields(user);
    user.creditBalance += input.amount;
    const transaction = {
      id: randomUUID(),
      userId,
      amount: input.amount,
      reason: input.reason,
      balanceAfter: user.creditBalance,
      metadataJson: input.metadataJson || null,
      createdAt: now()
    };
    this.state.creditTransactions.push(transaction);
    await this.afterMutation();
    return clone(transaction);
  }

  async listCreditTransactionsByUser(userId) {
    return clone(
      this.state.creditTransactions
        .filter((transaction) => transaction.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    );
  }

  async createCreditQuote(input) {
    const quote = {
      id: randomUUID(),
      userId: input.userId,
      walletAddress: input.walletAddress,
      walletAddressNormalized: input.walletAddressNormalized,
      credits: input.credits,
      priceMnt: input.priceMnt,
      priceWei: input.priceWei,
      tokenSymbol: input.tokenSymbol || "MNT",
      chainId: input.chainId,
      receiverAddress: input.receiverAddress,
      receiverAddressNormalized: input.receiverAddressNormalized,
      expiresAt: input.expiresAt,
      usedAt: null,
      txHash: null,
      creditTransactionId: null,
      createdAt: now()
    };
    this.state.creditQuotes.push(quote);
    await this.afterMutation();
    return clone(quote);
  }

  async getCreditQuote(quoteId) {
    return clone(this.state.creditQuotes.find((quote) => quote.id === quoteId) ?? null);
  }

  async getCreditQuoteByTxHash(txHash) {
    return clone(this.state.creditQuotes.find((quote) => quote.txHash === txHash) ?? null);
  }

  async completeCreditQuoteExchange(input) {
    const quote = this.state.creditQuotes.find((item) => item.id === input.quoteId);
    if (!quote) {
      return null;
    }
    if (quote.usedAt) {
      const error = new Error("Credit quote already used");
      error.code = "CREDIT_QUOTE_USED";
      throw error;
    }
    const duplicateTx = this.state.creditQuotes.find((item) => item.txHash === input.txHash && item.id !== quote.id);
    if (duplicateTx) {
      const error = new Error("Credit exchange transaction already used");
      error.code = "CREDIT_TX_ALREADY_USED";
      throw error;
    }

    const user = this.state.users.find((item) => item.id === quote.userId);
    if (!user) {
      return null;
    }

    normalizeUserProfileFields(user);
    user.creditBalance += input.amount;
    const transaction = {
      id: randomUUID(),
      userId: quote.userId,
      amount: input.amount,
      reason: input.reason,
      balanceAfter: user.creditBalance,
      metadataJson: input.metadataJson,
      createdAt: now()
    };

    quote.usedAt = input.usedAt || now();
    quote.txHash = input.txHash;
    quote.creditTransactionId = transaction.id;
    this.state.creditTransactions.push(transaction);
    await this.afterMutation();
    return {
      quote: clone(quote),
      transaction: clone(transaction)
    };
  }

  async createBattle(input) {
    const battle = {
      id: randomUUID(),
      battleType: input.battleType,
      status: BattleStatus.OPEN,
      prompt: input.prompt || null,
      title: input.title || input.prompt || null,
      description: input.description || null,
      imageUrl: input.imageUrl || null,
      deadlineAt: input.deadlineAt || null,
      isAnonymous: Boolean(input.isAnonymous),
      recommendedScore: input.recommendedScore ?? 50,
      options: (input.options || []).map((option) => ({
        id: randomUUID(),
        text: option.text
      })),
      createdByUserId: input.createdByUserId,
      failureReason: null,
      createdAt: now(),
      closedAt: null,
      judgingStartedAt: null,
      settledAt: null
    };

    this.state.battles.push(battle);
    if (input.judgingRule) {
      this.state.judgingRules.push({
        id: randomUUID(),
        battleId: battle.id,
        rulesJson: input.judgingRule.rulesJson,
        rulesHash: input.judgingRule.rulesHash,
        createdAt: now()
      });
    }
    await this.afterMutation();
    return clone(battle);
  }

  async listBattles() {
    return clone(
      this.state.battles
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    );
  }

  async listArchive() {
    return clone(
      this.state.battles
        .filter((battle) => battle.status === BattleStatus.SETTLED)
        .sort((a, b) => b.settledAt.localeCompare(a.settledAt))
    );
  }

  async listBattlesByUser(userId) {
    return clone(
      this.state.battles
        .filter((battle) => battle.createdByUserId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    );
  }

  async getBattle(battleId) {
    return clone(this.state.battles.find((battle) => battle.id === battleId) ?? null);
  }

  async setBattleLike(battleId, userId, liked) {
    const index = this.state.battleLikes.findIndex((like) => like.battleId === battleId && like.userId === userId);

    if (liked) {
      if (index === -1) {
        this.state.battleLikes.push({
          id: randomUUID(),
          battleId,
          userId,
          createdAt: now()
        });
        await this.afterMutation();
      }
      return { liked: true, likeCount: await this.getBattleLikeCount(battleId) };
    }

    if (index !== -1) {
      this.state.battleLikes.splice(index, 1);
      await this.afterMutation();
    }
    return { liked: false, likeCount: await this.getBattleLikeCount(battleId) };
  }

  async getBattleLikeCount(battleId) {
    return this.state.battleLikes.filter((like) => like.battleId === battleId).length;
  }

  async getBattleLikeState(battleId, userId) {
    return Boolean(userId && this.state.battleLikes.some((like) => like.battleId === battleId && like.userId === userId));
  }

  async updateBattle(battleId, patch) {
    const battle = this.state.battles.find((item) => item.id === battleId);
    if (!battle) {
      return null;
    }

    Object.assign(battle, patch);
    await this.afterMutation();
    return clone(battle);
  }

  async transitionBattleStatus(battleId, expectedStatus, patch) {
    const battle = this.state.battles.find((item) => item.id === battleId);
    if (!battle || battle.status !== expectedStatus) {
      return null;
    }

    Object.assign(battle, patch);
    await this.afterMutation();
    return clone(battle);
  }

  async addEntry(input) {
    const battle = this.state.battles.find((item) => item.id === input.battleId);
    if (input.expectedBattleStatus && battle?.status !== input.expectedBattleStatus) {
      return null;
    }

    const entry = {
      id: randomUUID(),
      battleId: input.battleId,
      optionId: input.optionId || null,
      parentEntryId: input.parentEntryId || null,
      content: input.content,
      submittedByUserId: input.submittedByUserId,
      createdAt: now()
    };
    this.state.entries.push(entry);
    await this.afterMutation();
    return clone(entry);
  }

  async listEntriesByBattle(battleId) {
    return clone(
      this.state.entries
        .filter((entry) => entry.battleId === battleId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    );
  }

  async listEntriesByUser(userId) {
    const participatedBattleIds = new Set(
      this.state.participations
        .filter((participation) => participation.userId === userId)
        .map((participation) => participation.battleId)
    );
    return clone(
      this.state.entries
        .filter((entry) => entry.submittedByUserId === userId && participatedBattleIds.has(entry.battleId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((entry) => ({
          ...entry,
          battle: this.state.battles.find((battle) => battle.id === entry.battleId) ?? null
        }))
    );
  }

  async getEntry(entryId) {
    return clone(this.state.entries.find((entry) => entry.id === entryId) ?? null);
  }

  async getParticipation(battleId, userId) {
    return clone(this.state.participations.find((item) => item.battleId === battleId && item.userId === userId) ?? null);
  }

  async createParticipationWithCreditSpend(input) {
    const user = this.state.users.find((item) => item.id === input.userId);
    if (!user) {
      return null;
    }

    normalizeUserProfileFields(user);
    if (user.creditBalance < input.costCredits) {
      const error = new Error("Not enough demo credits to participate");
      error.code = "INSUFFICIENT_CREDITS";
      throw error;
    }

    const existing = this.state.participations.find(
      (item) => item.battleId === input.battleId && item.userId === input.userId
    );
    if (existing) {
      const error = new Error("User already participated in this battle");
      error.code = "PARTICIPATION_EXISTS";
      throw error;
    }

    user.creditBalance -= input.costCredits;
    const transaction = {
      id: randomUUID(),
      userId: input.userId,
      amount: -input.costCredits,
      reason: "PARTICIPATION_SPEND",
      balanceAfter: user.creditBalance,
      metadataJson: input.metadataJson || null,
      createdAt: now()
    };
    const participation = {
      id: randomUUID(),
      battleId: input.battleId,
      userId: input.userId,
      optionId: input.optionId || null,
      entryId: input.entryId || null,
      costCredits: input.costCredits,
      creditTransactionId: transaction.id,
      rewardClaimedAt: null,
      createdAt: now()
    };

    this.state.creditTransactions.push(transaction);
    this.state.participations.push(participation);
    await this.afterMutation();
    return {
      participation: clone(participation),
      transaction: clone(transaction)
    };
  }

  async createParticipation(input) {
    const existing = this.state.participations.find(
      (item) => item.battleId === input.battleId && item.userId === input.userId
    );
    if (existing) {
      const error = new Error("User already participated in this battle");
      error.code = "PARTICIPATION_EXISTS";
      throw error;
    }

    const participation = {
      id: randomUUID(),
      battleId: input.battleId,
      userId: input.userId,
      optionId: input.optionId || null,
      entryId: input.entryId || null,
      costCredits: input.costCredits,
      creditTransactionId: input.creditTransactionId || null,
      rewardClaimedAt: null,
      createdAt: now()
    };
    this.state.participations.push(participation);
    await this.afterMutation();
    return clone(participation);
  }

  async attachEntryToParticipation(participationId, entryId) {
    const participation = this.state.participations.find((item) => item.id === participationId);
    if (!participation) {
      return null;
    }
    participation.entryId = entryId;
    await this.afterMutation();
    return clone(participation);
  }

  async markParticipationRewardClaimed(participationId, claimedAt = now()) {
    const participation = this.state.participations.find((item) => item.id === participationId);
    if (!participation || participation.rewardClaimedAt) {
      return null;
    }
    participation.rewardClaimedAt = claimedAt;
    await this.afterMutation();
    return clone(participation);
  }

  async claimParticipationReward(input) {
    const participation = this.state.participations.find((item) => item.id === input.participationId);
    const user = this.state.users.find((item) => item.id === input.userId);
    if (!participation || participation.rewardClaimedAt) {
      const error = new Error("Reward was already claimed");
      error.code = "REWARD_ALREADY_CLAIMED";
      throw error;
    }
    if (!user) {
      return null;
    }

    normalizeUserProfileFields(user);
    participation.rewardClaimedAt = input.claimedAt || now();
    user.creditBalance += input.amount;
    const transaction = {
      id: randomUUID(),
      userId: input.userId,
      amount: input.amount,
      reason: "REWARD_CLAIM",
      balanceAfter: user.creditBalance,
      metadataJson: input.metadataJson || null,
      createdAt: now()
    };

    this.state.creditTransactions.push(transaction);
    await this.afterMutation();
    return {
      participation: clone(participation),
      transaction: clone(transaction)
    };
  }

  async createJudgingRule(input) {
    const judgingRule = {
      id: randomUUID(),
      battleId: input.battleId,
      rulesJson: input.rulesJson,
      rulesHash: input.rulesHash,
      createdAt: now()
    };
    this.state.judgingRules.push(judgingRule);
    await this.afterMutation();
    return clone(judgingRule);
  }

  async getJudgingRuleByBattle(battleId) {
    return clone(
      this.state.judgingRules
        .filter((rule) => rule.battleId === battleId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
    );
  }

  async createVerdict(input) {
    const verdict = {
      id: randomUUID(),
      battleId: input.battleId,
      judgeOutput: input.judgeOutput,
      hashPackage: input.hashPackage,
      modelVersion: input.modelVersion,
      createdAt: now()
    };
    this.state.verdicts.push(verdict);
    await this.afterMutation();
    return clone(verdict);
  }

  async getVerdictByBattle(battleId) {
    return clone(
      this.state.verdicts
        .filter((verdict) => verdict.battleId === battleId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
    );
  }

  async createSettlement(input) {
    const settlement = {
      id: randomUUID(),
      battleId: input.battleId,
      chainId: input.chainId,
      contractAddress: input.contractAddress,
      txHash: input.txHash,
      explorerUrl: input.explorerUrl,
      contentHash: input.contentHash,
      optionsHash: input.optionsHash || null,
      entriesRoot: input.entriesRoot,
      rulesHash: input.rulesHash,
      modelVersionHash: input.modelVersionHash,
      winnerHash: input.winnerHash,
      mvpEntryHash: input.mvpEntryHash || null,
      verdictHash: input.verdictHash,
      settledAt: input.settledAt || now(),
      payloadJson: input.payloadJson
    };
    this.state.settlements.push(settlement);
    await this.afterMutation();
    return clone(settlement);
  }

  async getSettlementByBattle(battleId) {
    return clone(
      this.state.settlements
        .filter((settlement) => settlement.battleId === battleId)
        .sort((a, b) => b.settledAt.localeCompare(a.settledAt))[0] ?? null
    );
  }

  async createReport(input) {
    const report = {
      id: randomUUID(),
      battleId: input.battleId,
      reporterUserId: input.reporterUserId,
      targetEntryId: input.targetEntryId || null,
      reason: input.reason,
      status: "OPEN",
      createdAt: now(),
      reviewedAt: null
    };
    this.state.reports.push(report);
    await this.afterMutation();
    return clone(report);
  }

  async createSocialComment(input) {
    const comment = {
      id: randomUUID(),
      battleId: input.battleId,
      targetEntryId: input.targetEntryId || null,
      authorUserId: input.authorUserId,
      content: input.content,
      createdAt: now()
    };
    this.state.socialComments.push(comment);
    await this.afterMutation();
    return clone(comment);
  }

  async listSocialCommentsByBattle(battleId) {
    return clone(
      this.state.socialComments
        .filter((comment) => comment.battleId === battleId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    );
  }

  async listSocialCommentsByUser(userId) {
    return clone(
      this.state.socialComments
        .filter((comment) => comment.authorUserId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((comment) => ({
          ...comment,
          battle: this.state.battles.find((battle) => battle.id === comment.battleId) ?? null,
          entry: comment.targetEntryId
            ? this.state.entries.find((entry) => entry.id === comment.targetEntryId) ?? null
            : null
        }))
    );
  }

  async setEntryLike(entryId, userId, liked) {
    const index = this.state.entryLikes.findIndex((like) => like.entryId === entryId && like.userId === userId);

    if (liked) {
      if (index === -1) {
        this.state.entryLikes.push({
          id: randomUUID(),
          entryId,
          userId,
          createdAt: now()
        });
        await this.afterMutation();
      }
      return { liked: true, likeCount: await this.getEntryLikeCount(entryId) };
    }

    if (index !== -1) {
      this.state.entryLikes.splice(index, 1);
      await this.afterMutation();
    }
    return { liked: false, likeCount: await this.getEntryLikeCount(entryId) };
  }

  async getEntryLikeCount(entryId) {
    return this.state.entryLikes.filter((like) => like.entryId === entryId).length;
  }

  async getEntryStats(entryId, userId) {
    return {
      likeCount: await this.getEntryLikeCount(entryId),
      likedByMe: Boolean(userId && this.state.entryLikes.some((like) => like.entryId === entryId && like.userId === userId))
    };
  }

  async listEntryLikesByUser(userId) {
    return clone(
      this.state.entryLikes
        .filter((like) => like.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((like) => {
          const entry = this.state.entries.find((item) => item.id === like.entryId) ?? null;
          return {
            ...like,
            entry,
            battle: entry ? this.state.battles.find((battle) => battle.id === entry.battleId) ?? null : null
          };
        })
    );
  }

  async listBattleLikesByUser(userId) {
    return clone(
      this.state.battleLikes
        .filter((like) => like.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((like) => ({
          ...like,
          battle: this.state.battles.find((battle) => battle.id === like.battleId) ?? null
        }))
    );
  }

  async createBattleShare(input) {
    const share = {
      id: randomUUID(),
      battleId: input.battleId,
      userId: input.userId || null,
      channel: input.channel || null,
      createdAt: now()
    };
    this.state.battleShares.push(share);
    await this.afterMutation();
    return clone(share);
  }

  async getBattleShareCount(battleId) {
    return this.state.battleShares.filter((share) => share.battleId === battleId).length;
  }

  async getBattleStats(battleId) {
    const entries = this.state.entries.filter((entry) => entry.battleId === battleId);
    const entryIds = new Set(entries.map((entry) => entry.id));
    return {
      entryCount: entries.length,
      commentCount: this.state.socialComments.filter((comment) => comment.battleId === battleId).length,
      likeCount: this.state.entryLikes.filter((like) => entryIds.has(like.entryId)).length,
      battleLikeCount: await this.getBattleLikeCount(battleId),
      participationCount: this.state.participations.filter((item) => item.battleId === battleId).length,
      shareCount: await this.getBattleShareCount(battleId)
    };
  }

  async createNotification(input) {
    const notification = {
      id: randomUUID(),
      userId: input.userId,
      battleId: input.battleId || null,
      title: input.title,
      body: input.body,
      readAt: null,
      createdAt: now()
    };
    this.state.notifications.push(notification);
    await this.afterMutation();
    return clone(notification);
  }

  async listNotificationsByUser(userId) {
    return clone(
      this.state.notifications
        .filter((notification) => notification.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    );
  }

  async markNotificationRead(notificationId, userId, readAt = now()) {
    const notification = this.state.notifications.find((item) => item.id === notificationId && item.userId === userId);
    if (!notification) {
      return null;
    }

    if (!notification.readAt) {
      notification.readAt = readAt;
      await this.afterMutation();
    }
    return clone(notification);
  }

  async markAllNotificationsRead(userId, readAt = now()) {
    let readCount = 0;
    for (const notification of this.state.notifications) {
      if (notification.userId === userId && !notification.readAt) {
        notification.readAt = readAt;
        readCount += 1;
      }
    }

    if (readCount > 0) {
      await this.afterMutation();
    }

    return {
      readCount,
      notifications: await this.listNotificationsByUser(userId)
    };
  }

  async afterMutation() {}
}

function now() {
  return new Date().toISOString();
}

function normalizeUserProfileFields(user) {
  user.nickname ??= null;
  user.intro ??= null;
  user.avatarUrl ??= null;
  user.walletAddress ??= null;
  user.walletAddressNormalized ??= user.walletAddress ? user.walletAddress.toLowerCase() : null;
  user.walletProvider ??= null;
  user.creditBalance ??= 0;
}

function formatUser(user) {
  normalizeUserProfileFields(user);
  return clone({
    id: user.id,
    displayName: user.displayName,
    nickname: user.nickname,
    intro: user.intro,
    avatarUrl: user.avatarUrl,
    walletAddress: user.walletAddress,
    walletProvider: user.walletProvider,
    creditBalance: user.creditBalance,
    createdAt: user.createdAt
  });
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}
