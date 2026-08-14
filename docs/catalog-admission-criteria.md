# Catalog admission criteria

Curated catalog data and user-created data have different trust levels and therefore different validation requirements.

## Transitional catalog gate

The catalog predates the strict admission rules and contains historical canonicalization debt. The baseline at admission version 1 is **554 canonical ingredients and 314 curated recipes**. Those existing entries are grandfathered rather than retroactively blocking every unrelated change.

Every net-new curated ingredient or recipe must include:

```js
admissionVersion: 1
```

CI compares current catalog growth against the grandfathered baseline. The number of versioned curated ingredients and recipes must exactly account for the number of entries added beyond that baseline. Versioned entries are then run through the strict validators on every future test run.

This prevents a straightforward new catalog entry from bypassing validation while avoiding a migration that would require fixing hundreds of unrelated legacy matching/unit issues at once. The baseline should not be increased to make a failing new entry disappear; a new entry either passes admission or does not enter the curated catalog.

## Curated ingredient admission

A new canonical ingredient is admitted only when all hard checks pass:

- `admissionVersion: 1`
- stable lowercase kebab-case `slug`
- unique slug and case-insensitive display name
- supported category
- `tags` array and, when present, `aliases` array
- aliases must be non-empty strings and may not duplicate the ingredient's display name
- `packageUnit`, when present, must be a recognized purchase/package unit (including `each` for individually purchased items)
- any seeded inventory profile must use recognized stock and purchase units and a positive package conversion
- any ingredient process referencing the ingredient must pass process-graph validation
- full catalog validation and tests must remain green

A canonical ingredient does **not** need to be used by an existing curated recipe. Unused canonical ingredients remain a warning because they can be intentionally added ahead of recipes or processes.

## Curated recipe admission

A new curated recipe is admitted only when all hard checks pass:

- `admissionVersion: 1`
- stable lowercase kebab-case `id`
- unique id and case-insensitive recipe name
- positive `baseServings`
- at least one ingredient and at least one instruction
- every ingredient line has a non-empty item name, non-negative quantity, and string unit when provided
- every quantified unit must be recognized by the inventory unit parser, or be explicitly treated as an unquantified/free-form preparation line
- every ingredient line must resolve to at least one canonical ingredient after specificity matching
- equipment, tags, allergens, and nutrition fields satisfy the canonical schema
- allergen values use the canonical allergen vocabulary
- full catalog validation and tests must remain green

Canonical matching is an admission requirement because shopping, Pantry consumption, crafting, and restock calculations depend on ingredient identity.

## User-created/custom ingredients

Custom ingredients should be realistic to create without requiring catalog-author metadata. They use a deliberately smaller validation set.

Required:

- non-empty display name
- local/user-scoped stable id
- optional category text
- optional tags/notes
- if quantity tracking is enabled, a recognized non-package stock unit
- if package purchasing is enabled, a recognized purchase unit and positive package conversion

Not required:

- `admissionVersion`
- membership in the curated category vocabulary
- global canonical slug uniqueness
- curated aliases
- canonical recipe usage
- process/crafting coverage
- seeded package defaults
- nutrition metadata

A custom ingredient can therefore participate in Pantry inventory and package conversion without pretending it is a fully curated canonical ingredient. Promotion from custom to canonical is a catalog addition and must run the full curated ingredient admission suite.

## Change acceptance

When adding or materially changing a curated ingredient, recipe, unit conversion, or ingredient process:

1. add or update focused regression coverage for the behavior being introduced;
2. ensure any net-new curated ingredient or recipe carries `admissionVersion: 1`;
3. run `npm test` locally/CI;
4. require hosted `Validate` to pass before merge;
5. verify the `main` push-triggered Validate after merge.

The goal is not to make data entry bureaucratic; it is to prevent catalog additions from silently breaking matching, shopping, Pantry arithmetic, or crafting.
