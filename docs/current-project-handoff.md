# Current project handoff

This file is the repository-level continuation note for future project chats. It should describe the current product state, current validation state, and immediate next step rather than preserve obsolete UI behavior.

## Current development posture

- The site is still in development and is not intended for public use yet.
- Prefer direct connector commits to `main` for small, reversible changes.
- Use a feature branch and PR for broad interaction changes.
- Preserve runtime behavior while visual cleanup continues.
- Visual continuity with the old generated burgundy/teal/brown/gold theme is not required.
- Treat screenshots/browser feedback as the source of truth for visual defects because the connector cannot reliably inspect the rendered application.

## Current visual direction

The active direction is a clean grayscale baseline with reduced chrome:

- white/light-gray/mid-gray/dark-gray/black in light mode
- inverted grayscale surfaces/text in dark mode
- flatter shadows and lighter borders
- fewer nested containers
- compact segmented controls
- strong text contrast
- lower vertical density where controls remain readable

The legacy-color startup flash has only been reproduced on one PC Brave browser. Chrome and Brave mobile did not reproduce it. Do not add more flash-specific CSS unless the problem reproduces after a fresh cache/site-data check or new screenshots show it clearly.

## Stylesheet/runtime structure

`index.html` loads `styles/app.css` as the static stylesheet entry point. `styles/app.css` is an import wrapper over the legacy compatibility layer plus focused reset/feature layers.

Important current layers include:

- `styles/app-legacy.css` — compatibility copy of the old generated stylesheet
- `styles/base-theme.css` — grayscale base
- `styles/meal-plan-sleek.css`
- `styles/topbar-docked.css`
- `styles/shopping-list-sleek.css`
- `styles/ui-cleanup.css`
- `styles/topbar-hover-fix.css`
- `styles/dashboard-contrast.css`
- `styles/shopping-management.css`
- `styles/pantry-tag-refine.css`
- `styles/recipe-page-actions.css`
- `styles/shopping-readiness-refine.css`

`scripts/productivity-settings.js` dynamically ensures focused compatibility assets in the existing startup flow. New UI work should prefer changing the owning renderer/module rather than stacking another DOM patch when the behavior can be simplified at the source.

## Current Pantry / Smart Shopping behavior

Smart Shopping now has one responsibility: planned-meal shopping.

- Panel label: `Missing or Low Meal Plan Ingredients`.
- The old shopping source selector is removed.
- `Closest recipes` is no longer a Smart Shopping source.
- Missing ingredients come from current planned recipes using the existing substitution-aware pantry-fit logic.
- If substitutions are enabled and an allowed substitute is on hand, the requested ingredient does not count as missing.
- Usage-based low-stock recommendations are retained only when that ingredient belongs to the current meal plan.
- Unrelated pantry restock recommendations are filtered out of this list.
- Category/store grouping remains available.
- Recipe-reference visibility remains available and still controls copied output.
- Store/package purchase metadata remains available through the shopping-management layer.
- Smart Shopping still has a live entry/mirror in Pantry Lists.
- Redundant missing-count/source/restock-cycle prose was removed from the panel header.

Compact Pantry rows were also tightened vertically. Item names and controls no longer carry the previous excess vertical padding; favorite, quantity, unit, and List controls remain usable, and tags can still occupy the secondary row.

## Current Recipes readiness behavior

The old three-group pantry recipe dashboard was simplified.

- `Cook now` was removed because the Recipes Pantry-only filter already serves that use case.
- `Shopping candidates` was removed as a separate group.
- `Almost ready` is the only readiness candidate surface.
- The Recipes top action bar has a readiness threshold that cycles:
  - `Off`
  - `1 ingredient`
  - `2 ingredients`
- Default threshold is `2 ingredients`.
- `Almost ready` contains recipes whose substitution-aware missing count is between 1 and the active threshold.
- Allowed on-hand substitutions do not count as missing when substitutions are enabled.
- Recipe names are compact chips.
- Activating a chip opens an overlay containing a cloned meal card.
- The live recipe card is not moved, and opening/closing the preview does not intentionally change page layout or scroll position.
- The preview is keyboard-activatable and dismissible.

This revised interaction superseded the older #143 hover-preview proposal.

## Recent merged product passes

### #141 — Shopping recipe-reference display

- Added `scripts/shopping-reference-settings.js`.
- `Show recipe names` can be persisted in localStorage.
- Automatic default hides references for effectively one-recipe lists and shows them for multi-recipe lists.
- Copy output follows the visible reference mode.

### #142 — Usage-based replenishment and store-aware shopping

Merged through PR #146.

- Added `scripts/shopping-management.js` and `styles/shopping-management.css`.
- Shopping cadence, category/store grouping, usage history, recommended stock, store profiles, package sizes, and managed copy output are supported.
- Pantry quantity decreases can build usage history; restocking/increases are not counted as consumption.
- The original general automatic-restock engine still exists, but the Smart Shopping presentation now filters those recommendations to current meal-plan ingredients.

### #144 — Guided Pantry restock

Merged through PR #145.

- Restock is the primary exposed stock-entry workflow instead of the old Kitchen destination.
- Restock opens a near-full-screen category-by-category dialog.
- Next/category navigation commits the current category; Finish saves and closes.
- Zero/blank quantities remove current pantry stock rather than storing misleading zero-quantity entries.
- Existing equipment/Kitchen data remains in stored state for backward compatibility.

### #167 / PR #168 — Shopping ownership + Recipes readiness simplification

Merged to `main` as `075aff10d3097f1238d9d4f399ad72f29ca71993`.

- Removed the Smart Shopping source selector and closest-recipes shopping behavior.
- Renamed Smart Shopping to `Missing or Low Meal Plan Ingredients`.
- Removed redundant Smart Shopping explanatory prose.
- Scoped low-stock recommendations to ingredients referenced by planned meals.
- Removed `Cook now` and merged the former shopping-candidate concept into `Almost ready`.
- Added the Recipes `Off / 1 ingredient / 2 ingredients` threshold.
- Added recipe-name chips and cloned meal-card overlay previews.
- Tightened compact Pantry row padding.
- Added `tests/shopping-readiness-refine.test.js` plus updated wiring expectations.
- PR Validate and merged-main Validate both passed.

### #143 — Recipe previews

Closed as completed because the revised #167/#168 UX replaced the original three-dashboard-group hover-preview concept with keyboard-activatable recipe chips and a non-layout-shifting overlay preview.

## Current issue state

There are no open GitHub issues at the time of this handoff refresh.

Do not invent a new implementation target solely to keep development moving. Use browser feedback and the next explicit product request to establish the next issue/step.

## Current next step

### Browser smoke test of the merged Shopping / Almost Ready pass

Hard refresh the deployed app and verify the merged interaction in both desktop and mobile layouts. The highest-value checks are:

#### Pantry density

- compact item rows are visibly shorter vertically
- item names do not have extra blank space above them
- favorite, quantity, unit, and List controls remain aligned and usable
- tag rows do not create accidental large gaps

#### Smart Shopping

- panel reads `Missing or Low Meal Plan Ingredients`
- no source chooser is present
- no `Closest recipes` option is present
- old missing-count/source/shopping-cycle explanatory paragraphs are gone
- planned-meal missing ingredients appear automatically
- an on-hand allowed substitute prevents the original ingredient from being counted as missing when substitutions are enabled
- low-stock rows appear only for ingredients used by the current meal plan
- unrelated usage-based restocks do not leak into Smart Shopping
- Category / Store grouping still works
- recipe-reference visibility still works
- Copy list matches the visible/managed list
- Lists still exposes Smart Shopping correctly

#### Recipes / Almost Ready

- there is no separate `Cook now` dashboard group
- there is no separate `Shopping candidates` group
- `Almost ready` is the only readiness candidate area
- the top-bar readiness control cycles `Off` → `1 ingredient` → `2 ingredients` → `Off`
- Off hides readiness candidates
- 1 ingredient only shows recipes missing exactly one ingredient
- 2 ingredients shows recipes missing one or two ingredients
- substitution-aware counts match the recipe-card pantry status
- recipe names render as compact chips
- clicking/keyboard-activating a chip opens a recipe-card preview overlay
- opening/closing the preview does not visibly move the underlying recipe grid or change its scroll position
- Escape/close behavior works and focus returns sensibly

#### General regression

- no console errors while moving among Recipes, Pantry, Meal Plan, Family, and Restock
- light/dark modes remain legible
- topbar segmented controls remain stable
- the legacy generated color palette does not visibly flash on a normal fresh load

## Validation expectation

- Small direct-main connector commits: verify GitHub Actions `Validate` on the resulting `main` commit.
- Broad interaction changes: use a feature branch/PR and require PR `Validate` before merge, then verify merged-main `Validate`.
- `Validate` runs `npm test`.
- If a problem is visual-only and the connector cannot inspect it, stop patching blindly and request screenshot/browser evidence.
