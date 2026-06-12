-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battles" (
    "id" TEXT NOT NULL,
    "battleType" VARCHAR(32) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    "prompt" TEXT,
    "imageUrl" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "judgingStartedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "battles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battle_options" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "battle_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entries" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "optionId" TEXT,
    "content" TEXT NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "judging_rules" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "rulesJson" JSONB NOT NULL,
    "rulesHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "judging_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verdicts" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "judgeOutput" JSONB NOT NULL,
    "hashPackage" JSONB NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verdicts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlements" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "explorerUrl" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "optionsHash" TEXT,
    "entriesRoot" TEXT NOT NULL,
    "rulesHash" TEXT NOT NULL,
    "modelVersionHash" TEXT NOT NULL,
    "winnerHash" TEXT NOT NULL,
    "mvpEntryHash" TEXT,
    "verdictHash" TEXT NOT NULL,
    "settledAt" TIMESTAMP(3) NOT NULL,
    "payloadJson" JSONB NOT NULL,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "targetEntryId" TEXT,
    "reason" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "battles_battleType_idx" ON "battles"("battleType");

-- CreateIndex
CREATE INDEX "battles_status_idx" ON "battles"("status");

-- CreateIndex
CREATE INDEX "battle_options_battleId_idx" ON "battle_options"("battleId");

-- CreateIndex
CREATE INDEX "entries_battleId_idx" ON "entries"("battleId");

-- CreateIndex
CREATE INDEX "entries_optionId_idx" ON "entries"("optionId");

-- CreateIndex
CREATE INDEX "judging_rules_battleId_idx" ON "judging_rules"("battleId");

-- CreateIndex
CREATE UNIQUE INDEX "verdicts_battleId_key" ON "verdicts"("battleId");

-- CreateIndex
CREATE UNIQUE INDEX "settlements_battleId_key" ON "settlements"("battleId");

-- CreateIndex
CREATE INDEX "settlements_chainId_idx" ON "settlements"("chainId");

-- CreateIndex
CREATE INDEX "settlements_txHash_idx" ON "settlements"("txHash");

-- CreateIndex
CREATE INDEX "reports_battleId_idx" ON "reports"("battleId");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- AddForeignKey
ALTER TABLE "battles" ADD CONSTRAINT "battles_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_options" ADD CONSTRAINT "battle_options_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "battle_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "judging_rules" ADD CONSTRAINT "judging_rules_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verdicts" ADD CONSTRAINT "verdicts_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
