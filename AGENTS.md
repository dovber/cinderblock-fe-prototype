# Cinderblock prototype instructions

Read `docs/cinderblock-ui-system.md` and `docs/reference-review.md` before implementing UI. Match the supplied product references closely; do not redesign. Preserve `screenshots/` and `pdf-docs/` as source references.

PDFs are visual references only. Future document previews must use React-rendered HTML and CSS, never generated PDFs, embedded PDF viewers, or rasterized pages.

The workspace now contains several interactive frontend prototype modules. Read `docs/current-prototype-state.md` before continuing product work; it identifies the current modules, authoritative requirements, shared decisions, validation commands, and working-tree cautions. Build or change product behavior only when the user requests it. The original scaffold placeholder is not a Cinderblock visual reference.

Keep the existing app -> prototypes -> shared dependency direction. Keep prototype data and behavior local; introduce shared implementation when needed by actual consumers. Use the documented internal/customer variants instead of flattening their differences. Do not connect prototype actions to live reference payment or acceptance URLs.
