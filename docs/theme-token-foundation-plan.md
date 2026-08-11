# Theme token foundation plan

## Purpose

This plan defines the first safe design-system step after the visual theme audit and visual QA checklist. It is intentionally docs-only: no runtime JavaScript, CSS, localStorage, or feature behavior changes should be included in this pass.

The goal is to give future theme work a small canonical token target before editing `styles/app.css`, which currently contains a large compatibility-heavy token map.

## Source context

Relevant planning documents:

- `docs/visual-theme-design-audit.md`
- `docs/visual-qa-checklist.md`
- `docs/browser-smoke-test-checklist.md`

The design audit recommends a warm modern kitchen direction, a smaller canonical token layer, and narrow implementation PRs rather than a broad visual rewrite. The visual QA checklist defines manual acceptance criteria for design work. The browser smoke checklist remains the functional regression gate.

## Design goals

The token foundation should make Blissful Reverie feel:

- calm and appetizing
- readable and practical
- warm but restrained
- consistent across recipe, pantry, meal-plan, shopping-list, settings, backup, onboarding, and family surfaces
- accessible in both light and dark modes
- easier to evolve without one-off feature-specific styling

## Current problem

`styles/app.css` currently mixes several categories of tokens in one large root block:

- core palette colors
- app layers
- semantic text colors
- surfaces and overlays
- compatibility aliases
- legacy named colors
- gradients
- status colors
- shadows, radii, and borders
- feature-specific presentation expectations

This makes implementation risky because future CSS can pick any token family and still appear locally valid. A canonical token layer should make the preferred design vocabulary explicit while preserving old aliases long enough to avoid breakage.

## Canonical token groups

Future CSS should prefer these groups. Existing aliases can remain temporarily, but new design work should avoid adding more compatibility-only names.

### Brand tokens

Brand tokens express product identity and major accents. They should not be used directly for every surface.

```css
:root {
  --brand-primary: ...;
  --brand-primary-strong: ...;
  --brand-primary-soft: ...;
  --brand-accent: ...;
  --brand-accent-soft: ...;
  --brand-success: ...;
  --brand-warning: ...;
  --brand-danger: ...;
}
```

Recommended direction:

- `--brand-primary`: modern fig/plum, preserving some continuity with the existing burgundy.
- `--brand-accent`: restrained culinary accent, such as herb or paprika.
- Status tokens should be visually distinct from brand decoration.

### Surface tokens

Surface tokens define the app's visual depth. They should replace repeated dark layer and glass-style decisions over time.

```css
:root {
  --surface-page: ...;
  --surface-card: ...;
  --surface-panel: ...;
  --surface-raised: ...;
  --surface-overlay: ...;
  --surface-hover: ...;
  --surface-selected: ...;
}
```

Recommended direction:

- Light mode should use warm cream, white, and soft linen surfaces.
- Dark mode can remain supported, but should simplify the number of dark layers.
- Gradients and glass effects should not be the default surface model.

### Text tokens

Text tokens should make hierarchy predictable across cards, filters, panels, and dialogs.

```css
:root {
  --text-primary: ...;
  --text-secondary: ...;
  --text-muted: ...;
  --text-subtle: ...;
  --text-inverse: ...;
  --text-link: ...;
}
```

Recommended direction:

- Use deep charcoal as the light-mode primary text direction.
- Avoid low-contrast muted text on decorative or tinted surfaces.
- Preserve accessible inverse text for filled buttons, chips, and status surfaces.

### Border and focus tokens

Border and focus tokens should separate structure from accessibility affordance.

```css
:root {
  --border-subtle: ...;
  --border-strong: ...;
  --border-interactive: ...;
  --focus-ring: ...;
  --focus-ring-offset: ...;
}
```

Recommended direction:

- Most cards and panels should use subtle warm-neutral borders.
- Interactive borders should be visually stronger than decorative separators.
- Focus treatment must remain obvious in both light and dark modes and should not rely only on brand color.

### Shape tokens

Shape tokens should reduce inconsistent radii across cards, pills, dialogs, and buttons.

```css
:root {
  --radius-sm: ...;
  --radius-md: ...;
  --radius-lg: ...;
  --radius-xl: ...;
  --radius-pill: 999px;
}
```

Recommended direction:

- Use medium radius for cards.
- Use pill radius only for chips, compact filters, and segmented controls.
- Avoid creating new one-off radius calculations unless necessary.

### Elevation tokens

Elevation tokens should replace scattered strong shadow usage.

```css
:root {
  --shadow-card: ...;
  --shadow-panel: ...;
  --shadow-popover: ...;
  --shadow-dialog: ...;
}
```

Recommended direction:

- Default cards should have subtle elevation.
- Popovers and dialogs can use stronger shadows.
- Avoid stacking border, gradient, and heavy shadow on the same component.

### Spacing tokens

Spacing tokens should make density easier to audit.

```css
:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;
}
```

Recommended direction:

- Use smaller steps inside compact controls.
- Use larger steps between major panels and view sections.
- Avoid adding new arbitrary spacing values when a token can express the intent.

## Legacy alias strategy

Do not remove existing tokens in the first implementation phase. Instead:

1. Add canonical token definitions near the top of `:root`.
2. Map high-use legacy aliases to canonical tokens gradually.
3. Leave feature-specific or obscure aliases untouched until their component is migrated.
4. Avoid changing token values and component selectors in the same commit unless the affected surface is very small.
5. Keep dark-mode and custom palette behavior intact until the canonical layer is stable.

### Likely legacy categories

These categories should be treated as compatibility aliases unless proven otherwise:

- `--color-*` mappings that duplicate newer semantic groups
- `--theme-*` mappings used by theme controls
- `--layer-*` dark surface aliases
- `--glass-*` and `--surface-glass-*` tokens
- legacy named colors such as copper/gunmetal-style tokens
- repeated accent soft/strong/outline/shadow variants

### Migration rule

A future CSS change should answer this before modifying tokens:

> Is this token canonical, an alias, or component-specific?

If the answer is unclear, update the plan or create a focused audit issue before changing the live CSS.

## First implementation phase

The first CSS implementation should be a token scaffold, not a redesign.

Recommended scope:

- Edit only the root token section in `styles/app.css`.
- Add canonical token definitions.
- Map a very small number of legacy aliases to canonical equivalents.
- Do not rewrite selectors or component rules.
- Do not change JavaScript or data files.
- Include before/after notes in the commit or issue comment.

Recommended issue title:

```text
Add canonical theme token scaffold
```

Recommended commit style if applied directly to `main`:

```text
Add canonical theme token scaffold
```

Use a branch instead of direct `main` if the connector cannot safely patch the full stylesheet or if the diff becomes larger than the token root section.

## Review gates for CSS implementation

Any CSS/token implementation should reference:

- `docs/visual-theme-design-audit.md`
- `docs/visual-qa-checklist.md`
- `docs/browser-smoke-test-checklist.md`

Minimum checks:

- `git diff --check`
- browser load with no console errors
- visual QA pass for color, type, spacing, cards, nav, filters, and responsive surfaces
- browser smoke pass for any touched runtime surface
- mobile width around 375 px
- tablet width around 768 px
- desktop width at 1024 px or wider

## Out of scope

Do not include these in the token scaffold phase:

- recipe-card redesign
- app-shell redesign
- productivity dashboard redesign
- meal-plan layout changes
- shopping-list behavior or quantity aggregation
- theme-control behavior changes
- palette editor changes
- localStorage migrations
- data cleanup

## Follow-up sequence

Recommended order after this plan:

1. Create `Add canonical theme token scaffold` issue.
2. Patch only the `:root` token scaffold in `styles/app.css`.
3. Run visual QA and browser smoke checks.
4. Then create a separate app-shell refresh issue.
5. Then handle recipe cards, pantry, meal plan, and productivity surfaces as separate focused passes.

## Completion criteria

This plan is complete when the repo has a shared token vocabulary, a clear legacy alias strategy, and a narrow next implementation step that can be reviewed without broad CSS churn.
