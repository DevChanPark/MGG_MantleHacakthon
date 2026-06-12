# Environment

Required backend env examples:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes for Prisma | PostgreSQL URL used by Prisma migrations/client. |
| `REPOSITORY_PROVIDER` | yes | Use `prisma` for PostgreSQL persistence. Use `json` only for lightweight local fallback. |
| `API_PORT` | yes | Defaults to `4000`. |
| `CORS_ORIGIN` | yes | Frontend origin, for example `http://localhost:3000`. |
| `MOCK_AI` | yes | `true` for deterministic local judging. |
| `OPENAI_API_KEY` | when `MOCK_AI=false` | AI provider key for real judging. |
| `OPENAI_MODEL` | when `MOCK_AI=false` | Model name sent to the AI provider. |
| `AI_FALLBACK_TO_MOCK` | optional | If `true`, falls back to deterministic mock output after AI parse failures. |
| `MOCK_MANTLE` | yes | `true` for deterministic local tx hashes. |
| `MANTLE_RPC_URL` | when `MOCK_MANTLE=false` | Mantle RPC endpoint. |
| `MANTLE_CHAIN_ID` | yes | `5003` for Mantle Sepolia, `5000` for Mantle mainnet. |
| `VERDICT_REGISTRY_ADDRESS` | when `MOCK_MANTLE=false` | `AIVerdictRegistry` contract address. |
| `SERVER_WALLET_PRIVATE_KEY` | when `MOCK_MANTLE=false` | Backend-only settlement wallet key. Never expose to frontend. |
| `STORAGE_PROVIDER` | yes | MVP implementation supports `local`. |
| `STORAGE_BUCKET` | future | Reserved for object storage. |
| `STORAGE_ACCESS_KEY` | future | Reserved for object storage. |
| `STORAGE_SECRET_KEY` | future | Reserved for object storage. |
| `LOCAL_STORAGE_DIR` | local only | Defaults to `.data/uploads`. |

The npm Prisma helper scripts use the local development database URL from
`.env.example` when `DATABASE_URL` is missing. An explicitly provided
`DATABASE_URL` always takes precedence.

Local development should use:

```bash
REPOSITORY_PROVIDER=prisma
MOCK_AI=true
MOCK_MANTLE=true
STORAGE_PROVIDER=local
```

Real AI and Mantle modes are backend-only. The frontend must never receive provider keys or private keys.

Prisma stores battle type and status as strings. Valid values must come from `packages/shared`, not from duplicated Prisma enums.
