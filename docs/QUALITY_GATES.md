# Quality Gates

This file defines repository-level completion expectations for Blissful Reverie. It supplements the current product handoff; it does not create new product features or override accepted behavior.

## Gate 1 — Repository and scope

Before implementation:

- confirm the requested work belongs to `vagabond1215/Blissful-Reverie`;
- read `AGENTS.md`, `PROJECT_PROFILE.yaml`, `README.md`, and `docs/current-project-handoff.md`;
- identify the owning renderer/module and the focused regression surface;
- distinguish browser-observable defects from behavior that can be proven by source/tests alone.

## Gate 2 — Automated validation

For implementation changes:

- run the most relevant focused test(s);
- run `npm test` before considering the implementation complete;
- when the change goes through a PR, require the PR `Validate` run to pass;
- after a direct-main implementation change, verify the resulting `main` `Validate` run when practical.

Documentation-only administration changes do not require pretending that local application tests ran. They must still preserve valid paths, commands, and current authority.

## Gate 3 — Browser interaction

Changes that affect rendered layout, dialogs, overlays, focus, keyboard interaction, navigation, or responsive behavior require browser verification in a capable environment.

At minimum check the affected flow at representative desktop and narrow/mobile widths. When theme-sensitive UI is touched, check light and dark modes.

For overlays/dialogs/popovers:

- open and close repeatedly;
- verify Escape/close behavior where supported;
- verify focus returns sensibly;
- verify the underlying page does not unexpectedly jump or duplicate state;
- verify handlers are not registered repeatedly after navigation or re-render.

A source-only connector pass may prepare or review these changes, but it cannot claim this browser gate passed.

## Gate 4 — Accessibility and input

Interaction changes should preserve:

- keyboard reachability for interactive controls;
- visible/sensible focus behavior;
- semantic controls rather than click-only decorative elements when practical;
- readable contrast in both supported themes;
- no interaction that depends exclusively on hover when a keyboard/touch path is required.

## Gate 5 — Local persistence

Any change touching browser state, stored identifiers, backup/import, pantry/family/meal-plan persistence, or stored preferences must consider:

- existing localStorage compatibility;
- defaulting and missing-field behavior;
- backup/export and restore/import where relevant;
- save/load round trips;
- stale or older stored state;
- stable identifiers and explicit migrations before renaming persisted keys/slugs/IDs.

Do not discard or silently reinterpret existing user state merely to simplify a new UI.

## Gate 6 — Resource lifecycle

UI code that creates long-lived resources must have a clear owner and cleanup path. Applicable resources include event listeners, timers, observers, overlays, subscriptions, cached derived state, and dynamically attached DOM behavior.

For affected flows, consider repeated navigation and repeated open/close cycles. The expected steady state is bounded: returning to the same screen should not continually increase active handlers, timers, overlays, or retained application state.

If a measurable leak/lifecycle harness is added later, its accepted baseline becomes part of this gate.

## Gate 7 — Performance

Use `docs/PERFORMANCE_BUDGET.md` for performance-sensitive work.

Until a repeatable baseline is measured and recorded, performance review is evidence-based rather than an invented millisecond threshold. Once a stable harness exists, accepted thresholds may become CI gates.

## Definition of done

A requested implementation is complete only when the requested behavior is coherent, relevant automated checks pass, required browser/accessibility/persistence/lifecycle checks have actually been performed, documentation/handoff is updated when state changed, and any unperformed validation is explicitly reported rather than inferred.
