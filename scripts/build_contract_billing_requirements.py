from pathlib import Path
from datetime import date
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.section import WD_SECTION
from docx.oxml import OxmlElement
from docx.oxml.ns import qn


ROOT = Path(__file__).resolve().parents[1]
OUT_DOCX = ROOT / "docs" / "cinderblock-contract-billing-requirements.docx"

NAVY = "13283B"
BLUE = "326CE5"
PALE_BLUE = "EEF4FF"
PALE_GRAY = "F5F7FA"
LIGHT_GRAY = "D9DEE7"
MID_GRAY = "667085"
GREEN = "13795B"
RED = "B42318"
BLACK = "000000"
WHITE = "FFFFFF"


def set_cell_fill(cell, color):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), color)


def set_cell_margins(cell, top=100, start=120, bottom=100, end=120):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for side, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{side}"))
        if node is None:
            node = OxmlElement(f"w:{side}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_table_borders(table, color=LIGHT_GRAY, size=4):
    tbl_pr = table._tbl.tblPr
    borders = tbl_pr.first_child_found_in("w:tblBorders")
    if borders is None:
        borders = OxmlElement("w:tblBorders")
        tbl_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        elem = borders.find(qn(f"w:{edge}"))
        if elem is None:
            elem = OxmlElement(f"w:{edge}")
            borders.append(elem)
        elem.set(qn("w:val"), "single")
        elem.set(qn("w:sz"), str(size))
        elem.set(qn("w:color"), color)


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def set_keep_with_next(paragraph, value=True):
    p_pr = paragraph._p.get_or_add_pPr()
    node = p_pr.find(qn("w:keepNext"))
    if value and node is None:
        p_pr.append(OxmlElement("w:keepNext"))
    elif not value and node is not None:
        p_pr.remove(node)


def add_page_field(paragraph):
    run = paragraph.add_run()
    fld = OxmlElement("w:fldSimple")
    fld.set(qn("w:instr"), "PAGE")
    run._r.addnext(fld)


def add_table(doc, headers, rows, widths=None, font_size=8.7):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_table_borders(table)
    hdr = table.rows[0]
    set_repeat_table_header(hdr)
    for i, header in enumerate(headers):
        cell = hdr.cells[i]
        set_cell_fill(cell, NAVY)
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        set_cell_margins(cell)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        r = p.add_run(str(header))
        r.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)
        r.font.size = Pt(font_size)
    for ridx, row in enumerate(rows):
        cells = table.add_row().cells
        if ridx % 2:
            for cell in cells:
                set_cell_fill(cell, PALE_GRAY)
        for i, value in enumerate(row):
            cell = cells[i]
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            set_cell_margins(cell)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(str(value))
            r.font.size = Pt(font_size)
            r.font.color.rgb = RGBColor(0, 0, 0)
    if widths:
        for row in table.rows:
            for i, width in enumerate(widths):
                row.cells[i].width = Inches(width)
    doc.add_paragraph().paragraph_format.space_after = Pt(0)
    return table


def add_bullets(doc, items, level=0):
    for item in items:
        p = doc.add_paragraph(style="List Bullet" if level == 0 else "List Bullet 2")
        p.add_run(item)


def add_numbered(doc, items):
    for item in items:
        doc.add_paragraph(item, style="List Number")


def add_flow(doc, steps):
    table = doc.add_table(rows=1, cols=len(steps))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    for i, step in enumerate(steps):
        cell = table.cell(0, i)
        set_cell_fill(cell, PALE_BLUE if i < len(steps) - 1 else NAVY)
        set_cell_margins(cell, top=130, bottom=130)
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(step)
        r.bold = True
        r.font.size = Pt(8.5)
        r.font.color.rgb = RGBColor(255, 255, 255) if i == len(steps) - 1 else RGBColor(19, 40, 59)
    set_table_borders(table, color=WHITE, size=8)
    doc.add_paragraph().paragraph_format.space_after = Pt(0)


def add_req_section(doc, prefix, title, intro, requirements):
    doc.add_heading(title, level=1)
    if intro:
        doc.add_paragraph(intro)
    for req_id, req_title, body in requirements:
        p = doc.add_heading(f"{req_id} {req_title}", level=3)
        set_keep_with_next(p)
        doc.add_paragraph(body)
    doc.add_heading(f"{title} Requirements Index", level=2)
    add_table(doc, ["ID", "Requirement"], [(rid, name) for rid, name, _ in requirements], widths=[1.3, 5.9], font_size=8.3)


def configure_styles(doc):
    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = "Aptos"
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = RGBColor(30, 41, 59)
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.08
    for name, size, before, after in (
        ("Title", 30, 0, 16),
        ("Subtitle", 13, 0, 8),
        ("Heading 1", 20, 18, 8),
        ("Heading 2", 14, 14, 6),
        ("Heading 3", 11.2, 10, 3),
        ("Heading 4", 10.5, 8, 2),
    ):
        st = styles[name]
        st.font.name = "Aptos Display" if name in ("Title", "Heading 1", "Heading 2") else "Aptos"
        st.font.size = Pt(size)
        st.font.bold = name != "Subtitle"
        st.font.color.rgb = RGBColor(0, 0, 0)
        st.paragraph_format.space_before = Pt(before)
        st.paragraph_format.space_after = Pt(after)
        st.paragraph_format.keep_with_next = True
    styles["Title"].paragraph_format.space_after = Pt(18)
    for list_name in ("List Bullet", "List Bullet 2", "List Number"):
        styles[list_name].font.name = "Aptos"
        styles[list_name].font.size = Pt(10.2)
        styles[list_name].paragraph_format.space_after = Pt(3)


GLOBAL = [
    ("GLOBAL-001", "Accepted Estimate establishes the Contract", "Accepting an Estimate establishes the Contract used for tracked Progress billing."),
    ("GLOBAL-002", "Current Contract composition", "Before any Accepted Change Order, the Contract equals the Accepted Estimate. After acceptance, each Change Order revises that same Contract, so the Current Contract equals the Accepted Estimate plus all Accepted Change Orders."),
    ("GLOBAL-003", "One Progress accounting model", "Progress Invoicing uses one Contract-based accounting model from Estimate acceptance onward. The first Accepted Change Order does not create a second model, migrate history, or reset any ledger."),
    ("GLOBAL-004", "Source line lineage", "Every accepted Estimate and Change Order source line retains its source document, source line identity, accepted quantity and amount, posted allocation, Draft reservation, and remaining billable allocation."),
    ("GLOBAL-005", "No Estimate to Change Order line mapping", "The product must not require a one-to-one mapping between an Estimate line and a Change Order line. Removed and replacement scope are independent accepted adjustments with preserved lineage."),
    ("GLOBAL-006", "Gross Contract Scope", "Gross Contract Scope equals accepted base line scope plus applicable Cost Plus scope, before discount, tax, retainage, and payments."),
    ("GLOBAL-007", "Contract Value", "Contract Value equals Gross Contract Scope less the accepted Contract Discount. Tax, retainage, and payments do not change Contract Value."),
    ("GLOBAL-008", "Nonnegative Contract Value", "Estimate or Change Order acceptance must fail without mutation when the resulting Contract Value would be below zero. Contract Value may equal zero."),
    ("GLOBAL-009", "Contract Progress", "Contract Progress equals posted Gross Contract Scope invoiced divided by current Gross Contract Scope. Discount, tax, retainage, and payments do not increase or decrease progress."),
    ("GLOBAL-010", "Total Invoiced", "Total Invoiced equals posted base and Cost Plus allocations less discount applied to posted invoices. Tax, retainage, and payments are excluded."),
    ("GLOBAL-011", "Remaining subtotal", "Remaining subtotal is the gross, pre-discount Contract source scope available for a new Progress Invoice after posted billing and active Draft reservations. The Discount Pool is not subtracted."),
    ("GLOBAL-012", "Contract summary Remaining", "The Contract summary Remaining equals Contract Value less Total Invoiced. It is a different net measure from Remaining subtotal."),
    ("GLOBAL-013", "Accepted Progress state", "The tracked Contract state is Accepted when the Contract is accepted and no tracked invoice has posted."),
    ("GLOBAL-014", "Partially Billed state", "The Contract state is Partially Billed when posted tracked billing exists and current gross Contract scope remains uninvoiced."),
    ("GLOBAL-015", "Billed state", "The Contract state is Billed when posted tracked billing exists and no current gross Contract scope remains available under the completion rules."),
    ("GLOBAL-016", "Billed Contract reopening", "Accepting new positive scope on a Billed Contract changes its billing state to Partially Billed when prior posted billing remains and the revised Contract has uninvoiced scope."),
    ("GLOBAL-017", "Change Order lifecycle independence", "Draft, Pending, Accepted, Declined, and Canceled describe Change Order approval history. They remain distinct from the Contract's billing state."),
    ("GLOBAL-018", "Invoice posting event", "Open is the posting event. A Draft reserves selected scope and financial pools but does not contribute to Previously Billed, Total Invoiced, Contract Progress, or recognized retainage."),
    ("GLOBAL-019", "Invoice lifecycle", "The tracked invoice lifecycle is Draft to Open to Partially Paid to Paid. An Open invoice cannot return to Draft."),
    ("GLOBAL-020", "One active tracked Draft", "At most one active tracked invoice Draft may reserve a Contract at a time, including a Progress Invoice Draft or Retainage release Draft."),
    ("GLOBAL-021", "Latest invoice financial eligibility", "Only the latest active tracked Open invoice may be financially edited or canceled, and only when ordinary payment prerequisites allow it. A later Draft or accepted Contract revision locks earlier Open invoices financially."),
    ("GLOBAL-022", "Payment activity remains available", "A financial lock does not block ordinary payment application, void, refund, or unapply behavior. Payment actions do not reverse Contract allocations or restore edit eligibility to an earlier invoice."),
    ("GLOBAL-023", "Draft release behavior", "Deleting or canceling a Draft releases its reserved base scope, Cost Plus, discount, retainage release capacity, and Tax Credit, and releases its active milestone association."),
    ("GLOBAL-024", "Posted cancellation behavior", "Canceling an eligible posted tracked invoice reverses its posted allocations and financial pool consumption, preserves history and document number, and recalculates Contract and Payment Schedule state."),
    ("GLOBAL-025", "Discount Pool", "The Contract Discount Pool combines the Accepted Estimate discount and signed discount adjustments from Accepted Change Orders. Draft, Pending, Declined, and Canceled Change Orders do not change it."),
    ("GLOBAL-026", "Discount reservations", "A Draft reserves its selected nonnegative discount. Opening consumes it, and Draft deletion or eligible invoice cancellation releases or restores it."),
    ("GLOBAL-027", "Unused discount", "A contractor may invoice all gross scope without exhausting the Discount Pool. Opening the final gross-scope invoice with unused discount requires a warning but remains allowed."),
    ("GLOBAL-028", "Cost Plus basis", "Cost Plus is calculated from customer-facing selling Price, not internal Cost. The fee is explicit accepted scope with lineage to the priced source line."),
    ("GLOBAL-029", "Cost Plus consumption", "An invoice consumes Cost Plus scope in the same proportion as its associated base scope and must not calculate Cost Plus again over the invoice subtotal."),
    ("GLOBAL-030", "Tax boundary", "Tax is outside Gross Contract Scope, Contract Value, Contract Progress, and Total Invoiced. Contract-derived invoices inherit the accepted Contract tax configuration and component taxability."),
    ("GLOBAL-031", "Tax Credit Balance", "Historical tax attributable to accepted deductive scope creates a Tax Credit Balance that may offset only calculated tax on future normal invoices. It never reduces principal or creates an automatic refund."),
    ("GLOBAL-032", "Retainage boundary", "Retainage is withheld from discounted principal, excluding tax. It changes Amount Due and Accounts Receivable but not Gross Contract Scope, Total Invoiced, Contract Progress, or milestone consumption."),
    ("GLOBAL-033", "Payment Schedule boundary", "Payment Schedule is an advisory planning and history layer based on Contract Value. It never reserves Contract scope or overrides invoice availability rules."),
    ("GLOBAL-034", "Historical allocations", "Accepted Contract revisions never redistribute historical billing. Posted amounts remain attributed to the source lines and document revisions on which they occurred."),
    ("GLOBAL-035", "Source of truth", "Cinderblock remains authoritative for Contract billing state. External accounting edits must not recalculate Cinderblock scope, progress, pools, ledgers, milestones, or lineage."),
]

STDINV = [
    ("STDINV-001", "Purpose", "A Standard Invoice copies Estimate scope into a flexible invoice when the contractor does not need tracked Progress billing."),
    ("STDINV-002", "Contract relationship", "A Standard Invoice remains linked to its source Estimate and uses the copied Estimate terms, but it does not participate in the tracked Contract Progress allocation model."),
    ("STDINV-003", "Eligibility", "Standard Invoice creation is available only before a tracked Progress Invoice or active Standard Invoice conversion has made the billing paths mutually exclusive."),
    ("STDINV-004", "Entry choice", "For an eligible Estimate with no invoice history, Create invoice offers Standard invoice and Progress invoice. Selecting Standard invoice opens the unsaved Standard Invoice editor without an additional setup step."),
    ("STDINV-005", "Copied lines", "Every Estimate line is copied into the Standard Invoice with Item name, Price, Qty, and Amount."),
    ("STDINV-006", "Flexible editing", "Copied Standard Invoice lines may be edited or removed, and ordinary invoice lines may be added under existing Standard Invoice rules."),
    ("STDINV-007", "No progress columns", "The Standard Invoice does not display Contract Amount, Previously Billed, Balance to Finish, or percent complete."),
    ("STDINV-008", "No Contract consumption", "Saving, editing, opening, or paying a Standard Invoice does not consume tracked Contract source-line availability or update tracked Contract Progress."),
    ("STDINV-009", "Billed status timing", "The source Estimate becomes Billed only after the Standard Invoice Draft saves successfully. Opening and abandoning an unsaved editor does not change the Estimate's status."),
    ("STDINV-010", "Exclusive conversion lock", "While an active Standard Invoice exists, tracked Progress Invoice creation, Change Order creation, and the applicable Payment Schedule path are unavailable for the source Estimate."),
    ("STDINV-011", "Conversion lock recovery", "Deleting the Standard Invoice Draft or canceling the Standard Invoice removes the conversion lock when ordinary history, payment, and conflict rules allow it."),
    ("STDINV-012", "Payment Schedule confirmation", "When a Payment Schedule exists, choosing Standard invoice requires confirmation that the full Estimate will be converted and the schedule removed."),
    ("STDINV-013", "Payment Schedule transaction boundary", "Production removes the Payment Schedule only when Standard Invoice creation succeeds. Canceling setup or abandoning the unsaved editor preserves the schedule."),
    ("STDINV-014", "Saved navigation", "Saving creates a numbered Draft and keeps the user on the saved Standard Invoice. Returning to the Estimate requires explicit close or navigation."),
    ("STDINV-015", "Linked Estimate", "The Standard Invoice displays Linked to Estimate for provenance. The relationship does not create progress tracking or synchronization between copied lines and Estimate lines."),
    ("STDINV-016", "Cost Plus aggregate", "When copied scope includes Cost Plus, the invoice contains one computed aggregate Cost plus fee entry. It must not create one fee row per underlying line."),
    ("STDINV-017", "Cost Plus fee identity", "The computed fee uses item name Cost plus fee and description Cost plus at {percent}. It is not independently editable."),
    ("STDINV-018", "Customer Cost Plus presentation", "On the customer PDF and Web Link, Cost plus fee appears once after regular items and before Subtotal, and its amount is included in Subtotal."),
    ("STDINV-019", "No duplicate customer fee", "When Cost Plus is presented as a customer line item, the totals section must not also show Cost plus percentage or Cost plus fee rows."),
    ("STDINV-020", "Conditional customer fee", "When Cost Plus does not apply, no Cost plus fee line or zero-value Cost Plus placeholder appears."),
    ("STDINV-021", "Customer content", "Customer PDF and Web Link use the invoice's customer, job, dates, lines, public note, attachments, terms, status, payment information, and applicable discount and tax."),
    ("STDINV-022", "Preview availability", "PDF preview and Customer web preview are hidden in every unsaved New Invoice state and appear in their existing location only after the invoice is saved."),
]

PROGINV = [
    ("PROGINV-001", "Purpose", "A Progress Invoice bills part or all of an Accepted Contract while preserving Contract-level totals and source-line billing history."),
    ("PROGINV-002", "Contract basis", "Every Progress Invoice bills the Current Contract. With no Accepted Change Order the Contract consists of the Accepted Estimate; Accepted Change Orders revise the same Contract."),
    ("PROGINV-003", "Entry condition", "Progress Invoice creation requires an Accepted Contract with eligible remaining source scope and no conflicting active tracked Draft."),
    ("PROGINV-004", "First invoice choices", "The first Progress Invoice offers Percent or amount and Select items. It does not offer a rest-of-estimate option."),
    ("PROGINV-005", "Subsequent rest choice", "A subsequent Progress Invoice offers The rest of this estimate before Accepted Change Orders and The rest of this contract after Accepted Change Orders."),
    ("PROGINV-006", "Percent or amount", "Percent or amount supports mutually exclusive percentage and dollar entry modes. Percentage is based on the original Contract basis and is limited by the remaining percentage."),
    ("PROGINV-007", "Remaining subtotal label", "The Progress Invoice creation workflow labels the gross available amount Remaining subtotal. It does not relabel unrelated Remaining values elsewhere."),
    ("PROGINV-008", "Remaining subtotal percentage", "In subsequent percentage mode, the workflow displays Remaining subtotal with both the dollar limit and maximum remaining percentage. Dollar mode displays the dollar limit only."),
    ("PROGINV-009", "Input validation", "Blank, nonnumeric, zero, negative, and over-available inputs cannot create an invoice. An over-available entry shows Exceeds remaining subtotal and retains the entered value for correction."),
    ("PROGINV-010", "Selected item behavior", "Select items shows accepted source lines, keeps fully invoiced lines visible but disabled, and bills the full remaining amount of each selected eligible line."),
    ("PROGINV-011", "Selection count", "Select all and selection counts include only eligible lines. The primary action remains unavailable when no eligible line is selected."),
    ("PROGINV-012", "All lines in editor", "Every accepted Contract source line appears in the resulting editor, including unselected, superseded, removed, and fully invoiced lines where required for historical context."),
    ("PROGINV-013", "Internal columns", "The internal tracked invoice table displays Item name, Qty, Contract Amount, Previously Billed, This Invoice, Balance to Finish, and percent complete where the approved surface calls for those measures."),
    ("PROGINV-014", "Previously Billed definition", "Previously Billed includes posted tracked allocations from invoices that precede the current invoice in the immutable billing sequence. It excludes the current invoice, later invoices, Drafts, and payments."),
    ("PROGINV-015", "This Invoice", "This Invoice is the editable current allocation for an eligible Draft or eligible latest unpaid Open invoice. It cannot exceed source-line or Contract availability."),
    ("PROGINV-016", "Percent complete", "For an ordinary positive line, percent complete equals Previously Billed plus This Invoice divided by Contract Amount. It is derived and not independently editable."),
    ("PROGINV-017", "Removed line presentation", "A negative Change Order adjustment is non-billable and displays an em dash for Previously Billed, This Invoice, and percent complete. Historical billing remains on the originating line."),
    ("PROGINV-018", "Apply remaining", "An editable billable line with unused capacity offers Apply remaining. The control disappears at the maximum and never appears on locked, removed, non-billable, fully billed, or customer-facing rows."),
    ("PROGINV-019", "Draft reservation", "Saving the Draft atomically reserves its base scope, associated Cost Plus, selected discount, retainage release capacity where applicable, and Tax Credit."),
    ("PROGINV-020", "Posting", "Changing Draft to Open converts reservations into posted allocations, records recognized retainage, consumes reserved discount and Tax Credit, and updates Contract Progress and history."),
    ("PROGINV-021", "Single Draft guard", "When an active tracked Draft exists, the product must not create another Progress Invoice or Retainage release Draft against the Contract."),
    ("PROGINV-022", "Discount step", "When Discount Pool remains, the final creation step asks Apply discount, suggests a proportional amount, permits zero, and blocks an amount above the available pool."),
    ("PROGINV-023", "Discount scope separation", "Progress Invoice scope selection uses gross source availability. Discount is selected separately and never reduces the displayed Remaining subtotal."),
    ("PROGINV-024", "Tax inheritance", "A Progress Invoice inherits the accepted Contract tax configuration and component taxability. Its Draft stores the resolved tax facts, and opening does not rerate them."),
    ("PROGINV-025", "Tax editor lock", "The tracked invoice editor displays inherited tax information as read-only and does not provide an independent rate or taxability override."),
    ("PROGINV-026", "Tax Credit application", "A Draft reserves no more than the lesser of calculated invoice tax and available Tax Credit Balance. The credit appears as a separate negative totals row and never reduces principal."),
    ("PROGINV-027", "Cost Plus aggregate", "Cost Plus appears internally as one aggregate computed fee associated with all applicable billed base scope, not as one fee row per underlying line."),
    ("PROGINV-028", "Cost Plus identity", "The aggregate fee uses item name Cost plus fee and description Cost plus at {percent}. The inherited percentage and computed amount are not independently editable."),
    ("PROGINV-029", "Cost Plus tracking", "Internal tracking preserves Contract Cost Plus fee, Previously Billed Cost Plus fee, Cost Plus billed on this invoice, and Remaining Cost Plus fee."),
    ("PROGINV-030", "Cost Plus row fields", "The aggregate Cost Plus row populates Contract Amount, Previously Billed, and This Invoice from the associated base-scope allocation."),
    ("PROGINV-031", "Cost Plus percent complete", "The Cost Plus fee row leaves percent complete blank. The product must not calculate or display a synthetic completion percentage for the fee."),
    ("PROGINV-032", "Customer Cost Plus line", "On the customer PDF and Web Link, one Cost plus fee line appears after regular invoice items and before Subtotal, with description Cost plus at {percent}. Subtotal includes the fee."),
    ("PROGINV-033", "No duplicate customer Cost Plus", "Customer totals do not repeat Cost plus percentage or Cost plus fee rows when the fee is presented in the items table."),
    ("PROGINV-034", "Customer progress columns", "Customer output includes Item name and This Invoice and may include Qty, Contract Amount, Previously Billed, Balance to Finish, percent complete, and Taxed according to the approved per-invoice Customer view settings."),
    ("PROGINV-035", "Unbilled rows", "Items not billed controls only customer presentation. When included, zero-current rows are visually subdued; hiding them does not change invoice allocations."),
    ("PROGINV-036", "Fractional quantity presentation", "Customer output may hide or simplify fractional quantities according to existing presentation rules without changing the actual stored billed quantity."),
    ("PROGINV-037", "Invoice History", "Starting with the second tracked invoice, customer PDF and Web Link show prior tracked invoices in chronological order and exclude the current invoice."),
    ("PROGINV-038", "Invoice History amount", "Invoice History Amount is each prior invoice's actual total after its applicable discount and tax, not its gross Contract allocation."),
    ("PROGINV-039", "Contract Progress customer block", "Customer output shows cumulative Contract Progress after current invoice totals when the contract-aware presentation applies. It does not expose internal pools or reservations."),
    ("PROGINV-040", "Saved navigation", "Creating the invoice keeps the user on the numbered Draft. Closing an unsaved editor discards its work without changing the Contract; closing a saved invoice returns by explicit navigation."),
    ("PROGINV-041", "Preview availability", "PDF preview and Customer web preview are hidden before the invoice exists and become available only after the Draft has been saved."),
    ("PROGINV-042", "Change Order acceptance collision", "Accepting a Change Order while a tracked Draft exists cancels that Draft, releases its reservations, preserves it read-only in history, and requires a new invoice against the revised Contract."),
    ("PROGINV-043", "Accepted revision lock", "Accepting a Contract revision financially locks earlier Open tracked invoices. New or changed scope must be billed on a new invoice and cannot be added retroactively."),
    ("PROGINV-044", "Final unused discount warning", "Opening the invoice that consumes the final gross scope while discount remains available shows the unused discount and resulting over-invoiced amount, permits continuation, and applies no discount automatically."),
]

CO = [
    ("CO-001", "Purpose", "A Change Order is a separate Estimate-style document that proposes independent additions, removals, discount adjustments, or zero-value contract changes."),
    ("CO-002", "Contract relationship", "An Accepted Change Order revises the existing Contract linked to the original Estimate. It does not establish a second Contract."),
    ("CO-003", "Numbering", "Each saved Change Order receives the next nonreused contract-level identifier in the form {EstimateID}-CO1, {EstimateID}-CO2, and so on."),
    ("CO-004", "Creation origins", "Change Order creation may begin from the Accepted Estimate or an eligible Accepted Change Order while preserving the original Estimate relationship."),
    ("CO-005", "Standard Invoice lock", "An active Standard Invoice conversion disables Change Order creation for its source Estimate."),
    ("CO-006", "Parallel proposals", "Multiple Draft or Pending Change Orders may coexist when they reserve unrelated source lines. A source line may participate in only one active Draft or Pending Change Order at a time."),
    ("CO-007", "Conflict presentation", "A line reserved by another Draft or Pending Change Order remains visible but disabled with This item already has an open Change Order and a reference to the open document."),
    ("CO-008", "Valid compositions", "Addition-only, removal-only, mixed, named zero-value, and real net-zero Change Orders are valid when they contain a meaningful adjustment."),
    ("CO-009", "Removal representation", "Selected existing scope is represented as a normal negative-quantity line with positive Price, negative Qty, and signed Amount. It remains independent of any replacement line."),
    ("CO-010", "Partial quantity correction", "A partial quantity change removes the original accepted quantity and adds an ordinary new line at the corrected quantity. The product does not create replacement pairing."),
    ("CO-011", "Added scope", "New scope uses ordinary editable Item name, Price, Qty, and Amount fields and has no data relationship to a removed line."),
    ("CO-012", "Internal Cost excluded", "Change Order editing, summaries, and customer output do not show or calculate from internal Cost or Markup."),
    ("CO-013", "Tax authority", "A Change Order does not establish an invoice tax rate. Applicable future invoices inherit tax configuration from the accepted Contract."),
    ("CO-014", "Cost Plus lock", "A Change Order inherits the accepted Contract Cost Plus percentage as read-only and cannot introduce, remove, or modify that rate."),
    ("CO-015", "Cost Plus adjustments", "Additions and full-negative removals create signed Cost Plus scope using the inherited percentage. Other economic adjustments use ordinary Change Order lines."),
    ("CO-016", "Discount adjustment", "A Change Order may explicitly increase or decrease contractual discount. A positive discount adjustment increases the Discount Pool; a negative adjustment reduces it but may not take the pool below zero."),
    ("CO-017", "Discount exception", "A Change Order may add a discount greater than the previously available Discount Pool because it changes the contractual pool. This exception does not apply to Progress Invoice discount consumption."),
    ("CO-018", "Draft state", "Saving a meaningful New Change Order creates a Draft, assigns its number, and keeps the Draft open for editing."),
    ("CO-019", "Pending state", "Sending a saved Draft or selecting Pending creates the Pending state. Pending has no accepted Contract effect and continues to reserve participating source lines."),
    ("CO-020", "Acceptance revision", "Acceptance uses the current saved revision. Dirty financial changes must be saved before acceptance, and a stale customer link cannot accept a newer revision."),
    ("CO-021", "Accepted immutability", "An Accepted Change Order is financially immutable, never returns to Pending, and cannot be Declined, Canceled, or deleted. Corrections require another Change Order."),
    ("CO-022", "Declined and Canceled", "Declined and Canceled Change Orders have no Contract effect, remain historical, and release their open source-line reservations."),
    ("CO-023", "Acceptance Contract effect", "Acceptance adds the Change Order's signed base scope, Cost Plus scope, and discount adjustment to the Current Contract without rewriting earlier billing."),
    ("CO-024", "Future invoice availability", "Future Progress Invoice availability reflects the revised accepted scope while prior posted allocations remain attributed to their original source lines."),
    ("CO-025", "Negative Contract boundary", "Acceptance is blocked when the proposed Change Order would make Contract Value negative. The product must explain the condition without clamping or partially accepting the document."),
    ("CO-026", "Over-invoicing after deduction", "When an Accepted deductive Change Order reduces accepted scope below posted billing, the product shows the over-invoiced condition and does not automatically create a refund, credit, or negative invoice."),
    ("CO-027", "Tax Credit generation", "Accepted removal of previously taxed scope generates Tax Credit from persisted historical tax attribution. It does not change the Change Order delta or Contract Progress."),
    ("CO-028", "Contract Details", "Saved Contract surfaces show Original contract, each Change Order in sequence, and Current contract. Current contract includes Accepted deltas only."),
    ("CO-029", "Contract summary", "Saved Change Orders show Contract Value, Total Invoiced, Remaining or Over invoiced, and Contract Progress. Draft and Pending deltas appear as proposed context without changing accepted totals."),
    ("CO-030", "Linked invoices", "Linked to is reserved for invoices associated with the specific Estimate or Change Order and displays only the invoice link identity, not status or amount."),
    ("CO-031", "Customer PDF and link", "Every saved Change Order provides a PDF and Customer Web Link by reusing the Estimate customer document model."),
    ("CO-032", "Customer identity", "The customer document title is Change Order, shows the Change Order number, and shows Linked to Estimate {Estimate number}."),
    ("CO-033", "Customer content", "The customer document uses the Change Order's own items, subtotal, applicable discount, applicable Cost Plus, total, public note, attachments, terms, customer and job information, and acceptance status."),
    ("CO-034", "Conditional customer totals", "Discount, tax, and Cost Plus fields are absent from Change Order customer totals when they do not apply. Zero-value placeholders are not shown."),
    ("CO-035", "Delete eligibility", "Draft, Pending, Declined, and Canceled Change Orders may be deleted after confirmation. Accepted Change Order deletion is blocked."),
]

RET = [
    ("RET-001", "Purpose", "Retainage withholds part of a tracked invoice's currently due discounted principal while preserving full gross billing against Contract scope."),
    ("RET-002", "Optional feature", "Retainage appears only for Contracts where the feature is configured. Ordinary Contracts do not show Retainage fields, totals, actions, or zero placeholders."),
    ("RET-003", "Estimate default", "The Estimate may define an optional Retainage percentage for future tracked invoices. Blank means no Retainage."),
    ("RET-004", "Historical stability", "Changing the Estimate default affects only future invoice Drafts. Saved invoice rates and historical withheld and released amounts never recalculate."),
    ("RET-005", "Invoice override", "A Progress Invoice Draft copies the current default and permits a zero-through-100-percent override that applies only to that invoice."),
    ("RET-006", "Calculation basis", "Retainage is calculated against discounted principal, excluding tax. It does not withhold tax."),
    ("RET-007", "Calculation order", "Invoice totals apply billed base and Cost Plus scope, then discount, then tax on discounted taxable principal, then Retainage on discounted principal, and finally Total Due."),
    ("RET-008", "No line allocation", "Cinderblock treats Retainage as a totals-level amount. It does not create a line-level Retainage allocation or Retainage completion column."),
    ("RET-009", "Progress unaffected", "Retainage withheld does not reduce This Invoice, line completion, Contract Progress, Total Invoiced, or Payment Schedule fulfillment."),
    ("RET-010", "Tracking visibility", "The Retainage tracking block remains hidden while Total retained is zero and no release history exists. The configured percentage may remain visible before withholding."),
    ("RET-011", "Total retained", "Total retained is cumulative Retainage actually recognized on posted Progress Invoices and never decreases when Retainage is released."),
    ("RET-012", "Released", "Released increases only when a Retainage release Draft becomes Open."),
    ("RET-013", "Held", "Held equals Total retained minus Released."),
    ("RET-014", "Available to release", "Available to release equals Held minus the amount reserved by an active Retainage release Draft."),
    ("RET-015", "Contract level pool", "Retainage Balance is maintained once for the Contract. The product does not create separate line, milestone, invoice, or Change Order release pools."),
    ("RET-016", "Release eligibility", "Release retainage is available only when Available to release is greater than zero and no conflicting tracked Draft exists."),
    ("RET-017", "Partial and full release", "A release may be partial or full. The entered amount must be greater than zero and no greater than Available to release."),
    ("RET-018", "Release Draft", "Creating a release opens a New retainage invoice. Saving creates a numbered Draft and reserves the selected release amount without counting it as Released."),
    ("RET-019", "Release content", "A Retainage release Invoice contains one specialized Retainage release amount and does not resend contract work, source lines, milestones, or original quantities."),
    ("RET-020", "Release effect", "Opening a Retainage release Invoice makes previously withheld principal due. It does not create Contract scope, revenue, tax, Total Invoiced, Contract Progress, or milestone consumption."),
    ("RET-021", "Release cancellation", "Canceling or deleting the release Draft restores its reserved release capacity. Canceling a posted release follows ordinary invoice payment and cancellation rules."),
    ("RET-022", "Customer withheld presentation", "A customer Progress Invoice shows Retainage withheld clearly as a deduction from Amount Due."),
    ("RET-023", "Customer release presentation", "A release PDF and Web Link identify Retainage release as previously withheld money being made due and must not imply new work."),
    ("RET-024", "Customer release totals", "Release customer totals begin with Total and then show actual Amount Paid where applicable and Balance Due. They do not repeat a Retainage released totals row."),
    ("RET-025", "Invoice History", "Retainage release history remains visible without changing the prior Progress Invoice amounts or Contract billing history."),
]

PAY = [
    ("PAY-001", "Purpose", "Payment Schedule plans and records billing milestones. A Progress Invoice executes billing and remains the authority for Contract consumption."),
    ("PAY-002", "Location", "Payment Schedule belongs to the Estimate and Contract workflow and does not create a separate Contract or financial ledger."),
    ("PAY-003", "Calculation basis", "Planned milestone amounts are based on Contract Value, including accepted Cost Plus and discount and excluding tax, Retainage, and payments."),
    ("PAY-004", "Milestone fields", "Each managed milestone requires a name and may include a percentage or equivalent amount plus an optional planned date."),
    ("PAY-005", "Editable percentage and amount", "Percentage and Amount appear together and remain editable. Percentage entry accepts at most three decimal places; Amount entry stores currency precision and derives a precise percentage anchor."),
    ("PAY-006", "Amount authority", "The stored currency-precision milestone Amount is authoritative for billing defaults, schedule totals, and validation. Calculations must not reconstruct it from a rounded displayed percentage."),
    ("PAY-007", "Zero Contract Value", "At zero Contract Value, percentage milestones remain valid and project zero. Dollar entry is unavailable until a meaningful percentage can be derived."),
    ("PAY-008", "Preset behavior", "Company Settings presets contain percentage-based milestones so they can apply at zero and recalculate as Estimate scope changes."),
    ("PAY-009", "Planning does not reserve", "Creating, editing, reordering, or overallocating milestones does not reserve Contract scope, discount, Tax Credit, or Retainage."),
    ("PAY-010", "Over-allocation warning", "When milestone amounts exceed current Contract Value, the product shows Payment schedule exceeds 100% in Manage milestones and on the schedule table."),
    ("PAY-011", "Over-allocation remains editable", "Over-allocation is informational. It does not disable Save, force correction, normalize rows, rebalance future milestones, or expand invoice availability."),
    ("PAY-012", "Milestone selection", "When unfulfilled milestones exist, Progress Invoice creation offers Select milestone before ad-hoc scope methods."),
    ("PAY-013", "Milestone invoice method", "The milestone screen offers Percent or amount and Select items. A planned percentage is an editable suggestion rather than a billing restriction."),
    ("PAY-014", "Milestone Contract limits", "An invoice created from a milestone remains subject to Contract availability, source-line availability, Discount Pool, Draft reservation, and overbilling rules."),
    ("PAY-015", "Gross default", "Milestone creation defaults gross allocation to the milestone percentage of Gross Contract Scope."),
    ("PAY-016", "Discount suggestion", "Milestone creation suggests the same percentage of the applicable original Contract Discount, capped at the remaining Discount Pool."),
    ("PAY-017", "Actual amount", "The milestone's actual is the invoice's resulting net contract billing after the contractor's selected discount. It may differ from the planned amount."),
    ("PAY-018", "One invoice association", "A milestone may have one active invoice association. Multiple draws for one phase require multiple milestones."),
    ("PAY-019", "Planned state", "A Planned milestone has no active invoice and may offer Create invoice."),
    ("PAY-020", "Draft invoice state", "A Draft invoice milestone shows its linked invoice and provisional amount with neutral treatment and does not offer another Create invoice action."),
    ("PAY-021", "Invoiced state", "A milestone becomes Invoiced only when its associated Draft becomes Open."),
    ("PAY-022", "Canceled association", "Deleting or canceling a Draft, or validly canceling the latest eligible Open invoice, returns the live milestone to Planned while preserving immutable invoice history."),
    ("PAY-023", "Dates", "Planned date and invoice date are stored separately. Display Planned: {date} only when present and Invoiced: {date} when an invoice date exists."),
    ("PAY-024", "No sequential lock", "The schedule does not restrict invoice creation to the next milestone. Visual emphasis on the expected next milestone does not disable later eligible milestones."),
    ("PAY-025", "Linked milestone editing", "Once linked, Percentage and Amount are historical and disabled. The name, planned date, and order retain their established edit behavior."),
    ("PAY-026", "Rename behavior", "Renaming a Draft-linked milestone updates the Draft without warning. Renaming an issued milestone requires confirmation; Paid invoices retain their historical milestone name."),
    ("PAY-027", "Reordering", "Reordering moves the complete stable milestone record and does not change invoice associations or historical invoice snapshots."),
    ("PAY-028", "Change Order recalculation", "After an Accepted Change Order changes Contract Value, unfulfilled milestone amounts recalculate from their precise percentage anchors. Historical invoiced amounts do not change."),
    ("PAY-029", "Actual variance", "An actual invoice that differs from plan updates that milestone actual and does not redistribute or rebalance other milestones."),
    ("PAY-030", "Ad hoc invoices", "Every saved ad-hoc Progress Invoice creates or updates one milestone. A blank optional name becomes Invoice X using the row's one-based insertion position."),
    ("PAY-031", "Standard Invoice interaction", "Choosing Standard Invoice with a schedule requires confirmation and removes the schedule only when invoice creation succeeds."),
    ("PAY-032", "Retainage interaction", "Retainage reduces Amount Due but does not reduce milestone consumption. A Retainage release does not create, consume, reopen, or modify a milestone."),
    ("PAY-033", "On acceptance setting", "Before acceptance, a schedule may choose Do nothing or Create draft invoice for milestone 1. The setting is hidden after acceptance."),
    ("PAY-034", "Automatic Draft guard", "Automatic Draft creation at acceptance uses milestone 1's full valid amount, is idempotent, and obeys the one-Draft-per-Contract guard without blocking Estimate acceptance."),
    ("PAY-035", "Existing Draft conflict", "When automatic creation encounters an existing Draft, acceptance succeeds, the existing Draft remains unchanged, the milestone remains unconsumed, and the product shows an inline error."),
]

QBO = [
    ("QBO-001", "System ownership", "Cinderblock owns Contract billing logic and remains the source of truth. QBO is an accounting destination."),
    ("QBO-002", "No QBO Progress Invoicing", "The integration must not use QBO Progress Invoicing or maintain QBO Estimate-to-Invoice progress relationships."),
    ("QBO-003", "Internal concepts excluded", "QBO does not receive Contract Progress, Previously Billed, Balance to Finish, Remaining subtotal, pools, ledgers, milestone state, Change Order relationships, reservations, or Contract revisions."),
    ("QBO-004", "Estimate mapping", "A Cinderblock Estimate synchronizes to a standard QBO Estimate."),
    ("QBO-005", "Change Order mapping", "Each Cinderblock Change Order synchronizes to a separate standard QBO Estimate and does not modify the original QBO Estimate."),
    ("QBO-006", "Change Order identity", "The integration preserves the Cinderblock Change Order identity in the QBO transaction mapping without requiring a QBO relationship to the original Estimate."),
    ("QBO-007", "Standard Invoice mapping", "A Cinderblock Standard Invoice synchronizes to a standard QBO Invoice without an Estimate-to-Invoice link."),
    ("QBO-008", "Progress Invoice mapping", "A Cinderblock Progress or Contract Invoice synchronizes to a standard QBO Invoice containing ordinary accounting lines and no Cinderblock Contract lineage."),
    ("QBO-009", "Retainage release mapping", "A Retainage release synchronizes to a standard QBO Invoice that may contain only one positive Retainage release line."),
    ("QBO-010", "Actual quantities", "QBO receives the actual billed quantity, rate, amount, taxability, and mapped Product or Service or account for each invoice line."),
    ("QBO-011", "Fractional quantities", "A fractional Progress Invoice quantity must synchronize even when Cinderblock hides or simplifies that quantity in customer presentation."),
    ("QBO-012", "Retainage withheld line", "A nonzero withheld amount appends one QBO line named Retainage with Qty 1 and the persisted amount as negative."),
    ("QBO-013", "Retainage release line", "A release synchronizes one QBO line named Retainage release with Qty 1 and the persisted amount as positive."),
    ("QBO-014", "No repeated work on release", "A Retainage release must not resend contract work, Estimate lines, Change Order lines, milestones, or original quantities."),
    ("QBO-015", "Discount representation", "When a discount appears on the Cinderblock document, synchronize it through the established compatible QBO representation. When absent, do not send a zero or synthetic discount."),
    ("QBO-016", "Cost Plus representation", "When Cost Plus appears on the Cinderblock document, synchronize the represented amount without asking QBO to reproduce the calculation. When absent, do not send a zero or synthetic fee."),
    ("QBO-017", "Tax alignment", "For a QBO-connected account, synchronize taxability and line facts so Cinderblock totals align with the connected QBO tax configuration and rate."),
    ("QBO-018", "Local operation independence", "A valid Cinderblock operation remains valid when QBO synchronization fails. QBO failure must not roll back or silently rewrite the Cinderblock document."),
    ("QBO-019", "Last successful sync baseline", "The integration retains the QBO company and transaction identity, type, concurrency value, last success time, synchronized Cinderblock revision, material accounting snapshot or fingerprint, and last outcome."),
    ("QBO-020", "Material field coverage", "The divergence baseline covers document identity, customer, dates, lines, quantities, rates, amounts, taxability, tax, discounts, Retainage, Cost Plus, totals, status, void or deletion state, and payment-sensitive state when available."),
    ("QBO-021", "Preflight", "Before updating, voiding, deleting, or recreating a mapped transaction, Cinderblock compares current QBO state with the last successfully synchronized state."),
    ("QBO-022", "Optimistic concurrency", "Every resolved QBO write uses the current QBO concurrency value. A race detected after preflight creates a conflict rather than an automatic overwriting retry."),
    ("QBO-023", "Unchanged transaction", "When QBO still matches the last successful state, a later Cinderblock edit may use the normal update path with current version protection."),
    ("QBO-024", "Edited transaction", "When QBO was materially edited after sync, Cinderblock preserves both states, marks a sync conflict, explains the mismatch, and requires intentional resolution before another material write."),
    ("QBO-025", "Deleted or voided transaction", "When QBO reports the mapped transaction deleted, voided, or unavailable, Cinderblock does not silently recreate it and requires intentional reconciliation."),
    ("QBO-026", "Payment sensitive transaction", "When a QBO Invoice has an applied payment, credit, deposit, or settlement state, Cinderblock does not blindly replace, delete, void, or materially rewrite it."),
    ("QBO-027", "Cinderblock cancellation", "Deleting, voiding, canceling, or invalidating a Cinderblock document does not automatically delete its mapped QBO transaction. The product inspects divergence, status, and payments first."),
    ("QBO-028", "Create or update failure", "A failed QBO create or update leaves the Cinderblock transaction intact, records an actionable failure, and never presents successful synchronization."),
    ("QBO-029", "Retry safety", "A retry is idempotent when safe. An ambiguous timeout requires lookup or request-identity reconciliation before retry so it cannot create a duplicate."),
    ("QBO-030", "Conflict state", "Sync conflict is a first-class integration state separate from document lifecycle and does not reopen, unpost, or recalculate the Cinderblock document or Contract."),
    ("QBO-031", "Review changes", "Review changes compares current QBO state with both the last-synchronized and current Cinderblock representations."),
    ("QBO-032", "Keep QBO guardrail", "Keep QuickBooks version must not import QBO edits into Cinderblock Contract ledgers. Its accounting-document and future-baseline behavior requires an explicit approved rule."),
    ("QBO-033", "Overwrite guardrail", "Overwrite QuickBooks requires permission, confirmation, audit, and a fresh concurrency and payment preflight, and is unavailable when accounting conditions make it unsafe."),
    ("QBO-034", "Audit trail", "Conflict detection, review, choice, actor, timestamps, versions, and outcome are auditable."),
    ("QBO-035", "Sync statuses", "The product distinguishes Not synced, Sync pending or in progress, Synced successfully, Sync failed, and Sync conflict."),
    ("QBO-036", "Safe unresolved default", "Until an explicit resolution rule exists, preserve both systems, block the risky QBO write, surface the mismatch, and require intentional manual resolution."),
    ("QBO-037", "Billing status mapping", "Cinderblock Partially Billed and Billed both map to QBO's existing Converted semantic. The integration preserves the distinct Cinderblock statuses and must not infer remaining Contract scope from QBO Converted."),
]

UIREQ = [
    ("UI-001", "Conditional totals", "Across Estimate, Invoice, Progress Invoice, and Change Order totals, Tax, Discount, and Cost Plus rows are absent when the value does not apply. The product does not show zero-value placeholders."),
    ("UI-002", "Internal Cost privacy", "Internal Cost, Markup, margin, and profit never appear in customer-facing documents or links."),
    ("UI-003", "Locked field clarity", "A field locked by a business rule must be visibly distinguishable from an enabled editor control and must provide the established explanatory tooltip where required."),
    ("UI-004", "Prototype inertia is not a lock", "A control that is inert only because the prototype omits an interaction must not be documented or implemented as a business lock."),
    ("UI-005", "Customer PDF and link parity", "Customer Web Link and PDF use the same content model except where these requirements explicitly identify a presentation difference."),
    ("UI-006", "Estimate table columns", "Estimate and Change Order document tables use their normal item columns and do not show line-level percent complete."),
    ("UI-007", "Tracked invoice table columns", "Tracked invoice editors and applicable customer outputs show line-level billing progress columns according to their documented visibility rules."),
    ("UI-008", "Preview actions after save", "Invoice PDF preview and Customer web preview actions do not appear before invoice creation and are shown after save in their established location."),
    ("UI-009", "Creation labels", "Setup uses Continue only when another setup step follows and Create invoice when setup is complete. The editor uses Create invoice to persist the New Invoice."),
    ("UI-010", "Linked to pattern", "Invoice relationships use the established link identity pattern. Contract lineage belongs in Contract Details and not in Linked to."),
    ("UI-011", "No internal ledger exposure", "Customer documents may show resulting amounts and progress, but never expose Draft reservations, Discount Pool, Cost Plus ledger, Tax Credit ledger, Retainage ledger mechanics, or allocation rules."),
    ("UI-012", "Revision specific acceptance", "Estimate and pre-acceptance Change Order customer links identify one saved revision. An invalidated link explains that the document changed and directs the customer to the latest link."),
    ("UI-013", "Current invoice emphasis", "Customer Progress Invoice output emphasizes the current billed amount and visually de-emphasizes included lines with no current billing."),
    ("UI-014", "PDF grayscale", "The customer Progress Invoice PDF uses the established grayscale treatment while preserving the same financial content as the Web Link."),
    ("UI-015", "No acceptance from incidental screenshots", "Illustrative screenshots may clarify approved flows, but they do not create requirements that are absent from the written rules."),
]

VALID = [
    ("VALID-001", "Aggregate overbilling", "Block a Progress Invoice allocation above the Contract's available Remaining subtotal."),
    ("VALID-002", "Source line overbilling", "Block a line allocation above that source line's available quantity or amount."),
    ("VALID-003", "Discount overuse", "Block Progress Invoice discount below zero or above the available Discount Pool."),
    ("VALID-004", "Existing Draft", "Block creation of a second tracked Draft and direct the user to the existing Draft."),
    ("VALID-005", "Fully invoiced Contract", "Disable new tracked invoice creation when no accepted gross scope remains available."),
    ("VALID-006", "Change Order line conflict", "Disable a source line already reserved by another Draft or Pending Change Order and identify the conflicting document."),
    ("VALID-007", "Meaningless Change Order", "Block saving, sending, or accepting a Change Order that contains no meaningful adjustment."),
    ("VALID-008", "Negative Contract Value", "Block Estimate or Change Order acceptance when the resulting Contract Value would be less than zero."),
    ("VALID-009", "Schedule over-allocation", "Show Payment schedule exceeds 100% as a warning and permit editing and saving."),
    ("VALID-010", "Blank milestone name", "Block saving a manually managed Payment Schedule while any milestone name is blank or whitespace only."),
    ("VALID-011", "Invalid milestone allocation", "Block a nonpositive invoice input and block any milestone invoice amount above available Contract scope."),
    ("VALID-012", "Invoice exceeds milestone", "When a proposed invoice exceeds its milestone plan but remains within Contract availability, warn that the proposed amount becomes the milestone actual and allow continuation."),
    ("VALID-013", "Retainage unavailable", "Hide or disable Retainage release when no Available to release balance exists."),
    ("VALID-014", "Retainage over-release", "Block a release amount at or below zero or above Available to release."),
    ("VALID-015", "Final unused discount", "Warn, but do not block, when the final gross scope is being posted while Contract discount remains unused."),
    ("VALID-016", "Stale Contract write", "Reject a stale Contract-affecting financial write without partial mutation and preserve unsaved editor state for the established retry or refresh path."),
    ("VALID-017", "Payment edit race", "When invoice editing races with payment application, the first successful operation wins and the second fails cleanly against current state."),
    ("VALID-018", "Stale acceptance link", "Reject customer acceptance when the link does not represent the current acceptable Estimate or Change Order revision."),
    ("VALID-019", "QBO divergence", "Block a risky QBO write when the mapped transaction materially differs from the last successful sync and create a Sync conflict state."),
    ("VALID-020", "QBO retry ambiguity", "Do not retry an ambiguous QBO create or update until lookup or idempotency evidence prevents duplication."),
]


def add_cover(doc):
    p = doc.add_paragraph(style="Title")
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.add_run("Cinderblock Contract Billing Requirements")
    s = doc.add_paragraph(style="Subtitle")
    s.add_run("Developer handoff and business logic source of truth")
    doc.add_paragraph("Standard Invoice, Progress Invoice, Change Orders, Retainage, Payment Schedule, and QuickBooks Online synchronization")
    doc.add_paragraph()
    meta = doc.add_paragraph()
    r = meta.add_run("Status")
    r.bold = True
    meta.add_run("  Final functional requirements\n")
    r = meta.add_run("Updated")
    r.bold = True
    meta.add_run(f"  {date.today().strftime('%B %d, %Y')}\n")
    r = meta.add_run("Audience")
    r.bold = True
    meta.add_run("  Frontend, backend, QA, product, design, and future maintainers")
    for _ in range(8):
        doc.add_paragraph()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = p.add_run("Functional behavior only. This document does not prescribe application architecture.")
    run.bold = True
    run.font.color.rgb = RGBColor(50, 108, 229)
    doc.add_page_break()


def add_front_matter(doc):
    doc.add_heading("Executive Summary", level=1)
    doc.add_paragraph(
        "An Accepted Estimate establishes one Contract for tracked billing. Progress Invoices consume accepted source scope from that Contract, and Accepted Change Orders revise the same Contract without resetting billing history. Retainage withholds part of an invoice amount due without reducing completed work. Payment Schedule plans milestone billing but never overrides Contract availability. QuickBooks Online receives ordinary accounting documents while Cinderblock remains authoritative for Contract billing state."
    )
    doc.add_paragraph(
        "Standard Invoice is a separate full-scope copy/conversion path. It remains linked to its source Estimate and copies applicable terms, but it does not consume tracked Contract Progress or source-line availability. Standard Invoice and Progress Invoice share Billed as the completed Contract status; only the Progress path can pass through Partially Billed."
    )
    add_flow(doc, ["Accepted Estimate", "Current Contract", "Progress billing", "Payments and Retainage release"])
    doc.add_heading("Interpretation Rule", level=2)
    p = doc.add_paragraph()
    r = p.add_run("Interpretation rule: ")
    r.bold = True
    p.add_run("If behavior is not explicitly defined in these requirements, do not infer new business behavior from incidental prototype UI. The prototype illustrates approved workflows but does not independently define new business rules.")
    p = doc.add_paragraph()
    r = p.add_run("Explicit requirements override illustrative screenshots.")
    r.bold = True
    doc.add_heading("Authority and Precedence", level=2)
    add_numbered(doc, [
        "Newer explicit product decisions override older requirements.",
        "The canonical Contract billing business rules and financial specification override conflicting feature-prototype wording.",
        "The QBO synchronization requirements control the accounting integration boundary and post-sync safeguards.",
        "Approved implemented behavior may clarify an existing rule, but a prototype shortcut does not create a new rule.",
        "A genuine unresolved business contradiction must appear in Open Questions and Conflicts Found rather than being silently decided during implementation.",
    ])
    doc.add_heading("Contents", level=2)
    add_table(doc, ["Section", "Purpose"], [
        ("1 Canonical Terminology", "Exact product terms used throughout"),
        ("2 Global Contract Model", "Contract state, financial measures, lifecycle, and pools"),
        ("3 Standard Invoice", "Flexible copy conversion outside tracked Progress consumption"),
        ("4 Progress Invoice", "Tracked Contract billing and customer presentation"),
        ("5 Change Order", "Accepted Contract revisions and approval lifecycle"),
        ("6 Retainage", "Withholding, held balance, and release invoices"),
        ("7 Payment Schedule", "Advisory milestones and invoice relationships"),
        ("8 QuickBooks Online Sync", "Accounting document mapping and conflict safeguards"),
        ("9 State Tables", "Availability, editing, and Contract effects"),
        ("10 Business Invariants", "Rules that must always remain true"),
        ("11 Cross Feature Interaction Matrix", "Effects of major actions"),
        ("12 Validation and Warnings", "Hard blocks, warnings, and informational states"),
        ("13 Customer Facing Documents", "Cross-document output rules"),
        ("14 Internal UI Business Rules", "Visible business state and locks"),
        ("15 Canonical Numerical Examples", "Reconciled Before Action After examples"),
        ("16 Edge Cases", "Important non-happy flows"),
        ("17 Open Questions and Conflicts Found", "Unresolved production business decisions"),
        ("18 Out of Scope", "Boundaries of this specification"),
        ("19 Technical Details", "Short implementation constraints required for correctness"),
        ("20 Final Self Audit", "Consistency and integrity result"),
    ], widths=[2.55, 4.65], font_size=8.5)


def add_glossary(doc):
    doc.add_heading("1 Canonical Terminology", level=1)
    terms = [
        ("Estimate", "A proposal document that may be accepted and may become the source of a Contract."),
        ("Accepted Estimate", "The accepted revision that establishes the Contract for tracked billing."),
        ("Contract", "The accepted commercial scope used for tracked billing. It is the Accepted Estimate plus all Accepted Change Orders."),
        ("Original Contract", "The Accepted Estimate before the effect of Accepted Change Orders."),
        ("Current Contract", "The current accepted Contract after applying all Accepted Change Orders."),
        ("Gross Contract Scope", "Accepted base line scope plus Cost Plus, before discount, tax, retainage, and payments."),
        ("Contract subtotal", "Gross accepted Contract scope before discount. Where Cost Plus is explicit accepted scope, it is included."),
        ("Contract Value", "Gross Contract Scope less accepted contractual discount, excluding tax, retainage, and payments."),
        ("Contract Progress", "Posted Gross Contract Scope invoiced divided by current Gross Contract Scope."),
        ("Standard Invoice", "A flexible invoice copied from an Estimate that does not consume tracked Contract Progress."),
        ("Progress Invoice", "A tracked invoice that reserves and posts accepted Contract source scope."),
        ("Contract Invoice", "The source-grouped presentation variant of the same Progress Invoice model after Accepted Change Orders exist."),
        ("Change Order", "An Estimate-style document that proposes a signed revision to the existing Contract."),
        ("Retainage", "Discounted principal withheld from an invoice's current Amount Due without reducing completed scope."),
        ("Retainage Balance", "The Contract-level amount retained and not yet released, subject to active Draft reservations."),
        ("Retainage release", "An Invoice that makes previously withheld Retainage due without billing new work."),
        ("Payment Schedule", "An advisory list of billing milestones and their invoice relationships."),
        ("Milestone", "One planned or actual billing event within Payment Schedule."),
        ("Remaining subtotal", "Gross, pre-discount Contract source scope available for a new Progress Invoice after posted use and Draft reservations."),
        ("Previously Billed", "Posted tracked billing preceding the current invoice in the immutable billing sequence."),
        ("This Invoice", "The current invoice's gross allocation to a Contract line or computed Cost Plus fee."),
        ("Balance to Finish", "Contract Amount less posted and current allocations for the line, subject to current accepted scope."),
        ("Percent complete", "Cumulative attributed billing divided by the positive Contract Amount of a line."),
        ("Discount", "A document amount that reduces the represented principal according to applicable rules."),
        ("Discount Pool", "The finite Contract-level discount established by the Accepted Estimate and signed Accepted Change Order adjustments."),
        ("Tax", "Sales tax calculated outside Contract scope and value using the applicable tax configuration."),
        ("Tax Credit Balance", "Historical tax attributable to removed accepted scope and available only to offset tax on future normal invoices."),
        ("Cost", "Internal contractor cost. It never appears in customer output and does not determine Cost Plus."),
        ("Cost Plus", "An accepted percentage term calculated from customer-facing selling Price."),
        ("Cost Plus Fee", "The computed amount of Cost Plus scope, tracked with its base scope and presented to customers as one aggregate invoice item."),
        ("Draft Invoice", "A saved invoice that reserves applicable capacity but is not posted."),
        ("Open Invoice", "A posted invoice whose allocations and financial effects are recognized."),
        ("Accepted", "For Contract billing, the Contract is accepted with no posted tracked billing. For a Change Order, it separately records approval."),
        ("Partially Billed", "Tracked billing exists and the Current Contract still has uninvoiced scope."),
        ("Billed", "The Current Contract has no remaining gross scope, or an active Standard Invoice has completed the full-scope copy path."),
        ("Linked Estimate", "The Estimate relationship displayed on an Invoice or Change Order for document provenance."),
        ("Linked Invoice", "An invoice relationship displayed from an Estimate, Change Order, or Payment Schedule."),
    ]
    add_table(doc, ["Term", "Definition"], terms, widths=[1.65, 5.55], font_size=8.35)


def add_state_tables(doc):
    doc.add_heading("9 State Tables", level=1)
    doc.add_heading("Estimate and Contract States", level=2)
    add_table(doc, ["State", "Meaning", "Available actions"], [
        ("Draft", "Estimate not accepted", "Edit; manage schedule; send or accept under existing rules"),
        ("Pending or Sent", "Current saved revision awaits acceptance", "Edit creates a new revision; accept current revision"),
        ("Accepted", "Accepted Contract with no posted tracked billing", "Create eligible Standard or Progress Invoice; create CO; manage schedule"),
        ("Partially Billed", "Posted tracked billing exists and scope remains", "Create Progress Invoice; create CO; manage schedule; release Retainage when available"),
        ("Billed", "Current gross scope is complete through posted tracked billing, or an active Standard Invoice exists", "Progress path: no new invoice until positive scope is accepted; Standard path: tracked Progress Invoice, CO, and schedule unavailable"),
    ], widths=[1.4, 3.15, 2.65], font_size=8.0)
    doc.add_heading("Change Order States", level=2)
    add_table(doc, ["State", "Contract effect", "Financial editing", "Destructive behavior"], [
        ("New", "None", "Editable", "Close discards"),
        ("Draft", "Proposed only", "Editable unless a valid dependency locks it", "Delete with confirmation"),
        ("Pending", "Proposed only", "Current revision awaits acceptance", "Cancel, decline, or delete with confirmation"),
        ("Accepted", "Signed delta revises Current Contract", "Immutable", "Delete, decline, and cancel blocked"),
        ("Declined", "None", "Historical", "Delete allowed"),
        ("Canceled", "None", "Historical", "Delete allowed"),
    ], widths=[1.0, 2.15, 2.2, 1.85], font_size=7.9)
    doc.add_heading("Tracked Invoice States", level=2)
    add_table(doc, ["State", "Contract allocation", "Financial editing", "Payment activity"], [
        ("New", "None", "Editable working state", "Unavailable"),
        ("Draft", "Reservations only", "Editable if it is the active Draft", "Not posted"),
        ("Open", "Posted", "Only latest active unpaid tracked Open invoice", "Available"),
        ("Partially Paid", "Posted", "Financially locked", "Available"),
        ("Paid", "Posted", "Financially locked", "Available under existing rules"),
        ("Canceled", "Reversed when eligible", "Read-only history", "Handled by existing cancellation and payment rules"),
    ], widths=[1.0, 1.8, 2.55, 1.85], font_size=8.0)
    doc.add_heading("Payment Schedule States", level=2)
    add_table(doc, ["State", "Invoice relationship", "Presentation", "Next action"], [
        ("Planned", "None", "Planned values", "Create invoice may be available"),
        ("Draft invoice", "One active Draft", "Neutral linked invoice and Draft badge", "Open or cancel the Draft"),
        ("Invoiced", "One posted invoice", "Fulfilled treatment and actual amount", "No second invoice from that milestone"),
        ("Returned to Planned", "Prior invoice canceled", "Live association removed; history preserved", "Create invoice may be available again"),
    ], widths=[1.3, 1.8, 2.4, 1.7], font_size=8.0)


def add_invariants(doc):
    doc.add_heading("10 Business Invariants", level=1)
    invariants = [
        "An Accepted Estimate establishes one Contract for tracked billing.",
        "Every Progress Invoice bills an Accepted Contract.",
        "Accepted Change Orders revise the same Contract without resetting history.",
        "Contract availability is supported by accepted source-line availability.",
        "Estimate and Change Order lines do not require one-to-one mapping.",
        "A Progress Invoice cannot allocate more than the remaining Contract or source-line scope.",
        "A Draft reserves capacity but does not become Previously Billed or Contract Progress.",
        "A Progress Invoice cannot consume more discount than the available Discount Pool.",
        "A Change Order may increase the contractual Discount Pool.",
        "Cost Plus percentage cannot be changed by a Progress Invoice or Change Order.",
        "Cost Plus is consumed once with associated base scope and never recomputed over an invoice subtotal.",
        "Tax remains outside Contract scope and progress.",
        "Retainage withheld does not reduce completed Contract scope.",
        "Retainage release does not create Contract scope or a second tax event.",
        "Payment Schedule never authorizes billing beyond Contract availability.",
        "A Standard Invoice does not participate in tracked Contract consumption.",
        "A positive Accepted Change Order can return a Billed Contract to Partially Billed.",
        "Remaining subtotal is gross and does not subtract the Discount Pool.",
        "Customer-facing documents never expose internal Cost.",
        "QBO never becomes the source of Cinderblock Contract billing state.",
    ]
    for i, text in enumerate(invariants, 1):
        p = doc.add_paragraph()
        r = p.add_run(f"INV-{i:03d}  ")
        r.bold = True
        r.font.color.rgb = RGBColor(50, 108, 229)
        p.add_run(text)


def add_matrix(doc):
    doc.add_heading("11 Cross Feature Interaction Matrix", level=1)
    add_table(doc, ["Action", "Scope and value", "Pools and tax", "Progress and history", "Schedule Retainage QBO"], [
        ("Accept Estimate", "Establishes accepted scope and Contract Value", "Establishes discount, Cost Plus, and tax basis", "Contract state becomes Accepted", "Enables plan; no QBO change unless normal Estimate sync runs"),
        ("Create Standard Invoice", "Copies Estimate; does not consume tracked scope", "Copies represented terms", "Creates separate Standard conversion lock", "Removes schedule only on successful create; ordinary QBO Invoice"),
        ("Save Progress Draft", "Reserves selected base and Cost Plus scope", "Reserves selected discount and Tax Credit", "Does not change posted progress", "Associates Draft milestone; may reserve release capacity; sync waits for existing policy"),
        ("Open Progress Invoice", "Consumes selected scope", "Consumes discount and Tax Credit; posts stored tax", "Increases Total Invoiced and Contract Progress", "Milestone becomes Invoiced; Retainage becomes retained; ordinary QBO Invoice"),
        ("Accept positive CO", "Increases current accepted scope and value", "May change discount; adds inherited Cost Plus", "Preserves history; may change Billed to Partially Billed", "Recalculates future milestones; separate QBO Estimate"),
        ("Accept negative CO", "Decreases current accepted scope and value", "May generate Tax Credit; removes associated Cost Plus", "Preserves history; may expose over-invoicing", "Recalculates future milestones; separate QBO Estimate"),
        ("Create Retainage release", "No Contract scope or value change", "No discount, new tax, or Cost Plus", "No Total Invoiced or progress change", "No milestone consumption; decreases held balance when Open; ordinary QBO Invoice"),
        ("Cancel eligible invoice", "Releases or reverses allocations", "Releases or restores pools", "Recalculates history without reusing number", "Milestone returns to Planned; Retainage effects reverse; QBO requires safe reconciliation"),
        ("Record payment", "No scope or Contract Value change", "No pool change", "No Contract Progress change", "Changes A/R only; may constrain QBO conflict resolution"),
    ], widths=[1.3, 1.75, 1.55, 1.75, 1.85], font_size=7.3)


def add_validation_table(doc):
    doc.add_heading("12 Validation and Warnings", level=1)
    types = [
        "Hard block", "Hard block", "Hard block", "Hard block", "Hard block",
        "Hard block", "Hard block", "Hard block", "Warning", "Hard block",
        "Hard block", "Warning", "Hard block", "Hard block", "Warning",
        "Hard block", "Hard block", "Hard block", "Hard block", "Hard block",
    ]
    rows = [(rid, title, body, types[i]) for i, (rid, title, body) in enumerate(VALID)]
    add_table(doc, ["ID", "Condition", "Product result", "Type"], rows, widths=[0.85, 1.65, 3.8, 0.9], font_size=7.5)


def add_customer_rules(doc):
    doc.add_heading("13 Customer Facing Documents", level=1)
    add_table(doc, ["Document", "Identity and relationship", "Items and totals", "Additional content"], [
        ("Estimate", "Estimate title and number", "Estimate items; applicable discount, Cost Plus, tax, subtotal, and total", "Customer and job information, note, attachments, terms, acceptance"),
        ("Standard Invoice", "Invoice number and Linked to Estimate", "Ordinary items plus one Cost plus fee item when applicable; fee included before Subtotal", "Dates, status, note, attachments, terms, payments"),
        ("Progress Invoice", "Invoice number, Linked Estimate, optional milestone", "Progress columns under visibility settings; one Cost plus fee item; discount, tax, Retainage, totals", "Contract Progress and prior Invoice History when applicable"),
        ("Change Order", "Change Order title and number; Linked to Estimate", "CO items and its own applicable discount, Cost Plus, subtotal, tax treatment, and total", "Customer and job information, note, attachments, terms, acceptance"),
        ("Retainage release", "Invoice number, Retainage release context, Linked Estimate", "One Retainage release item; Total, Amount Paid where applicable, Balance Due", "Dates, note, terms, payment history"),
    ], widths=[1.25, 1.9, 2.5, 1.55], font_size=7.8)
    doc.add_paragraph("Tax, Discount, Cost Plus, and Retainage appear only when applicable. A customer document never shows zero-value placeholder rows or internal Cost, Markup, margin, profit, pools, reservations, or ledger mechanics.")


def add_examples(doc):
    doc.add_heading("15 Canonical Numerical Examples", level=1)
    examples = [
        ("Example A Basic Progress Contract", "Before", "$100,000 Accepted Estimate; no posted billing.", "Action", "Open a $40,000 Progress Invoice.", "After", "$40,000 posted gross scope; $60,000 Remaining subtotal; 40% Contract Progress; Partially Billed."),
        ("Example B Progress Contract with Discount", "Before", "$100,000 gross scope; $10,000 Discount Pool; $90,000 Contract Value.", "Action", "Bill $25,000 gross scope and apply $2,500 discount.", "After", "$75,000 Remaining subtotal; $7,500 Discount Pool remains; $22,500 Total Invoiced; Contract Value remains $90,000."),
        ("Example C Cost Plus and Tax", "Before", "$10,000 taxable base; 10% taxable Cost Plus; 8% tax.", "Action", "Bill 40% of the accepted scope.", "After", "$4,000 base plus $400 Cost plus fee equals $4,400 Subtotal; tax is $352; Total is $4,752. Cost Plus is consumed once."),
        ("Example D Billed Contract Reopened", "Before", "$100,000 Current Contract and $100,000 posted; status Billed.", "Action", "Accept a positive $10,000 Change Order.", "After", "$110,000 Current Contract; $100,000 history unchanged; $10,000 Remaining subtotal; status Partially Billed."),
        ("Example E Payment Schedule Variance", "Before", "$100,000 Contract Value; 25% milestone plans $25,000.", "Action", "Create and open a valid $20,000 Progress Invoice from that milestone.", "After", "Milestone actual is $20,000; other percentage anchors do not rebalance; Contract availability decreases by the invoice's gross allocation."),
        ("Example F Retainage", "Before", "$25,000 gross Progress Invoice; 10% Retainage; no prior retained balance.", "Action", "Open the invoice, then later open a $1,000 partial Retainage release.", "After", "$2,500 Total retained; $1,000 Released; $1,500 Held; original invoice records $22,500 due; release does not increase Contract Progress."),
    ]
    for title, b1, v1, b2, v2, b3, v3 in examples:
        doc.add_heading(title, level=2)
        add_table(doc, [b1, b2, b3], [(v1, v2, v3)], widths=[2.4, 2.4, 2.4], font_size=8.4)


def add_edge_cases(doc):
    doc.add_heading("16 Edge Cases", level=1)
    cases = [
        ("Progress Invoice", "Existing Draft", "The Draft reserves availability; another tracked Draft is blocked."),
        ("Progress Invoice", "Partial source-line availability", "The line remains eligible only up to its source allocation; aggregate Contract availability is also enforced."),
        ("Progress Invoice", "Billed Contract reopened", "A new positive Accepted CO creates new availability and changes the Contract to Partially Billed."),
        ("Progress Invoice", "Locked posted invoice", "An earlier or paid invoice remains valid for payments but cannot be financially edited."),
        ("Change Order", "Negative CO after billing", "Historical allocations remain; Contract may show Over invoiced and may generate Tax Credit."),
        ("Change Order", "CO acceptance with Draft", "Acceptance cancels the Draft, releases reservations, and requires a new invoice."),
        ("Change Order", "Multiple Accepted COs", "Each accepted revision accumulates into the same Contract and retains separate source identity."),
        ("Change Order", "Discount exceeds prior pool", "The CO may add the discount because it changes the contractual pool; the resulting pool cannot be negative."),
        ("Retainage", "No Retainage", "Tracking and release UI are absent."),
        ("Retainage", "Fully invoiced with held balance", "Contract Progress may be 100% while Retainage remains available for release."),
        ("Payment Schedule", "Canceled milestone invoice", "The live milestone returns to Planned; the invoice retains its historical milestone snapshot."),
        ("Payment Schedule", "Accepted CO changes value", "Future planned amounts recalculate; historical invoice actuals remain unchanged."),
        ("QBO", "Transaction edited or paid externally", "Cinderblock enters Sync conflict and prevents an unsafe automatic write."),
        ("QBO", "Ambiguous create timeout", "The integration reconciles by request identity and lookup before retrying."),
    ]
    add_table(doc, ["Feature", "Case", "Required result"], cases, widths=[1.35, 2.1, 3.75], font_size=8.1)


def add_open_questions(doc):
    doc.add_heading("17 Open Questions and Conflicts Found", level=1)
    doc.add_paragraph("The core Cinderblock Contract billing model is internally consistent. The following production accounting decisions remain unresolved in the authoritative QBO requirements and must be approved before implementation of the affected sync paths.")
    questions = [
        ("OPEN-001", "QBO line and account mapping", "Define the QBO Product or Service and account mappings for Retainage, Retainage release, document discounts, and Cost Plus. The mapping must preserve each document total and line identity."),
        ("OPEN-002", "QBO calculation order and rounding", "Validate the exact QBO-compatible order and rounding for discounts, Cost Plus, Retainage, taxable negative lines, Tax Credit representation where applicable, and document totals under each supported QBO tax mode."),
        ("OPEN-003", "Material QBO divergence", "Define which QBO field changes create a material conflict and which metadata-only changes may merge without accounting risk."),
        ("OPEN-004", "Keep QuickBooks version", "Define how Keep QuickBooks version affects the Cinderblock accounting-document representation and future sync baseline without importing QBO values into Contract billing ledgers."),
        ("OPEN-005", "Safe overwrite void and detach", "Define when overwrite, void, relink, detach, or leave-unchanged actions are permitted for transactions with payments, credits, deposits, closed periods, reconciliations, or tax constraints."),
        ("OPEN-006", "Conflict permissions and support path", "Define authorization, confirmation, audit, and support escalation for manual conflict resolution actions."),
        ("OPEN-007", "Payment Schedule Remaining Balance shortcut", "The source requirements refer to an existing Remaining Balance shortcut but do not define what value it inserts, when it is available, or how it behaves after Contract Value changes. Product must confirm the existing behavior before implementation."),
    ]
    add_table(doc, ["ID", "Decision", "Business behavior still required"], questions, widths=[1.0, 2.0, 4.2], font_size=8.1)
    doc.add_paragraph("Safe default until approval: preserve both systems, block the risky QBO write, surface the mismatch, and require intentional manual resolution.")


def add_out_scope(doc):
    doc.add_heading("18 Out of Scope", level=1)
    add_bullets(doc, [
        "Database schemas, migrations, persistence technology, and storage design.",
        "REST, GraphQL, API payload, service, class, or component architecture.",
        "Framework, state-management, queue, cache, webhook, polling, infrastructure, and deployment design.",
        "A new permissions model; existing Financial-area permissions remain authoritative unless a new action cannot map to them.",
        "Payment processor architecture and a second payment lifecycle.",
        "Unrelated CRM behavior or unrelated QBO integration redesign.",
        "Visual redesign beyond the states and conditional presentation required to communicate established business behavior.",
        "Automatic principal refunds, negative invoices, or credit memos for deductive Change Order over-invoicing in version one.",
    ])


def add_technical(doc):
    doc.add_heading("19 Technical Details", level=1)
    doc.add_paragraph("These constraints are included only because violating them would change observable business results.")
    add_bullets(doc, [
        "Use deterministic fixed-decimal currency arithmetic and one documented half-up rounding policy. Do not use binary floating point for persisted money.",
        "Allocate rounding remainders by stable source order so every displayed component reconciles exactly to its document total.",
        "Persist stable source-line identity, source document and revision, base or Cost Plus kind, accepted amount, taxability, supersession lineage, and allocation status.",
        "Persist an immutable tracked invoice billing-sequence key. Do not infer Previously Billed solely from mutable invoice dates or timestamps.",
        "Persist enough Contract revision information to reject stale Contract-affecting writes atomically and idempotently.",
        "Persist actual fractional quantities for accounting synchronization even when customer presentation hides them.",
        "Persist the last successful QBO concurrency value and material accounting snapshot needed to detect divergence before a destructive write.",
    ])


def add_audit(doc, all_reqs):
    doc.add_heading("20 Final Self Audit", level=1)
    ids = [r[0] for r in all_reqs]
    duplicate_count = len(ids) - len(set(ids))
    add_table(doc, ["Audit area", "Result", "Finding"], [
        ("Contract model", "PASS", "Progress is Contract-based from Estimate acceptance; Accepted COs revise the same Contract; source lineage remains intact."),
        ("Billing status", "PASS", "Contract billing status is distinct from CO lifecycle; Standard and Progress Invoice paths share Billed as the completed state."),
        ("Remaining subtotal", "PASS", "Defined as gross, pre-discount, source-backed availability after posted allocations and Draft reservations."),
        ("Feature interaction", "PASS", "Standard Invoice, Progress Invoice, CO, Retainage, Payment Schedule, Cost Plus, tax, and QBO boundaries are consistent."),
        ("Conditional customer display", "PASS", "Tax, Discount, Cost Plus, and Retainage are absent when inapplicable; internal Cost is never customer-facing."),
        ("Numerical examples", "PASS", "All six worked examples reconcile under the canonical formulas."),
        ("Requirement IDs", "PASS" if duplicate_count == 0 else "FAIL", f"{len(ids)} atomic requirements reviewed; {duplicate_count} duplicate IDs found."),
        ("Screenshots", "PASS", "No rule depends solely on a screenshot. Written requirements remain authoritative."),
        ("Open decisions", "PASS", "Only unresolved QBO production accounting decisions are listed; no architecture questions are presented as business gaps."),
    ], widths=[1.65, 0.8, 4.75], font_size=7.7)
    if doc.paragraphs and not doc.paragraphs[-1].text.strip():
        blank = doc.paragraphs[-1]._element
        blank.getparent().remove(blank)
    p = doc.add_paragraph()
    r = p.add_run("Audit conclusion  ")
    r.bold = True
    r.font.color.rgb = RGBColor(19, 121, 91)
    p.add_run("The specification is implementation-ready for the defined Cinderblock business model. QBO conflict resolution and accounting mappings remain intentionally blocked on the explicit decisions in Section 17.")


def build():
    doc = Document()
    configure_styles(doc)
    section = doc.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin = Inches(0.7)
    section.bottom_margin = Inches(0.65)
    section.left_margin = Inches(0.7)
    section.right_margin = Inches(0.7)
    section.header_distance = Inches(0.3)
    section.footer_distance = Inches(0.3)
    header = section.header
    hp = header.paragraphs[0]
    hp.text = "CINDERBLOCK   CONTRACT BILLING REQUIREMENTS"
    hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    for run in hp.runs:
        run.font.name = "Aptos"
        run.font.size = Pt(7.5)
        run.font.bold = True
        run.font.color.rgb = RGBColor(102, 112, 133)
    footer = section.footer
    fp = footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    fr = fp.add_run("Cinderblock  |  September 2026  |  ")
    fr.font.size = Pt(8)
    fr.font.color.rgb = RGBColor(102, 112, 133)
    add_page_field(fp)

    core_props = doc.core_properties
    core_props.title = "Cinderblock Contract Billing Requirements"
    core_props.subject = "Functional requirements for contract billing and QuickBooks Online synchronization"
    core_props.author = "Cinderblock Product"
    core_props.keywords = "contract billing, progress invoice, change order, retainage, payment schedule, QuickBooks Online"

    add_cover(doc)
    add_front_matter(doc)
    add_glossary(doc)
    add_req_section(doc, "GLOBAL", "2 Global Contract Model", "The following atomic rules define the shared Contract, invoice posting, financial measures, pools, and lifecycle behavior used by every feature.", GLOBAL)
    doc.add_heading("Canonical Contract Flow", level=2)
    add_flow(doc, ["Estimate accepted", "Contract established", "COs revise Contract", "Progress invoices consume scope", "Payments and releases settle A R"])
    add_req_section(doc, "STDINV", "3 Standard Invoice", "Standard Invoice is the flexible copy path. It is Contract-derived for provenance and copied terms, but it remains outside tracked Contract Progress consumption.", STDINV)
    doc.add_heading("Standard Invoice Happy Flow", level=2)
    add_flow(doc, ["Eligible Estimate", "Copy to Invoice", "Edit Standard Invoice", "Save Draft", "Estimate Billed"])
    add_req_section(doc, "PROGINV", "4 Progress Invoice", "Progress Invoice is the tracked billing path. It consumes accepted Contract scope while preserving source-line history, reservations, and cumulative progress.", PROGINV)
    doc.add_heading("Progress Invoice Happy Flow", level=2)
    add_flow(doc, ["Accepted Contract", "Choose scope", "Save Draft reservation", "Open Invoice", "Contract Progress updated"])
    add_req_section(doc, "CO", "5 Change Order", "A Change Order proposes a signed Contract revision while preserving its own approval history and the Contract's existing billing history.", CO)
    doc.add_heading("Change Order Happy Flow", level=2)
    add_flow(doc, ["Current Contract", "Draft or Pending CO", "Accept saved revision", "Current Contract revised", "Future billing uses revision"])
    add_req_section(doc, "RET", "6 Retainage", "Retainage is a standalone optional billing layer. Withholding changes Amount Due; release invoices make held principal due without billing new scope.", RET)
    doc.add_heading("Retainage Happy Flow", level=2)
    add_flow(doc, ["Progress Invoice", "Retainage withheld", "Held balance", "Release Invoice", "Previously withheld amount due"])
    add_req_section(doc, "PAY", "7 Payment Schedule", "Payment Schedule is an advisory planning and history layer. It guides invoice creation but never creates or overrides Contract availability.", PAY)
    doc.add_heading("Payment Schedule Happy Flow", level=2)
    add_flow(doc, ["Contract and schedule", "Select milestone", "Create Progress Draft", "Open Invoice", "Milestone records actual"])
    add_req_section(doc, "QBO", "8 QuickBooks Online Sync", "These rules describe only the Contract Billing behavior introduced or materially affected at the QBO boundary. Existing general QBO customer, item, trigger, and lifecycle behavior remains authoritative.", QBO)
    add_state_tables(doc)
    add_invariants(doc)
    add_matrix(doc)
    add_validation_table(doc)
    add_customer_rules(doc)
    add_req_section(doc, "UI", "14 Internal UI Business Rules", "UI requirements appear here only when visibility, editing, locking, or warning treatment communicates a business state.", UIREQ)
    add_examples(doc)
    add_edge_cases(doc)
    add_open_questions(doc)
    add_out_scope(doc)
    add_technical(doc)
    all_reqs = GLOBAL + STDINV + PROGINV + CO + RET + PAY + QBO + UIREQ + VALID
    doc.add_heading("Validation Requirements Index", level=2)
    add_table(doc, ["ID", "Requirement"], [(rid, name) for rid, name, _ in VALID], widths=[1.3, 5.9], font_size=8.3)
    doc.add_page_break()
    add_audit(doc, all_reqs)

    OUT_DOCX.parent.mkdir(parents=True, exist_ok=True)
    doc.save(OUT_DOCX)
    print(OUT_DOCX)
    print(f"Requirement count: {len(all_reqs)}")


if __name__ == "__main__":
    build()
