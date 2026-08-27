-- AlterEnum
ALTER TYPE "QuoteStatus" ADD VALUE IF NOT EXISTS 'DISPATCHING';

-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'QUOTE_DISPATCHED';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'CUSTOMER_RESPONSE';

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN "paymentTerms" TEXT,
ADD COLUMN "dispatchSla" TEXT,
ADD COLUMN "snapshot" JSONB,
ADD COLUMN "accessToken" TEXT,
ADD COLUMN "dispatchReqAt" TIMESTAMP(3),
ADD COLUMN "sentAt" TIMESTAMP(3),
ADD COLUMN "expiresAt" TIMESTAMP(3),
ADD COLUMN "acceptedAt" TIMESTAMP(3),
ADD COLUMN "rejectedAt" TIMESTAMP(3),
ADD COLUMN "rejectionReason" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Quote_accessToken_key" ON "Quote"("accessToken");

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "OutboxEmail" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT,
    "to" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "html" TEXT,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutboxEmail_status_createdAt_idx" ON "OutboxEmail"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OutboxEmail_quoteId_idx" ON "OutboxEmail"("quoteId");

-- AddForeignKey
ALTER TABLE "OutboxEmail" ADD CONSTRAINT "OutboxEmail_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
