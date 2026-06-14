import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApiApp } from "../src/app.js";
import { createHttpServer } from "../src/server.js";
import { MemoryRepository } from "../src/repositories/memoryRepository.js";
import { JsonFileRepository } from "../src/repositories/fileRepository.js";
import { createAiJudgeService, mockJudgeBattle, validateJudgeOutputReferences } from "../src/services/aiJudgeService.js";
import {
  ZERO_ADDRESS,
  createSettlementService,
  getSettlementReadiness,
  mockRecordVerdict,
  validateMantleConfig,
  validateSettlementPayload
} from "../src/services/settlementService.js";
import {
  BattleStatus,
  BattleType,
  CreditTransactionReason,
  MANTLE_TESTNET_CHAIN_ID,
  validateJudgeInput,
  validateJudgeOutput,
  validateResultResponse
} from "../../../packages/shared/src/index.js";
import { getJudgingRules, sha256Hex } from "../../../packages/core/src/index.js";

const testConfig = {
  corsOrigin: "*",
  mockAi: true,
  openAiApiKey: "",
  openAiModel: "mock-mgg-judge-v1",
  aiFallbackToMock: false,
  mockMantle: true,
  mantleChainId: 5003,
  verdictRegistryAddress: "0x0000000000000000000000000000000000000000",
  mantleCreditExchangeEnabled: false,
  mantleCreditTreasuryAddress: "0x2222222222222222222222222222222222222222",
  mantleCreditChainId: MANTLE_TESTNET_CHAIN_ID,
  mantleCreditRpcUrl: "",
  mantleCreditConfirmations: 1,
  mntCreditRate: "1",
  storageProvider: "local",
  localStorageDir: ".data/test-uploads"
};

test("health reports backend readiness without exposing secrets", async () => {
  const configWithSecrets = {
    ...testConfig,
    mockAi: false,
    openAiApiKey: "sk-test-secret",
    openAiModel: "gpt-test-model",
    mockMantle: false,
    mantleRpcUrl: "https://secret-rpc.example",
    mantleChainId: 5003,
    verdictRegistryAddress: "0x1111111111111111111111111111111111111111",
    serverWalletPrivateKey: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    localStorageDir: "secret-local-storage-dir"
  };
  const app = createApiApp({
    repository: new MemoryRepository(),
    config: configWithSecrets
  });

  const health = await request(app, "GET", "/api/health");

  assert.equal(health.statusCode, 200);
  assert.equal(health.body.ok, true);
  assert.equal(health.body.service, "mgg-api");
  assert.equal(health.body.ai.ready, true);
  assert.equal(health.body.ai.mode, "real");
  assert.equal(health.body.ai.model, "gpt-test-model");
  assert.equal(health.body.mantle.ready, true);
  assert.equal(health.body.mantle.chainId, 5003);
  assert.equal(health.body.storage.ready, true);
  assert.equal(health.body.storage.provider, "local");

  const serialized = JSON.stringify(health.body);
  assert.equal(serialized.includes(configWithSecrets.openAiApiKey), false);
  assert.equal(serialized.includes(configWithSecrets.mantleRpcUrl), false);
  assert.equal(serialized.includes(configWithSecrets.serverWalletPrivateKey), false);
  assert.equal(serialized.includes(configWithSecrets.localStorageDir), false);
});

test("creates battles for all three battle types", async () => {
  const app = makeApp();

  const option = await request(app, "POST", "/api/battles", {
    battleType: BattleType.OPTION,
    prompt: "Best emergency snack?",
    options: ["A", "B"]
  });
  assert.equal(option.statusCode, 201);
  assert.equal(option.body.battle.battleType, BattleType.OPTION);

  const text = await request(app, "POST", "/api/battles", {
    battleType: BattleType.TEXT_OPEN,
    prompt: "Defend a broken chair."
  });
  assert.equal(text.statusCode, 201);
  assert.equal(text.body.battle.battleType, BattleType.TEXT_OPEN);

  const image = await request(app, "POST", "/api/battles", {
    battleType: BattleType.IMAGE_CAPTION,
    imageUrl: "/uploads/mock.webp"
  });
  assert.equal(image.statusCode, 201);
  assert.equal(image.body.battle.battleType, BattleType.IMAGE_CAPTION);
});

test("updates MVP user profile metadata and rejects duplicate nicknames", async () => {
  const app = makeApp();

  const initial = await app.inject({
    method: "GET",
    url: "/api/users/me",
    headers: { "x-user-id": "profile-user" }
  });
  assert.equal(initial.statusCode, 200);
  assert.equal(initial.body.nickname, null);

  const updated = await app.inject({
    method: "PATCH",
    url: "/api/users/me",
    headers: { "x-user-id": "profile-user" },
    body: {
      nickname: "demo-captain",
      intro: "Turns unlikely arguments into demo data.",
      avatarUrl: "/uploads/profile.gif"
    }
  });
  assert.equal(updated.statusCode, 200);
  assert.equal(updated.body.nickname, "demo-captain");
  assert.equal(updated.body.displayName, "demo-captain");
  assert.equal(updated.body.intro, "Turns unlikely arguments into demo data.");
  assert.equal(updated.body.avatarUrl, "/uploads/profile.gif");
  assert.equal(updated.body.walletProvider, null);
  assert.equal(updated.body.walletAddress, null);

  const duplicate = await app.inject({
    method: "PATCH",
    url: "/api/users/me",
    headers: { "x-user-id": "other-profile-user" },
    body: { nickname: "demo-captain" }
  });
  assert.equal(duplicate.statusCode, 409);
  assert.equal(duplicate.body.error.code, "NICKNAME_TAKEN");

  const walletPatch = await app.inject({
    method: "PATCH",
    url: "/api/users/me",
    headers: { "x-user-id": "profile-user" },
    body: {
      walletProvider: "MetaMask",
      walletAddress: "0x1111111111111111111111111111111111111111"
    }
  });
  assert.equal(walletPatch.statusCode, 400);
  assert.equal(walletPatch.body.error.code, "VALIDATION_ERROR");

  const reservedNickname = await app.inject({
    method: "PATCH",
    url: "/api/users/me",
    headers: { "x-user-id": "profile-user" },
    body: { nickname: "MGG" }
  });
  assert.equal(reservedNickname.statusCode, 400);
  assert.equal(reservedNickname.body.error.code, "VALIDATION_ERROR");
});

test("wallet challenge verifies an EVM signature and links the wallet to the current user", async () => {
  const { privateKeyToAccount } = await import("viem/accounts");
  const account = privateKeyToAccount("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  const app = makeApp();

  const challenge = await app.inject({
    method: "POST",
    url: "/api/auth/wallet/challenge",
    headers: { "x-user-id": "wallet-user" },
    body: {
      walletAddress: account.address,
      walletProvider: "MetaMask"
    }
  });
  assert.equal(challenge.statusCode, 201);
  assert.equal(challenge.body.challenge.walletAddress, account.address);
  assert.ok(challenge.body.challenge.message.includes(challenge.body.challenge.nonce));

  const signature = await account.signMessage({ message: challenge.body.challenge.message });
  const verified = await app.inject({
    method: "POST",
    url: "/api/auth/wallet/verify",
    headers: { "x-user-id": "wallet-user" },
    body: {
      challengeId: challenge.body.challenge.id,
      walletAddress: account.address,
      walletProvider: "MetaMask",
      signature
    }
  });
  assert.equal(verified.statusCode, 200);
  assert.equal(verified.body.user.id, "wallet-user");
  assert.equal(verified.body.user.walletAddress, account.address);
  assert.equal(verified.body.user.walletProvider, "MetaMask");

  const replay = await app.inject({
    method: "POST",
    url: "/api/auth/wallet/verify",
    headers: { "x-user-id": "wallet-user" },
    body: {
      challengeId: challenge.body.challenge.id,
      walletAddress: account.address,
      signature
    }
  });
  assert.equal(replay.statusCode, 409);
  assert.equal(replay.body.error.code, "WALLET_CHALLENGE_USED");

  const duplicateChallenge = await app.inject({
    method: "POST",
    url: "/api/auth/wallet/challenge",
    headers: { "x-user-id": "other-wallet-user" },
    body: { walletAddress: account.address }
  });
  const duplicateSignature = await account.signMessage({ message: duplicateChallenge.body.challenge.message });
  const duplicate = await app.inject({
    method: "POST",
    url: "/api/auth/wallet/verify",
    headers: { "x-user-id": "other-wallet-user" },
    body: {
      challengeId: duplicateChallenge.body.challenge.id,
      walletAddress: account.address,
      signature: duplicateSignature
    }
  });
  assert.equal(duplicate.statusCode, 409);
  assert.equal(duplicate.body.error.code, "WALLET_ALREADY_LINKED");
});

test("testnet MNT credit exchange uses wallet quotes and blocks reused tx hashes", async () => {
  const { privateKeyToAccount } = await import("viem/accounts");
  const account = privateKeyToAccount("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
  const config = {
    ...testConfig,
    mantleCreditExchangeEnabled: true,
    mantleCreditTreasuryAddress: "0x2222222222222222222222222222222222222222"
  };
  const app = makeApp(config);
  const headers = { "x-user-id": "credit-exchange-user" };

  const packages = await app.inject({
    method: "GET",
    url: "/api/credits/packages",
    headers
  });
  assert.equal(packages.statusCode, 200);
  assert.equal(packages.body.enabled, true);
  assert.equal(packages.body.chainId, MANTLE_TESTNET_CHAIN_ID);
  assert.equal(packages.body.packages.some((item) => item.credits === 30), true);

  const noWalletQuote = await app.inject({
    method: "POST",
    url: "/api/credits/quote",
    headers,
    body: { credits: 30 }
  });
  assert.equal(noWalletQuote.statusCode, 409);
  assert.equal(noWalletQuote.body.error.code, "WALLET_REQUIRED");

  const challenge = await app.inject({
    method: "POST",
    url: "/api/auth/wallet/challenge",
    headers,
    body: {
      walletAddress: account.address,
      walletProvider: "MetaMask"
    }
  });
  const signature = await account.signMessage({ message: challenge.body.challenge.message });
  const verified = await app.inject({
    method: "POST",
    url: "/api/auth/wallet/verify",
    headers,
    body: {
      challengeId: challenge.body.challenge.id,
      walletAddress: account.address,
      walletProvider: "MetaMask",
      signature
    }
  });
  assert.equal(verified.statusCode, 200);

  const quote = await app.inject({
    method: "POST",
    url: "/api/credits/quote",
    headers,
    body: { credits: 30 }
  });
  assert.equal(quote.statusCode, 201);
  assert.equal(quote.body.quote.credits, 30);
  assert.equal(quote.body.quote.walletAddressNormalized, account.address.toLowerCase());
  assert.equal(quote.body.quote.receiverAddress, config.mantleCreditTreasuryAddress);

  const txHash = `0x${"b".repeat(64)}`;
  const exchanged = await app.inject({
    method: "POST",
    url: "/api/credits/exchange",
    headers,
    body: {
      quoteId: quote.body.quote.id,
      txHash
    }
  });
  assert.equal(exchanged.statusCode, 201);
  assert.equal(exchanged.body.balance, 30);
  assert.equal(exchanged.body.transaction.reason, CreditTransactionReason.MNT_EXCHANGE);
  assert.equal(exchanged.body.transaction.metadata.txHashNormalized, txHash);
  assert.equal(exchanged.body.transaction.metadata.fromNormalized, account.address.toLowerCase());

  const credits = await app.inject({
    method: "GET",
    url: "/api/users/me/credits",
    headers
  });
  assert.equal(credits.body.balance, 30);
  assert.equal(credits.body.transactions[0].reason, CreditTransactionReason.MNT_EXCHANGE);

  const replay = await app.inject({
    method: "POST",
    url: "/api/credits/exchange",
    headers,
    body: {
      quoteId: quote.body.quote.id,
      txHash
    }
  });
  assert.equal(replay.statusCode, 409);
  assert.equal(replay.body.error.code, "CREDIT_QUOTE_USED");

  const secondQuote = await app.inject({
    method: "POST",
    url: "/api/credits/quote",
    headers,
    body: { credits: 10 }
  });
  const reusedTx = await app.inject({
    method: "POST",
    url: "/api/credits/exchange",
    headers,
    body: {
      quoteId: secondQuote.body.quote.id,
      txHash
    }
  });
  assert.equal(reusedTx.statusCode, 409);
  assert.equal(reusedTx.body.error.code, "CREDIT_TX_ALREADY_USED");
});

test("demo credits, social comments, likes, shares, and my profile lists use backend data", async () => {
  const app = makeApp();
  const headers = { "x-user-id": "profile-data-user" };

  const charged = await app.inject({
    method: "POST",
    url: "/api/users/me/credits/demo-charge",
    headers,
    body: { credits: 30, priceMnt: 30 }
  });
  assert.equal(charged.statusCode, 201);
  assert.equal(charged.body.balance, 30);
  assert.equal(charged.body.transaction.reason, "DEMO_CHARGE");

  const credits = await app.inject({ method: "GET", url: "/api/users/me/credits", headers });
  assert.equal(credits.statusCode, 200);
  assert.equal(credits.body.balance, 30);
  assert.equal(credits.body.transactions.length, 1);

  const created = await app.inject({
    method: "POST",
    url: "/api/battles",
    headers,
    body: {
      battleType: BattleType.TEXT_OPEN,
      prompt: "Profile API data battle"
    }
  });
  const battle = created.body.battle;
  const submitted = await app.inject({
    method: "POST",
    url: `/api/battles/${battle.id}/entries`,
    headers,
    body: { content: "This entry should collect social API data." }
  });
  const entry = submitted.body.entry;

  const comment = await app.inject({
    method: "POST",
    url: `/api/battles/${battle.id}/comments`,
    headers,
    body: {
      targetEntryId: entry.id,
      content: "A separate social comment that is not judged."
    }
  });
  assert.equal(comment.statusCode, 201);
  assert.equal(comment.body.comment.targetEntryId, entry.id);

  const like = await app.inject({
    method: "POST",
    url: `/api/entries/${entry.id}/like`,
    headers
  });
  assert.equal(like.statusCode, 200);
  assert.equal(like.body.liked, true);
  assert.equal(like.body.likeCount, 1);

  const battleLike = await app.inject({
    method: "POST",
    url: `/api/battles/${battle.id}/like`,
    headers
  });
  assert.equal(battleLike.statusCode, 200);
  assert.equal(battleLike.body.liked, true);
  assert.equal(battleLike.body.likeCount, 1);

  const share = await app.inject({
    method: "POST",
    url: `/api/battles/${battle.id}/shares`,
    headers,
    body: { channel: "copy-link" }
  });
  assert.equal(share.statusCode, 201);
  assert.equal(share.body.shareCount, 1);

  const detail = await app.inject({
    method: "GET",
    url: `/api/battles/${battle.id}`,
    headers
  });
  assert.equal(detail.body.battle.stats.entryCount, 1);
  assert.equal(detail.body.battle.stats.commentCount, 1);
  assert.equal(detail.body.battle.stats.likeCount, 1);
  assert.equal(detail.body.battle.stats.battleLikeCount, 1);
  assert.equal(detail.body.battle.stats.shareCount, 1);
  assert.equal(detail.body.entries[0].stats.likeCount, 1);
  assert.equal(detail.body.entries[0].stats.likedByMe, true);

  const myBattles = await app.inject({ method: "GET", url: "/api/users/me/battles", headers });
  assert.equal(myBattles.statusCode, 200);
  assert.equal(myBattles.body.battles.some((item) => item.id === battle.id), true);
  assert.equal(myBattles.body.battles.find((item) => item.id === battle.id).stats.shareCount, 1);

  const myComments = await app.inject({ method: "GET", url: "/api/users/me/comments", headers });
  assert.equal(myComments.statusCode, 200);
  assert.equal(myComments.body.comments.length, 1);
  assert.equal(myComments.body.comments[0].content, "A separate social comment that is not judged.");

  const myLikes = await app.inject({ method: "GET", url: "/api/users/me/likes", headers });
  assert.equal(myLikes.statusCode, 200);
  assert.equal(myLikes.body.likes.length, 2);
  assert.equal(myLikes.body.likes.some((item) => item.kind === "ENTRY_LIKE" && item.entryId === entry.id), true);
  assert.equal(myLikes.body.likes.some((item) => item.kind === "BATTLE_LIKE" && item.battleId === battle.id), true);

  const unlike = await app.inject({
    method: "DELETE",
    url: `/api/entries/${entry.id}/like`,
    headers
  });
  assert.equal(unlike.statusCode, 200);
  assert.equal(unlike.body.liked, false);
  assert.equal(unlike.body.likeCount, 0);
});

test("gAon feed flow supports create, participation spend, comments, evaluation, reward, likes, and notifications", async () => {
  const app = makeApp();
  const headers = { "x-user-id": "gaon-user" };

  await app.inject({
    method: "POST",
    url: "/api/users/me/credits/demo-charge",
    headers,
    body: { credits: 30, priceMnt: 30 }
  });

  const created = await app.inject({
    method: "POST",
    url: "/api/feed/battles",
    headers,
    body: {
      battleType: BattleType.TEXT_OPEN,
      title: "gAon feed battle",
      content: "This battle uses the new HomeFeed shape.",
      deadline: "2026-12-31 23:59",
      isAnonymous: false
    }
  });
  assert.equal(created.statusCode, 201);
  assert.equal(created.body.battle.title, "gAon feed battle");
  assert.equal(created.body.battle.type, BattleType.TEXT_OPEN);
  assert.equal(created.body.battle.status, "OPEN");
  assert.equal(created.body.battle.likeCount, 0);

  const liked = await app.inject({
    method: "POST",
    url: `/api/battles/${created.body.battle.id}/like`,
    headers
  });
  assert.equal(liked.statusCode, 200);
  assert.equal(liked.body.liked, true);
  assert.equal(liked.body.likeCount, 1);

  const participated = await app.inject({
    method: "POST",
    url: `/api/feed/battles/${created.body.battle.id}/participations`,
    headers,
    body: {}
  });
  assert.equal(participated.statusCode, 201);
  assert.equal(participated.body.balance, 27);
  assert.equal(participated.body.participation.costCredits, 3);
  assert.equal(participated.body.alreadyParticipated, false);

  const duplicateParticipation = await app.inject({
    method: "POST",
    url: `/api/feed/battles/${created.body.battle.id}/participations`,
    headers,
    body: {}
  });
  assert.equal(duplicateParticipation.statusCode, 201);
  assert.equal(duplicateParticipation.body.balance, 27);
  assert.equal(duplicateParticipation.body.alreadyParticipated, true);

  const comment = await app.inject({
    method: "POST",
    url: `/api/feed/battles/${created.body.battle.id}/comments`,
    headers,
    body: { text: "My judged feed comment." }
  });
  assert.equal(comment.statusCode, 201);
  assert.equal(comment.body.comment.text, "My judged feed comment.");

  const commentLike = await app.inject({
    method: "POST",
    url: `/api/feed/comments/${comment.body.comment.id}/like`,
    headers
  });
  assert.equal(commentLike.statusCode, 200);
  assert.equal(commentLike.body.liked, true);
  assert.equal(commentLike.body.likeCount, 1);

  const reply = await app.inject({
    method: "POST",
    url: `/api/feed/comments/${comment.body.comment.id}/replies`,
    headers,
    body: { text: "Nested reply from the latest gAon UI." }
  });
  assert.equal(reply.statusCode, 201);
  assert.equal(reply.body.reply.text, "Nested reply from the latest gAon UI.");
  assert.equal(reply.body.reply.parentEntryId, comment.body.comment.id);

  const replyLike = await app.inject({
    method: "POST",
    url: `/api/feed/comments/${reply.body.reply.id}/like`,
    headers
  });
  assert.equal(replyLike.statusCode, 200);
  assert.equal(replyLike.body.liked, true);
  assert.equal(replyLike.body.likeCount, 1);

  const detail = await app.inject({
    method: "GET",
    url: `/api/feed/battles/${created.body.battle.id}`,
    headers
  });
  assert.equal(detail.statusCode, 200);
  assert.equal(detail.body.battle.isParticipated, true);
  assert.equal(detail.body.battle.isBattleLiked, true);
  assert.equal(detail.body.battle.comments.length, 1);
  assert.equal(detail.body.battle.comments[0].likedByMe, true);
  assert.equal(detail.body.battle.comments[0].replies.length, 1);
  assert.equal(detail.body.battle.comments[0].replies[0].likedByMe, true);
  assert.equal(detail.body.battle.stats.participationCount, 1);

  const evaluated = await app.inject({
    method: "POST",
    url: `/api/feed/battles/${created.body.battle.id}/evaluate`,
    headers
  });
  assert.equal(evaluated.statusCode, 200);
  assert.equal(evaluated.body.battle.status, BattleStatus.SETTLED);
  assert.equal(evaluated.body.entries.some((entry) => entry.id === reply.body.reply.id), false);
  assert.equal(evaluated.body.feedResult.winnerCommentId, evaluated.body.feedResult.winnerEntryId);
  assert.equal(evaluated.body.feedResult.participantCount, 1);
  assert.equal(evaluated.body.feedResult.rewardCredits, 30);
  assert.ok(evaluated.body.feedResult.aiSummary);
  assert.ok(evaluated.body.feedResult.verdictLines.length > 0);

  const reward = await app.inject({
    method: "POST",
    url: `/api/feed/battles/${created.body.battle.id}/rewards/claim`,
    headers
  });
  assert.equal(reward.statusCode, 201);
  assert.equal(reward.body.rewardCredits, 30);
  assert.equal(reward.body.balance, 57);

  const duplicateReward = await app.inject({
    method: "POST",
    url: `/api/feed/battles/${created.body.battle.id}/rewards/claim`,
    headers
  });
  assert.equal(duplicateReward.statusCode, 409);
  assert.equal(duplicateReward.body.error.code, "REWARD_ALREADY_CLAIMED");

  const notifications = await app.inject({
    method: "GET",
    url: "/api/users/me/notifications",
    headers
  });
  assert.equal(notifications.statusCode, 200);
  assert.ok(notifications.body.notifications.length >= 2);
  assert.equal(notifications.body.notifications.some((item) => item.isRead), false);

  const firstNotification = notifications.body.notifications[0];
  assert.equal(firstNotification.readAt, null);
  assert.equal(firstNotification.isRead, false);
  assert.equal(firstNotification.targetType, "battle");

  const forbiddenRead = await app.inject({
    method: "POST",
    url: `/api/users/me/notifications/${firstNotification.id}/read`,
    headers: { "x-user-id": "other-gaon-user" }
  });
  assert.equal(forbiddenRead.statusCode, 404);
  assert.equal(forbiddenRead.body.error.code, "NOTIFICATION_NOT_FOUND");

  const readOne = await app.inject({
    method: "POST",
    url: `/api/users/me/notifications/${firstNotification.id}/read`,
    headers
  });
  assert.equal(readOne.statusCode, 200);
  assert.equal(readOne.body.notification.id, firstNotification.id);
  assert.equal(readOne.body.notification.isRead, true);
  assert.ok(readOne.body.notification.readAt);

  const readAll = await app.inject({
    method: "POST",
    url: "/api/users/me/notifications/read-all",
    headers
  });
  assert.equal(readAll.statusCode, 200);
  assert.ok(readAll.body.readCount >= 1);
  assert.equal(readAll.body.notifications.every((item) => item.isRead), true);

  const myComments = await app.inject({ method: "GET", url: "/api/users/me/comments", headers });
  assert.equal(myComments.statusCode, 200);
  assert.equal(myComments.body.comments.some((item) => item.kind === "FEED_COMMENT" && item.id === comment.body.comment.id), true);
  assert.equal(myComments.body.comments.some((item) => item.kind === "FEED_COMMENT" && item.id === reply.body.reply.id), true);

  const myLikes = await app.inject({ method: "GET", url: "/api/users/me/likes", headers });
  assert.equal(myLikes.statusCode, 200);
  assert.equal(myLikes.body.likes.some((item) => item.kind === "BATTLE_LIKE" && item.battleId === created.body.battle.id), true);
  assert.equal(myLikes.body.likes.some((item) => item.kind === "ENTRY_LIKE" && item.entryId === comment.body.comment.id), true);
});

test("OPTION feed rewards can be claimed by participants on the winning option", async () => {
  const app = makeApp();
  const creatorHeaders = { "x-user-id": "option-creator" };
  const winnerHeaders = { "x-user-id": "option-side-winner" };
  const mvpHeaders = { "x-user-id": "option-mvp" };

  await app.inject({
    method: "POST",
    url: "/api/users/me/credits/demo-charge",
    headers: winnerHeaders,
    body: { credits: 30, priceMnt: 30 }
  });
  await app.inject({
    method: "POST",
    url: "/api/users/me/credits/demo-charge",
    headers: mvpHeaders,
    body: { credits: 30, priceMnt: 30 }
  });

  const created = await app.inject({
    method: "POST",
    url: "/api/feed/battles",
    headers: creatorHeaders,
    body: {
      battleType: BattleType.OPTION,
      title: "Best sauce side",
      content: "Pick the side with better arguments.",
      deadline: "2026-12-31 23:59",
      options: ["Pour", "Dip"]
    }
  });
  assert.equal(created.statusCode, 201);

  const winnerParticipation = await app.inject({
    method: "POST",
    url: `/api/feed/battles/${created.body.battle.id}/participations`,
    headers: winnerHeaders,
    body: { optionText: "Pour" }
  });
  assert.equal(winnerParticipation.statusCode, 201);
  assert.equal(winnerParticipation.body.selectedOption, "Pour");

  const mvpParticipation = await app.inject({
    method: "POST",
    url: `/api/feed/battles/${created.body.battle.id}/participations`,
    headers: mvpHeaders,
    body: { optionText: "Pour" }
  });
  assert.equal(mvpParticipation.statusCode, 201);

  const comment = await app.inject({
    method: "POST",
    url: `/api/feed/battles/${created.body.battle.id}/comments`,
    headers: mvpHeaders,
    body: { content: "Pouring makes the sauce part of the dish." }
  });
  assert.equal(comment.statusCode, 201);

  const evaluated = await app.inject({
    method: "POST",
    url: `/api/feed/battles/${created.body.battle.id}/evaluate`,
    headers: creatorHeaders
  });
  assert.equal(evaluated.statusCode, 200);
  assert.equal(evaluated.body.feedResult.winnerName, "Pour");
  assert.equal(evaluated.body.feedResult.winningOptionId, evaluated.body.feedResult.winnerOptionId);
  assert.ok(evaluated.body.feedResult.optionStats.some((item) => item.label === "Pour"));

  const reward = await app.inject({
    method: "POST",
    url: `/api/feed/battles/${created.body.battle.id}/rewards/claim`,
    headers: winnerHeaders
  });
  assert.equal(reward.statusCode, 201);
  assert.equal(reward.body.balance, 57);
});

test("expired open feed battles map to the latest gAon evaluating state", async () => {
  const app = makeApp();
  const created = await app.inject({
    method: "POST",
    url: "/api/feed/battles",
    headers: { "x-user-id": "expired-feed-user" },
    body: {
      battleType: BattleType.TEXT_OPEN,
      title: "Expired feed battle",
      content: "This should enter the evaluation UI after deadline.",
      deadline: "2020-01-01 00:00"
    }
  });
  assert.equal(created.statusCode, 201);
  assert.equal(created.body.battle.status, "EVALUATING");
});

test("request body cannot spoof creator or entry submitter identity", async () => {
  const app = makeApp();
  const created = await app.inject({
    method: "POST",
    url: "/api/battles",
    headers: { "x-user-id": "header-user" },
    body: {
      battleType: BattleType.TEXT_OPEN,
      prompt: "Identity should come from headers.",
      createdByUserId: "body-user"
    }
  });
  assert.equal(created.statusCode, 201);
  assert.equal(created.body.battle.createdByUserId, "header-user");

  const submitted = await app.inject({
    method: "POST",
    url: `/api/battles/${created.body.battle.id}/entries`,
    headers: { "x-user-id": "header-user" },
    body: {
      content: "Submitted by header user.",
      submittedByUserId: "body-submit-user"
    }
  });
  assert.equal(submitted.statusCode, 201);
  assert.equal(submitted.body.entry.submittedByUserId, "header-user");
});

test("empty battles cannot be closed into an unjudgeable state", async () => {
  const app = makeApp();
  const created = await request(app, "POST", "/api/battles", {
    battleType: BattleType.TEXT_OPEN,
    prompt: "Do not close before entries."
  });
  assert.equal(created.statusCode, 201);

  const closed = await request(app, "POST", `/api/battles/${created.body.battle.id}/close`);
  assert.equal(closed.statusCode, 409);
  assert.equal(closed.body.error.code, "BATTLE_CANNOT_CLOSE");

  const detail = await request(app, "GET", `/api/battles/${created.body.battle.id}`);
  assert.equal(detail.body.battle.status, BattleStatus.OPEN);
});

test("stores judging rules snapshot and uses it for verdict hashing", async () => {
  const repository = new MemoryRepository();
  const app = createApiApp({
    repository,
    config: testConfig,
    aiJudgeService: createAiJudgeService(testConfig),
    settlementService: createSettlementService(testConfig)
  });
  const created = await request(app, "POST", "/api/battles", {
    battleType: BattleType.TEXT_OPEN,
    prompt: "Defend a suspicious toaster."
  });
  assert.equal(created.statusCode, 201);

  const battle = created.body.battle;
  const expectedRules = getJudgingRules(BattleType.TEXT_OPEN);
  const expectedRulesHash = sha256Hex(expectedRules);
  const rulesAfterCreate = repository.exportState().judgingRules.filter((rule) => rule.battleId === battle.id);
  assert.equal(rulesAfterCreate.length, 1);
  assert.deepEqual(rulesAfterCreate[0].rulesJson, expectedRules);
  assert.equal(rulesAfterCreate[0].rulesHash, expectedRulesHash);

  await request(app, "POST", `/api/battles/${battle.id}/entries`, {
    content: "The toaster is not suspicious; it is conducting thermal research."
  });
  await request(app, "POST", `/api/battles/${battle.id}/close`);

  const judged = await request(app, "POST", `/api/battles/${battle.id}/judge`);
  assert.equal(judged.statusCode, 200);
  assert.equal(judged.body.hashPackage.rulesHash, expectedRulesHash);
  assert.equal(repository.exportState().judgingRules.filter((rule) => rule.battleId === battle.id).length, 1);
});

test("JSON file repository backfills judgingRules for legacy local data", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "mgg-legacy-json-"));
  const filePath = join(tempDir, "mgg-api.json");
  await writeFile(
    filePath,
    JSON.stringify({
      users: [],
      battles: [],
      entries: [],
      verdicts: [],
      settlements: [],
      reports: []
    })
  );

  try {
    const repository = await JsonFileRepository.open(filePath);
    const app = createApiApp({
      repository,
      config: testConfig,
      aiJudgeService: createAiJudgeService(testConfig),
      settlementService: createSettlementService(testConfig)
    });

    const created = await request(app, "POST", "/api/battles", {
      battleType: BattleType.TEXT_OPEN,
      prompt: "Explain why old data still deserves a chair."
    });

    assert.equal(created.statusCode, 201);
    assert.equal(repository.exportState().judgingRules.length, 1);
    assert.ok(Array.isArray(repository.exportState().reports));
    assert.ok(Array.isArray(repository.exportState().walletChallenges));
    assert.ok(Array.isArray(repository.exportState().creditTransactions));
    assert.ok(Array.isArray(repository.exportState().socialComments));
    assert.ok(Array.isArray(repository.exportState().entryLikes));
    assert.ok(Array.isArray(repository.exportState().battleLikes));
    assert.ok(Array.isArray(repository.exportState().participations));
    assert.ok(Array.isArray(repository.exportState().battleShares));
    assert.ok(Array.isArray(repository.exportState().notifications));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("validates OPTION battles require 2 to 4 options", async () => {
  const app = makeApp();

  const tooFew = await request(app, "POST", "/api/battles", {
    battleType: BattleType.OPTION,
    prompt: "Pick one",
    options: ["A"]
  });
  assert.equal(tooFew.statusCode, 400);

  const tooMany = await request(app, "POST", "/api/battles", {
    battleType: BattleType.OPTION,
    prompt: "Pick one",
    options: ["A", "B", "C", "D", "E"]
  });
  assert.equal(tooMany.statusCode, 400);
});

test("enforces entry submission state and blocks entries after CLOSED", async () => {
  const app = makeApp();
  const created = await request(app, "POST", "/api/battles", {
    battleType: BattleType.TEXT_OPEN,
    prompt: "Pitch a spoon as mayor."
  });
  const battleId = created.body.battle.id;

  const entry = await request(app, "POST", `/api/battles/${battleId}/entries`, {
    content: "The spoon already has public service experience."
  });
  assert.equal(entry.statusCode, 201);

  const closed = await request(app, "POST", `/api/battles/${battleId}/close`);
  assert.equal(closed.statusCode, 200);
  assert.equal(closed.body.battle.status, BattleStatus.CLOSED);

  const lateEntry = await request(app, "POST", `/api/battles/${battleId}/entries`, {
    content: "Too late."
  });
  assert.equal(lateEntry.statusCode, 409);
});

test("requires optionId for OPTION entries", async () => {
  const app = makeApp();
  const created = await request(app, "POST", "/api/battles", {
    battleType: BattleType.OPTION,
    prompt: "Best excuse?",
    options: ["Traffic", "Mercury"]
  });

  const missingOption = await request(app, "POST", `/api/battles/${created.body.battle.id}/entries`, {
    content: "Mercury is in retrograde and also parked badly."
  });
  assert.equal(missingOption.statusCode, 400);
});

test("creates reports for battles and validates report targets", async () => {
  const repository = new MemoryRepository();
  const app = createApiApp({
    repository,
    config: testConfig,
    aiJudgeService: createAiJudgeService(testConfig),
    settlementService: createSettlementService(testConfig)
  });
  const created = await request(app, "POST", "/api/battles", {
    battleType: BattleType.TEXT_OPEN,
    prompt: "Defend a suspicious mug."
  });
  assert.equal(created.statusCode, 201);
  const battleId = created.body.battle.id;

  const submitted = await request(app, "POST", `/api/battles/${battleId}/entries`, {
    content: "The mug is not suspicious; it is just holding evidence."
  });
  assert.equal(submitted.statusCode, 201);

  const report = await request(app, "POST", `/api/battles/${battleId}/reports`, {
    targetEntryId: submitted.body.entry.id,
    reason: "Spam or unsafe content review request"
  });
  assert.equal(report.statusCode, 201);
  assert.equal(report.body.report.battleId, battleId);
  assert.equal(report.body.report.targetEntryId, submitted.body.entry.id);
  assert.equal(report.body.report.reporterUserId, "test-user");
  assert.equal(report.body.report.status, "OPEN");
  assert.equal(repository.exportState().reports.length, 1);

  const invalidTarget = await request(app, "POST", `/api/battles/${battleId}/reports`, {
    targetEntryId: "missing-entry",
    reason: "This target does not belong here"
  });
  assert.equal(invalidTarget.statusCode, 400);
  assert.equal(invalidTarget.body.error.code, "INVALID_REPORT_TARGET");

  const missingReason = await request(app, "POST", `/api/battles/${battleId}/reports`, {
    targetEntryId: submitted.body.entry.id
  });
  assert.equal(missingReason.statusCode, 400);
  assert.equal(missingReason.body.error.code, "VALIDATION_ERROR");
});

test("closes, judges, settles, and returns result shape", async () => {
  const app = makeApp();
  const created = await request(app, "POST", "/api/battles", {
    battleType: BattleType.OPTION,
    prompt: "Which object is more CEO-coded?",
    options: ["Stapler", "Rice cooker"]
  });
  const battle = created.body.battle;

  await request(app, "POST", `/api/battles/${battle.id}/entries`, {
    optionId: battle.options[0].id,
    content: "The stapler literally consolidates departments."
  });
  await request(app, "POST", `/api/battles/${battle.id}/entries`, {
    optionId: battle.options[1].id,
    content: "The rice cooker has a boardroom beep and quarterly steam."
  });
  await request(app, "POST", `/api/battles/${battle.id}/close`);

  const judged = await request(app, "POST", `/api/battles/${battle.id}/judge`);
  assert.equal(judged.statusCode, 200);
  assert.equal(judged.body.battle.status, BattleStatus.SETTLED);
  assert.ok(judged.body.verdict.winnerOptionId);
  assert.ok(judged.body.hashPackage.verdictHash);
  assert.ok(judged.body.settlement.txHash);

  const result = await request(app, "GET", `/api/battles/${battle.id}/result`);
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.battle.id, battle.id);
  assert.ok(Array.isArray(result.body.verdict.scoreTable));
  assert.ok(result.body.settlement.explorerUrl.includes(result.body.settlement.txHash));
});

test("blocks repeated close and judge lifecycle calls", async () => {
  const app = makeApp();
  const battle = await createBattleWithEntries(app, {
    battleType: BattleType.TEXT_OPEN,
    prompt: "Give a vending machine a campaign slogan."
  }, [
    { content: "Exact change, exact justice." }
  ]);

  const firstClose = await request(app, "POST", `/api/battles/${battle.id}/close`);
  assert.equal(firstClose.statusCode, 200);

  const secondClose = await request(app, "POST", `/api/battles/${battle.id}/close`);
  assert.equal(secondClose.statusCode, 409);

  const firstJudge = await request(app, "POST", `/api/battles/${battle.id}/judge`);
  assert.equal(firstJudge.statusCode, 200);

  const secondJudge = await request(app, "POST", `/api/battles/${battle.id}/judge`);
  assert.equal(secondJudge.statusCode, 409);
});

test("settles TEXT_OPEN and IMAGE_CAPTION through the common pipeline", async () => {
  const app = makeApp();

  const textBattle = await createBattleWithEntries(app, {
    battleType: BattleType.TEXT_OPEN,
    prompt: "Convince me a keyboard is a legal advisor."
  }, [
    { content: "It objects every time you press escape." },
    { content: "It has a space bar, so clearly it understands jurisdiction." }
  ]);

  const textResult = await closeAndJudge(app, textBattle.id);
  assert.equal(textResult.body.battle.status, BattleStatus.SETTLED);
  assert.equal(textResult.body.verdict.winnerType, "ENTRY");
  assert.ok(textResult.body.verdict.winnerEntryId);

  const imageBattle = await createBattleWithEntries(app, {
    battleType: BattleType.IMAGE_CAPTION,
    imageUrl: "/uploads/mock.webp"
  }, [
    { content: "When the group project finally compiles." },
    { content: "POV: the Wi-Fi heard your deadline." }
  ]);

  const imageResult = await closeAndJudge(app, imageBattle.id);
  assert.equal(imageResult.body.battle.status, BattleStatus.SETTLED);
  assert.equal(imageResult.body.verdict.winnerType, "ENTRY");
  assert.ok(imageResult.body.hashPackage.verdictHash);
});

test("mock AI judge is deterministic", async () => {
  const input = {
    battle: {
      id: "battle-1",
      battleType: BattleType.TEXT_OPEN,
      prompt: "Argue for a tiny hat.",
      options: []
    },
    entries: [
      { id: "entry-1", content: "Tiny hat, massive confidence.", optionId: null },
      { id: "entry-2", content: "The hat is small because the ego is huge.", optionId: null }
    ],
    rules: getJudgingRules(BattleType.TEXT_OPEN)
  };

  assert.deepEqual(mockJudgeBattle(input), mockJudgeBattle(input));
  assert.equal(mockJudgeBattle(input).winnerType, "ENTRY");
});

test("AI judge output references must match existing entries and options", () => {
  const input = {
    battle: {
      id: "battle-1",
      battleType: BattleType.OPTION,
      status: BattleStatus.CLOSED,
      prompt: "Pick a mascot.",
      options: [
        { id: "option-1", text: "Spoon" },
        { id: "option-2", text: "Umbrella" }
      ]
    },
    entries: [
      { id: "entry-1", content: "The spoon has range.", optionId: "option-1" },
      { id: "entry-2", content: "The umbrella owns the sky.", optionId: "option-2" }
    ],
    rules: getJudgingRules(BattleType.OPTION)
  };

  const valid = validateJudgeOutputReferences(
    {
      winnerType: "OPTION",
      winnerOptionId: "option-1",
      winnerEntryId: "entry-1",
      topEntries: [{ rank: 1, entryId: "entry-1", score: 90, reason: "Strong bit." }],
      optionScores: [
        { optionId: "option-1", score: 90, reason: "Best comments." },
        { optionId: "option-2", score: 70, reason: "Still good." }
      ],
      scoreTable: [
        { entryId: "entry-1", optionId: "option-1", score: 90, reason: "Strong bit." },
        { entryId: "entry-2", optionId: "option-2", score: 70, reason: "Still good." }
      ],
      verdictTitle: "Spoon wins",
      verdictText: "The spoon argument landed harder.",
      shareSummary: "AI picked spoon."
    },
    input
  );
  assert.equal(valid.winnerOptionId, "option-1");

  assert.throws(
    () =>
      validateJudgeOutputReferences(
        {
          ...valid,
          winnerEntryId: "missing-entry",
          topEntries: [{ rank: 1, entryId: "missing-entry", score: 91, reason: "Invalid ref." }]
        },
        input
      ),
    /AI judge output referenced unknown battle data/
  );
});

test("invalid AI judge references fail safely without settlement", async () => {
  const repository = new MemoryRepository();
  const app = createApiApp({
    repository,
    config: testConfig,
    aiJudgeService: {
      judgeBattle: async () => ({
        winnerType: "ENTRY",
        winnerEntryId: "missing-entry",
        topEntries: [{ rank: 1, entryId: "missing-entry", score: 88, reason: "Unknown entry." }],
        scoreTable: [{ entryId: "missing-entry", optionId: null, score: 88, reason: "Unknown entry." }],
        verdictTitle: "Invalid AI output",
        verdictText: "This output points outside the battle.",
        shareSummary: "Invalid output should not settle."
      })
    },
    settlementService: createSettlementService(testConfig)
  });

  const battle = await createBattleWithEntries(
    app,
    {
      battleType: BattleType.TEXT_OPEN,
      prompt: "Defend a paperclip in court."
    },
    [{ content: "The paperclip kept the evidence together." }]
  );

  const closed = await request(app, "POST", `/api/battles/${battle.id}/close`);
  assert.equal(closed.statusCode, 200);

  const judged = await request(app, "POST", `/api/battles/${battle.id}/judge`);
  assert.equal(judged.statusCode, 502);
  assert.equal(judged.body.error.code, "JUDGE_OR_SETTLEMENT_FAILED");
  assert.match(judged.body.error.details[0], /AI judge output referenced unknown battle data/);

  const result = await request(app, "GET", `/api/battles/${battle.id}/result`);
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.battle.status, BattleStatus.FAILED);
  assert.match(result.body.failureReason, /AI judge output referenced unknown battle data/);
  assert.equal(await repository.getVerdictByBattle(battle.id), null);
  assert.equal(await repository.getSettlementByBattle(battle.id), null);
});

test("shared judge and result contracts validate required shape", () => {
  const judgeInput = validateJudgeInput({
    battle: {
      id: "battle-1",
      battleType: BattleType.TEXT_OPEN,
      status: BattleStatus.CLOSED,
      prompt: "Argue for a tiny hat.",
      options: []
    },
    entries: [{ id: "entry-1", content: "Tiny hat, massive confidence.", optionId: null }],
    rules: getJudgingRules(BattleType.TEXT_OPEN)
  });
  assert.equal(judgeInput.battle.battleType, BattleType.TEXT_OPEN);

  assert.throws(
    () => validateJudgeInput({ battle: { id: "bad", battleType: "BAD" }, entries: [], rules: {} }),
    /Invalid judge input/
  );

  assert.throws(
    () =>
      validateJudgeOutput(
        {
          winnerType: "ENTRY",
          winnerEntryId: "entry-1",
          topEntries: [],
          scoreTable: [],
          verdictTitle: "Bad",
          verdictText: "Bad",
          shareSummary: "Bad"
        },
        BattleType.TEXT_OPEN
      ),
    /Invalid judge output/
  );

  const result = validateResultResponse({
    battle: {
      id: "battle-1",
      battleType: BattleType.TEXT_OPEN,
      status: BattleStatus.SETTLED,
      prompt: "Prompt",
      imageUrl: null,
      options: [],
      createdAt: new Date().toISOString(),
      closedAt: new Date().toISOString(),
      settledAt: new Date().toISOString()
    },
    entries: [{ id: "entry-1", content: "Answer", optionId: null }],
    verdict: {
      winnerType: "ENTRY",
      winnerEntryId: "entry-1",
      topEntries: [{ rank: 1, entryId: "entry-1", score: 88, reason: "Strong" }],
      scoreTable: [{ entryId: "entry-1", optionId: null, score: 88, reason: "Strong" }],
      verdictTitle: "Winner",
      verdictText: "A clear winner.",
      shareSummary: "Entry won."
    },
    hashPackage: {
      contentHash: "0x1",
      entriesRoot: "0x2",
      rulesHash: "0x3",
      modelVersionHash: "0x4",
      winnerHash: "0x5",
      verdictHash: "0x6"
    },
    settlement: {
      id: "settlement-1",
      chainId: 5003,
      contractAddress: "0x0000000000000000000000000000000000000000",
      txHash: "0x7",
      explorerUrl: "https://sepolia.mantlescan.xyz/tx/0x7",
      settledAt: new Date().toISOString()
    }
  });
  assert.equal(result.battle.id, "battle-1");
});

test("Prisma schema does not duplicate shared BattleType or BattleStatus enums", () => {
  const schema = readFileSync(new URL("../../../prisma/schema.prisma", import.meta.url), "utf8");
  assert.equal(schema.includes("enum BattleType"), false);
  assert.equal(schema.includes("enum BattleStatus"), false);
  assert.match(schema, /battleType\s+String/);
  assert.match(schema, /status\s+String\s+@default\("OPEN"\)/);
});

test("mock Mantle settlement returns deterministic tx metadata", () => {
  const payload = {
    contentHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
    entriesRoot: "0x2222222222222222222222222222222222222222222222222222222222222222",
    rulesHash: "0x3333333333333333333333333333333333333333333333333333333333333333",
    modelVersionHash: "0x4444444444444444444444444444444444444444444444444444444444444444",
    winnerHash: "0x5555555555555555555555555555555555555555555555555555555555555555",
    verdictHash: "0x6666666666666666666666666666666666666666666666666666666666666666"
  };

  const first = mockRecordVerdict(payload, testConfig);
  const second = mockRecordVerdict(payload, testConfig);
  assert.deepEqual(first, second);
  assert.equal(first.chainId, 5003);
  assert.equal(first.contractAddress, ZERO_ADDRESS);
});

test("Mantle settlement validation rejects malformed payload and config", () => {
  assert.throws(
    () => validateSettlementPayload({ verdictHash: "0x1234" }),
    /Invalid Mantle settlement payload/
  );

  const payload = {
    contentHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
    entriesRoot: "0x2222222222222222222222222222222222222222222222222222222222222222",
    rulesHash: "0x3333333333333333333333333333333333333333333333333333333333333333",
    modelVersionHash: "0x4444444444444444444444444444444444444444444444444444444444444444",
    winnerHash: "0x5555555555555555555555555555555555555555555555555555555555555555",
    optionsHash: null,
    mvpEntryHash: null,
    verdictHash: "0x6666666666666666666666666666666666666666666666666666666666666666"
  };
  assert.deepEqual(validateSettlementPayload(payload), payload);

  assert.throws(() => validateMantleConfig({ mantleChainId: 5003 }), /Invalid Mantle settlement config/);

  const realConfig = {
    mantleRpcUrl: "https://rpc.test",
    mantleChainId: 5003,
    verdictRegistryAddress: "0x1111111111111111111111111111111111111111",
    serverWalletPrivateKey: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  };
  assert.equal(validateMantleConfig(realConfig).mantleChainId, 5003);

  assert.equal(getSettlementReadiness({ mockMantle: true, verdictRegistryAddress: "not-an-address" }).ready, true);
  assert.equal(
    getSettlementReadiness({ mockMantle: true, verdictRegistryAddress: "not-an-address" }).contractAddress,
    ZERO_ADDRESS
  );
  assert.equal(getSettlementReadiness({ mockMantle: false, mantleChainId: 5003 }).ready, false);
});

test("local image upload stores and serves uploaded file over HTTP", async () => {
  const localStorageDir = await mkdtemp(join(tmpdir(), "mgg-upload-"));
  const server = await createHttpServer({
    repository: new MemoryRepository(),
    config: { ...testConfig, localStorageDir }
  });
  const baseUrl = await listenOnRandomPort(server);

  try {
    const uploadResponse = await fetch(`${baseUrl}/api/uploads/image`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: "pixel.gif",
        contentType: "image/gif",
        base64Data: "R0lGODlhAQABAAAAACw="
      })
    });

    assert.equal(uploadResponse.status, 201);
    const uploadBody = await uploadResponse.json();
    assert.match(uploadBody.upload.imageUrl, /^\/uploads\/[a-f0-9]+\.gif$/);

    const imageResponse = await fetch(`${baseUrl}${uploadBody.upload.imageUrl}`);
    assert.equal(imageResponse.status, 200);
    assert.equal(imageResponse.headers.get("content-type"), "image/gif");
    assert.ok((await imageResponse.arrayBuffer()).byteLength > 0);

    const traversalResponse = await fetch(`${baseUrl}/uploads/%2e%2e%2fsecret.gif`);
    assert.equal(traversalResponse.status, 400);
  } finally {
    await closeServer(server);
    await rm(localStorageDir, { recursive: true, force: true });
  }
});

test("HTTP server returns safe 400 responses for malformed mobile requests", async () => {
  const localStorageDir = await mkdtemp(join(tmpdir(), "mgg-bad-request-"));
  const server = await createHttpServer({
    repository: new MemoryRepository(),
    config: { ...testConfig, localStorageDir }
  });
  const baseUrl = await listenOnRandomPort(server);

  try {
    const badJsonResponse = await fetch(`${baseUrl}/api/battles`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{"
    });
    assert.equal(badJsonResponse.status, 400);
    assert.equal((await badJsonResponse.json()).error.code, "INVALID_JSON");

    const badBattlePathResponse = await fetch(`${baseUrl}/api/battles/%E0%A4%A`);
    assert.equal(badBattlePathResponse.status, 400);
    assert.equal((await badBattlePathResponse.json()).error.code, "INVALID_PATH");

    const badUploadPathResponse = await fetch(`${baseUrl}/uploads/%E0%A4%A`);
    assert.equal(badUploadPathResponse.status, 400);
  } finally {
    await closeServer(server);
    await rm(localStorageDir, { recursive: true, force: true });
  }
});

function makeApp(config = testConfig) {
  return createApiApp({
    repository: new MemoryRepository(),
    config,
    aiJudgeService: createAiJudgeService(config),
    settlementService: createSettlementService(config)
  });
}

async function request(app, method, url, body) {
  return app.inject({ method, url, body, headers: { "x-user-id": "test-user" } });
}

async function createBattleWithEntries(app, battleInput, entries) {
  const created = await request(app, "POST", "/api/battles", battleInput);
  assert.equal(created.statusCode, 201);
  const battle = created.body.battle;

  for (const entry of entries) {
    const submitted = await request(app, "POST", `/api/battles/${battle.id}/entries`, entry);
    assert.equal(submitted.statusCode, 201);
  }

  return battle;
}

async function closeAndJudge(app, battleId) {
  const closed = await request(app, "POST", `/api/battles/${battleId}/close`);
  assert.equal(closed.statusCode, 200);

  const judged = await request(app, "POST", `/api/battles/${battleId}/judge`);
  assert.equal(judged.statusCode, 200);
  return judged;
}

async function listenOnRandomPort(server) {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

async function closeServer(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
