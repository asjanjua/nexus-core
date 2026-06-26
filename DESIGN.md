---
name: NexusAI Mission Control
version: 1.0.0
colors:
  ink: "#0B1020"
  slate: "#243044"
  mist: "#F5F7FA"
  white: "#FFFFFF"
  violet: "#7A3FF2"
  signal: "#147B58"
  data-blue: "#1D5FD1"
  warning: "#C98200"
  critical: "#B42318"
typography:
  display:
    fontFamily: Inter
    fontSize: 2.5rem
    fontWeight: "700"
    lineHeight: "1.1"
    usage: "Hero KPIs, confidence scores, headline metrics"
  heading:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: "600"
    lineHeight: "1.3"
    usage: "Section titles, agent brief headers"
  body:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: "400"
    lineHeight: "1.6"
    usage: "Evidence text, recommendations, descriptions"
  label:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: "500"
    lineHeight: "1.4"
    usage: "Nav items, metadata, timestamps"
  caption:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: "400"
    lineHeight: "1.4"
    usage: "Eyebrows, source pills, sensitivity badges, chart labels"
spacing:
  hero: "2rem"
  section: "1.25rem"
  item: "0.75rem"
rounded:
  panel: "12px"
  card: "8px"
  badge: "9999px"
  input: "6px"
---

## Overview

**NexusAI Mission Control** is an executive intelligence operating layer for
regulated buyers in GCC, Pakistan, and emerging markets. The UI must feel like
a **command room**, not a SaaS dashboard. Restrained, evidence-first, precise,
built for decisions. The user is a CEO, CFO, or board member — every glance
should surface a signal.

**North Star:** A top-tier consulting command layer. Neutral surfaces. High-trust
dark navigation. Status color only when it carries operational meaning. No
decoration. No dashboard candy.

## Design Tokens

### Palette — 9 tokens, 3 roles

| Token | Hex | Role | Constraint |
|---|---|---|---|
| **Ink** | `#0B1020` | Sidebar, dark surfaces | Never on light backgrounds above 30% opacity |
| **Slate** | `#243044` | Secondary nav, borders | Structural only. Never as text on dark. |
| **Mist** | `#F5F7FA` | Light-mode background | Light theme only. Never on dark surfaces. |
| **White** | `#FFFFFF` | Main panels (light), text on dark | Full white on Ink passes WCAG AAA. |
| **Violet** | `#7A3FF2` | AI-generated content, autonomy signals | **PRIZED ACCENT. Never decorative. Never for nav, links, or buttons.** |
| **Signal** | `#147B58` | Live, verified, success | Status only. Never as primary button. |
| **Data Blue** | `#1D5FD1` | Evidence, metrics, links, interactive elements | The primary interaction color. |
| **Warning** | `#C98200` | Approval required, human review | Never for informational badges. |
| **Critical** | `#B42318` | High risk, blocked, denied | Never for non-critical status. |

### The Violet Constraint (non-negotiable)

Violet (`#7A3FF2`) is reserved for **AI-generated content and autonomy signals only**.
It marks outputs that came from an agent, not a human. It appears on:

- Agent output confidence badges
- AI-generated brief labels
- Autonomy mode indicators
- "AI Guarded" status chips

It **must never** appear on:
- Navigation links (use Data Blue)
- Primary action buttons (use Data Blue)
- Section headers or dividers (use Ink/Slate)
- Decorative elements, icons, or gradients
- Any element that is not AI-generated or autonomy-related

**A secondary interaction accent is Data Blue (`#1D5FD1`)** — use it for all
links, buttons, active nav states, and interactive elements.

## Type Scale

The product has five tiers. The Display tier is the product — executive decisions
turn on numbers that can be read in one glance from across a boardroom table.

| Tier | Size/Weight | Usage | Example |
|---|---|---|---|
| **Display** | 2.5rem / 700 | Hero KPIs, confidence scores, headline metrics | "94% confidence", "$2.3M at risk" |
| **Heading** | 1.5rem / 600 | Section titles, agent brief headers | "Executive Synthesis", "Risk Radar" |
| **Body** | 1rem / 400 | Evidence text, recommendations, descriptions | "Based on 31 evidence records..." |
| **Label** | 0.875rem / 500 | Nav items, metadata, timestamps | "Last reviewed: June 26" |
| **Caption** | 0.75rem / 400 | Eyebrows, source pills, sensitivity badges | "CONFIDENTIAL", "Source: Q2 Report" |

No text below 12px (0.75rem). Captions at 12px must use increased letter-spacing
(0.02em) for legibility. All body text must pass WCAG AA (4.5:1 minimum contrast).

## Spacing Hierarchy

Three tiers. Never use the same spacing for hero content and item lists.

| Tier | Value | Usage |
|---|---|---|
| **Hero** | 2rem (gap-8) | Primary panel on each screen — synthesis brief, top KPI, main Ask |
| **Section** | 1.25rem (gap-5) | Supporting panels, agent cards, evidence grids |
| **Item** | 0.75rem (gap-3) | List rows, metadata lines, badge groups |

## Modes

### Dark Mode (default)
- Background: Ink (`#0B1020`)
- Panels: Ink + 4% white overlay
- Text: White, White/80, White/60
- Accent: Violet (AI only), Data Blue (interaction)
- Borders: White/10

### Light Mode (boardroom, export, print)
- Background: Mist (`#F5F7FA`)
- Panels: White (`#FFFFFF`)
- Text: Ink (`#0B1020`), Slate (`#243044`)
- Accent: Violet (AI only), Data Blue (interaction)
- Borders: Slate/15

Light mode is required for `/export` surfaces, PDF generation, and print.
Dark mode is default for all interactive screens.

## Anti-Patterns

These are prohibited. The UX/UI Expert Review (2026-06-16) and live audit
(2026-06-26) identified each:

- ❌ `white/40` or lower opacity on dark backgrounds (fails WCAG AA)
- ❌ `white/30` for body text (fails WCAG AA)
- ❌ `white/[0.045]` surfaces with no explicit hex (contrast not guaranteed)
- ❌ Teal (`#2ed3b7`) anywhere — this was a placeholder accent, replaced by Data Blue + Violet split
- ❌ Uniform `space-y-5` / `p-4` everywhere (use the hero/section/item hierarchy)
- ❌ No Display-tier typography — hero KPIs need `text-4xl`+
- ❌ Violet used as link color, button color, or nav indicator
- ❌ Color alone for status — always pair with an icon or label
- ❌ The "N" tile as permanent brand mark — replace with a proper wordmark

## Integration with Figma

The canonical design tokens live in this file AND in the Figma Desktop file at:
https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun

When Figma MCP is connected, tokens flow bidirectionally:
- `get_variable_defs` → compare against this DESIGN.md → flag mismatches
- `use_figma` → push corrections to Figma variables
- `get_design_context` → read screens for code generation
- `get_screenshot` → verify every change visually

This DESIGN.md is authoritative. If Figma variables contradict it, DESIGN.md wins.
Update DESIGN.md first, then push to Figma.

## Validation

```bash
npx @google/design.md lint DESIGN.md
```

Run before every design-significant PR. The linter catches:
- Token references that don't resolve
- WCAG contrast failures
- Structural issues in the spec
