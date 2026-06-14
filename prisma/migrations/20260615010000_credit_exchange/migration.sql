CREATE TABLE "credit_quotes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "walletAddressNormalized" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "priceMnt" TEXT NOT NULL,
    "priceWei" TEXT NOT NULL,
    "tokenSymbol" TEXT NOT NULL DEFAULT 'MNT',
    "chainId" INTEGER NOT NULL,
    "receiverAddress" TEXT NOT NULL,
    "receiverAddressNormalized" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "txHash" TEXT,
    "creditTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_quotes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "credit_quotes_txHash_key" ON "credit_quotes"("txHash");
CREATE INDEX "credit_quotes_userId_idx" ON "credit_quotes"("userId");
CREATE INDEX "credit_quotes_walletAddressNormalized_idx" ON "credit_quotes"("walletAddressNormalized");
CREATE INDEX "credit_quotes_expiresAt_idx" ON "credit_quotes"("expiresAt");

ALTER TABLE "credit_quotes" ADD CONSTRAINT "credit_quotes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
