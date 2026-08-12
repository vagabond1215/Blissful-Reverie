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

`index.html` loads `styles/app.css` as the static stylesheet entry point.

`styles/app.css` is now a small import wrapper, not the legacy generated stylesheet. It imports the legacy stylesheet first, then imports the reset layers so the browser blocks first paint on the neutral visual stack:

1. `styles/app-legacy.css`
2. `styles/meal-plan-affordance.css`
3. `styles/productivity.css`
4. `styles/base-theme.css`
5. `styles/meal-plan-sleek.css`
6. `styles/topbar-docked.css`
7. `styles/shopping-list-sleek.css`
8. `styles/ui-cleanup.css`
9. `styles/topbar-hover-fix.css`
10. `styles/dashboard-contrast.css`

`styles/app-legacy.css` is a direct copy of the previous generated `styles/app.css`. Keep it as the compatibility layer until the visual reset is consolidated.

`scripts/productivity-settings.js` still de-duplicates and dynamically ensures the same reset/feature stylesheets for compatibility with the existing settings startup flow. Those dynamic loads should not be the source of first paint; the static `styles/app.css` wrapper is now responsible for preventing the old magenta/green/sepia palette flash.

`styles/dashboard-contrast.css` is currently the final visual layer. It gives the productivity dashboard a light-gray workspace background and keeps the dashboard cards and shopping panel on white raised surfaces. `styles/topbar-hover-fix.css` remains the focused layer that suppresses legacy pill/oval hover chrome on the primary topbar segmented navigation. `styles/ui-cleanup.css` remains the final broad reset layer before these focused patches.

The legacy-color startup flash is currently only being reproduced on one PC Brave browser; Chrome and Brave mobile are not showing it. Defer additional flash-specific CSS changes unless the issue can be reproduced again after a fresh load/cache check.

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

### Topbar hover fix

- Added `styles/topbar-hover-fix.css`.
- Suppressed legacy topbar pseudo-elements, radius, shadows, transforms, and outlines that could draw the old oval/pill hover state over segmented tabs.
- Kept the stacked mobile menu behavior separate.

### Dashboard contrast

- Added `styles/dashboard-contrast.css`.
- Breaks up the pantry dashboard by setting the parent dashboard as a light-gray workspace.
- Keeps `Cook now`, `Almost ready`, `Shopping candidates`, and the smart shopping list on white raised surfaces.
- Adds dark-mode inversions for the same hierarchy.

### Static visual reset wrapper

- Copied the original generated `styles/app.css` blob to `styles/app-legacy.css`.
- Replaced `styles/app.css` with an import wrapper that loads `app-legacy.css` first and all reset layers afterward.
- This is the current strongest mitigation for legacy theme flash on page load.

## Recent direct-main product pass

### #141 — Shopping-list recipe-reference display options

- Added `scripts/shopping-reference-settings.js` as a focused companion module for smart-shopping reference display behavior.
- Added a `Show recipe names` checkbox under the smart shopping list.
- With no saved preference, references hide automatically for effectively single-recipe lists and show for multi-recipe lists.
- An explicit show/hide choice persists in localStorage under `blissful-shopping-recipe-references`.
- Copy-to-clipboard output follows the visible reference setting.
- Kept quantity aggregation, serving scaling, date filtering, pantry depletion, and shopping-source logic unchanged.
- Added wiring/pure-helper coverage to `tests/integration-wiring.test.js`.
- GitHub Actions `Validate` passed for implementation commit `af9de8a`.

## Current next step

### #142 — Staples and low-quantity shopping list source

Implement a separate smart-shopping source for pantry staples/common essentials and an option to include low-quantity pantry items. Keep it separate from recipe quantity aggregation and pantry depletion modeling.

## Known open follow-ups

### #142 — Staples and low-quantity shopping list source

- Add a smart-shopping mode for staples/common essentials such as pasta, cheese, eggs, meats, condiments, and other common ingredients.
- Include a setting or toggle for low-quantity pantry items, not only missing/no-quantity items.
- Keep separate from exact quantity aggregation and pantry depletion modeling.

### #143 — Recipe previews from pantry dashboard candidates

- Preferred behavior is an accessible hover/focus preview card for entries under `Cook now`, `Almost ready`, and `Shopping candidates`.
- Preview must stay inside the viewport, avoid covering the dish name, and support keyboard access.
- A simpler clickable-link fallback is acceptable but not preferred.

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
- pantry dashboard parent has enough contrast against `Cook now`, `Almost ready`, and `Shopping candidates`
- the old magenta/green/sepia generated palette does not visibly flash during page load
- light and dark theme modes stay legible
- meal-plan view retains functional date navigation, family filters, and D/W/M switching
- no console errors after navigation between Recipes, Kitchen, Pantry, Meal Plan, and Family

## Validation expectation

For direct-main connector commits, verify GitHub Actions `Validate` on the latest `main` commit. The workflow runs `npm test`.

If the connector cannot inspect the live visual result, stop and ask for screenshot feedback rather than making blind visual refinements.
