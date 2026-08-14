# Next 10 product tasks — historical roadmap

This document records the recovery roadmap that began around PR #118. It is retained as implementation history, not as the current handoff or source of truth for what the UI should expose today.

## Completed recovery work

1. **Recipe and ingredient schema validation** — reusable validation and the `npm run validate:data` CLI.
2. **Ingredient and pantry matching tests** — matching, pantry-fit, validation edge cases, productivity, and application wiring.
3. **Export/import backup** — localStorage backup and restore helpers plus Settings controls.
4. **Recipe readiness analysis** — pantry-fit and missing-ingredient analysis used by planning/shopping workflows.
5. **Meal-plan scheduling from recipes** — calendar actions and schedule flow.
6. **Generated-content labeling** — curated recipes, generated templates, and ingredient ideas can be distinguished in code/data.
7. **Settings consolidation** — advanced appearance controls moved deeper into Settings.
8. **First-run setup** — starter pantry/preferences and schema-compatible persistence.
9. **Pantry workspace refinement** — compact rows, list assignment, Restock, tag/filter controls, and item settings.
10. **Family workspace refinement** — compact member editing and family-management interactions.

## Current architecture notes

The application is still a static local-first app with a large `scripts/app.js` core and several feature runtimes loaded around it. New work should avoid adding another parallel UI layer when an existing runtime can be simplified or retired.

The old Dashboard summary and shopping-source-mode concepts described by earlier versions of this roadmap are no longer acceptance requirements. Current browser validation should follow `docs/browser-smoke-test-checklist.md` and the rendered product, not historical roadmap wording.

## Current priorities

- Keep light/dark theme aliases consistent across late-loaded feature styles.
- Keep the 375 px layout within the viewport and move dense filter/search UI into compact mobile treatments.
- Paginate or virtualize recipe results and render expensive recipe details only when needed.
- Keep Pantry unit/process controls dialog-owned instead of creating hidden per-row panels.
- Treat generated ingredient ideas as discovery content rather than equal-trust canonical recipes.
- Centralize persistent localStorage keys and backup validation.
- Replace source-string assertions with behavioral tests as touched areas are refactored.
- Keep documentation synchronized with the current Pantry, Family, Lists, Restock, and recipe workflows.

## Handoff rule

Do not use a PR number in this file as a "latest PR" marker. Git history and the active pull-request list are the authoritative record for current repository state.
