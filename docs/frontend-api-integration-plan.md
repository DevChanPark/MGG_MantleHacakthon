# Frontend API Integration Plan

Reference frontend branch: `origin/frontend-b`.

This document maps the current frontend screens to the backend MVP APIs and
the data each screen should consume. It is a planning/handoff document only;
the frontend branch was read but not modified.

## API Call Order

1. App startup/profile hydration: `GET /api/users/me`
2. Signup profile completion/profile edit: `PATCH /api/users/me`
3. gAon battle list/home data: `GET /api/feed/battles`
4. gAon create battle: `POST /api/feed/battles`
5. gAon battle detail: `GET /api/feed/battles/:battleId`
6. Participation: `POST /api/feed/battles/:battleId/participations`
7. Judged feed comment: `POST /api/feed/battles/:battleId/comments`
8. Demo evaluation: `POST /api/feed/battles/:battleId/evaluate`
9. Reward claim: `POST /api/feed/battles/:battleId/rewards/claim`
10. Notifications: `GET /api/users/me/notifications`

## MVP Decisions

- Demo identity is fixed to `x-user-id: demo-seed-user` for frontend API calls.
- Use backend demo APIs for credits, likes, share counts, social comments, and
  current-account profile comment/like tabs.
- Keep real payment approval/settlement and public profile social tabs deferred.
- Use the backend demo dataset for list/detail/result screens before adding a
  full battle creation UX.
- If close/judge controls are needed for the demo, expose them as demo-only
  actions that call `POST /api/battles/:battleId/close` and
  `POST /api/battles/:battleId/judge`. The frontend must not run AI judging or
  Mantle settlement itself.
- Treat `JUDGING` primarily as a loading state during the judge request. The
  backend transitions `CLOSED -> JUDGING -> SETTLED` inside one judge call.
- For the latest gAon feed UI, prefer `/api/feed/*` endpoints because they map
  backend statuses to `OPEN`, `CLOSED`, `EVALUATING`, `COMPLETED`, and
  `EXPIRED`.

## Screen Data Map

### Onboarding

Backend data needed now:

- none for static onboarding copy/assets

Future navigation targets:

- signup wallet screen
- login/profile hydration with `GET /api/users/me`

### Signup Wallet

Endpoints:

- `POST /api/auth/wallet/challenge`
- `POST /api/auth/wallet/verify`

Frontend-held input:

- `walletProvider`: `MetaMask`, `OKX Wallet`, or `WalletConnect`
- `walletAddress`: wallet address from the wallet connection flow

Call challenge, ask the wallet to sign `challenge.message`, then verify the
signature. Do not send wallet fields through `PATCH /api/users/me`; that route
rejects wallet metadata so the signature flow remains the source of truth.

### Signup Profile

Endpoint:

- `PATCH /api/users/me`

Payload:

```json
{
  "nickname": "demo-captain",
  "intro": "Turns unlikely arguments into demo data.",
  "avatarUrl": "/uploads/profile.gif"
}
```

Validation handling:

- `400 VALIDATION_ERROR`: show field-level validation guidance.
- `409 NICKNAME_TAKEN`: keep the user on the nickname form and ask for another
  nickname.

Notes:

- Profile image upload can use `POST /api/uploads/image` first, then pass the
  returned `upload.imageUrl` as `avatarUrl`.
- Wallet fields must be linked through the challenge/verify flow. Do not put
  wallet keys or backend provider secrets in the frontend.

### Profile Summary

Endpoint:

- `GET /api/users/me`
- `GET /api/users/me/credits`
- `GET /api/users/me/battles`
- `GET /api/users/me/comments`
- `GET /api/users/me/likes`

Fields:

- `nickname`
- `displayName`
- `intro`
- `avatarUrl`
- `walletProvider`
- `walletAddress`
- `creditBalance`

`/comments` includes social comments plus gAon feed comments created after
participation. `/likes` includes liked entries/feed comments plus liked battle
cards.

Fallback display:

- use `nickname`
- else `displayName`
- else a local placeholder

### Battle Lists And Filters

Endpoint:

- `GET /api/feed/battles`
- `GET /api/battles`
- `GET /api/users/me/battles`

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
- `battle.stats.entryCount`
- `battle.stats.commentCount`
- `battle.stats.likeCount`
- `battle.stats.shareCount`

Frontend filters:

- open-answer filter: `battleType === "TEXT_OPEN"`
- option filter: `battleType === "OPTION"`
- image filter: `battleType === "IMAGE_CAPTION"`
- open list: `status === "OPEN"`
- settled/archive list: `status === "SETTLED"`

### Battle Detail And Entry Form

Endpoint:

- `GET /api/feed/battles/:battleId`
- `POST /api/feed/battles/:battleId/participations`
- `POST /api/feed/battles/:battleId/comments`
- `POST /api/feed/comments/:entryId/like`
- `DELETE /api/feed/comments/:entryId/like`
- `GET /api/battles/:battleId`
- `POST /api/battles/:battleId/entries`
- `GET /api/battles/:battleId/comments`
- `POST /api/battles/:battleId/comments`
- `POST /api/entries/:entryId/like`
- `DELETE /api/entries/:entryId/like`
- `POST /api/battles/:battleId/shares`

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
- render social comments separately from battle entries; social comments are not
  judged by AI.
- In gAon feed screens, comments are judged entries and require participation
  first.
- `POST /api/feed/battles/:battleId/participations` returns `balance`,
  `alreadyParticipated`, and `selectedOption`.
- `POST /api/feed/battles/:battleId/evaluate` returns the normal settled result
  plus `feedResult` for the winner modal.
- `POST /api/feed/battles/:battleId/rewards/claim` can reward the winning entry
  owner for TEXT/IMAGE battles or participants on the winning option for OPTION
  battles.

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

- winner
- AI verdict title/text
- top entries
- score table
- `settlement.chainId`
- `settlement.contractAddress`
- `settlement.txHash`
- `settlement.explorerUrl`
- `verdict.shareSummary`

Recommended result order:

1. Winner and verdict title
2. Verdict text
3. Top entries and score table
4. Mantle verification box with settlement metadata
5. Share summary

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

- real credit payment approval/settlement
- real-money credit purchase history
- public profile comment/like tabs for other users
- external share destination integrations

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
- Login modal wallet choices should call the wallet challenge/verify flow, then
  hydrate the profile with `GET /api/users/me`.

### `Frontend_b/src/screens/SignupWalletScreen.tsx`

- Lines 6-20 define wallet provider choices.
- Lines 25-26 route to `#signup-profile`.
- Preserve the selected provider/address in frontend state or route-level state
  long enough to call wallet challenge/verify before or during signup.

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
- Use `GET /api/users/me/battles`, `GET /api/users/me/comments`, and
  `GET /api/users/me/likes` for current-account profile tabs.
- Use `GET /api/users/me/credits` and `POST /api/users/me/credits/demo-charge`
  for the demo credit panel.
- Use `GET /api/archive` for settled/archive data where a global archive is
  desired.

## Guardrails

- Frontend renders state and calls APIs.
- Backend owns AI judging and Mantle settlement.
- Frontend must not receive server wallet private keys, RPC URLs, provider
  secrets, or execute settlement transactions.
- Raw prompts, comments, captions, images, profile data, and personal data must
  not be sent on-chain.
