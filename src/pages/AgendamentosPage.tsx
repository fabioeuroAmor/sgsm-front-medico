import { useEffect, useState, useMemo, useRef } from 'react'
import {
  CalendarClock, Plus, ChevronRight, ChevronLeft, XCircle, Clock, User,
  MapPin, Stethoscope, Building2, CalendarDays, CheckCircle2, Home, Truck,
  CreditCard, Search,
} from 'lucide-react'
import { useAgendamentos } from '@/hooks/useAgendamentos'
import { pacienteService } from '@/services/pacienteService'
import { servicoMedicoService } from '@/services/servicoMedicoService'
import { medicoService } from '@/services/medicoService'
import { agendamentoService } from '@/services/agendamentoService'
import type {
  AgendamentoResponse, EstabelecimentoResponse,
  MedicoResponse, OrigemCancelamento, PacienteResponse, ServicoMedicoResponse,
  SlotDisponivelResponse, StatusAgendamento, TipoAgendamento,
} from '@/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input, SelectField } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

// ─── helpers ──────────────────────────────────────────────────────────────────

function maskCPF(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function formatDateTime(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatTime(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

const STATUS_LABEL: Record<StatusAgendamento, string> = {
  PENDENTE: 'Pendente', AGUARDANDO_PAGAMENTO: 'Aguard. Pagamento', CONFIRMADO: 'Confirmado',
  EM_ANDAMENTO: 'Em Andamento', A_CAMINHO: 'A Caminho', CHEGOU: 'Chegou',
  CONCLUIDO: 'Concluído', CANCELADO: 'Cancelado', NO_SHOW: 'Não Compareceu',
}

const TIPO_LABEL: Record<TipoAgendamento, string> = {
  PRESENCIAL: 'Presencial', DOMICILIAR: 'Domiciliar', TELEMEDICINA: 'Telemedicina',
}

const WIZARD_TITLES = [
  'Passo 1 / 5 — Paciente', 'Passo 2 / 5 — Serviço Médico',
  'Passo 3 / 5 — Tipo e Local', 'Passo 4 / 5 — Data e Horário', 'Passo 5 / 5 — Confirmação',
]

function proximoStatus(a: AgendamentoResponse): StatusAgendamento | null {
  if (a.status === 'PENDENTE' || a.status === 'AGUARDANDO_PAGAMENTO') return 'CONFIRMADO'
  if (a.status === 'CONFIRMADO') return a.tipo === 'DOMICILIAR' ? 'A_CAMINHO' : 'EM_ANDAMENTO'
  if (a.status === 'A_CAMINHO') return 'CHEGOU'
  if (a.status === 'CHEGOU') return 'EM_ANDAMENTO'
  if (a.status === 'EM_ANDAMENTO') return 'CONCLUIDO'
  return null
}

const PROXIMO_LABEL: Partial<Record<StatusAgendamento, string>> = {
  CONFIRMADO: 'Confirmar', A_CAMINHO: 'A Caminho', EM_ANDAMENTO: 'Iniciar', CHEGOU: 'Chegou', CONCLUIDO: 'Concluir',
}

function statusBadgeVariant(s: StatusAgendamento): 'active' | 'inactive' | 'default' | 'pending' | 'info' {
  if (s === 'CONCLUIDO' || s === 'CONFIRMADO') return 'active'
  if (s === 'EM_ANDAMENTO' || s === 'A_CAMINHO' || s === 'CHEGOU') return 'info'
  if (s === 'CANCELADO' || s === 'NO_SHOW') return 'inactive'
  if (s === 'PENDENTE' || s === 'AGUARDANDO_PAGAMENTO') return 'pending'
  return 'default'
}

function Pill3D({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLButtonElement>(null)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 })
  const [hov, setHov] = useState(false)

  function onMove(e: React.MouseEvent<HTMLButtonElement>) {
    const el = ref.current; if (!el) return
    const { left, top, width, height } = el.getBoundingClientRect()
    const px = (e.clientX - left) / width
    const py = (e.clientY - top) / height
    setTilt({ rx: (py - 0.5) * -16, ry: (px - 0.5) * 16 })
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      onMouseMove={onMove}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setTilt({ rx: 0, ry: 0 }) }}
      style={{
        transformStyle: 'preserve-3d',
        transform: `perspective(300px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(${hov ? 1.08 : 1})`,
        transition: hov ? 'transform 0.07s linear' : 'transform 0.5s cubic-bezier(0.23,1,0.32,1)',
        boxShadow: hov ? '0 8px 20px rgba(0,0,0,0.18)' : active ? '0 2px 8px rgba(0,0,0,0.12)' : undefined,
      }}
      className={cn(
        'rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors duration-200',
        active
          ? 'bg-secondary text-secondary-foreground border-secondary'
          : 'border-border text-muted-foreground hover:border-primary hover:text-primary',
      )}
    >
      {children}
    </button>
  )
}

function SelectRow({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('w-full text-left rounded-xl border px-4 py-3 transition-all duration-200 text-sm',
        selected ? 'border-primary/50 bg-primary/5 text-foreground' : 'border-border bg-input hover:border-primary/30 hover:bg-muted/50 text-foreground')}>
      {children}
    </button>
  )
}

// ─── componente principal ─────────────────────────────────────────────────────

export function AgendamentosPage() {
  const { agendamentos, loading, error, listar, cadastrar, cancelar, atualizarStatus } = useAgendamentos()
  const [atualizandoId, setAtualizandoId] = useState<string | null>(null)
  const [filtroStatus, setFiltroStatus] = useState<StatusAgendamento | ''>('')
  const [buscaMedico, setBuscaMedico] = useState('')
  const [medicoSelecionado, setMedicoSelecionado] = useState<MedicoResponse | null>(null)
  const [todosMedicos, setTodosMedicos] = useState<MedicoResponse[]>([])
  const [buscaPacienteStr, setBuscaPacienteStr] = useState('')
  const [pacienteSelecionado, setPacienteSelecionado] = useState<PacienteResponse | null>(null)
  const [todosPacientes, setTodosPacientes] = useState<PacienteResponse[]>([])

  // wizard
  const [wizardAberto, setWizardAberto] = useState(false)
  const [passo, setPasso] = useState(1)
  const [wizardError, setWizardError] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const [todosOsPacientes, setTodosOsPacientes] = useState<PacienteResponse[]>([])
  const [buscaPaciente, setBuscaPaciente] = useState('')
  const [selectedPaciente, setSelectedPaciente] = useState<PacienteResponse | null>(null)

  const [todosOsServicos, setTodosOsServicos] = useState<ServicoMedicoResponse[]>([])
  const [medicosMap, setMedicosMap] = useState<Record<string, MedicoResponse>>({})
  const [buscaServico, setBuscaServico] = useState('')
  const [selectedServico, setSelectedServico] = useState<ServicoMedicoResponse | null>(null)

  const [selectedTipo, setSelectedTipo] = useState<TipoAgendamento>('PRESENCIAL')
  const [estabelecimentos, setEstabelecimentos] = useState<EstabelecimentoResponse[]>([])
  const [loadingEstabelecimentos, setLoadingEstabelecimentos] = useState(false)
  const [selectedEstabelecimento, setSelectedEstabelecimento] = useState<EstabelecimentoResponse | null>(null)

  const [dataSelecionada, setDataSelecionada] = useState('')
  const [slots, setSlots] = useState<SlotDisponivelResponse[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<SlotDisponivelResponse | null>(null)
  const [observacoes, setObservacoes] = useState('')

  const [aCaminhoItem, setACaminhoItem] = useState<AgendamentoResponse | null>(null)
  const [linkLocalizacao, setLinkLocalizacao] = useState('')
  const [salvandoACaminho, setSalvandoACaminho] = useState(false)

  const [cancelandoItem, setCancelandoItem] = useState<AgendamentoResponse | null>(null)
  const [origemCancelamento, setOrigemCancelamento] = useState<OrigemCancelamento>('PACIENTE')
  const [motivoCancelamento, setMotivoCancelamento] = useState('')
  const [cancelando, setCancelando] = useState(false)

  // 3D tilt effect
  const tiltRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50 })
  const [hovering3d, setHovering3d] = useState(false)

  function onTiltMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = tiltRef.current
    if (!el) return
    const { left, top, width, height } = el.getBoundingClientRect()
    const px = (e.clientX - left) / width
    const py = (e.clientY - top) / height
    setTilt({ rx: (py - 0.5) * -26, ry: (px - 0.5) * 26, gx: px * 100, gy: py * 100 })
  }
  function onTiltLeave() {
    setHovering3d(false)
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 50 })
  }

  // sugestões de médico
  const sugestoes = useMemo(() => {
    if (medicoSelecionado || !buscaMedico.trim()) return []
    const q = buscaMedico.trim().toLowerCase()
    const crmQ = q.replace(/\D/g, '')
    return todosMedicos.filter(m => {
      if (crmQ.length >= 2 && m.crm.replace(/\D/g, '').startsWith(crmQ)) return true
      return m.nome.toLowerCase().includes(q)
    }).slice(0, 6)
  }, [buscaMedico, medicoSelecionado, todosMedicos])

  const sugestoesPaciente = useMemo(() => {
    if (pacienteSelecionado || !buscaPacienteStr.trim()) return []
    const q = buscaPacienteStr.trim().toLowerCase()
    const cpfQ = q.replace(/\D/g, '')
    return todosPacientes.filter(p => {
      if (cpfQ.length >= 3 && p.cpf.replace(/\D/g, '').startsWith(cpfQ)) return true
      return p.nome.toLowerCase().includes(q)
    }).slice(0, 6)
  }, [buscaPacienteStr, pacienteSelecionado, todosPacientes])

  useEffect(() => {
    medicoService.listar({ ativo: true }).then(setTodosMedicos).catch(() => {})
    pacienteService.listar({ ativo: true }).then(setTodosPacientes).catch(() => {})
  }, [])

  useEffect(() => {
    listar({
      ...(filtroStatus ? { status: filtroStatus } : {}),
      ...(medicoSelecionado ? { medicoId: medicoSelecionado.id } : {}),
      ...(pacienteSelecionado ? { pacienteId: pacienteSelecionado.id } : {}),
    })
  }, [filtroStatus, medicoSelecionado, pacienteSelecionado, listar])

  useEffect(() => {
    if (!wizardAberto) return
    pacienteService.listar({ ativo: true }).then(setTodosOsPacientes).catch(() => {})
  }, [wizardAberto])

  useEffect(() => {
    if (passo !== 2) return
    Promise.all([servicoMedicoService.listar({ ativo: true }), medicoService.listar({ ativo: true })])
      .then(([servicos, medicos]) => {
        setTodosOsServicos(servicos)
        const map: Record<string, MedicoResponse> = {}
        medicos.forEach((m) => { map[m.id] = m })
        setMedicosMap(map)
      }).catch(() => {})
  }, [passo])

  useEffect(() => {
    if (passo !== 3 || !selectedServico || selectedTipo === 'DOMICILIAR') return
    setLoadingEstabelecimentos(true); setEstabelecimentos([]); setWizardError(null)
    agendamentoService.getEstabelecimentosByMedico(selectedServico.medicoId)
      .then((data) => { setEstabelecimentos(data); if (data.length === 0) setWizardError('Nenhum estabelecimento encontrado.') })
      .catch((err: Error) => setWizardError(err.message))
      .finally(() => setLoadingEstabelecimentos(false))
  }, [passo, selectedServico, selectedTipo])

  useEffect(() => {
    if (passo !== 4 || !selectedServico || !dataSelecionada) return
    if (selectedTipo !== 'DOMICILIAR' && !selectedEstabelecimento) return
    setLoadingSlots(true); setSelectedSlot(null)
    agendamentoService.getSlots(selectedServico.medicoId, selectedTipo === 'DOMICILIAR' ? undefined : selectedEstabelecimento!.id, dataSelecionada)
      .then(setSlots).catch(() => setSlots([])).finally(() => setLoadingSlots(false))
  }, [passo, dataSelecionada, selectedServico, selectedEstabelecimento, selectedTipo])

  function resetWizard() {
    setPasso(1); setBuscaPaciente(''); setSelectedPaciente(null); setBuscaServico(''); setSelectedServico(null)
    setSelectedTipo('PRESENCIAL'); setEstabelecimentos([]); setSelectedEstabelecimento(null)
    setDataSelecionada(''); setSlots([]); setSelectedSlot(null); setObservacoes(''); setWizardError(null)
  }

  function podeAvancar() {
    if (passo === 1) return selectedPaciente !== null
    if (passo === 2) return selectedServico !== null
    if (passo === 3) return selectedTipo === 'DOMICILIAR' || selectedEstabelecimento !== null
    if (passo === 4) return selectedSlot !== null
    return true
  }

  async function confirmar() {
    if (!selectedPaciente || !selectedServico || !selectedSlot) return
    if (selectedTipo !== 'DOMICILIAR' && !selectedEstabelecimento) return
    setSalvando(true); setWizardError(null)
    try {
      await cadastrar({
        pacienteId: selectedPaciente.id, servicoMedicoId: selectedServico.id,
        estabelecimentoId: selectedTipo === 'DOMICILIAR' ? undefined : selectedEstabelecimento!.id,
        tipo: selectedTipo, dataHoraInicio: selectedSlot.dataHoraInicio,
        observacoes: observacoes || undefined,
      })
      setWizardAberto(false); resetWizard()
      listar(filtroStatus ? { status: filtroStatus } : {})
    } catch (err) { setWizardError((err as Error).message) } finally { setSalvando(false) }
  }

  async function confirmarCancelamento() {
    if (!cancelandoItem || !motivoCancelamento.trim()) return
    setCancelando(true)
    try {
      await cancelar(cancelandoItem.id, { origemCancelamento, motivoCancelamento })
      setCancelandoItem(null); setMotivoCancelamento('')
    } catch { /* list will update */ } finally { setCancelando(false) }
  }

  const pacientesFiltrados = todosOsPacientes.filter((p) => {
    const q = buscaPaciente.toLowerCase()
    return p.nome.toLowerCase().includes(q) || p.cpf.includes(q) || p.cpf.replace(/\D/g, '').includes(q.replace(/\D/g, ''))
  })

  const servicosFiltrados = todosOsServicos.filter((s) => {
    const q = buscaServico.toLowerCase()
    const m = medicosMap[s.medicoId]
    return s.nome.toLowerCase().includes(q) || (m && m.nome.toLowerCase().includes(q))
  })

  const podeCancel = (a: AgendamentoResponse) => a.status !== 'CANCELADO' && a.status !== 'CONCLUIDO' && a.status !== 'NO_SHOW'

  return (
    <div className="space-y-6">
      {/* ── Hero banner ───────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[hsl(190,100%,10%)] via-[hsl(190,100%,14%)] to-[hsl(190,100%,18%)] flex items-center justify-between gap-6 min-h-[200px] pr-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(0,210,255,0.18),transparent_65%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-3 p-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-400/70">Gestão</p>
          <h1 className="text-3xl font-extrabold text-white leading-tight">Agendamentos</h1>
          <p className="text-sm text-white/50 max-w-xs">Visualize e gerencie todos os agendamentos de consultas e procedimentos.</p>
          <div className="mt-1">
            <Button onClick={() => { resetWizard(); setWizardAberto(true) }}><Plus size={16} strokeWidth={2} /> Novo Agendamento</Button>
          </div>
        </div>

        <div
          className="relative hidden md:flex items-end justify-end flex-shrink-0 h-[240px] w-[160px] mr-6 cursor-pointer select-none"
          style={{ perspective: '900px' }}
        >
          <div
            ref={tiltRef}
            onMouseMove={onTiltMove}
            onMouseEnter={() => setHovering3d(true)}
            onMouseLeave={onTiltLeave}
            style={{
              transformStyle: 'preserve-3d',
              transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(${hovering3d ? 1.08 : 1})`,
              transition: hovering3d ? 'transform 0.07s linear' : 'transform 0.65s cubic-bezier(0.23,1,0.32,1)',
              animation: hovering3d ? 'none' : 'img-float 4s ease-in-out infinite',
            }}
            className="relative h-full w-full"
          >
            <style>{`
              @keyframes img-float {
                0%, 100% { transform: translateY(0px) rotateX(4deg) rotateY(-4deg); }
                50%       { transform: translateY(-10px) rotateX(-4deg) rotateY(4deg); }
              }
            `}</style>
            <img
              src="/medico-3d.jpg"
              alt=""
              aria-hidden="true"
              className="h-full w-auto object-contain object-bottom"
              style={{
                filter: `drop-shadow(0 0 ${hovering3d ? '40px' : '24px'} rgba(0,210,255,${hovering3d ? '0.75' : '0.5'}))`,
                transition: 'filter 0.3s ease',
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none rounded-lg"
              style={{
                background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,${hovering3d ? '0.18' : '0'}), transparent 55%)`,
                transition: hovering3d ? 'none' : 'background 0.5s ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* filtros */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-start gap-3">
          {/* busca médico */}
          <div className="relative w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={buscaMedico}
              onChange={(e) => { setBuscaMedico(e.target.value); if (medicoSelecionado) setMedicoSelecionado(null) }}
              placeholder="CRM ou nome do médico…"
              disabled={buscaPacienteStr.trim().length > 0 || !!pacienteSelecionado}
              className={cn('w-full rounded-xl border pl-9 pr-4 py-2 text-sm outline-none transition-all placeholder:text-muted-foreground/60',
                buscaPacienteStr.trim().length > 0 || pacienteSelecionado ? 'cursor-not-allowed bg-input/50 border-border text-muted-foreground' :
                medicoSelecionado ? 'border-primary/50 bg-primary/5 text-foreground' : 'border-border bg-input text-foreground focus:ring-2 focus:ring-ring')} />
            {sugestoes.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                {sugestoes.map((m) => (
                  <button key={m.id} type="button" onClick={() => { setMedicoSelecionado(m); setBuscaMedico(m.nome) }}
                    className="flex w-full items-start gap-2 px-4 py-2.5 text-left hover:bg-muted transition-colors">
                    <div><p className="text-sm font-semibold text-foreground">{m.nome}</p><p className="text-xs text-muted-foreground">CRM {m.crm}/{m.crmUf} · {m.especialidade}</p></div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {medicoSelecionado && (
            <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
              <span className="text-sm text-foreground">Dr(a). {medicoSelecionado.nome}</span>
              <button onClick={() => { setMedicoSelecionado(null); setBuscaMedico('') }} className="text-muted-foreground hover:text-destructive transition-colors"><XCircle size={14} /></button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-start gap-3">
          {/* busca paciente */}
          <div className="relative w-72">
            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={buscaPacienteStr}
              onChange={(e) => { setBuscaPacienteStr(e.target.value); if (pacienteSelecionado) setPacienteSelecionado(null) }}
              placeholder="CPF ou nome do paciente…"
              disabled={buscaMedico.trim().length > 0 || !!medicoSelecionado}
              className={cn('w-full rounded-xl border pl-9 pr-4 py-2 text-sm outline-none transition-all placeholder:text-muted-foreground/60',
                buscaMedico.trim().length > 0 || medicoSelecionado ? 'cursor-not-allowed bg-input/50 border-border text-muted-foreground' :
                pacienteSelecionado ? 'border-primary/50 bg-primary/5 text-foreground' : 'border-border bg-input text-foreground focus:ring-2 focus:ring-ring')} />
            {sugestoesPaciente.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                {sugestoesPaciente.map((p) => (
                  <button key={p.id} type="button" onClick={() => { setPacienteSelecionado(p); setBuscaPacienteStr(p.nome) }}
                    className="flex w-full items-start gap-2 px-4 py-2.5 text-left hover:bg-muted transition-colors">
                    <div><p className="text-sm font-semibold text-foreground">{p.nome}</p><p className="text-xs text-muted-foreground">CPF {maskCPF(p.cpf)}</p></div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {pacienteSelecionado && (
            <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
              <span className="text-sm text-foreground">{pacienteSelecionado.nome} — {maskCPF(pacienteSelecionado.cpf)}</span>
              <button onClick={() => { setPacienteSelecionado(null); setBuscaPacienteStr('') }} className="text-muted-foreground hover:text-destructive transition-colors"><XCircle size={14} /></button>
            </div>
          )}
        </div>

        {/* filtro status */}
        <div className="flex flex-wrap gap-2">
          {(['', 'PENDENTE', 'CONFIRMADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'] as const).map((s) => (
            <Pill3D key={s} active={filtroStatus === s} onClick={() => setFiltroStatus(s as StatusAgendamento | '')}>
              {s ? STATUS_LABEL[s as StatusAgendamento] : 'Todos'}
            </Pill3D>
          ))}
        </div>
      </div>

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      {loading ? (
        <div className="flex h-48 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : agendamentos.length === 0 ? (
        <EmptyState icon={<CalendarClock size={24} strokeWidth={1.5} />} title="Nenhum agendamento encontrado" description="Crie um novo agendamento clicando no botão acima." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agendamentos.map((a) => (
            <Card key={a.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-secondary truncate">{a.pacienteNome ?? '—'}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.servicoMedicoNome ?? '—'}</p>
                </div>
                <Badge variant={statusBadgeVariant(a.status)}>{STATUS_LABEL[a.status]}</Badge>
              </div>

              <div className="space-y-1.5 text-sm text-foreground/70">
                <div className="flex items-center gap-2"><Stethoscope size={13} className="text-muted-foreground shrink-0" /><span className="truncate">{a.medicoNome ?? '—'}</span></div>
                <div className="flex items-center gap-2">
                  {a.tipo === 'DOMICILIAR' ? <Home size={13} className="text-muted-foreground shrink-0" /> : <MapPin size={13} className="text-muted-foreground shrink-0" />}
                  {a.tipo === 'DOMICILIAR' ? (
                    a.pacienteEndereco
                      ? <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.pacienteEndereco)}`} target="_blank" rel="noopener noreferrer" className="truncate hover:text-primary hover:underline transition-colors">Domiciliar — {a.pacienteEndereco}</a>
                      : <span className="text-muted-foreground italic">Domiciliar</span>
                  ) : a.estabelecimentoEndereco
                    ? <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.estabelecimentoEndereco)}`} target="_blank" rel="noopener noreferrer" className="truncate hover:text-primary hover:underline transition-colors">{a.estabelecimentoNome ?? '—'}</a>
                    : <span className="truncate">{a.estabelecimentoNome ?? TIPO_LABEL[a.tipo]}</span>}
                </div>
                <div className="flex items-center gap-2"><CalendarDays size={13} className="text-muted-foreground shrink-0" /><span>{formatDateTime(a.dataHoraInicio)}</span></div>
                {a.localizacaoMedico && (
                  <div className="flex items-center gap-2"><Truck size={13} className="text-muted-foreground shrink-0" />
                    <a href={a.localizacaoMedico} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary hover:underline transition-colors">Acompanhar médico</a>
                  </div>
                )}
              </div>

              {(podeCancel(a) || proximoStatus(a) !== null) && (
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                  {podeCancel(a) ? (
                    <Button variant="ghost" size="sm" onClick={() => { setCancelandoItem(a); setOrigemCancelamento('PACIENTE'); setMotivoCancelamento('') }}>
                      <XCircle size={13} /> Cancelar
                    </Button>
                  ) : <span />}
                  {proximoStatus(a) !== null && (
                    <Button size="sm" disabled={atualizandoId === a.id}
                      onClick={async () => {
                        const next = proximoStatus(a)
                        if (!next) return
                        if (next === 'A_CAMINHO') { setACaminhoItem(a); setLinkLocalizacao(''); return }
                        setAtualizandoId(a.id)
                        try { await atualizarStatus(a.id, next) } finally { setAtualizandoId(null) }
                      }}>
                      {atualizandoId === a.id ? '…' : PROXIMO_LABEL[proximoStatus(a)!]}
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Modal wizard */}
      <Modal open={wizardAberto} onClose={() => { setWizardAberto(false); resetWizard() }} title={WIZARD_TITLES[passo - 1]} size="lg"
        footer={
          <>
            {passo > 1 && <Button variant="outline" onClick={() => { setWizardError(null); setPasso((p) => p - 1) }} disabled={salvando}><ChevronLeft size={15} /> Anterior</Button>}
            {passo < 5
              ? <Button onClick={() => { if (podeAvancar()) { setWizardError(null); setPasso((p) => p + 1) } }} disabled={!podeAvancar()}>Próximo <ChevronRight size={15} /></Button>
              : <Button onClick={confirmar} disabled={salvando}>{salvando ? 'Salvando…' : <><CheckCircle2 size={15} /> Confirmar</>}</Button>}
          </>
        }>
        {wizardError && <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{wizardError}</div>}

        {passo === 1 && (
          <div className="space-y-3">
            <Input placeholder="Buscar por nome ou CPF…" value={buscaPaciente} onChange={(e) => setBuscaPaciente(e.target.value)} />
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {pacientesFiltrados.length === 0
                ? <p className="py-6 text-center text-sm text-muted-foreground">Nenhum paciente encontrado</p>
                : pacientesFiltrados.map((p) => (
                  <SelectRow key={p.id} selected={selectedPaciente?.id === p.id} onClick={() => setSelectedPaciente(p)}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{p.nome}</span>
                      <span className="text-muted-foreground text-xs">{maskCPF(p.cpf)}</span>
                    </div>
                  </SelectRow>
                ))}
            </div>
          </div>
        )}

        {passo === 2 && (
          <div className="space-y-3">
            <Input placeholder="Buscar por serviço ou médico…" value={buscaServico} onChange={(e) => setBuscaServico(e.target.value)} />
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {servicosFiltrados.length === 0
                ? <p className="py-6 text-center text-sm text-muted-foreground">Nenhum serviço encontrado</p>
                : servicosFiltrados.map((s) => {
                  const m = medicosMap[s.medicoId]
                  return (
                    <SelectRow key={s.id} selected={selectedServico?.id === s.id} onClick={() => setSelectedServico(s)}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{s.nome}</span>
                        <span className="text-primary font-bold">{formatBRL(s.preco)}</span>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                        {m && <span>{m.nome}</span>}
                        {s.duracaoMinutos && <span>{s.duracaoMinutos} min</span>}
                      </div>
                    </SelectRow>
                  )
                })}
            </div>
          </div>
        )}

        {passo === 3 && (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo de atendimento</p>
              <div className="grid grid-cols-3 gap-2">
                {(['PRESENCIAL', 'DOMICILIAR', 'TELEMEDICINA'] as TipoAgendamento[]).map((t) => (
                  <button key={t} type="button" onClick={() => { setSelectedTipo(t); setSelectedEstabelecimento(null) }}
                    className={cn('rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all duration-200',
                      selectedTipo === t ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border bg-input hover:border-primary/30 text-foreground')}>
                    {TIPO_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>
            {selectedTipo === 'DOMICILIAR' ? (
              <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Endereço do paciente</p>
                {selectedPaciente?.logradouro
                  ? <p className="text-sm text-foreground">{[selectedPaciente.logradouro, selectedPaciente.numero, selectedPaciente.complemento, selectedPaciente.bairro, selectedPaciente.cidade && selectedPaciente.uf ? `${selectedPaciente.cidade}/${selectedPaciente.uf}` : (selectedPaciente.cidade ?? selectedPaciente.uf)].filter(Boolean).join(', ')}</p>
                  : <p className="text-sm text-muted-foreground italic">Endereço não cadastrado. Confirme antes do atendimento.</p>}
              </div>
            ) : (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estabelecimento</p>
                {loadingEstabelecimentos
                  ? <p className="py-4 text-center text-sm text-muted-foreground">Carregando…</p>
                  : estabelecimentos.length === 0
                    ? <p className="py-4 text-center text-sm text-muted-foreground">Nenhum estabelecimento encontrado para este médico</p>
                    : <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                      {estabelecimentos.map((e) => (
                        <SelectRow key={e.id} selected={selectedEstabelecimento?.id === e.id} onClick={() => setSelectedEstabelecimento(e)}>
                          <p className="font-semibold">{e.nome}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{e.logradouro}, {e.numero} — {e.cidade}/{e.uf}</p>
                        </SelectRow>
                      ))}
                    </div>}
              </div>
            )}
          </div>
        )}

        {passo === 4 && (
          <div className="space-y-4">
            <Input label="Data da consulta" type="date" value={dataSelecionada} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDataSelecionada(e.target.value)} />
            {dataSelecionada && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Horários disponíveis</p>
                {loadingSlots
                  ? <p className="py-4 text-center text-sm text-muted-foreground">Carregando horários…</p>
                  : slots.length === 0
                    ? <p className="py-4 text-center text-sm text-muted-foreground">Sem horários disponíveis nesta data</p>
                    : <div className="grid max-h-52 grid-cols-3 gap-2 overflow-y-auto pr-1">
                      {slots.map((slot) => (
                        <button key={slot.dataHoraInicio} type="button" onClick={() => setSelectedSlot(slot)}
                          className={cn('rounded-xl border px-3 py-2 text-sm flex items-center justify-center gap-1 font-semibold transition-all',
                            selectedSlot?.dataHoraInicio === slot.dataHoraInicio ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border bg-input hover:border-primary/30 text-foreground')}>
                          <Clock size={12} className="text-muted-foreground" />
                          {formatTime(slot.dataHoraInicio)}
                        </button>
                      ))}
                    </div>}
              </div>
            )}
          </div>
        )}

        {passo === 5 && selectedPaciente && selectedServico && selectedSlot && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-3">
              <SummaryRow icon={<User size={14} />} label="Paciente">{selectedPaciente.nome}</SummaryRow>
              <SummaryRow icon={<Stethoscope size={14} />} label="Serviço">
                {selectedServico.nome}{medicosMap[selectedServico.medicoId] && <span className="ml-2 text-muted-foreground">• {medicosMap[selectedServico.medicoId].nome}</span>}
              </SummaryRow>
              <SummaryRow icon={selectedTipo === 'DOMICILIAR' ? <Home size={14} /> : <Building2 size={14} />} label="Tipo / Local">
                {selectedTipo === 'DOMICILIAR' ? `Domiciliar — ${selectedPaciente.cidade ?? 'endereço do paciente'}` : selectedEstabelecimento?.nome ?? '—'}
              </SummaryRow>
              <SummaryRow icon={<CalendarDays size={14} />} label="Data e hora">
                {formatDateTime(selectedSlot.dataHoraInicio)} — {formatTime(selectedSlot.dataHoraFim)}
              </SummaryRow>
              <SummaryRow icon={<Clock size={14} />} label="Duração">{selectedSlot.duracaoMinutos} minutos</SummaryRow>
              <SummaryRow icon={<CreditCard size={14} />} label="Valor">
                {(() => {
                  const base = selectedServico.preco ?? 0
                  const taxa = selectedTipo === 'DOMICILIAR' ? (selectedServico.taxaDeslocamento ?? 0) : 0
                  return taxa > 0 ? `${formatBRL(base + taxa)} (serviço ${formatBRL(base)} + deslocamento ${formatBRL(taxa)})` : formatBRL(base)
                })()}
              </SummaryRow>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Observações (opcional)</label>
              <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3}
                className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none resize-none transition-all focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
                placeholder="Informações adicionais para o médico…" />
            </div>
          </div>
        )}
      </Modal>

      {/* Modal A Caminho */}
      <Modal open={aCaminhoItem !== null} onClose={() => setACaminhoItem(null)} title="Compartilhar Localização"
        footer={
          <>
            <Button variant="ghost" onClick={() => setACaminhoItem(null)} disabled={salvandoACaminho}>Cancelar</Button>
            <Button disabled={salvandoACaminho || !linkLocalizacao.trim()}
              onClick={async () => {
                if (!aCaminhoItem) return
                setSalvandoACaminho(true)
                try { await atualizarStatus(aCaminhoItem.id, 'A_CAMINHO', linkLocalizacao.trim()); setACaminhoItem(null) }
                catch (err) { alert((err as Error).message) } finally { setSalvandoACaminho(false) }
              }}>
              <Truck size={14} />{salvandoACaminho ? 'Confirmando…' : 'Confirmar partida'}
            </Button>
          </>
        }>
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-3">
            {[{n:1,t:'Abra o Google Maps no seu celular'},{n:2,t:'Toque na foto de perfil → "Compartilhar localização em tempo real"'},{n:3,t:'Defina a duração desejada (ex: 2 horas)'},{n:4,t:'Toque em "Copiar link" e cole abaixo'}].map(({n,t}) => (
              <div key={n} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{n}</span>
                <span className="text-sm text-foreground/80 pt-0.5">{t}</span>
              </div>
            ))}
          </div>
          <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors">
            <MapPin size={15} /> Abrir Google Maps
          </a>
          <Input label="Link de localização em tempo real" type="url" value={linkLocalizacao} onChange={(e) => setLinkLocalizacao(e.target.value)} placeholder="https://maps.app.goo.gl/..." />
        </div>
      </Modal>

      {/* Modal Cancelar */}
      <Modal open={cancelandoItem !== null} onClose={() => setCancelandoItem(null)} title="Cancelar Agendamento"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelandoItem(null)} disabled={cancelando}>Voltar</Button>
            <Button variant="danger" onClick={confirmarCancelamento} disabled={cancelando || !motivoCancelamento.trim()}>
              {cancelando ? 'Cancelando…' : 'Confirmar Cancelamento'}
            </Button>
          </>
        }>
        <div className="space-y-4">
          <SelectField label="Origem" value={origemCancelamento} onChange={(e) => setOrigemCancelamento(e.target.value as OrigemCancelamento)}>
            <option value="PACIENTE">Paciente</option>
            <option value="MEDICO">Médico</option>
            <option value="ESTABELECIMENTO">Estabelecimento</option>
            <option value="SISTEMA">Sistema</option>
          </SelectField>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Motivo</label>
            <textarea value={motivoCancelamento} onChange={(e) => setMotivoCancelamento(e.target.value)} rows={3}
              className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none resize-none transition-all focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
              placeholder="Informe o motivo do cancelamento…" />
          </div>
        </div>
      </Modal>
    </div>
  )
}

function SummaryRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm text-foreground">{children}</p>
      </div>
    </div>
  )
}
