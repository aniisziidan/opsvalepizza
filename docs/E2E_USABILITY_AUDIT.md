# OpsVale Platform — E2E Usability & Product QA Audit

**Document Version:** 1.0.0  
**Audit Scope:** Public Storefront, Multi-Step Quote Wizard, Interactive Calculator, Proposal Portal, and Admin ERP Workspace  
**Lead Auditor:** Senior QA & UX Usability Specialist  

---

## 1. Usability Audit Overview

This audit evaluates the real-world user experience of the OpsVale platform across mobile, tablet, desktop, and ultrawide viewports. The platform was evaluated against core UX heuristics:
1. **Visibility of System Status** (loading feedback, live calculations, progress indicators).
2. **Match Between System & Real World** (clear wholesale terminology, standard metric dimensions, transparent pricing).
3. **User Control & Freedom** (back navigation in wizards, easy modal dismissals, cancel options).
4. **Consistency & Standards** (harmonious typography, persistent brand chrome, unified button styles).
5. **Error Prevention & Recovery** (inline validation, actionable error messages, duplicate protection).
6. **Accessibility & Touch Usability** (WCAG AA contrast, $\ge 44\text{px}$ touch targets, responsive horizontal scroll containers).

---

## 2. Detailed Findings by Workflow

### 2.1 Public Homepage & Value Proposition
- **Strengths:**
  - High-impact hero section with video background and quick savings estimation widget provides immediate clarity of purpose.
  - Centered `max-w-[1440px]` container preserves readability on ultrawide $2560\text{px}$ displays while video background stretches full-bleed.
  - Clear, prominent CTAs ("Request an Exact Quote", "View Catalog", "Packaging Savings Calculator").
- **Observations & Minor Polish:**
  - Mobile hamburger drawer provides $\ge 48\text{px}$ vertical touch targets with intuitive chevron indicators and a bold orange action button.
  - Language switcher dropdown smoothly closes on outside click or escape.

### 2.2 Precision Savings Calculator (`/en/calculator`)
- **Strengths:**
  - Instant reactivity: dynamically adjusts estimated unit price and annual savings without requiring page reloads.
  - Clear breakdown cards showing min/max estimated cost per box, percentage savings, and annualized total savings.
  - "Request an Exact Quote" button automatically passes user choices via query parameters (`country`, `boxSize`, `volume`, `price`) to pre-fill the Quote Wizard.
- **Error Prevention:**
  - Non-numeric or negative values are prevented via typed number inputs and boundary validation.

### 2.3 B2B Multi-Step Quote Request (RFQ) Wizard (`/en/quote`)
- **Strengths:**
  - 4-step visual stepper gives users clear orientation of their progress (1. Company, 2. Specs, 3. Logistics, 4. Review & Submit).
  - "Previous" and "Cancel" buttons allow effortless backtracking without data loss.
  - File upload dropzone provides clear drag-and-drop feedback, file size indications, and deletion buttons for attached artwork.
  - Post-submission confirmation screen presents a dedicated Reference Code (`OPS-2026-XXXX`) and summary snapshot.
- **Validation Clarity:**
  - Required fields highlight with red borders and descriptive helper text below the field (e.g. "Company name is required", "Please enter a valid business email").

### 2.4 Interactive Customer Proposal Portal (`/proposals/[token]`)
- **Strengths:**
  - High-trust presentation: displays verified manufacturer specifications, order quantities, delivery terms, and total contract commitment.
  - Internal margin data and landed costs are completely excluded from the DOM and network payload, maintaining confidentiality.
  - Action modals for "Accept Proposal", "Request Changes", and "Decline" are clean and prevent accidental clicks through confirmation checkboxes.
  - Once accepted, the interface immutably switches to "Proposal Confirmed & Accepted", disabling further state changes.

### 2.5 Admin Operations Workspace (`/admin/**`)
- **Strengths:**
  - Fixed-width `max-w-[1600px]` admin container ensures large 4K screens do not over-stretch data tables.
  - Responsive `AdminChrome` switches from a persistent desktop sidebar to an intuitive mobile drawer with a top bar and notifications bell.
  - Lead dossier provides tabs for lead details, interactive quote builder with revision tabs (Rev 1, Rev 2), activity history, and quick email dispatch.
  - Bulk Excel pricing tool provides a categorized Diff Preview (inserts, updates, conflicts) before database commit.

---

## 3. Accessibility & Cross-Device Review

| Device / Viewport | Layout Assessment | Touch / Click Usability | Horizontal Overflow |
|---|---|---|---|
| **Mobile Small ($320\text{px}$)** | Excellent. Single-column stacks, readable 14px body text. | $\ge 44\text{px}$ buttons, accessible tap targets. | **None ($0\text{px}$)** |
| **Mobile Standard ($375\text{px}$)** | Clean vertical hierarchy, card padding normalized to 16px. | All interactive inputs touch-friendly. | **None ($0\text{px}$)** |
| **Tablet ($768\text{px}$)** | Responsive 2-column grids, adaptive navigation bar. | Smooth switching between touch and pointer. | **None ($0\text{px}$)** |
| **Desktop ($1440\text{px}$)** | Optimal 12-column layout, clear visual hierarchy. | Fast click navigation and hover feedback. | **None ($0\text{px}$)** |
| **Ultrawide ($1920\text{px} - 2560\text{px}$)** | Centered content container prevents eye strain; full-width visual backgrounds. | Consistent pointer precision. | **None ($0\text{px}$)** |

---

## 4. Usability Enhancements & Recommendations

1. **Enhanced Tooltips on Quote Revision Builder**: Add contextual helper tooltips explaining the relationship between target margin %, landed cost tiers, and public price ranges for new sales operators.
2. **Keyboard Accessibility Shortcuts in Admin CRM**: Introduce keyboard shortcuts (e.g. `Ctrl+K` for global lead search, `Esc` for closing active modals) to speed up high-volume operator workflows.
3. **Real-Time Notification Toast**: In addition to the header bell badge, trigger a subtle floating toast when a customer accepts a proposal while the admin is actively viewing the dashboard.

---

## 5. Conclusion

The OpsVale platform provides an intuitive, robust, and conversion-optimized user experience across both customer-facing storefronts and administrative back-office workflows. All responsive breakpoints, forms, calculations, and security guardrails function reliably with clear visual feedback.
