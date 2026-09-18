import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { IconBriefcase, IconCalendarEvent, IconFileInvoice, IconFileText, IconSearch, IconShoppingCart, IconUser, IconX } from '@tabler/icons-react'
import { Button, IconButton, Modal } from '../../shared/ui'
import { entities, filterResults, matchRanges, minimumQueryLength, type SearchResult } from './search'
import s from './GlobalSearch.module.css'

const icons = { Customers: IconUser, Jobs: IconBriefcase, Invoices: IconFileInvoice, Estimates: IconFileText, 'Purchase Orders': IconShoppingCart, Appointments: IconCalendarEvent }

function Highlight({ text, query, phone = false }: { text: string; query: string; phone?: boolean }) {
  const pieces: ReactNode[] = []
  let cursor = 0
  for (const [start, end] of matchRanges(text, query, phone)) {
    pieces.push(text.slice(cursor, start), <mark key={start}>{text.slice(start, end)}</mark>)
    cursor = end
  }
  pieces.push(text.slice(cursor))
  return <>{pieces}</>
}

export function GlobalSearch() {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const rows = useRef(new Map<string, HTMLDivElement>())
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<string | null>(null)
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const groups = filterResults(query)
  const results = groups.flatMap(group => group.results)
  const activeResult = results.find(result => result.id === active)
  const close = () => { setOpen(false); setActive(null) }
  const openResult = (result: SearchResult) => { close(); setSelected(result) }

  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) { setOpen(false); setActive(null) }
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [])

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      const target = event.target
      const otherEditable = target instanceof HTMLElement && target !== input.current && (
        target.isContentEditable || target.closest('input, textarea, [role="textbox"]') !== null
      )
      if (event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k'
        && !event.isComposing && !otherEditable && !document.querySelector('dialog[open]')) {
        event.preventDefault()
        input.current?.focus()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', shortcut)
    return () => document.removeEventListener('keydown', shortcut)
  }, [])

  return <div ref={root} className={s.root} onKeyDown={event => {
    if (event.key === 'Escape' && !selected) { event.preventDefault(); close() }
  }} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) close()
  }}>
    <div className={s.field}>
      <IconSearch size={21} stroke={1.8} aria-hidden="true" />
      <input ref={input} aria-label="Global search" role="combobox" aria-autocomplete="list" aria-expanded={open}
        aria-controls={open ? `${id}-results` : undefined} aria-activedescendant={open && activeResult ? `${id}-${activeResult.id}` : undefined}
        autoComplete="off" placeholder="Search..." value={query}
        onFocus={() => { if (!selected) setOpen(true) }} onClick={() => setOpen(true)}
        onChange={event => { setQuery(event.target.value); setActive(null); setOpen(true) }}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing) return
          if (event.key === 'Escape') { event.preventDefault(); close(); return }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            if (!results.length) return
            event.preventDefault()
            setOpen(true)
            const current = results.findIndex(result => result.id === active)
            const next = current < 0 ? (event.key === 'ArrowDown' ? 0 : results.length - 1)
              : Math.max(0, Math.min(results.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1)))
            setActive(results[next].id)
            rows.current.get(results[next].id)?.scrollIntoView({ block: 'nearest' })
          }
          if (event.key === 'Enter' && open && activeResult) { event.preventDefault(); openResult(activeResult) }
        }} />
      {query && <IconButton label="Clear search" onMouseDown={event => event.preventDefault()} onClick={() => { setQuery(''); setActive(null); input.current?.focus(); setOpen(true) }}><IconX size={18}/></IconButton>}
      {!query && <kbd title="Ctrl K">Ctrl K</kbd>}
    </div>
    {open && <div className={s.dropdown}>
      <div id={`${id}-results`} role="listbox" aria-label="Search results">
        {query.trim().length < minimumQueryLength ? <div className={s.empty}>Type 3 characters to search</div>
          : !results.length ? <div className={s.empty}>No results found</div>
          : groups.map(({ entity, results: groupResults }) => {
            const Icon = icons[entity]
            return <div role="group" aria-labelledby={`${id}-group-${entities.indexOf(entity)}`} className={s.group} key={entity}>
              <div id={`${id}-group-${entities.indexOf(entity)}`} className={s.heading}>{entity} ({groupResults.length})</div>
              {groupResults.map(result => <div key={result.id} id={`${id}-${result.id}`} role="option" aria-selected={active === result.id}
                ref={element => { if (element) rows.current.set(result.id, element); else rows.current.delete(result.id) }}
                className={`${s.result} ${active === result.id ? s.active : ''}`}
                onPointerMove={() => setActive(result.id)} onMouseDown={event => event.preventDefault()} onClick={() => openResult(result)}>
                <span className={`${s.icon} ${s[`entity${entities.indexOf(entity)}`]}`}><Icon size={23} stroke={1.8} aria-hidden="true"/></span>
                <div className={s.text}>
                  <div className={s.primary}><Highlight text={result.primary} query={query}/></div>
                  {result.excerpt && matchRanges(result.excerpt, query).length > 0 && <div className={s.secondary}><Highlight text={result.excerpt} query={query}/></div>}
                  <div className={s.secondary}><Highlight text={result.secondary} query={query}/>{result.phone && <> • <Highlight text={result.phone} query={query} phone/></>}</div>
                </div>
                {result.detail && <div className={s.detail}><Highlight text={result.detail} query={query}/>{result.subdetail && <div className={s.secondary}><Highlight text={result.subdetail} query={query}/></div>}</div>}
              </div>)}
            </div>
          })}
      </div>
    </div>}
    <span className={s.srOnly} role="status">{open && query.trim().length >= minimumQueryLength ? `${results.length} results found` : ''}</span>
    <Modal open={selected !== null} title="Result opened" onClose={() => { setSelected(null); close() }}
      footer={<Button onClick={() => { setSelected(null); close() }}>Close</Button>}>
      {selected && <div className={s.opened}><strong>{selected.openedLabel}</strong><p>{selected.primary}</p><p>{selected.secondary}</p>{selected.detail && <p>{selected.detail}{selected.subdetail && ` • ${selected.subdetail}`}</p>}</div>}
    </Modal>
  </div>
}
