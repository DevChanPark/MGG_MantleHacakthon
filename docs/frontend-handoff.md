# Mobile Frontend Handoff

This document is the backend handoff contract for the mobile-first MGG frontend.

The frontend renders state and calls APIs. It must not run AI judging, execute Mantle transactions, handle server wallet keys, or put raw user content on-chain.

For the MVP demo, use a fixed demo identity header:

```http
x-user-id: demo-seed-user
```

## Core Mobile Flow

1. Call `GET /api/users/me` when the app starts.
2. During wallet signup/login, call the wallet challenge/verify API.
3. During signup/profile editing, save profile metadata with `PATCH /api/users/me`.
4. Create a battle with `POST /api/battles`.
5. Render the battle detail from `GET /api/battles/:battleId`.
6. Submit entries with `POST /api/battles/:battleId/entries` while `battle.status` is `OPEN`.
7. Close a battle with `POST /api/battles/:battleId/close`.
8. Start backend judging with `POST /api/battles/:battleId/judge`.
9. Read settled result with `GET /api/battles/:battleId/result`.
10. Render archive from `GET /api/archive`.

## Wallet Flow

Use the backend challenge/verify flow for wallet connection:

1. `POST /api/auth/wallet/challenge` with `walletAddress` and `walletProvider`.
2. Ask the wallet to sign `challenge.message`.
3. `POST /api/auth/wallet/verify` with `challengeId`, `walletAddress`, optional
   `walletProvider`, and `signature`.

This links the wallet to the current MVP user. Do not send private keys to the
backend.

## Profile Flow

The frontend should call `GET /api/users/me` to hydrate profile state and
`PATCH /api/users/me` when the signup profile form or profile edit form is
submitted.

```json
{
  "nickname": "demo-captain",
  "intro": "Turns unlikely arguments into demo data.",
  "avatarUrl": "/uploads/profile.gif"
}
```

- `nickname` is required for signup UX, but the API accepts partial profile
  updates for edit forms.
- `nickname` must be unique and not reserved.
- Wallet fields are rejected by `PATCH /api/users/me`; use the wallet
  challenge/verify flow above. The frontend must not receive server wallet
  keys, sign backend settlement transactions, or execute Mantle settlement.

## Profile And Social Data

The profile screen can now use backend-owned demo/social data:

- `GET /api/users/me/battles` for the current user's created battles.
- `GET /api/users/me/comments` for the current user's social comments and gAon
  feed comments.
- `GET /api/users/me/likes` for the current user's liked entries/feed comments
  and liked battle cards.
- `GET /api/users/me/credits` for demo credit balance/history.
- `POST /api/users/me/credits/demo-charge` for demo-only credit charging.

Battle list/detail responses include `battle.stats.entryCount`,
`battle.stats.commentCount`, `battle.stats.likeCount`, and
`battle.stats.shareCount`. Entry detail responses include
`entry.stats.likeCount` and `entry.stats.likedByMe`.

Social interactions:

- `POST /api/battles/:battleId/comments`
- `GET /api/battles/:battleId/comments`
- `POST /api/entries/:entryId/like`
- `DELETE /api/entries/:entryId/like`
- `POST /api/battles/:battleId/shares`

Social comments are separate from battle entries and must not be submitted to AI
judging.

## gAon Home Feed Flow

The latest `feature/frontend-gAon` home/detail/create screens can use the
feed-shaped API:

1. `GET /api/feed/battles` for `HomeFeed`.
2. `POST /api/feed/battles` for `CreateBattleScreen`.
3. `GET /api/feed/battles/:battleId` for `BattleDetailScreen`.
4. `POST /api/feed/battles/:battleId/participations` when the user taps
   `참여하기`. This spends 3 demo credits and returns `selectedOption` for
   OPTION battles.
5. `POST /api/feed/battles/:battleId/comments` after participation. This creates
   a judged backend entry.
6. `POST /api/battles/:battleId/like` and `DELETE /api/battles/:battleId/like`
   for battle card likes.
7. `POST /api/feed/comments/:entryId/like` and
   `DELETE /api/feed/comments/:entryId/like` for comment likes.
8. `POST /api/feed/battles/:battleId/evaluate` for the demo evaluate action.
   Use `feedResult` for the gAon winner modal.
9. `POST /api/feed/battles/:battleId/rewards/claim` for winner credit claim.
   TEXT/IMAGE rewards use the winning entry; OPTION rewards use the winning
   option side.
10. `GET /api/users/me/notifications` for the notification panel.

Feed comments are entries in the backend because the gAon UI uses them as AI
judging material. The older social comment endpoints remain available for
non-judged comments.

## Battle Status UI Contract

| Status | Mobile UI behavior |
| --- | --- |
| `OPEN` | Show entry form. OPTION battles must show option picker before the comment field. |
| `CLOSED` | Disable entry form. Show a demo-only judging action or waiting state. |
| `JUDGING` | Show progress/loading state during the judge request. Do not retry aggressively. |
| `SETTLED` | Fetch and render result page, score table, Top 3, winner, AI verdict, and Mantle verification box. |
| `FAILED` | Show a safe failure message and retry/recreate affordance. |

## Battle Type Inputs

### OPTION

Create:

```json
{
  "battleType": "OPTION",
  "prompt": "Question",
  "options": ["A", "B"]
}
```

Entry:

```json
{
  "optionId": "selected-option-id",
  "content": "Comment"
}
```

### TEXT_OPEN

Create:

```json
{
  "battleType": "TEXT_OPEN",
  "prompt": "Open prompt"
}
```

Entry:

```json
{
  "content": "Answer"
}
```

### IMAGE_CAPTION

Upload first:

```json
{
  "fileName": "meme.webp",
  "contentType": "image/webp",
  "base64Data": "..."
}
```

Create:

```json
{
  "battleType": "IMAGE_CAPTION",
  "prompt": "Optional direction",
  "imageUrl": "/uploads/storage-key.webp"
}
```

Entry:

```json
{
  "content": "Caption"
}
```

## Result Rendering Requirements

The mobile result page should render:

- Winner
- AI verdict title and text
- Top 3 entries
- Score table
- Mantle verification box with `chainId`, `contractAddress`, `txHash`, and `explorerUrl`
- Share summary

Recommended order:

1. Winner and verdict title
2. Verdict text
3. Top 3 entries and score table
4. Mantle verification box
5. Share summary

The frontend should use `GET /api/battles/:battleId/result` as the source of truth for result screens.

## Error Handling

| Error code | Mobile behavior |
| --- | --- |
| `VALIDATION_ERROR` | Keep user on the form and show field-level guidance when possible. |
| `BATTLE_NOT_OPEN` | Refresh battle detail and disable entry form. |
| `BATTLE_CANNOT_CLOSE` | Refresh battle detail. The battle was already closed or moved forward. |
| `BATTLE_CANNOT_JUDGE` | Refresh battle detail. Judging may already be running or settled. |
| `RESULT_NOT_READY` | Keep loading or return to battle detail state. |
| `NICKNAME_TAKEN` | Keep user on the profile form and ask for another nickname. |
| `INVALID_JSON` / `INVALID_PATH` | Treat as client request bug and log locally. |

## Safety Reports

The mobile frontend may call `POST /api/battles/:battleId/reports` to submit a simple moderation report. This is optional for the MVP flow and must not block the battle loop.

```json
{
  "targetEntryId": "optional-entry-id",
  "reason": "Review reason"
}
```

## Security Boundaries

- Never send `SERVER_WALLET_PRIVATE_KEY` to the frontend.
- Never ask the frontend to call `AIVerdictRegistry.recordVerdict()` for MVP.
- Never put raw comments, images, captions, prompts, or personal data on-chain.
- Do not add real-money entry fees, reward pools, gambling flows, or paid token distribution.
- Demo credits are local ledger/demo data only and must not be presented as
  real-money rewards or paid entry mechanics.
