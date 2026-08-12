# Current project handoff

This file exists so another project chat can inspect the repository and continue the current work without relying on hidden chat history.

## Current development posture

- The site is still in development and is not intended for public use yet.
- Prefer direct connector commits to `main` when the change is small, reversible, and safe.
- Avoid branches unless the change is risky, broad, hard to review, or blocked by `main` protections.
- Runtime functionality must not degrade while visual work is in progress.
- Visual continuity with the old GPT/Codex-generated theme is not required.

## Current visual direction

The old generated burgundy/teal/brown/gold theme is intentionally being replaced.

Current short-term target:

- clean grayscale baseline
- light mode: white, light gray, mid gray, dark gray, black
- dark mode: inverted grayscale surfaces and text
- no sepia/warm cast for the temporary base
- lower visual noise
- fewer nested containers
- lighter borders
- flatter shadows
- clearer text contrast
- simple segmented controls
- preserve behavior while visual layers are reset

Deep theme research and curated palettes may happen later. Until then, do not attempt to preserve the old token names semantically; old token names may remain as compatibility aliases only.

## Current visual stylesheet stack

`index.html` still loads the legacy stylesheet first:

- `styles/app.css`

`scripts/productivity-settings.js` dynamically loads additional visual reset and feature styles. The current intended order is:

1. `styles/meal-plan-affordance.css`
2. `styles/base-theme.css`
3. `styles/meal-plan-sleek.css`
4. `styles/topbar-docked.css`
5. `styles/shopping-list-sleek.css`
6. `styles/ui-cleanup.css`

`styles/ui-cleanup.css` must remain the final visual layer unless a later pass intentionally replaces it. It currently overrides the temporary theme toward neutral grayscale and fixes topbar/card contrast issues.

## Recent direct-main visual passes

### Clean base theme

- Added `styles/base-theme.css`.
- Flattened legacy glass/gradient/burgundy/teal/brown theme output.
- De-emphasized advanced theme controls without deleting them.

### Meal-plan sleek pass

- Added `styles/meal-plan-sleek.css`.
- Reduced meal-plan padding and nested chrome.
- Standardized meal-plan date/family/D-W-M selector heights.
- Converted Day/Week/Month display to D/W/M.

### Docked topbar

- Added `styles/topbar-docked.css`.
- Docked top navigation to a full-width top rail.
- Repositioned settings/mobile popovers to open downward inside the viewport.

### Segmented nav cleanup

- Refined topbar settings/menu overlap.
- Converted top nav to a segmented-control model with flat internal edges.

### Shopping-list formatting

- Added `styles/shopping-list-sleek.css`.
- Made shopping-list categories wider and item rows readable.
- Stacked recipe notes under ingredient names.

### Final grayscale cleanup

- Added `styles/ui-cleanup.css`.
- Replaced the temporary sepia look with grayscale light/dark tokens.
- Removed topbar button containers around settings and segment controls.
- Improved card text contrast.
- Standardized topbar button heights.

## Known open follow-up

Issue #141 tracks smart shopping-list recipe-reference display options.

Intent:

- Recipe-reference notes are useful for multi-recipe lists.
- Recipe-reference notes are redundant when a list effectively comes from one recipe.
- Add a user-facing option later to show/hide references.
- Copy-to-clipboard output should match the visible reference mode.
- Do not combine this with quantity aggregation, serving scaling, date filtering, or pantry depletion modeling.

## Visual work principles from user direction

- The user has no attachment to the current colors, theme names, or old visual conventions.
- Functionality matters more than preserving old visual output.
- It is acceptable to remove, override, or neutralize generated-theme styling.
- Favor clean, clear, less busy UI.
- Prefer standard grayscale or another simple neutral baseline until deeper palette research is done.
- Remove redundant containers where possible, especially containers that only wrap a full child container.
- Prefer direct drawing of controls on parent surfaces when it reduces visual clutter.
- Treat user screenshots as the primary source for visual defects because connector cannot reliably inspect the rendered GitHub Pages site.

## Browser review checklist for the current visual reset

After each visual pass, hard refresh the deployed GitHub Pages app and inspect:

- topbar settings gear draws directly on the rail, without an extra button box
- topbar nav tabs render as one segmented group with flat internal edges
- topbar hover state does not create stray oval or duplicate button surfaces
- left settings menu opens downward and remains inside viewport
- right-side topbar controls visually match the left/top segmented control height
- recipe card text is readable in the current light theme
- ingredient quantities are readable and not near-white on white
- smart shopping list category columns do not collapse item names into single letters
- light and dark theme modes stay legible
- meal-plan view retains functional date navigation, family filters, and D/W/M switching
- no console errors after navigation between Recipes, Kitchen, Pantry, Meal Plan, and Family

## Validation expectation

For direct-main connector commits, verify GitHub Actions `Validate` on the latest `main` commit. The workflow runs `npm test`.

If the connector cannot inspect the live visual result, stop and ask for screenshot feedback rather than making blind visual refinements.
