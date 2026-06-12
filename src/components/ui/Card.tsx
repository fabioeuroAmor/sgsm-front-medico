import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
}

export function Card({ className, hover, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card p-5 shadow-sm',
        hover && 'transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer',
        className,
      )}
      {...props}
    />
  )
}
