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
      reports: []
    };
    this.state.judgingRules ??= [];
    this.state.reports ??= [];
    this.state.users ??= [];
    this.state.users.forEach(normalizeUserProfileFields);
  }

  exportState() {
    return clone(this.state);
  }

  async getOrCreateUser(userId) {
    const id = userId || "demo-user";
    const existing = this.state.users.find((user) => user.id === id);
    if (existing) {
      normalizeUserProfileFields(existing);
      return clone(existing);
    }

    const user = {
      id,
      displayName: id === "demo-user" ? "Demo User" : `User ${id.slice(0, 8)}`,
      nickname: null,
      intro: null,
      avatarUrl: null,
      walletAddress: null,
      walletProvider: null,
      createdAt: now()
    };
    this.state.users.push(user);
    await this.afterMutation();
    return clone(user);
  }

  async getUserByNickname(nickname) {
    return clone(this.state.users.find((user) => user.nickname === nickname) ?? null);
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
    await this.afterMutation();
    return clone(user);
  }

  async createBattle(input) {
    const battle = {
      id: randomUUID(),
      battleType: input.battleType,
      status: BattleStatus.OPEN,
      prompt: input.prompt || null,
      imageUrl: input.imageUrl || null,
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

  async getBattle(battleId) {
    return clone(this.state.battles.find((battle) => battle.id === battleId) ?? null);
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
  user.walletProvider ??= null;
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}
