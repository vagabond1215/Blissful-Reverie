# Pantry inventory and package units

The Pantry unit model has evolved beyond the original package-default implementation from PR #181 / issue #180. This document describes the current compatibility model.

## Current model

Canonical ingredients can still resolve a common U.S. retail package-form default through `scripts/pantry-package-defaults-core.js`, but Pantry inventory is tracked with validated stock units from `scripts/inventory-units-core.js`.

The visible Pantry row unit control represents the inventory/stock unit. Package forms are conversion metadata used when a package quantity must be translated into that stock unit; they are not a second competing row-level quantity unit.

Representative package defaults include:

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

Retail packaging varies by store and brand, so defaults are hints rather than immutable standards.

## Inventory-unit profiles

Active custom conversion profiles are stored under `blissful-inventory-unit-profiles`. A profile can define:

- the stock unit used for normalized Pantry inventory math;
- an optional package/purchase unit used for conversion;
- the number of stock units represented by one package;
- compatible equivalents used when converting recipe or inventory quantities.

`blissful-pantry-unit-preferences` belongs to the legacy package-unit preference model and is retained only as migration/compatibility data where the migration runtime still encounters it.

## Presence semantics

A package default, unit preference, or conversion profile by itself must never make an ingredient count as on hand. Pantry presence requires inventory quantity/state, not merely unit metadata.

Ingredient slugs and the `pantryInventory` state remain the canonical inventory identity/state surface.

## UI ownership

The compact Pantry row owns quantity plus the validated inventory-unit selector. Advanced conversion/process configuration belongs in the Pantry item-settings dialog. Per-row hidden unit/process panels are legacy runtime behavior and should not be recreated.

## Backup and restore

Backup coverage should come from the centralized persistence registry. Relevant keys include the app state, inventory-unit profiles, legacy unit-preference migration data when present, Pantry Lists, usage data, and Restock stock history.

## Validation

`tests/pantry-package-units.test.js` and `tests/inventory-units-processes.test.js` cover package defaults, unit normalization/conversion, profile rebasing, purchase conversion, recipe consumption, and ingredient processes.

The August 2026 repository audit validation reported **554 canonical ingredients**. Do not hard-code this count into application behavior; validation output is the source of truth as the catalog changes.

## Browser acceptance

A hard-refresh browser smoke test should verify:

- untouched ingredients resolve sensible units/defaults;
- changing a Pantry inventory unit persists and preserves convertible quantity;
- package metadata does not independently mark an item as on hand;
- quantity clearing does not create false Pantry presence;
- item settings renders advanced conversions/processes only when opened;
- no hidden per-row `.pantry-unit-profile` or `.ingredient-processes` panels are created;
- backup export/import round-trips inventory-unit and migration data that exists in localStorage.
