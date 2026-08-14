# Pantry package units

Implemented by PR #181 / issue #180.

## Default model

Every canonical ingredient resolves to a non-empty common U.S. retail package-form default through `scripts/pantry-package-defaults-core.js`.

Representative defaults include:

- pasta: `box`
- eggs: `carton`
- ground meat: `tray`
- fresh herbs: `bunch`
- spices: `jar`
- canned beans: `can`
- dry grains: `bag`
- frozen vegetables: `bag`
- dairy milk: `jug`
- plant milk: `carton`
- cooking coconut milk: `can`

These are product defaults, not immutable standards. Retail packaging varies by store and brand, so user choice always wins.

Available package suggestions include `each`, `pack`, `bag`, `box`, `case`, `carton`, `tub`, `bunch`, `tray`, `jar`, `can`, `bottle`, `pouch`, `loaf`, `jug`, `canister`, and `clamshell`, alongside the existing measurement units.

## Precedence

Unit resolution priority is:

1. remembered per-ingredient user preference
2. existing saved Pantry inventory unit
3. common package default

Preferences are stored under `blissful-pantry-unit-preferences` and use canonical ingredient slugs as keys. Explicit choices including `each` are meaningful and must be preserved.

## Inventory compatibility

A package default by itself must never make an ingredient count as on hand.

When a quantity is entered, the visible preferred/default unit is saved with the Pantry inventory quantity. When quantity is cleared, the unit preference remains in the separate preference store while the inventory entry returns to the legacy empty/`each` shape.

Older unit-only Pantry entries are migrated into the preference store and their empty inventory record is cleared so they no longer satisfy pantry-fit presence checks merely because a unit was saved.

Ingredient slugs and the existing `pantryInventory` schema are unchanged.

## Backup and restore

The Pantry package-unit runtime extends the existing local backup/export and restore/import flow to include `blissful-pantry-unit-preferences`.

## Validation

`tests/pantry-package-units.test.js` is invoked through the existing Pantry workspace test target. It loads the real ingredient catalog, verifies every canonical ingredient receives a supported non-empty package unit, checks representative package rules, and verifies preference precedence including an explicit remembered `each`.

Merged-main Validate #162 passed and reported package-unit coverage for all 528 current canonical ingredients.

## Browser acceptance

A hard-refresh browser smoke test should verify:

- untouched ingredients show sensible defaults;
- changing one ingredient's unit persists after navigation and refresh;
- choosing `each` persists and overrides the common default;
- entering quantity stores the visible unit;
- clearing quantity preserves the preference without making the ingredient on hand;
- backup export/import round-trips preferences.
