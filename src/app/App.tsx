import { useState } from 'react'
import { ShellPreview } from '../prototypes/shell-preview'
import { ProgressInvoicesPrototype } from '../prototypes/progress-invoices'
import { GlobalSearch } from '../prototypes/global-search'

export function App() {
  const [activePrototype, setActivePrototype] = useState<'regular' | 'retainage' | null>(null)
  return <ShellPreview
    headerSearch={<GlobalSearch />}
    onOpenRegularEstimate={() => setActivePrototype('regular')}
    onOpenRetainageEstimate={() => setActivePrototype('retainage')}
    onNavigate={() => setActivePrototype(null)}
    estimatesContent={activePrototype
      ? <ProgressInvoicesPrototype scenario={activePrototype} onBack={() => setActivePrototype(null)} />
      : undefined}
  />
}
