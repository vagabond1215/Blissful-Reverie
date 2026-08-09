# Browser smoke-test checklist

Use this checklist for productivity UI, meal-planning, pantry, backup, settings, onboarding, and smart shopping-list changes. It is intended for manual browser verification alongside automated `npm test` coverage.

## When to run

Run this checklist for pull requests that touch any of these areas:

- `scripts/app.js`
- `scripts/productivity-ui.js`
- `scripts/productivity-tools.js`
- `scripts/productivity-backup.js`
- `scripts/productivity-settings.js`
- `scripts/productivity-onboarding.js`
- `styles/app.css`
- `styles/productivity.css`
- recipe, ingredient, pantry, meal-plan, backup, onboarding, settings, or shopping-list behavior

Docs-only changes do not need this checklist unless they document browser behavior.

## Setup

1. Start from a clean checkout of the PR branch.
2. Install dependencies if needed.
3. Run the automated checks requested by the PR.
4. Start the local app.
5. Open the browser developer console before interacting with the app.
6. Begin from a representative localStorage state or create one during the test.

Record the browser, viewport sizes, and whether the console stayed clean in the PR body.

## Baseline render

- The app loads without a blank screen.
- The console shows no uncaught errors.
- Recipe cards render.
- Dashboard summary renders above the recipe grid.
- Recipe readiness badges render on cards and dashboard entries.
- Navigation between Meals, Pantry, Kitchen, Family, and Meal Plan views works.
- Light/dark mode controls still work.
- Advanced appearance settings can open and close.

## Onboarding

- First-run onboarding appears only when appropriate for missing or invalid starter state.
- Starter pantry/preferences can be applied without a page error.
- Dismissing or completing onboarding does not block recipe rendering.
- Existing valid state does not unexpectedly reset.

## Backup controls

- Settings includes the Local backup disclosure.
- Export backup downloads a JSON backup file or shows a clear success message.
- Import backup opens the file picker.
- Invalid backup input shows a clear failure state and does not crash the page.
- Successful import shows confirmation and reload behavior as expected.

## Pantry and substitutions

- Pantry search and filters still work.
- Marking pantry items as owned updates recipe readiness.
- Quantity and unit edits persist visually after interaction.
- Favorite pantry item controls still toggle.
- Substitutions can be enabled or disabled where available.
- When substitutions are enabled, acceptable owned substitutes affect readiness and missing-ingredient lists.

## Meal plan

- Recipe cards expose the calendar action for adding recipes to the meal plan.
- The schedule dialog opens, validates date and time, and closes cleanly.
- Family member and guest controls in the schedule dialog remain usable.
- Added meals appear in day, week, and month meal-plan views as applicable.
- Removing planned entries works where remove controls are shown.
- Empty meal-plan states are understandable and non-broken.
- Meal-plan family filters and macro summary controls remain usable when family members exist.

## Smart shopping list

Test both source modes.

### From meal plan

- Add at least two recipes to the meal plan.
- Open the smart shopping list.
- Confirm From meal plan is selected by default when valid planned recipes exist.
- Confirm missing ingredients come from planned recipes.
- Confirm recipe references appear for missing ingredients where expected.
- Add pantry items that satisfy at least one missing planned ingredient.
- Confirm owned ingredients disappear from the missing list.
- Enable substitutions when available and confirm substituted owned ingredients affect the missing list.
- Remove all planned meals and confirm the empty state is clear and non-broken.

### Closest recipes

- Switch to Closest recipes.
- Confirm recipe-based missing ingredients still render.
- Confirm pantry updates affect this source mode.
- Confirm copy-list behavior still includes visible items from this source.

### Copy feedback

- Copy a non-empty shopping list.
- Confirm visible copy feedback appears.
- Confirm repeated copy attempts do not duplicate controls or produce console errors.
- Confirm empty states do not offer misleading copy success.

## Responsive layout

Check at least these widths:

- narrow mobile width around 375 px
- medium tablet width around 768 px
- desktop width at 1024 px or wider

For each width:

- No controls overlap.
- Source-mode controls remain usable.
- Shopping-list category groups remain readable.
- Meal-plan controls remain reachable.
- Settings and backup disclosures remain usable.

## Accessibility smoke

- Keyboard focus reaches source-mode controls, copy controls, settings disclosures, backup controls, and meal-plan actions.
- Toggle buttons expose the expected pressed/selected state.
- Status messages for backup and copy feedback are perceivable.
- Dialogs close with Escape where supported.
- No focus trap or hidden-control dead end is introduced.

## Regression sweep

Before finishing, verify these surfaces still work:

- dashboard summary
- recipe readiness badges
- meal filters
- pantry filters
- kitchen inventory toggles
- family member controls
- meal-plan add/remove flow
- onboarding
- backup import/export controls
- settings disclosures
- theme controls
- smart shopping-list source switching

## PR reporting template

Include this section in PR bodies after running the checklist:

```md
## Browser smoke test

- Browser:
- Viewports checked:
- Console errors: none / describe
- Dashboard and badges:
- Onboarding:
- Backup controls:
- Settings/theme controls:
- Pantry updates:
- Substitutions:
- Meal-plan add/remove:
- Smart shopping list — From meal plan:
- Smart shopping list — Closest recipes:
- Copy feedback:
- Responsive layout:
- Accessibility smoke:
- Notes/caveats:
```

## Known limits

This checklist is manual. It does not replace automated validation, data tests, or focused unit/integration tests. If a browser smoke run finds a bug, fix that bug in a separate focused implementation branch unless it is directly caused by the current PR.
