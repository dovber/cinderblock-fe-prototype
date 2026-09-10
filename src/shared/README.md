# Shared code

`ui/` currently contains preliminary React primitives, their CSS Module styles,
and initial Cinderblock tokens. The shell preview consumes the page heading,
buttons, card, progress bar, and modal. Calibrate other primitives against the documented
references when they are first used; the reusable desktop workspace shell is implemented in `shell/`.

Only put code here when multiple prototypes actually need the same stable behavior.
Add components, hooks, utilities, or types as needed; avoid speculative abstractions.
Shared code must not import from the app shell or any prototype.
Changes here can affect every consumer, so verify all affected prototypes.
