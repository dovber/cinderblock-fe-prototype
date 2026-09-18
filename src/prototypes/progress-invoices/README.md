# Contract lifecycle

All contract-related launcher entries compose `ProgressInvoicesPrototype`.
`lifecycle.ts` owns scenario initialization, source-aware scope, invoice history,
CO acceptance, and milestone fulfillment. State belongs to the controller.

- `model.ts`: Progress Invoice fields, baseline/retainage fixtures and helpers.
- `change-orders/`: the existing CO editor, selector and contract lineage UI.
- `contract-billing/scenarios.ts`: migrated replacement/adjustment scenarios only.
- `schedule/`: the existing schedule manager, confirmation and scenario fixtures.
- `InvoiceEditor.tsx`: the single tracked invoice editor, with source grouping.
- `ProgressInvoicePreview.tsx`: the HTML customer preview variants.
- `ContractProgressSummary.tsx`: live projected invoice/contract totals.

See [unified requirements](../../../docs/contract-lifecycle-prototype.md).
No sibling prototype imports, backend services, live payment actions, or PDFs.
