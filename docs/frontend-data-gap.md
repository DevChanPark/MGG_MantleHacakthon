# Frontend Data Gap

This document summarizes the data expected by the current frontend screens and
how it maps to the MVP backend schema.

Reference frontend branch: `origin/frontend-b`.

## Current Frontend Screens

- Onboarding carousel
- Wallet signup
- Profile signup
- Profile page
- Credit charge panel

The current frontend uses static/mock data and does not call the API yet.

## Already Supported By Backend Schema

These can be provided with the current backend models and APIs:

- MVP user identity through `GET /api/users/me`
- Battle types: `TEXT_OPEN`, `OPTION`, `IMAGE_CAPTION`
- Battle statuses: `OPEN`, `CLOSED`, `JUDGING`, `SETTLED`, `FAILED`
- Battle options
- Battle entries
- Judging rule snapshots
- AI verdict output
- Result hash package
- Backend-produced Mantle settlement metadata. Local/demo validation should use
  mock Mantle mode.
- Safety reports
- Local image upload URL for `IMAGE_CAPTION`
- Archive of settled battles
- Wallet challenge/signature verification for wallet connection
- Demo credit balance and demo charge ledger
- Social comments separate from battle entries
- Entry likes
- Battle share event counts
- Current-account profile tabs for my battles, comments, and likes

## MVP Candidate Schema Additions

These are included in the MVP profile schema/API extension:

- `User.nickname`
- `User.intro`
- `User.avatarUrl`
- `User.walletAddress`
- `User.walletProvider`

API addition:

- `PATCH /api/users/me` for nickname, intro, and avatar metadata
- `POST /api/auth/wallet/challenge` and `POST /api/auth/wallet/verify` for
  wallet metadata
- nickname uniqueness and reserved-name validation inside `PATCH /api/users/me`

Notes:

- `displayName` exists today and could be reused as nickname for the first MVP
  pass, but that would not cover intro, avatar, or wallet metadata.
- Wallet fields are linked through the backend wallet challenge/verify flow,
  rejected by profile PATCH, and returned as profile metadata.
- Profile image upload can reuse the existing local upload service, but the
  backend should decide whether profile images share `/uploads/:storageKey`
  with battle images.

## Guardrails

- Do not move AI judging or Mantle transaction execution into the frontend.
- Do not send server wallet keys, RPC URLs, or provider secrets to the frontend.
- Do not put raw prompts, comments, captions, images, profile data, or personal
  data on-chain.
- Do not add credit/payment persistence until the MVP non-goals are revisited.
- Do not create schema migrations from this document without separate approval.
- Keep demo data creation API-driven whenever possible, not raw SQL-driven.

## Keep Deferred For MVP

These frontend concepts are still broader than the committed backend MVP scope:

- Real credit payment approval/settlement flow
- Real-money credit purchase history
- Public profile tabs for other users
- Share destination integrations beyond demo event counting

Reasons to defer:

- Real credit payments may be confused with paid entry fees, reward pools, or
  gambling-like flows, which are explicit MVP non-goals.
- Current demo credits are a local ledger only.
- Social comments are separate from battle entries and must not be mixed into
  AI judging data.

## Seed Data Guidance

Backend verification seed is already covered by API-created data:

- one `TEXT_OPEN` battle
- two entries
- one judging rule snapshot
- one mock AI verdict
- one mock Mantle settlement

Frontend/demo seed should wait until frontend API integration is designed.
When needed, prefer creating seed data through public API calls instead of raw
SQL inserts so validation, status transitions, judging snapshots, and mock
settlement paths are exercised.

Current API-driven demo seed script:

```bash
npm run seed:demo
```

The script expects the API server to be running with `MOCK_AI=true`,
`MOCK_MANTLE=true`, and `REPOSITORY_PROVIDER=prisma`. It refuses to run unless
the API reports mock AI and mock Mantle modes. It also checks existing battle
prompts and skips already-created demo battles to avoid duplicates. It updates
the demo user profile through `PATCH /api/users/me`. Use `DEMO_NICKNAME` to
override the default demo nickname. If that nickname is already taken by
another user, only the profile update is skipped and battle seeding continues.

Current demo seed set:

- demo profile user with nickname, intro, and avatar URL
- demo wallet linked through challenge/signature verification
- demo credit balance/history
- `OPEN` `TEXT_OPEN` battle
- `OPEN` `OPTION` battle
- `OPEN` `IMAGE_CAPTION` battle
- `CLOSED` `TEXT_OPEN` battle
- `SETTLED` `OPTION` battle
- `SETTLED` `IMAGE_CAPTION` battle
- `SETTLED` `TEXT_OPEN` battle
- social comments, entry likes, and share events on newly created demo battles

Full dataset loading details live in `docs/frontend-demo-dataset.md`.

## Remaining Decisions

The MVP user profile schema/API extension is now defined by `GET /api/users/me`
and `PATCH /api/users/me`.

Real payment settlement, public profile data, and external share integrations
remain deferred until their product scope and data ownership are explicitly
approved.
