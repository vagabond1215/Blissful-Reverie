# Visual theme and design audit

## Current state

Blissful Reverie has useful recipe, pantry, meal-plan, family, backup, onboarding, and smart shopping-list features, but the visual system is carrying legacy theme decisions. The current design feels more like accumulated implementation output than a deliberate food and meal-planning product interface.

This audit is based on repository source inspection. The deployed GitHub Pages URL should still receive a manual browser/design pass before any broad implementation work, because source inspection cannot replace reviewing the rendered interface, density, contrast, and interaction states in context.

## Design goals

A refreshed Blissful Reverie interface should feel:

- **Calm and appetizing**: suitable for recipes, pantry planning, family meals, and shopping prep.
- **Readable first**: ingredients, recipe names, filters, and meal-plan information should scan quickly.
- **Trustworthy and practical**: controls should look intentional, not experimental.
- **Warm but restrained**: avoid heavy dark layering, excessive gradients, and color competition.
- **Responsive by default**: cards, filters, settings, and meal-plan controls should be comfortable on mobile and desktop.
- **Accessible**: preserve strong focus treatment, sufficient contrast, and non-color-only affordances.

## Problems to fix

### 1. Token system is too broad and compatibility-driven

`styles/app.css` starts with a large token map that mixes core palette values, compatibility aliases, surface layers, glass concepts, gradients, legacy color names, and repeated semantic mappings. This makes small UI work difficult because it is unclear which token is canonical.

Observed risk:

- Multiple tokens point to the same values.
- Surface, text, accent, and compatibility aliases are interleaved.
- Feature code can choose different token families and still appear correct locally.
- Refactoring one token can produce broad unintended visual changes.

### 2. Visual direction is too dark and high-contrast for the product category

The current core palette is built around a near-black neutral, deep brand surface, high-contrast text, dark green/brown layers, and strong accent surfaces. This may work for a dramatic dashboard, but it is heavy for everyday food planning.

Observed risk:

- Recipe and pantry content can feel visually dense.
- Cards and panels may compete for attention instead of establishing hierarchy.
- Brown, burgundy, dark teal, and gold can create a dated or muddy visual impression when used together at large scale.

### 3. Feature-specific styles are layering outside the main system

Recent work intentionally kept changes narrow by adding `styles/productivity.css` and `styles/meal-plan-affordance.css`. That was safer for feature PRs, but it also confirms the system is drifting into feature-level style islands.

Observed risk:

- Similar components can look different depending on which feature stylesheet controls them.
- Affordance and dashboard polish can accumulate without fixing the underlying theme.
- Future component work may need repeated one-off CSS patches.

### 4. Component hierarchy needs simplification

The app has many interactive surfaces: navigation chips, filters, recipe cards, pantry cards, family cards, dialogs, settings disclosures, backup controls, meal-plan calendar cells, dashboard cards, and shopping-list source controls. These should share predictable hierarchy.

Observed risk:

- Too many surfaces use strong borders, shadows, gradients, or elevated treatments.
- Icon-only and compact controls need clearer visual affordance without becoming noisy.
- Filters and settings can feel as prominent as primary content.

### 5. Manual browser QA exists, but visual QA does not

`docs/browser-smoke-test-checklist.md` covers functional browser surfaces, including responsiveness and accessibility smoke checks. It does not define design acceptance criteria such as palette quality, density, typography, card hierarchy, or design-token consistency.

Observed risk:

- UI PRs can pass functional smoke testing while continuing to degrade or fragment the visual system.
- There is no shared checklist for deciding whether a design change improves the app's direction.

## Proposed visual direction

Use a **warm modern kitchen** direction:

- Light mode as the primary/default design target.
- Dark mode supported, but simplified and secondary.
- Warm neutral background instead of near-black as the default base.
- Soft surfaces that make recipe photos/data feel easier to scan.
- Muted culinary accents: herb green, tomato/paprika, oat/cream, and a restrained berry or plum brand accent.
- Reduced glass and gradient usage; reserve gradients for rare hero or status moments.
- Clear cards with consistent spacing, subtle shadow, and restrained borders.
- Strong readable type scale with fewer competing weights.

Suggested early palette direction, to validate visually before implementation:

| Role | Suggested direction | Notes |
| --- | --- | --- |
| App background | warm cream / oat | Calmer default than near-black. |
| Primary surface | white or very light warm gray | Recipe and pantry cards should read cleanly. |
| Elevated surface | soft cream / linen | Use sparingly for panels and sidebars. |
| Primary text | deep charcoal | Better everyday reading base. |
| Muted text | warm gray | For descriptions and metadata. |
| Brand | berry / plum / fig | Keep continuity with existing burgundy, but modernize it. |
| Accent 1 | herb green | Food/planning association; use for positive readiness. |
| Accent 2 | paprika / tomato | Use for calls to action or warnings sparingly. |
| Border | warm neutral line | Subtle, not competing with content. |
| Focus | high-contrast blue or brand-adjacent ring | Must remain visually obvious. |

## Token strategy

Do not begin with a broad visual rewrite. First create a smaller canonical token layer and gradually migrate components.

Recommended canonical groups:

```css
:root {
  /* Brand */
  --brand-primary: ...;
  --brand-accent: ...;
  --brand-success: ...;

  /* Background and surfaces */
  --surface-page: ...;
  --surface-card: ...;
  --surface-panel: ...;
  --surface-raised: ...;

  /* Text */
  --text-primary: ...;
  --text-secondary: ...;
  --text-muted: ...;
  --text-inverse: ...;

  /* Borders and focus */
  --border-subtle: ...;
  --border-strong: ...;
  --focus-ring: ...;

  /* Shape and elevation */
  --radius-sm: ...;
  --radius-md: ...;
  --radius-lg: ...;
  --shadow-card: ...;
  --shadow-popover: ...;

  /* Spacing */
  --space-1: ...;
  --space-2: ...;
  --space-3: ...;
  --space-4: ...;
}
```

Compatibility tokens can remain temporarily, but the design refresh should define which tokens are canonical and which are legacy aliases.

## Component priorities

Implement the refresh in small PRs, starting with surfaces that have the highest product impact.

### Phase 1: foundation only

- Add a documented canonical token layer.
- Keep legacy aliases mapped to canonical tokens where possible.
- Avoid changing layout behavior.
- Add visual QA guidance to the browser checklist or a separate visual QA doc.

### Phase 2: app shell and navigation

- Simplify page background, topbar/nav chips, and major layout surfaces.
- Make active view state and primary actions obvious.
- Reduce excessive borders, shadow stacking, and gradient competition.

### Phase 3: recipe and pantry cards

- Standardize card header/body spacing.
- Use metadata tags consistently.
- Make readiness/missing-ingredient states easy to scan.
- Confirm action buttons have accessible labels and comfortable tap targets.

### Phase 4: meal plan and shopping list

- Harmonize calendar cells, day modal, smart shopping panel, source controls, and copy feedback.
- Keep the current behavior intact; do not combine with quantity or serving-size changes.

### Phase 5: settings, backup, onboarding, family

- Reduce settings density.
- Make backup/onboarding cards feel part of the same design system.
- Align family member controls and forms with the card/form system.

## Accessibility checks

Every implementation PR in this track should check:

- Text contrast for primary, secondary, muted, inverse, and chip text.
- Focus visibility on nav, filters, cards, dialogs, settings, backup, and shopping-list controls.
- Minimum touch targets for icon and pill actions.
- Usability at approximately 375 px, 768 px, and 1024 px widths.
- Status messages with `aria-live` where feedback is dynamic.
- Avoiding color-only status indication for readiness, errors, or active states.

## Suggested implementation sequence

1. **Design-token direction doc / token scaffold**
   - Branch: `design/theme-token-foundation`
   - Scope: add canonical token definitions and map selected legacy aliases.
   - No component redesign yet.

2. **Visual QA checklist**
   - Branch: `docs/visual-qa-checklist`
   - Scope: add visual acceptance checks alongside the existing browser smoke checklist.
   - Docs-only.

3. **App shell refresh**
   - Branch: `design/app-shell-refresh`
   - Scope: page background, topbar, nav chips, panels, and basic responsive spacing.
   - No feature behavior changes.

4. **Recipe card refresh**
   - Branch: `design/recipe-card-refresh`
   - Scope: recipe card hierarchy, action placement, tags, readiness states.
   - Browser smoke required.

5. **Productivity/meal-plan surface alignment**
   - Branch: `design/productivity-surface-alignment`
   - Scope: dashboard, shopping list, meal-plan affordance copy, backup/settings/onboarding surfaces.
   - Browser smoke required.

## Out of scope

- Shopping-list quantity aggregation and serving-size behavior. That belongs to #127.
- Meal-plan date-range semantics.
- Recipe data cleanup.
- New feature behavior.
- Major layout or IA changes before the token/system direction is agreed.

## Acceptance path

This audit should be treated as a planning artifact. After it merges, create narrow implementation issues or PRs for the token foundation and visual QA checklist before changing major CSS behavior.
