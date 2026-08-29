-- CalculatorSnapshot: freeze the product-vs-logistics breakdown
ALTER TABLE "CalculatorSnapshot"
  ADD COLUMN "productCostEur" DECIMAL(10,4),
  ADD COLUMN "logisticsCostId" TEXT,
  ADD COLUMN "logisticsCorridorName" TEXT,
  ADD COLUMN "freightEur" DECIMAL(10,4),
  ADD COLUMN "inlandEur" DECIMAL(10,4),
  ADD COLUMN "otherEur" DECIMAL(10,4),
  ADD COLUMN "logisticsTotalEur" DECIMAL(10,4),
  ADD COLUMN "effectiveLandedEur" DECIMAL(10,4);

-- Quote: internal-only pricing snapshot (never shown to customers)
ALTER TABLE "Quote" ADD COLUMN "pricingSnapshot" JSONB;

-- Audit coverage for logistics corridor edits
ALTER TYPE "PricingEntityType" ADD VALUE 'LOGISTICS_COST';

-- Normalize any pre-existing multiple active corridors: keep one per country
UPDATE "LogisticsCost" l SET "active" = false
WHERE l."active" = true
  AND l."id" <> (
    SELECT l2."id" FROM "LogisticsCost" l2
    WHERE l2."countryId" = l."countryId" AND l2."active" = true
    ORDER BY l2."id" DESC LIMIT 1
  );

-- Enforce one active corridor per country at the database level
CREATE UNIQUE INDEX "LogisticsCost_active_country_unique"
  ON "LogisticsCost"("countryId") WHERE "active" = true;
