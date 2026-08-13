# Performance Budget

Blissful Reverie is a static local-first browser application. Performance work should protect responsiveness and long-session stability without introducing arbitrary thresholds before the repository has a repeatable measurement harness.

## Current policy

- Do not claim a performance improvement or regression from code inspection alone when it can be measured.
- Do not adopt a hard CI threshold until the measurement method and representative fixture are repeatable and an accepted baseline has been recorded.
- Prefer bounded work per interaction and avoid repeated full-data recomputation when a narrower update can preserve correctness.
- Performance changes must preserve localStorage compatibility and product behavior; speed is not permission to weaken data validation or correctness.

## Surfaces to baseline

When a browser/performance harness is established, capture representative measurements for:

- initial application load and first usable render;
- Recipes rendering and discovery filtering;
- Pantry rendering, search, filtering, sorting, and tag visibility;
- Smart Shopping derivation from a representative meal plan;
- Restock dialog/category navigation;
- Family management and dislike-chip filtering;
- backup/export and import/restore for representative stored state;
- repeated primary-destination navigation;
- repeated recipe-preview/dialog/popover open-close cycles.

Use representative small and large local datasets rather than an empty-state-only benchmark.

## Responsiveness expectations

User-triggered controls should remain responsive while derived views update. Expensive work should not create visibly repeated layout movement, duplicate rendering, or input lockout that grows with navigation history.

Where work can be isolated from rendering, keep authoritative application state separate from presentation and derive only the view data needed for the current surface.

## Memory and lifecycle expectations

Memory is allowed to fluctuate and the browser/runtime may retain caches. The quality target is **bounded retained growth**, not a claim that heap usage never increases.

A future soak/lifecycle harness should repeatedly navigate among primary destinations and open/close representative overlays, then inspect whether application-owned resources converge after warm-up. Useful evidence may include:

- active application timers;
- registered application listeners/observers where instrumentable;
- detached/duplicate overlay nodes;
- retained application collections/caches;
- browser heap snapshots or equivalent tooling in a capable local environment.

No numeric memory threshold is authoritative until that harness and fixture are accepted.

## Regression policy

Once a stable benchmark exists:

1. record the environment, fixture, warm-up, sample count, and baseline;
2. distinguish normal variance from repeatable regression;
3. set thresholds per surface rather than one arbitrary global number;
4. update the baseline intentionally when product scope materially changes;
5. keep correctness, accessibility, and persistence tests independent from performance acceptance.

## Current implementation gap

The repository does not yet have automated browser performance or leak/soak regression coverage. Until that exists, browser-sensitive performance acceptance must be performed in a capable browser environment and reported explicitly.
