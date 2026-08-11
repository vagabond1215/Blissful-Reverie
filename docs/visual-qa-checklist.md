# Visual QA checklist

Use this checklist for visual theme, design-system, layout, and component refresh work. It complements `docs/browser-smoke-test-checklist.md`: visual QA checks whether the interface looks coherent and intentional, while browser smoke testing verifies functional behavior across the app.

This checklist is required for pull requests that change visual direction, design tokens, global surfaces, component styling, navigation presentation, card hierarchy, or major responsive layout behavior.

## When to run

Run this checklist for pull requests that touch any of these areas:

- `styles/app.css`
- `styles/productivity.css`
- `styles/meal-plan-affordance.css`
- theme tokens, color palettes, light/dark mode styling, or CSS custom properties
- app shell, page background, header, navigation, filters, cards, dialogs, settings, dashboard, pantry, meal-plan, or shopping-list presentation
- visible layout density, spacing, border radius, shadows, card treatment, or typography hierarchy

Docs-only changes do not need this checklist unless they define visual behavior, visual acceptance criteria, or design-system direction.

## Relationship to browser smoke testing

Visual QA does not replace functional browser smoke testing.

Use the browser smoke checklist when a PR changes runtime behavior, app wiring, component DOM structure, interactions, responsive behavior, or user-visible controls. Use this visual QA checklist when a PR changes how the interface looks, scans, or communicates hierarchy.

For design implementation PRs, usually run both:

1. `docs/browser-smoke-test-checklist.md` for behavior and interaction safety.
2. This checklist for visual quality and design-system consistency.

## Setup

1. Start from a clean checkout of the PR branch.
2. Run the automated checks requested by the PR.
3. Start the local app.
4. Open the app with a realistic data state that includes recipe cards, pantry entries, meal-plan items, settings, and shopping-list content.
5. Review at these widths at minimum:
   - narrow mobile around 375 px
   - tablet around 768 px
   - desktop at 1024 px or wider
6. Review both light and dark modes when the PR changes tokens, theme controls, surfaces, or text colors.
7. Record browser, viewport widths, theme mode, and data state in the PR notes.

## Product direction baseline

Design work should align with the visual theme audit:

- warm modern kitchen direction
- readable first
- calm and appetizing
- practical and trustworthy
- light mode as the primary/default design target
- restrained dark mode support
- reduced gradient/glass reliance
- clear cards, soft surfaces, consistent spacing, and obvious focus treatment

Avoid making the app feel like a generic dashboard, a dense admin tool, or a high-contrast experimental prototype.

## Global visual checks

### Palette and contrast

- Page background feels calm and does not overpower content.
- Primary surfaces are clearly separated from the page background.
- Brand and accent colors are used intentionally, not everywhere.
- Success, warning, danger, and info states remain distinguishable from decorative accents.
- Primary text is comfortable to read for long recipe and ingredient lists.
- Secondary and muted text remain legible and do not disappear into surfaces.
- Chip/tag text has enough contrast against chip backgrounds.
- Dark mode does not invert the app into harsh high-contrast blocks unless intentionally scoped.
- Focus rings remain obvious in both light and dark modes.

### Typography

- Page titles, section headings, card titles, metadata, helper text, and button text have a clear hierarchy.
- Font sizes are comfortable on mobile and desktop.
- Long recipe names and ingredient names wrap cleanly.
- Small helper text remains readable and does not become visual noise.
- Font weights are used sparingly; not every label should feel equally loud.
- Numbers, macros, times, and counts scan cleanly.

### Spacing and density

- Cards and panels have enough internal breathing room.
- Dense areas still scan without feeling cramped.
- Related controls are grouped visually.
- Unrelated controls are separated clearly.
- Vertical rhythm is consistent between major sections.
- Mobile spacing does not create accidental overlap or clipped labels.
- Desktop spacing does not stretch panels into sparse, hard-to-scan layouts.

### Surfaces and elevation

- There is a clear hierarchy between page, panel, card, modal, popover, and chip surfaces.
- Borders do not compete with content.
- Shadows are subtle and consistent.
- Gradients are rare and purposeful.
- Glass or translucent effects do not reduce readability.
- Similar components use similar treatments across views.

### Icon and control affordances

- Icon-only controls have clear visible affordance and accessible labels.
- Primary actions are visually distinct from secondary actions.
- Disabled states are visibly disabled without becoming unreadable.
- Toggle active/inactive states are obvious without relying only on color.
- Button and chip hit areas are comfortable, especially around 375 px width.
- Hover/focus/pressed states feel related to the default state.

## View-specific checks

### App shell and navigation

- The header/topbar feels stable and intentional.
- Navigation between Meals, Pantry, Kitchen, Family, and Meal Plan is easy to scan.
- Active view state is obvious.
- Navigation does not dominate the recipe and planning content.
- Filters and action chips are visually grouped with the view they affect.
- The shell works at mobile and desktop widths without awkward wrapping.

### Recipe cards

- Recipe title, category, tags, readiness state, metadata, and actions have a clear hierarchy.
- Card surfaces are visually consistent and not over-decorated.
- Readiness or pantry-fit states are easy to distinguish.
- Action buttons are reachable and do not crowd the title area.
- Long tags or recipe names wrap without breaking the card layout.
- Generated/template recipes remain visually understandable without overpowering curated recipes.

### Pantry and kitchen views

- Pantry search, filters, ownership toggles, quantity/unit controls, and favorites are visually understandable.
- Owned, missing, substituted, and favorite states are not confused with each other.
- Form fields feel part of the same system as buttons and chips.
- Lists and grids remain readable at mobile width.
- Quantity/unit controls do not look more important than item identity.

### Meal plan

- Day/week/month views have a clear calendar hierarchy.
- Current day, selected day, empty day, and populated day states are visually distinct.
- Meal entries scan by time/title/metadata without excessive decoration.
- Attendance and guest controls are clear but not visually heavier than the meal itself.
- Empty states help users understand what to do next.
- Schedule dialogs look like first-class app surfaces.

### Smart shopping list

- Source-mode controls make `From meal plan` and `Closest recipes` easy to compare.
- Empty, loading, populated, copied, and error states are visually distinct.
- Category groups are easy to scan.
- Recipe references read as supporting metadata rather than competing primary content.
- Copy feedback is visible but not disruptive.
- Substitution-related changes remain understandable when substitutions are enabled.

### Dashboard and productivity surfaces

- Dashboard summary cards are useful without feeling like an unrelated analytics dashboard.
- Onboarding, backup, advanced settings, and affordance copy feel integrated with the main app.
- Productivity cards and controls use the same visual language as recipe/pantry/meal-plan surfaces.
- Disclosure components look clickable and keyboard-accessible.
- Status messages have enough contrast and visual placement to be noticed.

### Settings, backup, and theme controls

- Settings density is manageable.
- Advanced appearance controls do not visually dominate everyday app usage.
- Backup import/export controls are clear and appropriately cautious.
- Theme controls clearly communicate mode and palette choices.
- Color inputs and text inputs remain accessible and readable.
- Error/success messaging is visible without creating layout jumps that feel broken.

### Family view

- Family member cards or controls are visually consistent with other card systems.
- Icons or avatars do not become the only way to identify people.
- Preference/allergy/diet metadata is readable and does not become a tag cloud.
- Forms and controls have consistent field spacing and labels.

## Responsive visual checks

At each required width, verify:

- No key label is clipped or hidden unintentionally.
- Controls do not overlap.
- Card grids collapse cleanly.
- Dialogs fit within the viewport.
- Sticky or fixed elements do not cover content.
- Tap targets remain usable.
- Important actions remain discoverable.
- The visual hierarchy still makes sense after wrapping.

## Accessibility-oriented visual checks

- Focus indicators are visible on every interactive element.
- Active and selected states are not color-only.
- Error and success states use text/icon/position in addition to color.
- Text contrast remains strong in both theme modes.
- Small helper copy has adequate size and contrast.
- Motion, hover-only effects, or subtle opacity changes are not required to understand the UI.
- The visual order matches keyboard and reading order where applicable.

## Token consistency checks

For token or global CSS PRs, verify:

- New canonical tokens are documented or named consistently.
- Legacy aliases remain mapped intentionally.
- Components do not introduce one-off colors when an appropriate token exists.
- Brand, surface, text, border, focus, radius, shadow, and spacing tokens are not mixed arbitrarily.
- Dark-mode values are intentionally paired with light-mode values.
- Feature styles use the same token family as global styles unless the exception is documented.

## Anti-patterns to avoid

- Adding another feature-specific stylesheet when the change belongs in the design system.
- Using gradients or glass effects to solve hierarchy problems.
- Increasing contrast or shadows everywhere to make one element stand out.
- Making all chips/buttons/panels equally saturated.
- Relying on icon-only actions for unfamiliar flows.
- Treating dark mode as the primary design target unless a specific PR says so.
- Combining visual redesign with product behavior changes.

## PR reporting template

Include this section in design PRs after visual QA:

```md
## Visual QA

- Browser:
- Viewports checked:
- Theme modes checked:
- Data state used:
- App shell/navigation:
- Recipe cards:
- Pantry/kitchen:
- Meal plan:
- Smart shopping list:
- Dashboard/productivity surfaces:
- Settings/backup/theme controls:
- Family surfaces:
- Color and contrast:
- Typography hierarchy:
- Spacing and density:
- Surfaces/elevation:
- Focus and selected states:
- Notes/caveats:
```

For implementation PRs that also affect behavior, include the browser smoke-test reporting template as well.

## Known limits

This checklist is manual and qualitative. It does not replace automated tests, data validation, accessibility audits, or functional browser smoke testing. It should make visual review more repeatable, but it still depends on human judgment and should be paired with screenshots or screen recordings for significant design changes.

## Follow-up path

After this checklist is available, the next safe design-system implementation pass is the token foundation track described in `docs/visual-theme-design-audit.md`. That work should remain narrow: define canonical tokens and map selected legacy aliases before changing major component styling.
