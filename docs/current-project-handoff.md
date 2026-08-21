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

## August 2026 integration state

The current integration combines the warm-kitchen theme/mobile hardening, row-only Pantry runtime, and centralized persistence work, then completes the render-scale pass:

- Recipes render 24 summary cards per page and expose total-match metadata independently of the cards currently mounted.
- Ingredients, instructions, equipment, allergens, nutrition, substitutions, and notes are built on the first expansion of one recipe; filter/search changes return the new result set to a collapsed, lazy state.
- Pantry renders no hidden `.pantry-unit-profile` or `.ingredient-processes` trees. Quantity plus the validated row unit is the visible source of truth; item settings owns compatible conversions and processes.
- Visible `Buy as` controls are retired. Package conversion fields remain internal only for legacy/profile compatibility.
- The persistence registry loads before productivity backup tools and directly owns 21 meaningful keys, validation, unknown-key exclusion, and transactional rollback.
- Feature runtimes no longer wrap `createBackup()` / `restoreBackup()` independently.
- The full local `npm test` suite passes with 554 validated ingredients and 314 curated recipes. The existing warning that 258 canonical ingredients are not used by curated recipes before runtime coverage generation remains informational.

Measured desktop browser state after a hard refresh:

- Recipes: 664 total matches, 24 mounted cards, 0 initial detail bodies, about 3,176 DOM elements, and about 7,310 CSS px document height at 1440 × 900.
- Opening one recipe creates exactly one detail body; changing search/filter state clears expanded detail state.
- Pantry: 554 rows, 0 hidden unit-profile panels, 0 hidden process panels, and about 24,841 DOM elements at 1440 × 900.
- Light recipe card colors measured `rgb(255, 252, 247)` / `rgb(43, 37, 34)`; dark cards and item settings measured `rgb(33, 27, 29)` / `rgb(247, 238, 231)`.
- Pantry item settings trapped Tab/Shift+Tab, closed with Escape, restored trigger focus, and created process UI only inside the open dialog.

The final 1440/375 light/dark matrix was completed on the integrated branch:

- At 375 × 812, Recipes measured 360 CSS px document width against a 375 px viewport in both themes, with a 325 px bounded filter tray, 24 mounted cards, 0 initial detail bodies, and about 16,520–17,205 CSS px document height.
- At 375 px, Pantry measured 375 CSS px document width; its topbar search was not rendered offscreen. Lists, Restock, Pantry Item Settings, and Manage Family panels measured 355–368 px wide and remained inside the viewport.
- Light surfaces measured warm cream/card values with charcoal text; dark cards and dialogs measured `rgb(33, 27, 29)` / `rgb(247, 238, 231)`.
- A full session that had already mounted the 554-row Pantry retained about 26,468–27,511 total DOM elements while Recipes still mounted only its 24-card page and no initial detail bodies. This remains substantially below the prior six-figure DOM baseline.
- Recipes, Pantry, Lists, Restock, Kitchen, Meal Plan, Family/Manage Family, Pantry Item Settings, and Settings/Backup opened and remained legible across the matrix. No browser console errors or warnings were recorded.
- The matrix exposed a re-render lifecycle defect in the Pantry `+ Add Item` control. Its Restock activation is now delegated from the stable document owner, so pointer activation survives header re-rendering.

## Immediate next step

Publish the integration branch as a draft PR, require its `Validate` check to pass, and review the combined diff before marking it ready. Re-run the browser smoke matrix after any review-driven UI change.

Generated `Ingredient Spotlight` / `Spotlight Skillet` entries still share the runtime recipe catalog path. Separating generated ideas from the trusted curated catalog remains a follow-up because that change affects planning, matching, and shopping behavior beyond this render-scale integration.
