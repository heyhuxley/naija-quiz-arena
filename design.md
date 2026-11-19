---
name: Nigerian quiz show design system
source: derived
character: "A modern Nigerian quiz show interface with warm paper surfaces, deep ink, and a restrained prize accent. Host tools stay calm and operational, while guest play gives the question and answer choices the whole focus."
tokens: "Read app/app.css for the live color and type tokens."
contrast: "Light body on canvas 11.06:1, ink on canvas 15.60:1, muted on canvas 6.98:1, white on accent 6.63:1, control border on surface 4.10:1. Dark body on canvas 12.97:1, ink on canvas 15.54:1, muted on canvas 8.40:1, on accent 5.30:1, control border on surface 4.09:1."
---

## Build mandate

Build an accessible web product for live quiz sessions. Keep facts, answer privacy, and familiar controls clear. Make the host screen a useful control workspace and the guest screen a focused question experience. Support small phones through desktop screens, keyboard use, visible focus, zoom, and reduced motion.

## Character & direction

The product feels like a carefully produced quiz show without imitating a specific broadcaster. Warm paper and deep ink carry the interface. The prize accent marks the current level and primary actions. Typography uses editorial display headings with a plain sans serif for controls and reading.

## Composition patterns

Host pages use a stable top bar and a clear work area for the session or question bank. Keep the guest list, question order, timer, and session actions easy to scan. Guest pages use one focused column with the question first, four large answer controls, timer, and lifelines. Do not use a generic grid of dashboard cards.

## Component & usage rules (do's and don'ts)

Use familiar buttons, inputs, tables, status labels, and navigation. Use the accent for a primary action, current prize level, and selected answer only. Use borders to define controls and sections. Avoid decorative gradients, simulated control panels, and ornate game show props. Keep error, waiting, paused, reveal, and completed states explicit.

## Responsive & accessibility direction

On phones, keep the current question and answer controls in a single column with large targets. On wide screens, give host controls a stable information hierarchy and allow the question bank to use tables. Maintain visible focus, meaningful labels, readable contrast, reduced motion, and zoom support.
