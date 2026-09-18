let holders = 0
let initialState = false

type SurfaceEntry = {
  element: HTMLElement
  previousFocus: HTMLElement | null
  onEscape?: () => void
}

const surfaces: SurfaceEntry[] = []
const originalInert = new Map<HTMLElement, boolean>()

const focusableSelector = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function refreshSurfaces() {
  const top = surfaces.at(-1)?.element
  for (const child of Array.from(document.body.children)) {
    if (!(child instanceof HTMLElement)) continue
    if (!originalInert.has(child)) originalInert.set(child, child.inert)
    child.inert = top ? child !== top : originalInert.get(child) ?? false
  }
  if (!top) originalInert.clear()
}

function trapSurfaceFocus(event: KeyboardEvent) {
  if (document.querySelector('dialog:modal')) return
  const top = surfaces.at(-1)
  if (!top) return
  if (event.key === 'Escape' && top.onEscape) {
    event.preventDefault()
    top.onEscape()
    return
  }
  if (event.key !== 'Tab') return
  const focusable = Array.from(top.element.querySelectorAll<HTMLElement>(focusableSelector))
    .filter(element => !element.hidden && element.getClientRects().length > 0)
  if (!focusable.length) {
    event.preventDefault()
    top.element.focus()
    return
  }
  const first = focusable[0]
  const last = focusable.at(-1)!
  const active = document.activeElement
  if (event.shiftKey && (active === first || !top.element.contains(active))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (active === last || !top.element.contains(active))) {
    event.preventDefault()
    first.focus()
  }
}

export function acquireAppRootInert() {
  const root = document.getElementById('root')
  if (!root) return () => {}

  if (holders === 0) initialState = root.inert
  holders += 1
  root.inert = true

  let released = false
  return () => {
    if (released) return
    released = true
    holders = Math.max(0, holders - 1)
    if (holders === 0) root.inert = initialState
  }
}

export function acquireTopSurface(element: HTMLElement, onEscape?: () => void) {
  if (surfaces.length === 0) document.addEventListener('keydown', trapSurfaceFocus)
  const entry: SurfaceEntry = {
    element,
    previousFocus: document.activeElement as HTMLElement | null,
    onEscape,
  }
  surfaces.push(entry)
  refreshSurfaces()
  let released = false
  return () => {
    if (released) return
    released = true
    const index = surfaces.indexOf(entry)
    if (index >= 0) surfaces.splice(index, 1)
    refreshSurfaces()
    if (surfaces.length === 0) document.removeEventListener('keydown', trapSurfaceFocus)
    const activeSurface = surfaces.at(-1)?.element
    if (entry.previousFocus?.isConnected && (!activeSurface || activeSurface.contains(entry.previousFocus))) {
      entry.previousFocus.focus()
    } else {
      const fallback = activeSurface?.querySelector<HTMLElement>(focusableSelector)
      fallback?.focus()
    }
  }
}
