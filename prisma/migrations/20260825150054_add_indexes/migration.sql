-- CreateIndex
CREATE INDEX "City_countryId_idx" ON "City"("countryId");

-- CreateIndex
CREATE INDEX "Contact_companyId_idx" ON "Contact"("companyId");

-- CreateIndex
CREATE INDEX "LandedCost_countryId_idx" ON "LandedCost"("countryId");

-- CreateIndex
CREATE INDEX "LandedCost_boxConfigId_idx" ON "LandedCost"("boxConfigId");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_companyId_idx" ON "Lead"("companyId");

-- CreateIndex
CREATE INDEX "Lead_contactId_idx" ON "Lead"("contactId");

-- CreateIndex
CREATE INDEX "LeadActivity_leadId_idx" ON "LeadActivity"("leadId");

-- CreateIndex
CREATE INDEX "LeadActivity_authorId_idx" ON "LeadActivity"("authorId");

-- CreateIndex
CREATE INDEX "LogisticsCost_countryId_idx" ON "LogisticsCost"("countryId");

-- CreateIndex
CREATE INDEX "PricingRule_countryId_idx" ON "PricingRule"("countryId");

-- CreateIndex
CREATE INDEX "PricingRule_boxConfigId_idx" ON "PricingRule"("boxConfigId");

-- CreateIndex
CREATE INDEX "PublicPriceRange_countryId_idx" ON "PublicPriceRange"("countryId");

-- CreateIndex
CREATE INDEX "Quote_leadId_idx" ON "Quote"("leadId");

-- CreateIndex
CREATE INDEX "StoredFile_leadId_idx" ON "StoredFile"("leadId");
