import { NavLink } from 'react-router-dom'
import {
  Users,
  Stethoscope,
  Building2,
  ClipboardList,
  CalendarClock,
  Activity,
  Menu,
  X,
  Home,
} from 'lucide-react'
import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/pacientes', label: 'Pacientes', icon: Users },
  { to: '/medicos', label: 'Médicos', icon: Stethoscope },
  { to: '/estabelecimentos', label: 'Estabelecimentos', icon: Building2 },
  { to: '/servicos', label: 'Serviços', icon: ClipboardList },
  { to: '/agendamentos', label: 'Agendamentos', icon: CalendarClock },
]

function NavItem3D({ to, label, icon: Icon, onClick }: {
  to: string; label: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  onClick?: () => void
}) {
  const ref = useRef<HTMLAnchorElement>(null)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 })
  const [hov, setHov] = useState(false)

  function onMove(e: React.MouseEvent<HTMLAnchorElement>) {
    const el = ref.current; if (!el) return
    const { left, top, width, height } = el.getBoundingClientRect()
    const px = (e.clientX - left) / width
    const py = (e.clientY - top) / height
    setTilt({ rx: (py - 0.5) * -12, ry: (px - 0.5) * 12 })
  }

  return (
    <div style={{ perspective: '500px' }}>
      <NavLink
        ref={ref}
        to={to}
        onClick={onClick}
        onMouseMove={onMove}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => { setHov(false); setTilt({ rx: 0, ry: 0 }) }}
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(${hov ? 1.04 : 1})`,
          transition: hov ? 'transform 0.07s linear' : 'transform 0.5s cubic-bezier(0.23,1,0.32,1)',
          boxShadow: hov ? '0 6px 18px rgba(0,0,0,0.3)' : 'none',
        }}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-200',
            isActive
              ? 'bg-[hsl(184_80%_45%/0.15)] text-[hsl(184,80%,65%)]'
              : 'text-[hsl(185,59%,75%)] hover:bg-[hsl(190,100%,18%)] hover:text-[hsl(185,59%,89%)]',
          )
        }
      >
        <Icon size={18} strokeWidth={1.75} />
        {label}
      </NavLink>
    </div>
  )
}

function LogoTilt() {
  const ref = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 })
  const [hov, setHov] = useState(false)

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current; if (!el) return
    const { left, top, width, height } = el.getBoundingClientRect()
    const px = (e.clientX - left) / width
    const py = (e.clientY - top) / height
    setTilt({ rx: (py - 0.5) * -20, ry: (px - 0.5) * 20 })
  }

  return (
    <div style={{ perspective: '400px' }}>
      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => { setHov(false); setTilt({ rx: 0, ry: 0 }) }}
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(${hov ? 1.08 : 1})`,
          transition: hov ? 'transform 0.07s linear' : 'transform 0.5s cubic-bezier(0.23,1,0.32,1)',
        }}
        className="flex items-center gap-3 cursor-pointer"
      >
        <div className="bg-[hsl(184,80%,25%)] p-2 rounded-xl" style={{ transform: hov ? 'translateZ(12px)' : 'translateZ(0)', transition: 'transform 0.3s ease' }}>
          <Activity className="h-5 w-5 text-white" />
        </div>
        <div style={{ transform: hov ? 'translateZ(8px)' : 'translateZ(0)', transition: 'transform 0.3s ease' }}>
          <p className="text-white font-extrabold text-base tracking-tight leading-none">SGSM</p>
          <p className="text-[hsl(185,59%,65%)] text-xs font-medium mt-0.5">Sistema Médico</p>
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  const navContent = (
    <nav className="flex flex-col gap-1 p-3">
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavItem3D key={to} to={to} label={label} icon={Icon} onClick={() => setMobileOpen(false)} />
      ))}
    </nav>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 min-h-screen bg-[hsl(190,100%,12%)] border-r border-[hsl(190,100%,20%)]">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-[hsl(190,100%,20%)]">
          <LogoTilt />
        </div>

        {/* Nav */}
        {navContent}

        {/* Footer */}
        <div className="mt-auto p-4 border-t border-[hsl(190,100%,20%)]">
          <p className="text-[hsl(185,59%,50%)] text-xs text-center">
            localhost:8080
          </p>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-[hsl(190,100%,12%)] border-b border-[hsl(190,100%,20%)]">
        <div className="flex items-center gap-2">
          <div className="bg-[hsl(184,80%,25%)] p-1.5 rounded-lg">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <span className="text-white font-extrabold text-base tracking-tight">SGSM</span>
        </div>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="text-[hsl(185,59%,75%)] p-1.5 rounded-lg hover:bg-[hsl(190,100%,18%)] transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside
            className="absolute left-0 top-0 bottom-0 w-64 bg-[hsl(190,100%,12%)] border-r border-[hsl(190,100%,20%)] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-[hsl(190,100%,20%)]">
              <LogoTilt />
            </div>
            {navContent}
          </aside>
        </div>
      )}
    </>
  )
}
