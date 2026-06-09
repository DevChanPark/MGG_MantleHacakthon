# API Contract

Base URL: `http://localhost:4000`

All request bodies are JSON. The frontend may pass `x-user-id` for MVP demo identity. If omitted, the backend uses `demo-user`.

## `GET /api/health`

Returns service health.

## `GET /api/users/me`

Returns or creates the current MVP demo user.

## `GET /api/battles`

Returns all battles.

## `POST /api/battles`

Creates a battle.

OPTION:

```json
{
  "battleType": "OPTION",
  "prompt": "Which snack survives the apocalypse?",
  "options": ["Tteokbokki", "Triangle kimbap"]
}
```

TEXT_OPEN:

```json
{
  "battleType": "TEXT_OPEN",
  "prompt": "Explain why your umbrella deserves a promotion."
}
```

IMAGE_CAPTION:

```json
{
  "battleType": "IMAGE_CAPTION",
  "prompt": "Optional caption direction",
  "imageUrl": "/uploads/example.webp"
}
```

## `GET /api/battles/:battleId`

Returns battle detail and entries.

## `POST /api/battles/:battleId/entries`

Submits an entry while battle status is `OPEN`.

OPTION requires `optionId`:

```json
{
  "optionId": "option-id",
  "content": "This option wins because the logic has left the building."
}
```

TEXT_OPEN and IMAGE_CAPTION:

```json
{
  "content": "A caption, answer, headline, or one-liner."
}
```

## `POST /api/battles/:battleId/close`

Transitions an `OPEN` battle to `CLOSED`.

## `POST /api/battles/:battleId/judge`

Runs the common battle pipeline:

`CLOSED -> JUDGING -> AI judge -> hash package -> Mantle settlement -> SETTLED`

If AI or settlement fails, the battle transitions to `FAILED` with a sanitized error.

## `GET /api/battles/:battleId/result`

Returns settled result:

- battle
- entries
- verdict
- hashPackage
- settlement metadata

If result is not settled, returns `409 RESULT_NOT_READY`.

## `GET /api/archive`

Returns settled battles only.

## `POST /api/uploads/image`

MVP local upload. The backend stores the raw image off-chain and returns a local URL. The API server serves local files back from `GET /uploads/:storageKey`.

```json
{
  "fileName": "meme.webp",
  "contentType": "image/webp",
  "base64Data": "..."
}
```

On-chain settlement records only hashes from the verdict package. It never records raw comments, raw images, or personal data.
