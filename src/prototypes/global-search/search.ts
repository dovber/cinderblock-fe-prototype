export const minimumQueryLength = 3
export const entities = ['Customers', 'Jobs', 'Invoices', 'Estimates', 'Purchase Orders', 'Appointments'] as const
export type Entity = typeof entities[number]
export type SearchResult = {
  id: string
  entity: Entity
  primary: string
  secondary: string
  openedLabel: string
  phone?: string
  excerpt?: string
  detail?: string
  subdetail?: string
}

export const searchResults: SearchResult[] = [
  { id: 'customer-john', entity: 'Customers', primary: 'John Smith', secondary: 'john@smith.com', phone: '(954) 55562330', openedLabel: 'Customer John Smith' },
  { id: 'customer-smith', entity: 'Customers', primary: 'Smith Construction', secondary: 'info@smithconstruction.com', phone: '(954) 555-1122', openedLabel: 'Customer Smith Construction' },
  { id: 'customer-emily', entity: 'Customers', primary: 'Emily Smith', secondary: 'emily@smith.com', phone: '(305) 555-7766', openedLabel: 'Customer Emily Smith' },
  { id: 'customer-david', entity: 'Customers', primary: 'David Miller', secondary: 'david@millerco.com', phone: '(305) 555-2288', excerpt: 'Note: Called about broken window at rental property.', openedLabel: 'Customer David Miller' },
  { id: 'job-1423', entity: 'Jobs', primary: '#1423 • Kitchen Remodel', secondary: 'John Smith • 123 Main St, Fort Lauderdale, FL', excerpt: 'Description: Replace broken window beside kitchen sink.', openedLabel: 'Job 1423' },
  { id: 'job-1187', entity: 'Jobs', primary: '#1187 • Bathroom Renovation', secondary: 'Smith Construction • 456 Oak Ave, Miami, FL', openedLabel: 'Job 1187' },
  { id: 'job-1480', entity: 'Jobs', primary: '#1480 • Smith Residence', secondary: 'Emily Smith • 789 Pine St, Hollywood, FL', openedLabel: 'Job 1480' },
  { id: 'job-2011', entity: 'Jobs', primary: '#2011 • Storm Damage', secondary: 'Smith Construction • 321 Maple Dr, Boca Raton, FL', excerpt: 'Note: Customer reported broken window after last night’s storm.', openedLabel: 'Job 2011' },
  { id: 'job-1587', entity: 'Jobs', primary: '#1587 • Exterior Repairs', secondary: 'Emily Johnson • 456 Oak Ave, Miami, FL', excerpt: 'Description: Broken window on second floor, repair siding.', openedLabel: 'Job 1587' },
  { id: 'job-555623', entity: 'Jobs', primary: '#555623', secondary: 'John Smith', openedLabel: 'Job 555623' },
  { id: 'invoice-1842', entity: 'Invoices', primary: 'Invoice #1842', secondary: 'John Smith • #1423 Kitchen Remodel', detail: '$12,450', openedLabel: 'Invoice 1842' },
  { id: 'invoice-2031', entity: 'Invoices', primary: 'Invoice #2031', secondary: 'Smith Construction • #1187 Bathroom Renovation', detail: '$8,320', openedLabel: 'Invoice 2031' },
  { id: 'invoice-2281', entity: 'Invoices', primary: 'Invoice #2281', secondary: 'David Miller • #1587 Exterior Repairs', excerpt: 'Description: Window repair (broken window).', detail: '$950', openedLabel: 'Invoice 2281' },
  { id: 'estimate-1284', entity: 'Estimates', primary: 'Estimate #1284', secondary: 'John Smith • #1423 Kitchen Remodel', detail: '$18,200', openedLabel: 'Estimate 1284' },
  { id: 'po-4421', entity: 'Purchase Orders', primary: 'PO #4421', secondary: 'Smith Construction • Home Depot', detail: '$2,310', openedLabel: 'Purchase Order 4421' },
  { id: 'appointment-1', entity: 'Appointments', primary: 'Site Visit', secondary: 'John Smith • #1423 Kitchen Remodel', detail: 'Wed, Sep 9, 2026', subdetail: '10:00 AM – 11:00 AM', openedLabel: 'Appointment Site Visit' },
  { id: 'appointment-2', entity: 'Appointments', primary: 'Bathroom Walkthrough', secondary: 'Smith Construction • #1187 Bathroom Renovation', detail: 'Thu, Sep 10, 2026', subdetail: '2:00 PM – 3:00 PM', openedLabel: 'Appointment Bathroom Walkthrough' },
  { id: 'appointment-3', entity: 'Appointments', primary: 'Window Inspection', secondary: 'David Miller', excerpt: 'Note: Inspect broken window and provide quote.', detail: 'Fri, Sep 11, 2026', subdetail: '9:00 AM – 10:00 AM', openedLabel: 'Appointment Window Inspection' },
  { id: 'appointment-4', entity: 'Appointments', primary: 'Repair Follow-up', secondary: 'John Smith', excerpt: 'Note: Confirm broken window has been repaired.', detail: 'Tue, Sep 15, 2026', subdetail: '2:00 PM – 2:30 PM', openedLabel: 'Appointment Repair Follow-up' },
]

// Keep phone normalization scoped to customer phone fields, never related jobs.
export function matchRanges(text: string, query: string, phone = false): [number, number][] {
  const needle = query.trim().toLowerCase()
  if (needle.length < minimumQueryLength) return []
  const normalizePhone = phone && /^[\d\s()+.-]+$/.test(needle) && /\d/.test(needle)
  const positions = Array.from(text.matchAll(/\d/g), match => match.index)
  const haystack = normalizePhone ? positions.map(index => text[index]).join('') : text.toLowerCase()
  const search = normalizePhone ? needle.replace(/\D/g, '') : needle
  const ranges: [number, number][] = []
  for (let start = haystack.indexOf(search); start !== -1; start = haystack.indexOf(search, start + search.length)) {
    ranges.push(normalizePhone ? [positions[start], positions[start + search.length - 1] + 1] : [start, start + search.length])
  }
  return ranges
}

export function filterResults(query: string) {
  if (query.trim().length < minimumQueryLength) return []
  return entities.map(entity => ({ entity, results: searchResults.filter(result => result.entity === entity && (
    [result.primary, result.secondary, result.excerpt, result.detail, result.subdetail].some(text => text && matchRanges(text, query).length > 0)
    || (result.phone && matchRanges(result.phone, query, true).length > 0)
  )) })).filter(group => group.results.length > 0)
}
