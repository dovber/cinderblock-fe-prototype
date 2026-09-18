type Props = { size?: number; className?: string }

export function ReplaceIcon({ size = 18, className }: Props) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 3m0 2a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2h-4a2 2 0 0 1 -2 -2z"/>
    <path d="M13 7h3a2 2 0 0 1 2 2v8"/>
    <path d="M16 15l2 2l2 -2"/>
    <path d="M11 17h-3a2 2 0 0 1 -2 -2v-4"/>
    <path d="M8 13l-2 -2l-2 2"/>
  </svg>
}
