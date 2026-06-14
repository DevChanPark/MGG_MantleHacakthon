# Core Contract

Updated: 2026-06-15

This document defines the shared Core contract that Backend and Frontend should follow.

## Source of Truth

Core-owned packages:

- `packages/shared`: DTO constants, validators, request/response shape guards
- `packages/core`: state machine, display status mapping, hash helpers, judge rules, contract ABI

Backend and Frontend must not redefine these rules locally once they integrate with the workspace packages.

## Battle Status

Backend status values:

```text
OPEN
CLOSED
JUDGING
SETTLED
FAILED
```

Frontend display status values:

```text
OPEN
CLOSED
EVALUATING
COMPLETED
EXPIRED
FAILED
```

Use `mapBattleStatusToDisplayStatus()` from `packages/core`:

```js
import { mapBattleStatusToDisplayStatus } from "@mgg/core";
```

Mapping:

- `OPEN` -> `OPEN`
- expired `OPEN` battle -> `EXPIRED`
- `CLOSED` -> `CLOSED`
- `JUDGING` -> `EVALUATING`
- `SETTLED` -> `COMPLETED`
- `FAILED` -> `FAILED`

## Wallet Login Contract

Wallet login uses challenge/signature verification.

Flow:

```text
Frontend requests wallet accounts
-> POST /api/auth/wallet/challenge
-> wallet signs challenge.message
-> POST /api/auth/wallet/verify
-> backend links wallet to user
```

Shared validators:

- `validateWalletChallengeRequest()`
- `validateWalletVerifyRequest()`
- `normalizeEvmAddress()`
- `isEvmAddress()`

The wallet provider is not hardcoded to one developer wallet. Any valid EVM address can be used.

Frontend must never store private keys or seed phrases.

## Credit Exchange Contract

Credit exchange converts Mantle testnet MNT into internal service credits.

This is not gambling, not a paid reward pool, and not a real-money payout flow.

Shared constants:

- `MANTLE_TESTNET_CHAIN_ID`
- `MNT_SYMBOL`
- `MNT_DECIMALS`
- `DEFAULT_CREDIT_PACKAGES`
- `CreditTransactionReason.MNT_EXCHANGE`

Shared validators:

- `validateCreditPackage()`
- `validateCreditQuoteRequest()`
- `validateCreditQuoteResponse()`
- `validateCreditExchangeRequest()`
- `validateCreditExchangeResponse()`
- `validateCreditExchangeMetadata()`

Recommended API flow:

```text
GET /api/credits/packages
POST /api/credits/quote
Frontend sends native MNT transfer through MetaMask
POST /api/credits/exchange with txHash
Backend verifies receipt and credits ledger
```

Backend verification requirements:

- transaction succeeded
- chain id matches Mantle testnet
- sender matches linked wallet
- receiver matches treasury address
- value matches quote
- quote is not expired
- txHash has not been used before

## Credit Transaction Reasons

Shared reasons:

```text
DEMO_CHARGE
MNT_EXCHANGE
PARTICIPATION_SPEND
REWARD_CLAIM
```

Use `MNT_EXCHANGE` for testnet MNT-to-credit conversions.

## Required Env Keys for Credit Exchange

```text
MANTLE_CREDIT_EXCHANGE_ENABLED
MOCK_CREDIT_EXCHANGE
MANTLE_CREDIT_TREASURY_ADDRESS
MANTLE_CREDIT_CHAIN_ID
MANTLE_CREDIT_RPC_URL
MANTLE_CREDIT_CONFIRMATIONS
MNT_CREDIT_RATE
```

`MOCK_CREDIT_EXCHANGE=true` may keep exchange local/mock for demos. `MOCK_CREDIT_EXCHANGE=false` should verify real Mantle testnet receipts. This flag is separate from `MOCK_MANTLE`, so verdict settlement can remain mocked while credit exchange uses real receipt verification.

## Hashing Contract

Use `buildVerdictHashPackage()` and `sha256Hex()` from `packages/core`.

The hash package must remain deterministic and must not write raw user-generated content on-chain.

Hash package fields:

```text
contentHash
optionsHash
entriesRoot
rulesHash
modelVersionHash
winnerHash
mvpEntryHash
verdictHash
```
