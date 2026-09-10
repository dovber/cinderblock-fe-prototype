# Complete reference review

Reviewed visually on September 10, 2026: every file under `screenshots` and `pdf-docs`, including both pages of each PDF. Dimensions are original image pixels. The PDFs were rendered locally for inspection only; no new PDFs were authored.

## Screenshots

| File | Dimensions | Findings to preserve |
| --- | --- | --- |
| [create-progress-invoice-flow.png](../screenshots/create-progress-invoice-flow.png) | 699 x 629 | Cropped modal with dim backdrop, large question heading, three stacked radio choices, partial estimate selected, subtotal beneath it, percentage-prefix field, Cancel left and blue Create invoice right. The crop does not establish full-screen modal position. |
| [estimates-table.png](../screenshots/estimates-table.png) | 2461 x 1441 | Workspace sidebar with Estimates selected; header and New estimate action; date selector plus five metric cards; search and six filter pills; eight rows; Pending, Converted, Draft and Accepted states; pale total footer. |
| [invoices-table.png](../screenshots/invoices-table.png) | 2467 x 1455 | Same shell with Invoices selected; four metric cards; invoice-specific filters and columns; seven rows; Partially paid, Open and Draft; calendar due dates and On receipt; aggregate total footer. |
| [job-profile.png](../screenshots/job-profile.png) | 2460 x 1447 | Jobs selected; breadcrumb and creation date; New deck detail card with outlined IN PROGRESS, customer/address/type/description rows, removable tags and assigned-user chip; primary tabs and segmented finance subtabs; overview, income and cost cards; green progress; right notes composer and authored note. |
| [new-progress-invoice.png](../screenshots/new-progress-invoice.png) | 1560 x 1243 | Full-screen editor titled New progress invoice; Save invoice split button; six section tabs including Payments; SENT details card; two line items with contract/previous/current billing; editable adjustments and totals; expanded settings pane with separate editor/customer switches. |
| [pending-estimate.png](../screenshots/pending-estimate.png) | 2098 x 1450 | Estimate #1008 and job subtitle; Preview, Send estimate, disabled Save changes; five section tabs without Payments; collapsed right rail; PENDING card with three-column metadata, empty PO/customer reference fields and salesperson links; create invoice/PO actions; one item, subtotal/discount/tax/total and internal margin block; Public note begins at crop bottom. |
| [view-progress-invoice.png](../screenshots/view-progress-invoice.png) | 1568 x 1248 | Invoice #100414 with Progress invoice subtitle and job line; same editable layout and settings as new-progress reference; previous billed amounts differ; overflow in header. Do not infer read-only behavior from filename. |
| [weblink-invoice.png](../screenshots/weblink-invoice.png) | 2472 x 1981 | Customer sheet, merchant header, Invoice #1007 linked to Estimate #1007; blue $20,950 balance banner against $21,950 total with Pay Now; two items; subtotal, green negative paid row, balance due; note, collapsed terms, payment-history row and receipt action; outside brand footer. |
| [weblink-pending-estimate.png](../screenshots/weblink-pending-estimate.png) | 2472 x 1710 | Customer Estimate #1008; blue $100 banner with Decline/Accept; customer/job/date/expiry; one item; right-aligned total; note and collapsed terms; empty invoice history; Print/PDF controls and outside footer. |
| [weblink-signed-estimate.png](../screenshots/weblink-signed-estimate.png) | 2472 x 2047 | Customer Estimate #1007; green $21,950 banner and Signed & Accepted pill; two items; total, note, collapsed terms; acceptance box with digital-signing caption, script signature, name and timestamp; invoice-history row with blue Partially Paid pill; outside footer. |

## PDF visual references

### [estimate-1008.pdf](../pdf-docs/estimate-1008.pdf)

Two US Letter pages. Embedded fonts: Inter Regular, Medium, SemiBold.

- Page 1: large merchant logo at upper left; merchant name, street address and contact block upper right; Estimate and #1008; bordered Accept estimate/URL/QR strip; customer and Job 101 metadata at left, date/expiry at right; numbered one-item table; $100 total; bordered thank-you note; thin footer rule with Page 1 of 2 left and Estimate 1008 right.
- Page 2: large bordered Terms & Conditions panel with uppercase heading and nine prose sections: Estimate & Scope, Pricing & Materials, Payment, Changes & Additional Work, Scheduling & Delays, Site Conditions, Acceptance, Warranty & Liability, Permits & Compliance. Below it, three equally weighted blank signature/name/date lines. Footer repeats with Page 2 of 2.
- Translation rule: this printed document has a QR action strip and signature lines; the pending weblink has an amount/action banner and empty history instead. Keep those presentations distinct. Use HTML for any future preview.

### [invoice-1007.pdf](../pdf-docs/invoice-1007.pdf)

Two US Letter pages. Embedded fonts: Inter Regular, Medium, SemiBold.

- Page 1: same merchant header; Invoice and #1007; linked Estimate 1007 line; bordered Pay invoice/URL/QR strip; customer/job/date/due metadata; two numbered items; right-aligned $21,950 total, green $1,000 amount paid, and $20,950 remaining balance; page/document footer.
- Page 2: bordered thank-you note; bordered Terms & Conditions panel with Payment Due, Invoice Accuracy, Additional Work, Deposits & Prior Payments, Returned or Failed Payments, Ownership of Materials, Warranty, Collection Costs, Acceptance; payment-history heading and table with date, method, reference and green amount; page/document footer. No signature lines.
- Translation rule: the printed layout separates note/terms/history onto page 2, whereas the weblink flows continuously. The PDF paid amount is positive while the web totals box shows a deduction; preserve the target presentation rather than normalizing the visuals blindly.

## Evidence limits

The signed estimate is #1007; the supplied estimate PDF is #1008. They are different records, not conflicting versions. The progress-invoice screenshots use a different job, customer, date and amounts from the other references and are not connected fixture data. Several editor panels are cut off by the capture; content below the image is unknown. Static images do not establish validation, calculations, navigation destinations, hidden panels, or action outcomes.

No files outside the ten PNGs and two PDFs were present in these reference folders at review time. The manifest records every file and is a baseline for future preservation checks.
