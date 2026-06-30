import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { useRef, useState, type ButtonHTMLAttributes, type CSSProperties } from 'react'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/90',
        ghost:
          'text-foreground/70 hover:bg-muted hover:text-foreground',
        danger:
          'bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground',
        outline:
          'border border-border bg-background hover:bg-muted text-foreground',
        accent:
          'bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4',
        lg: 'h-11 px-6 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export { buttonVariants }

export function Button({
  className, variant, size, style,
  onMouseMove, onMouseEnter, onMouseLeave,
  ...props
}: ButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 })
  const [hov, setHov] = useState(false)

  function handleMouseMove(e: React.MouseEvent<HTMLButtonElement>) {
    const el = ref.current; if (!el) return
    const { left, top, width, height } = el.getBoundingClientRect()
    const px = (e.clientX - left) / width
    const py = (e.clientY - top) / height
    setTilt({ rx: (py - 0.5) * -16, ry: (px - 0.5) * 16 })
    onMouseMove?.(e)
  }

  function handleMouseEnter(e: React.MouseEvent<HTMLButtonElement>) {
    setHov(true)
    onMouseEnter?.(e)
  }

  function handleMouseLeave(e: React.MouseEvent<HTMLButtonElement>) {
    setHov(false)
    setTilt({ rx: 0, ry: 0 })
    onMouseLeave?.(e)
  }

  const tiltStyle: CSSProperties = {
    transformStyle: 'preserve-3d',
    transform: `perspective(400px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(${hov ? 1.06 : 1})`,
    transition: hov
      ? 'transform 0.07s linear'
      : 'transform 0.5s cubic-bezier(0.23,1,0.32,1)',
    boxShadow: hov
      ? '0 12px 28px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.12)'
      : undefined,
    ...style,
  }

  return (
    <button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={tiltStyle}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
