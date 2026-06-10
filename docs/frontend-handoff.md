# Mobile Frontend Handoff

This document is the backend handoff contract for the mobile-first MGG frontend.

The frontend renders state and calls APIs. It must not run AI judging, execute Mantle transactions, handle server wallet keys, or put raw user content on-chain.

## Core Mobile Flow

1. Call `GET /api/users/me` when the app starts.
2. Create a battle with `POST /api/battles`.
3. Render the battle detail from `GET /api/battles/:battleId`.
4. Submit entries with `POST /api/battles/:battleId/entries` while `battle.status` is `OPEN`.
5. Close a battle with `POST /api/battles/:battleId/close`.
6. Start backend judging with `POST /api/battles/:battleId/judge`.
7. Read settled result with `GET /api/battles/:battleId/result`.
8. Render archive from `GET /api/archive`.

## Battle Status UI Contract

| Status | Mobile UI behavior |
| --- | --- |
| `OPEN` | Show entry form. OPTION battles must show option picker before the comment field. |
| `CLOSED` | Disable entry form. Show a judging action or waiting state. |
| `JUDGING` | Show progress/loading state. Do not retry aggressively. |
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

- AI verdict title and text
- Winner
- Top 3 entries
- Score table
- Mantle verification box with `chainId`, `contractAddress`, `txHash`, and `explorerUrl`
- Share summary

The frontend should use `GET /api/battles/:battleId/result` as the source of truth for result screens.

## Error Handling

| Error code | Mobile behavior |
| --- | --- |
| `VALIDATION_ERROR` | Keep user on the form and show field-level guidance when possible. |
| `BATTLE_NOT_OPEN` | Refresh battle detail and disable entry form. |
| `BATTLE_CANNOT_CLOSE` | Refresh battle detail. The battle was already closed or moved forward. |
| `BATTLE_CANNOT_JUDGE` | Refresh battle detail. Judging may already be running or settled. |
| `RESULT_NOT_READY` | Keep loading or return to battle detail state. |
| `INVALID_JSON` / `INVALID_PATH` | Treat as client request bug and log locally. |

## Security Boundaries

- Never send `SERVER_WALLET_PRIVATE_KEY` to the frontend.
- Never ask the frontend to call `AIVerdictRegistry.recordVerdict()` for MVP.
- Never put raw comments, images, captions, prompts, or personal data on-chain.
- Do not add real-money entry fees, reward pools, gambling flows, or paid token distribution.
