import { Button, StatusBadge } from '../../shared/ui'
import { retainageReleaseMetrics, type RetainageReleaseInvoice } from '../../shared/invoice-creation'
import { money } from './model'
import s from './RetainageBlock.module.css'

type Props = {
  withheld: number
  releases: RetainageReleaseInvoice[]
  onCreate: () => void
  onOpen: (invoice: RetainageReleaseInvoice) => void
}

export function RetainageBlock({ withheld, releases, onCreate, onOpen }: Props) {
  const { released, held, draftReserved, available } = retainageReleaseMetrics(withheld, releases)
  const active = releases.filter(invoice => invoice.status !== 'Canceled')
  const draft = active.find(invoice => invoice.status === 'Draft')
  return <section className={s.block} aria-labelledby="retainage-heading">
    <header><div><h2 id="retainage-heading">Retainage</h2><p>Track retained principal and release invoices.</p></div><Button variant="secondary" disabled={!draft && available <= 0} onClick={() => draft ? onOpen(draft) : onCreate()}>{draft ? 'Open draft invoice' : 'Release retainage'}</Button></header>
    <dl className={s.metrics}>
      <div><dt>Total retained</dt><dd>{money(withheld)}</dd></div>
      <div><dt>Released</dt><dd>{money(released)}</dd></div>
      <div><dt>Held</dt><dd>{money(held)}</dd></div>
      <div><dt>Draft reserved</dt><dd>{money(draftReserved)}</dd></div>
      <div><dt>Available to release</dt><dd>{money(available)}</dd></div>
    </dl>
    {releases.length > 0 && <div className={s.history}><h3>Release invoices</h3>{releases.map(invoice => <button type="button" key={invoice.id} onClick={() => onOpen(invoice)}><span><strong>Invoice #{invoice.id}</strong><small>{money(invoice.amount)}</small></span><StatusBadge tone={invoice.status === 'Draft' || invoice.status === 'Canceled' ? 'neutral' : invoice.status === 'Open' ? 'pending' : 'success'}>{invoice.status}</StatusBadge></button>)}</div>}
  </section>
}
