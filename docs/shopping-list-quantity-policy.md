# Shopping-list quantity and serving-size policy

## Current behavior

The smart shopping list is currently a **missing-ingredient checklist**, not a quantity calculator.

The current helper:

- analyzes pantry fit for each recipe
- identifies canonical missing ingredient slugs
- creates one shopping-list row per missing slug
- stores display name, category, and recipe references
- sorts by category and ingredient name

It does **not** store or calculate ingredient quantities, units, serving counts, planned dates, or duplicate planned-meal counts in shopping-list rows.

The current planned-meal source resolves unique valid recipe IDs from meal-plan state before building the list. That keeps the output stable and avoids duplicate rows when the same recipe appears more than once.

## Policy decision

Keep the current default behavior as the product baseline:

> The smart shopping list shows missing ingredients and recipe references. It does not aggregate quantities by default.

This should remain true until the app has reliable structured recipe ingredient quantities, compatible unit normalization, and an explicit serving/attendance model for shopping quantities.

## Why quantity aggregation should not be default yet

Quantity aggregation sounds useful, but it would currently create misleading precision.

Risks:

- Recipe ingredients may not all have normalized `quantity` and `unit` data.
- Some ingredients are matched through canonical slugs rather than direct structured quantity fields.
- Compatible units are not guaranteed across recipes.
- Substitutions can satisfy a missing requested ingredient but do not define replacement quantities.
- Meal-plan attendance currently supports family/guest planning, but it does not yet define ingredient multiplier semantics.
- Planned recipe IDs are deduped today; counting duplicates would change product meaning.
- Date-range scoping is not currently part of shopping-list source behavior.

## Default shopping-list display

Default shopping-list rows should continue to show:

- ingredient name
- ingredient category
- one or more recipe references
- pantry/substitution-aware missing status

Default rows should not show:

- aggregate quantity
- scaled servings
- date ranges
- duplicate planned-meal counts
- substitution quantity math

## Quantity display policy

Future quantity display should be optional and conservative.

A quantity may be shown only when all of the following are true:

1. Every contributing recipe ingredient has a parseable numeric quantity.
2. Every contributing recipe ingredient has a known unit.
3. Units are identical or safely convertible.
4. The ingredient match maps directly to the canonical shopping-list slug.
5. No substitution is being used for that row.
6. Serving multiplier behavior has been explicitly selected by policy and implemented.

If any condition is not met, the row should fall back to the stable default:

```text
Quantity varies by recipe
```

or no quantity text at all.

## Unknown and approximate quantity copy

Use plain-language copy rather than pretending precision.

Recommended states:

| State | Copy |
| --- | --- |
| No reliable quantity | `Quantity varies by recipe` |
| Mixed incompatible units | `Check recipes for amounts` |
| Some recipes missing amounts | `Some amounts unavailable` |
| Quantity scaled by servings | `Estimated for selected servings` |
| Substitution involved | `Substitution amount not calculated` |

Avoid copy such as `~3 cups` unless the app can explain why the quantity is approximate and how it was calculated.

## Serving and attendance policy

Meal-plan attendance and guests should **not** scale shopping quantities by default.

Reasoning:

- Attendance currently supports meal planning and family/macro context.
- It does not necessarily mean a recipe should be multiplied linearly.
- Many recipes have fixed yields or flexible portions.
- Users may schedule leftovers, partial batches, or shared dishes.

Before scaling quantities, introduce an explicit serving policy such as:

- recipe base servings
- planned servings for a meal-plan entry
- user-edited serving override
- whether guest count should scale the recipe
- whether family members are included in serving count

Until that exists, shopping-list quantities should not infer serving multipliers from attendance.

## Duplicate planned recipes

Keep duplicate planned recipes deduped for the current missing-ingredient list.

Current behavior is appropriate because the list answers:

> What ingredients am I missing for the set of planned recipes?

It does not answer:

> How much of each ingredient do I need for every planned instance?

A future quantity-aware list may count duplicate planned recipe instances, but only after quantity and serving policies are implemented.

## Date-range policy

Do not add day/week/month filtering as part of quantity aggregation work.

Current planned-meal source behavior resolves valid planned recipe IDs across meal-plan state. Date-range scoping would be a separate product decision because it changes which planned recipes feed the smart shopping list.

If added later, date-range scoping should be a distinct feature with clear source copy, for example:

- `All planned recipes`
- `This week`
- `Selected day`

## Substitution policy

Substitutions should continue to affect whether an ingredient is missing.

When an owned substitute satisfies a requested ingredient:

- exclude the requested ingredient from the missing list
- do not show substitute quantity math
- do not infer substitute ratios

Future substitution quantity support would require explicit substitution ratios or recipe-specific replacement notes.

## Data-shape implications

No localStorage migration is needed for the current policy doc.

A future quantity-aware implementation should avoid breaking existing stored state. New fields should be additive.

Potential future fields, only after policy approval:

```js
{
  shoppingQuantityMode: 'missing-only' | 'estimated',
  shoppingDateScope: 'all-planned' | 'week' | 'day',
  mealPlanEntries: {
    servingMultiplier: number,
    plannedServings: number,
    usesGuestScaling: boolean
  }
}
```

These names are illustrative, not approved implementation requirements.

## Implementation sequence

### Phase 1: preserve current behavior

- Keep one row per canonical missing ingredient slug.
- Keep recipe references.
- Keep pantry and substitution matching behavior.
- Do not display quantities.

### Phase 2: add quantity-readiness audit tooling

Before implementing quantity display, add a docs or test pass that measures:

- number of recipe ingredients with numeric quantities
- number with known units
- number with missing or free-text units
- ingredient matches that lose quantity context
- recipes likely to produce incompatible units

### Phase 3: optional quantity notes

Only after audit results are acceptable:

- display non-aggregated recipe-specific amount notes where directly available
- avoid summing across recipes
- show fallback copy for missing/mixed data

### Phase 4: explicit estimated aggregation

Only after quantity notes are stable:

- add unit normalization
- add duplicate planned-recipe instance handling
- add explicit serving multiplier policy
- add date-scope behavior if separately approved
- label quantities as estimated

## Acceptance criteria for future implementation

A future implementation PR should be accepted only if it:

- preserves the current missing-ingredient list as the default or fallback
- avoids misleading precision
- handles unknown quantities gracefully
- does not infer serving scaling from attendance without explicit policy
- keeps substitutions quantity-neutral unless ratios exist
- preserves localStorage compatibility
- includes focused tests for missing, mixed, and incompatible quantity data
- updates browser smoke or visual QA checklists if UI changes are visible

## Recommended next issue

After this policy doc merges, create a narrow implementation-planning issue:

```text
Audit recipe ingredient quantity readiness
```

Suggested scope:

- inspect recipe data quantity/unit coverage
- report missing and incompatible quantity data
- recommend whether quantity notes are feasible
- do not change shopping-list output yet

## Out of scope

- Broad recipe data cleanup
- Unit conversion implementation
- Serving multiplier UI
- Date-range shopping-list source behavior
- Visual design refresh
- Any #134 theme/design work
