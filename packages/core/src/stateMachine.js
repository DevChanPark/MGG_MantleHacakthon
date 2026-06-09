import { BattleStatus } from "../../shared/src/index.js";

export const allowedBattleTransitions = Object.freeze({
  [BattleStatus.OPEN]: [BattleStatus.CLOSED, BattleStatus.FAILED],
  [BattleStatus.CLOSED]: [BattleStatus.JUDGING, BattleStatus.FAILED],
  [BattleStatus.JUDGING]: [BattleStatus.SETTLED, BattleStatus.FAILED],
  [BattleStatus.SETTLED]: [],
  [BattleStatus.FAILED]: []
});

export function canTransitionBattleStatus(from, to) {
  return allowedBattleTransitions[from]?.includes(to) ?? false;
}

export function assertBattleStatusTransition(from, to) {
  if (!canTransitionBattleStatus(from, to)) {
    throw new Error(`Invalid battle status transition: ${from} -> ${to}`);
  }
}

export function assertCanSubmitEntry(battle) {
  if (battle.status !== BattleStatus.OPEN) {
    throw new Error("Entries can only be submitted while battle status is OPEN");
  }
}

export function assertCanCloseBattle(battle) {
  if (battle.status !== BattleStatus.OPEN) {
    throw new Error("Only OPEN battles can be closed");
  }
}

export function assertCanJudgeBattle(battle) {
  if (battle.status !== BattleStatus.CLOSED) {
    throw new Error("Only CLOSED battles can be judged");
  }
}
