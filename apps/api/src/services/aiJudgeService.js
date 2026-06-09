import { sha256Hex } from "../../../../packages/core/src/index.js";
import { BattleType, validateJudgeOutput, WinnerType } from "../../../../packages/shared/src/index.js";

export class AiJudgeError extends Error {
  constructor(message) {
    super(message);
    this.name = "AiJudgeError";
  }
}

export function createAiJudgeService(config) {
  return {
    judgeBattle: (input) => judgeBattle(input, config),
    judgeOptionBattle: (input) => judgeOptionBattle(input, config),
    judgeTextOpenBattle: (input) => judgeTextOpenBattle(input, config),
    judgeImageCaptionBattle: (input) => judgeImageCaptionBattle(input, config),
    mockJudgeBattle
  };
}

export async function judgeBattle(input, config = {}) {
  if (config.mockAi) {
    return mockJudgeBattle(input);
  }

  if (input.battle.battleType === BattleType.OPTION) {
    return judgeOptionBattle(input, config);
  }
  if (input.battle.battleType === BattleType.TEXT_OPEN) {
    return judgeTextOpenBattle(input, config);
  }
  if (input.battle.battleType === BattleType.IMAGE_CAPTION) {
    return judgeImageCaptionBattle(input, config);
  }

  throw new AiJudgeError(`Unsupported battleType: ${input.battle.battleType}`);
}

export async function judgeOptionBattle(input, config = {}) {
  return callStructuredJudge(input, config);
}

export async function judgeTextOpenBattle(input, config = {}) {
  return callStructuredJudge(input, config);
}

export async function judgeImageCaptionBattle(input, config = {}) {
  return callStructuredJudge(input, config);
}

export function mockJudgeBattle(input) {
  const scoredEntries = input.entries
    .map((entry) => {
      const seed = Number.parseInt(sha256Hex(`${entry.id}:${entry.content}`).slice(2, 10), 16);
      const humor = 45 + (seed % 50);
      const persuasion = 40 + ((seed >> 2) % 50);
      const originality = 40 + ((seed >> 4) % 55);
      const relevance = 45 + ((seed >> 6) % 50);
      const score = Math.round((humor + persuasion + originality + relevance) / 4);

      return {
        entryId: entry.id,
        optionId: entry.optionId || null,
        score,
        humor,
        persuasion,
        originality,
        relevance,
        reason: "Deterministic mock score for local development."
      };
    })
    .sort((a, b) => b.score - a.score || a.entryId.localeCompare(b.entryId));

  if (scoredEntries.length === 0) {
    throw new AiJudgeError("Cannot judge battle without entries");
  }

  const topEntries = scoredEntries.slice(0, 3).map((entry, index) => ({
    rank: index + 1,
    entryId: entry.entryId,
    score: entry.score,
    reason: entry.reason
  }));

  if (input.battle.battleType === BattleType.OPTION) {
    const optionScores = input.battle.options
      .map((option) => {
        const entries = scoredEntries.filter((entry) => entry.optionId === option.id);
        const score =
          entries.length === 0
            ? 0
            : Math.round(entries.reduce((sum, entry) => sum + entry.score, 0) / entries.length);
        return {
          optionId: option.id,
          score,
          reason: entries.length === 0 ? "No entries submitted for this option." : "Average quality of submitted comments."
        };
      })
      .sort((a, b) => b.score - a.score || a.optionId.localeCompare(b.optionId));

    const winningOption = optionScores[0];
    const mvp = scoredEntries.find((entry) => entry.optionId === winningOption.optionId) ?? scoredEntries[0];

    return validateJudgeOutput(
      {
        winnerType: WinnerType.OPTION,
        winnerOptionId: winningOption.optionId,
        winnerEntryId: mvp.entryId,
        topEntries,
        optionScores,
        scoreTable: scoredEntries,
        verdictTitle: "Mock AI says this side forced the bit hardest",
        verdictText: "The winning side had the strongest mix of absurd confidence, meme energy, and argument quality.",
        shareSummary: "AI judged the comments, not the vote count, and crowned the side with the best nonsense."
      },
      input.battle.battleType
    );
  }

  const winner = scoredEntries[0];
  const title =
    input.battle.battleType === BattleType.IMAGE_CAPTION
      ? "Mock AI found the most shareable caption"
      : "Mock AI picked the strongest open answer";

  return validateJudgeOutput(
    {
      winnerType: WinnerType.ENTRY,
      winnerEntryId: winner.entryId,
      topEntries,
      scoreTable: scoredEntries,
      verdictTitle: title,
      verdictText: "The winning entry balanced humor, confidence, originality, and clean meme impact.",
      shareSummary: "AI selected a winner with deterministic mock scoring for local development."
    },
    input.battle.battleType
  );
}

async function callStructuredJudge(input, config) {
  if (!config.openAiApiKey) {
    throw new AiJudgeError("OPENAI_API_KEY is required when MOCK_AI=false");
  }

  const prompt = buildJudgePrompt(input);
  let lastError;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${config.openAiApiKey}`
        },
        body: JSON.stringify({
          model: config.openAiModel,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are the MGG AI judge. Return only valid JSON matching the requested schema. Do not include markdown."
            },
            { role: "user", content: prompt }
          ]
        })
      });

      if (!response.ok) {
        throw new AiJudgeError(`AI provider returned HTTP ${response.status}`);
      }

      const payload = await response.json();
      const content = payload.choices?.[0]?.message?.content;
      const parsed = JSON.parse(content);
      return validateJudgeOutput(parsed, input.battle.battleType);
    } catch (error) {
      lastError = error;
    }
  }

  if (config.aiFallbackToMock) {
    return mockJudgeBattle(input);
  }

  throw new AiJudgeError(`AI judge failed to return valid structured JSON: ${lastError?.message || "unknown error"}`);
}

function buildJudgePrompt(input) {
  return JSON.stringify(
    {
      instruction:
        "Judge this MGG battle. Use public criteria only. Do not count votes. Return JSON with winnerType, winnerOptionId or winnerEntryId, topEntries, optionScores for OPTION, scoreTable, verdictTitle, verdictText, shareSummary.",
      battle: input.battle,
      entries: input.entries,
      rules: input.rules
    },
    null,
    2
  );
}
