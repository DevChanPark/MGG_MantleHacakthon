# Backend Work Report

작성일: 2026-06-13

## 한 줄 요약

프론트 최신 흐름, 특히 `feature/frontend-gAon`의 HomeFeed, BattleDetail,
CreateBattle, Profile, 참여/보상 모달이 실제 백엔드 API로 동작할 수 있도록
필수 API, DB 모델, 검증 로직, 테스트, 문서를 정리했다.

## 작업 기준

처음에는 `frontend-b`를 기준으로 확인했지만, 이후 사용자가 `gaon` 키워드가
포함된 브랜치도 메인 화면 쪽 프론트라고 알려주었다. 그래서
`origin/feature/frontend-gAon`의 신규 커밋과 새 화면 파일을 다시 확인했고,
그 화면들이 요구하는 데이터 흐름을 기준으로 백엔드를 보완했다.

확인한 핵심 화면은 다음과 같다.

- `HomeFeed`
- `BattleCard`
- `BattleDetailScreen`
- `CreateBattleScreen`
- `ProfileScreen`
- `ParticipationModal`
- `RewardModal`
- `NotificationPanel`

## 전체 구조

이번 작업은 크게 여섯 덩어리다.

1. 지갑 연결 API
2. 데모 크레딧 API
3. gAon 피드 API
4. 참여, 댓글, 평가, 보상 흐름
5. 마이페이지와 알림 데이터
6. DB/테스트/문서 정리

## 코드 리뷰 관점 결론

검토 결과, 현재 백엔드 작업은 MVP 요구사항을 대체로 충족한다. 라우트 충돌,
Prisma schema 오류, 테스트 실패는 남아 있지 않다. 다만 코드리뷰 중 실제로
문제가 될 수 있는 부분들이 몇 가지 발견되었고, 보고 전에 수정했다.

해결한 리뷰 항목:

| 항목 | 문제 | 처리 결과 |
| --- | --- | --- |
| 지갑 연결 우회 | `PATCH /api/users/me`로 지갑 주소를 직접 저장할 수 있었다. | 지갑 필드는 profile PATCH에서 거부하고 challenge/verify만 허용했다. |
| 중복 참여 | 참여 생성과 크레딧 차감이 분리되어 중복 요청 시 잔액 꼬임 가능성이 있었다. | 참여와 3 크레딧 차감을 저장소 트랜잭션으로 묶었다. |
| 중복 보상 | 보상 지급 표시와 크레딧 지급이 분리되어 있었다. | 보상 claim과 30 크레딧 지급을 트랜잭션으로 묶었다. |
| OPTION 보상 기준 | OPTION 배틀에서 MVP 댓글 작성자만 보상받는 흐름이 될 수 있었다. | 우승 진영 참여자가 보상받을 수 있게 수정했다. |
| 마이페이지 데이터 누락 | gAon feed 댓글과 battle like가 내 댓글/좋아요 API에서 빠질 수 있었다. | `/users/me/comments`, `/users/me/likes`에 포함되도록 보강했다. |
| seed 충돌 | seed 스크립트가 지갑을 profile PATCH로 넣고 있었다. | seed도 실제 wallet challenge/verify 흐름을 사용하도록 수정했다. |

리뷰 후 남긴 판단:

- 지갑 잔액조회는 MVP 필수가 아니라 제외하는 것이 맞다.
- 실제 결제/온체인 구매도 MVP 범위 밖이다.
- 알림 읽음 처리, 검색, public profile도 지금 만들 필요가 없다.
- 지금은 백엔드 기능 추가보다 프론트 mock 데이터 교체 중 payload mismatch만
  대응하는 것이 좋다.

## 1. 지갑 연결 API

지갑 연결은 외부 결제 API나 잔액 조회 API가 아니다. 지금 단계에서는
"이 사용자가 이 지갑을 소유했다"는 사실만 서명으로 확인한다.

구현한 흐름:

1. 프론트가 `POST /api/auth/wallet/challenge` 호출
2. 백엔드가 서명할 메시지와 nonce를 생성
3. 프론트가 MetaMask 같은 지갑에 메시지 서명을 요청
4. 프론트가 서명값을 `POST /api/auth/wallet/verify`로 전달
5. 백엔드가 `viem`으로 서명을 검증하고 유저에 지갑을 연결

중요한 보안 정리:

- 개인키는 서버로 오지 않는다.
- 백엔드는 외부 지갑 API를 부르지 않는다.
- 프로필 수정 API로 지갑 주소를 직접 넣는 우회 경로를 막았다.
- 지갑 연결은 반드시 challenge/verify 흐름을 통과해야 한다.

## 2. 데모 크레딧 API

크레딧은 MVP 단계에서 실제 결제가 아니라 데모용 내부 장부다.

구현한 API:

- `GET /api/users/me/credits`
- `POST /api/users/me/credits/demo-charge`

이 크레딧은 gAon 참여 모달의 "참여비 3 크레딧", 보상 모달의 "보상 30 크레딧"을
처리하기 위한 MVP 데이터다.

명확히 제외한 것:

- 실제 MNT 잔액 조회
- 실제 결제 승인
- 실제 토큰 전송
- 온체인 구매 내역

## 3. gAon 피드 API

gAon 프론트는 기존 `/api/battles` 응답보다 `FeedBattle` 형태에 가깝다.
그래서 프론트가 덜 가공해도 되도록 feed 전용 API를 추가했다.

구현한 API:

- `GET /api/feed/battles`
- `POST /api/feed/battles`
- `GET /api/feed/battles/:battleId`
- `POST /api/battles/:battleId/like`
- `DELETE /api/battles/:battleId/like`

피드 응답에는 다음 값들이 포함된다.

- `id`
- `type`
- `author`
- `title`
- `description`
- `likeCount`
- `status`
- `recommendedScore`
- `createdAt`
- `deadline`
- `createdByMe`
- `imageUrl`
- `options`
- `comments`
- `isBattleLiked`
- `isParticipated`
- `selectedOption`
- `selectedOptionId`

상태 매핑도 맞췄다.

- 백엔드 `JUDGING` -> 프론트 `EVALUATING`
- 백엔드 `SETTLED` -> 프론트 `COMPLETED`
- 마감 시간이 지난 `OPEN` -> 프론트 `EXPIRED`

## 4. 참여, 댓글, 평가, 보상 흐름

gAon 화면에서 가장 중요한 흐름은 다음 순서다.

1. 사용자가 배틀을 본다.
2. 참여하기를 누른다.
3. OPTION 배틀이면 진영을 선택한다.
4. 3 데모 크레딧이 차감된다.
5. 참여 후 댓글을 작성한다.
6. 댓글은 AI 평가 대상 entry로 저장된다.
7. 배틀을 평가한다.
8. 우승자가 보상을 청구한다.
9. 30 데모 크레딧이 지급된다.

구현한 API:

- `POST /api/feed/battles/:battleId/participations`
- `POST /api/feed/battles/:battleId/comments`
- `POST /api/feed/comments/:entryId/like`
- `DELETE /api/feed/comments/:entryId/like`
- `POST /api/feed/battles/:battleId/evaluate`
- `POST /api/feed/battles/:battleId/rewards/claim`

중요한 판단:

- gAon의 댓글은 단순 소셜 댓글이 아니라 AI 평가 재료다.
- 그래서 feed comment는 백엔드 `Entry`로 저장한다.
- 기존 social comment API는 그대로 유지했고, AI 평가에는 들어가지 않는다.

수정한 논리 문제:

- 참여비 차감과 참여 기록 생성을 하나의 원자 처리로 묶었다.
- 중복 참여 요청이 와도 크레딧만 빠지는 상태가 생기지 않게 했다.
- 보상 청구도 중복 지급되지 않도록 원자 처리로 묶었다.
- OPTION 배틀은 MVP 댓글 작성자만 보상받는 게 아니라 우승 진영 참여자가
  보상받을 수 있게 했다.

## 5. 마이페이지와 알림

ProfileScreen은 내 계정 전용이라고 사용자가 확인해주었다. 그래서 public profile
API는 만들지 않고, current user 기준의 API만 보강했다.

구현한 API:

- `GET /api/users/me`
- `PATCH /api/users/me`
- `GET /api/users/me/battles`
- `GET /api/users/me/comments`
- `GET /api/users/me/likes`
- `GET /api/users/me/notifications`

정리한 범위:

- `/comments`는 일반 social comment와 gAon feed comment를 함께 내려준다.
- `/likes`는 entry/feed comment 좋아요와 battle card 좋아요를 함께 내려준다.
- 알림은 목록 조회까지만 구현했다.
- 알림 읽음 처리 API는 MVP 필수가 아니라 제외했다.

## 6. DB와 저장소 보강

Prisma schema와 JSON/메모리 저장소 양쪽을 함께 맞췄다. 테스트 저장소에서는
동작하지만 실제 DB에서는 깨지는 상황을 피하기 위해서다.

추가/보강한 주요 모델:

- `WalletChallenge`
- `CreditTransaction`
- `SocialComment`
- `EntryLike`
- `BattleLike`
- `BattleParticipation`
- `BattleShare`
- `Notification`

`Battle`에는 gAon 화면에 필요한 필드를 추가했다.

- `title`
- `description`
- `deadlineAt`
- `isAnonymous`
- `recommendedScore`

## 페이지별 정리

아래는 코드리뷰 관점에서 본 "프론트 페이지별 의미"다. 즉, 백엔드 작업이
각 화면의 mock state를 어떤 실제 데이터로 바꿔주는지 정리한 것이다.

| 프론트 페이지/컴포넌트 | 프론트에서의 의미 | 연결된 백엔드 |
| --- | --- | --- |
| Signup Wallet | 사용자가 지갑을 연결했다는 사실을 화면에 표시할 수 있다. 실제 잔액조회나 결제는 하지 않는다. | wallet challenge/verify |
| Signup Profile / Profile Edit | 닉네임, 소개, 아바타를 저장한다. 지갑 주소는 여기서 직접 저장하지 않는다. | users/me, uploads |
| HomeFeed | mock battle 배열 대신 서버에서 배틀 카드 데이터를 받는다. 좋아요, 참여 여부, 선택 진영도 서버 상태가 된다. | feed battles, battle like, comment like |
| CreateBattle | 작성 화면에서 만든 글이 새 feed battle로 서버에 저장된다. | POST feed battles, uploads |
| BattleCard | 카드의 좋아요, 댓글 수, 참여 버튼, 상태 표시가 서버 데이터 기준으로 움직인다. | feed detail/actions |
| BattleDetail | 상세 화면에서 참여, 댓글 작성, 평가, 보상 확인까지 실제 API 흐름으로 이어진다. | participation, comments, evaluate, reward |
| ParticipationModal | 3 크레딧 차감과 OPTION 진영 선택이 서버에 기록된다. 중복 클릭해도 잔액이 꼬이지 않는다. | participations |
| RewardModal | AI 평가 결과와 보상 지급 상태를 서버 결과로 보여준다. | evaluate, rewards/claim |
| ProfileScreen | 내 글, 내 댓글, 내 좋아요, 내 크레딧이 mock이 아니라 현재 계정 데이터가 된다. | users/me lists, credits |
| NotificationPanel | 참여/보상 알림을 서버 목록으로 표시할 수 있다. | notifications |

### Signup Wallet

필요한 백엔드:

- `POST /api/auth/wallet/challenge`
- `POST /api/auth/wallet/verify`

설명:

사용자가 선택한 지갑으로 메시지에 서명하고, 백엔드가 그 서명을 검증한다.
지갑 잔액 조회나 실제 결제는 하지 않는다.

### Signup Profile / Profile Edit

필요한 백엔드:

- `GET /api/users/me`
- `PATCH /api/users/me`
- `POST /api/uploads/image`

설명:

닉네임, 소개, 아바타를 저장한다. 지갑 주소는 여기서 수정하지 않는다.
지갑은 반드시 Wallet API로 연결한다.

### HomeFeed

필요한 백엔드:

- `GET /api/feed/battles`
- `POST /api/battles/:battleId/like`
- `DELETE /api/battles/:battleId/like`
- `POST /api/feed/comments/:entryId/like`
- `DELETE /api/feed/comments/:entryId/like`

설명:

프론트의 카드 리스트가 바로 쓸 수 있는 형태로 배틀 목록을 내려준다.
좋아요, 참여 여부, 선택한 진영, 댓글 수, 추천 점수, 마감 상태를 포함한다.

### CreateBattle

필요한 백엔드:

- `POST /api/feed/battles`
- `POST /api/uploads/image`

설명:

gAon 작성 화면의 `title`, `content`, `deadline`, `isAnonymous`, `options`,
`imageUrl`을 받아 배틀을 만든다.

### BattleDetail / BattleCard

필요한 백엔드:

- `GET /api/feed/battles/:battleId`
- `POST /api/feed/battles/:battleId/participations`
- `POST /api/feed/battles/:battleId/comments`
- `POST /api/feed/battles/:battleId/evaluate`
- `POST /api/feed/battles/:battleId/rewards/claim`

설명:

상세 화면의 참여, 댓글 작성, 평가, 보상 청구까지 처리한다.
평가 응답에는 gAon 모달이 쉽게 쓰도록 `feedResult`를 추가했다.

### ParticipationModal

필요한 백엔드:

- `GET /api/users/me/credits`
- `POST /api/users/me/credits/demo-charge`
- `POST /api/feed/battles/:battleId/participations`

설명:

참여 시 3 데모 크레딧을 차감한다. OPTION 배틀은 선택 진영을 함께 저장한다.
중복 참여 요청은 잔액을 다시 차감하지 않는다.

### RewardModal

필요한 백엔드:

- `POST /api/feed/battles/:battleId/evaluate`
- `POST /api/feed/battles/:battleId/rewards/claim`

설명:

평가 완료 후 우승자가 30 데모 크레딧을 받을 수 있다.
TEXT/IMAGE는 winning entry 기준, OPTION은 winning option side 기준이다.

### ProfileScreen

필요한 백엔드:

- `GET /api/users/me`
- `GET /api/users/me/credits`
- `POST /api/users/me/credits/demo-charge`
- `GET /api/users/me/battles`
- `GET /api/users/me/comments`
- `GET /api/users/me/likes`

설명:

내 프로필, 내 크레딧, 내가 만든 글, 내가 쓴 댓글, 내가 누른 좋아요를 불러온다.
public profile은 MVP 범위가 아니라 만들지 않았다.

### NotificationPanel

필요한 백엔드:

- `GET /api/users/me/notifications`

설명:

참여 발생, 보상 지급 같은 알림 목록을 조회한다. 읽음 처리는 MVP 필수가 아니라
추가하지 않았다.

## 일부러 하지 않은 것

MVP 범위를 지키기 위해 아래 기능은 제외했다.

- 지갑 잔액 조회
- 실제 MNT 결제
- 실제 온체인 credit 구매
- 알림 읽음 처리
- public profile
- 검색 API
- 추천 알고리즘 고도화
- 외부 공유 연동
- real credit purchase history

이 기능들은 나중에 제품 범위가 확정되면 별도 설계하는 것이 맞다.

## 검증 결과

마지막 검증 결과:

- `npm test`: 27개 통과
- `npm run prisma:validate`: 통과
- `npm run prisma:generate`: 통과
- 주요 JS 파일 `node --check`: 통과
- `git diff --check`: 통과

## 현재 결론

백엔드는 MVP 필수 보완이 끝난 상태로 보는 것이 맞다. 지금 추가 기능을 더
만들기보다는 프론트에서 mock 데이터를 실제 API로 교체하면서 payload가 맞지
않는 부분만 조정하는 쪽이 가장 안전하다.
