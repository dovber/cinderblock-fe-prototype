# Prototype modules

- `shell-preview/`: landing page and shared workspace shell composition.
- `global-search/`: local header search and result-open modal.
- `progress-invoices/`: unified Estimate/contract lifecycle, including Change
  Orders, source-aware progress billing, Standard conversion, Payment Schedule,
  and Retainage. Two launcher entries mount independent Regular Estimate and
  focused Estimate w/ Retainage state.

Keep dependencies flowing app → prototypes → shared. Internal subfolders of one
prototype may share its state/model; separate prototype modules do not import one
another. Keep all fixture data local and preserve the source references.
