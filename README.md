# MGG / 무기기

MGG(무기기)는 `무논리로 우기기` / `무조건 우기기`를 컨셉으로 한 모바일 우선 AI 밈 배틀 dApp입니다.

사용자는 웃기거나 absurd하거나 설득력 있는 배틀 답변을 제출하고, AI가 공개 기준에 따라 승자를 판단합니다. 최종 verdict hash package는 Mantle의 `AIVerdictRegistry`에 기록합니다.

## MVP Flow

1. Create battle
2. Submit entries
3. Close battle
4. AI judge
5. Hash verdict
6. Record hash on Mantle
7. Show result
8. Share / archive

## Battle Types

- `OPTION`: 2~4개 선택지 중 한 편을 고르고 댓글로 우기기
- `TEXT_OPEN`: 고정 선택지 없이 자유 답변으로 우기기
- `IMAGE_CAPTION`: 이미지에 가장 밈력 높은 캡션/제목/한 줄을 붙이기

## Repository Areas

- `apps/api`: REST API, persistence adapter, image upload, AI judge execution, Mantle settlement execution
- `packages/shared`: shared DTO constants and validation contracts
- `packages/core`: common battle state machine, hashing helpers, judge rules, contract ABI
- `prisma`: database schema
- `docs`: API and environment documentation

Useful docs:

- `docs/api-contract.md`: REST API contract
- `docs/env.md`: backend environment variables
- `docs/frontend-handoff.md`: mobile frontend integration guide
- `docs/mantle-settlement.md`: Mantle settlement requirements

## Branch Flow

```text
core        \
backend      -> dev -> main
frontend-a  /
frontend-b /
```

- `core`: shared types, state machine, hash helpers, AI judge schema, contract ABI
- `backend`: API, DB, AI judge execution, Mantle settlement
- `frontend-a`: frontend workstream A
- `frontend-b`: frontend workstream B
- `dev`: integration branch
- `main`: stable demo branch

## Non-Goals for MVP

- No gambling
- No real-money entry fees
- No paid reward pool
- No raw user-generated content on-chain

## Backend Local Run

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev:api
```

## Tests

```bash
npm test
```
