# Browser smoke-test checklist

Use this checklist for recipe, pantry, family, meal-plan, backup/settings, and local-persistence changes. Run it alongside automated tests; source-string assertions are not a substitute for this browser pass.

## When to run

Run the checklist for pull requests that touch `scripts/app.js`, feature runtimes, persistence/backup code, shared theme/layout CSS, or recipe, Pantry, Family, Meal Plan, Lists, Restock, Settings, or search/filter behavior.

Docs-only changes do not need a browser pass unless they document browser behavior.

## Setup

1. Start from a clean checkout of the PR branch.
2. Run `npm test` and any focused tests for the changed area.
3. Start the local app.
4. Open the browser developer console before interacting.
5. Test with representative localStorage data, including non-empty Pantry, Family, Lists, and Restock history where applicable.
6. Record browser, viewport, theme, DOM count observations, and console status in the PR.

## Required matrix

Check each primary surface at:

- desktop: approximately 1440 px wide, light mode
- desktop: approximately 1440 px wide, dark mode
- mobile: 375 px wide, light mode
- mobile: 375 px wide, dark mode

Use 768 px/tablet when a change specifically affects breakpoint transitions.

## Baseline render and navigation

- App loads without a blank screen or uncaught console error.
- Recipes, Kitchen, Pantry, Meal Plan, and Family navigation works.
- The active tab is visible and keyboard reachable.
- Light/dark mode switches without white-on-white or dark-on-dark surfaces.
- Focus rings remain visibly high contrast.
- No page has document-level horizontal overflow at 375 px.

## Recipes

- Search updates results and the result badge.
- Ingredient, tag, allergy, equipment, family, favorites, Pantry-only, and substitution filters still affect results where applicable.
- Mobile filter UI is bounded and does not place thousands of pixels of controls before recipe content.
- Recipe cards show enough summary information to choose a recipe without requiring every expensive detail to be rendered up front.
- Opening a recipe/detail surface exposes ingredients, instructions, equipment, allergens, nutrition, notes, serving controls, favorite action, and scheduling behavior as applicable.
- Calendar/schedule action opens and closes cleanly and preserves keyboard focus.

### Recipe scale check

Record:

- number of matching recipes
- number of recipe cards initially in the DOM
- approximate total DOM element count after first render
- whether changing filters causes a long main-thread stall

Initial DOM card count should be bounded by pagination/virtualization rather than equal to the entire matching catalog.

## Pantry

- Pantry search/filter controls work on desktop.
- Mobile Pantry does not place the topbar search off-screen; the compact mobile treatment remains usable.
- Quantity edits persist.
- The existing unit dropdown is the inventory-unit control used by row behavior.
- Favorite, stock-state, sort, Tags, Lists, Restock, and item-settings actions remain usable.
- List selector assigns/removes an item without changing unrelated fields.
- Lists dialog shows list name/store behavior correctly; an omitted list name falls back to store name.
- Empty lists are visually de-emphasized and item counts reflect unique items.
- Item Settings opens with one dialog-owned unit/process UI; there are no hidden `.pantry-unit-profile` or `.ingredient-processes` panels created per Pantry row.
- Item Settings closes on Escape, restores focus, and traps Tab/Shift+Tab while open.

## Restock

- Restock opens from Pantry, not Kitchen.
- Existing stock history affects the intended Restock ordering/history display.
- Completing Restock updates Pantry quantities without losing units.
- `blissful-pantry-stock-history` survives backup export/import.

## Family

- Family cards are readable in light and dark modes.
- Name, target, birthday, allergy/diet/preference controls remain usable.
- Manage Family dialog opens/closes, restores focus, and does not overflow the mobile viewport.
- Removing a member updates related member filters without corrupting Pantry or Meal Plan state.

## Meal Plan

- Scheduling a recipe adds it to the intended date.
- Day, week, and month views remain usable.
- Family member and guest attendance controls work.
- Removing planned entries works where controls are shown.
- Family filters and macro summary controls remain usable when family members exist.

## Lists and shopping data

- Pantry Lists are the current list-management surface; do not require retired shopping-source-mode controls.
- Instacart/default list behavior remains intact.
- Creating a list with no explicit name uses its store name for display.
- Per-item store data and list membership survive navigation and reload.

## Backup and persistence

- Settings exposes Local backup controls.
- Export produces valid Blissful Reverie JSON.
- Backup includes meaningful registered local data, including Pantry Lists, shopping settings/profiles, Pantry usage, inventory-unit profiles, family dislikes, Pantry view settings, and Restock stock history when present.
- Invalid registered values are rejected before restore mutates storage.
- Successful import restores the registered values and reload behavior remains understandable.
- Failed restore does not leave a partially applied registered-data set.

## Accessibility smoke

- Keyboard focus reaches topbar navigation, search/filter actions, Lists, Restock, item settings, Family management, backup controls, and Meal Plan actions.
- Toggle buttons expose pressed/selected state.
- Dynamic status messages remain perceivable.
- Dialogs close with Escape where supported.
- Modal dialogs trap focus while open and restore focus on close.
- Hidden controls are not keyboard reachable.

## Regression sweep

Before finishing, verify:

- recipe search and filters
- Pantry search/filter/sort/favorites
- Pantry quantities and units
- Lists and Restock
- item-settings unit/process operations
- Kitchen inventory toggles
- Family member editing/management
- Meal Plan add/remove flow
- onboarding
- backup import/export
- settings/theme controls

## PR reporting template

```md
## Browser smoke test

- Browser:
- Desktop light (1440): pass/fail
- Desktop dark (1440): pass/fail
- Mobile light (375): pass/fail
- Mobile dark (375): pass/fail
- Console errors/warnings:
- Document scroll width at 375:
- Initial recipe cards in DOM / matching recipes:
- Approx. total DOM elements:
- Recipes/search/filters:
- Pantry/Lists/Restock/item settings:
- Family:
- Meal Plan:
- Backup/persistence:
- Keyboard/focus:
- Notes/caveats:
```

## Known limits

This is a manual smoke checklist. It does not replace automated validation, data tests, targeted behavioral tests, or performance profiling. When a smoke run reveals a regression caused by the current change, fix it in the same focused branch before merge.
