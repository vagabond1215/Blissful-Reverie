# Blissful Reverie Meal Planner

Blissful Reverie is a static, local-first meal planning workspace. It runs entirely in the browser with no backend, account, or build step.

## Setup

1. Clone or download the repository.
2. Open `index.html` in a modern browser.

For a local HTTP server instead of `file://`, run:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000`.

The repository has no production dependencies and does not require `npm install`.

## Checks

Run the complete validation and test suite:

```powershell
npm test
```

Run only catalog validation:

```powershell
npm run validate:data
```

Focused checks are also available:

```powershell
npm run test:validation
npm run test:matching
npm run test:pantry
npm run test:productivity
npm run test:wiring
```

## Architecture

- `index.html` defines the application shell and loads scripts in dependency order.
- `data/ingredients.js` and `data/recipes.js` expose the static catalogs as browser globals.
- `scripts/ingredient-matching.js` maps recipe ingredient text to canonical ingredient slugs.
- `scripts/productivity-tools.js` contains testable pantry, shopping-list, backup, dashboard, source-label, and starter-state helpers.
- `scripts/productivity-ui.js` renders badges, the pantry dashboard, and the smart shopping list from live state supplied by `scripts/app.js`.
- `scripts/productivity-onboarding.js` handles first-run setup and applies saved starter state without a normal reload.
- `scripts/productivity-settings.js` moves optional palette and holiday controls into the native `Advanced appearance` disclosure before app event handlers are bound.
- `scripts/app.js` owns in-memory state, localStorage persistence, recipe rendering, filters, pantry, family, and meal planning.

User data remains in browser localStorage. The primary state key is `blissful-app-state`; meal plans, favorites, theme preferences, holiday settings, and measurement preferences use separate version-stable keys. There is no network synchronization.

## Data Schema

Ingredient entries require:

- a stable lowercase hyphenated `slug`
- a non-empty `name`
- a supported `category`
- a `tags` array
- an optional `aliases` array

Do not rename existing ingredient slugs without a localStorage migration. Supported category values are centralized in `scripts/data-validation.js`.

Recipe entries require:

- a unique lowercase hyphenated `id`
- a unique `name`
- positive `baseServings`
- non-empty `ingredients` and `instructions`
- `equipment`, `tags`, and canonical `allergens` arrays
- non-negative calories, protein, carbohydrates, and fat per serving

The app also creates ingredient-coverage and collection recipes at runtime. Source badges distinguish curated recipes, generated templates, and ingredient ideas.

## Extending The Planner

Add catalog data directly to the relevant file and run `npm test`. Keep ingredient slugs stable, avoid duplicate display names, use canonical allergen values (`fish` or `shellfish` rather than `seafood`), and extend validation before introducing a new schema value.
