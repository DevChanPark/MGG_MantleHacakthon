# API Contract

Base URL: `http://localhost:4000`

All request bodies are JSON. The frontend may pass `x-user-id` for MVP demo identity. If omitted, the backend uses `demo-user`.

## Mobile-First Notes

The MVP backend is designed for a mobile-first frontend:

- The frontend should drive the UI from `battle.status`.
- The frontend should not execute AI judging or Mantle transactions.
- Result screens should use `verdict`, `hashPackage`, and `settlement` from `GET /api/battles/:battleId/result`.
- Local images are uploaded through the backend and served from `/uploads/:storageKey`.
- Repeated `close` or `judge` calls return `409` instead of starting duplicate lifecycle work.

## `GET /api/health`

Returns service health and backend-owned dependency readiness. This response must not expose API keys, RPC URLs, private keys, or local storage paths.

```json
{
  "ok": true,
  "service": "mgg-api",
  "ai": {
    "mode": "mock",
    "ready": true,
    "model": "mock-mgg-judge-v1"
  },
  "mantle": {
    "mode": "mock",
    "ready": true,
    "chainId": 5003,
    "contractAddress": "0x0000000000000000000000000000000000000000"
  },
  "storage": {
    "provider": "local",
    "ready": true,
    "maxImageBytes": 3145728,
    "allowedTypes": ["image/png", "image/jpeg", "image/webp", "image/gif"]
  }
}
```

## `GET /api/users/me`

Returns or creates the current MVP demo user.

## `GET /api/battles`

Returns all battles.

## `POST /api/battles`

Creates a battle.

OPTION:

```json
{
  "battleType": "OPTION",
  "prompt": "Which snack survives the apocalypse?",
  "options": ["Tteokbokki", "Triangle kimbap"]
}
```

TEXT_OPEN:

```json
{
  "battleType": "TEXT_OPEN",
  "prompt": "Explain why your umbrella deserves a promotion."
}
```

IMAGE_CAPTION:

```json
{
  "battleType": "IMAGE_CAPTION",
  "prompt": "Optional caption direction",
  "imageUrl": "/uploads/example.webp"
}
```

## `GET /api/battles/:battleId`

Returns battle detail and entries.

## `POST /api/battles/:battleId/entries`

Submits an entry while battle status is `OPEN`.

OPTION requires `optionId`:

```json
{
  "optionId": "option-id",
  "content": "This option wins because the logic has left the building."
}
```

TEXT_OPEN and IMAGE_CAPTION:

```json
{
  "content": "A caption, answer, headline, or one-liner."
}
```

## `POST /api/battles/:battleId/close`

Transitions an `OPEN` battle to `CLOSED`.

Returns `409 BATTLE_CANNOT_CLOSE` if the battle is no longer `OPEN`.

## `POST /api/battles/:battleId/judge`

Runs the common battle pipeline:

`CLOSED -> JUDGING -> AI judge -> hash package -> Mantle settlement -> SETTLED`

If AI or settlement fails, the battle transitions to `FAILED` with a sanitized error.

Returns `409 BATTLE_CANNOT_JUDGE` if the battle is not `CLOSED` or another judge run already started.

## `GET /api/battles/:battleId/result`

Returns settled result:

- battle
- entries
- verdict
- hashPackage
- settlement metadata

If result is not settled, returns `409 RESULT_NOT_READY`.

Result response shape:

```json
{
  "battle": {
    "id": "battle-id",
    "battleType": "TEXT_OPEN",
    "status": "SETTLED",
    "prompt": "Prompt text",
    "imageUrl": null,
    "options": [],
    "createdAt": "2026-06-09T00:00:00.000Z",
    "closedAt": "2026-06-09T00:01:00.000Z",
    "settledAt": "2026-06-09T00:02:00.000Z"
  },
  "entries": [],
  "verdict": {
    "winnerType": "ENTRY",
    "winnerOptionId": null,
    "winnerEntryId": "entry-id",
    "topEntries": [{ "rank": 1, "entryId": "entry-id", "score": 88, "reason": "Strongest answer." }],
    "scoreTable": [{ "entryId": "entry-id", "optionId": null, "score": 88, "reason": "Strongest answer." }],
    "verdictTitle": "AI verdict title",
    "verdictText": "AI verdict text",
    "shareSummary": "Short share text"
  },
  "hashPackage": {
    "contentHash": "0x...",
    "optionsHash": null,
    "entriesRoot": "0x...",
    "rulesHash": "0x...",
    "modelVersionHash": "0x...",
    "winnerHash": "0x...",
    "mvpEntryHash": "0x...",
    "verdictHash": "0x..."
  },
  "settlement": {
    "id": "settlement-id",
    "chainId": 5003,
    "contractAddress": "0x...",
    "txHash": "0x...",
    "explorerUrl": "https://sepolia.mantlescan.xyz/tx/0x...",
    "settledAt": "2026-06-09T00:02:00.000Z"
  }
}
```

## `GET /api/archive`

Returns settled battles only.

## `POST /api/uploads/image`

MVP local upload. The backend stores the raw image off-chain and returns a local URL. The API server serves local files back from `GET /uploads/:storageKey`.

```json
{
  "fileName": "meme.webp",
  "contentType": "image/webp",
  "base64Data": "..."
}
```

On-chain settlement records only hashes from the verdict package. It never records raw comments, raw images, or personal data.

## Shared Contracts

`BattleType`, `BattleStatus`, `JudgeInput`, `JudgeOutput`, and `ResultResponse` are owned by `packages/shared`.

Prisma stores `battleType` and `status` as strings so the shared package remains the single source of truth for valid battle/status values.
