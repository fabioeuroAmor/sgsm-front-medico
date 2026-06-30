import { useEffect, useState, useRef } from 'react'
import { Plus, Search, Pencil, Trash2, Stethoscope, CalendarDays, X } from 'lucide-react'
import { useMedicos } from '@/hooks/useMedicos'
import { agendaMedicoService } from '@/services/agendaMedicoService'
import { agendamentoService } from '@/services/agendamentoService'
import type {
  AgendaMedicoResponse, CadastrarAgendaMedicoRequest, DiaSemana,
  EstabelecimentoResponse, MedicoResponse, CadastrarMedicoRequest,
} from '@/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input, SelectField } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'

const DIAS: { value: DiaSemana; label: string }[] = [
  { value: 'SEGUNDA', label: 'Segunda-feira' }, { value: 'TERCA', label: 'Terça-feira' },
  { value: 'QUARTA', label: 'Quarta-feira' }, { value: 'QUINTA', label: 'Quinta-feira' },
  { value: 'SEXTA', label: 'Sexta-feira' }, { value: 'SABADO', label: 'Sábado' },
  { value: 'DOMINGO', label: 'Domingo' },
]
const DURACOES = [15, 20, 30, 45, 60]
const ESPECIALIDADES = [
  'Cardiologia', 'Dermatologia', 'Endocrinologia', 'Ginecologia',
  'Neurologia', 'Oftalmologia', 'Ortopedia', 'Pediatria', 'Psiquiatria', 'Urologia',
]
const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']

const emptyForm: CadastrarMedicoRequest = { nome: '', crm: '', crmUf: 'SP', especialidade: '', email: '', telefone: '' }
const emptyAgendaForm: Omit<CadastrarAgendaMedicoRequest, 'medicoId'> = {
  estabelecimentoId: '', diaSemana: 'SEGUNDA', horaInicio: '08:00', horaFim: '18:00',
  duracaoSlotMinutos: 30, dataVigenciaInicio: new Date().toISOString().slice(0, 10),
  dataVigenciaFim: undefined, domiciliar: false, intervaloDeslocamentoMinutos: undefined,
  raioKm: undefined, cidadeAtendimento: '', ufAtendimento: '',
}

export function MedicosPage() {
  const { medicos, loading, error, listar, cadastrar, atualizar, remover } = useMedicos()
  const [busca, setBusca] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState<boolean | undefined>(undefined)
  const [filtroEsp, setFiltroEsp] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<MedicoResponse | null>(null)
  const [form, setForm] = useState<CadastrarMedicoRequest>(emptyForm)
  const [salvando, setSalvando] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)

  // agenda
  const [agendaMedico, setAgendaMedico] = useState<MedicoResponse | null>(null)
  const [agendas, setAgendas] = useState<AgendaMedicoResponse[]>([])
  const [estabsDoMedico, setEstabsDoMedico] = useState<EstabelecimentoResponse[]>([])
  const [loadingAgenda, setLoadingAgenda] = useState(false)
  const [agendaForm, setAgendaForm] = useState(emptyAgendaForm)
  const [salvandoAgenda, setSalvandoAgenda] = useState(false)
  const [erroAgenda, setErroAgenda] = useState<string | null>(null)
  const [mostrarFormAgenda, setMostrarFormAgenda] = useState(false)

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

  useEffect(() => { listar({ ativo: filtroAtivo, especialidade: filtroEsp || undefined }) }, [filtroAtivo, filtroEsp, listar])

  const medicosFiltrados = medicos.filter((m) =>
    m.nome.toLowerCase().includes(busca.toLowerCase()) ||
    m.crm.toLowerCase().includes(busca.toLowerCase()) ||
    m.email.toLowerCase().includes(busca.toLowerCase()),
  )

  function abrirCadastro() { setEditando(null); setForm(emptyForm); setFormError(null); setModalAberto(true) }

  function abrirEdicao(m: MedicoResponse) {
    setEditando(m)
    setForm({ nome: m.nome, crm: m.crm, crmUf: m.crmUf, especialidade: m.especialidade, email: m.email, telefone: m.telefone ?? '' })
    setFormError(null); setModalAberto(true)
  }

  async function salvar() {
    setSalvando(true); setFormError(null)
    try {
      if (editando) {
        await atualizar(editando.id, { nome: form.nome || undefined, especialidade: form.especialidade || undefined, email: form.email || undefined, telefone: form.telefone || undefined })
      } else { await cadastrar(form) }
      setModalAberto(false); setEditando(null)
    } catch (err) { setFormError((err as Error).message) } finally { setSalvando(false) }
  }

  async function abrirAgenda(m: MedicoResponse) {
    setAgendaMedico(m); setMostrarFormAgenda(false); setErroAgenda(null); setLoadingAgenda(true)
    try {
      const [lista, estabs] = await Promise.all([agendaMedicoService.listar(m.id), agendamentoService.getEstabelecimentosByMedico(m.id)])
      setAgendas(lista); setEstabsDoMedico(estabs)
      setAgendaForm({ ...emptyAgendaForm, estabelecimentoId: estabs[0]?.id ?? '' })
    } catch (err) { setErroAgenda((err as Error).message) } finally { setLoadingAgenda(false) }
  }

  async function salvarAgenda() {
    if (!agendaMedico) return
    setSalvandoAgenda(true); setErroAgenda(null)
    try {
      const nova = await agendaMedicoService.cadastrar({
        ...agendaForm, medicoId: agendaMedico.id,
        estabelecimentoId: agendaForm.domiciliar ? undefined : (agendaForm.estabelecimentoId || undefined),
        dataVigenciaFim: agendaForm.dataVigenciaFim || undefined,
        intervaloDeslocamentoMinutos: agendaForm.intervaloDeslocamentoMinutos || undefined,
        raioKm: agendaForm.raioKm || undefined,
        cidadeAtendimento: agendaForm.cidadeAtendimento || undefined,
        ufAtendimento: agendaForm.ufAtendimento || undefined,
      })
      setAgendas((prev) => [...prev, nova]); setMostrarFormAgenda(false)
      setAgendaForm({ ...emptyAgendaForm, estabelecimentoId: estabsDoMedico[0]?.id ?? '' })
    } catch (err) { setErroAgenda((err as Error).message) } finally { setSalvandoAgenda(false) }
  }

  async function removerAgenda(id: string) {
    try { await agendaMedicoService.remover(id); setAgendas((prev) => prev.filter((a) => a.id !== id)) }
    catch (err) { setErroAgenda((err as Error).message) }
  }

  return (
    <div className="space-y-6">
      {/* ── Hero banner ───────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#060e1f] via-[#0a1e3d] to-[#0d2a52] flex items-center justify-between gap-6 min-h-[200px] pr-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(0,210,255,0.18),transparent_65%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-3 p-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-400/70">Cadastros</p>
          <h1 className="text-3xl font-extrabold text-white leading-tight">Médicos</h1>
          <p className="text-sm text-white/50 max-w-xs">Gerencie os médicos, especialidades e disponibilidade de agenda.</p>
          <div className="mt-1">
            <Button onClick={abrirCadastro}><Plus size={16} strokeWidth={2} /> Novo Médico</Button>
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

      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-52">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Buscar por nome, CRM ou e-mail…" value={busca} onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-xl border border-border bg-input py-2 pl-9 pr-4 text-sm text-foreground outline-none transition-all focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60" />
          </div>
          <select value={filtroAtivo === undefined ? '' : String(filtroAtivo)} onChange={(e) => setFiltroAtivo(e.target.value === '' ? undefined : e.target.value === 'true')}
            className="rounded-xl border border-border bg-input px-4 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
            <option value="">Todos os status</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
          <select value={filtroEsp} onChange={(e) => setFiltroEsp(e.target.value)}
            className="rounded-xl border border-border bg-input px-4 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
            <option value="">Todas as especialidades</option>
            {ESPECIALIDADES.map((e) => <option key={e}>{e}</option>)}
          </select>
        </div>
      </Card>

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : medicosFiltrados.length === 0 ? <EmptyState /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {medicosFiltrados.map((m) => (
            <Card key={m.id} className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Stethoscope size={18} className="text-primary" />
                </div>
                <Badge variant={m.ativo ? 'active' : 'inactive'}>{m.ativo ? 'Ativo' : 'Inativo'}</Badge>
              </div>
              <div>
                <h3 className="font-bold text-secondary">{m.nome}</h3>
                <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{m.especialidade}</p>
              </div>
              <div className="space-y-1 border-t border-border pt-3 text-xs text-foreground/70">
                <p><span className="font-semibold">CRM:</span> {m.crm}/{m.crmUf}</p>
                <p className="truncate"><span className="font-semibold">E-mail:</span> {m.email}</p>
                {m.telefone && <p><span className="font-semibold">Tel:</span> {m.telefone}</p>}
              </div>
              <div className="flex gap-2 mt-auto">
                <Button variant="ghost" size="sm" onClick={() => abrirEdicao(m)} className="flex-1"><Pencil size={12} /> Editar</Button>
                <Button variant="outline" size="sm" onClick={() => abrirAgenda(m)} title="Gerenciar agenda"><CalendarDays size={12} /></Button>
                <Button variant="danger" size="sm" onClick={() => setConfirmandoId(m.id)} disabled={!m.ativo}><Trash2 size={12} /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal cadastro/edição */}
      <Modal open={modalAberto} onClose={() => { setModalAberto(false); setEditando(null) }} title={editando ? 'Editar Médico' : 'Novo Médico'}
        footer={<><Button variant="ghost" size="sm" onClick={() => { setModalAberto(false); setEditando(null) }}>Cancelar</Button><Button onClick={salvar} disabled={salvando} size="sm">{salvando ? 'Salvando…' : 'Salvar'}</Button></>}>
        <div className="flex flex-col gap-4">
          {formError && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{formError}</div>}
          <Input label="Nome completo" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Dr. João Silva" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="CRM" value={form.crm} onChange={(e) => setForm((f) => ({ ...f, crm: e.target.value }))} placeholder="123456" disabled={!!editando} />
            <SelectField label="UF do CRM" value={form.crmUf} onChange={(e) => setForm((f) => ({ ...f, crmUf: e.target.value }))} disabled={!!editando}>
              {UFS.map((uf) => <option key={uf}>{uf}</option>)}
            </SelectField>
          </div>
          <SelectField label="Especialidade" value={form.especialidade} onChange={(e) => setForm((f) => ({ ...f, especialidade: e.target.value }))}>
            <option value="">Selecione…</option>
            {ESPECIALIDADES.map((e) => <option key={e}>{e}</option>)}
          </SelectField>
          <Input label="E-mail" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="joao@clinica.com" />
          <Input label="Telefone (opcional)" value={form.telefone ?? ''} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} placeholder="(11) 99999-0000" />
        </div>
      </Modal>

      {/* Modal agenda */}
      <Modal open={agendaMedico !== null} onClose={() => setAgendaMedico(null)} title={`Agenda — ${agendaMedico?.nome ?? ''}`} size="lg"
        footer={
          mostrarFormAgenda ? (
            <><Button variant="ghost" size="sm" onClick={() => { setMostrarFormAgenda(false); setErroAgenda(null) }}>Cancelar</Button>
              <Button size="sm" onClick={salvarAgenda} disabled={salvandoAgenda || (!agendaForm.domiciliar && !agendaForm.estabelecimentoId)}>{salvandoAgenda ? 'Salvando…' : 'Salvar Horário'}</Button></>
          ) : (
            <Button size="sm" onClick={() => { setMostrarFormAgenda(true); setErroAgenda(null) }}><Plus size={13} /> Adicionar Horário</Button>
          )
        }>
        {erroAgenda && <div className="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{erroAgenda}</div>}
        {loadingAgenda ? (
          <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : (
          <div className="space-y-4">
            {agendas.length === 0 && !mostrarFormAgenda ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Nenhum horário cadastrado.</p>
            ) : (
              <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                {agendas.map((a) => (
                  <div key={a.id} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm ${a.ativo ? 'border-border bg-muted/50' : 'border-border bg-muted/50 opacity-50'}`}>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">{DIAS.find((d) => d.value === a.diaSemana)?.label} · {a.horaInicio}–{a.horaFim} · {a.duracaoSlotMinutos} min</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {a.domiciliar ? `Domiciliar${a.cidadeAtendimento ? ` · ${a.cidadeAtendimento}${a.ufAtendimento ? `/${a.ufAtendimento}` : ''}` : ''}${a.raioKm ? ` · raio ${a.raioKm} km` : ''}` : (a.estabelecimentoNome ?? a.estabelecimentoId ?? '—')}
                        {' · desde '}{a.dataVigenciaInicio}{a.dataVigenciaFim ? ` até ${a.dataVigenciaFim}` : ''}
                      </p>
                    </div>
                    {a.ativo && <button onClick={() => removerAgenda(a.id)} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"><X size={14} /></button>}
                  </div>
                ))}
              </div>
            )}
            {mostrarFormAgenda && (
              <div className="space-y-3 border-t border-border pt-4">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div onClick={() => setAgendaForm((f) => ({ ...f, domiciliar: !f.domiciliar }))}
                    className={`relative h-6 w-11 rounded-full transition-colors duration-300 ${agendaForm.domiciliar ? 'bg-primary' : 'bg-border'}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${agendaForm.domiciliar ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-sm font-medium text-foreground">Atendimento domiciliar</span>
                </label>
                {agendaForm.domiciliar ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Cidade" value={agendaForm.cidadeAtendimento ?? ''} onChange={(e) => setAgendaForm((f) => ({ ...f, cidadeAtendimento: e.target.value }))} placeholder="São Paulo" />
                      <Input label="UF" value={agendaForm.ufAtendimento ?? ''} onChange={(e) => setAgendaForm((f) => ({ ...f, ufAtendimento: e.target.value.toUpperCase().slice(0, 2) }))} placeholder="SP" maxLength={2} />
                    </div>
                    <Input label="Raio (km)" type="number" min={0} step={0.5} value={agendaForm.raioKm ?? ''} onChange={(e) => setAgendaForm((f) => ({ ...f, raioKm: e.target.value ? Number(e.target.value) : undefined }))} placeholder="20" />
                    <Input label="Intervalo entre atendimentos (min)" type="number" min={0} value={agendaForm.intervaloDeslocamentoMinutos ?? ''} onChange={(e) => setAgendaForm((f) => ({ ...f, intervaloDeslocamentoMinutos: e.target.value ? Number(e.target.value) : undefined }))} placeholder="30" />
                  </div>
                ) : (
                  <SelectField label="Estabelecimento" value={agendaForm.estabelecimentoId} onChange={(e) => setAgendaForm((f) => ({ ...f, estabelecimentoId: e.target.value }))}>
                    <option value="">Selecione…</option>
                    {estabsDoMedico.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </SelectField>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <SelectField label="Dia da semana" value={agendaForm.diaSemana} onChange={(e) => setAgendaForm((f) => ({ ...f, diaSemana: e.target.value as DiaSemana }))}>
                    {DIAS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </SelectField>
                  <SelectField label="Duração do slot" value={agendaForm.duracaoSlotMinutos} onChange={(e) => setAgendaForm((f) => ({ ...f, duracaoSlotMinutos: Number(e.target.value) }))}>
                    {DURACOES.map((d) => <option key={d} value={d}>{d} min</option>)}
                  </SelectField>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Hora início" type="time" value={agendaForm.horaInicio} onChange={(e) => setAgendaForm((f) => ({ ...f, horaInicio: e.target.value }))} />
                  <Input label="Hora fim" type="time" value={agendaForm.horaFim} onChange={(e) => setAgendaForm((f) => ({ ...f, horaFim: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Vigência início" type="date" value={agendaForm.dataVigenciaInicio} onChange={(e) => setAgendaForm((f) => ({ ...f, dataVigenciaInicio: e.target.value }))} />
                  <Input label="Vigência fim (opcional)" type="date" value={agendaForm.dataVigenciaFim ?? ''} onChange={(e) => setAgendaForm((f) => ({ ...f, dataVigenciaFim: e.target.value || undefined }))} />
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal confirmação */}
      <Modal open={!!confirmandoId} onClose={() => setConfirmandoId(null)} title="Inativar Médico" size="sm"
        footer={<><Button variant="ghost" size="sm" onClick={() => setConfirmandoId(null)}>Cancelar</Button><Button variant="danger" size="sm" onClick={async () => { if (confirmandoId) { await remover(confirmandoId); setConfirmandoId(null) } }}>Inativar</Button></>}>
        <p className="text-sm text-foreground/70">O médico será <strong>inativado</strong> e não aparecerá nas listagens padrão.</p>
      </Modal>
    </div>
  )
}
