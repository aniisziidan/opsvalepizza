---
name: OpsVale Industrial Supply
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#44474d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#75777e'
  outline-variant: '#c5c6ce'
  surface-tint: '#4f5e7e'
  primary: '#041632'
  on-primary: '#ffffff'
  primary-container: '#1b2b48'
  on-primary-container: '#8393b5'
  inverse-primary: '#b7c7eb'
  secondary: '#735a31'
  on-secondary: '#ffffff'
  secondary-container: '#fddba7'
  on-secondary-container: '#785f35'
  tertiary: '#2b0f00'
  on-tertiary: '#ffffff'
  tertiary-container: '#4a1f00'
  on-tertiary-container: '#e77114'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d7e2ff'
  primary-fixed-dim: '#b7c7eb'
  on-primary-fixed: '#091b37'
  on-primary-fixed-variant: '#374765'
  secondary-fixed: '#ffdeac'
  secondary-fixed-dim: '#e3c290'
  on-secondary-fixed: '#281900'
  on-secondary-fixed-variant: '#59431c'
  tertiary-fixed: '#ffdbc8'
  tertiary-fixed-dim: '#ffb68b'
  on-tertiary-fixed: '#321200'
  on-tertiary-fixed-variant: '#753400'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  data-label:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 16px
  max-width: 1440px
---

## Brand & Style
The design system for this platform balances enterprise reliability with the tactical nature of logistics and the warmth of the food service industry. The brand personality is **operational, specialized, and authoritative**, moving away from "tech-first" aesthetics toward a "utility-first" premium experience.

The visual style is a hybrid of **Corporate Modern** and **Industrial Minimalism**. It prioritizes high-order organization for procurement data while utilizing structural elements—such as subtle grid lines and "safety" accents—to evoke the feeling of a well-run warehouse. The emotional response should be one of total confidence: that every order is tracked, every box is accounted for, and the supply chain is unbreakable.

## Colors
The palette is rooted in **Deep Navy (#1B2B48)** to establish corporate trust and authority. **Kraft (#D4B483)** is used as a sophisticated nod to corrugated packaging materials, providing a warm, tactile contrast to the cooler corporate tones. 

**Industrial Orange (#F47B20)** is reserved strictly for functional emphasis: primary calls to action, status alerts, and critical logistical updates. The background utilizes a very **Soft Grey (#F8F9FA)** to reduce eye strain during long procurement sessions, while high-surface areas remain pure white to maintain a "clean-room" professional feel.

## Typography
The typography strategy is built for high-density information. **Hanken Grotesk** provides a sharp, contemporary edge for headlines, giving the brand a modern "ops-tech" feel. 

**Inter** is the workhorse for all body copy and procurement data, chosen for its exceptional legibility in complex forms. For SKU numbers, tracking codes, and warehouse coordinates, **JetBrains Mono** is introduced to provide a distinct "industrial/technical" look that prevents confusion between similar characters (e.g., 0 and O).

## Layout & Spacing
The system uses a **12-column fixed grid** on desktop to ensure procurement tables and dashboards maintain a rigid, organized structure. The spacing rhythm is based on a **4px baseline**, ensuring all components align to a mathematical industrial standard.

On mobile, the layout shifts to a single-column fluid model with increased vertical padding for touch-friendly ordering. Data density is managed through "Progressive Disclosure"—showing core SKU info and quantity by default, with technical specs tucked into expandable rows.

## Elevation & Depth
This design system avoids heavy shadows in favor of **Tonal Layers** and **Structural Outlines**. Depth is conveyed through background color shifts (e.g., a Slate Grey sidebar against a Soft Grey canvas).

When separation is required, use **Low-Contrast Outlines** (1px solid #E2E8F0). For floating elements like dropdowns or "Quick Add" modals, use a tight, high-diffusion shadow with a slight Navy tint to maintain the brand’s color presence: `0px 4px 20px rgba(27, 43, 72, 0.08)`.

## Shapes
The shape language is **Soft (0.25rem default)**. This provides a professional, geometric feel that mimics the edges of a folded pizza box. Avoid fully rounded "pill" shapes, as they appear too consumer-oriented; instead, keep buttons and inputs rectangular with slight corner softening to maintain an industrial, durable aesthetic. Circular motifs are reserved exclusively for iconography representing the pizza product itself (e.g., size indicators or circular box vents).

## Components
- **Buttons:** Primary buttons use Industrial Orange with white text for maximum visibility. Secondary buttons use Navy with a ghost (outlined) style.
- **Data Tables:** Use alternating row stripes in Soft Grey. Header cells should have a subtle bottom border in Kraft to distinguish the "table head" from the "table data."
- **Input Fields:** Large, 48px height minimum for warehouse environments. Labels use the "Data Label" (JetBrains Mono) style to look like stamped shipping labels.
- **Status Chips:** Use a "Safety" color system: Green for "Delivered," Orange for "In Transit," and Deep Navy for "Pending."
- **Inventory Cards:** Use a 1px Navy border that thickens to 2px on hover, signaling the selection of a "physical object" in the digital space.
- **Logistics Tracker:** A vertical stepper component using Kraft tones to represent the journey of the material from factory to pizzeria.