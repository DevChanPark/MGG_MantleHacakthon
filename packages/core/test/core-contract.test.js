import test from "node:test";
import assert from "node:assert/strict";
import {
  BattleDisplayStatus,
  BattleStatus,
  BattleType,
  CreditTransactionReason,
  MANTLE_TESTNET_CHAIN_ID,
  MNT_SYMBOL,
  validateCreditExchangeRequest,
  validateCreditExchangeResponse,
  validateCreditPackage,
  validateCreditQuoteRequest,
  validateCreditQuoteResponse,
  validateWalletChallengeRequest,
  validateWalletVerifyRequest
} from "../../shared/src/index.js";
import {
  buildVerdictHashPackage,
  canDisplayBattleAsParticipatable,
  mapBattleStatusToDisplayStatus
} from "../src/index.js";

const WALLET = "0x1111111111111111111111111111111111111111";
const RECEIVER = "0x2222222222222222222222222222222222222222";
const TX_HASH = `0x${"a".repeat(64)}`;

test("maps backend battle status to frontend display status", () => {
  assert.equal(mapBattleStatusToDisplayStatus(BattleStatus.OPEN), BattleDisplayStatus.OPEN);
  assert.equal(mapBattleStatusToDisplayStatus(BattleStatus.CLOSED), BattleDisplayStatus.CLOSED);
  assert.equal(mapBattleStatusToDisplayStatus(BattleStatus.JUDGING), BattleDisplayStatus.EVALUATING);
  assert.equal(mapBattleStatusToDisplayStatus(BattleStatus.SETTLED), BattleDisplayStatus.COMPLETED);
  assert.equal(mapBattleStatusToDisplayStatus(BattleStatus.FAILED), BattleDisplayStatus.FAILED);

  const now = new Date("2026-06-15T00:00:00.000Z");
  assert.equal(
    mapBattleStatusToDisplayStatus(
      { status: BattleStatus.OPEN, deadlineAt: "2026-06-14T23:59:59.000Z" },
      { now }
    ),
    BattleDisplayStatus.EXPIRED
  );
  assert.equal(
    mapBattleStatusToDisplayStatus(
      { status: BattleStatus.OPEN, deadlineAt: "2026-06-16T00:00:00.000Z" },
      { now }
    ),
    BattleDisplayStatus.OPEN
  );
  assert.equal(
    canDisplayBattleAsParticipatable({ status: BattleStatus.OPEN, deadlineAt: "2026-06-16T00:00:00.000Z" }, { now }),
    true
  );
});

test("normalizes wallet challenge and verify DTOs without hardcoding one wallet", () => {
  const challenge = validateWalletChallengeRequest({
    walletAddress: "0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD",
    walletProvider: "Rabby"
  });

  assert.equal(challenge.walletAddress, "0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD");
  assert.equal(challenge.walletAddressNormalized, "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd");
  assert.equal(challenge.walletProvider, "Rabby");

  const verify = validateWalletVerifyRequest({
    challengeId: "challenge-1",
    walletAddress: challenge.walletAddress,
    walletProvider: "MetaMask",
    signature: "0x1234abcd"
  });

  assert.equal(verify.walletAddressNormalized, challenge.walletAddressNormalized);
  assert.equal(verify.walletProvider, "MetaMask");

  assert.throws(
    () => validateWalletChallengeRequest({ walletAddress: "not-an-address" }),
    /Invalid wallet challenge request/
  );
});

test("validates credit package, quote, and exchange DTOs", () => {
  const creditPackage = validateCreditPackage({
    credits: 30,
    priceMnt: "30",
    priceWei: "30000000000000000000"
  });
  assert.equal(creditPackage.credits, 30);
  assert.equal(creditPackage.priceWei, "30000000000000000000");

  const quoteRequest = validateCreditQuoteRequest({
    credits: 30,
    walletAddress: WALLET
  });
  assert.equal(quoteRequest.credits, 30);
  assert.equal(quoteRequest.walletAddressNormalized, WALLET);
  assert.equal(quoteRequest.package.priceWei, "30000000000000000000");

  assert.throws(() => validateCreditQuoteRequest({ credits: 31 }), /Invalid credit quote request/);

  const quote = validateCreditQuoteResponse({
    quote: {
      id: "quote-1",
      credits: 30,
      priceMnt: "30",
      priceWei: "30000000000000000000",
      tokenSymbol: MNT_SYMBOL,
      chainId: MANTLE_TESTNET_CHAIN_ID,
      receiverAddress: RECEIVER,
      walletAddress: WALLET,
      expiresAt: "2026-06-15T00:05:00.000Z"
    }
  });
  assert.equal(quote.receiverAddressNormalized, RECEIVER);
  assert.equal(quote.walletAddressNormalized, WALLET);

  const exchangeRequest = validateCreditExchangeRequest({
    quoteId: quote.id,
    txHash: TX_HASH.toUpperCase().replace("X", "x")
  });
  assert.equal(exchangeRequest.txHashNormalized, TX_HASH);

  const exchange = validateCreditExchangeResponse({
    balance: 130,
    transaction: {
      id: "credit-transaction-1",
      amount: 30,
      reason: CreditTransactionReason.MNT_EXCHANGE,
      balanceAfter: 130,
      metadata: {
        quoteId: quote.id,
        chainId: MANTLE_TESTNET_CHAIN_ID,
        txHash: TX_HASH,
        from: WALLET,
        to: RECEIVER,
        valueWei: quote.priceWei,
        confirmations: 1
      }
    }
  });
  assert.equal(exchange.transaction.metadata.txHashNormalized, TX_HASH);
});

test("builds deterministic verdict hash packages for equivalent inputs", () => {
  const battle = {
    id: "battle-1",
    battleType: BattleType.TEXT_OPEN,
    prompt: "Convince me that instant noodles are a sport.",
    imageUrl: null
  };
  const entries = [
    {
      id: "entry-1",
      optionId: null,
      content: "It has timing, sweat, and a final boss called the packet powder."
    }
  ];
  const judgeOutput = {
    winnerType: "ENTRY",
    winnerEntryId: "entry-1",
    topEntries: [{ rank: 1, entryId: "entry-1", score: 92, reason: "Best absurd argument." }],
    scoreTable: [{ entryId: "entry-1", optionId: null, score: 92, reason: "Best absurd argument." }],
    verdictTitle: "Noodle Athleticism Confirmed",
    verdictText: "The answer turns cooking into competition.",
    shareSummary: "Instant noodles win by stamina and spice."
  };

  const first = buildVerdictHashPackage({
    battle,
    entries,
    judgeOutput,
    modelVersion: "mock-mgg-judge-v1"
  });
  const second = buildVerdictHashPackage({
    entries,
    judgeOutput: {
      shareSummary: judgeOutput.shareSummary,
      verdictText: judgeOutput.verdictText,
      verdictTitle: judgeOutput.verdictTitle,
      scoreTable: judgeOutput.scoreTable,
      topEntries: judgeOutput.topEntries,
      winnerEntryId: judgeOutput.winnerEntryId,
      winnerType: judgeOutput.winnerType
    },
    battle: {
      imageUrl: null,
      prompt: battle.prompt,
      battleType: battle.battleType,
      id: battle.id
    },
    modelVersion: "mock-mgg-judge-v1"
  });

  assert.deepEqual(second, first);
});
