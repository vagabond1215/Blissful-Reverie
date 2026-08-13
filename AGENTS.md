# Repository Instructions

## Repository scope

This project is scoped only to `vagabond1215/Blissful-Reverie`.

- Do not inspect, search, modify, commit to, or otherwise work on any unrelated Git repository from this project context, even if the connected GitHub account can access it.
- If the user asks for work on another Git repository, refuse that repository operation here and ask them to open or switch to the project attached to that repository.
- Another repository is associated only when this repository or the project configuration explicitly declares it as a dependency or integration. Shared ownership, organization membership, connector access, or conversation history is not sufficient.
- Do not carry requirements, screenshots, code assumptions, branch state, commit identities, prompts, issues, test results, or implementation conclusions across repository boundaries.
- If foreign-repository context appears accidentally, disregard it for this repository and continue only from Blissful Reverie repository evidence and user instructions given in the correct project.

## Required orientation

Before substantive work, read in this order:

1. `AGENTS.md` — durable repository operating rules.
2. `PROJECT_PROFILE.yaml` — machine-readable project phase, tool routing, Git posture, modules, and validation expectations.
3. `README.md` — setup, architecture, data contracts, and validation entry points.
4. `docs/current-project-handoff.md` — current product state, latest accepted behavior, validation state, and immediate next step.
5. `docs/QUALITY_GATES.md` and `docs/PERFORMANCE_BUDGET.md` when the requested work touches implementation, browser behavior, persistence, accessibility, resource lifecycle, or performance.

Prefer current repository evidence over conversation memory. Current source and the current handoff override obsolete issues, screenshots, or historical descriptions unless the user explicitly reinstates an older direction.

## Project workflow

- Treat each user request as a bounded work order. Roadmaps, handoff follow-ups, and nearby cleanup are not blanket authorization to continue into unrelated work.
- Prefer direct `main` commits only for small, reversible corrections consistent with the current handoff.
- Use a feature branch/PR for broad interaction, layout, persistence-model, or cross-cutting changes where isolated review materially reduces risk.
- Treat browser screenshots and explicit browser feedback as the source of truth for visual defects that cannot be verified from source alone.
- Preserve local-first state and existing compatibility unless the requested work explicitly changes the data model.
- Prefer the smallest coherent change over another compatibility patch when the owning renderer/module can be corrected directly.

## Tool and capability routing

`PROJECT_PROFILE.yaml` is the repository-local declaration of normal tool posture.

- GitHub Connector/API work is appropriate for complete-file documentation changes, repository inspection, issue/PR administration, and tiny changes whose correctness does not materially depend on local execution.
- Use a repository-capable local execution surface for changes whose correctness depends on browser behavior, runtime commands, broad multi-file implementation, generated output, or executable validation unavailable through the connector.
- Do not claim that tests, browser checks, accessibility checks, performance measurements, or visual validation ran unless they actually ran in a capable environment.
- Do not escalate to a heavier tool merely because it is available; use the least-powerful safe tool that can complete and validate the requested work.

## Validation and quality

- Run the relevant focused checks and `npm test` for implementation changes, and verify GitHub Actions `Validate` when applicable.
- Visual or interaction changes require the browser smoke coverage described in `docs/QUALITY_GATES.md`; source inspection alone is not acceptance for browser-only defects.
- Persistence changes must preserve existing localStorage data or provide an explicit migration/compatibility path and round-trip coverage.
- UI work must consider keyboard/focus behavior, repeated open/close or navigation cycles, and cleanup of listeners, timers, observers, overlays, or other long-lived resources it creates.
- Performance-sensitive work must use `docs/PERFORMANCE_BUDGET.md`; do not invent a hard numeric threshold until a repeatable repository baseline has been measured and accepted.
