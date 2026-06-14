import { PrismaClient } from "@prisma/client";

export class PrismaRepository {
  constructor(prisma = new PrismaClient()) {
    this.prisma = prisma;
  }

  async getOrCreateUser(userId) {
    const id = userId || "demo-user";
    const user = await this.prisma.user.upsert({
      where: { id },
      update: {},
      create: {
        id,
        displayName: id === "demo-user" ? "Demo User" : `User ${id.slice(0, 8)}`
      }
    });
    return formatUser(user);
  }

  async getUserByNickname(nickname) {
    const user = await this.prisma.user.findUnique({
      where: { nickname }
    });
    return user ? formatUser(user) : null;
  }

  async getUserByWalletAddressNormalized(walletAddressNormalized) {
    const user = await this.prisma.user.findUnique({
      where: { walletAddressNormalized }
    });
    return user ? formatUser(user) : null;
  }

  async updateUserProfile(userId, patch) {
    try {
      const data = { ...patch };
      if (patch.nickname) {
        data.displayName = patch.nickname;
      }
      if (patch.walletAddress) {
        data.walletAddressNormalized = patch.walletAddress.toLowerCase();
      } else if (patch.walletAddress === null) {
        data.walletAddressNormalized = null;
      }

      const user = await this.prisma.user.update({
        where: { id: userId },
        data
      });
      return formatUser(user);
    } catch (error) {
      if (error.code === "P2025") {
        return null;
      }
      if (error.code === "P2002" && error.meta?.target?.includes("nickname")) {
        const duplicate = new Error("Nickname is already taken");
        duplicate.code = "NICKNAME_TAKEN";
        throw duplicate;
      }
      if (error.code === "P2002" && error.meta?.target?.includes("walletAddressNormalized")) {
        const duplicate = new Error("Wallet is already linked");
        duplicate.code = "WALLET_ALREADY_LINKED";
        throw duplicate;
      }
      throw error;
    }
  }

  async linkWalletToUser(userId, patch) {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          walletAddress: patch.walletAddress,
          walletAddressNormalized: patch.walletAddressNormalized,
          walletProvider: patch.walletProvider || null
        }
      });
      return formatUser(user);
    } catch (error) {
      if (error.code === "P2025") {
        return null;
      }
      if (error.code === "P2002" && error.meta?.target?.includes("walletAddressNormalized")) {
        const duplicate = new Error("Wallet is already linked");
        duplicate.code = "WALLET_ALREADY_LINKED";
        throw duplicate;
      }
      throw error;
    }
  }

  async createWalletChallenge(input) {
    const challenge = await this.prisma.walletChallenge.create({
      data: {
        userId: input.userId || null,
        walletAddress: input.walletAddress,
        walletAddressNormalized: input.walletAddressNormalized,
        walletProvider: input.walletProvider || null,
        nonce: input.nonce,
        message: input.message,
        issuedAt: toDate(input.issuedAt),
        expiresAt: toDate(input.expiresAt)
      }
    });
    return formatWalletChallenge(challenge);
  }

  async getWalletChallenge(challengeId) {
    const challenge = await this.prisma.walletChallenge.findUnique({
      where: { id: challengeId }
    });
    return challenge ? formatWalletChallenge(challenge) : null;
  }

  async markWalletChallengeUsed(challengeId, usedAt) {
    const result = await this.prisma.walletChallenge.updateMany({
      where: { id: challengeId, usedAt: null },
      data: { usedAt: toDate(usedAt) }
    });

    if (result.count === 0) {
      return null;
    }

    return this.getWalletChallenge(challengeId);
  }

  async addCreditTransaction(userId, input) {
    try {
      const transaction = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: userId },
          data: {
            creditBalance: { increment: input.amount }
          }
        });

        return tx.creditTransaction.create({
          data: {
            userId,
            amount: input.amount,
            reason: input.reason,
            balanceAfter: user.creditBalance,
            metadataJson: input.metadataJson ?? undefined
          }
        });
      });
      return formatCreditTransaction(transaction);
    } catch (error) {
      if (error.code === "P2025") {
        return null;
      }
      throw error;
    }
  }

  async listCreditTransactionsByUser(userId) {
    const transactions = await this.prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
    return transactions.map(formatCreditTransaction);
  }

  async createBattle(input) {
    const battle = await this.prisma.battle.create({
      data: {
        battleType: input.battleType,
        status: "OPEN",
        prompt: input.prompt || null,
        title: input.title || input.prompt || null,
        description: input.description || null,
        imageUrl: input.imageUrl || null,
        deadlineAt: input.deadlineAt ? toDate(input.deadlineAt) : null,
        isAnonymous: Boolean(input.isAnonymous),
        recommendedScore: input.recommendedScore ?? 50,
        createdByUserId: input.createdByUserId,
        options: {
          create: (input.options || []).map((option) => ({ text: option.text }))
        },
        rules: input.judgingRule
          ? {
              create: {
                rulesJson: input.judgingRule.rulesJson,
                rulesHash: input.judgingRule.rulesHash
              }
            }
          : undefined
      },
      include: battleInclude()
    });
    return formatBattle(battle);
  }

  async listBattles() {
    const battles = await this.prisma.battle.findMany({
      orderBy: { createdAt: "desc" },
      include: battleInclude()
    });
    return battles.map(formatBattle);
  }

  async listArchive() {
    const battles = await this.prisma.battle.findMany({
      where: { status: "SETTLED" },
      orderBy: { settledAt: "desc" },
      include: battleInclude()
    });
    return battles.map(formatBattle);
  }

  async listBattlesByUser(userId) {
    const battles = await this.prisma.battle.findMany({
      where: { createdByUserId: userId },
      orderBy: { createdAt: "desc" },
      include: battleInclude()
    });
    return battles.map(formatBattle);
  }

  async getBattle(battleId) {
    const battle = await this.prisma.battle.findUnique({
      where: { id: battleId },
      include: battleInclude()
    });
    return battle ? formatBattle(battle) : null;
  }

  async setBattleLike(battleId, userId, liked) {
    if (liked) {
      await this.prisma.battleLike.upsert({
        where: {
          battleId_userId: { battleId, userId }
        },
        update: {},
        create: { battleId, userId }
      });
      return { liked: true, likeCount: await this.getBattleLikeCount(battleId) };
    }

    await this.prisma.battleLike.deleteMany({
      where: { battleId, userId }
    });
    return { liked: false, likeCount: await this.getBattleLikeCount(battleId) };
  }

  async getBattleLikeCount(battleId) {
    return this.prisma.battleLike.count({
      where: { battleId }
    });
  }

  async getBattleLikeState(battleId, userId) {
    if (!userId) {
      return false;
    }
    const like = await this.prisma.battleLike.findUnique({
      where: { battleId_userId: { battleId, userId } }
    });
    return Boolean(like);
  }

  async updateBattle(battleId, patch) {
    try {
      const battle = await this.prisma.battle.update({
        where: { id: battleId },
        data: normalizeBattlePatch(patch),
        include: battleInclude()
      });
      return formatBattle(battle);
    } catch (error) {
      if (error.code === "P2025") {
        return null;
      }
      throw error;
    }
  }

  async transitionBattleStatus(battleId, expectedStatus, patch) {
    const result = await this.prisma.battle.updateMany({
      where: {
        id: battleId,
        status: expectedStatus
      },
      data: normalizeBattlePatch(patch)
    });

    if (result.count === 0) {
      return null;
    }

    return this.getBattle(battleId);
  }

  async addEntry(input) {
    const entry = await this.prisma.$transaction(async (tx) => {
      if (input.expectedBattleStatus) {
        const rows = await tx.$queryRaw`
          SELECT "status"
          FROM "battles"
          WHERE "id" = ${input.battleId}
          FOR UPDATE
        `;
        const battle = rows[0];

        if (!battle || battle.status !== input.expectedBattleStatus) {
          return null;
        }
      }

      return tx.entry.create({
        data: {
          battleId: input.battleId,
          optionId: input.optionId || null,
          parentEntryId: input.parentEntryId || null,
          content: input.content,
          submittedByUserId: input.submittedByUserId
        }
      });
    });

    return entry ? formatEntry(entry) : null;
  }

  async listEntriesByBattle(battleId) {
    const entries = await this.prisma.entry.findMany({
      where: { battleId },
      orderBy: { createdAt: "asc" }
    });
    return entries.map(formatEntry);
  }

  async listEntriesByUser(userId) {
    const entries = await this.prisma.entry.findMany({
      where: {
        submittedByUserId: userId,
        battle: {
          participations: {
            some: { userId }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      include: {
        battle: { include: battleInclude() }
      }
    });
    return entries.map((entry) => ({
      ...formatEntry(entry),
      battle: entry.battle ? formatBattle(entry.battle) : null
    }));
  }

  async getEntry(entryId) {
    const entry = await this.prisma.entry.findUnique({
      where: { id: entryId }
    });
    return entry ? formatEntry(entry) : null;
  }

  async getParticipation(battleId, userId) {
    const participation = await this.prisma.battleParticipation.findUnique({
      where: {
        battleId_userId: { battleId, userId }
      }
    });
    return participation ? formatParticipation(participation) : null;
  }

  async createParticipationWithCreditSpend(input) {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const charged = await tx.user.updateMany({
          where: {
            id: input.userId,
            creditBalance: { gte: input.costCredits }
          },
          data: {
            creditBalance: { decrement: input.costCredits }
          }
        });
        if (charged.count === 0) {
          const error = new Error("Not enough demo credits to participate");
          error.code = "INSUFFICIENT_CREDITS";
          throw error;
        }

        const user = await tx.user.findUnique({
          where: { id: input.userId },
          select: { creditBalance: true }
        });
        const transaction = await tx.creditTransaction.create({
          data: {
            userId: input.userId,
            amount: -input.costCredits,
            reason: "PARTICIPATION_SPEND",
            balanceAfter: user.creditBalance,
            metadataJson: input.metadataJson ?? undefined
          }
        });
        const participation = await tx.battleParticipation.create({
          data: {
            battleId: input.battleId,
            userId: input.userId,
            optionId: input.optionId || null,
            entryId: input.entryId || null,
            costCredits: input.costCredits,
            creditTransactionId: transaction.id
          }
        });

        return { participation, transaction };
      });

      return {
        participation: formatParticipation(result.participation),
        transaction: formatCreditTransaction(result.transaction)
      };
    } catch (error) {
      if (error.code === "P2002") {
        const duplicate = new Error("User already participated in this battle");
        duplicate.code = "PARTICIPATION_EXISTS";
        throw duplicate;
      }
      throw error;
    }
  }

  async createParticipation(input) {
    try {
      const participation = await this.prisma.battleParticipation.create({
        data: {
          battleId: input.battleId,
          userId: input.userId,
          optionId: input.optionId || null,
          entryId: input.entryId || null,
          costCredits: input.costCredits,
          creditTransactionId: input.creditTransactionId || null
        }
      });
      return formatParticipation(participation);
    } catch (error) {
      if (error.code === "P2002") {
        const duplicate = new Error("User already participated in this battle");
        duplicate.code = "PARTICIPATION_EXISTS";
        throw duplicate;
      }
      throw error;
    }
  }

  async attachEntryToParticipation(participationId, entryId) {
    try {
      const participation = await this.prisma.battleParticipation.update({
        where: { id: participationId },
        data: { entryId }
      });
      return formatParticipation(participation);
    } catch (error) {
      if (error.code === "P2025") {
        return null;
      }
      throw error;
    }
  }

  async markParticipationRewardClaimed(participationId, claimedAt) {
    const result = await this.prisma.battleParticipation.updateMany({
      where: { id: participationId, rewardClaimedAt: null },
      data: { rewardClaimedAt: toDate(claimedAt) }
    });

    if (result.count === 0) {
      return null;
    }

    const participation = await this.prisma.battleParticipation.findUnique({
      where: { id: participationId }
    });
    return participation ? formatParticipation(participation) : null;
  }

  async claimParticipationReward(input) {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.battleParticipation.updateMany({
          where: {
            id: input.participationId,
            rewardClaimedAt: null
          },
          data: {
            rewardClaimedAt: toDate(input.claimedAt)
          }
        });
        if (claimed.count === 0) {
          const error = new Error("Reward was already claimed");
          error.code = "REWARD_ALREADY_CLAIMED";
          throw error;
        }

        const user = await tx.user.update({
          where: { id: input.userId },
          data: {
            creditBalance: { increment: input.amount }
          }
        });
        const transaction = await tx.creditTransaction.create({
          data: {
            userId: input.userId,
            amount: input.amount,
            reason: "REWARD_CLAIM",
            balanceAfter: user.creditBalance,
            metadataJson: input.metadataJson ?? undefined
          }
        });
        const participation = await tx.battleParticipation.findUnique({
          where: { id: input.participationId }
        });

        return { participation, transaction };
      });

      return {
        participation: formatParticipation(result.participation),
        transaction: formatCreditTransaction(result.transaction)
      };
    } catch (error) {
      if (error.code === "P2025") {
        return null;
      }
      throw error;
    }
  }

  async createJudgingRule(input) {
    const judgingRule = await this.prisma.judgingRule.create({
      data: {
        battleId: input.battleId,
        rulesJson: input.rulesJson,
        rulesHash: input.rulesHash
      }
    });
    return formatJudgingRule(judgingRule);
  }

  async getJudgingRuleByBattle(battleId) {
    const judgingRule = await this.prisma.judgingRule.findFirst({
      where: { battleId },
      orderBy: { createdAt: "desc" }
    });
    return judgingRule ? formatJudgingRule(judgingRule) : null;
  }

  async createVerdict(input) {
    const verdict = await this.prisma.verdict.create({
      data: {
        battleId: input.battleId,
        judgeOutput: input.judgeOutput,
        hashPackage: input.hashPackage,
        modelVersion: input.modelVersion
      }
    });
    return formatVerdict(verdict);
  }

  async getVerdictByBattle(battleId) {
    const verdict = await this.prisma.verdict.findUnique({
      where: { battleId }
    });
    return verdict ? formatVerdict(verdict) : null;
  }

  async createSettlement(input) {
    const settlement = await this.prisma.settlement.create({
      data: {
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
        settledAt: toDate(input.settledAt),
        payloadJson: input.payloadJson
      }
    });
    return formatSettlement(settlement);
  }

  async getSettlementByBattle(battleId) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { battleId }
    });
    return settlement ? formatSettlement(settlement) : null;
  }

  async createReport(input) {
    const report = await this.prisma.report.create({
      data: {
        battleId: input.battleId,
        reporterUserId: input.reporterUserId,
        targetEntryId: input.targetEntryId || null,
        reason: input.reason
      }
    });
    return formatReport(report);
  }

  async createSocialComment(input) {
    const comment = await this.prisma.socialComment.create({
      data: {
        battleId: input.battleId,
        targetEntryId: input.targetEntryId || null,
        authorUserId: input.authorUserId,
        content: input.content
      }
    });
    return formatSocialComment(comment);
  }

  async listSocialCommentsByBattle(battleId) {
    const comments = await this.prisma.socialComment.findMany({
      where: { battleId },
      orderBy: { createdAt: "asc" }
    });
    return comments.map(formatSocialComment);
  }

  async listSocialCommentsByUser(userId) {
    const comments = await this.prisma.socialComment.findMany({
      where: { authorUserId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        battle: { include: battleInclude() },
        targetEntry: true
      }
    });
    return comments.map((comment) =>
      formatSocialComment({
        ...comment,
        battle: comment.battle ? formatBattle(comment.battle) : null,
        entry: comment.targetEntry ? formatEntry(comment.targetEntry) : null
      })
    );
  }

  async setEntryLike(entryId, userId, liked) {
    if (liked) {
      await this.prisma.entryLike.upsert({
        where: {
          entryId_userId: { entryId, userId }
        },
        update: {},
        create: { entryId, userId }
      });
      return { liked: true, likeCount: await this.getEntryLikeCount(entryId) };
    }

    await this.prisma.entryLike.deleteMany({
      where: { entryId, userId }
    });
    return { liked: false, likeCount: await this.getEntryLikeCount(entryId) };
  }

  async getEntryLikeCount(entryId) {
    return this.prisma.entryLike.count({
      where: { entryId }
    });
  }

  async getEntryStats(entryId, userId) {
    const [likeCount, existingLike] = await Promise.all([
      this.getEntryLikeCount(entryId),
      userId
        ? this.prisma.entryLike.findUnique({
            where: { entryId_userId: { entryId, userId } }
          })
        : null
    ]);

    return {
      likeCount,
      likedByMe: Boolean(existingLike)
    };
  }

  async listEntryLikesByUser(userId) {
    const likes = await this.prisma.entryLike.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        entry: {
          include: {
            battle: { include: battleInclude() }
          }
        }
      }
    });

    return likes.map((like) => ({
      id: like.id,
      entryId: like.entryId,
      userId: like.userId,
      createdAt: toIso(like.createdAt),
      entry: like.entry ? formatEntry(like.entry) : null,
      battle: like.entry?.battle ? formatBattle(like.entry.battle) : null
    }));
  }

  async listBattleLikesByUser(userId) {
    const likes = await this.prisma.battleLike.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        battle: { include: battleInclude() }
      }
    });

    return likes.map((like) => ({
      id: like.id,
      battleId: like.battleId,
      userId: like.userId,
      createdAt: toIso(like.createdAt),
      battle: like.battle ? formatBattle(like.battle) : null
    }));
  }

  async createBattleShare(input) {
    const share = await this.prisma.battleShare.create({
      data: {
        battleId: input.battleId,
        userId: input.userId || null,
        channel: input.channel || null
      }
    });
    return formatBattleShare(share);
  }

  async getBattleShareCount(battleId) {
    return this.prisma.battleShare.count({
      where: { battleId }
    });
  }

  async getBattleStats(battleId) {
    const [entryCount, commentCount, shareCount, battleLikeCount, participationCount, entries] = await Promise.all([
      this.prisma.entry.count({ where: { battleId } }),
      this.prisma.socialComment.count({ where: { battleId } }),
      this.getBattleShareCount(battleId),
      this.getBattleLikeCount(battleId),
      this.prisma.battleParticipation.count({ where: { battleId } }),
      this.prisma.entry.findMany({
        where: { battleId },
        select: { id: true }
      })
    ]);
    const entryIds = entries.map((entry) => entry.id);
    const likeCount = entryIds.length
      ? await this.prisma.entryLike.count({ where: { entryId: { in: entryIds } } })
      : 0;

    return {
      entryCount,
      commentCount,
      likeCount,
      battleLikeCount,
      participationCount,
      shareCount
    };
  }

  async createNotification(input) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        battleId: input.battleId || null,
        title: input.title,
        body: input.body
      }
    });
    return formatNotification(notification);
  }

  async listNotificationsByUser(userId) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
    return notifications.map(formatNotification);
  }

  async markNotificationRead(notificationId, userId, readAt) {
    const existing = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId }
    });
    if (!existing) {
      return null;
    }

    if (existing.readAt) {
      return formatNotification(existing);
    }

    const notification = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: toDate(readAt) }
    });
    return formatNotification(notification);
  }

  async markAllNotificationsRead(userId, readAt) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null
      },
      data: {
        readAt: toDate(readAt)
      }
    });

    return {
      readCount: result.count,
      notifications: await this.listNotificationsByUser(userId)
    };
  }
}

function battleInclude() {
  return {
    options: {
      orderBy: { createdAt: "asc" }
    }
  };
}

function normalizeBattlePatch(patch) {
  const normalized = { ...patch };
  for (const key of ["closedAt", "judgingStartedAt", "settledAt", "deadlineAt"]) {
    if (normalized[key]) {
      normalized[key] = toDate(normalized[key]);
    }
  }
  return normalized;
}

function formatBattle(battle) {
  return {
    id: battle.id,
    battleType: battle.battleType,
    status: battle.status,
    prompt: battle.prompt,
    title: battle.title ?? null,
    description: battle.description ?? null,
    imageUrl: battle.imageUrl,
    deadlineAt: toIso(battle.deadlineAt),
    isAnonymous: battle.isAnonymous ?? false,
    recommendedScore: battle.recommendedScore ?? 50,
    options: (battle.options || []).map(formatOption),
    createdByUserId: battle.createdByUserId,
    failureReason: battle.failureReason,
    createdAt: toIso(battle.createdAt),
    closedAt: toIso(battle.closedAt),
    judgingStartedAt: toIso(battle.judgingStartedAt),
    settledAt: toIso(battle.settledAt)
  };
}

function formatOption(option) {
  return {
    id: option.id,
    text: option.text,
    createdAt: toIso(option.createdAt)
  };
}

function formatEntry(entry) {
  return {
    id: entry.id,
    battleId: entry.battleId,
    optionId: entry.optionId,
    parentEntryId: entry.parentEntryId ?? null,
    content: entry.content,
    submittedByUserId: entry.submittedByUserId,
    createdAt: toIso(entry.createdAt)
  };
}

function formatVerdict(verdict) {
  return {
    id: verdict.id,
    battleId: verdict.battleId,
    judgeOutput: verdict.judgeOutput,
    hashPackage: verdict.hashPackage,
    modelVersion: verdict.modelVersion,
    createdAt: toIso(verdict.createdAt)
  };
}

function formatJudgingRule(judgingRule) {
  return {
    id: judgingRule.id,
    battleId: judgingRule.battleId,
    rulesJson: judgingRule.rulesJson,
    rulesHash: judgingRule.rulesHash,
    createdAt: toIso(judgingRule.createdAt)
  };
}

function formatSettlement(settlement) {
  return {
    id: settlement.id,
    battleId: settlement.battleId,
    chainId: settlement.chainId,
    contractAddress: settlement.contractAddress,
    txHash: settlement.txHash,
    explorerUrl: settlement.explorerUrl,
    contentHash: settlement.contentHash,
    optionsHash: settlement.optionsHash,
    entriesRoot: settlement.entriesRoot,
    rulesHash: settlement.rulesHash,
    modelVersionHash: settlement.modelVersionHash,
    winnerHash: settlement.winnerHash,
    mvpEntryHash: settlement.mvpEntryHash,
    verdictHash: settlement.verdictHash,
    settledAt: toIso(settlement.settledAt),
    payloadJson: settlement.payloadJson
  };
}

function formatReport(report) {
  return {
    id: report.id,
    battleId: report.battleId,
    reporterUserId: report.reporterUserId,
    targetEntryId: report.targetEntryId,
    reason: report.reason,
    status: report.status,
    createdAt: toIso(report.createdAt),
    reviewedAt: toIso(report.reviewedAt)
  };
}

function formatWalletChallenge(challenge) {
  return {
    id: challenge.id,
    userId: challenge.userId,
    walletAddress: challenge.walletAddress,
    walletAddressNormalized: challenge.walletAddressNormalized,
    walletProvider: challenge.walletProvider,
    nonce: challenge.nonce,
    message: challenge.message,
    issuedAt: toIso(challenge.issuedAt),
    expiresAt: toIso(challenge.expiresAt),
    usedAt: toIso(challenge.usedAt)
  };
}

function formatCreditTransaction(transaction) {
  return {
    id: transaction.id,
    userId: transaction.userId,
    amount: transaction.amount,
    reason: transaction.reason,
    balanceAfter: transaction.balanceAfter,
    metadataJson: transaction.metadataJson ?? null,
    createdAt: toIso(transaction.createdAt)
  };
}

function formatParticipation(participation) {
  return {
    id: participation.id,
    battleId: participation.battleId,
    userId: participation.userId,
    optionId: participation.optionId,
    entryId: participation.entryId,
    costCredits: participation.costCredits,
    creditTransactionId: participation.creditTransactionId,
    rewardClaimedAt: toIso(participation.rewardClaimedAt),
    createdAt: toIso(participation.createdAt)
  };
}

function formatSocialComment(comment) {
  return {
    id: comment.id,
    battleId: comment.battleId,
    targetEntryId: comment.targetEntryId,
    authorUserId: comment.authorUserId,
    content: comment.content,
    createdAt: toIso(comment.createdAt),
    battle: comment.battle ?? undefined,
    entry: comment.entry ?? undefined
  };
}

function formatBattleShare(share) {
  return {
    id: share.id,
    battleId: share.battleId,
    userId: share.userId,
    channel: share.channel,
    createdAt: toIso(share.createdAt)
  };
}

function formatNotification(notification) {
  return {
    id: notification.id,
    userId: notification.userId,
    battleId: notification.battleId,
    title: notification.title,
    body: notification.body,
    readAt: toIso(notification.readAt),
    createdAt: toIso(notification.createdAt)
  };
}

function formatUser(user) {
  return {
    id: user.id,
    displayName: user.displayName,
    nickname: user.nickname ?? null,
    intro: user.intro ?? null,
    avatarUrl: user.avatarUrl ?? null,
    walletAddress: user.walletAddress ?? null,
    walletProvider: user.walletProvider ?? null,
    creditBalance: user.creditBalance ?? 0,
    createdAt: toIso(user.createdAt)
  };
}

function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}

function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}
