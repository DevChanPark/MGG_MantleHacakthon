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

  async createBattle(input) {
    const battle = await this.prisma.battle.create({
      data: {
        battleType: input.battleType,
        status: "OPEN",
        prompt: input.prompt || null,
        imageUrl: input.imageUrl || null,
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

  async getBattle(battleId) {
    const battle = await this.prisma.battle.findUnique({
      where: { id: battleId },
      include: battleInclude()
    });
    return battle ? formatBattle(battle) : null;
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
  for (const key of ["closedAt", "judgingStartedAt", "settledAt"]) {
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
    imageUrl: battle.imageUrl,
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

function formatUser(user) {
  return {
    id: user.id,
    displayName: user.displayName,
    createdAt: toIso(user.createdAt)
  };
}

function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}

function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}
