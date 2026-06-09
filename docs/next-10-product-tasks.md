# Next 10 product tasks

This document records the implemented state of the recovery roadmap on PR #118.

## Status

1. **Recipe and ingredient schema validation** - implemented with reusable validation in `scripts/data-validation.js` and the `npm run validate:data` CLI.
2. **Ingredient and pantry matching tests** - implemented across matching, pantry-fit, validation edge-case, productivity, and application-wiring tests.
3. **Export/import backup** - implemented as tested localStorage backup and restore helpers in `scripts/productivity-tools.js`; a dedicated settings UI remains optional follow-up work.
4. **Dashboard summary** - implemented above the recipe grid with Cook now, Almost ready, and Shopping candidates groups.
5. **Missing-ingredient counts** - implemented on recipe cards and dashboard entries using live pantry state and the app substitution graph.
6. **Shopping list generation** - implemented as a categorized smart shopping panel with recipe references and copy support.
7. **Add recipe to meal plan from cards** - implemented by the existing calendar action on every recipe card.
8. **Generated recipe labels** - implemented on recipe cards for curated recipes, generated templates, and ingredient ideas.
9. **Move theme controls deeper into settings** - implemented with the native keyboard-accessible `Advanced appearance` disclosure. Controls retain their existing IDs and event handlers.
10. **First-run setup** - implemented for valid missing-state detection, starter pantry/preferences, schema-compatible persistence, and same-page application.

## Integration

The application shell loads data, matching, productivity helpers, settings, onboarding, productivity UI, theme diagnostics, and the main app explicitly in `index.html`.

`scripts/app.js` calls the productivity renderer with live recipes, match maps, substitution data, and pantry state after it renders recipe cards. This avoids mutation observers, duplicate matching indexes, and localStorage polling while keeping the large app shell changes small.

## Follow-up candidates

- Add a visible backup import/export control that uses the existing tested helpers.
- Let users choose meal-plan recipes as the shopping-list source instead of the current closest-recipe limit.
- Split additional app-shell domains into tested modules only when a focused feature change requires it.
