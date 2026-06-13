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
  "nickname": "demo-captain",
  "intro": "Turns unlikely arguments into demo data.",
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

Mode boundary:

- Use `GET /api/health` to verify `ai.mode` and `mantle.mode` in local/demo
  environments.
- `GET /api/battles/:battleId/result` returns settlement metadata, not a
  settlement `mode` field. The frontend should not decide whether to execute
  real settlement; the backend owns mock/real mode selection.

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

## Frontend Connection Points

These references come from `origin/frontend-b`. The frontend branch was read
only; no frontend files were changed.

### `Frontend_b/src/App.tsx`

- Lines 17-26 route `#signup`, `#signup-profile`, and `#profile` to the signup
  and profile screens.
- Add app-level API base/config here only if the frontend team wants a shared
  client wrapper near the route shell.

### `Frontend_b/src/screens/OnboardingFeed.tsx`

- Lines 394-413 render login/signup actions.
- Signup currently routes to `#signup`; no backend data is needed before that.
- Login modal wallet choices can later hydrate the profile with
  `GET /api/users/me` after the chosen wallet flow completes.

### `Frontend_b/src/screens/SignupWalletScreen.tsx`

- Lines 6-20 define wallet provider choices.
- Lines 25-26 route to `#signup-profile`.
- Preserve the selected provider/address in frontend state or route-level state
  and submit it from the profile step via `PATCH /api/users/me`.

### `Frontend_b/src/screens/SignupProfileScreen.tsx`

- Lines 5-18 contain local nickname duplicate mock validation.
- Lines 34-51 create a local image preview with `FileReader`.
- Lines 105-138 render connected wallet, nickname, and intro fields.
- Line 148 is the signup completion action.

Recommended API wiring:

- Upload a selected profile image with `POST /api/uploads/image` and use
  `upload.imageUrl` as `avatarUrl`.
- On signup completion, call `PATCH /api/users/me`.
- Treat `400 VALIDATION_ERROR` and `409 NICKNAME_TAKEN` as form errors.
- Keep frontend nickname checks for instant UX, but let the backend response be
  the source of truth.

### `Frontend_b/src/screens/ProfileScreen.tsx`

- Lines 13-36 define static `profilePosts`.
- Lines 39-65 define local credit packages and local credit state.
- Lines 81-97 render profile summary and credit row.
- Lines 100-167 render content tabs, battle type filters, and the post list.
- Lines 213-227 mount the credit panel and purchase-complete modal.

Recommended API wiring:

- Replace profile summary copy/image with `GET /api/users/me`.
- Replace battle filter/post list data with `GET /api/battles` for MVP demo
  lists.
- Use `GET /api/archive` for settled/archive data until a user-scoped endpoint
  is approved.
- Keep credits, purchases, likes, share counts, social comments, and profile
  comment/like tabs mocked or disabled for MVP.

## Guardrails

- Frontend renders state and calls APIs.
- Backend owns AI judging and Mantle settlement.
- Frontend must not receive server wallet private keys, RPC URLs, provider
  secrets, or execute settlement transactions.
- Raw prompts, comments, captions, images, profile data, and personal data must
  not be sent on-chain.
