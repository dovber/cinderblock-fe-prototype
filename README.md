# Prototype workspace

A standalone React + Vite + TypeScript sandbox for product and UX experiments.
This is not a production app and has no connection to the real application.
The initial screen previews the reusable desktop Cinderblock shell. Open Estimates,
then choose Regular Estimate or Estimate w/ Retainage. The regular scenario exposes
the general contract lifecycle; the retainage scenario isolates withholding and
release-invoice behavior.

## Cinderblock reference setup

Copied from `C:\Users\dovbe\Documents\Codex\2026-09-10\create-a-standalone-react-vite-frontend`
on September 10, 2026, excluding `node_modules`, `dist`, `work`, and `outputs`.
The existing `screenshots/` and `pdf-docs/` folders were preserved unchanged.

Read [the shared Cinderblock visual/UI system](docs/cinderblock-ui-system.md)
and [the complete reference review](docs/reference-review.md) before future UI work.
The [reference manifest](docs/reference-manifest.json) records all source files.
The workspace includes Inter fonts, Lucide icons, shared tokens and primitives,
plus a reusable desktop shell in src/shared/shell. The local
src/prototypes/shell-preview composes the shell with a minimal prototype launcher.
Unsupported product areas and utility actions remain visible but inert.
The unified contract lifecycle uses mock frontend data only; see its
[module documentation](src/prototypes/progress-invoices/README.md) and
[consolidation requirements](docs/contract-lifecycle-prototype.md).
The shell uses a reconstructed cube mark and initials avatar pending original brand assets.
Run pnpm dev and open the local address to inspect the preview.

Match the existing product closely. PDF files are visual references only:
future document previews must use HTML and CSS, never generated PDFs.

## Local development

Use Node.js 22.12+ (or a newer supported LTS) and pnpm.

```sh
pnpm install
pnpm dev
```

Open the local address printed by Vite. To check the workspace:

```sh
pnpm lint
pnpm typecheck
pnpm build
pnpm preview
```

`preview` serves the build locally. Nothing is deployed.

## Structure

```text
src/
  main.tsx          # React startup only
  app/              # Prototype composition and global styles
  prototypes/       # Independent shell preview and product-design sandboxes
  shared/ui/        # Preliminary primitives, CSS Module styles, and tokens
```

The dependency direction is app → prototypes → shared. Prototypes must not
depend on the app shell or on one another. ESLint enforces these boundaries.
Keep each prototype's components, mock data, state, and CSS Modules in its folder.
Expose a small public entry point through `index.ts`; compose it in the app shell.
Add routing, providers, and other infrastructure only when a prototype needs them.
Avoid expanding the existing shared primitives speculatively; add shared code
when actual consumers establish the need.

## Version control

This directory is a local Git repository on `main`, with a committed shared-shell
baseline. Product prototype work after that baseline is uncommitted. Dependencies,
the local pnpm store, build output, and local environment files are ignored;
source screenshots and PDFs remain eligible for version control.

Before changing shared code, check its consumers. Before adding an experiment,
run the checks above and smoke-check existing experiments. Isolation reduces
accidental coupling but does not replace validation.

Do not add production credentials or real customer data. Use local mock data.
