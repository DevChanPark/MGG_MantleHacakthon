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

## MVP Candidate Schema Additions

These are small enough to consider for MVP if the frontend profile/signup flow
is connected to the backend:

- `User.nickname`
- `User.intro`
- `User.avatarUrl`
- `User.walletAddress`
- `User.walletProvider`

Potential API additions:

- `PATCH /api/users/me` for nickname, intro, avatar, and wallet metadata
- nickname availability check, or validation inside `PATCH /api/users/me`

Notes:

- `displayName` exists today and could be reused as nickname for the first MVP
  pass, but that would not cover intro, avatar, or wallet metadata.
- Wallet fields should be treated as profile metadata only unless a separate
  real wallet/auth design is approved.
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

## Keep Mocked Or Defer For MVP

These frontend concepts are currently broader than the committed backend MVP
scope:

- Credits/current balance
- Credit packages
- Credit purchase history
- Payment approval flow
- Likes
- Share counts
- Social comments separate from battle entries
- Profile tabs for comments and likes

Reasons to defer:

- Credits and payments may be confused with paid entry fees, reward pools, or
  gambling-like flows, which are explicit MVP non-goals.
- Likes/share counts require additional interaction models that are not needed
  for the core battle lifecycle.
- Social comments are different from battle entries and should not be mixed
  into AI judging data without a separate model.

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
prompts and skips already-created demo battles to avoid duplicates.

Current demo seed set:

- `OPEN` `OPTION` battle
- `OPEN` `IMAGE_CAPTION` battle
- `SETTLED` `OPTION` battle
- `SETTLED` `IMAGE_CAPTION` battle
- `SETTLED` `TEXT_OPEN` battle

Profile user data should still wait until the minimal user schema extension is
approved.

## Suggested Next Decision

Decide whether MVP profile integration requires extending `User`.

Conservative option:

- Reuse `displayName` for nickname.
- Keep intro/avatar/wallet/credits mocked in the frontend.

Richer MVP option:

- Add the five user profile fields listed above.
- Add a small profile update endpoint.
- Keep credits, likes, and social comments mocked or deferred.
