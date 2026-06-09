import { randomUUID } from "node:crypto";
import { BattleStatus } from "../../../../packages/shared/src/index.js";

export class MemoryRepository {
  constructor(initialState) {
    this.state = initialState ?? {
      users: [],
      battles: [],
      entries: [],
      verdicts: [],
      settlements: [],
      reports: []
    };
  }

  exportState() {
    return clone(this.state);
  }

  async getOrCreateUser(userId) {
    const id = userId || "demo-user";
    const existing = this.state.users.find((user) => user.id === id);
    if (existing) {
      return clone(existing);
    }

    const user = {
      id,
      displayName: id === "demo-user" ? "Demo User" : `User ${id.slice(0, 8)}`,
      createdAt: now()
    };
    this.state.users.push(user);
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

  async afterMutation() {}
}

function now() {
  return new Date().toISOString();
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}
