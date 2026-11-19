---
name: The Exposed Question Binding
description: A calm Nigerian quiz experience bound together by paper, ink, and a visible thread.
colors:
  primary: "#284b39"
  primary-dark: "#a8c8a9"
  primary-hover: "#1d392b"
  paper: "#fffefa"
  paper-dark: "#1d211e"
  paper-soft: "#f7f6f0"
  ink: "#292a25"
  ink-dark: "#f4f1e8"
  body: "#42443d"
  muted: "#65675e"
  thread: "#c9c1ad"
  board: "#76573b"
  board-dark: "#d3b493"
  control-border: "#8d8677"
  error: "#a3332d"
  success: "#286b48"
typography:
  display:
    fontFamily: "Literata, Georgia, Times New Roman, serif"
    fontSize: "clamp(2.75rem, 6.7vw, 5.7rem)"
    fontWeight: 500
    lineHeight: 1.04
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Literata, Georgia, Times New Roman, serif"
    fontSize: "clamp(1.65rem, 3vw, 2.3rem)"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 650
    lineHeight: 1.4
rounded:
  control: "2px"
  stitch: "50%"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "48px"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "48px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
    height: "50px"
---

# Design System: The Exposed Question Binding

## Overview

**Creative North Star: "The Exposed Question Binding"**

The interface feels like an open book that a host and guests move through together. Near-white paper, dark ink, and a fine linen-colored rule give the pages their quiet structure; a stitched fifteen-question path makes the shared run visible without turning it into broadcast spectacle. The atmosphere is editorial and warm, but the controls remain plain, familiar, and task-first.

Literata gives headings a bookish voice; Inter keeps forms, status, and reading clear. Flat surfaces and fine rules carry the layout instead of shadows or ornamental panels. The green marks the action and current state, while board brown and linen thread quietly recall the binding.

**Key Characteristics:**
- Paper-and-ink surfaces with restrained forest-green actions and book-board details.
- Editorial display type paired with practical sans-serif controls.
- One visible stitched thread connecting the shared fifteen-question run.
- Calm, accessible controls and explicit operational states.

## Colors

The palette pairs warm paper and readable ink with a single forest-green action color; a dark theme preserves the same relationships with adapted values.

### Primary
- **Forest Green** (`primary`): The primary action, selected answer, and current or completed question state.
- **Forest Green, Dark Theme** (`primary-dark`): The dark-theme counterpart for primary actions and selected states.
- **Deep Green** (`primary-hover`): Hover state for primary actions in the light theme.

### Neutral
- **Rag Paper** (`paper`): The light page and control surface.
- **Night Paper** (`paper-dark`): The dark-theme page and control surface.
- **Soft Paper** (`paper-soft`): Quiet notices and supporting status surfaces.
- **Printed Ink** (`ink`): Headings and high-emphasis text in the light theme.
- **Book Brown** (`board`): The small binding mark and unfilled stitch details.
- **Linen Thread** (`thread`): Fine dividers, rules, and the question-path spine.
- **Control Edge** (`control-border`): Input outlines and secondary-control boundaries.
- **Muted Reading Ink** (`body`): Default body copy.
- **Quiet Ink** (`muted`): Supporting copy, captions, and inactive question markers.
- **Error Red** (`error`): Error notices and validation states.
- **Success Green** (`success`): Explicit success states.

**The One Green Rule.** Use green to identify an action or live state, not as a general decorative fill.

## Typography

**Display Font:** Literata (with Georgia and Times New Roman fallbacks)  
**Body Font:** Inter (with system sans-serif fallbacks)

**Character:** Literata lends the pages an editorial book voice without compromising legibility. Inter keeps labels, controls, and dense operational information direct and familiar.

### Hierarchy
- **Display** (500, responsive 2.75–5.7rem, 1.04 line height): Page headlines, with balanced wrapping and a narrow measure.
- **Headline** (500, responsive 1.65–2.3rem, 1.2 line height): Section and question titles.
- **Title** (500, 1.45rem): Compact editorial labels such as the shared-run title.
- **Body** (400, 1rem, 1.6 line height): Reading and supporting copy; longer introductory copy stays near 66 characters per line.
- **Label** (650, 0.9rem): Form labels and controls; use sentence case rather than display styling.

**The Two-Voice Rule.** Keep Literata for editorial headings; use Inter for all information that must be scanned, entered, or acted on.

## Layout

Use an open-spread composition with a centered page shell (maximum width 1180px) and fine full-width rules. On the homepage, the join action and introduction occupy one page while the question thread sits beside it across an exposed vertical gutter. Host and guest work areas separate tasks with clear headings and top rules rather than dashboard-card grids.

At widths up to 760px, the spread becomes one column, the question thread runs horizontally, and host forms and answer choices stack. At widths up to 420px, the header and join form tighten further while maintaining full-width, touch-friendly actions. Preserve generous space around the question and its answers; keep host lists compact enough to scan.

## Elevation & Depth

The system is flat by default and uses no box shadows. Paper tone, spacing, fine rules, and the exposed question thread establish depth and grouping. Focus is communicated with a visible outline, not elevation.

**The Flat-By-Default Rule.** Separate content with whitespace and rules; do not lift ordinary sections into floating cards.

## Shapes

Controls use nearly square corners (2px radius). Sections are open and mostly unboxed, with a single fine top rule; fields and answer choices get a clear border. The binding motif uses small circular stitch marks connected by a thin line. Reserve rounded silhouettes for those marks, not for general-purpose pills or cards.

## Components

### Buttons
- **Shape:** Nearly square corners (2px radius), with a 48px minimum height.
- **Primary:** Forest green with paper-colored text; horizontal padding is 18px and text is bold.
- **Secondary:** Transparent or paper-colored with a control-edge border and ink text.
- **Hover / Focus:** Primary shifts to deep green on hover. Keyboard focus receives a 3px green outline with a 3px offset. Press feedback is a subtle scale-down; disabled controls are visibly muted.

### Inputs / Fields
- **Style:** Paper surface, 1px control-edge border, nearly square corners (2px), and 12px by 14px internal padding; text inputs are at least 50px high.
- **Focus:** Use the shared visible 3px outline with a 3px offset.
- **Error / Disabled:** Error notices use the error color for their border. Disabled actions use reduced opacity and a not-allowed cursor.

### Navigation
- **Style:** A compact wordmark and text link sit in a stable header separated from the page by a linen rule. Links use green text and a fine underline; hover strengthens the underline. Preserve the same simple arrangement on phones.

### Cards / Containers
- **Style:** Avoid generic cards. Use open sections with a top rule and measured vertical padding; status notices may use a soft-paper fill and a clear border.

### Question Thread
- **Character:** The signature component is a literal fifteen-step progress path, never a decorative flourish.
- **Desktop:** Stack numbered markers along a vertical thread in the homepage spread.
- **Compact:** Lay the markers across a horizontal line on small screens and within guest play.
- **State:** Completed and current steps use green; upcoming steps remain quiet. Keep numbers legible and aligned.

## Do's and Don'ts

### Do:
- **Do** use paper, ink, linen rules, and green states consistently across light and dark themes.
- **Do** make the current question, answer choices, and host session state the easiest information to scan.
- **Do** keep focus visible and respect reduced-motion preferences.
- **Do** use the stitched thread to express the shared fifteen-question sequence.

### Don't:
- **Don't** use shadows or floating dashboard cards to create hierarchy.
- **Don't** turn the book-binding direction into ornamental game-show props or broadcast spectacle.
- **Don't** use green as a large decorative surface when it is not marking an action or state.
- **Don't** obscure status, answer privacy, or simulated prize information with visual treatment.
