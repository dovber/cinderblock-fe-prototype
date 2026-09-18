import { Fragment, useEffect, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button, IconButton, LineItemLockIndicator, Radio } from '../ui'
import s from './ProgressInvoiceCreationDialog.module.css'

export type ProgressInvoiceCreationLine = { id: string; name: string; qty: number; contract: number; previous: number; billableRemaining?: number; kind?: 'active' | 'superseded' | 'removal'; scopeKind?: 'base' | 'cost-plus'; relatedScopeId?: string; sourceLabel?: string }
export type InvoiceMilestoneOption = { id: string; name: string; percentage?: number; invoiceId?: string; sequence?: number }
export type InvoiceMilestoneSelection = { id?: string; name: string }
type CreationMethod = 'full' | 'partial' | 'items'
type InputMode = 'percent' | 'amount'
type DiscountPool = { original: number; remaining: number; originalGrossScope: number }
type Props = { contractValue?: number; contractRemaining?: number; contractMode?: boolean; lines: ProgressInvoiceCreationLine[]; hasPreviousInvoices: boolean; discountPool?: DiscountPool; milestones?: InvoiceMilestoneOption[]; initialMilestoneId?: string; initialMethod?: CreationMethod; onCancel: () => void; onCreate: (amounts: number[], discount: number, milestone?: InvoiceMilestoneSelection) => void }

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)
const rounded = (value: number) => Math.round(value * 100) / 100
const remaining = (line: ProgressInvoiceCreationLine) => line.kind === 'superseded' || line.kind === 'removal' ? 0 : Math.max(0, line.billableRemaining ?? line.contract - line.previous)
const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
const percent = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value) + '%'
const parseAmount = (value: string) => { const normalized = value.trim().replaceAll(',', ''); return normalized !== '' && /^\d*\.?\d+$/.test(normalized) ? Number(normalized) : NaN }
const proportionalDiscount = (pool: DiscountPool, invoiceValue: number) => pool.originalGrossScope > 0
  ? Math.min(pool.remaining, rounded(pool.original * invoiceValue / pool.originalGrossScope))
  : 0

function partialError(value: string, mode: InputMode, contract: number, allowance: number) {
  const numeric = parseAmount(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return 'Enter a value greater than zero'
  const requested = mode === 'percent' ? contract * numeric / 100 : numeric
  return requested > allowance + 0.000001 ? 'Exceeds remaining estimate value' : ''
}

function allocate(lines: ProgressInvoiceCreationLine[], requested: number) {
  let available = Math.min(Math.max(requested, 0), sum(lines.map(remaining)))
  const amounts = lines.map(() => 0)
  let eligible = lines.map((_, index) => index).filter(index => remaining(lines[index]) > 0)
  while (eligible.length && available > 0.000001) {
    const weight = sum(eligible.map(index => lines[index].contract))
    const capped = eligible.filter(index => available * lines[index].contract / weight > remaining(lines[index]) - amounts[index])
    if (!capped.length) { eligible.forEach(index => { amounts[index] += available * lines[index].contract / weight }); break }
    capped.forEach(index => { const amount = remaining(lines[index]) - amounts[index]; amounts[index] += amount; available -= amount })
    eligible = eligible.filter(index => !capped.includes(index))
  }
  return amounts.map(rounded)
}

function createAmounts(lines: ProgressInvoiceCreationLine[], method: CreationMethod, mode: InputMode, value: string, selected: string[]) {
  if (method === 'full') return lines.map(remaining)
  if (method === 'items') return lines.map(line => selected.includes(line.id) || line.scopeKind === 'cost-plus' && !!line.relatedScopeId && selected.includes(line.relatedScopeId) ? remaining(line) : 0)
  return allocate(lines, mode === 'percent' ? sum(lines.map(line => line.contract)) * parseAmount(value) / 100 : parseAmount(value))
}

export function ProgressInvoiceCreationDialog({ contractValue, contractRemaining, contractMode = false, lines, hasPreviousInvoices, discountPool, milestones = [], initialMilestoneId, initialMethod, onCancel, onCreate }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const allCheckbox = useRef<HTMLInputElement>(null)
  const availableMilestones = milestones.filter(item => !item.invoiceId)
  const initialMilestone = availableMilestones.find(item => item.id === initialMilestoneId) ?? availableMilestones[0]
  const [method, setMethod] = useState<CreationMethod | 'milestone'>(initialMilestoneId ? 'milestone' : initialMethod ?? (hasPreviousInvoices ? 'full' : 'partial'))
  const [milestoneId, setMilestoneId] = useState(initialMilestone?.id ?? '')
  const milestone = availableMilestones.find(item => item.id === milestoneId)
  const [milestoneMethod, setMilestoneMethod] = useState<'partial' | 'items'>('partial')
  const [mode, setMode] = useState<InputMode>('percent')
  const [values, setValues] = useState({ percent: initialMilestoneId ? initialMilestone?.percentage?.toString() ?? '' : '', amount: '' })
  const [touched, setTouched] = useState(false)
  const [step, setStep] = useState<'choose' | 'milestone' | 'items' | 'discount' | 'name'>(initialMilestoneId ? 'milestone' : initialMethod === 'items' ? 'items' : 'choose')
  const [selected, setSelected] = useState<string[]>([])
  const [pendingAmounts, setPendingAmounts] = useState<number[]>([])
  const [discountValue, setDiscountValue] = useState('0.00')
  const [discountTouched, setDiscountTouched] = useState(false)
  const [milestoneName, setMilestoneName] = useState('')
  const eligible = lines.filter(line => remaining(line) > 0 && line.scopeKind !== 'cost-plus')
  const selectedForBilling = (line: ProgressInvoiceCreationLine) => selected.includes(line.id) || line.scopeKind === 'cost-plus' && !!line.relatedScopeId && selected.includes(line.relatedScopeId)
  const contract = contractValue ?? sum(lines.map(line => line.contract))
  const allowance = Math.min(contractRemaining ?? Infinity, sum(lines.map(remaining)))
  const activeMethod = method === 'milestone' ? milestoneMethod : method
  const error = partialError(values[mode], mode, contract, allowance)
  const discountAmount = discountValue.trim() === '' ? 0 : parseAmount(discountValue)
  const discountApplied = Number.isFinite(discountAmount) ? discountAmount : 0
  const discountError = !Number.isFinite(discountAmount) ? 'Enter zero or a positive amount' : discountPool && discountAmount > discountPool.remaining ? 'Exceeds remaining discount pool' : ''
  const hasRemainingDiscount = (discountPool?.remaining ?? 0) > 0

  useEffect(() => { const element = dialog.current!; const previous = document.activeElement as HTMLElement | null; element.showModal(); return () => { element.close(); previous?.focus() } }, [])
  useEffect(() => { heading.current?.focus() }, [step])
  useEffect(() => { if (allCheckbox.current) allCheckbox.current.indeterminate = selected.length > 0 && selected.length < eligible.length }, [selected.length, eligible.length, step])

  function chooseMilestone(id: string) {
    const choice = availableMilestones.find(item => item.id === id)
    setMilestoneId(id)
    setMilestoneMethod('partial')
    setMode('percent')
    setValues({ percent: choice?.percentage?.toString() ?? '', amount: '' })
    setTouched(false)
  }

  function openDiscountStep(amounts: number[]) {
    const suggestion = proportionalDiscount(discountPool!, sum(amounts))
    setPendingAmounts(amounts)
    setDiscountValue(suggestion.toFixed(2))
    setDiscountTouched(false)
    setStep('discount')
  }

  function continueAfterAmounts(amounts: number[]) {
    if (method === 'milestone' && milestone) {
      if (hasRemainingDiscount) openDiscountStep(amounts)
      else onCreate(amounts, 0, { id: milestone.id, name: milestone.name })
      return
    }
    setPendingAmounts(amounts)
    setStep('name')
  }

  function submit() {
    if (step === 'name') {
      if (hasRemainingDiscount) openDiscountStep(pendingAmounts)
      else onCreate(pendingAmounts, 0, { name: milestoneName.trim() })
      return
    }
    if (step === 'choose' && method === 'milestone') { chooseMilestone(milestoneId); setStep('milestone'); return }
    if (!activeMethod) return
    if ((step === 'choose' || step === 'milestone') && activeMethod === 'items') { setStep('items'); return }
    if (step === 'discount') {
      setDiscountTouched(true)
      if (!discountError) onCreate(pendingAmounts, discountAmount, method === 'milestone' && milestone ? { id: milestone.id, name: milestone.name } : { name: milestoneName.trim() })
      return
    }
    if (activeMethod === 'partial' && error) { setTouched(true); return }
    if (activeMethod === 'items' && !selected.length) return
    const amounts = activeMethod === 'items' ? createAmounts(lines, activeMethod, mode, values[mode], selected) : allocate(lines, activeMethod === 'full' ? allowance : mode === 'percent' ? contract * parseAmount(values[mode]) / 100 : parseAmount(values[mode]))
    if (sum(amounts) > allowance + .01) return
    continueAfterAmounts(amounts)
  }

  function goBack() {
    if (step === 'choose') { onCancel(); return }
    if (step === 'milestone') { if (initialMilestoneId) onCancel(); else setStep('choose'); return }
    if (step === 'items' && method === 'milestone') { setStep('milestone'); return }
    if (step === 'items' && initialMethod === 'items') { onCancel(); return }
    if (step === 'discount') { setStep(method === 'milestone' ? milestoneMethod === 'items' ? 'items' : 'milestone' : 'name'); return }
    setStep('choose')
  }

  const title = step === 'choose' ? 'What would you like to invoice?' : step === 'milestone' ? 'Select milestone' : step === 'items' ? 'Select items to invoice' : step === 'discount' ? 'Apply discount?' : 'Payment milestone'
  const partialInvalid = (step === 'choose' && method === 'partial' || step === 'milestone' && milestoneMethod === 'partial') && !!error
  const primaryAction = step === 'discount'
    || step === 'name' && !hasRemainingDiscount
    || step === 'milestone' && milestoneMethod === 'partial' && !hasRemainingDiscount
    || step === 'items' && method === 'milestone' && !hasRemainingDiscount
    ? 'Create invoice'
    : 'Continue'
  return <dialog ref={dialog} className={`${s.dialog} ${step === 'items' ? s.selectionDialog : ''}`} aria-labelledby="creation-heading" onCancel={event => { event.preventDefault(); onCancel() }}>
    {step === 'items' && <IconButton className={s.backIcon} label="Back to invoice options" onClick={goBack}><ArrowLeft size={20}/></IconButton>}
    <h2 id="creation-heading" ref={heading} tabIndex={-1}>{title}</h2>
    {step === 'items' && <p className={s.selectionIntro}>You can adjust a selected item’s amount on the invoice itself</p>}
    {step === 'name' && <p className={s.selectionIntro}>Optional. Add a milestone name to describe what this payment is for.</p>}
    <form noValidate onSubmit={event => { event.preventDefault(); submit() }}>
      {step === 'choose' ? <fieldset className={s.choices}><legend className={s.srOnly}>Invoice method</legend>
        {availableMilestones.length > 0 && <Radio name="invoice-method" label="Select milestone" checked={method === 'milestone'} onChange={() => setMethod('milestone')}/>} 
        {hasPreviousInvoices && <div><Radio name="invoice-method" label={contractMode ? "The rest of this contract" : "The rest of this estimate"} checked={method === 'full'} onChange={() => setMethod('full')}/>{method === 'full' && <p className={s.remainingHelper}>Remaining subtotal: {money(allowance)}</p>}</div>}
        <div><Radio name="invoice-method" label="Percent or amount" checked={method === 'partial'} onChange={() => setMethod('partial')}/>{method === 'partial' && <PartialControls mode={mode} values={values} allowance={allowance} contract={contract} error={error} touched={touched} firstInvoice={!hasPreviousInvoices} onMode={next => { setMode(next); setTouched(false) }} onValue={value => { setValues({ ...values, [mode]: value }); setTouched(true) }}/>}</div>
        <Radio name="invoice-method" label="Select items" checked={method === 'items'} onChange={() => setMethod('items')}/>
      </fieldset> : step === 'milestone' ? <fieldset className={s.milestoneStep}><legend className={s.srOnly}>Select milestone and invoice method</legend>
        <label htmlFor="progress-milestone">Milestone</label><select id="progress-milestone" value={milestoneId} onChange={event => chooseMilestone(event.target.value)}>{availableMilestones.map((item, index) => <option key={item.id} value={item.id}>{item.sequence ?? index + 1}. {item.name}</option>)}</select><strong>Invoice by</strong>
        <Radio name="milestone-invoice-method" label="Percent or amount" checked={milestoneMethod === 'partial'} onChange={() => setMilestoneMethod('partial')}/>
        {milestoneMethod === 'partial' && <PartialControls mode={mode} values={values} allowance={allowance} contract={contract} error={error} touched={touched} milestone onMode={next => { setMode(next); setTouched(false) }} onValue={value => { setValues({ ...values, [mode]: value }); setTouched(true) }}/>} 
        <Radio name="milestone-invoice-method" label="Select items" checked={milestoneMethod === 'items'} onChange={() => setMilestoneMethod('items')}/>
      </fieldset> : step === 'items' ? <div className={s.selectionBody}>{sum(lines.filter(selectedForBilling).map(remaining)) > allowance + .01 && <p className={s.error} role="alert">Selected items exceed the remaining contract value. Use Percent or amount to bill the remaining balance.</p>}<table className={s.selectionTable}><caption className={s.srOnly}>Estimate items available to invoice</caption><thead><tr><th className={s.checkCell}><input ref={allCheckbox} type="checkbox" aria-label="Select all eligible items" checked={eligible.length > 0 && selected.length === eligible.length} onChange={event => setSelected(event.target.checked ? eligible.map(line => line.id) : [])}/></th><th colSpan={2}><span aria-live="polite">{selected.length} of {eligible.length} selected</span></th><th>Qty</th><th className={s.numeric}>Amount</th>{hasPreviousInvoices && <th className={s.numeric}>Remaining</th>}</tr></thead><tbody>{lines.map((line, index) => {
        const lockReason = remaining(line) === 0
          ? 'This item is locked because it has already been fully invoiced.'
          : line.scopeKind === 'cost-plus'
            ? 'This item is locked because Cost Plus scope is billed with its related contract item.'
            : undefined
        return <Fragment key={line.id}>{contractMode && (index === 0 || lines[index - 1].sourceLabel !== line.sourceLabel) && <tr><th colSpan={hasPreviousInvoices ? 6 : 5}>{line.sourceLabel}</th></tr>}<tr className={remaining(line) === 0 ? s.fullyBilled : ''}><td className={s.checkCell}><input type="checkbox" aria-label={`${line.scopeKind === 'cost-plus' ? 'Included with' : 'Select'} ${line.name}`} disabled={remaining(line) === 0 || line.scopeKind === 'cost-plus'} checked={selectedForBilling(line)} onChange={event => setSelected(event.target.checked ? [...selected, line.id] : selected.filter(id => id !== line.id))}/></td><td className={s.rowNumber}>{index + 1}</td><td>{line.name}{lockReason && <LineItemLockIndicator reason={lockReason}/>}</td><td>{line.qty}</td><td className={s.numeric}>{money(line.contract)}</td>{hasPreviousInvoices && <td className={s.numeric}>{remaining(line) > 0 ? money(remaining(line)) : 'Fully invoiced'}</td>}</tr></Fragment>
      })}</tbody></table></div>
      : step === 'discount' && discountPool ? <div className={s.discountStep}><p>This contract has {money(discountPool.remaining)} in discount remaining. Choose how much to apply to this invoice.</p><label htmlFor="discount-offer">Discount amount</label><div className={s.discountOfferInput}><span>$</span><input id="discount-offer" autoComplete="off" inputMode="decimal" value={discountValue} aria-invalid={discountTouched && !!discountError} onChange={event => { setDiscountValue(event.target.value); setDiscountTouched(true) }} onBlur={() => { if (discountValue.trim() === '') setDiscountValue('0.00') }}/></div>{discountTouched && discountError ? <small className={s.error} role="alert">{discountError}</small> : <small>Suggested proportional discount: {money(proportionalDiscount(discountPool, sum(pendingAmounts)))}</small>}<p className={s.discountRemaining}>{money(Math.max(0, discountPool.remaining - discountApplied))} will remain after this invoice.</p></div>
      : <div className={s.milestoneNameStep}><label htmlFor="progress-milestone-name">Milestone name</label><input id="progress-milestone-name" autoFocus value={milestoneName} onChange={event => setMilestoneName(event.target.value)} placeholder="e.g. Deposit, Rough-in complete, Final payment"/></div>}
      <footer className={s.dialogFooter}><Button className={s.cancel} variant="text" onClick={goBack}>{step === 'choose' ? 'Cancel' : 'Back'}</Button><Button type="submit" disabled={(step === 'milestone' && (!milestoneId || !milestoneMethod)) || partialInvalid || (step === 'items' && (selected.length === 0 || sum(lines.filter(selectedForBilling).map(remaining)) > allowance + .01)) || (step === 'discount' && !!discountError)}>{primaryAction}</Button></footer>
    </form>
  </dialog>
}

function PartialControls({ mode, values, allowance, contract, error, touched, milestone = false, firstInvoice = false, onMode, onValue }: { mode: InputMode; values: Record<InputMode, string>; allowance: number; contract: number; error: string; touched: boolean; milestone?: boolean; firstInvoice?: boolean; onMode: (mode: InputMode) => void; onValue: (value: string) => void }) {
  const prefix = milestone ? 'Milestone ' : ''
  const helper = firstInvoice ? `Estimate total: ${money(contract).replace(/\.00$/, '')}` : mode === 'percent' ? `Remaining subtotal: ${money(allowance)} · ${percent(allowance / contract * 100)}` : `Remaining subtotal: ${money(allowance)}`
  return <div className={s.partialFields}><p>{helper}</p><div className={s.partialInput}><div className={s.modeSwitch} role="group" aria-label={`${prefix}invoice input mode`}><button type="button" aria-label={`${prefix}percentage`} aria-pressed={mode === 'percent'} onClick={() => onMode('percent')}>%</button><button type="button" aria-label={`${prefix}dollar amount`} aria-pressed={mode === 'amount'} onClick={() => onMode('amount')}>$</button></div><input autoComplete="off" inputMode="decimal" aria-label={mode === 'percent' ? `${prefix}percentage to invoice` : `${prefix}amount to invoice`} aria-invalid={touched && !!error} value={values[mode]} onChange={event => onValue(event.target.value)}/></div>{touched && error && <p className={s.error} role="alert">{error}</p>}</div>
}
