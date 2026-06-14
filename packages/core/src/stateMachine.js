import { BattleDisplayStatus, BattleStatus } from "../../shared/src/index.js";

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

export function mapBattleStatusToDisplayStatus(battleOrStatus, options = {}) {
  const battle =
    battleOrStatus && typeof battleOrStatus === "object"
      ? battleOrStatus
      : { status: battleOrStatus, deadlineAt: options.deadlineAt };
  const now = normalizeNow(options.now);

  if (battle.status === BattleStatus.JUDGING) {
    return BattleDisplayStatus.EVALUATING;
  }

  if (battle.status === BattleStatus.SETTLED) {
    return BattleDisplayStatus.COMPLETED;
  }

  if (battle.status === BattleStatus.FAILED) {
    return BattleDisplayStatus.FAILED;
  }

  if (battle.status === BattleStatus.OPEN && isDeadlineExpired(battle.deadlineAt, now)) {
    return BattleDisplayStatus.EXPIRED;
  }

  if (battle.status === BattleStatus.CLOSED) {
    return BattleDisplayStatus.CLOSED;
  }

  return BattleDisplayStatus.OPEN;
}

export function canDisplayBattleAsParticipatable(battle, options = {}) {
  return mapBattleStatusToDisplayStatus(battle, options) === BattleDisplayStatus.OPEN;
}

function isDeadlineExpired(deadlineAt, now) {
  if (!deadlineAt) {
    return false;
  }

  const deadline = new Date(deadlineAt);
  return Number.isFinite(deadline.getTime()) && deadline.getTime() <= now.getTime();
}

function normalizeNow(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value;
  }

  const parsed = new Date(value ?? Date.now());
  return Number.isFinite(parsed.getTime()) ? parsed : new Date();
}
