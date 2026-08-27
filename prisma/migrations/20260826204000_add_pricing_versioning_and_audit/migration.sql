-- AlterTable
ALTER TABLE "LandedCost" ADD COLUMN "effectiveTo" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PricingRule" ADD COLUMN "effectiveTo" TIMESTAMP(3);

-- DropIndex
DROP INDEX IF EXISTS "PublicPriceRange_boxConfigId_countryId_key";

-- AlterTable
ALTER TABLE "PublicPriceRange" ADD COLUMN "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "effectiveTo" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PublicPriceRange_boxConfigId_countryId_active_idx" ON "PublicPriceRange"("boxConfigId", "countryId", "active");

-- CreateEnum
CREATE TYPE "PricingEntityType" AS ENUM ('LANDED_COST', 'PRICING_RULE', 'PUBLIC_PRICE_RANGE');

-- CreateEnum
CREATE TYPE "PricingAuditAction" AS ENUM ('CREATE', 'VERSION_UPDATE', 'TOGGLE_ACTIVE', 'RETIRE');

-- CreateTable
CREATE TABLE "PricingAuditLog" (
    "id" TEXT NOT NULL,
    "authorId" TEXT,
    "entityType" "PricingEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "PricingAuditAction" NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PricingAuditLog_entityType_entityId_idx" ON "PricingAuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "PricingAuditLog_authorId_idx" ON "PricingAuditLog"("authorId");

-- CreateIndex
CREATE INDEX "PricingAuditLog_createdAt_idx" ON "PricingAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "PricingAuditLog" ADD CONSTRAINT "PricingAuditLog_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
