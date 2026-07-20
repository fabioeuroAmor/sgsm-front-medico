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

const glowByVariant: Record<string, string> = {
  primary:   '0 8px 24px rgba(0,0,0,0.15), var(--shadow-glow-primary)',
  secondary: '0 8px 24px rgba(0,0,0,0.15), var(--shadow-glow-primary)',
  accent:    '0 8px 24px rgba(0,0,0,0.15), var(--shadow-glow-accent)',
  ghost:     '0 8px 20px rgba(0,0,0,0.10)',
  outline:   '0 8px 20px rgba(0,0,0,0.10)',
  danger:    '0 8px 20px rgba(239,68,68,0.20)',
}

export function Button({
  className, variant, size, style,
  onMouseMove, onMouseEnter, onMouseLeave,
  ...props
}: ButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 })
  const [hov, setHov] = useState(false)
  const [pressed, setPressed] = useState(false)

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
    setPressed(false)
    setTilt({ rx: 0, ry: 0 })
    onMouseLeave?.(e)
  }

  const scale = pressed ? 0.97 : hov ? 1.06 : 1

  const tiltStyle: CSSProperties = {
    transformStyle: 'preserve-3d',
    transform: `perspective(400px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(${scale})`,
    transition: pressed
      ? 'transform 0.08s cubic-bezier(0.34,1.56,0.64,1)'
      : hov
        ? 'transform 0.07s linear'
        : 'transform 0.5s cubic-bezier(0.23,1,0.32,1)',
    boxShadow: hov
      ? (glowByVariant[variant ?? 'primary'] ?? '0 8px 24px rgba(0,0,0,0.15)')
      : undefined,
    ...style,
  }

  return (
    <button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={tiltStyle}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
