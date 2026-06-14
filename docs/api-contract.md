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

User response:

```json
{
  "id": "demo-user",
  "displayName": "Demo User",
  "nickname": null,
  "intro": null,
  "avatarUrl": null,
  "walletAddress": null,
  "walletProvider": null,
  "creditBalance": 0,
  "createdAt": "2026-06-09T00:00:00.000Z"
}
```

## `PATCH /api/users/me`

Updates MVP profile metadata for the current demo user. Wallet fields are not
accepted here; connect wallets through the wallet challenge/verify API.

```json
{
  "nickname": "demo-captain",
  "intro": "Turns unlikely arguments into demo data.",
  "avatarUrl": "/uploads/profile.gif"
}
```

`nickname` must be unique and not reserved when provided.

## Wallet Connection API

The frontend can connect a wallet through a challenge/signature flow. For the
MVP demo, this links wallet metadata to the current `x-user-id` user.

### `POST /api/auth/wallet/challenge`

```json
{
  "walletAddress": "0x1111111111111111111111111111111111111111",
  "walletProvider": "MetaMask"
}
```

Returns a message that the frontend asks the wallet to sign:

```json
{
  "challenge": {
    "id": "challenge-id",
    "walletAddress": "0x1111111111111111111111111111111111111111",
    "walletProvider": "MetaMask",
    "message": "MGG wallet connection\n...",
    "nonce": "random-nonce",
    "issuedAt": "2026-06-09T00:00:00.000Z",
    "expiresAt": "2026-06-09T00:05:00.000Z"
  }
}
```

### `POST /api/auth/wallet/verify`

```json
{
  "challengeId": "challenge-id",
  "walletAddress": "0x1111111111111111111111111111111111111111",
  "walletProvider": "MetaMask",
  "signature": "0x..."
}
```

Returns the linked user and wallet summary. Reused, expired, mismatched, or
invalid signatures are rejected.

## Demo Credits

Credits are demo ledger data only. They do not create real payment, reward,
entry fee, or gambling flows.

### `GET /api/users/me/credits`

Returns the current demo credit balance and transaction history.

### `POST /api/users/me/credits/demo-charge`

```json
{
  "credits": 30,
  "priceMnt": 30
}
```

Returns the new balance and credit transaction.

## Testnet Credit Exchange API

This API powers the MetaMask testnet MNT-to-service-credit flow. It is not a
gambling, paid reward pool, or real-money payout feature.

Core contract source:

- `DEFAULT_CREDIT_PACKAGES`
- `validateCreditQuoteRequest`
- `validateCreditQuoteResponse`
- `validateCreditExchangeRequest`
- `validateCreditExchangeResponse`

### `GET /api/credits/packages`

Returns supported service credit packages.

```json
{
  "packages": [
    {
      "credits": 30,
      "priceMnt": "0.03",
      "priceWei": "30000000000000000"
    }
  ],
  "tokenSymbol": "MNT",
  "chainId": 5003
}
```

### `POST /api/credits/quote`

```json
{
  "credits": 30
}
```

Returns the amount of testnet MNT and treasury receiver address that the
frontend should use for the MetaMask transfer.

### `POST /api/credits/exchange`

```json
{
  "quoteId": "quote-id",
  "txHash": "0x..."
}
```

The backend must verify the Mantle receipt before crediting the user:

- transaction succeeded
- sender matches the linked wallet
- receiver matches the treasury address
- value matches the quote
- quote is not expired
- txHash has not already been used

## Profile-Owned Lists

These endpoints power the profile tabs for the current account only:

- `GET /api/users/me/battles`
- `GET /api/users/me/comments`: social comments plus gAon feed comments created
  after participation.
- `GET /api/users/me/likes`: liked entries/feed comments plus liked battle
  cards.
- `GET /api/users/me/notifications`
- `POST /api/users/me/notifications/:notificationId/read`
- `POST /api/users/me/notifications/read-all`

Notification responses include `readAt`, `isRead`, `targetType`, and `time`.
Only the current user's notifications can be marked as read.

## gAon Feed API

The latest `feature/frontend-gAon` screens can use these feed-shaped endpoints
instead of adapting the lower-level battle DTOs directly.

### `GET /api/feed/battles`

Returns `FeedBattle` items shaped for `HomeFeed` / `BattleCard`:

```json
{
  "battles": [
    {
      "id": "battle-id",
      "type": "TEXT_OPEN",
      "author": "demo-user",
      "title": "gAon feed battle",
      "description": "Battle body",
      "likeCount": 1,
      "status": "OPEN",
      "recommendedScore": 50,
      "createdAt": "2026-06-09T00:00:00.000Z",
      "deadline": "2026-12-31 23:59",
      "createdByMe": true,
      "comments": [
        {
          "id": "entry-id",
          "entryId": "entry-id",
          "author": "demo-user",
          "text": "My judged feed comment.",
          "likeCount": 1,
          "likedByMe": true
        }
      ],
      "isBattleLiked": true,
      "isParticipated": true,
      "selectedOption": null,
      "selectedOptionId": null
    }
  ]
}
```

Status mapping:

- backend `JUDGING` -> feed `EVALUATING`
- backend `SETTLED` -> feed `COMPLETED`
- expired open battles with `deadlineAt` -> feed `EVALUATING`

### `POST /api/feed/battles`

Creates a battle from the gAon create form. Accepts `title`, `content`,
`deadline`, `isAnonymous`, `options`, and `imageUrl` in addition to the existing
MVP battle fields.

### `GET /api/feed/battles/:battleId`

Returns one feed-shaped battle.

### `POST /api/feed/battles/:battleId/participations`

Spends the demo participation cost, currently 3 credits, and records the current
user's participation. `OPTION` battles require `optionId` or `optionText`.
The response includes `balance`, `alreadyParticipated`, and `selectedOption`.

### `POST /api/feed/battles/:battleId/comments`

Adds a judged feed comment. This creates a backend entry, so it is included in
AI judging. The user must participate first. The request accepts `content` as
the canonical field and `text` as the gAon component alias.

```json
{
  "content": "My judged feed comment."
}
```

### `POST /api/feed/comments/:entryId/replies`

Adds a nested gAon reply under a feed comment. Replies use the same entry-backed
comment shape as top-level feed comments, require prior participation, can be
liked through `POST /api/feed/comments/:entryId/like`, and are not AI winner
candidates.

```json
{
  "text": "Nested reply from the gAon UI."
}
```

### `POST /api/feed/comments/:entryId/like`

Likes one feed comment/entry.

### `DELETE /api/feed/comments/:entryId/like`

Removes the current user's like from one feed comment/entry.

### `POST /api/battles/:battleId/like`

Likes a battle card.

### `DELETE /api/battles/:battleId/like`

Removes the current user's battle like.

### `POST /api/feed/battles/:battleId/evaluate`

Closes an open battle if needed, runs backend AI judging and Mantle settlement,
and returns the settled result. The original result fields remain present, and
the response also includes `feedResult` for the gAon winner modal:

```json
{
  "feedResult": {
    "winnerUserId": "user-id-or-null",
    "winnerEntryId": "entry-id-or-null",
    "winnerCommentId": "entry-id-or-null",
    "winnerOptionId": "option-id-or-null",
    "winningOptionId": "option-id-or-null",
    "winnerName": "Pour",
    "winnerDetail": "Pour 진영",
    "participantCount": 12,
    "rewardCredits": 30,
    "aiSummary": "Short AI summary",
    "verdictLines": ["AI verdict title", "AI verdict text"],
    "optionStats": [{ "optionId": "option-id", "label": "Pour", "percentage": 88 }],
    "optionResults": [{ "label": "Pour", "percentage": 88 }]
  }
}
```

### `POST /api/feed/battles/:battleId/rewards/claim`

Awards the demo winner reward, currently 30 credits, when the current user owns
the winning entry. For `OPTION` battles, participants on the winning option can
claim. Rewards are claimable once.

## `GET /api/battles`

Returns all battles.

## `POST /api/battles`

Creates a battle.

The backend stores a judging-rule snapshot for the battle type at creation time and later uses that snapshot for AI judging and `rulesHash` generation.

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

Battle list/detail responses include a `stats` object when supported:

```json
{
  "entryCount": 2,
  "commentCount": 1,
  "likeCount": 3,
  "battleLikeCount": 1,
  "participationCount": 1,
  "shareCount": 1
}
```

Entry detail responses include:

```json
{
  "likeCount": 1,
  "likedByMe": true
}
```

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

## `POST /api/battles/:battleId/reports`

Creates a simple MVP moderation report for a battle or one entry. This does not change battle state and is not part of AI judging or Mantle settlement.

```json
{
  "targetEntryId": "optional-entry-id",
  "reason": "Spam, abuse, unsafe content, or other review reason"
}
```

`targetEntryId` must belong to the battle when provided.

## Social Comments, Likes, And Shares

Social comments are separate from battle entries and are never included in AI
judging.

### `GET /api/battles/:battleId/comments`

Returns social comments for the battle.

### `POST /api/battles/:battleId/comments`

```json
{
  "targetEntryId": "optional-entry-id",
  "content": "A regular social comment."
}
```

`targetEntryId`, when provided, must belong to the battle.
`text` is also accepted as a compatibility alias for `content`.

### `POST /api/entries/:entryId/like`

Likes one entry for the current user and returns `{ "liked": true, "likeCount": 1 }`.

### `DELETE /api/entries/:entryId/like`

Removes the current user's like and returns `{ "liked": false, "likeCount": 0 }`.

### `POST /api/battles/:battleId/shares`

```json
{
  "channel": "copy-link"
}
```

Records a demo share event and returns the updated `shareCount`.

## `POST /api/battles/:battleId/close`

Transitions an `OPEN` battle to `CLOSED`.

Returns `409 BATTLE_CANNOT_CLOSE` if the battle is no longer `OPEN`.
Also returns `409 BATTLE_CANNOT_CLOSE` if the battle has no entries.

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
