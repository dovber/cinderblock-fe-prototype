import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Eye, MoreVertical, Send, X } from 'lucide-react'
import { Button, IconButton, SplitButton } from './components'
import { acquireTopSurface } from './inert'
import s from './EstimateSurface.module.css'

type Section = { id: string; label: string; content: ReactNode }
export function EstimateSurface({ estimateId, scenarioControl, sections, initialSection = 'details', focused = false, showHeaderActions = true, onClose }: { estimateId: string; scenarioControl?: ReactNode; sections: Section[]; initialSection?: string; focused?: boolean; showHeaderActions?: boolean; onClose: () => void }) {
  const closeButton = useRef<HTMLButtonElement>(null)
  const viewport = useRef<HTMLDivElement>(null)
  const surface = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])
  const scrollTo = (id: string) => {
    const area = viewport.current
    const target = area?.querySelector<HTMLElement>(`[data-estimate-section="${id}"]`)
    if (area && target) area.scrollTop += target.getBoundingClientRect().top - area.getBoundingClientRect().top - 16
  }
  useEffect(() => {
    const release = acquireTopSurface(surface.current!, () => closeRef.current())
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButton.current?.focus()
    scrollTo(initialSection)
    return () => { release(); document.body.style.overflow = overflow }
  }, [initialSection])
  return createPortal(<div ref={surface} className={s.estimateEditor} role="main" aria-label="Estimate editor" tabIndex={-1}>
    <header className={s.estimateEditorHeader}>
      <div className={s.editorTitle}><button ref={closeButton} type="button" aria-label="Close estimate" className={s.closeEditor} onClick={onClose}><X size={22}/></button><div><h1>Estimate #{estimateId}</h1><p>Job #1004 Kitchen Installation</p></div></div>
      {(showHeaderActions || scenarioControl) && <div className={s.estimateHeaderActions}>{scenarioControl && <div className={s.scenario}>{scenarioControl}</div>}{showHeaderActions && <><Button variant="text" icon={<Eye size={18}/>}>Preview</Button><SplitButton variant="secondary"><Send size={17}/>Send estimate</SplitButton><SplitButton disabled>Save changes</SplitButton><IconButton label="More estimate actions"><MoreVertical size={20}/></IconButton></>}</div>}
    </header>
    <div className={`${s.estimateBody} ${focused ? s.focusedBody : ''}`}><main className={s.estimateMain}>
      <nav className={s.estimateTabs} aria-label="Estimate sections">{sections.map(section => section.content === null || section.content === undefined
        ? <span key={section.id} aria-current={section.id === initialSection ? 'page' : undefined}>{section.label}</span>
        : <button key={section.id} aria-current={section.id === initialSection ? 'page' : undefined} onClick={() => scrollTo(section.id)}>{section.label}</button>)}</nav>
      <div ref={viewport} className={s.estimateScroll}>{sections.map(section => <div key={section.id} data-estimate-section={section.id}>{section.content}</div>)}</div>
    </main></div>
  </div>, document.body)
}

export function EstimateTextSection({ title, children }: { title: string; children?: ReactNode }) {
  return <section className={s.estimateTextCard}><h2>{title}</h2>{children}</section>
}
