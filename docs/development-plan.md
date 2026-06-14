# MGG Development Plan

Updated: 2026-06-15

## 1. Current Integration State

`dev` has been updated with the latest work from:

- `backend`
- `frontend-b`
- `feature/frontend-gAon`
- `core` and `frontend-a` are already ancestors of the current `dev`

Current repository shape:

- `apps/api`: Node.js backend API
- `packages/shared`: shared constants and request validators
- `packages/core`: state machine, judging rules, hashing helpers, registry ABI
- `prisma`: Postgres schema and migrations
- `Frontend_b`: Vite React frontend, currently mock/sessionStorage driven
- `docs`: API, frontend handoff, Mantle settlement, and backend notes

Important mismatch:

- Root workspace includes `apps/*` and `packages/*`, but the frontend currently lives in `Frontend_b`.
- For long-term consistency, move or remount the frontend as `apps/web`.
- For fastest demo integration, the existing `Frontend_b` app can be wired first, then renamed.

## 2. Development Goals

### Goal A: Connect Backend and Frontend

Replace frontend mock/sessionStorage flows with backend APIs while preserving the current mobile UI.

Primary API targets:

- `GET /api/health`
- `GET /api/users/me`
- `PATCH /api/users/me`
- `GET /api/users/me/credits`
- `POST /api/auth/wallet/challenge`
- `POST /api/auth/wallet/verify`
- `GET /api/feed/battles`
- `POST /api/feed/battles`
- `GET /api/feed/battles/:battleId`
- `POST /api/feed/battles/:battleId/participations`
- `POST /api/feed/battles/:battleId/comments`
- `POST /api/feed/comments/:entryId/replies`
- `POST /api/feed/battles/:battleId/evaluate`
- `POST /api/feed/battles/:battleId/rewards/claim`

Frontend work:

- Add an API client layer with a single base URL config.
- Hydrate current user and credit balance on app startup.
- Replace local battle mocks with `/api/feed/battles`.
- Replace local participation credit spending with backend participation API.
- Replace local comments, replies, likes, rewards, and share counters with backend calls where endpoints already exist.
- Keep frontend strictly rendering state and calling APIs.

Backend work:

- Confirm CORS and local dev env support for the frontend dev server.
- Keep `x-user-id` MVP identity support until full auth/session work is decided.
- Add missing feed endpoints only if the frontend screen needs them and the route does not already exist.

## 3. Core Development Scope

Core must remain the source of truth for shared rules used by frontend and backend.

Immediate core tasks:

1. Convert shared/core to stronger package contracts.
   - Keep `BattleType` and `BattleStatus` centralized.
   - Add structured DTO exports for wallet login and credit exchange.
   - Add tests for validators and state transitions.
2. Stabilize battle state naming.
   - Core/backend use `OPEN`, `CLOSED`, `JUDGING`, `SETTLED`, `FAILED`.
   - Frontend currently displays `OPEN`, `CLOSED`, `EVALUATING`, `COMPLETED`, `EXPIRED`.
   - Define an explicit display-status mapper instead of duplicating state names.
3. Strengthen deterministic hashing.
   - Keep raw user content off-chain.
   - Ensure verdict hash packages are canonical and repeatable.
   - Add fixtures for all three battle types.
4. Define wallet and credit schemas.
   - Wallet challenge request/response
   - Wallet verify request/response
   - Credit quote request/response
   - Credit exchange request/response
   - Credit transaction shape
5. Add contract-facing constants.
   - Mantle testnet chain id
   - MNT decimals
   - supported credit packages
   - treasury/receiver address config keys

## 4. Wallet Login Plan

Requirement:

- Implement MetaMask login in a way that works for any user's wallet, not a hardcoded developer wallet.

Current backend foundation:

- `POST /api/auth/wallet/challenge`
- `POST /api/auth/wallet/verify`
- `WalletChallenge` table
- wallet fields on `User`
- signature-based linking documented in `docs/api-contract.md`

Frontend implementation plan:

1. Detect EIP-1193 provider through `window.ethereum`.
2. Request accounts with `eth_requestAccounts`.
3. Read selected wallet address.
4. Call `POST /api/auth/wallet/challenge`.
5. Ask wallet to sign `challenge.message` using `personal_sign`.
6. Call `POST /api/auth/wallet/verify`.
7. Store only non-secret session metadata locally:
   - current user id
   - wallet address
   - wallet provider
8. Never store private keys or seed phrases.

Backend/Core implementation plan:

1. Keep nonce expiry and one-time-use challenge behavior.
2. Verify signatures server-side.
3. Normalize wallet addresses in Core/shared helpers.
4. Reject wallet profile edits outside the challenge/verify flow.
5. Keep support for any EVM wallet address.

## 5. Test MNT to Service Credit Exchange Plan

Requirement:

- Users can exchange test MNT from their MetaMask wallet for in-service credits.

MVP boundary:

- This is a testnet/demo credit purchase flow.
- It must not be described as gambling, reward pools, or paid battle payouts.
- Credits are internal service credits only.
- The backend validates on-chain payment and credits the user ledger.

Recommended flow:

1. Frontend requests a credit quote.
   - package: credits requested
   - price: test MNT amount
   - receiver: backend treasury address
   - chain id: Mantle testnet
2. Frontend asks MetaMask to switch/add Mantle testnet if needed.
3. Frontend sends a native MNT transfer transaction to the treasury address.
4. Frontend submits `txHash` to backend.
5. Backend reads the transaction receipt from Mantle RPC.
6. Backend verifies:
   - transaction succeeded
   - chain id is expected
   - sender matches linked wallet
   - receiver matches treasury address
   - value matches quoted price
   - txHash was not used before
7. Backend credits the user's internal balance.
8. Backend stores a credit transaction with on-chain metadata.

New API proposal:

- `GET /api/credits/packages`
- `POST /api/credits/quote`
- `POST /api/credits/exchange`

Draft exchange request:

```json
{
  "quoteId": "quote-id",
  "txHash": "0x..."
}
```

Draft exchange response:

```json
{
  "balance": 130,
  "transaction": {
    "id": "credit-transaction-id",
    "amount": 100,
    "reason": "MNT_EXCHANGE",
    "balanceAfter": 130,
    "metadata": {
      "chainId": 5003,
      "txHash": "0x...",
      "from": "0x...",
      "to": "0x...",
      "valueWei": "1000000000000000"
    }
  }
}
```

Database additions likely needed:

- `CreditQuote`
  - `id`
  - `userId`
  - `walletAddressNormalized`
  - `credits`
  - `priceWei`
  - `chainId`
  - `receiverAddress`
  - `expiresAt`
  - `usedAt`
- `CreditTransaction`
  - keep existing table
  - add or standardize metadata for `txHash`, `chainId`, `from`, `to`, `valueWei`
- Unique protection for used `txHash`
  - either dedicated `CreditExchange` table or unique field inside quote/exchange records

Environment additions:

- `MANTLE_CREDIT_EXCHANGE_ENABLED`
- `MOCK_CREDIT_EXCHANGE`
- `MANTLE_CREDIT_TREASURY_ADDRESS`
- `MANTLE_CREDIT_CHAIN_ID`
- `MANTLE_CREDIT_RPC_URL`
- `MANTLE_CREDIT_CONFIRMATIONS`
- `MNT_CREDIT_RATE`

Local development modes:

- `MOCK_MANTLE=true`: AI verdict settlement can stay mocked locally.
- `MOCK_CREDIT_EXCHANGE=true`: exchange can accept deterministic mock tx hashes for demo.
- `MOCK_CREDIT_EXCHANGE=false`: backend verifies real Mantle testnet receipts.

## 6. Role Boundaries

Core/shared:

- Battle and wallet DTOs
- Validation rules
- Wallet address normalization
- credit package schema
- status mapping helpers
- deterministic hash helpers

Backend:

- API routes
- Prisma persistence
- wallet signature verification
- Mantle receipt verification
- credit ledger mutation
- AI judge and settlement execution

Frontend:

- wallet provider detection
- MetaMask account request
- MetaMask signing prompt
- MetaMask native MNT transfer prompt
- API calls
- rendering user, credit, battle, and result state

Contracts:

- `AIVerdictRegistry` for verdict hash recording only.
- Do not put raw comments, images, profile data, or credit purchase details on this contract.
- Credit exchange can use native MNT transfer plus backend receipt verification for MVP; a dedicated payment contract is optional and should be deferred unless required.

## 7. Implementation Order

1. Normalize frontend app placement.
   - Preferred: move `Frontend_b` to `apps/web`.
   - Fast path: keep `Frontend_b` and add root scripts.
2. Add frontend API client and env config.
3. Wire app startup to `GET /api/users/me` and `GET /api/users/me/credits`.
4. Wire MetaMask login/signup to wallet challenge/verify.
5. Replace feed mocks with `/api/feed/battles`.
6. Replace participation/comment/reply/like/reward mock mutations with backend calls.
7. Add Core credit exchange schemas and constants.
8. Add backend credit quote/exchange endpoints.
9. Add Mantle testnet transaction verification for credit exchange.
10. Add frontend credit package purchase flow using MetaMask native MNT transfer.
11. Add tests:
    - Core validators and state mapping
    - Backend wallet challenge/verify
    - Backend credit exchange duplicate tx rejection
    - Frontend API client happy/error states
12. Run end-to-end demo:
    - login wallet
    - exchange test MNT for credits
    - participate in a battle
    - submit/comment
    - close/evaluate
    - view settled result

## 8. Open Questions

1. Should the frontend be renamed to `apps/web` now, or after API wiring?
2. What testnet treasury address should receive MNT for credit exchanges?
3. What MNT-to-credit rate should the demo use?
4. How many confirmations should the backend require before crediting?
5. Should credit exchange be enabled only in demo/testnet environments?
6. Should `frontend-a` own wallet/credit UI while `frontend-b` owns feed/result integration, or should one branch own all frontend integration?
