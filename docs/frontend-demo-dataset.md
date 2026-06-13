# Frontend Demo Dataset

This document describes the backend-owned demo dataset that the frontend can
load through the public MVP APIs. It does not require frontend code changes.

## Safety Gates

Only run the dataset loader against a local/demo API that reports:

```json
{
  "ai": { "mode": "mock" },
  "mantle": { "mode": "mock" }
}
```

The loader refuses to run unless `GET /api/health` returns mock AI and mock
Mantle modes. It creates data through HTTP APIs only, so validation, state
transitions, judging rules, mock AI, and mock settlement all run through the
same backend path the frontend will use.

## Load Command

Start the API with `REPOSITORY_PROVIDER=prisma`, `MOCK_AI=true`, and
`MOCK_MANTLE=true`, then run:

```bash
npm run seed:demo
```

Optional environment variables:

- `API_BASE_URL`: API base URL, default `http://127.0.0.1:4000`
- `DEMO_USER_ID`: demo identity header, default `demo-seed-user`
- `DEMO_NICKNAME`: profile nickname, default `demo-captain`

For the MVP frontend, keep the demo identity fixed to
`x-user-id: demo-seed-user`. The environment override is only for local
backend experiments outside the demo path.

The script is idempotent for battles by prompt. Existing demo battles are
reported as `skipped` instead of duplicated.

## Dataset Shape

Profile data:

- `demo-seed-user` profile with nickname, intro, avatar URL, wallet provider,
  and wallet address metadata

Battle list data:

- `TEXT_OPEN_OPEN`: open answer battle
- `OPTION_OPEN`: open option battle
- `IMAGE_CAPTION_OPEN`: open image caption battle
- `TEXT_OPEN_CLOSED`: closed answer battle for waiting/judge UI
- `OPTION_SETTLED`: settled option battle with result data
- `IMAGE_CAPTION_SETTLED`: settled image caption battle with result data
- `TEXT_OPEN_SETTLED`: settled answer battle with result data

The backend judge endpoint transitions `CLOSED -> JUDGING -> SETTLED`
synchronously, so persistent `JUDGING` demo rows are not created by this seed.
The frontend should still render `JUDGING` when it observes that status from a
live flow.

## Frontend API Reads

Use these endpoints to load the dataset:

1. `GET /api/users/me` with `x-user-id: demo-seed-user`
2. `GET /api/battles` for home/profile lists and type/status filters
3. `GET /api/battles/:battleId` for detail pages and entries
4. `GET /api/battles/:battleId/result` for settled result pages
5. `GET /api/archive` for settled/archive lists

## Verification

Run the HTTP smoke flow against the same mock API:

```bash
npm run smoke:api
```

The smoke flow creates an isolated `api-smoke-flow-*` user and battle, verifies
the lifecycle `OPEN -> CLOSED -> JUDGING -> SETTLED`, checks archive visibility,
and confirms the result exposes hash package and settlement metadata without
raw prompt or entry content.
