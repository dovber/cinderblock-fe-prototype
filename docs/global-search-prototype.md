Build the **Global Search** FE prototype.

Use the requirements ticket plus the reference screenshots already in:

`/screenshots/global-search 1`
`/screenshots/global-search 2`
`/screenshots/global-search 3`

Treat those screenshots as the visual/UX reference. Match the existing prototype design system and components rather than creating a separate visual language.

## Goal

Add a working Global Search interaction to the main app navigation/header.

This is a FE-only prototype. Use mocked data and client-side filtering only. Do not build backend/search infrastructure.

## Search input

Add the Global Search input in the location shown in the screenshots.

Behavior:

- Clicking/focusing the input opens the search experience.
- Do not navigate to a separate search page.
- Results appear in a dropdown/popover directly below the search field.
- Dropdown should have a sensible max height and scroll internally when necessary.
- Do not add a `See all` action.
- Search begins at **3 characters**.
- With fewer than 3 characters, do not show search results.
- Clearing the query clears the results.
- Clicking outside closes the dropdown.
- `Escape` closes the dropdown.

Use the existing prototype styling for:
- typography
- spacing
- borders
- shadows
- icons
- hover/selected states

## Results

Follow the entity grouping, labels, icons, metadata, and general result formatting shown in the requirements ticket and the three reference screenshots.

Results should be grouped by entity rather than presented as one flat list.

Use enough mocked results to make the prototype realistic and demonstrate multiple result groups.

For example, include realistic results such as:

- Jobs
- Customers
- Appointments
- Estimates
- Invoices

Use the exact entity types from the existing requirements/reference screens if they differ.

For Jobs, the primary result format should follow the established Global Search requirement:

`#1423 • Kitchen Remodel`

The Job ID is required; the name may be absent.

Appointments should show useful secondary context such as:
- date/time
- customer

Customers can demonstrate matching against phone numbers.

Do not make Jobs searchable by customer phone number.

## Match highlighting

Visually highlight the matching portion of result text, following the screenshots.

Example:

Searching:

`555623`

should make the matching `555623` portion of a customer phone number visibly highlighted.

The highlighting should work within both primary and secondary result text where relevant.

## Keyboard navigation

This must be fully usable from the keyboard.

When the result dropdown is open:

### Arrow Down
- Select the next result.
- If nothing is selected yet, select the first result.
- Group headings are not selectable.

### Arrow Up
- Select the previous result.
- Do not select group headings.

### Selected state
- The currently keyboard-selected result should use the same visual state as the hovered/active result.
- If keyboard navigation moves to a result outside the visible portion of the dropdown, automatically scroll it into view.

### Enter
- If a result is selected, pressing `Enter` opens that result.
- If no result is selected, Enter does nothing. Results initially have no selection, and changing the query clears selection. Arrow Down selects the first result when none is selected.

Mouse interaction must work as well:
- hover result
- click result to open it

Do not create separate behavior for mouse and keyboard selection if one shared active-result state can be used.

## Prototype "open result" behavior

Since the actual entity pages are outside the scope of this prototype, opening any result should display a mock modal.

Use the existing modal component/style if one exists.

Modal:

- centered
- normal prototype modal width
- title indicating the result was opened
- center/body prominently shows the selected result

Examples:

`Job 1234`

`Customer Acme Plumbing`

`Invoice 1048`

The displayed value should be generated from the actual selected mocked result, not hardcoded to one entity.

Include:

`Close`

button.

Also allow:
- modal X close button if consistent with existing modals
- `Escape` to close
- clicking the backdrop to close if that matches current prototype modal behavior

Opening the modal should close the search dropdown.

## Search/filter behavior

Implement straightforward client-side matching across the mocked searchable fields.

Matching should be case-insensitive.

At 3+ characters, filter the mocked results and preserve their entity grouping.

Groups with zero matching results should not render.

If nothing matches, show a simple empty state in the dropdown such as:

`No results found`

Do not build fuzzy-search infrastructure for this prototype. The objective is to accurately prototype the UX, not the production search algorithm.

## Important UX details

- Search remains a typeahead dropdown, not a dedicated page.
- No `See all`.
- Keep result rows compact, as shown in the screenshots.
- Preserve useful secondary metadata.
- Do not overload rows with unnecessary information.
- Use the appropriate Tabler icons already used by the project.
- Job results should use the briefcase icon.
- Keyboard selection and mouse hover should feel like one coherent interaction.
- Search input should retain focus while using Up/Down arrows.
- Prevent arrow-key navigation from moving the page while navigating results.

## Prototype scenarios

Make sure the mocked dataset allows us to visibly test:

1. Query with results across several entity groups.
2. Query matching only one group.
3. Customer phone-number match.
4. Highlighted text match.
5. No results.
6. Enough results for the dropdown to scroll.
7. Keyboard navigation across results from different groups.
8. Enter opening the currently selected result.
9. Clicking a result opening the same mock modal.
10. Escape/click-away closing the search.

## Scope

Do not build:
- backend APIs
- PostgreSQL search
- pg_trgm
- routing to real entity pages
- actual permissions/search authorization logic
- a full search-results page

This should be a polished, working **front-end Global Search prototype** based on the ticket and `/screenshots/global-search 1–3`.

Before implementing, inspect the existing prototype structure and reuse its components/patterns wherever possible rather than creating duplicate UI primitives.
## Implementation and verification — September 15, 2026

- Implemented in `src/prototypes/global-search/`; app composition passes it through
  the shell's `headerSearch` slot, keeping prototype modules independent.
- References are `screenshots/global-search-1.png`, `global-search-2.png`, and
  `global-search-3.png`. The pasted request above is the supplied requirements;
  no separate Global Search ticket was present in the workspace.
- Groups: Customers, Jobs, Invoices, Estimates, Purchase Orders, Appointments.
  Groups use a stable order and show only matching records with counts.
- Tabler icons were added for this module. Jobs use the briefcase icon.
- Names, IDs, metadata, dates, and matching description/note excerpts use
  case-insensitive substring matching. Customer phone matching also ignores
  punctuation; highlighting maps matched digits back to the displayed phone.
- Job 555623 matches its own ID. Jobs have no searchable customer phone field.
- The shared native dialog provides focus containment, focus restoration, X,
  Close, and Escape. It retains the existing no-backdrop-dismiss behavior.
- Ctrl K focuses search and opens the dropdown, except in another editable field. The empty input displays a fixed Ctrl K hint. Tab away also dismisses the dropdown.

### Review queries

| Query | Expected behavior |
| --- | --- |
| Empty, `s`, or `sm` | Type 3 characters to search; no results or Enter action |
| `smi` or `SMITH` | Six groups; enough results to scroll |
| `broken window` | Highlighted description/note excerpts in four groups |
| `555623` | Customer phone match plus the independently matching Job ID |
| `55562330` | Customer only; related Jobs excluded |
| `5551122` | Customer match across the displayed phone hyphen |
| `Home Depot` | Purchase Orders only |
| `zzzznothing` | No results found |

Verified in the browser at 1280 × 720: result groups, threshold, clearing,
phone matching, highlights, Up/Down across groups with internal scrolling,
Enter and click opening the selected record, modal Close and Escape,
search Escape and click-away. Browser warning/error logs were empty.
Validation commands: `pnpm typecheck`, `pnpm lint`, `pnpm build`.

Matching characters use the same yellow background in primary titles, IDs, secondary text, phone numbers, and other displayed metadata. Highlighting inherits the surrounding typography and text color.
The header search is centered in the available space before the right-side controls, with a 620px maximum width and responsive shrinking. Its dropdown matches the field width and remains anchored below it.
