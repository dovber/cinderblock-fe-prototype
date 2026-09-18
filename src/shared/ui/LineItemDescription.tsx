export function LineItemDescription({ description, className }: { description?: string; className?: string }) {
  const content = description?.trim()
  return <span className={className} data-placeholder={!content || undefined}>{content || 'Add description'}</span>
}
