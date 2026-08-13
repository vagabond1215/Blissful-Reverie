# Current project handoff

This is the repository-level continuation note for future Blissful Reverie project chats. It should describe the current product state, current validation state, and immediate browser-review priorities. Do not reintroduce behavior described only in old issues or conversation history when it conflicts with this file and the current source.

## Development posture

- The site is still in active development and is not intended for public use yet.
- Treat screenshots and browser feedback as the source of truth for visual defects.
- Prefer direct `main` commits only for small, reversible corrections.
- Use a feature branch/PR for broad interaction or layout changes.
- Run the focused regression test plus full `npm test`; broad changes require PR Validate and merged-main Validate.
- Preserve existing local-first state and compatibility unless a product request explicitly changes the data model.

## Primary application destinations

The live primary navigation remains:

- Recipes
- Kitchen
- Pantry
- Meal Plan
- Family

Kitchen is a real destination and must remain independently navigable. Restock is a Pantry workflow, not a Kitchen replacement and not its own primary navigation destination.

Do not add mock-only navigation destinations, account controls, notification controls, or other decorative screenshot elements unless they have defined Blissful Reverie behavior.

## Pantry workspace

PR #175 / issue #174 reconciled the Pantry mockup from a separate project thread into the actual repository.

Current Pantry presentation:

- Pantry search remains in the top-right search area.
- The left rail is dedicated to Pantry filtering and is presented as separate `Categories`, `Tags`, and `Allergens` cards.
- Filter options retain the existing `pantryFilters.categories/tags/allergens` state and app filtering behavior.
- Filter cards show per-option counts and use progressive `Show more / Show less` disclosure.
- The vertical Pantry view is one continuous flat ingredient list; category section headings and category-card chrome are visually flattened.
- Nested category-list vertical scrollbars are removed in the vertical flow so the document is the scrolling surface.
- The Pantry header shows `Pantry` and the live item count as a compact `N items` badge.
- `+ Add Item` opens the existing Pantry Restock workflow.
- The header overflow affordance exposes the existing live Pantry action bar as a native popover rather than duplicating action state.
- Existing Lists, stock filtering, alphabetical/use sorting, favorites-only, and tags controls remain the owning controls underneath that overflow behavior.
- Compact Pantry rows remain `favorite | ingredient | quantity | unit | List` on the primary line.
- Tags consume a secondary line only when tags are enabled.
- Existing shopping/list/store/usage-history data and persistence remain intact.

The separate-thread screenshot included additional primary tabs and bell/profile decoration. Those were not added because the audit found no backing implementation or defined product behavior for them.

## Smart Shopping

Smart Shopping is a Pantry-owned, meal-plan-specific surface.

- Label: `Missing or Low Meal Plan Ingredients`.
- Missing ingredients come from currently planned recipes.
- Allowed substitutions already on hand do not count as missing when substitutions are enabled.
- Usage-based low-stock recommendations are retained only when the ingredient belongs to the current meal plan.
- Unrelated general pantry restock recommendations are filtered out of Smart Shopping.
- The old Shopping source selector and `Closest recipes` source are removed.
- Redundant source/missing-count/shopping-cycle explanatory prose is removed.
- Category/store grouping, recipe-reference visibility, copy behavior, store metadata, and the Smart Shopping entry in Lists remain available.

## Recipes discovery and recipe previews

The old `Cook now`, `Shopping candidates`, and missing-count `Almost ready` dashboard concepts are retired.

Current discovery surface:

- Label: `Discover new meals:`.
- It is always on; there is no Off / 1 ingredient / 2 ingredients threshold control.
- A recipe qualifies only when its substitution-aware pantry fit has zero missing ingredients.
- When substitutions are enabled, an allowed substitute already on hand counts as coverage.
- A recipe is treated as previously made when it appears on a past-dated meal-plan entry.
- Today/future meal-plan entries do not count as made yet.
- Previously made recipes are excluded from Discover new meals.
- Discovery recipe names are compact interactive chips.
- Activating a chip opens a recipe-card overlay without moving the live recipe card or intentionally changing underlying page position.
- The preview `Plan & shop` action forwards to the live recipe card scheduling workflow and restores the underlying scroll position.

Recipe-card ingredient lines use a fixed measurement/name grid so ingredient names align consistently. At the existing 641–920px single-wide-card range, Ingredients and Instructions render side-by-side; narrow mobile cards stack those sections.

## Family

Current Family behavior includes:

- `Manage Family` in the page-specific top-bar action area.
- Add/remove member management is centralized in that dialog.
- Trash removal requires permanent-data-loss confirmation.
- Birthday uses Month + Day selectors rather than a native year/date picker; February 29 remains representable.
- The primary member row is avatar, name, calorie target, birthday month, and birthday day.
- Diet, Allergies, and Dislikes are arranged as the secondary member fields.
- Clicking a member avatar opens a matrix picker containing initials and the available avatar choices; it does not cycle icons.
- Dislikes uses the ingredient catalog as clickable/searchable chips. Selected ingredient chips can be clicked again to remove them.
- Family dislike state continues to participate in recipe/scheduling conflict behavior.

## Top-bar conventions

- The left segmented primary navigation and page-specific controls are separate concepts.
- Page-specific controls use the shared dynamic/action area and consistent compact height.
- Pantry uses its mockup-derived header overflow for Pantry-specific actions while keeping the live existing controls as the owning state/action implementation.
- Recipes page actions and family-member recipe toggles share the Recipes dynamic action area.
- Page search belongs at the top-right where implemented rather than consuming the left filter rail.

## Validation and latest state

- PR #175 is merged/completed.
- Issue #174 is closed as completed.
- PR Validate #153 passed the full `npm test` suite.
- The merged-main Pantry workspace commit is `a52d5a0d16b711ae0d3f6475bed7ab5cb3f2d2d0`.
- Main Validate #154 passed on that commit.
- `npm test` includes the focused Pantry workspace regression suite in addition to existing data, matching, Pantry, productivity, backup, wiring, Restock, Lists, Family, Recipes/Family, top-bar, UI shopping, and discovery tests.

## Immediate next step

Do a browser smoke test after a hard refresh, with the Pantry screenshot as the visual reference.

Highest-value checks:

### Pantry

- left rail presents separate Categories / Tags / Allergens cards with readable counts
- Show more / Show less does not hide currently selected filters
- top-right Pantry search remains functional
- Pantry header shows the live item count
- `+ Add Item` opens Restock
- `⋮` exposes the existing Pantry controls and those controls still change Lists/stock/sort/favorites/tags correctly
- category headings/borders no longer split the ingredient list into cards in vertical mode
- rows remain compact and aligned
- optional tags only add height beneath the relevant row
- no nested vertical scrollbar appears inside the Pantry list
- Smart Shopping still appears in the intended Pantry/Lists locations

### Regression

- Kitchen loads as its own page
- Recipes Discover new meals chips open previews and preview Plan & shop works
- Family avatar picker and Dislikes ingredient chips work
- Manage Family removal confirms once and removes reliably
- moving among Recipes, Kitchen, Pantry, Meal Plan, and Family produces no console errors
- light/dark modes remain legible

If the deployed Pantry differs materially from the supplied screenshot after a hard refresh, use a new browser screenshot to drive the next visual correction rather than adding speculative CSS.
