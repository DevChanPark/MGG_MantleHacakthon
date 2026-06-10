# Mantle Settlement

The backend owns Mantle settlement for the MVP.

The frontend receives settlement metadata only after backend execution. It should never receive the server wallet private key or execute settlement transactions.

## Hash Package

`recordVerdictOnMantle(payload)` accepts only the final hash package:

```json
{
  "contentHash": "0x...",
  "optionsHash": "0x...",
  "entriesRoot": "0x...",
  "rulesHash": "0x...",
  "modelVersionHash": "0x...",
  "winnerHash": "0x...",
  "mvpEntryHash": "0x...",
  "verdictHash": "0x..."
}
```

Required bytes32 fields:

- `contentHash`
- `entriesRoot`
- `rulesHash`
- `modelVersionHash`
- `winnerHash`
- `verdictHash`

Optional bytes32 fields:

- `optionsHash`
- `mvpEntryHash`

Raw comments, raw images, prompts, captions, and personal data must not be sent to the contract.

## Local Mode

Use:

```bash
MOCK_MANTLE=true
```

Mock mode returns a deterministic fake transaction hash based on `verdictHash`.

## Mantle Sepolia Mode

Use:

```bash
MOCK_MANTLE=false
MANTLE_RPC_URL="https://..."
MANTLE_CHAIN_ID=5003
VERDICT_REGISTRY_ADDRESS="0x..."
SERVER_WALLET_PRIVATE_KEY="0x..."
```

Before real settlement, backend validates:

- RPC URL exists
- Chain ID is a positive integer
- Registry address is a valid EVM address
- Server wallet private key is a 32-byte hex key
- Hash package fields are valid bytes32 values

## Explorer URLs

- Mantle Mainnet `5000`: `https://mantlescan.xyz/tx/:txHash`
- Mantle Sepolia `5003`: `https://sepolia.mantlescan.xyz/tx/:txHash`
