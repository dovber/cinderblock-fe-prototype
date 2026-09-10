# Independent prototypes

shell-preview/ is a local desktop shell preview with placeholder content, navigation selection, and unavailable-action feedback. It imports shared shell/UI primitives and contains no business workflows.

Keep future prototypes independent, with local data, state, and CSS Modules. Expose each through index.ts; never import another prototype or the app. Do not connect to production APIs.
