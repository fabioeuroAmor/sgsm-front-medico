import { useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import type { MotionValue } from 'framer-motion'
import type { ComponentType, CSSProperties } from 'react'
import {
  Activity, Users, Stethoscope, CalendarClock, ArrowRight,
  HeartPulse, Building2, ClipboardList, MessageSquare,
  Star, Zap, Shield, ChevronRight, Brain, Sparkles, Database,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/Button'

// ─── Types ────────────────────────────────────────────────────────────────────

type IconComp = ComponentType<{ style?: CSSProperties; className?: string }>

interface FloaterDef {
  Icon: IconComp
  x: string
  y: string
  size: number
  delay: number
}

interface OrbDef {
  color: string
  size: number
  x: string
  y: string
  blur: number
  opacity: number
  duration: number
}

interface SceneDef {
  id: string
  eyebrow: string
  title: string
  body: string
  tags: string[]
  accent: string
  bgColor: string
  bgImage?: string
  orbs: OrbDef[]
  floaters: FloaterDef[]
  CenterIcon: IconComp
  cta?: boolean
}

// ─── Scene data ────────────────────────────────────────────────────────────────

const SCENES: SceneDef[] = [
  {
    id: 'hero',
    eyebrow: 'Bem-vindo ao',
    title: 'SGSM Médico',
    body: 'Uma plataforma completa para gestão em saúde. Role para voar pelo mundo do sistema.',
    tags: ['Moderno', 'Integrado', 'Completo'],
    accent: '#52B788',
    bgColor: '#02282B',
    bgImage: '/medico-3d.jpg',
    orbs: [
      { color: '#0D7377', size: 700, x: '50%',  y: '40%',  blur: 120, opacity: 0.9,  duration: 8 },
      { color: '#52B788', size: 400, x: '20%',  y: '70%',  blur: 100, opacity: 0.45, duration: 6 },
      { color: '#004D5C', size: 500, x: '80%',  y: '25%',  blur: 110, opacity: 0.6,  duration: 10 },
      { color: '#0A4A4E', size: 600, x: '60%',  y: '80%',  blur: 130, opacity: 0.5,  duration: 7 },
    ],
    CenterIcon: Activity,
    floaters: [
      { Icon: HeartPulse, x: '8%',  y: '16%', size: 48, delay: 0.0 },
      { Icon: Star,       x: '84%', y: '20%', size: 26, delay: 0.5 },
      { Icon: Shield,     x: '76%', y: '68%', size: 34, delay: 0.8 },
      { Icon: Zap,        x: '14%', y: '72%', size: 30, delay: 0.3 },
    ],
  },
  {
    id: 'pacientes',
    eyebrow: 'Módulo 1',
    title: 'Gestão de Pacientes',
    body: 'Cadastro com CPF mascarado, endereço automático via ViaCEP, histórico completo e controle de status.',
    tags: ['ViaCEP', 'CPF', 'Histórico'],
    accent: '#D4F1F4',
    bgColor: '#022A2C',
    orbs: [
      { color: '#52B788', size: 650, x: '30%',  y: '45%',  blur: 130, opacity: 0.75, duration: 9 },
      { color: '#0D7377', size: 450, x: '75%',  y: '30%',  blur: 100, opacity: 0.6,  duration: 7 },
      { color: '#D4F1F4', size: 300, x: '60%',  y: '75%',  blur: 90,  opacity: 0.2,  duration: 5 },
      { color: '#004D5C', size: 500, x: '15%',  y: '70%',  blur: 120, opacity: 0.5,  duration: 11 },
    ],
    CenterIcon: Users,
    floaters: [
      { Icon: Users,   x: '9%',  y: '15%', size: 52, delay: 0.0 },
      { Icon: Shield,  x: '85%', y: '18%', size: 30, delay: 0.4 },
      { Icon: Star,    x: '78%', y: '75%', size: 22, delay: 0.7 },
      { Icon: Zap,     x: '13%', y: '77%', size: 26, delay: 0.2 },
    ],
  },
  {
    id: 'medicos',
    eyebrow: 'Módulos 2 & 3',
    title: 'Médicos e Estabelecimentos',
    body: 'Agenda semanal por dia da semana, atendimento domiciliar e vínculos com clínicas e hospitais.',
    tags: ['Agenda', 'Domiciliar', 'Mapa'],
    accent: '#A8DCE4',
    bgColor: '#011A1D',
    orbs: [
      { color: '#004D5C', size: 700, x: '55%',  y: '35%',  blur: 140, opacity: 0.85, duration: 8 },
      { color: '#0D7377', size: 400, x: '20%',  y: '60%',  blur: 100, opacity: 0.55, duration: 6 },
      { color: '#A8DCE4', size: 350, x: '80%',  y: '70%',  blur: 90,  opacity: 0.25, duration: 9 },
      { color: '#003040', size: 550, x: '35%',  y: '80%',  blur: 120, opacity: 0.6,  duration: 7 },
    ],
    CenterIcon: Stethoscope,
    floaters: [
      { Icon: Stethoscope, x: '9%',  y: '18%', size: 48, delay: 0.0 },
      { Icon: Building2,   x: '83%', y: '14%', size: 40, delay: 0.5 },
      { Icon: Star,        x: '18%', y: '76%', size: 24, delay: 0.2 },
      { Icon: HeartPulse,  x: '80%', y: '74%', size: 32, delay: 0.6 },
    ],
  },
  {
    id: 'servicos',
    eyebrow: 'Módulo 4',
    title: 'Serviços Médicos',
    body: 'Catálogo de serviços por especialidade, preços, duração e vínculo com médicos e estabelecimentos.',
    tags: ['Especialidades', 'Preços', 'Duração'],
    accent: '#80CED7',
    bgColor: '#010F12',
    orbs: [
      { color: '#005F73', size: 680, x: '40%',  y: '38%',  blur: 135, opacity: 0.82, duration: 9 },
      { color: '#0A7B89', size: 420, x: '78%',  y: '65%',  blur: 105, opacity: 0.55, duration: 6 },
      { color: '#80CED7', size: 320, x: '18%',  y: '70%',  blur: 85,  opacity: 0.22, duration: 8 },
      { color: '#002B35', size: 580, x: '65%',  y: '22%',  blur: 125, opacity: 0.7,  duration: 11 },
    ],
    CenterIcon: ClipboardList,
    floaters: [
      { Icon: ClipboardList, x: '9%',  y: '17%', size: 50, delay: 0.0 },
      { Icon: HeartPulse,    x: '83%', y: '16%', size: 34, delay: 0.4 },
      { Icon: Star,          x: '20%', y: '76%', size: 24, delay: 0.2 },
      { Icon: Zap,           x: '80%', y: '74%', size: 28, delay: 0.6 },
    ],
  },
  {
    id: 'agendamentos',
    eyebrow: 'Módulo 5',
    title: 'Agendamentos',
    body: 'Wizard de 5 etapas com controle completo de status — de Agendado até Concluído.',
    tags: ['Wizard', '5 Etapas', 'Status'],
    accent: '#52B788',
    bgColor: '#010D10',
    orbs: [
      { color: '#0D7377', size: 600, x: '45%',  y: '40%',  blur: 130, opacity: 0.8,  duration: 10 },
      { color: '#52B788', size: 380, x: '15%',  y: '65%',  blur: 100, opacity: 0.5,  duration: 7 },
      { color: '#001820', size: 700, x: '75%',  y: '55%',  blur: 150, opacity: 0.9,  duration: 9 },
      { color: '#004D5C', size: 400, x: '65%',  y: '20%',  blur: 110, opacity: 0.45, duration: 6 },
    ],
    CenterIcon: CalendarClock,
    floaters: [
      { Icon: CalendarClock, x: '9%',  y: '16%', size: 52, delay: 0.0 },
      { Icon: ClipboardList, x: '83%', y: '18%', size: 36, delay: 0.4 },
      { Icon: Zap,           x: '81%', y: '72%', size: 28, delay: 0.7 },
      { Icon: Star,          x: '12%', y: '78%', size: 24, delay: 0.3 },
    ],
  },
  {
    id: 'ia-rag',
    eyebrow: 'Inteligência Artificial',
    title: 'IA com RAG integrado',
    body: 'Assistente inteligente com busca semântica no histórico de pacientes. O CRM aprende com cada atendimento e responde perguntas clínicas com contexto real.',
    tags: ['RAG', 'CRM', 'Busca Semântica', 'Chatbot'],
    accent: '#B8A4F8',
    bgColor: '#06030F',
    orbs: [
      { color: '#4B2EA8', size: 700, x: '50%',  y: '42%',  blur: 140, opacity: 0.85, duration: 9  },
      { color: '#7C3AED', size: 450, x: '22%',  y: '60%',  blur: 110, opacity: 0.55, duration: 7  },
      { color: '#0D7377', size: 380, x: '78%',  y: '30%',  blur: 100, opacity: 0.45, duration: 8  },
      { color: '#1E0A4A', size: 650, x: '65%',  y: '75%',  blur: 150, opacity: 0.9,  duration: 11 },
    ],
    CenterIcon: Brain,
    floaters: [
      { Icon: Brain,     x: '9%',  y: '16%', size: 52, delay: 0.0 },
      { Icon: Database,  x: '83%', y: '15%', size: 36, delay: 0.4 },
      { Icon: Sparkles,  x: '80%', y: '73%', size: 30, delay: 0.7 },
      { Icon: MessageSquare, x: '11%', y: '75%', size: 28, delay: 0.2 },
    ],
  },
  {
    id: 'cta',
    eyebrow: 'Sistema Completo',
    title: 'Pronto para começar?',
    body: 'Acesse o SGSM Médico e transforme a gestão do seu atendimento médico.',
    tags: [],
    accent: '#52B788',
    bgColor: '#000508',
    orbs: [
      { color: '#0D7377', size: 500, x: '50%',  y: '45%',  blur: 130, opacity: 0.7,  duration: 8 },
      { color: '#52B788', size: 300, x: '25%',  y: '60%',  blur: 90,  opacity: 0.35, duration: 6 },
      { color: '#004D5C', size: 450, x: '75%',  y: '35%',  blur: 110, opacity: 0.5,  duration: 9 },
      { color: '#001215', size: 800, x: '50%',  y: '70%',  blur: 160, opacity: 0.95, duration: 12 },
    ],
    CenterIcon: Activity,
    floaters: [
      { Icon: Activity,      x: '9%',  y: '12%', size: 36, delay: 0.0 },
      { Icon: HeartPulse,    x: '87%', y: '16%', size: 30, delay: 0.3 },
      { Icon: Star,          x: '84%', y: '76%', size: 22, delay: 0.6 },
      { Icon: MessageSquare, x: '11%', y: '76%', size: 28, delay: 0.2 },
    ],
    cta: true,
  },
]

const N = SCENES.length

// ─── Glowing orb ───────────────────────────────────────────────────────────────

function Orb({ color, size, x, y, blur, opacity, duration }: OrbDef) {
  return (
    <motion.div
      style={{
        position: 'absolute',
        width: size,
        height: size,
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        background: color,
        filter: `blur(${blur}px)`,
        opacity,
        pointerEvents: 'none',
      }}
      animate={{
        scale: [1, 1.15, 0.95, 1],
        opacity: [opacity, opacity * 1.15, opacity * 0.9, opacity],
      }}
      transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

// ─── Isometric world floor ─────────────────────────────────────────────────────

function WorldFloor() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '-20%',
        left: '-30%',
        right: '-30%',
        height: '60%',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: 'perspective(600px) rotateX(72deg)',
          transformOrigin: 'center bottom',
          backgroundImage: [
            'linear-gradient(rgba(13,115,119,0.2) 1px, transparent 1px)',
            'linear-gradient(90deg, rgba(13,115,119,0.2) 1px, transparent 1px)',
          ].join(','),
          backgroundSize: '70px 70px',
          backgroundPosition: 'center center',
        }}
      />
      {/* Floor glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 100%, rgba(13,115,119,0.3) 0%, transparent 70%)',
        }}
      />
    </div>
  )
}

// ─── Central large world icon ───────────────────────────────────────────────────

function WorldIcon({ Icon, bright = false }: { Icon: IconComp; bright?: boolean }) {
  const baseOpacity = bright ? 0.12 : 0.06
  const peakOpacity = bright ? 0.18 : 0.10
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <motion.div
        animate={{ scale: [1, 1.04, 1], opacity: [baseOpacity, peakOpacity, baseOpacity] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Icon style={{ width: '55vmin', height: '55vmin', color: 'white' }} />
      </motion.div>
    </div>
  )
}

// ─── Floating glassmorphism card ────────────────────────────────────────────────

function FloatingIcon({ Icon, x, y, size, delay }: FloaterDef) {
  return (
    <motion.div
      style={{ position: 'absolute', left: x, top: y }}
      animate={{ y: ['-10px', '10px', '-10px'] }}
      transition={{
        duration: 3.5 + delay * 0.4,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 20,
          padding: Math.round(size * 0.38),
          boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        <Icon style={{ width: size, height: size, color: 'rgba(255,255,255,0.55)' }} />
      </div>
    </motion.div>
  )
}

// ─── Scene background (full-screen layer) ──────────────────────────────────────

interface SceneLayerProps {
  scene: SceneDef
  index: number
  scrollYProgress: MotionValue<number>
}

function SceneBg({ scene, index, scrollYProgress }: SceneLayerProps) {
  const s = index / N
  const e = (index + 1) / N

  const fadeIn1  = s
  const fadeIn2  = Math.min(s + 0.05, e - 0.05)
  const fadeOut1 = Math.max(s + 0.05, e - 0.05)
  const fadeOut2 = e

  // First scene must start fully opaque at scrollYProgress=0
  const startOpacity = index === 0 ? 1 : 0

  const opacity = useTransform(
    scrollYProgress,
    [fadeIn1, fadeIn2, fadeOut1, fadeOut2],
    [startOpacity, 1, 1, 0],
  )
  // Camera "dives in": scene zooms from afar to close-up
  const scale  = useTransform(scrollYProgress, [s, e], [1.0, 1.55])
  // Slight upward drift — camera moving forward
  const yShift = useTransform(scrollYProgress, [s, e], ['0%', '-8%'])

  const hasImage = Boolean(scene.bgImage)

  return (
    <motion.div style={{ position: 'absolute', inset: 0, opacity }}>
      {/* Layer 1: base color */}
      <div style={{ position: 'absolute', inset: 0, background: scene.bgColor }} />

      {/* Layer 2: photo — fills viewport and zooms with the camera */}
      {hasImage && (
        <motion.div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundImage: `url(${scene.bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 25%',
            scale,
            y: yShift,
            transformOrigin: 'center 55%',
          }}
        />
      )}

      {/* Layer 3: orbs + effects */}
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          scale,
          y: yShift,
          transformOrigin: 'center 55%',
          overflow: 'hidden',
        }}
      >
        {scene.orbs.map((orb, i) => (
          <Orb key={i} {...orb} opacity={hasImage ? orb.opacity * 0.15 : orb.opacity} />
        ))}
        {!hasImage && <WorldIcon Icon={scene.CenterIcon} bright={false} />}
        <WorldFloor />
      </motion.div>

      {/* ── Fixed overlays (don't zoom) ── */}

      {/* Vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.65) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Bottom gradient — merges into next scene */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '28%',
          background: `linear-gradient(to top, ${scene.bgColor}, transparent)`,
          pointerEvents: 'none',
        }}
      />

      {/* Top gradient — nav area */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '30%',
          background: `linear-gradient(to bottom, ${scene.bgColor}CC, transparent)`,
          pointerEvents: 'none',
        }}
      />

      {/* Floating cards */}
      {scene.floaters.map((f, i) => (
        <FloatingIcon key={i} {...f} />
      ))}
    </motion.div>
  )
}

// ─── Scene text overlay ─────────────────────────────────────────────────────────

function SceneText({ scene, index, scrollYProgress }: SceneLayerProps) {
  const s = index / N
  const e = (index + 1) / N

  // First scene: text visible from start; others fade+slide in on scroll
  const textStartOpacity = index === 0 ? 1 : 0
  const textStartY       = index === 0 ? '0rem' : '2.5rem'

  const opacity = useTransform(
    scrollYProgress,
    [s + 0.04, s + 0.09, e - 0.09, e - 0.04],
    [textStartOpacity, 1, 1, 0],
  )
  const y = useTransform(scrollYProgress, [s, s + 0.1], [textStartY, '0rem'])
  // Keeps hidden scenes' links out of the tab order — opacity alone doesn't.
  const visibility = useTransform(opacity, v => (v > 0.05 ? 'visible' : 'hidden'))

  return (
    <motion.div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '0 1.5rem',
        zIndex: 20,
        pointerEvents: 'none',
        opacity,
        visibility,
        y,
      }}
    >
      <p
        style={{
          color: scene.accent,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          marginBottom: '1rem',
          maxWidth: 'none',
          lineHeight: 1,
          textShadow: `0 0 20px ${scene.accent}88`,
        }}
      >
        {scene.eyebrow}
      </p>

      <h2
        style={{
          color: '#ffffff',
          fontSize: 'clamp(2.6rem, 6.5vw, 5.2rem)',
          fontWeight: 800,
          letterSpacing: '-0.028em',
          lineHeight: 1.04,
          maxWidth: 700,
          marginBottom: '1.2rem',
          textShadow: '0 2px 40px rgba(0,0,0,0.6)',
        }}
      >
        {scene.title}
      </h2>

      <p
        style={{
          color: 'rgba(255,255,255,0.7)',
          fontSize: 'clamp(1rem, 2.2vw, 1.2rem)',
          lineHeight: 1.68,
          maxWidth: 500,
          marginBottom: scene.tags.length > 0 ? '1.6rem' : 0,
          textShadow: '0 1px 10px rgba(0,0,0,0.5)',
        }}
      >
        {scene.body}
      </p>

      {scene.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {scene.tags.map(tag => (
            <span
              key={tag}
              style={{
                background: `${scene.accent}44`,
                border: `1px solid ${scene.accent}CC`,
                color: '#ffffff',
                padding: '6px 20px',
                borderRadius: 100,
                fontSize: 13,
                fontWeight: 700,
                backdropFilter: 'blur(12px)',
                boxShadow: `0 0 16px ${scene.accent}55`,
                textShadow: '0 1px 4px rgba(0,0,0,0.5)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {scene.cta && (
        <div
          style={{
            marginTop: '2.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            flexWrap: 'wrap',
            justifyContent: 'center',
            pointerEvents: 'auto',
          }}
        >
          <Link
            to="/login"
            className={cn(
              buttonVariants({ variant: 'accent', size: 'lg' }),
              'rounded-full px-10 shadow-xl',
            )}
            style={{ filter: 'drop-shadow(0 0 30px rgba(82,183,136,0.35))' }}
          >
            Acessar Sistema <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            to="/"
            className="text-white/55 hover:text-white text-sm font-semibold transition-colors"
          >
            ← Voltar ao início
          </Link>
        </div>
      )}
    </motion.div>
  )
}

// ─── Scroll hint ────────────────────────────────────────────────────────────────

function ScrollHint({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  const opacity = useTransform(scrollYProgress, [0, 0.08], [1, 0])
  return (
    <motion.div
      style={{
        position: 'absolute',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
        zIndex: 40,
        pointerEvents: 'none',
        opacity,
      }}
    >
      <span
        style={{
          color: 'rgba(255,255,255,0.45)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}
      >
        role para voar
      </span>
      <motion.div
        style={{
          width: 1.5,
          height: 50,
          borderRadius: 1,
          background: 'linear-gradient(to bottom, rgba(82,183,136,0.8), transparent)',
        }}
        animate={{ scaleY: [0.3, 1, 0.3], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  )
}

// ─── Side progress dots ─────────────────────────────────────────────────────────

function SceneDot({
  index,
  scene,
  scrollYProgress,
}: {
  index: number
  scene: SceneDef
  scrollYProgress: MotionValue<number>
}) {
  const s = index / N
  const e = (index + 1) / N
  const scale   = useTransform(scrollYProgress, [s, s + 0.05, e - 0.05, e], [0.6, 1.6, 1.6, 0.6])
  const opacity = useTransform(scrollYProgress, [s, s + 0.06, e - 0.06, e], [0.25, 1, 1, 0.25])

  return (
    <motion.div
      style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: scene.accent,
        scale,
        opacity,
        boxShadow: `0 0 8px ${scene.accent}`,
      }}
    />
  )
}

// ─── WorldPage ──────────────────────────────────────────────────────────────────

export default function WorldPage() {
  const outerRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ['start start', 'end end'],
  })

  useEffect(() => {
    const prev = document.title
    document.title = 'SGSM Médico — O Mundo do Sistema'
    return () => { document.title = prev }
  }, [])

  return (
    <div style={{ background: '#000508' }}>
      {/* Scroll driver — 5 scenes × 110vh */}
      <div ref={outerRef} style={{ height: `${N * 110}vh`, position: 'relative' }}>

        {/* ── Sticky viewport ── */}
        <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>

          {/* ── Top nav (rendered first so it's reached first in tab order) ── */}
          <nav
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.5rem 2rem',
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)',
            }}
          >
            <Link
              to="/"
              style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', textDecoration: 'none' }}
            >
              <div
                style={{
                  background: 'rgba(13,115,119,0.4)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  padding: '0.5rem',
                  borderRadius: 14,
                  border: '1px solid rgba(13,115,119,0.6)',
                  boxShadow: '0 0 20px rgba(13,115,119,0.3)',
                }}
              >
                <Activity style={{ width: 20, height: 20, color: '#52B788' }} />
              </div>
              <span style={{ color: 'white', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
                SGSM Médico
              </span>
            </Link>

            <Link
              to="/login"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'text-white/70 hover:text-white hover:bg-white/10 rounded-full',
              )}
            >
              Acessar Sistema <ChevronRight className="h-4 w-4" />
            </Link>
          </nav>

          {/* Scene backgrounds (stacked absolute layers) */}
          {SCENES.map((scene, i) => (
            <SceneBg key={scene.id} scene={scene} index={i} scrollYProgress={scrollYProgress} />
          ))}

          {/* Scene text overlays */}
          {SCENES.map((scene, i) => (
            <SceneText key={scene.id} scene={scene} index={i} scrollYProgress={scrollYProgress} />
          ))}

          {/* ── Scroll hint ── */}
          <ScrollHint scrollYProgress={scrollYProgress} />

          {/* ── Side dots ── */}
          <div
            style={{
              position: 'absolute',
              right: '1.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.8rem',
              zIndex: 40,
              pointerEvents: 'none',
            }}
          >
            {SCENES.map((scene, i) => (
              <SceneDot key={i} index={i} scene={scene} scrollYProgress={scrollYProgress} />
            ))}
          </div>

        </div>
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          background: '#000508',
          padding: '3rem 2rem',
          textAlign: 'center',
          borderTop: '1px solid rgba(13,115,119,0.2)',
        }}
      >
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, maxWidth: 'none', letterSpacing: '0.06em' }}>
          © {new Date().getFullYear()} SGSM Médico — Sistema de Gestão em Saúde Médica
        </p>
      </div>
    </div>
  )
}
