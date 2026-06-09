import { BattleType } from "../../shared/src/index.js";

export function getJudgingRules(battleType) {
  if (battleType === BattleType.OPTION) {
    return {
      battleType,
      criteria: [
        "Argument quality",
        "Humor",
        "Absurd persuasive force",
        "Originality",
        "Meme replay value"
      ],
      note: "Winning side is judged by comment quality, not vote count."
    };
  }

  if (battleType === BattleType.TEXT_OPEN) {
    return {
      battleType,
      criteria: [
        "Funniest or strongest answer",
        "Absurdity with internal confidence",
        "Originality",
        "Persuasive punch",
        "Shareability"
      ]
    };
  }

  if (battleType === BattleType.IMAGE_CAPTION) {
    return {
      battleType,
      criteria: [
        "Image-context fit",
        "Humor",
        "Impact",
        "Meme quality",
        "Shareability"
      ]
    };
  }

  throw new Error(`Unknown battleType: ${battleType}`);
}
