# Stale branch audit

Date: 2026-06-05

## Scope

PR #56 (`codex/add-missing-ingredients-for-stock-filter`) was reviewed as the stale ingredient-coverage branch while PR #118 remained the active recovery branch.

## Decision

Assimilate useful additive ingredient coverage into PR #118, but do not carry over PR #56's existing-slug renames. Renaming saved pantry slugs without a migration could break localStorage compatibility and ingredient matching.

## Assimilated

The following 19 entries now live directly in `data/ingredients.js` with stable prefixed slugs:

- ramen, gnocchi, orecchiette, pasta shells, jumbo shells, and rigatoni
- flank steak and sirloin steak
- cooked rice and crackers
- generic bell pepper, mushrooms, pimento peppers, and artichoke hearts
- culinary lavender, whole nutmeg, and caraway seeds
- wasabi paste and sprinkles

The proposed generic Tamari entry was not added because the catalog already contains `condiment-tamari-gf` (`Tamari (GF)`), which is an obvious duplicate product concept.

## Removed From The Recovery Implementation

- Ingredient data is no longer appended at runtime from `scripts/theme-utils.js`.
- Product scripts are no longer injected dynamically by theme utilities.
- No stale slug-renaming changes were copied from PR #56.

## Prune Recommendation

PR #56 can remain closed and its branch can be deleted after confirming no external references depend on it. PR #118 contains the useful additive coverage in maintainable catalog form.
