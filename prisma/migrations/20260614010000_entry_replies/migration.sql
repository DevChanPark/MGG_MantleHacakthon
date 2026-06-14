ALTER TABLE "entries" ADD COLUMN "parentEntryId" TEXT;

CREATE INDEX "entries_parentEntryId_idx" ON "entries"("parentEntryId");

ALTER TABLE "entries" ADD CONSTRAINT "entries_parentEntryId_fkey" FOREIGN KEY ("parentEntryId") REFERENCES "entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
