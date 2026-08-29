-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'SALES', 'PRICING', 'VIEWER');

-- CreateEnum
CREATE TYPE "Material" AS ENUM ('KRAFT', 'WHITE');

-- CreateEnum
CREATE TYPE "PrintType" AS ENUM ('PLAIN', 'PRINTED');

-- CreateEnum
CREATE TYPE "RuleScope" AS ENUM ('GLOBAL', 'COUNTRY', 'PRODUCT');

-- CreateEnum
CREATE TYPE "CostSource" AS ENUM ('MANUAL', 'DYNAMIC');

-- CreateEnum
CREATE TYPE "PricingEntityType" AS ENUM ('LANDED_COST', 'PRICING_RULE', 'PUBLIC_PRICE_RANGE');

-- CreateEnum
CREATE TYPE "PricingAuditAction" AS ENUM ('CREATE', 'VERSION_UPDATE', 'TOGGLE_ACTIVE', 'RETIRE');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('TEMPORARY', 'ATTACHED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'REVIEWING', 'NEED_MORE_INFO', 'QUOTE_PREPARED', 'QUOTE_SENT', 'NEGOTIATING', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "BoxSpecType" AS ENUM ('STANDARD', 'CUSTOM');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'DISPATCHING', 'SENT', 'ACCEPTED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('NOTE', 'STATUS_CHANGE', 'QUOTE_CREATED', 'QUOTE_REVISED', 'QUOTE_DISPATCHED', 'CUSTOMER_RESPONSE', 'FILE_UPLOAD', 'SUBMISSION', 'EMAIL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AdminAuditAction" AS ENUM ('ADMIN_CREATED', 'ADMIN_ROLE_CHANGED', 'ADMIN_ACTIVATED', 'ADMIN_DEACTIVATED', 'ADMIN_PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CUSTOMER_REPLY_RECEIVED', 'QUOTE_REQUEST_RECEIVED', 'PROPOSAL_ACCEPTED', 'PROPOSAL_REJECTED', 'PROPOSAL_EXPIRING', 'PROPOSAL_EXPIRED', 'DOCUMENT_UPLOADED', 'PRICING_IMPORT_COMPLETED', 'PRICING_IMPORT_FAILED', 'PRICING_VERSION_CONFLICT', 'LOGISTICS_CONFIGURATION_ALERT', 'SYSTEM_HEALTH_ALERT', 'DATABASE_UNAVAILABLE', 'BACKUP_FAILED', 'EMAIL_DELIVERY_FAILED', 'PDF_GENERATION_FAILED', 'SYSTEM_RECOVERED', 'ANALYTICS_TRAFFIC_ANOMALY', 'ANALYTICS_CONVERSION_DROP', 'ANALYTICS_TRAFFIC_OPPORTUNITY');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('CUSTOMER_ACTIVITY', 'PROPOSAL', 'QUOTE', 'PRICING', 'LOGISTICS', 'SYSTEM', 'SECURITY', 'ANALYTICS');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('CRITICAL', 'HIGH', 'NORMAL', 'LOW');

-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('PAGE_VIEW', 'SESSION_START', 'CALCULATOR_OPENED', 'CALCULATOR_USED', 'CALCULATOR_COMPLETED', 'QUOTE_PAGE_OPENED', 'QUOTE_REQUEST_STARTED', 'QUOTE_REQUEST_SUBMITTED', 'PRODUCT_VIEWED', 'CTA_CLICKED', 'PROPOSAL_PAGE_VIEWED', 'PROPOSAL_ACCEPTED', 'FILE_DOWNLOAD');

-- CreateEnum
CREATE TYPE "TrafficSourceType" AS ENUM ('DIRECT', 'ORGANIC_SEARCH', 'REFERRAL', 'SOCIAL', 'PAID', 'OTHER');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('DESKTOP', 'MOBILE', 'TABLET');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SUPER_ADMIN',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoxConfig" (
    "id" TEXT NOT NULL,
    "sizeLabel" TEXT NOT NULL,
    "lengthMm" INTEGER,
    "widthMm" INTEGER,
    "heightMm" INTEGER,
    "material" "Material" NOT NULL,
    "print" "PrintType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BoxConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "scope" "RuleScope" NOT NULL,
    "countryId" TEXT,
    "boxConfigId" TEXT,
    "markupMin" DECIMAL(4,3) NOT NULL,
    "markupMax" DECIMAL(4,3) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandedCost" (
    "id" TEXT NOT NULL,
    "boxConfigId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "qtyTierMin" INTEGER NOT NULL,
    "qtyTierMax" INTEGER,
    "costEur" DECIMAL(10,4) NOT NULL,
    "source" "CostSource" NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LandedCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicPriceRange" (
    "id" TEXT NOT NULL,
    "boxConfigId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "minEur" DECIMAL(10,4) NOT NULL,
    "maxEur" DECIMAL(10,4) NOT NULL,
    "isManualOverride" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PublicPriceRange_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "LogisticsCost" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "route" TEXT,
    "port" TEXT,
    "shipMethod" TEXT,
    "freightEur" DECIMAL(10,4),
    "inlandEur" DECIMAL(10,4),
    "otherEur" DECIMAL(10,4),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LogisticsCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL DEFAULT '',
    "website" TEXT,
    "normalizedWebsiteDomain" TEXT,
    "countryCode" TEXT,
    "branchCount" INTEGER,
    "branchRange" TEXT,
    "branchCountMin" INTEGER,
    "branchCountMax" INTEGER,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "jobTitle" TEXT,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadSequence" (
    "year" INTEGER NOT NULL,
    "currentNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LeadSequence_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "TemporaryUpload" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" "UploadStatus" NOT NULL DEFAULT 'TEMPORARY',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemporaryUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "companyId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "source" TEXT NOT NULL DEFAULT 'quote',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalculatorSnapshot" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "boxSize" TEXT NOT NULL,
    "material" "Material" NOT NULL,
    "print" "PrintType" NOT NULL,
    "boxesPerOrder" INTEGER NOT NULL,
    "monthlyVolume" INTEGER NOT NULL,
    "currentPrice" DECIMAL(10,4) NOT NULL,
    "landedCostEur" DECIMAL(10,4),
    "markupMin" DECIMAL(4,3),
    "markupMax" DECIMAL(4,3),
    "estMinEur" DECIMAL(10,4) NOT NULL,
    "estMaxEur" DECIMAL(10,4) NOT NULL,
    "estYearlySavings" DECIMAL(12,2) NOT NULL,
    "estYearlySavingsMin" DECIMAL(12,2),
    "estYearlySavingsMax" DECIMAL(12,2),
    "landedCostId" TEXT,
    "markupRuleId" TEXT,
    "publicPriceRangeId" TEXT,
    "pricingVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalculatorSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteRequest" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "boxSpecificationType" "BoxSpecType" NOT NULL DEFAULT 'STANDARD',
    "standardBoxSize" TEXT,
    "lengthMm" INTEGER NOT NULL,
    "widthMm" INTEGER NOT NULL,
    "heightMm" INTEGER NOT NULL,
    "material" "Material" NOT NULL,
    "print" "PrintType" NOT NULL,
    "customFlute" TEXT,
    "monthlyVolume" INTEGER NOT NULL DEFAULT 0,
    "qtyPerOrder" INTEGER NOT NULL,
    "deliveryCountryCode" TEXT NOT NULL,
    "deliveryCity" TEXT NOT NULL,
    "deliveryFrequency" TEXT,
    "hasLoadingDock" BOOLEAN NOT NULL DEFAULT false,
    "deliveryAccessNotes" TEXT,
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "unitPriceEur" DECIMAL(10,4) NOT NULL,
    "qty" INTEGER NOT NULL,
    "specs" TEXT,
    "notes" TEXT,
    "paymentTerms" TEXT,
    "dispatchSla" TEXT,
    "snapshot" JSONB,
    "accessToken" TEXT,
    "dispatchReqAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "LeadActivity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "authorId" TEXT,
    "type" "ActivityType" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoredFile" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "quoteRequestId" TEXT,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorAdminId" TEXT NOT NULL,
    "targetAdminId" TEXT NOT NULL,
    "action" "AdminAuditAction" NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" "NotificationType" NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "actionUrl" TEXT,
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "inApp" BOOLEAN NOT NULL DEFAULT true,
    "browserPush" BOOLEAN NOT NULL DEFAULT true,
    "email" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemIncident" (
    "id" TEXT NOT NULL,
    "incidentKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "lastAlertAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "count" INTEGER NOT NULL DEFAULT 1,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visitor" (
    "id" TEXT NOT NULL,
    "anonymousId" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "countryCode" TEXT,
    "locale" TEXT,
    "totalVisits" INTEGER NOT NULL DEFAULT 1,
    "quoteSubmitted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitorSession" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "pageViewsCount" INTEGER NOT NULL DEFAULT 1,
    "entryPath" TEXT NOT NULL,
    "exitPath" TEXT,
    "countryCode" TEXT,
    "countryName" TEXT,
    "locale" TEXT,
    "trafficSource" "TrafficSourceType" NOT NULL DEFAULT 'DIRECT',
    "referrerDomain" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "deviceType" "DeviceType" NOT NULL DEFAULT 'DESKTOP',
    "browser" TEXT,
    "os" TEXT,
    "isBounce" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "VisitorSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT,
    "sessionId" TEXT,
    "eventType" "AnalyticsEventType" NOT NULL,
    "path" TEXT NOT NULL,
    "canonicalPath" TEXT NOT NULL,
    "locale" TEXT,
    "countryCode" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");

-- CreateIndex
CREATE INDEX "City_countryId_idx" ON "City"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "BoxConfig_sizeLabel_material_print_key" ON "BoxConfig"("sizeLabel", "material", "print");

-- CreateIndex
CREATE INDEX "PricingRule_countryId_idx" ON "PricingRule"("countryId");

-- CreateIndex
CREATE INDEX "PricingRule_boxConfigId_idx" ON "PricingRule"("boxConfigId");

-- CreateIndex
CREATE INDEX "LandedCost_countryId_idx" ON "LandedCost"("countryId");

-- CreateIndex
CREATE INDEX "LandedCost_boxConfigId_idx" ON "LandedCost"("boxConfigId");

-- CreateIndex
CREATE INDEX "PublicPriceRange_boxConfigId_countryId_active_idx" ON "PublicPriceRange"("boxConfigId", "countryId", "active");

-- CreateIndex
CREATE INDEX "PublicPriceRange_countryId_idx" ON "PublicPriceRange"("countryId");

-- CreateIndex
CREATE INDEX "PricingAuditLog_entityType_entityId_idx" ON "PricingAuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "PricingAuditLog_authorId_idx" ON "PricingAuditLog"("authorId");

-- CreateIndex
CREATE INDEX "PricingAuditLog_createdAt_idx" ON "PricingAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "LogisticsCost_countryId_idx" ON "LogisticsCost"("countryId");

-- CreateIndex
CREATE INDEX "Company_normalizedWebsiteDomain_idx" ON "Company"("normalizedWebsiteDomain");

-- CreateIndex
CREATE INDEX "Company_normalizedName_countryCode_idx" ON "Company"("normalizedName", "countryCode");

-- CreateIndex
CREATE INDEX "Contact_companyId_idx" ON "Contact"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "TemporaryUpload_token_key" ON "TemporaryUpload"("token");

-- CreateIndex
CREATE UNIQUE INDEX "TemporaryUpload_storageKey_key" ON "TemporaryUpload"("storageKey");

-- CreateIndex
CREATE INDEX "TemporaryUpload_status_expiresAt_idx" ON "TemporaryUpload"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_code_key" ON "Lead"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_idempotencyKey_key" ON "Lead"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_companyId_idx" ON "Lead"("companyId");

-- CreateIndex
CREATE INDEX "Lead_contactId_idx" ON "Lead"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "CalculatorSnapshot_leadId_key" ON "CalculatorSnapshot"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteRequest_leadId_key" ON "QuoteRequest"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_accessToken_key" ON "Quote"("accessToken");

-- CreateIndex
CREATE INDEX "Quote_leadId_idx" ON "Quote"("leadId");

-- CreateIndex
CREATE INDEX "Quote_accessToken_idx" ON "Quote"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_leadId_revision_key" ON "Quote"("leadId", "revision");

-- CreateIndex
CREATE INDEX "OutboxEmail_status_createdAt_idx" ON "OutboxEmail"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OutboxEmail_quoteId_idx" ON "OutboxEmail"("quoteId");

-- CreateIndex
CREATE INDEX "LeadActivity_leadId_idx" ON "LeadActivity"("leadId");

-- CreateIndex
CREATE INDEX "LeadActivity_authorId_idx" ON "LeadActivity"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "StoredFile_storageKey_key" ON "StoredFile"("storageKey");

-- CreateIndex
CREATE INDEX "StoredFile_leadId_idx" ON "StoredFile"("leadId");

-- CreateIndex
CREATE INDEX "StoredFile_quoteRequestId_idx" ON "StoredFile"("quoteRequestId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_targetAdminId_idx" ON "AdminAuditLog"("targetAdminId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_actorAdminId_idx" ON "AdminAuditLog"("actorAdminId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_category_priority_idx" ON "Notification"("category", "priority");

-- CreateIndex
CREATE INDEX "Notification_entityType_entityId_idx" ON "Notification"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_category_key" ON "NotificationPreference"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemIncident_incidentKey_key" ON "SystemIncident"("incidentKey");

-- CreateIndex
CREATE INDEX "SystemIncident_incidentKey_resolved_idx" ON "SystemIncident"("incidentKey", "resolved");

-- CreateIndex
CREATE UNIQUE INDEX "Visitor_anonymousId_key" ON "Visitor"("anonymousId");

-- CreateIndex
CREATE INDEX "Visitor_lastSeenAt_idx" ON "Visitor"("lastSeenAt");

-- CreateIndex
CREATE INDEX "Visitor_countryCode_idx" ON "Visitor"("countryCode");

-- CreateIndex
CREATE INDEX "Visitor_firstSeenAt_idx" ON "Visitor"("firstSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "VisitorSession_sessionToken_key" ON "VisitorSession"("sessionToken");

-- CreateIndex
CREATE INDEX "VisitorSession_startedAt_idx" ON "VisitorSession"("startedAt");

-- CreateIndex
CREATE INDEX "VisitorSession_lastActivityAt_idx" ON "VisitorSession"("lastActivityAt");

-- CreateIndex
CREATE INDEX "VisitorSession_countryCode_startedAt_idx" ON "VisitorSession"("countryCode", "startedAt");

-- CreateIndex
CREATE INDEX "VisitorSession_trafficSource_startedAt_idx" ON "VisitorSession"("trafficSource", "startedAt");

-- CreateIndex
CREATE INDEX "VisitorSession_visitorId_startedAt_idx" ON "VisitorSession"("visitorId", "startedAt");

-- CreateIndex
CREATE INDEX "VisitorSession_utmCampaign_startedAt_idx" ON "VisitorSession"("utmCampaign", "startedAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventType_createdAt_idx" ON "AnalyticsEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_canonicalPath_createdAt_idx" ON "AnalyticsEvent"("canonicalPath", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_countryCode_createdAt_idx" ON "AnalyticsEvent"("countryCode", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_visitorId_createdAt_idx" ON "AnalyticsEvent"("visitorId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_sessionId_createdAt_idx" ON "AnalyticsEvent"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_boxConfigId_fkey" FOREIGN KEY ("boxConfigId") REFERENCES "BoxConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandedCost" ADD CONSTRAINT "LandedCost_boxConfigId_fkey" FOREIGN KEY ("boxConfigId") REFERENCES "BoxConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandedCost" ADD CONSTRAINT "LandedCost_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingAuditLog" ADD CONSTRAINT "PricingAuditLog_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticsCost" ADD CONSTRAINT "LogisticsCost_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalculatorSnapshot" ADD CONSTRAINT "CalculatorSnapshot_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboxEmail" ADD CONSTRAINT "OutboxEmail_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoredFile" ADD CONSTRAINT "StoredFile_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoredFile" ADD CONSTRAINT "StoredFile_quoteRequestId_fkey" FOREIGN KEY ("quoteRequestId") REFERENCES "QuoteRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_actorAdminId_fkey" FOREIGN KEY ("actorAdminId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_targetAdminId_fkey" FOREIGN KEY ("targetAdminId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorSession" ADD CONSTRAINT "VisitorSession_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "Visitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "Visitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VisitorSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

