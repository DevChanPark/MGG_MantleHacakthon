# MGG / 무기기

MGG is a mobile-first AI-judged meme battle dApp. Users create battles, submit absurd or persuasive entries, AI judges the result, and the final verdict hash package is recorded on Mantle.

This repository currently contains the backend MVP scaffold:

- `apps/api` - REST API, persistence adapter, upload handling, AI judge execution, Mantle settlement execution
- `packages/shared` - shared DTO constants and validation contracts
- `packages/core` - common battle state machine, hashing helpers, judge rules, contract ABI
- `prisma` - database schema
- `docs` - API and environment documentation

Run locally:

```bash
npm install
npm run dev:api
```

Run tests:

```bash
npm test
```
