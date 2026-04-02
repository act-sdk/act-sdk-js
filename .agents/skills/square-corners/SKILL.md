---
name: square-corners
description: Enforce PlanWiki's updated UI shape language use `rounded-sm` across shared primitives and composed product surfaces unless the user explicitly asks for a different corner treatment.
---

Apply this skill when building or restyling PlanWiki UI.

## Core rule

- Default shared primitives in `components/ui` to `rounded-sm`.
- Default composed PlanWiki surfaces outside `components/ui` to `rounded-sm`.
- Treat `rounded-sm` as the project style for workspace pages, widgets, cards, badges, chips, stats, tables, controls, and overlays that make up the product UI.
- Do not introduce `rounded-none`, `rounded-md`, `rounded-lg`, `rounded-xl`, or pill-shaped treatments unless the user explicitly requests them.

## What to preserve

- Keep the existing flat, minimal visual language.
- Prefer borders and spacing over decorative shape styling.
- Keep circular affordances that rely on `rounded-full` for their function or iconography.
- If a component comes from a shared UI primitive with `rounded-sm` defaults, preserve that shape at usage sites unless the user asks otherwise.

## When working on existing files

- Remove accidental corner overrides that flatten or over-round feature surfaces.
- Check usage sites, not just base components. A feature can still drift away from the default through local class overrides.
- Keep sidebar behavior and established layout patterns intact unless the user asks for structural changes.

## Quick checklist

- `components/ui`: `rounded-sm` by default
- Cards: `rounded-sm`
- Widget shells: `rounded-sm`
- Badges/chips/status pills: `rounded-sm`
- Buttons in workspace UI: `rounded-sm`
- Inputs, textareas, tables, dropdown surfaces: `rounded-sm`

If there is any ambiguity, use `rounded-sm`.
