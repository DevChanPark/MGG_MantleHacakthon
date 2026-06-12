# Frontend API Integration Plan

Reference frontend branch: `origin/frontend-b`.

This document maps the current frontend screens to the backend MVP APIs and
the data each screen should consume. It is a planning/handoff document only;
the frontend branch was read but not modified.

## API Call Order

1. App startup/profile hydration: `GET /api/users/me`
2. Signup profile completion/profile edit: `PATCH /api/users/me`
3. Battle list/home data: `GET /api/battles`
4. Battle detail: `GET /api/battles/:battleId`
5. Entry submission: `POST /api/battles/:battleId/entries`
6. Battle close: `POST /api/battles/:battleId/close`
7. Backend judging: `POST /api/battles/:battleId/judge`
8. Result screen: `GET /api/battles/:battleId/result`
9. Archive/profile settled list: `GET /api/archive`

## Screen Data Map

### Onboarding

Backend data needed now:

- none for static onboarding copy/assets

Future navigation targets:

- signup wallet screen
- login/profile hydration with `GET /api/users/me`

### Signup Wallet

Backend data needed now:

- none before wallet provider is selected

Frontend-held input:

- `walletProvider`: `MetaMask`, `OKX Wallet`, or `WalletConnect`
- `walletAddress`: wallet address from the wallet connection flow

Send to backend on the profile step with `PATCH /api/users/me`.

### Signup Profile

Endpoint:

- `PATCH /api/users/me`

Payload:

```json
{
  "nickname": "우기기 장인",
  "intro": "말 안 되는 주장도 끝까지 밀어붙이는 중",
  "avatarUrl": "/uploads/profile.gif",
  "walletProvider": "MetaMask",
  "walletAddress": "0x1111111111111111111111111111111111111111"
}
```

Validation handling:

- `400 VALIDATION_ERROR`: show field-level validation guidance.
- `409 NICKNAME_TAKEN`: keep the user on the nickname form and ask for another
  nickname.

Notes:

- Profile image upload can use `POST /api/uploads/image` first, then pass the
  returned `upload.imageUrl` as `avatarUrl`.
- Wallet fields are metadata only. Do not put wallet keys or backend provider
  secrets in the frontend.

### Profile Summary

Endpoint:

- `GET /api/users/me`

Fields:

- `nickname`
- `displayName`
- `intro`
- `avatarUrl`
- `walletProvider`
- `walletAddress`

Fallback display:

- use `nickname`
- else `displayName`
- else a local placeholder

### Battle Lists And Filters

Endpoint:

- `GET /api/battles`

Fields:

- `battle.id`
- `battle.battleType`
- `battle.status`
- `battle.prompt`
- `battle.imageUrl`
- `battle.options`
- `battle.createdAt`
- `battle.closedAt`
- `battle.settledAt`

Frontend filters:

- open-answer filter: `battleType === "TEXT_OPEN"`
- option filter: `battleType === "OPTION"`
- image filter: `battleType === "IMAGE_CAPTION"`
- open list: `status === "OPEN"`
- settled/archive list: `status === "SETTLED"`

### Battle Detail And Entry Form

Endpoint:

- `GET /api/battles/:battleId`
- `POST /api/battles/:battleId/entries`

Entry payloads:

```json
{
  "content": "Answer, caption, or argument"
}
```

```json
{
  "optionId": "selected-option-id",
  "content": "Argument for the selected option"
}
```

State behavior:

- enable entry form only when `battle.status === "OPEN"`
- disable entry form for `CLOSED`, `JUDGING`, `SETTLED`, and `FAILED`

### Result And Share

Endpoint:

- `GET /api/battles/:battleId/result`

Fields:

- `battle`
- `entries`
- `verdict`
- `hashPackage`
- `settlement`

Render:

- AI verdict title/text
- winner
- top entries
- score table
- `settlement.chainId`
- `settlement.contractAddress`
- `settlement.txHash`
- `settlement.explorerUrl`
- `verdict.shareSummary`

### Archive

Endpoint:

- `GET /api/archive`

Data:

- settled battles only

Use for:

- archive screens
- profile settled battle list until a user-scoped battle endpoint is added

## Keep Mocked Or Deferred

Do not create backend data models for these until separately approved:

- credits/current balance
- credit purchase packages/history/payment approval
- likes
- share counts
- social comments separate from battle entries
- profile tabs for comments and likes

## Guardrails

- Frontend renders state and calls APIs.
- Backend owns AI judging and Mantle settlement.
- Frontend must not receive server wallet private keys, RPC URLs, provider
  secrets, or execute settlement transactions.
- Raw prompts, comments, captions, images, profile data, and personal data must
  not be sent on-chain.
