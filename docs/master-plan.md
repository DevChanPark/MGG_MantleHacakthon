# MGG / 무기기 총 개발 기획안

Updated: 2026-06-15

## 1. 현재 결론

MGG는 현재 백엔드와 프론트엔드가 각각 독립 개발 산출물을 만든 상태다.

남은 핵심은 새 화면이나 새 서버를 처음부터 만드는 일이 아니라, Core 계약을 확정한 뒤 백엔드와 프론트엔드를 같은 규칙으로 연결하는 일이다.

현재 판단:

- 백엔드: MVP API, DB, wallet challenge/verify, demo credit ledger, battle/feed/result 기반 구현 완료에 가까움
- 프론트엔드: 모바일 UI, 홈피드, 배틀 상세, 프로필, 크레딧 UI, 참여/평가 mock flow 구현 완료에 가까움
- Core: 기본 BattleType, BattleStatus, state machine, hashing, judge rules, ABI는 있음
- 남은 핵심: Core 계약 보강 + 백/프엔 연결 + MetaMask/test MNT credit exchange 연결

즉 현재 단계는 구현 초기 단계가 아니라 통합 단계다.

## 2. 제품 목표

MGG / 무기기는 모바일 우선 AI 밈 배틀 dApp이다.

MVP 목표는 아래 루프를 끝까지 보여주는 것이다.

```text
Create battle
-> Submit entries
-> Close battle
-> AI judge
-> Hash verdict
-> Record hash on Mantle
-> Show result
-> Share / archive
```

이번 추가 개발 목표는 여기에 사용자 지갑과 서비스 크레딧 흐름을 붙이는 것이다.

추가 목표:

1. 누구나 자기 MetaMask/EVM 지갑으로 로그인할 수 있게 한다.
2. 사용자가 MetaMask에 있는 Mantle testnet MNT를 서비스 내 credit으로 교환할 수 있게 한다.
3. credit은 MVP 내부 서비스 재화로만 사용하고, 도박/상금/유료 배틀 구조로 표현하지 않는다.

## 3. 현재 브랜치와 통합 상태

현재 기준 브랜치:

- `dev`

`dev`에 통합된 작업:

- `backend`
- `frontend-b`
- `feature/frontend-gAon`
- `core` 기준점
- `frontend-a` 기준점

남은 브랜치 운영 원칙:

```text
core        \
backend      -> dev -> main
frontend-a  /
frontend-b /
```

- 기능 개발은 각 역할 브랜치에서 진행한다.
- 통합 확인은 `dev`에서 한다.
- 해커톤 데모 안정본만 `main`으로 올린다.

## 4. 현재 코드베이스 구조

현재 주요 구조:

```text
apps/
  api/              Backend API

packages/
  shared/           Shared constants, validators, DTO helpers
  core/             Battle state, hashing, judging rules, ABI

prisma/             Database schema and migrations
docs/               API, frontend handoff, settlement, planning docs
Frontend_b/         Current Vite React frontend
```

중요한 구조 이슈:

- 루트 workspace는 `apps/*`, `packages/*` 기준이다.
- 프론트는 아직 `Frontend_b/`에 있다.
- 장기적으로는 `Frontend_b`를 `apps/web`으로 옮기는 것이 맞다.
- 단기 데모를 빠르게 붙이려면 `Frontend_b`를 유지한 채 API 연결부터 해도 된다.

권장:

- 빠른 통합이 우선이면 `Frontend_b` 유지 후 연결
- 정리된 구조가 우선이면 `apps/web` 이동 후 연결

## 5. 역할별 현재 상태

### 5.1 Core

이미 있는 것:

- `BattleType`
  - `OPTION`
  - `TEXT_OPEN`
  - `IMAGE_CAPTION`
- `BattleStatus`
  - `OPEN`
  - `CLOSED`
  - `JUDGING`
  - `SETTLED`
  - `FAILED`
- 상태 전이 규칙
- verdict hash package 생성
- judging rules
- `AIVerdictRegistry` ABI
- wallet challenge/verify validator 일부
- demo credit charge validator 일부

부족한 것:

- MetaMask login DTO 전체 계약
- credit exchange DTO 전체 계약
- Mantle test MNT -> service credit 교환 규칙
- frontend display status mapper
- credit quote/exchange schema
- tx receipt verification에 필요한 shared shape
- core test fixtures

### 5.2 Backend

이미 있는 것:

- Node.js API
- Prisma schema/migrations
- user profile API
- wallet challenge/verify API
- demo credit ledger
- feed battle API
- participation credit spend
- AI judge service
- Mantle settlement service
- mock AI / mock Mantle mode

남은 것:

- Core credit exchange schema 반영
- `GET /api/credits/packages`
- `POST /api/credits/quote`
- `POST /api/credits/exchange`
- Mantle testnet tx receipt 검증
- used txHash 중복 방지
- exchange transaction persistence 보강

### 5.3 Frontend

이미 있는 것:

- 모바일 UI
- onboarding/signup/profile
- wallet 선택 UI
- home feed
- battle card/detail
- create battle UI
- participation modal
- credit charge UI
- reward/evaluation mock flow

남은 것:

- mock/sessionStorage 제거 또는 축소
- API client 추가
- user/profile/credit hydration
- MetaMask 실제 연결
- wallet challenge/sign/verify 연결
- MNT transfer prompt
- credit exchange API 연결
- feed/detail/participation/comment/reward API 연결

## 6. 핵심 아키텍처 원칙

반드시 지킬 것:

1. Core가 shared truth다.
2. 백엔드와 프론트는 BattleType/BattleStatus를 각자 재정의하지 않는다.
3. AI judging은 백엔드에서만 실행한다.
4. Mantle verdict settlement는 백엔드에서만 실행한다.
5. 온체인에는 raw comment, raw image, profile data를 올리지 않는다.
6. Credit exchange는 testnet/demo service credit 충전이다.
7. MVP에서 gambling, paid reward pool, paid MNT distribution을 만들지 않는다.
8. 프론트는 private key, server wallet key, RPC secret을 절대 받지 않는다.

## 7. MetaMask 로그인 기획

목표:

- 특정 개발자 지갑이 아니라 누구나 자기 지갑으로 로그인할 수 있어야 한다.
- MetaMask 외에도 EIP-1193 호환 지갑으로 확장 가능해야 한다.

로그인 플로우:

```text
Frontend detects wallet provider
-> request accounts
-> receive wallet address
-> POST /api/auth/wallet/challenge
-> wallet signs challenge.message
-> POST /api/auth/wallet/verify
-> backend verifies signature
-> backend links wallet to user
-> frontend hydrates user session
```

프론트 책임:

- `window.ethereum` provider 감지
- `eth_requestAccounts`
- `personal_sign`
- provider/network error UI
- 연결된 address 표시
- private key 저장 금지

백엔드 책임:

- nonce 생성
- challenge 만료 처리
- one-time use 처리
- signature 검증
- wallet address normalization
- wallet 중복 연결 방지

Core 책임:

- wallet challenge DTO
- wallet verify DTO
- wallet response DTO
- EVM address validation
- wallet provider validation
- normalized address helper

## 8. Test MNT -> Service Credit 교환 기획

목표:

- 사용자가 MetaMask에 있는 Mantle testnet MNT를 서비스 credit으로 교환한다.
- credit은 내부 참여/데모 UX용 재화다.
- 이 기능은 reward pool이나 gambling이 아니다.

권장 방식:

```text
User selects credit package
-> Backend creates quote
-> Frontend asks MetaMask to send test MNT to treasury
-> Frontend receives txHash
-> Frontend submits txHash to backend
-> Backend verifies Mantle receipt
-> Backend credits user balance
-> Frontend refreshes credit balance
```

검증 조건:

- tx succeeded
- expected Mantle testnet chain
- sender equals linked wallet
- receiver equals treasury address
- value matches quote
- quote is not expired
- txHash has not been used before

신규 API 제안:

```text
GET  /api/credits/packages
POST /api/credits/quote
POST /api/credits/exchange
```

신규 Core schema 제안:

- `CreditPackage`
- `CreditQuoteRequest`
- `CreditQuoteResponse`
- `CreditExchangeRequest`
- `CreditExchangeResponse`
- `CreditTransaction`
- `CreditExchangeMetadata`

필요 env:

```text
MANTLE_CREDIT_EXCHANGE_ENABLED
MANTLE_CREDIT_TREASURY_ADDRESS
MANTLE_CREDIT_CHAIN_ID
MANTLE_CREDIT_RPC_URL
MANTLE_CREDIT_CONFIRMATIONS
MNT_CREDIT_RATE
```

로컬 개발 모드:

- `MOCK_MANTLE=true`
  - mock txHash로 credit exchange demo 가능
- `MOCK_MANTLE=false`
  - 실제 Mantle testnet receipt 검증

## 9. Core 우선 구현 계획

Core를 먼저 끝내야 백엔드와 프론트가 같은 기준으로 붙는다.

### Step 1. Status 계약 정리

작업:

- Core/backend status와 frontend display status를 분리한다.
- `mapBattleStatusToDisplayStatus()` 추가.

Backend status:

```text
OPEN
CLOSED
JUDGING
SETTLED
FAILED
```

Frontend display status:

```text
OPEN
CLOSED
EVALUATING
COMPLETED
EXPIRED
FAILED
```

완료 기준:

- 프론트가 임의로 `SETTLED -> COMPLETED` 같은 변환을 중복 구현하지 않는다.

### Step 2. Wallet 계약 정리

작업:

- wallet challenge request/response schema
- wallet verify request/response schema
- wallet summary schema
- address normalization helper
- provider enum/validator

완료 기준:

- 백엔드와 프론트가 같은 request/response shape를 쓴다.
- hardcoded wallet 없이 임의 사용자 지갑 연결이 가능하다.

### Step 3. Credit package 계약 정리

작업:

- credit package constants
- MNT price unit 정의
- MNT decimals 정의
- package validation

완료 기준:

- 프론트 credit package UI와 백엔드 price validation이 같은 기준을 쓴다.

### Step 4. Credit quote/exchange 계약 정리

작업:

- quote request/response
- exchange request/response
- receipt verification metadata shape
- transaction reason enum

완료 기준:

- 백엔드 exchange API가 Core schema만 보고 구현 가능하다.
- 프론트가 txHash 제출 후 어떤 응답을 받을지 확정된다.

### Step 5. Hash/state 테스트 보강

작업:

- state transition tests
- verdict hash determinism tests
- OPTION/TEXT_OPEN/IMAGE_CAPTION fixtures
- optional hash normalization tests

완료 기준:

- Core 변경이 backend settlement나 result page hash 검증을 깨지 않는다.

## 10. Backend 연결 계획

Core 이후 백엔드 작업:

1. Core wallet/credit schema import
2. credit package API 추가
3. credit quote 생성 API 추가
4. exchange API 추가
5. Prisma model 추가 또는 기존 metadata 확장
6. txHash unique guard 추가
7. Mantle receipt verification service 추가
8. mock Mantle exchange mode 추가
9. tests 추가

완료 기준:

- 실제 또는 mock txHash로 credit balance가 증가한다.
- 같은 txHash는 두 번 credit으로 바꿀 수 없다.
- 연결된 wallet이 아닌 sender의 tx는 거부된다.

## 11. Frontend 연결 계획

Core/Backend 이후 프론트 작업:

1. API client 추가
2. app startup에서 user/credits hydrate
3. wallet signup/login 버튼을 MetaMask flow에 연결
4. profile credit panel을 backend credit packages에 연결
5. credit package 선택 시 MetaMask native transfer 실행
6. txHash를 exchange API로 제출
7. 성공 시 credit balance refresh
8. feed mocks를 `/api/feed/battles`로 교체
9. participation/comment/reply/reward flow를 API로 교체

완료 기준:

- 새 브라우저 세션에서도 backend 상태를 기준으로 UI가 뜬다.
- sessionStorage credit 조작 없이 backend credit balance가 표시된다.
- MetaMask 지갑으로 로그인하고 test MNT를 credit으로 바꿀 수 있다.

## 12. 전체 구현 순서

권장 순서:

1. Core status mapper
2. Core wallet DTO/schema
3. Core credit package/quote/exchange DTO/schema
4. Core tests
5. Backend credit package/quote/exchange API
6. Backend Mantle receipt verification
7. Backend tests
8. Frontend API client
9. Frontend wallet login
10. Frontend credit exchange UI 연결
11. Frontend feed/participation mock 제거
12. End-to-end demo test

## 13. 완료 기준

최종 demo done:

1. 사용자가 MetaMask로 로그인한다.
2. 로그인된 wallet address가 profile에 표시된다.
3. 사용자가 credit package를 선택한다.
4. MetaMask에서 Mantle testnet MNT 전송을 승인한다.
5. backend가 txHash를 검증한다.
6. service credit balance가 증가한다.
7. credit으로 battle에 참여한다.
8. entry/comment를 제출한다.
9. battle을 close/evaluate한다.
10. AI verdict/result가 보인다.
11. verdict hash package와 Mantle settlement box가 보인다.

## 14. 리스크와 대응

### Risk 1. Frontend mock과 backend state shape 차이

대응:

- Core mapper와 API client adapter를 둔다.
- 화면 컴포넌트 내부에 backend DTO 변환을 흩뿌리지 않는다.

### Risk 2. Credit exchange가 gambling처럼 보일 위험

대응:

- 문구를 service credit/testnet/demo로 제한한다.
- reward pool, entry fee, paid payout 표현을 쓰지 않는다.
- battle reward는 MVP demo credit claim으로만 유지한다.

### Risk 3. 잘못된 txHash 재사용

대응:

- txHash unique guard를 둔다.
- quote expiry를 둔다.
- sender/receiver/value/chain 검증을 모두 통과해야 credit 처리한다.

### Risk 4. 지갑 연결을 profile patch로 우회

대응:

- wallet fields는 계속 `PATCH /api/users/me`에서 거부한다.
- challenge/verify만 wallet source of truth로 둔다.

### Risk 5. Frontend 위치가 workspace와 다름

대응:

- 빠른 연결 후 `apps/web`으로 이동하거나,
- 이동을 먼저 하고 root scripts를 정리한다.

## 15. 역할 분담 제안

Core 담당:

- wallet/credit/status 계약
- schemas/helpers/tests
- docs update

Backend 담당:

- quote/exchange API
- Mantle receipt verification
- Prisma persistence
- API tests

Frontend A 담당:

- wallet login/signup
- MetaMask provider/signing/network handling
- profile wallet/credit display

Frontend B 담당:

- feed/detail API 연결
- participation/comment/reward API 연결
- result/evaluation flow 연결

통합 담당:

- `dev`에서 end-to-end demo
- env 정리
- README/demo guide 정리

## 16. 당장 다음 액션

바로 시작할 순서:

1. `core` 브랜치에서 Core wallet/status/credit schema 작업 시작
2. Core 작업이 잡히면 `backend` 브랜치에서 exchange API 구현
3. 동시에 `frontend-a`에서 MetaMask login UI 연결
4. `frontend-b`에서 feed/participation API 연결
5. `dev`에서 통합 테스트
6. 안정화 후 `main`으로 승격

현재 가장 중요한 선행 작업은 Core다.

Core가 끝나면 백엔드와 프론트는 새 기능을 각자 상상해서 만드는 것이 아니라, Core 계약에 맞춰 연결하는 작업으로 좁혀진다.
