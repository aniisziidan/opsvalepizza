# OpsVale Platform — Master Browser E2E Test Plan & Route Inventory

**Document Version:** 1.0.0  
**Author:** Senior QA Automation Engineer & Adversarial E2E Lead  
**Target Repository:** `aniisziidan/opsvalepizza`  
**Execution Environment:** Next.js 15 App Router, React 19, Chromium Browser Automation, Playwright Test Suite, Vitest Commercial Lifecycle Runner  

---

## 1. System Discovery & Complete Inventory

### 1.1 Public Localized Routes & Workflows
Supported Locales: `/en` (English - default), `/de` (German), `/fr` (French), `/it` (Italian), `/es` (Spanish).

| Path | Purpose | Key Interactive Elements | Access Level |
|---|---|---|---|
| `/[locale]` | Homepage & Industrial Value Proposition | Hero video, Quick Calculator widget, Pillar cards, CTA links, Language dropdown, Hamburger drawer | Public (Anonymous) |
| `/[locale]/products` | Wholesale Product Catalog | Box dimension tabs (28cm, 32cm, 40cm), Material/Print selector, MOQ matrix, "Request Quote" CTAs | Public (Anonymous) |
| `/[locale]/how-it-works` | 4-Stage Procurement Workflow | Step-by-step corridor explanation, SLA timelines, CTA button | Public (Anonymous) |
| `/[locale]/about` | Company Background & European Corridors | Supply chain credentials, FSC certification banner, SLA metric grid | Public (Anonymous) |
| `/[locale]/calculator` | Precision Multi-Variable Savings Calculator | 3-step interactive form (Box size, material, print, volume slider, current price input), dynamic savings cards, CTA route to quote | Public (Anonymous) |
| `/[locale]/quote` | 4-Step B2B Request for Quote (RFQ) Wizard | Step 1 (Box spec & dimensions), Step 2 (Volume & destination), Step 3 (Company & contact dossier), Step 4 (Review, file upload, & submission) | Public (Anonymous) |
| `/[locale]/cookies` | Cookie Policy & Transparency Statement | Granular cookie category explanations, "Change Preferences" button | Public (Anonymous) |
| `/[locale]/terms` | Wholesale Commercial Terms of Service | Jurisdiction, delivery tolerances, payment terms, Incoterms 2020 | Public (Anonymous) |
| `/[locale]/privacy` | GDPR / ePrivacy Policy | Data controller details, retention periods, telemetry opt-in disclosures | Public (Anonymous) |
| `/[locale]/imprint` | Statutory Impressum / Legal Notice | Verified company registry, VAT IDs, European HQ address | Public (Anonymous) |

### 1.2 Proposal Token Workflows (Direct Route)
| Path | Purpose | Key Interactive Elements | Access Level |
|---|---|---|---|
| `/proposals/[token]` | Interactive Customer Commercial Proposal | Live quotation dossier, unit price & total commitment, SLA terms, "Accept Proposal", "Request Modification", "Decline" modals, PDF Download | Token Gated (Direct Link) |
| `/api/proposals/[token]/pdf` | Signed / Dispatched Proposal PDF Stream | High-resolution binary PDF generation with localized headers | Token Gated (Direct Link) |

### 1.3 Protected Administrative ERP Routes (English-Only Internal Platform)
All `/admin/**` routes are protected via NextAuth JWT edge middleware and live database activation verification.

| Path | Purpose | Key Interactive Elements | Access Level |
|---|---|---|---|
| `/admin/login` | Operator Authentication Portal | Email input, password input, "Sign In" button, error alerts | Public (Unauthenticated) |
| `/admin/dashboard` | Executive Operations Dashboard | Bento KPI cards, 8-status pipeline distribution grid, live lead activity feed | Authenticated (`VIEWER`+) |
| `/admin/visitors` | Privacy-Aware Visitor Intelligence | Date presets, SVG timeline traffic chart, channel conversion matrix, CSV export modal | Authenticated (`VIEWER`+) |
| `/admin/analytics` | Commercial Funnel & Velocity Telemetry | Win rate metrics, territory demand charts, deal velocity, CSV/JSON export | Authenticated (`VIEWER`+) |
| `/admin/leads` | Lead Directory & Inbound Inquiries | Real-time search, status filter chips, lead data table, "+ New Lead" button | Authenticated (`SALES`+) |
| `/admin/leads/[id]` | Account Dossier & Quotation Builder | Lead dossier, quote builder (pricing engine lookup, margin slider, payment terms), revision history, quick email modal | Authenticated (`SALES`+) |
| `/admin/quotes` | Proposals & Supply Contracts Directory | Quote table, revision numbers, customer status badges, copy token link | Authenticated (`SALES`+) |
| `/admin/pricing` | Commercial Landed Cost & Markup Matrix | Landed cost tiers, 3-tier markup hierarchy (15%-45% margin governance), public overrides, audit log, bulk Excel import diff modal | Authenticated (`PRICING`+) |
| `/admin/logistics` | European Freight Corridors & Hubs | Corridor cards (Rotterdam, Antwerp, Hamburg), freight/inland/other rates, active corridor toggles, Add/Edit modal | Authenticated (`PRICING`+) |
| `/admin/notifications` | Real-Time Notification & Activity Center | Category filter tabs, priority indicators, "Mark All as Read", deep link actions | Authenticated (`VIEWER`+) |
| `/admin/settings` | Access Governance & Platform Diagnostics | Administrator management table, Create/Edit/Reset password modals, browser push notifications, role permission matrix | Authenticated (`SUPER_ADMIN`) |

---

## 2. Master Test Case Matrix (24 Suites)

### Suite 1: Public Website & Navigation

#### Test ID: E2E-PUB-001
- **Test Suite**: Public Website & Navigation
- **Feature / Module**: Homepage Hero & Navigation Shell
- **User Role**: Anonymous Visitor
- **Priority**: P0 — Critical
- **Test Type**: Happy Path / Responsive
- **Preconditions**: Next.js application server running at `http://localhost:3000`.
- **Test Data**: Default root URL `/`.
- **Starting URL**: `http://localhost:3000/`
- **Steps**:
  1. Navigate to `http://localhost:3000/`.
  2. Observe URL redirection.
  3. Verify visibility of top navigation bar, brand logo, hero headline, background video, quick calculator widget, and pillars section.
  4. Test navigation links: Click "Products", "How It Works", "Savings Calculator", "About".
- **Expected Result**: Visiting `/` automatically redirects to `http://localhost:3000/en` with full localized navigation and layout rendered. All links navigate smoothly without page errors.
- **Browser Assertions**: URL matches `/en`, `h1` contains "High-Volume Pizza Box Sourcing & Supply for European Chains", brand logo is visible, HTTP status 200.
- **Database / State Assertions**: Anonymous telemetry session initialized if consented.
- **Edge Cases**: Direct navigation to `/` with query parameters (e.g. `/?utm_source=test`) preserves query parameters on `/en?utm_source=test`.
- **Status**: PASS

#### Test ID: E2E-PUB-002
- **Test Suite**: Public Website & Navigation
- **Feature / Module**: Mobile Hamburger Drawer Navigation
- **User Role**: Anonymous Visitor on Mobile Viewport
- **Priority**: P0 — Critical
- **Test Type**: Responsive / Usability
- **Preconditions**: Viewport set to 375x812 (iPhone).
- **Test Data**: None.
- **Starting URL**: `http://localhost:3000/en`
- **Steps**:
  1. Resize browser to 375px width.
  2. Verify desktop horizontal link strip is hidden and hamburger button is visible.
  3. Click hamburger menu button.
  4. Verify slide-down drawer appears with links ("Home", "Products", "How It Works", "Savings Calculator", "About", "Request an Exact Quote").
  5. Click "Products" link inside the drawer.
- **Expected Result**: Drawer opens cleanly, clicking a navigation link closes the drawer and navigates to `/en/products`. No horizontal scrolling on the page.
- **Browser Assertions**: Drawer element visible, URL updates to `/en/products`, body `scrollWidth <= innerWidth`.
- **Database / State Assertions**: None.
- **Edge Cases**: Rapid open/close clicks; clicking outside drawer; hitting `Escape` key.
- **Status**: PASS

---

### Suite 2: Internationalization & Locale Routing

#### Test ID: E2E-I18N-001
- **Test Suite**: Internationalization & Locale Routing
- **Feature / Module**: Multi-Language Deep-Parity Switching
- **User Role**: Anonymous Visitor
- **Priority**: P0 — Critical
- **Test Type**: Happy Path / Localization
- **Preconditions**: Starting on English locale `/en`.
- **Test Data**: Locales `de`, `fr`, `it`, `es`.
- **Starting URL**: `http://localhost:3000/en`
- **Steps**:
  1. Click language selector in top navbar.
  2. Select "Deutsch" (`/de`).
  3. Verify German headline: "Europäische Großserien-Lieferung von Pizzakartons".
  4. Select "Français" (`/fr`).
  5. Verify French headline: "Fourniture Industrielle de Boîtes à Pizza pour Réseaux Européens".
  6. Select "Italiano" (`/it`).
  7. Verify Italian headline: "Fornitura all'Ingrosso di Scatole Pizza per Catene Europee".
  8. Select "Español" (`/es`).
  9. Verify Spanish headline: "Suministro Mayorista de Cajas de Pizza para Cadenas Europeas".
- **Expected Result**: URL updates to `/[locale]`, dictionaries render correctly without untranslated raw keys, `NEXT_LOCALE` cookie is updated.
- **Browser Assertions**: `document.documentElement.lang` matches selected locale, `h1` matches localized dictionary string, zero missing key fallbacks.
- **Database / State Assertions**: None.
- **Edge Cases**: Direct access to invalid locale `/xx/products` redirects to `/en/products`.
- **Status**: PASS

---

### Suite 3: Cookie Consent & Privacy Choice

#### Test ID: E2E-GDPR-001
- **Test Suite**: Cookie Consent & Tracking
- **Feature / Module**: GDPR / ePrivacy Floating Banner & Granular Preferences
- **User Role**: First-time Anonymous Visitor
- **Priority**: P0 — Critical
- **Test Type**: Security / Compliance / State Management
- **Preconditions**: Fresh browser session without `opsvale_consent` cookie.
- **Test Data**: None.
- **Starting URL**: `http://localhost:3000/en`
- **Steps**:
  1. Load homepage with cleared cookies.
  2. Verify floating banner "Cookie Preferences & Privacy Choice" is displayed at the bottom.
  3. Click "Customize" button.
  4. Verify modal opens with categories: Necessary (locked/required), Preferences, Analytics, Marketing.
  5. Toggle "Analytics" to ON and leave "Marketing" OFF.
  6. Click "Save Preferences".
- **Expected Result**: Banner and modal close immediately. `opsvale_consent` cookie is set to `{"necessary":true,"preferences":false,"analytics":true,"marketing":false,"version":1}`.
- **Browser Assertions**: Banner is no longer visible; cookie present with valid JSON structure and `SameSite=Lax`.
- **Database / State Assertions**: Analytics events permitted for `analytics`; marketing tracking suppressed.
- **Edge Cases**: Corrupted cookie string gracefully defaults to showing banner again without crashing.
- **Status**: PASS

---

### Suite 4: Precision Savings & Pricing Calculator

#### Test ID: E2E-CALC-001
- **Test Suite**: Savings / Pricing Calculator
- **Feature / Module**: Interactive Calculator & Boundary Estimations
- **User Role**: Customer / Pizzeria Chain Buyer
- **Priority**: P0 — Critical
- **Test Type**: Happy Path / Boundary / Validation
- **Preconditions**: Calculator page loaded at `/en/calculator`.
- **Test Data**: Country: Germany (`DE`), Size: `32cm`, Material: `KRAFT`, Print: `PRINTED`, Monthly Volume: `50,000`, Current Price: `€0.30`.
- **Starting URL**: `http://localhost:3000/en/calculator`
- **Steps**:
  1. Select Country "Germany".
  2. Select Box Size "32cm (Large)".
  3. Select Material "Kraft Natural" and Print "Custom Print".
  4. Input Monthly Volume `50,000` and Current Unit Cost `0.30`.
  5. Click "Calculate Annual Savings".
  6. Verify estimated unit price range (e.g. `€0.19 – €0.23/box`) and calculated annual savings (`€42,000 – €66,000/yr`).
  7. Click "Request an Exact Quote" button.
- **Expected Result**: Calculator calculates valid numbers without NaN or broken currency; clicking CTA redirects to `/en/quote` with query parameters pre-populated (`?size=32cm&material=kraft&print=custom&volume=50000&country=DE&price=0.30`).
- **Browser Assertions**: Savings card displays numeric ranges, URL transitions to `/en/quote?...`.
- **Database / State Assertions**: Public price range lookup executed against active corridor.
- **Edge Cases**: Empty fields, zero volume, negative price inputs blocked with validation alerts.
- **Status**: PASS

---

### Suite 5: B2B Quote Request (RFQ) Wizard

#### Test ID: E2E-QUOTE-001
- **Test Suite**: Quote Request — Complete Customer Journey
- **Feature / Module**: 4-Step Multi-Step RFQ Wizard
- **User Role**: Pizzeria Procurement Lead
- **Priority**: P0 — Critical
- **Test Type**: Happy Path / State Management
- **Preconditions**: Starting on `/en/quote`.
- **Test Data**: Company: "Milano Gourmet Crust", Contact: "Marco Bellini", Email: "marco@milanocrust.it", Phone: "+39 02 8899 001", City: "Milan", Country: "IT", Volume: 40000.
- **Starting URL**: `http://localhost:3000/en/quote`
- **Steps**:
  1. **Step 1 (Specs)**: Select Standard 32cm, Kraft, Printed. Click "Next: Volume & Delivery".
  2. **Step 2 (Logistics)**: Input 40,000 monthly, 20,000 per order, Country Italy, City Milan, check Loading Dock. Click "Next: Contact Details".
  3. **Step 3 (Company)**: Input Company Name, Website, Branches (10-20), Contact Name, Email, Phone. Click "Next: Review & Submit".
  4. **Step 4 (Review & Upload)**: Review all summary rows. Click "Submit Quote Request".
- **Expected Result**: Submission shows loading state, double-click protection is active, redirects to `/en/quote?submitted=true&code=OPS-2026-XXXX` with success confirmation banner.
- **Browser Assertions**: Lead confirmation screen displays generated lead code (`OPS-2026-XXXX`), no console errors.
- **Database / State Assertions**: `Lead` created with status `NEW`, `Company` matched or created, `Contact` created, `QuoteRequest` stored, `CalculatorSnapshot` frozen.
- **Edge Cases**: Submitting invalid email or empty required fields blocks progression with inline red validation errors.
- **Status**: PASS

---

### Suite 6: File Upload & Attachment Workflow

#### Test ID: E2E-FILE-001
- **Test Suite**: File Upload Workflow
- **Feature / Module**: RFQ Artwork & Specification File Attachment
- **User Role**: Customer attaching custom pizza box artwork
- **Priority**: P1 — High
- **Test Type**: Happy Path / Security / Validation
- **Preconditions**: On Step 4 of the RFQ Wizard (`/en/quote`).
- **Test Data**: Valid PDF artwork file (2MB), Invalid `.exe` file, Oversized 25MB file.
- **Starting URL**: `http://localhost:3000/en/quote`
- **Steps**:
  1. In Step 4 upload area, select valid PDF file (`box_artwork_v1.pdf`).
  2. Verify upload progress and preview chip with file name and size.
  3. Attempt to upload `malicious.exe`.
  4. Attempt to upload `oversized_30mb.zip`.
- **Expected Result**: Valid PDF uploads cleanly and displays green check. `.exe` and oversized files are immediately rejected with actionable error messages ("Unsupported file type" / "File exceeds 10MB limit").
- **Browser Assertions**: Error toast visible for invalid file; valid file uploaded with token ID.
- **Database / State Assertions**: `TemporaryUpload` record created with 24h expiration; transitioned to `StoredFile` upon quote submission.
- **Status**: PASS

---

### Suite 7: Admin Authentication & Access Governance

#### Test ID: E2E-AUTH-001
- **Test Suite**: Admin Authentication & Access Control
- **Feature / Module**: Sign In, JWT Session, and Protected Route Gating
- **User Role**: Admin Operator (`SUPER_ADMIN`)
- **Priority**: P0 — Critical
- **Test Type**: Security / Authorization / Happy Path
- **Preconditions**: Admin user `admin@opsvale.com` exists.
- **Test Data**: Valid credentials `admin@opsvale.com` / `ChangeMe!2026`, Invalid password `WrongPassword99!`.
- **Starting URL**: `http://localhost:3000/admin/login`
- **Steps**:
  1. Direct visit to `/admin/dashboard` while unauthenticated.
  2. Verify automatic redirect to `/admin/login`.
  3. Submit invalid password. Verify error message "Invalid email or password".
  4. Submit valid credentials.
  5. Verify redirect to `/admin/dashboard` with admin navigation chrome and user email displayed.
  6. Click "Sign out" button.
- **Expected Result**: Unauthenticated access is blocked. Valid credentials grant session and redirect to dashboard. Sign out destroys session and redirects to `/admin/login`.
- **Browser Assertions**: URL transitions to `/admin/dashboard` on login, `/admin/login` on logout.
- **Database / State Assertions**: NextAuth session cookie minted and cleared.
- **Edge Cases**: Deactivated admin user (`active: false`) is bounced to `/admin/login` even if JWT is unexpired.
- **Status**: PASS

---

### Suite 8: Admin Operations Dashboard

#### Test ID: E2E-DASH-001
- **Test Suite**: Admin Dashboard
- **Feature / Module**: Executive KPI Bento Grid & Pipeline Distribution
- **User Role**: Authenticated Administrator
- **Priority**: P1 — High
- **Test Type**: Happy Path / Usability
- **Preconditions**: Logged in as administrator.
- **Test Data**: Seeded leads and quotes.
- **Starting URL**: `http://localhost:3000/admin/dashboard`
- **Steps**:
  1. Navigate to `/admin/dashboard`.
  2. Inspect 5 KPI metrics (Total Leads, New Leads, Quotes Prepared/Sent, Closed Won, Win Rate %).
  3. Inspect Pipeline Distribution grid containing all 8 statuses (`NEW`, `REVIEWING`, `NEED_MORE_INFO`, `QUOTE_PREPARED`, `QUOTE_SENT`, `NEGOTIATING`, `WON`, `LOST`).
  4. Inspect Recent Lead Activity feed. Click on a lead code link (e.g. `OPS-2026-0042`).
- **Expected Result**: All numbers match database aggregations; clicking lead code navigates directly to `/admin/leads/[id]`.
- **Browser Assertions**: KPI cards visible, activity feed links functional, responsive grid wraps cleanly.
- **Database / State Assertions**: Aggregations match live database counts.
- **Status**: PASS

---

### Suite 9: Leads CRM & Lifecycle Management

#### Test ID: E2E-LEADS-001
- **Test Suite**: Leads CRM — Full Lifecycle
- **Feature / Module**: Lead Dossier, Status Progression, and Notes
- **User Role**: Sales Administrator (`SALES`)
- **Priority**: P0 — Critical
- **Test Type**: Happy Path / State Management
- **Preconditions**: Logged in as sales operator; lead `OPS-2026-0095` in `NEW` status exists.
- **Test Data**: Note text: "Spoke with procurement manager. Requested 10k batch pricing."
- **Starting URL**: `http://localhost:3000/admin/leads`
- **Steps**:
  1. Search for `OPS-2026-0095` in the leads table. Click to open lead dossier.
  2. Change status dropdown from `NEW` to `REVIEWING`.
  3. Add an internal note: "Spoke with procurement manager. Requested 10k batch pricing." Click "Save Note".
  4. Refresh the page to verify persistence.
- **Expected Result**: Status updates immediately to `REVIEWING`; note is appended to the activity stream with author name and timestamp.
- **Browser Assertions**: Badge displays `REVIEWING`, activity item appears in feed.
- **Database / State Assertions**: `Lead.status` updated to `REVIEWING`, `LeadActivity` created with `type: NOTE`.
- **Status**: PASS

---

### Suite 10: Quote Creation, Pricing Snapshot & Revision Engine

#### Test ID: E2E-QUOTE-REV-001
- **Test Suite**: Quote Creation & Revision System
- **Feature / Module**: Multi-Revision Commercial Quotation Builder
- **User Role**: Pricing & Sales Operator
- **Priority**: P0 — Critical
- **Test Type**: Happy Path / Pricing Integrity
- **Preconditions**: Inside lead dossier `/admin/leads/[id]`.
- **Test Data**: Quantity: 20,000, Unit Price: €0.1980, Payment Terms: "Net 30 Days", SLA: "48-Hour Dispatch".
- **Starting URL**: `http://localhost:3000/admin/leads/[id]`
- **Steps**:
  1. In the Quote Builder panel, select quantity 20,000.
  2. Input Unit Price `0.1980`.
  3. Set Payment Terms to "Net 30 Days" and Dispatch SLA to "48-Hour Dispatch".
  4. Click "Create Commercial Quote Rev 1".
  5. Create a second revision with Unit Price `0.1920` (Revision 2).
- **Expected Result**: Revision 1 is saved and superseded by Revision 2. Both revisions remain immutable in history with pricing snapshots frozen.
- **Browser Assertions**: Revision tabs appear (Rev 1, Rev 2); active quote displays Rev 2 with €0.1920.
- **Database / State Assertions**: `Quote` records created with `revision: 1` and `revision: 2`; `Lead.status` transitions to `QUOTE_PREPARED`.
- **Status**: PASS

---

### Suite 11: Transactional Dispatch & Email Notification

#### Test ID: E2E-DISPATCH-001
- **Test Suite**: Transactional Outbox & Dispatch
- **Feature / Module**: Proposal Token Generation & Outbox Queue
- **User Role**: Sales Operator
- **Priority**: P0 — Critical
- **Test Type**: Happy Path / Concurrency Protection
- **Preconditions**: Lead has a prepared quote revision.
- **Test Data**: Recipient email: customer email.
- **Starting URL**: `http://localhost:3000/admin/leads/[id]`
- **Steps**:
  1. Click "Send Formal Proposal Email" button.
  2. Verify modal preview showing recipient, subject line, and secure proposal link.
  3. Click "Dispatch Proposal".
  4. Rapidly click button a second time to test double-click protection.
- **Expected Result**: Quote transitions from `DRAFT` to `SENT`. Proposal access token (UUID) is generated. Double clicks are ignored.
- **Browser Assertions**: Lead status updates to `QUOTE_SENT`; proposal link with access token is generated.
- **Database / State Assertions**: `Quote.accessToken` populated, `Quote.status: SENT`, `OutboxEmail` created in `PENDING` status.
- **Status**: PASS

---

### Suite 12: Customer Interactive Proposal Portal

#### Test ID: E2E-PROP-001
- **Test Suite**: Customer Proposal Portal
- **Feature / Module**: Direct Access Token Validation & Proposal View
- **User Role**: Customer / Procurement Buyer
- **Priority**: P0 — Critical
- **Test Type**: Happy Path / Security / Responsive
- **Preconditions**: Dispatched proposal with token `test-token-uuid-1234`.
- **Test Data**: Token `test-token-uuid-1234`.
- **Starting URL**: `http://localhost:3000/proposals/test-token-uuid-1234`
- **Steps**:
  1. Open `/proposals/test-token-uuid-1234` in browser.
  2. Verify proposal headline, customer company name, specification breakdown, unit price (€0.1920), order volume, and total contract commitment.
  3. Verify action buttons: "Accept Proposal", "Request Changes", "Decline", and "Download Official PDF".
- **Expected Result**: Clean, branded, professional proposal dossier is rendered without requiring login credentials. Landed cost and internal margins are completely hidden from DOM and network responses.
- **Browser Assertions**: Company name visible, unit price matches snapshot, no console errors.
- **Database / State Assertions**: `AnalyticsEvent` emitted for `PROPOSAL_PAGE_VIEWED`.
- **Edge Cases**: Visiting with invalid/tampered token displays friendly "Proposal Not Found or Expired" screen.
- **Status**: PASS

---

### Suite 13: Customer Proposal Acceptance, Modification & Decline

#### Test ID: E2E-PROP-RESP-001
- **Test Suite**: Customer Response Workflow
- **Feature / Module**: Customer Proposal Response (ACCEPT / MODIFY / DECLINE)
- **User Role**: Customer Decision Maker
- **Priority**: P0 — Critical
- **Test Type**: Happy Path / Idempotency / State Transition
- **Preconditions**: Open proposal at `/proposals/[token]`.
- **Test Data**: Authorized contact name: "Marco Bellini", Signature text.
- **Starting URL**: `http://localhost:3000/proposals/[token]`
- **Steps**:
  1. Click "Accept Proposal" button.
  2. Modal opens: review terms, enter signer name "Marco Bellini", check legal acceptance box.
  3. Click "Confirm & Sign Proposal".
  4. Observe UI transition to "Proposal Accepted & Confirmed".
  5. Attempt to accept again or refresh the page.
- **Expected Result**: Quote transitions to `ACCEPTED`, Lead transitions to `WON`. Page confirms acceptance and disables modification/decline buttons. Replaying acceptance is blocked idempotently.
- **Browser Assertions**: Banner displays "Proposal Confirmed & Accepted", action buttons disabled.
- **Database / State Assertions**: `Quote.status: ACCEPTED`, `Lead.status: WON`, `LeadActivity` created (`CUSTOMER_RESPONSE`), `Notification` created for admin.
- **Status**: PASS

---

### Suite 14: Real-Time Admin Notification Engine

#### Test ID: E2E-NOTIF-001
- **Test Suite**: Admin Notification System
- **Feature / Module**: Real-Time Alerts, Unread Badge & Mark-As-Read
- **User Role**: Admin Operator
- **Priority**: P1 — High
- **Test Type**: Happy Path / State Management
- **Preconditions**: Customer accepted proposal in Suite 13.
- **Test Data**: Notification event `PROPOSAL_ACCEPTED`.
- **Starting URL**: `http://localhost:3000/admin/dashboard`
- **Steps**:
  1. Observe header notification bell unread badge (e.g. `1 new`).
  2. Click notification bell icon.
  3. Verify dropdown displays "Proposal Accepted: Marco Bellini accepted Quote Rev 2".
  4. Click "Mark all as read".
  5. Click "View Full Notification Center".
- **Expected Result**: Bell badge clears to 0 immediately; notification center at `/admin/notifications` displays event history.
- **Browser Assertions**: Badge disappears, dropdown list updates read state, URL transitions to `/admin/notifications`.
- **Database / State Assertions**: `Notification.readAt` timestamp set.
- **Status**: PASS

---

### Suite 15: Visitor Intelligence & Telemetry Gating

#### Test ID: E2E-VISIT-001
- **Test Suite**: Visitors Intelligence
- **Feature / Module**: Traffic Telemetry, Geographic Acquisition & Export
- **User Role**: Marketing / Executive Administrator
- **Priority**: P1 — High
- **Test Type**: Happy Path / Privacy / Analytics
- **Preconditions**: Consented user visits website.
- **Test Data**: Date preset "Last 30 Days".
- **Starting URL**: `http://localhost:3000/admin/visitors`
- **Steps**:
  1. Navigate to `/admin/visitors`.
  2. Inspect traffic chart (Sessions, Pageviews, Bounce Rate).
  3. Inspect Country Breakdown table (Germany, Italy, France, etc.).
  4. Click "Export Data", select CSV format, and download.
- **Expected Result**: Traffic telemetry is rendered clearly without exposing PII (IPs are anonymized); CSV export downloads clean dataset.
- **Browser Assertions**: Chart SVG renders path data; CSV file download triggered.
- **Database / State Assertions**: `VisitorSession` and `AnalyticsEvent` aggregations match.
- **Status**: PASS

---

### Suite 16: Pricing Engine & Landed Cost Governance

#### Test ID: E2E-PRICE-001
- **Test Suite**: Pricing Management
- **Feature / Module**: Margin Hierarchy & 15%-45% Governance Guardrails
- **User Role**: Pricing Manager (`PRICING`)
- **Priority**: P0 — Critical
- **Test Type**: Happy Path / Security / Governance
- **Preconditions**: Logged in as pricing manager.
- **Test Data**: Rule Scope: `GLOBAL`, Min Margin: `0.15` (15%), Max Margin: `0.35` (35%). Invalid Margin: `0.10` (10%) or `0.55` (55%).
- **Starting URL**: `http://localhost:3000/admin/pricing`
- **Steps**:
  1. Navigate to `/admin/pricing` -> "Markup Rules" tab.
  2. Click "New Markup Rule".
  3. Attempt to set Min Margin to `10%` (below 15% minimum platform governance).
  4. Verify system blocks submission with error "Margin must be between 15% and 45%".
  5. Set Min Margin `20%` and Max Margin `35%`. Click "Save Rule".
- **Expected Result**: Out-of-bounds margins are rejected by server and client validation. Valid rules save and write an immutable entry to `PricingAuditLog`.
- **Browser Assertions**: Error alert for invalid margin; success banner for valid rule save.
- **Database / State Assertions**: `PricingRule` created; `PricingAuditLog` recorded with `entityType: PRICING_RULE`.
- **Status**: PASS

---

### Suite 17: Bulk Excel Pricing Matrix Workflow

#### Test ID: E2E-EXCEL-001
- **Test Suite**: Bulk Excel Workflow
- **Feature / Module**: Spreadsheet Export, Diff Engine & Version Conflict Safeguards
- **User Role**: Pricing Administrator
- **Priority**: P0 — Critical
- **Test Type**: Happy Path / Negative / Concurrency
- **Preconditions**: On `/admin/pricing`.
- **Test Data**: Exported workbook with modified cost tiers.
- **Starting URL**: `http://localhost:3000/admin/pricing`
- **Steps**:
  1. Click "Export Matrix (.xlsx)". Verify file downloads.
  2. Open Import mode `UPDATE_EXISTING`.
  3. Upload modified spreadsheet with updated base costs.
  4. Inspect Diff Preview Modal: review inserts (+), updates (~), unchanged (=), conflicts (⚠️).
  5. Click "Commit Changes".
- **Expected Result**: Spreadsheet parses accurately; diff preview verifies schema; valid changes commit atomically in a single database transaction.
- **Browser Assertions**: Diff modal displays categorized rows; commit button confirms total updates.
- **Database / State Assertions**: Landed costs updated with new effective dates; `PricingAuditLog` entries created.
- **Status**: PASS

---

### Suite 18: Logistics Corridor & Freight Hub Management

#### Test ID: E2E-LOGIS-001
- **Test Suite**: Logistics Corridor Management
- **Feature / Module**: European Freight Corridors & Single Active Corridor Constraint
- **User Role**: Logistics / Pricing Administrator
- **Priority**: P1 — High
- **Test Type**: Happy Path / Constraints
- **Preconditions**: On `/admin/logistics`.
- **Test Data**: Country: Netherlands, Port: Rotterdam, Freight: €0.015, Inland: €0.008, Other: €0.002.
- **Starting URL**: `http://localhost:3000/admin/logistics`
- **Steps**:
  1. Navigate to `/admin/logistics`.
  2. Click "Add Logistics Corridor".
  3. Select Country "Netherlands", Route "Rotterdam -> Amsterdam DC", Freight €0.015, Inland €0.008.
  4. Click "Save Corridor".
  5. Toggle active status.
- **Expected Result**: Corridor is created and listed under Netherlands corridors; single active corridor constraint is enforced automatically.
- **Browser Assertions**: New corridor card appears; toggle switch updates status.
- **Database / State Assertions**: `LogisticsCost` saved with computed sum factored into landed cost formulas.
- **Status**: PASS

---

### Suite 19: Analytics Funnel & Commercial Telemetry

#### Test ID: E2E-ANALYTICS-001
- **Test Suite**: Analytics Dashboard
- **Feature / Module**: Conversion Funnel, Commercial Velocity & Exports
- **User Role**: Executive Administrator
- **Priority**: P1 — High
- **Test Type**: Happy Path / Data Integrity
- **Preconditions**: Logged in as administrator.
- **Test Data**: None.
- **Starting URL**: `http://localhost:3000/admin/analytics`
- **Steps**:
  1. Navigate to `/admin/analytics`.
  2. Inspect Win Rate KPI, Volume Pipeline, and Territory Breakdown.
  3. Click "Export CSV Report".
  4. Click "Export JSON Telemetry".
- **Expected Result**: Downloads execute cleanly with accurate funnel math and zero internal credential leakage.
- **Browser Assertions**: Charts render; export downloads trigger without console errors.
- **Database / State Assertions**: Funnel numbers reconcile with quote statuses.
- **Status**: PASS

---

### Suite 20: Administrator Governance & Access Security

#### Test ID: E2E-GOV-001
- **Test Suite**: User Governance & Settings
- **Feature / Module**: Admin Creation, Password Lifecycle & Safeguards
- **User Role**: Super Administrator (`SUPER_ADMIN`)
- **Priority**: P0 — Critical
- **Test Type**: Security / Governance / Guardrails
- **Preconditions**: Logged in as super administrator.
- **Test Data**: New user: "Clara Schumann", Email: "clara@opsvale.eu", Role: "SALES".
- **Starting URL**: `http://localhost:3000/admin/settings`
- **Steps**:
  1. Navigate to `/admin/settings`.
  2. Click "Add Administrator".
  3. Fill Name, Email, Role `SALES`, and initial password. Click "Create Account".
  4. Attempt to deactivate the currently logged-in Super Admin account.
  5. Verify system rejects self-deactivation with alert "Cannot deactivate your own account".
- **Expected Result**: New operator created with bcrypt password hash. Critical security safeguards block self-deactivation and last super admin deletion.
- **Browser Assertions**: User table updates with new account; error toast blocks destructive self-action.
- **Database / State Assertions**: `AdminUser` created; `AdminAuditLog` created with `action: ADMIN_CREATED`.
- **Status**: PASS

---

### Suite 21: Responsive & Cross-Device E2E Audit

#### Test ID: E2E-RESP-001
- **Test Suite**: Responsive & Cross-Device E2E
- **Feature / Module**: Multi-Viewport Layout Integrity & Touch Usability
- **User Role**: Users across Mobile, Tablet, Desktop, and Ultrawide
- **Priority**: P0 — Critical
- **Test Type**: Responsive / Visual / Usability
- **Preconditions**: Application running.
- **Test Data**: Viewports: 320x568 (Mobile SE), 375x812 (Mobile), 768x1024 (Tablet), 1440x900 (Desktop), 1920x1080 (FHD), 2560x1440 (2K Ultrawide).
- **Starting URL**: `http://localhost:3000/en`
- **Steps**:
  1. Test Homepage, Calculator, Quote Wizard, Proposal Portal, and Admin Dashboard across all 6 viewports.
  2. Verify content remains within centered 1440px / 1600px containers on 1920px and 2560px.
  3. Verify mobile drawer opens smoothly and touch targets are $\ge 44\text{px}$.
  4. Verify tables have horizontal scroll containers and modals have vertical scroll limits (`max-h-[90vh]`).
- **Expected Result**: Zero horizontal page overflow; all buttons accessible; no overlapping or clipped text across all viewports.
- **Browser Assertions**: `document.documentElement.scrollWidth === window.innerWidth` across all pages.
- **Status**: PASS

---

### Suite 22: Error Boundaries & Failure Recovery

#### Test ID: E2E-ERR-001
- **Test Suite**: Error Boundaries & Failure Recovery
- **Feature / Module**: Controlled Error Handling & Safe Fallback UIs
- **User Role**: User encountering network failure or invalid route
- **Priority**: P1 — High
- **Test Type**: Negative / Recovery / Security
- **Preconditions**: Starting on `http://localhost:3000`.
- **Test Data**: Non-existent route `/en/non-existent-page-xyz`.
- **Starting URL**: `http://localhost:3000/en/non-existent-page-xyz`
- **Steps**:
  1. Navigate to `/en/non-existent-page-xyz`.
  2. Verify 404 Not Found page renders with OpsVale branding and "Return to Homepage" button.
  3. Click "Return to Homepage".
- **Expected Result**: 404 boundary catches route cleanly without exposing stack traces, internal paths, or database errors.
- **Browser Assertions**: Branded 404 UI visible, URL returns to `/en`.
- **Status**: PASS

---

### Suite 23: Browser Console & Network Health

#### Test ID: E2E-HEALTH-001
- **Test Suite**: Browser Console & Network Audit
- **Feature / Module**: Runtime Diagnostics, CSP Enforcement & Asset Loading
- **User Role**: Technical Auditor
- **Priority**: P1 — High
- **Test Type**: Security / Diagnostics
- **Preconditions**: Dev server running.
- **Test Data**: None.
- **Starting URL**: `http://localhost:3000/api/health`
- **Steps**:
  1. Perform GET request to `/api/health`.
  2. Verify JSON response with `status: "healthy"` and subsystem checks.
  3. Inspect HTTP response headers on `/en`.
  4. Verify Content-Security-Policy, X-Frame-Options: DENY, X-Content-Type-Options: nosniff.
- **Expected Result**: Health probe passes; security headers are properly attached to edge responses.
- **Browser Assertions**: Headers contain CSP, status is 200 OK.
- **Status**: PASS

---

### Suite 24: Usability & Product QA Audit

#### Test ID: E2E-UX-001
- **Test Suite**: Usability & Product QA Audit
- **Feature / Module**: Conversion Clarity, Feedback & Friction Analysis
- **User Role**: Prospective European B2B Client
- **Priority**: P1 — High
- **Test Type**: Usability / UX Audit
- **Preconditions**: Standard customer journey on desktop and mobile.
- **Test Data**: End-to-end user navigation.
- **Starting URL**: `http://localhost:3000/en`
- **Steps**:
  1. Walk through Homepage -> Savings Calculator -> Quote Wizard -> Submission -> Proposal Review.
  2. Evaluate visual feedback during calculations, loading states, validation error clarity, and form progression.
- **Expected Result**: User always receives immediate visual feedback; error messages are actionable; CTAs are unambiguous.
- **Browser Assertions**: Smooth transitions, accessible contrast, intuitive wizard progression.
- **Status**: PASS
