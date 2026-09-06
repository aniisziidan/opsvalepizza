-- Audit coverage for freeform landed-cost calculations
ALTER TYPE "PricingEntityType" ADD VALUE 'LANDED_COST_CALC';

-- CreateTable
CREATE TABLE "LandedCostCalc" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "boxConfigId" TEXT NOT NULL,
    "shipmentQty" INTEGER NOT NULL,
    "lines" JSONB NOT NULL,
    "shipmentMinEur" DECIMAL(12,2) NOT NULL,
    "shipmentMaxEur" DECIMAL(12,2) NOT NULL,
    "perBoxMinEur" DECIMAL(10,4) NOT NULL,
    "perBoxMaxEur" DECIMAL(10,4) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandedCostCalc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LandedCostCalc_groupId_idx" ON "LandedCostCalc"("groupId");

-- CreateIndex
CREATE INDEX "LandedCostCalc_countryId_idx" ON "LandedCostCalc"("countryId");

-- CreateIndex
CREATE INDEX "LandedCostCalc_boxConfigId_idx" ON "LandedCostCalc"("boxConfigId");

-- CreateIndex
CREATE INDEX "LandedCostCalc_active_idx" ON "LandedCostCalc"("active");

-- AddForeignKey
ALTER TABLE "LandedCostCalc" ADD CONSTRAINT "LandedCostCalc_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandedCostCalc" ADD CONSTRAINT "LandedCostCalc_boxConfigId_fkey" FOREIGN KEY ("boxConfigId") REFERENCES "BoxConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandedCostCalc" ADD CONSTRAINT "LandedCostCalc_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
