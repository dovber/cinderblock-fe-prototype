# Cinderblock visual and UI system

Reference review: September 10, 2026. Scope: visual guidance and scaffold foundations for faithful future prototypes. Inter font imports, Lucide icons, color tokens, and preliminary shared React primitives with CSS Module styles are present. The reusable desktop workspace shell and a local placeholder preview are implemented; product screens and feature logic remain unimplemented.

## Current implementation

`src/shared/ui/tokens.css` defines the initial CSS variables. `src/app/styles.css` imports those tokens and Inter weights 400, 500, and 600 from `@fontsource/inter`, and supplies global resets and keyboard focus styles. `src/shared/ui/components.tsx` and `ui.module.css` provide preliminary buttons, fields, cards, status variants, tabs, tables, pagination, and dialogs, exported through `src/shared/ui/index.ts`.

The app composes `src/prototypes/shell-preview`, which consumes `src/shared/shell` and the shared page heading, button, card, progress bar, and modal primitives. The desktop shell uses a 248px sidebar, 56px utility header, and 28px horizontal content inset. Navigation only changes the local selected section and placeholder heading; utility actions show a local unavailable-action dialog. The collapse control is reference chrome with that same placeholder response; no collapsed layout is inferred. The cube mark is reconstructed SVG and the account avatar uses initials. Their styles are starting implementations, not a visually verified product component library. The layout families and contracts below guide future requested work; they do not indicate completed screens or authorize building additional components speculatively.

## Source of truth and fidelity

Use the supplied screenshots as the authority for screen composition, density, labels, and visible states. Use the PDFs only to understand document typography, content hierarchy, and printed layout. **All future document previews must be React-rendered HTML and CSS, never generated PDFs, PDF viewers, embedded PDF files, or rasterized PDF pages.**

Match the existing product closely. Preserve its quiet white surfaces, pale gray/lavender navigation and editor canvas, blue actions, restrained borders, compact status labels, and information-rich tables. Do not replace the navigation, simplify the financial layouts, enlarge everything into dashboard cards, or introduce a new brand language.

The reference set contains different layouts and capture scales. Screenshot pixels are not proven CSS pixels: browser zoom and device pixel ratio are unknown. Sampled colors below are direct source-image RGB values; proposed CSS sizes are starting estimates to calibrate against the relevant screenshot. Font identification is confirmed only for the PDFs. Static screenshots establish appearances, not working interactions or business rules.

See [the complete reference review](reference-review.md) for per-file findings and [the reference manifest](reference-manifest.json) for original dimensions, PDF page counts, and SHA-256 hashes.

## Shared foundations

### Color tokens

The table names describe visual roles. Initial values are implemented in `src/shared/ui/tokens.css` using `--cb-*` variables (for example, `internal-action` maps to `--cb-action`, and `customer-action` to `--cb-customer-action`). Keep internal and customer-facing variants explicit; calibrate preliminary values when components gain real consumers.

| Suggested token | Value | Evidence / use |
| --- | --- | --- |
| `surface` | `#FFFFFF` | Cards, forms, tables, document sheet across all screenshots |
| `internal-nav-surface` | `#F8F8FD` | Sidebar and list table header/footer; sampled in both list screenshots |
| `internal-editor-canvas` | `#FAFAFD` | Estimate and progress-invoice editor background |
| `internal-selected-nav` | `#E5E8ED` | Selected sidebar row |
| `internal-action` | `#4070E7` | New estimate/invoice, save invoice, modal primary action |
| `internal-secondary-surface` | `#F8FBFF` | Pale blue outlined action backgrounds |
| `internal-settings-selected` | `#E5F2FE` | Selected gear pane tab in progress-invoice editors |
| `internal-text` | `#141925` | Dark text sampled in progress-invoice editors |
| `internal-text-secondary` | `#4E5564` | Navigation, secondary controls and text |
| `internal-border` | `#E5E8ED` | Starting separator/border tone; some sources also use `#E5E8EC` |
| `internal-pending-surface` | `#FEFAEC` | Pending/open status background in list views |
| `customer-canvas` | `#E4E7EB` | All three weblink backgrounds |
| `customer-subtle-surface` | `#F9FAFB` | Customer table headers and summary backgrounds |
| `customer-text` | `#111827` | Customer document headings and dark text |
| `customer-action` | `#2563EB` | Accept and Pay Now buttons |
| `customer-action-surface` | `#EFF6FF` | Pending estimate and balance-due banners |
| `customer-success-surface` | `#F0FDF4` | Signed estimate banner |
| `customer-success-chip` | `#DCFCE7` | Signed & Accepted pill |

Muted labels are cool gray; placeholder text is lighter. Internal pending/open text is amber-brown, accepted/partially paid labels are olive-green, converted labels are blue, and draft labels are slate. Exact text colors for these small badges require local sampling when implementing. Do not substitute saturated full-fill status pills.

Customer-facing success uses a clearer green than internal status labels. Payment amounts in payment history are green. The internal job overview uses green for profit, margin, and payment progress. Urgent tags use a pale red fill with red text/border; follow-up tags use subdued teal. Color is accompanied by a readable label.

### Typography

Both PDFs embed **Inter Regular, Medium, and SemiBold**. Internal screenshots show a similar neutral sans serif, but the exact family is not established by image evidence. The scaffold now loads Inter weights 400, 500, and 600 through `@fontsource/inter`, with `Arial, sans-serif` fallback in the shared tokens. This is an initial choice for future matching, not confirmation of the internal product font.

| Role | Initial CSS estimate | Treatment |
| --- | --- | --- |
| Internal page title | 28-32px / 1.2 | Medium to semibold, dark |
| Editor title / card heading | 18-20px / 1.3 | Medium to semibold |
| Internal body, fields, tabs | 14-16px / 1.4-1.5 | Regular; selected values sometimes medium |
| Small metadata | 12-14px / 1.4 | Muted |
| Customer document title / banner amount | 28-32px / 1.2 | Semibold; amount uses blue or green |
| Customer document body | 14-16px / 1.5 | Compact and legible |
| Customer section and column labels | 10-12px / 1.4 | Uppercase, muted, modest letter spacing |

Use sentence case in app UI and uppercase only for the observed document captions and editor status markers. Preserve currency alignment and two decimal places. Use tabular numerals for financial columns as an implementation aid. The signed customer estimate contains a handwritten signature treatment; ordinary text remains sans serif.

### Spacing, borders, shape, elevation

Use an initial 4px spacing scale: 4, 8, 12, 16, 20, 24, 32, 40. Typical internal card padding is approximately 16-24 CSS px. Preserve the generous blank areas in detail cards and beneath list tables.

- Internal buttons and inputs: approximately 4-6px corner radius and 36-40px height. Icon buttons are compact squares.
- Internal cards: approximately 6-8px radius, thin cool-gray border, generally no shadow.
- Filter controls: pill-shaped outlined capsules. Status badges in tables are small rounded rectangles, not the same component as filter pills.
- Customer sheet: slightly rounded corners with a subtle downward shadow. Inner panels and banners: approximately 10-12px radius.
- Modal: noticeably rounder than internal cards, approximately 16px radius, substantial soft shadow over a dimmed background.
- Primary and outlined actions have subtle elevation in the references. Avoid heavy shadows on every card.

These sizes require calibration. Preserve relative proportions before refining individual pixels; do not apply one scale factor to all source images.

## Layout families

### 1. Internal workspace shell

Authority: `estimates-table.png`, `invoices-table.png`, `job-profile.png`.

At original screenshot scale, the left sidebar is roughly 328-330px wide, around 13.3% of the ~2460px viewport. The utility header is roughly 74-80px tall. These are reference-image measurements, not final CSS widths. An initial CSS sidebar near 240-260px and utility header near 56px should be calibrated at the chosen browser viewport.

Sidebar order: Cinderblock cube/wordmark and collapse control; outlined Create new; Dashboard, Tasks, Calendar; separator; Jobs, Estimates, Invoices, Purchase orders, Timesheets; separator; Customers, Vendors. The onboarding label, Continue link, thin green progress bar, and completion count sit near the bottom. Selected navigation is a full-width pale gray rounded row, with dark text and icon.

The white utility header places Help, notification bell with red count, settings, and circular avatar at the far right. A fine bottom border separates it from content. Main content begins with a left-aligned page title and right-aligned blue creation button.

For jobs, retain the sidebar and utility header, then split the workspace into a broad primary column and a right notes panel. The notes panel is approximately 24% of the full screenshot width, with a vertical border; it is not a floating overlay.

### 2. Full-screen document editor

Authority: `pending-estimate.png`, `new-progress-invoice.png`, `view-progress-invoice.png`.

This layout replaces the global sidebar with a full-width editor header. Put a close icon at left, document title and optional job subtitle beside it, and document actions at right. Below it is a horizontal section tab bar with blue text and a thin blue underline for the active section.

The content canvas is pale lavender-gray with stacked white bordered cards. Details appear before items and totals. Metadata uses a spacious three-column grid: labels above values, small contextual icons, customer/job controls, and a status marker toward the card's upper-right corner.

The estimate shows Preview, outlined Send estimate with split dropdown, disabled Save changes with split dropdown, and overflow. Its right rail is collapsed to history/settings icons and an expand control. Progress-invoice captures show an expanded settings pane occupying about 31-32% of the image width. Keep that as an editor layout variant, not a universal workspace sidebar width.

Progress editor settings have history/gear tabs above the pane, section headings and descriptions, then aligned label, Visible/Hidden text, and switch controls. Separate editor visibility from customer-view visibility; both groups are visible and carry different fields. Keep their distinction in future component contracts.

### 3. Customer document view

Authority: all three `weblink-*.png` files.

Use a gray full-page canvas, a centered white sheet, and an external centered Powered by Cinderblock footer with copyright and policy links. The sheet is approximately 1272 image pixels wide in all three original 2472px-wide captures, with about 48px image padding and a top offset near 72px. Its height follows content. A future CSS max-width near 960px with 32-36px padding is an initial estimate, not a verified original rule.

Sheet sequence:

1. Merchant logo at left and merchant name/contact at right, then a divider.
2. Document title and identifier; optional linked-estimate line; Print/PDF icon labels at right as reference chrome.
3. Wide amount/status/action banner.
4. Customer and job at left, dates at right, with small uppercase labels.
5. Line-item table, then a narrow right-aligned totals box.
6. Note panel and collapsed Terms & Conditions row.
7. Optional acceptance panel, then invoice or payment history.

Pending estimate: blue-tinted banner with total at left and Decline/Accept at right. Signed estimate: green-tinted banner with total and Signed & Accepted chip, then acceptance information below terms. Invoice: blue-tinted balance-due banner, smaller original-total line, Pay Now button, and subdued payment-security caption.

The supplied screen has Print/PDF controls, but their appearance does not authorize implementing export or PDF generation. Any future preview remains HTML, even when imitating a sheet or print layout.

## Reusable component contracts for later work

These describe target visual responsibilities. Some primitives already exist as noted above, but the complete patterns and layouts are not implemented. Do not build all components speculatively. Keep prototype-specific data and workflows local; promote actual shared components under `src/shared` when needed.

| Pattern | Shared responsibility | Variants / boundaries |
| --- | --- | --- |
| Workspace shell | Sidebar, utility header, content region | List content vs job content with notes pane |
| Page heading | Title left, primary action right | Estimates / Invoices labels |
| Summary metric | Small label, muted count, amount underneath, thin border | Lists place cards in a row beside date-range selector; job overview groups metrics inside one card |
| Filter bar | Search box, short separator, outlined dropdown pills | Date/status/creator/salesperson labels vary by list |
| Data table | Selection, sorting marks, aligned columns, row overflow, footer | Keep estimate/invoice column order distinct |
| Status label | Semantic text plus variant-specific color | Internal table, editor marker, and customer pill are distinct shapes |
| Tabs | Active blue underline; neutral inactive tabs | Editor section tabs vs job tabs; job subtabs use a segmented background |
| Detail card | Heading, metadata grid, optional status/actions | Estimate and invoice field sets differ |
| Item table | Item description first; numeric columns aligned | Estimate cost/markup/price vs progress contract/previous/current billing vs customer qty/unit price/amount |
| Totals block | Right-aligned labels and currency, emphasized final line | Editor calculation rows; customer total; invoice paid/balance rows |
| Split action | Main labeled action plus separated chevron | Primary save, outlined send, disabled save |
| Settings group | Heading, optional helper text, rows with switches | Editor fields vs customer fields, subsection dividers |
| Modal choice group | Heading, radios, conditional input, action footer | Full estimate, partial percentage, selected items |
| Customer sheet | Shared merchant/document framing and ordered sections | Pending estimate, signed estimate, invoice |
| History table | Compact uppercase headers, subtle borders | Invoice history vs payment history; distinct columns |
| Notes panel | Heading/search, composer, authored note cards | Job workspace only in supplied references |

### Lists and tables

Place date range and financial summary cards above the search/filter row. The next row shows result count at left, page size and pagination plus table settings at right. Header and aggregate footer have a pale tint; body rows stay white with fine horizontal dividers. No zebra striping is visible. Active sort is blue, other sort carets are gray. Checkboxes are small outlined squares. Amounts and footer totals align right, with overflow icons at the far edge.

Estimate columns: selection, ID, Customer, Estimate date, Job ID, Status, Amount, overflow. Invoice columns: selection, ID, Invoice date, Customer, Job ID, Due, Status, Amount, overflow. Keep blank job IDs blank. Preserve the displayed due-date alternative On receipt.

Table rows are approximately 72 source-image pixels high in the list captures; start near 48-56 CSS px and match the chosen rendering scale. Keep the table broad rather than wrapping numeric cells into stacked cards.

### Editor line items and financial hierarchy

Estimate editor: row index, item name and Add description, Cost, Markup, Price, Qty, Amount, overflow. Under the row are Add another, Services & Materials, and Add cost plus. Totals show subtotal, discount control, tax, total, followed by a separate internal cost/margin/profit breakdown.

Progress invoice: row index, item name/description, Qty, Contract, Prev. billed, This invoice, overflow. Current billing is darker than the muted contract/previous values. Tiny tax markers appear beside current values. The bottom block contains a percent-prefix Cost plus input, Cost plus fee, Subtotal with info icon, currency-prefix Discount, tax with info icon, and a bold Total.

Do not expose editor-only cost, markup, margin, profit, settings, or internal notes in customer documents. Preserve separate display models rather than dumping an editor table into the preview. The financial examples in the progress mockups are not reliable calculation specifications; do not derive billing rules from their totals.

### Controls and visible states

- Selected radio: blue outline and center dot; unselected radio: light outline. In the modal, only Part of this estimate is selected and its subtotal and percentage input are visible.
- Switch on: blue track, white thumb at right, Visible text. Off: gray track, thumb left, Hidden text.
- Disabled Save changes and disabled pagination arrows use pale fills and subdued foregrounds.
- Buttons combine a small icon and label where shown. Icon-only controls include collapse, close, overflow, settings, and history; use consistent stroke weight and alignment.
- Selected editor tab uses a blue underline. Selected settings gear tab uses a pale blue fill.
- Tag chips include small removal crosses; assigned-user chip includes a circular avatar.
- Empty invoice history is a bordered panel with centered muted explanatory text.

Hover, focus, error, loading, expanded dropdown, tooltip contents, mobile behavior, and completed action flows are not supplied. When later needed, implement accessible keyboard focus, real button/input semantics, radio groups, labeled switches, and focus-managed dialogs while matching the observed appearance. These are implementation requirements, not evidence of the original behavior. Do not invent business actions in this setup phase.

## Document references translated to HTML

Both PDFs are US Letter, 612 x 792 points, two pages each. They confirm Inter typography, left logo/right contact framing, uppercase metadata, horizontal item tables, right-aligned totals, bordered notes/terms, and small page footers. Their merchant address and larger logo differ from the compact weblink headers. Their call-to-action strips show a button, URL, and QR code rather than the weblink amount banner.

For a future customer web preview, follow the weblink screenshot hierarchy. If a future request explicitly calls for the printed visual layout, reproduce its structure with HTML/CSS, optionally using print media styles. Keep text selectable, use semantic tables and sections, and keep layout responsive to content. Do not use the PDF binary, image renders, a canvas screenshot, or a PDF generation package as the preview implementation.

The PDF terms are reference content, not a request to create legal policies. Preserve their visual treatment and section structure if later required. Do not make the live reference URLs or QR codes into working prototype payment/acceptance destinations. Keep future prototypes local and use inert mock data.

## Future fidelity review

Before implementing a requested screen, identify its exact source and state. Match shell, panel proportions, section ordering, and whitespace first, then typography, borders, color, icons, and alignment. Compare at an equivalent viewport and normalize screenshot scale before deciding sizes are wrong.

Check long item names, large amounts, blank metadata, disabled controls, and the difference between internal and customer status styling. Preserve each screenshot's labels, including Partially paid in the internal list and Partially Paid in customer invoice history. Do not assume the differently named progress-invoice files show a read-only view: both show save actions and editor settings.

Only desktop references are available. Any responsive behavior requires a conservative implementation decision later; it is not verified source behavior. Do not add mobile navigation or new layouts during this setup.
