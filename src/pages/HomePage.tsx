import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { ComponentType } from 'react'
import {
  Activity,
  Users,
  Stethoscope,
  Building2,
  CalendarClock,
  HeartPulse,
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  MousePointerClick,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/Button'

// ─── Data ─────────────────────────────────────────────────────────────────────

const features: Array<{
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
}> = [
  {
    icon: Users,
    title: 'Gestão de Pacientes',
    description:
      'Cadastro completo com CPF, endereço automático via ViaCEP, histórico e controle de status.',
  },
  {
    icon: Stethoscope,
    title: 'Gestão de Médicos',
    description:
      'Agenda semanal por dia da semana, suporte a atendimento domiciliar e vínculos com estabelecimentos.',
  },
  {
    icon: Building2,
    title: 'Estabelecimentos',
    description:
      'Gerencie clínicas e hospitais, vincule médicos por unidade e acesse localização no Google Maps.',
  },
  {
    icon: CalendarClock,
    title: 'Agendamentos',
    description:
      'Wizard intuitivo de 5 etapas com controle completo de status, do agendamento até a conclusão.',
  },
]

const modules = [
  { label: 'Pacientes', desc: 'Cadastro com ViaCEP e inativação' },
  { label: 'Médicos', desc: 'Agenda semanal e atendimento domiciliar' },
  { label: 'Estabelecimentos', desc: 'Clínicas, hospitais e localização no mapa' },
  { label: 'Serviços Médicos', desc: 'Catálogo com valores e tipos' },
  { label: 'Agendamentos', desc: 'Wizard completo e controle de status' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-primary p-2 rounded-xl group-hover:bg-secondary transition-colors">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-secondary">
              SGSM <span className="text-primary">Médico</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {[
              { label: 'Início', href: '#' },
              { label: 'Funcionalidades', href: '#features' },
              { label: 'Sobre o Sistema', href: '#about' },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-semibold text-foreground/80 hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <Link
            to="/pacientes"
            className={cn(buttonVariants({ variant: 'accent', size: 'md' }), 'rounded-full')}
          >
            Acessar Sistema <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main>
        {/* ── Hero ───────────────────────────────────────────────────────────── */}
        <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-background">
          {/* Mint block left — same as horizons */}
          <div className="absolute top-0 left-0 w-[58%] h-full bg-muted z-0 hidden lg:block rounded-br-[100px]" />

          <div className="max-w-7xl mx-auto relative z-10 px-4 sm:px-6 lg:px-8 py-16 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

              {/* Left: decorative illustration */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="relative hidden lg:block"
              >
                <div className="rounded-3xl h-[520px] w-full bg-gradient-to-br from-primary to-accent shadow-2xl flex items-center justify-center relative overflow-hidden">
                  {/* Decorative circles */}
                  <div className="absolute top-8 right-8 w-40 h-40 rounded-full bg-white/10" />
                  <div className="absolute bottom-10 left-6 w-24 h-24 rounded-full bg-white/10" />
                  <div className="absolute top-1/2 left-10 w-5 h-5 rounded-full bg-white/25" />
                  <div className="absolute top-20 left-1/2 w-3 h-3 rounded-full bg-white/30" />

                  <div className="flex flex-col items-center gap-8 relative z-10">
                    <div className="w-28 h-28 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center">
                      <HeartPulse className="w-14 h-14 text-white" />
                    </div>
                    <div className="flex gap-5">
                      {[
                        { Icon: Users, label: 'Pacientes' },
                        { Icon: Stethoscope, label: 'Médicos' },
                        { Icon: CalendarClock, label: 'Agenda' },
                      ].map(({ Icon, label }) => (
                        <div key={label} className="flex flex-col items-center gap-2">
                          <div className="w-20 h-20 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
                            <Icon className="w-9 h-9 text-white" />
                          </div>
                          <span className="text-white/80 text-xs font-semibold">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Right: white card overlay */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
                className="bg-white p-10 md:p-14 rounded-3xl shadow-2xl lg:-ml-24 relative z-20 border border-border/50"
              >
                <div className="inline-block bg-muted text-primary font-bold text-sm tracking-wider uppercase px-4 py-1.5 rounded-full mb-6">
                  Sistema de Gestão em Saúde
                </div>
                <h1
                  className="text-4xl md:text-5xl font-extrabold text-primary mb-6 leading-[1.1]"
                  style={{ letterSpacing: '-0.02em' }}
                >
                  Gestão Médica Completa na Palma da Mão
                </h1>
                <p className="text-lg text-foreground/80 mb-10 leading-relaxed" style={{ maxWidth: 'none' }}>
                  Controle pacientes, médicos, estabelecimentos e agendamentos em uma única plataforma. Ágil, integrado e focado na eficiência do atendimento médico.
                </p>
                <Link
                  to="/agendamentos"
                  className={cn(
                    buttonVariants({ variant: 'accent', size: 'lg' }),
                    'rounded-full px-10 shadow-lg hover:shadow-xl'
                  )}
                >
                  Novo Agendamento <ArrowRight className="h-5 w-5" />
                </Link>
              </motion.div>

            </div>
          </div>
        </section>

        {/* ── Features ───────────────────────────────────────────────────────── */}
        <section id="features" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <p
                className="text-accent font-bold tracking-widest uppercase mb-3"
                style={{ maxWidth: 'none' }}
              >
                Funcionalidades
              </p>
              <h2 className="text-4xl md:text-5xl font-extrabold text-primary mb-6">
                Tudo que você precisa
              </h2>
              <p className="text-lg text-foreground/70" style={{ maxWidth: 'none' }}>
                Uma plataforma completa para gerenciar todos os aspectos da operação médica,
                do cadastro ao atendimento.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="h-full"
                >
                  <FeatureCard {...feature} />
                </motion.div>
              ))}
            </div>

            <div className="text-center">
              <Link
                to="/pacientes"
                className={cn(
                  buttonVariants({ variant: 'accent', size: 'lg' }),
                  'rounded-full px-10 shadow-md font-bold'
                )}
              >
                Acessar Sistema
              </Link>
            </div>
          </div>
        </section>

        {/* ── Chatbot callout ────────────────────────────────────────────────── */}
        <section className="py-16 bg-muted/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-3xl border border-border shadow-lg px-8 py-10 flex flex-col lg:flex-row items-center gap-8"
            >
              {/* Icon */}
              <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-md">
                <MessageCircle className="w-10 h-10 text-white" />
              </div>

              {/* Text */}
              <div className="flex-1 text-center lg:text-left">
                <h3 className="text-2xl font-extrabold text-secondary mb-2">
                  Assistente Virtual disponível agora
                </h3>
                <p className="text-foreground/70 text-base leading-relaxed" style={{ maxWidth: 'none' }}>
                  Clique no botão <strong className="text-primary">azul-teal</strong> no canto inferior direito e use nosso chatbot para{' '}
                  <strong>cadastrar um paciente</strong> ou <strong>agendar uma consulta</strong> em poucos passos, sem precisar navegar pelo sistema.
                </p>
              </div>

              {/* CTA visual */}
              <div className="flex flex-col items-center gap-3 shrink-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground/60">
                  <MousePointerClick className="w-4 h-4" />
                  <span>Clique aqui embaixo</span>
                </div>
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 border-2 border-white" />
                </div>
                <span className="text-xs text-foreground/50">canto inferior direito ↘</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Dark section ───────────────────────────────────────────────────── */}
        <section id="about" className="py-24 bg-secondary text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl -mr-20 -mt-20" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <p
                  className="text-accent font-bold tracking-widest uppercase mb-3"
                  style={{ maxWidth: 'none' }}
                >
                  Fluxo de Atendimento
                </p>
                <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
                  Agendamento em 5 etapas
                </h2>
                <div className="space-y-4 mb-10">
                  <p className="text-white/80 text-lg leading-relaxed" style={{ maxWidth: 'none' }}>
                    O módulo de agendamentos guia o operador em um wizard intuitivo: selecione o
                    paciente, o serviço, o médico, o slot disponível e confirme.
                  </p>
                  <p className="text-white/80 text-lg leading-relaxed" style={{ maxWidth: 'none' }}>
                    Acompanhe cada consulta do agendamento até a conclusão: Agendado → Confirmado →
                    A Caminho → Chegou → Concluído.
                  </p>
                </div>
                <Link
                  to="/agendamentos"
                  className={cn(
                    buttonVariants({ variant: 'accent', size: 'lg' }),
                    'rounded-full px-10'
                  )}
                >
                  Criar Agendamento
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-white/5 border border-white/10 p-10 rounded-3xl backdrop-blur-sm"
              >
                <h4 className="text-2xl font-bold text-white mb-8">Módulos disponíveis:</h4>
                <ul className="space-y-5">
                  {modules.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <span className="text-base font-semibold text-white block">{item.label}</span>
                        <span className="text-sm text-white/60">{item.desc}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </motion.div>

            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="bg-secondary border-t border-white/10 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/70">
          <div className="flex items-center gap-2">
            <div className="bg-primary/20 p-1.5 rounded-lg">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <span className="font-extrabold text-white">
              SGSM <span className="text-primary">Médico</span>
            </span>
          </div>
          <p style={{ maxWidth: 'none' }}>
            © {new Date().getFullYear()} SGSM — Sistema de Gestão em Saúde Médica
          </p>
          <Link
            to="/pacientes"
            className="text-accent hover:text-accent/80 font-semibold transition-colors"
          >
            Acessar Sistema →
          </Link>
        </div>
      </footer>
    </div>
  )
}

// ─── FeatureCard ──────────────────────────────────────────────────────────────

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="group h-full border border-border/60 bg-card rounded-2xl overflow-hidden relative transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute bottom-0 left-0 h-1 bg-primary w-0 group-hover:w-full transition-all duration-500 ease-out" />
      <div className="p-8 flex flex-col h-full relative">
        <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-500 shadow-sm">
          <Icon className="h-8 w-8 text-primary group-hover:text-white transition-colors duration-500" />
        </div>
        <h3 className="text-xl font-extrabold text-secondary mb-3 group-hover:text-primary transition-colors duration-300">
          {title}
        </h3>
        <p className="text-foreground/70 leading-relaxed text-base" style={{ maxWidth: 'none' }}>
          {description}
        </p>
      </div>
    </div>
  )
}
