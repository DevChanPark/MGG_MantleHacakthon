ALTER TABLE "users" ADD COLUMN "walletAddressNormalized" TEXT;
ALTER TABLE "users" ADD COLUMN "creditBalance" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "battles" ADD COLUMN "title" TEXT;
ALTER TABLE "battles" ADD COLUMN "description" TEXT;
ALTER TABLE "battles" ADD COLUMN "deadlineAt" TIMESTAMP(3);
ALTER TABLE "battles" ADD COLUMN "isAnonymous" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "battles" ADD COLUMN "recommendedScore" INTEGER NOT NULL DEFAULT 50;

CREATE TABLE "wallet_challenges" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "walletAddress" TEXT NOT NULL,
    "walletAddressNormalized" TEXT NOT NULL,
    "walletProvider" TEXT,
    "nonce" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "wallet_challenges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "credit_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "social_comments" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "targetEntryId" TEXT,
    "authorUserId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "battle_participations" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "optionId" TEXT,
    "entryId" TEXT,
    "costCredits" INTEGER NOT NULL,
    "creditTransactionId" TEXT,
    "rewardClaimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "battle_participations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "entry_likes" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entry_likes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "battle_likes" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "battle_likes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "battle_shares" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "userId" TEXT,
    "channel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "battle_shares_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "battleId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_walletAddressNormalized_key" ON "users"("walletAddressNormalized");
CREATE INDEX "wallet_challenges_walletAddressNormalized_idx" ON "wallet_challenges"("walletAddressNormalized");
CREATE INDEX "wallet_challenges_expiresAt_idx" ON "wallet_challenges"("expiresAt");
CREATE INDEX "credit_transactions_userId_idx" ON "credit_transactions"("userId");
CREATE INDEX "social_comments_battleId_idx" ON "social_comments"("battleId");
CREATE INDEX "social_comments_targetEntryId_idx" ON "social_comments"("targetEntryId");
CREATE INDEX "social_comments_authorUserId_idx" ON "social_comments"("authorUserId");
CREATE UNIQUE INDEX "battle_participations_battleId_userId_key" ON "battle_participations"("battleId", "userId");
CREATE INDEX "battle_participations_userId_idx" ON "battle_participations"("userId");
CREATE INDEX "battle_participations_entryId_idx" ON "battle_participations"("entryId");
CREATE UNIQUE INDEX "entry_likes_entryId_userId_key" ON "entry_likes"("entryId", "userId");
CREATE INDEX "entry_likes_userId_idx" ON "entry_likes"("userId");
CREATE UNIQUE INDEX "battle_likes_battleId_userId_key" ON "battle_likes"("battleId", "userId");
CREATE INDEX "battle_likes_userId_idx" ON "battle_likes"("userId");
CREATE INDEX "battle_shares_battleId_idx" ON "battle_shares"("battleId");
CREATE INDEX "battle_shares_userId_idx" ON "battle_shares"("userId");
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");
CREATE INDEX "notifications_battleId_idx" ON "notifications"("battleId");

ALTER TABLE "wallet_challenges" ADD CONSTRAINT "wallet_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "social_comments" ADD CONSTRAINT "social_comments_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "social_comments" ADD CONSTRAINT "social_comments_targetEntryId_fkey" FOREIGN KEY ("targetEntryId") REFERENCES "entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "social_comments" ADD CONSTRAINT "social_comments_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "battle_participations" ADD CONSTRAINT "battle_participations_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "battle_participations" ADD CONSTRAINT "battle_participations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "battle_participations" ADD CONSTRAINT "battle_participations_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "battle_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "battle_participations" ADD CONSTRAINT "battle_participations_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "entry_likes" ADD CONSTRAINT "entry_likes_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "entry_likes" ADD CONSTRAINT "entry_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "battle_likes" ADD CONSTRAINT "battle_likes_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "battle_likes" ADD CONSTRAINT "battle_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "battle_shares" ADD CONSTRAINT "battle_shares_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "battle_shares" ADD CONSTRAINT "battle_shares_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
