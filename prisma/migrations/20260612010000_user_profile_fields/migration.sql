ALTER TABLE "users" ADD COLUMN "nickname" TEXT;
ALTER TABLE "users" ADD COLUMN "intro" TEXT;
ALTER TABLE "users" ADD COLUMN "avatarUrl" TEXT;
ALTER TABLE "users" ADD COLUMN "walletAddress" TEXT;
ALTER TABLE "users" ADD COLUMN "walletProvider" TEXT;

CREATE UNIQUE INDEX "users_nickname_key" ON "users"("nickname");
