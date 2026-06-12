import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: React.ReactNode
}

export function EmptyState({
  title = 'Nenhum resultado encontrado',
  description = 'Tente ajustar os filtros ou cadastre um novo item.',
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        {icon ?? <Inbox size={24} strokeWidth={1.5} />}
      </div>
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>
      </div>
    </div>
  )
}
