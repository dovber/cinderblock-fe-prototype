import { useState } from 'react'
import { CreationDialog } from './CreationDialog'
import { CopyInvoiceEditor } from './CopyInvoiceEditor'
import { EstimateEditor } from './EstimateEditor'
import { InvoiceEditor } from './InvoiceEditor'
import { InvoiceTypeDialog } from './InvoiceTypeDialog'
import { RetainageInvoicePreview } from './RetainageInvoicePreview'
import { RetainageReleaseDialog, RetainageReleaseEditor, retainageReleaseMetrics, type InvoiceMilestoneSelection, type RetainageReleaseInvoice } from '../../shared/invoice-creation'
import { Button, Card, PaymentScheduleCard } from '../../shared/ui'
import { invoiceRetainageWithheld, sum, allocate, type ProgressInvoice, type EstimateLine } from './model'
import { acceptSavedChangeOrder, acceptedValue, availableContractDiscount, billingLines, contractDiscountPool, draftInvoice, draftReservedValue, grossContractScope, hasDraft, initialLifecycle, invoiceAmounts, isPosted, isTrackedInvoiceFinanciallyEditable, reconcileProgressInvoiceMilestones, regularScenarios, regularScenarioState, saveLifecycleInvoice, taxCreditBalance, toChangeOrderSources, totalBilled, totalGrossBilled, trackedInvoiceFinancialLockReason, type ContractInvoice, type RegularScenarioId } from './lifecycle'
import { ChangeOrderEditor } from './change-orders/ChangeOrderEditor'
import { SelectItemsDialog } from './change-orders/SelectItemsDialog'
import { acceptedOrders, newChangeOrder, selectableChangeOrderLines, type ChangeOrder } from './change-orders/model'
import { ManageSchedule, OversizedMilestoneInvoiceConfirmation, StandardInvoiceConfirmation } from './schedule/ManageSchedule'
import { milestoneAmount } from './schedule/model'

type PrototypeScenario = 'regular' | 'retainage'
type PendingOversizedInvoice = { invoice: ProgressInvoice; lines: EstimateLine[]; milestoneName: string; plannedAmount: number; invoiceAmount: number }
const focusedRetainageState = (id: 'retainage-new' | 'retainage-held') => reconcileProgressInvoiceMilestones({ ...initialLifecycle(id), milestones: [] })
export function ProgressInvoicesPrototype({ onBack, scenario = 'regular' }: { onBack: () => void; scenario?: PrototypeScenario }) {
  const [state, setState] = useState(() => scenario === 'retainage' ? focusedRetainageState('retainage-new') : regularScenarioState('regular-no-invoices'))
  const [resetVersion, setResetVersion] = useState(0)
  const [creating, setCreating] = useState<{ milestoneId?: string; initialMethod?: 'partial' | 'items'; returnToChoice?: boolean } | null>(null)
  const [choosingInvoiceType, setChoosingInvoiceType] = useState(false)
  const [confirmStandard, setConfirmStandard] = useState(false)
  const [copyEditorOpen, setCopyEditorOpen] = useState(false)
  const [managing, setManaging] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const [releaseEditor, setReleaseEditor] = useState<{ invoice: RetainageReleaseInvoice; isNew: boolean } | null>(null)
  const [releasePreview, setReleasePreview] = useState<{ mode: 'pdf' | 'web'; invoice: RetainageReleaseInvoice } | null>(null)
  const [editor, setEditor] = useState<{ invoice: ProgressInvoice; lines: EstimateLine[]; previous: number; isNew: boolean } | null>(null)
  const [oversizedInvoice, setOversizedInvoice] = useState<PendingOversizedInvoice | null>(null)
  const [orderEditor, setOrderEditor] = useState<{ order: ChangeOrder; isNew: boolean } | null>(null)
  const [selecting, setSelecting] = useState<'estimate' | string | null>(null)
  const contractAmount = acceptedValue(state)
  const grossScope = grossContractScope(state)
  const grossInvoiced = totalGrossBilled(state)
  const lines = billingLines(state)
  const draft = hasDraft(state)
  const accepted = acceptedOrders(state.orders)
  const discountPool = contractDiscountPool(state)
  const remainingContract = Math.max(0, grossScope - grossInvoiced)
  const originalContractValue = acceptedValue({ ...state, orders: [] })
  const openOrder = state.orders.find(order => order.status === 'Draft' || order.status === 'Pending')
  const withheld = sum(state.invoices.filter(isPosted).map(invoiceRetainageWithheld))
  const { available: availableToRelease } = retainageReleaseMetrics(withheld, state.releases)
  const invoiceViews: ContractInvoice[] = state.invoices.map(invoice => ({ ...invoice, amounts: Object.fromEntries(Object.entries(invoiceAmounts(invoice, state.original)).map(([id, value]) => [id.includes(':') ? id : `estimate:${id}`, value])) }))
  const selectingSource = state.orders.find(order => order.id === selecting)
  const reservingOrders = state.orders.filter(order => ['Draft', 'Pending', 'Accepted'].includes(order.status))
  const unavailable = Object.fromEntries(reservingOrders.flatMap(order => order.lines.filter(line => selectingSource ? line.sourceChangeOrderId === selectingSource.id : !!line.sourceEstimateLineId).map(line => [selectingSource ? line.sourceChangeOrderLineId! : line.sourceEstimateLineId!, {
    orderId: order.id,
    message: order.status === 'Draft' || order.status === 'Pending' ? 'This item has an open Change Order.' : 'This item was removed by a Change Order.',
  }])))

  function clearTransientState() {
    setCreating(null); setChoosingInvoiceType(false); setConfirmStandard(false); setCopyEditorOpen(false); setManaging(false); setReleasing(false); setReleaseEditor(null); setReleasePreview(null); setEditor(null); setOversizedInvoice(null); setOrderEditor(null); setSelecting(null)
  }
  function selectRetainageScenario(next: 'retainage-new' | 'retainage-held') {
    setState(focusedRetainageState(next)); clearTransientState()
  }
  function selectRegularScenario(next: RegularScenarioId) {
    setState(regularScenarioState(next)); clearTransientState()
  }
  function resetCurrentScenario() {
    setState(scenario === 'retainage'
      ? focusedRetainageState(state.scenario as 'retainage-new' | 'retainage-held')
      : regularScenarioState(state.scenario as RegularScenarioId))
    clearTransientState()
    setResetVersion(version => version + 1)
  }
  function beginInvoice(milestoneId?: string) {
    const releaseAvailable = scenario === 'retainage' && withheld > 0 && availableToRelease > 0
    if (!state.accepted || state.standardInvoice || draft || (remainingContract <= 0 && !releaseAvailable)) return
    if (scenario === 'retainage') { setChoosingInvoiceType(true); return }
    if (!milestoneId && !state.invoices.some(invoice => invoice.status !== 'Canceled') && !accepted.length) setChoosingInvoiceType(true)
    else setCreating({ milestoneId })
  }
  function openInvoice(invoice: ProgressInvoice) {
    const saved = state.invoices.find(item => item.id === invoice.id) ?? invoice
    const position = state.invoices.findIndex(item => item.id === saved.id)
    const history = saved.status === 'Draft' ? state.invoices.filter(item => item.id !== saved.id) : state.invoices.slice(0, position)
    const context = { ...state, invoices: history }
    const currentLines = billingLines(context)
    const missing = (saved.lineSnapshot ?? []).filter(line => !currentLines.some(item => item.id === line.id))
    const viewLines = [...currentLines, ...missing].map(line => ({ ...line }))
    const amounts = invoiceAmounts(saved, state.original)
    const descriptions = Object.fromEntries((saved.lineIds ?? state.original.map(line => line.id)).map((id, index) => [id, saved.descriptions[index] ?? '']))
    setEditor({ invoice: { ...saved, lineIds: viewLines.map(line => line.id), lineAmounts: viewLines.map(line => amounts[line.id] ?? 0), descriptions: viewLines.map(line => descriptions[line.id] ?? line.description ?? '') }, lines: viewLines, previous: totalGrossBilled(context), isNew: false })
  }
  function createInvoice(amounts: number[], discount: number, milestone?: InvoiceMilestoneSelection) {
    const billable = lines.filter(line => line.kind === 'active')
    const mapped = Object.fromEntries(billable.map((line, index) => [line.id, amounts[index] ?? 0]))
    const invoice = draftInvoice(state, lines, lines.map(line => mapped[line.id] ?? 0), discount, milestone)
    const scheduledMilestone = milestone?.id ? state.milestones.find(item => item.id === milestone.id) : undefined
    const hasAssignedAmount = scheduledMilestone?.percentage !== undefined || scheduledMilestone?.plannedAmount !== undefined
    const plannedAmount = scheduledMilestone ? milestoneAmount(scheduledMilestone, contractAmount) : 0
    const invoiceAmount = Math.max(0, sum(invoice.lineAmounts) - invoice.discount)
    if (scheduledMilestone && hasAssignedAmount && invoiceAmount > plannedAmount + 0.005) {
      setOversizedInvoice({ invoice, lines, milestoneName: scheduledMilestone.name, plannedAmount, invoiceAmount })
      return
    }
    setCreating(null); setEditor({ invoice, lines, previous: grossInvoiced, isNew: true })
  }
  function saveInvoice(invoice: ProgressInvoice) {
    setState(current => saveLifecycleInvoice(current, invoice))
    setEditor(current => current ? { ...current, invoice, isNew: false } : null)
  }
  function beginChangeOrder(source = 'estimate') {
    if (scenario !== 'regular' || state.standardInvoice || !state.accepted) return
    setSelecting(source)
  }
  function createChangeOrder(ids: string[]) {
    const next = Math.max(0, ...state.orders.map(order => Number(order.id.split('-CO')[1]) || 0)) + 1
    setOrderEditor({ order: newChangeOrder(next, ids, selectingSource, toChangeOrderSources(state.original), state.costPlusPercent), isNew: true }); setSelecting(null)
  }
  function persistOrder(status: ChangeOrder['status']) {
    if (!orderEditor) return
    const order = { ...orderEditor.order, status }
    setState(current => ({ ...current, notice: '', orders: current.orders.some(item => item.id === order.id) ? current.orders.map(item => item.id === order.id ? order : item) : [...current.orders, order] }))
    setOrderEditor({ order, isNew: false })
  }
  function acceptOrder() {
    if (!orderEditor) return
    const next = acceptSavedChangeOrder(state, orderEditor.order.id)
    setState(next); setOrderEditor({ order: next.orders.find(order => order.id === orderEditor.order.id)!, isNew: false })
  }
  function acceptEstimate() {
    if (state.accepted || state.acceptanceProcessed) return
    let next = { ...state, accepted: true, acceptanceProcessed: true, notice: '' }
    const first = state.milestones[0]
    if (state.onAcceptance !== 'nothing' && !first?.invoiceId) {
      const amount = grossScope * (first?.percentage ?? 0) / 100
      if (!first || amount <= 0 || amount > remainingContract) next.notice = 'The first milestone invoice was not created because the milestone has no valid amount.'
      else if (draft) next.notice = 'The first milestone invoice was not created because a draft invoice already exists for this contract.'
      else {
        const scheduledDiscount = contractDiscountPool(state) * (first.percentage ?? 0) / 100
        const invoice = draftInvoice(state, lines, allocate(lines, amount), scheduledDiscount, first)
        next = { ...next, ...saveLifecycleInvoice(next, invoice) }
      }
    }
    setState(next)
  }
  const scheduleMilestones = state.milestones.map(milestone => ({ ...milestone, invoiceStatus: state.invoices.find(invoice => invoice.id === milestone.invoiceId)?.status }))
  const schedule = state.milestones.length === 0 ? <Card title="Payment schedule" actions={<Button variant="secondary" disabled={!!state.standardInvoice} onClick={() => setManaging(true)}>Create schedule</Button>}><p>No payment schedule. Add milestones when you know how you plan to bill this estimate.</p></Card> : <PaymentScheduleCard contractValue={contractAmount} milestones={scheduleMilestones}
    completionSummary={state.retainageEnabled ? `${state.milestones.filter(item => item.invoiceId && state.invoices.some(invoice => invoice.id === item.invoiceId && isPosted(invoice))).length} of ${state.milestones.length} milestones invoiced` : undefined}
    action={<Button variant="secondary" disabled={!!state.standardInvoice} onClick={() => setManaging(true)}>{state.milestones.length ? 'Manage milestones' : 'Create schedule'}</Button>}
    createDisabled={!state.accepted || !!state.standardInvoice || draft || remainingContract <= 0} createDisabledReason={draft ? 'A draft invoice already exists for this contract' : undefined}
    onCreateInvoice={milestoneId => beginInvoice(milestoneId)} onOpenInvoice={id => { const invoice = state.invoices.find(item => item.id === id); if (invoice) openInvoice(invoice) }}/>

  return <>
    <EstimateEditor key={`${state.scenario}-${resetVersion}`} state={state} mode={scenario} initialSection="details" scenarioControl={<>
      {scenario === 'retainage'
        ? <label>Scenario<select aria-label="Retainage scenario" value={state.scenario} onChange={event => selectRetainageScenario(event.target.value as 'retainage-new' | 'retainage-held')}><option value="retainage-new">No invoice</option><option value="retainage-held">With invoices</option></select></label>
        : <label>Scenario<select aria-label="Regular estimate scenario" value={state.scenario} onChange={event => selectRegularScenario(event.target.value as RegularScenarioId)}>{regularScenarios.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>}
      <Button variant="neutral" onClick={resetCurrentScenario}>Reset</Button>
    </>} onClose={onBack} onCreateInvoice={() => beginInvoice()} onCreateChangeOrder={() => beginChangeOrder()} onOpenChangeOrder={order => setOrderEditor({ order: structuredClone(order), isNew: false })} onOpenInvoice={openInvoice} onOpenStandardInvoice={() => setCopyEditorOpen(true)} onOpenReleaseInvoice={invoice => setReleaseEditor({ invoice: { ...invoice }, isNew: false })} onCreateRetainageRelease={() => setReleasing(true)} onRetainageDefaultChange={retainageDefault => setState(current => ({ ...current, retainageDefault }))} onAcceptEstimate={acceptEstimate} paymentScheduleContent={schedule}/>
    {orderEditor && <ChangeOrderEditor notice={state.notice} key={orderEditor.order.id} originalContractValue={originalContractValue} contractValue={contractAmount} totalInvoiced={totalBilled(state)} reservedByDraft={draftReservedValue(state)} contractDiscountPool={discountPool} taxCreditBalance={taxCreditBalance(state)} invoiceDisabled={draft || remainingContract <= 0} order={orderEditor.order} orders={state.orders} invoices={invoiceViews} openOrder={openOrder} isPersisted={!orderEditor.isNew} createChangeOrderDisabled={orderEditor.isNew} onCreateChangeOrder={() => beginChangeOrder(orderEditor.order.id)} onCreateInvoice={() => beginInvoice()} onOpenChangeOrder={order => setOrderEditor({ order: structuredClone(order), isNew: false })} onOpenEstimate={() => setOrderEditor(null)} onOpenInvoice={openInvoice} onChange={order => setOrderEditor(current => current ? { ...current, order } : null)} onClose={() => setOrderEditor(null)} onDelete={() => { setState(current => ({ ...current, orders: current.orders.filter(order => order.id !== orderEditor.order.id) })); setOrderEditor(null) }} onSave={() => persistOrder(orderEditor.isNew ? 'Draft' : orderEditor.order.status)} onSend={() => persistOrder('Pending')} onAccept={acceptOrder} onDecline={() => persistOrder('Declined')} onCancelStatus={() => persistOrder('Canceled')}/>} 
    {selecting && <SelectItemsDialog items={selectingSource ? selectableChangeOrderLines(selectingSource) : toChangeOrderSources(state.original)} sourceLabel={selectingSource ? `CO #${selectingSource.id}` : 'Estimate'} unavailableByItemId={unavailable} onOpenChangeOrder={id => { setSelecting(null); const order = state.orders.find(item => item.id === id); if (order) setOrderEditor({ order: structuredClone(order), isNew: false }) }} onCancel={() => setSelecting(null)} onCreate={createChangeOrder}/>}
    {choosingInvoiceType && <InvoiceTypeDialog showStandard disableStandard={scenario === 'retainage'} showProgress={remainingContract > 0} showRetainageRelease={scenario === 'retainage' && withheld > 0 && availableToRelease > 0} onCancel={() => setChoosingInvoiceType(false)} onContinue={type => { setChoosingInvoiceType(false); if (type === 'retainage-release') setReleasing(true); else if (type === 'standard') { if (state.milestones.length) setConfirmStandard(true); else setCopyEditorOpen(true) } else setCreating({ initialMethod: 'partial', returnToChoice: true }) }}/>} 
    {confirmStandard && <StandardInvoiceConfirmation onCancel={() => { setConfirmStandard(false); setChoosingInvoiceType(true) }} onConfirm={() => { setState(current => ({ ...current, milestones: [] })); setConfirmStandard(false); setCopyEditorOpen(true) }}/>}
    {creating && <CreationDialog lines={lines.filter(line => line.kind === 'active')} contractMode={accepted.length > 0} contractValue={grossScope} contractRemaining={remainingContract} hasPreviousInvoices={state.invoices.some(isPosted) || accepted.length > 0} discountPool={discountPool > 0 ? { original: discountPool, remaining: availableContractDiscount(state), originalGrossScope: grossScope } : undefined} milestones={state.milestones.map((milestone, index) => ({ ...milestone, sequence: index + 1 }))} initialMilestoneId={creating.milestoneId} initialMethod={creating.initialMethod} onCancel={() => { const returnToChoice = creating.returnToChoice; setCreating(null); if (returnToChoice) setChoosingInvoiceType(true) }} onCreate={createInvoice}/>}
    {oversizedInvoice && <OversizedMilestoneInvoiceConfirmation milestoneName={oversizedInvoice.milestoneName} plannedAmount={oversizedInvoice.plannedAmount} invoiceAmount={oversizedInvoice.invoiceAmount} onBack={() => setOversizedInvoice(null)} onConfirm={() => { setCreating(null); setEditor({ invoice: oversizedInvoice.invoice, lines: oversizedInvoice.lines, previous: grossInvoiced, isNew: true }); setOversizedInvoice(null) }}/>} 
    {editor && <InvoiceEditor key={editor.invoice.id} lines={editor.lines} invoice={editor.invoice} priorInvoices={editor.isNew ? state.invoices : state.invoices.slice(0, Math.max(0, state.invoices.findIndex(invoice => invoice.id === editor.invoice.id)))} isNew={editor.isNew} financialEditingAllowed={editor.isNew || isTrackedInvoiceFinanciallyEditable(state, editor.invoice.id)} financialLockReason={trackedInvoiceFinancialLockReason(state, editor.invoice.id)} contractValue={grossScope} contractPreviouslyBilled={editor.previous} discountLimit={discountPool > 0 ? availableContractDiscount(state, editor.invoice.id) : undefined} taxCreditLimit={taxCreditBalance(state, editor.invoice.id)} retainageEnabled={state.retainageEnabled} onClose={() => setEditor(null)} onSave={saveInvoice}/>}
    {copyEditorOpen && <CopyInvoiceEditor sourceLines={state.original} invoice={state.standardInvoice ?? undefined} defaultDiscount={String(state.discount)} defaultTaxRate={String(state.taxRate)} costPlusPercent={state.costPlusPercent} onClose={() => setCopyEditorOpen(false)} onSave={standardInvoice => setState(current => ({ ...current, standardInvoice, milestones: [] }))}/>}
    {managing && <ManageSchedule contractValue={contractAmount} milestones={state.milestones} invoices={state.invoices} onAcceptance={state.onAcceptance} accepted={state.accepted} onCancel={() => setManaging(false)} onSave={(milestones, onAcceptance, invoiceNameUpdates) => { const names = new Map(invoiceNameUpdates.map(update => [update.id, update.name])); setState(current => ({ ...current, milestones, onAcceptance, invoices: current.invoices.map(invoice => names.has(invoice.id) ? { ...invoice, milestoneName: names.get(invoice.id) } : invoice) })); setManaging(false) }}/>} 
    {releasing && <RetainageReleaseDialog held={availableToRelease} onCancel={() => setReleasing(false)} onCreate={amount => { const id = String(Math.max(100600, ...state.invoices.map(item => Number(item.id)), ...state.releases.map(item => Number(item.id))) + 1); setReleasing(false); setReleaseEditor({ invoice: { id, status: 'Draft', amount, invoiceDate: '2026-09-10', dueDate: '2026-10-10', availableRetainage: availableToRelease, estimateId: '1008', amountPaid: 0, note: 'Release of previously withheld retainage.' }, isNew: true }) }}/>} 
    {releaseEditor && <RetainageReleaseEditor invoice={releaseEditor.invoice} estimateId="1008" isNew={releaseEditor.isNew} heldAtCreation={releaseEditor.invoice.availableRetainage ?? availableToRelease + (releaseEditor.invoice.status === 'Draft' ? releaseEditor.invoice.amount : 0)} onClose={() => setReleaseEditor(null)} onSave={invoice => { setState(current => ({ ...current, releases: current.releases.some(item => item.id === invoice.id) ? current.releases.map(item => item.id === invoice.id ? invoice : item) : [...current.releases, invoice] })); setReleaseEditor({ invoice, isNew: false }) }} onDelete={releaseEditor.invoice.status === 'Draft' ? () => { setState(current => ({ ...current, releases: current.releases.filter(invoice => invoice.id !== releaseEditor.invoice.id) })); setReleaseEditor(null) } : undefined} onPreview={(mode, invoice) => setReleasePreview({ mode, invoice })}/>}
    {releasePreview && <RetainageInvoicePreview mode={releasePreview.mode} invoice={releasePreview.invoice} onClose={() => setReleasePreview(null)}/>}
  </>
}
