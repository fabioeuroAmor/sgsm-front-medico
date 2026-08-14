import { useEffect, useState } from 'react'
import {
  UserPlus, Users, AlertTriangle, Plus, X, Phone, Mail,
  MessageSquare, FileText, ChevronDown, Search, Loader2,
  BarChart2, TrendingUp, DollarSign, Activity, Star, XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import crmService, { type Contato, type KpisData, type Lead, type NotaClinica, type Tag } from '@/services/crmService'
import { pacienteService } from '@/services/pacienteService'
import type { PacienteResponse } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

// ── helpers ──────────────────────────────────────────────────────────────────

const STATUS_LEAD = ['NOVO', 'CONTATADO', 'QUALIFICADO', 'CONVERTIDO', 'PERDIDO'] as const
const STATUS_COLORS: Record<string, string> = {
  NOVO:        'bg-blue-500/15 text-blue-300 border-blue-500/30',
  CONTATADO:   'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  QUALIFICADO: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  CONVERTIDO:  'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  PERDIDO:     'bg-red-500/15 text-red-300 border-red-500/30',
}
const ORIGEM_OPTS = ['SITE', 'INDICACAO', 'REDES_SOCIAIS', 'TELEFONE', 'CAMPANHA', 'OUTRO']
const TIPO_CONTATO = ['LIGACAO', 'EMAIL', 'WHATSAPP', 'SMS', 'PRESENCIAL']
const TIPO_NOTA = ['ANAMNESE', 'EVOLUCAO', 'OBSERVACAO', 'RETORNO', 'OUTRO']

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border', color)}>
      {label}
    </span>
  )
}

function fmt(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtBRL(v: number | null | undefined) {
  if (v == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function fmtMes(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

function fmtPct(v: number | null | undefined) {
  if (v == null) return '—'
  return Number(v).toFixed(1) + '%'
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidTelefone(telefone: string) {
  const d = telefone.replace(/\D/g, '')
  return d.length === 10 || d.length === 11
}

// ── Leads Tab ────────────────────────────────────────────────────────────────

function LeadsTab() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [filtroStatus, setFiltroStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [modalCriar, setModalCriar] = useState(false)
  const [modalStatus, setModalStatus] = useState<Lead | null>(null)
  const [novoStatus, setNovoStatus] = useState('')
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', interesse: '', origem: 'OUTRO', observacoes: '' })
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    setLoading(true)
    try {
      setLeads(await crmService.listarLeads(filtroStatus || undefined))
    } catch { toast.error('Erro ao carregar leads') } finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [filtroStatus])

  async function salvarLead() {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return }
    if (form.email && !isValidEmail(form.email)) { toast.error('E-mail inválido'); return }
    if (form.telefone && !isValidTelefone(form.telefone)) { toast.error('Telefone inválido'); return }
    if (form.interesse && form.interesse.trim().length < 3) { toast.error('Interesse deve ter pelo menos 3 caracteres'); return }
    setSalvando(true)
    try {
      await crmService.criarLead(form)
      toast.success('Lead criado')
      setModalCriar(false)
      setForm({ nome: '', email: '', telefone: '', interesse: '', origem: 'OUTRO', observacoes: '' })
      carregar()
    } catch (e) { toast.error((e as Error).message) } finally { setSalvando(false) }
  }

  async function salvarStatus() {
    if (!modalStatus || !novoStatus) return
    setSalvando(true)
    try {
      await crmService.atualizarStatusLead(modalStatus.id, novoStatus)
      toast.success('Status atualizado')
      setModalStatus(null)
      carregar()
    } catch (e) { toast.error((e as Error).message) } finally { setSalvando(false) }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-[hsl(190,100%,14%)] p-1 rounded-xl flex-wrap">
          {['', ...STATUS_LEAD].map((s) => (
            <button
              key={s}
              onClick={() => setFiltroStatus(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                filtroStatus === s
                  ? 'bg-[hsl(184,80%,25%)] text-white'
                  : 'text-[hsl(185,59%,65%)] hover:text-white',
              )}
            >
              {s || 'Todos'}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <Button onClick={() => setModalCriar(true)} size="sm">
            <UserPlus size={14} /> Novo Lead
          </Button>
        </div>
      </div>

      {loading && <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-[hsl(184,80%,50%)]" /></div>}

      {!loading && leads.length === 0 && (
        <div className="text-center py-16 text-[hsl(185,59%,55%)]">Nenhum lead encontrado</div>
      )}

      {!loading && leads.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[hsl(190,100%,20%)]">
          <table className="w-full text-sm">
            <thead className="bg-[hsl(190,100%,12%)] text-[hsl(185,59%,55%)] text-xs uppercase tracking-wide">
              <tr>
                {['Nome', 'Contato', 'Interesse', 'Origem', 'Status', 'Criado', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(190,100%,18%)]">
              {leads.map((l) => (
                <tr key={l.id} className="bg-[hsl(190,100%,10%)] hover:bg-[hsl(190,100%,13%)] transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{l.nome}</td>
                  <td className="px-4 py-3 text-[hsl(185,59%,75%)]">
                    <div>{l.email}</div>
                    {l.telefone && <div className="text-xs text-[hsl(185,59%,50%)]">{l.telefone}</div>}
                  </td>
                  <td className="px-4 py-3 text-[hsl(185,59%,75%)] max-w-[180px] truncate">{l.interesse || '—'}</td>
                  <td className="px-4 py-3 text-[hsl(185,59%,55%)] text-xs">{l.origem}</td>
                  <td className="px-4 py-3">
                    <Chip label={l.status} color={STATUS_COLORS[l.status] ?? 'bg-muted/20 text-muted-foreground border-border'} />
                  </td>
                  <td className="px-4 py-3 text-[hsl(185,59%,50%)] text-xs">{fmt(l.criado_em)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setModalStatus(l); setNovoStatus(l.status) }}
                      className="flex items-center gap-1 text-xs text-[hsl(184,80%,50%)] hover:text-white transition-colors"
                    >
                      Mover <ChevronDown size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Criar Lead */}
      <Modal open={modalCriar} onClose={() => setModalCriar(false)} title="Novo Lead"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setModalCriar(false)}>Cancelar</Button>
            <Button onClick={salvarLead} disabled={salvando} size="sm">{salvando ? 'Salvando…' : 'Salvar'}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input label="Nome *" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ana Lima" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="E-mail" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <Input label="Telefone" value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} />
          </div>
          <Input label="Interesse" value={form.interesse} onChange={(e) => setForm((f) => ({ ...f, interesse: e.target.value }))} placeholder="Consulta cardiológica" />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Origem</label>
            <select value={form.origem} onChange={(e) => setForm((f) => ({ ...f, origem: e.target.value }))}
              className="rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
              {ORIGEM_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Observações</label>
            <textarea value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} rows={2}
              className="rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground outline-none resize-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
      </Modal>

      {/* Modal Atualizar Status */}
      <Modal open={!!modalStatus} onClose={() => setModalStatus(null)} title="Mover Lead no Pipeline" size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setModalStatus(null)}>Cancelar</Button>
            <Button onClick={salvarStatus} disabled={salvando} size="sm">{salvando ? 'Salvando…' : 'Confirmar'}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-2">
          {STATUS_LEAD.map((s) => (
            <button
              key={s}
              onClick={() => setNovoStatus(s)}
              className={cn(
                'flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors',
                novoStatus === s
                  ? STATUS_COLORS[s] + ' ring-2 ring-current/30'
                  : 'border-border text-foreground/60 hover:border-border/80',
              )}
            >
              {s}
              {novoStatus === s && <span className="text-xs opacity-70">selecionado</span>}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}

// ── Paciente 360 Tab ──────────────────────────────────────────────────────────

function Paciente360Tab() {
  const [pacientes, setPacientes] = useState<PacienteResponse[]>([])
  const [busca, setBusca] = useState('')
  const [selecionado, setSelecionado] = useState<PacienteResponse | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [subTab, setSubTab] = useState<'tags' | 'contatos' | 'notas'>('tags')
  const [tags, setTags] = useState<Tag[]>([])
  const [contatos, setContatos] = useState<Contato[]>([])
  const [notas, setNotas] = useState<NotaClinica[]>([])
  const [novaTag, setNovaTag] = useState('')
  const [modalContato, setModalContato] = useState(false)
  const [modalNota, setModalNota] = useState(false)
  const [formContato, setFormContato] = useState({ tipo: 'LIGACAO', direcao: 'SAIDA', descricao: '', duracaoSegundos: '' })
  const [formNota, setFormNota] = useState({ tipo: 'OBSERVACAO', conteudo: '' })
  const [salvando, setSalvando] = useState(false)
  const [loadingDetalhe, setLoadingDetalhe] = useState(false)

  useEffect(() => {
    pacienteService.listar({ ativo: true }).then(setPacientes).catch(() => {})
  }, [])

  const filtrados = pacientes.filter((p) =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) || p.cpf.includes(busca),
  )

  async function selecionar(p: PacienteResponse) {
    setSelecionado(p)
    setBusca(p.nome)
    setShowDropdown(false)
    setLoadingDetalhe(true)
    try {
      const [t, c, n] = await Promise.all([
        crmService.listarTags(p.id),
        crmService.listarContatos(p.id),
        crmService.listarNotas(p.id),
      ])
      setTags(t)
      setContatos(c)
      setNotas(n)
    } catch { toast.error('Erro ao carregar dados do paciente') } finally { setLoadingDetalhe(false) }
  }

  async function adicionarTag() {
    if (!novaTag.trim() || !selecionado) return
    try {
      await crmService.adicionarTag(selecionado.id, novaTag.trim())
      setNovaTag('')
      setTags(await crmService.listarTags(selecionado.id))
    } catch (e) { toast.error((e as Error).message) }
  }

  async function removerTag(id: string) {
    try {
      await crmService.removerTag(id)
      setTags((prev) => prev.filter((t) => t.id !== id))
    } catch (e) { toast.error((e as Error).message) }
  }

  async function salvarContato() {
    if (!selecionado || !formContato.descricao) return
    setSalvando(true)
    try {
      await crmService.registrarContato(selecionado.id, {
        tipo: formContato.tipo,
        direcao: formContato.direcao,
        descricao: formContato.descricao,
        duracaoSegundos: formContato.duracaoSegundos ? Number(formContato.duracaoSegundos) : undefined,
      })
      toast.success('Contato registrado')
      setModalContato(false)
      setFormContato({ tipo: 'LIGACAO', direcao: 'SAIDA', descricao: '', duracaoSegundos: '' })
      setContatos(await crmService.listarContatos(selecionado.id))
    } catch (e) { toast.error((e as Error).message) } finally { setSalvando(false) }
  }

  async function salvarNota() {
    if (!selecionado || !formNota.conteudo) return
    setSalvando(true)
    try {
      await crmService.adicionarNota(selecionado.id, formNota)
      toast.success('Nota adicionada')
      setModalNota(false)
      setFormNota({ tipo: 'OBSERVACAO', conteudo: '' })
      setNotas(await crmService.listarNotas(selecionado.id))
    } catch (e) { toast.error((e as Error).message) } finally { setSalvando(false) }
  }

  const tipoContatoIcon: Record<string, React.ReactNode> = {
    LIGACAO: <Phone size={12} />, EMAIL: <Mail size={12} />,
    WHATSAPP: <MessageSquare size={12} />, SMS: <MessageSquare size={12} />,
    PRESENCIAL: <Users size={12} />,
  }

  return (
    <div className="space-y-4">
      {/* Patient search */}
      <div className="relative">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar paciente por nome ou CPF…"
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setShowDropdown(true); if (!e.target.value) setSelecionado(null) }}
            onFocus={() => setShowDropdown(true)}
            className="w-full rounded-xl border border-border bg-input py-2.5 pl-9 pr-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {showDropdown && busca && (
          <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-xl shadow-xl max-h-56 overflow-y-auto">
            {filtrados.slice(0, 10).map((p) => (
              <button
                key={p.id}
                onMouseDown={() => selecionar(p)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted text-left transition-colors"
              >
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Users size={13} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{p.nome}</p>
                  <p className="text-xs text-muted-foreground">{p.cpf}</p>
                </div>
              </button>
            ))}
            {filtrados.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted-foreground">Nenhum paciente encontrado</p>
            )}
          </div>
        )}
      </div>

      {!selecionado && (
        <div className="text-center py-16 text-[hsl(185,59%,55%)]">
          <Users size={40} className="mx-auto mb-3 opacity-40" />
          <p>Selecione um paciente para ver o perfil completo</p>
        </div>
      )}

      {selecionado && (
        <div className="space-y-4">
          {/* Patient header card */}
          <Card className="flex items-center gap-4 p-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Users size={22} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-secondary text-lg leading-tight">{selecionado.nome}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{selecionado.cpf} · {selecionado.email}</p>
            </div>
            {loadingDetalhe && <Loader2 size={18} className="animate-spin text-primary shrink-0" />}
          </Card>

          {/* Sub tabs */}
          <div className="flex gap-1 bg-card border border-border p-1 rounded-xl w-fit">
            {(['tags', 'contatos', 'notas'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setSubTab(t)}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors',
                  subTab === t ? 'bg-primary text-primary-foreground' : 'text-foreground/60 hover:text-foreground',
                )}
              >
                {t === 'tags' ? `Tags (${tags.length})` : t === 'contatos' ? `Contatos (${contatos.length})` : `Notas (${notas.length})`}
              </button>
            ))}
          </div>

          {/* Tags section */}
          {subTab === 'tags' && (
            <Card className="p-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <span key={t.id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                    {t.tag}
                    <button onClick={() => removerTag(t.id)} className="hover:text-destructive transition-colors">
                      <X size={11} />
                    </button>
                  </span>
                ))}
                {tags.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma tag. Adicione abaixo.</p>}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nova tag (ex: hipertenso, diabético)…"
                  value={novaTag}
                  onChange={(e) => setNovaTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && adicionarTag()}
                  className="flex-1 rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
                <Button onClick={adicionarTag} size="sm" disabled={!novaTag.trim()}>
                  <Plus size={14} /> Adicionar
                </Button>
              </div>
            </Card>
          )}

          {/* Contacts section */}
          {subTab === 'contatos' && (
            <Card className="p-4 space-y-3">
              <div className="flex justify-end">
                <Button onClick={() => setModalContato(true)} size="sm"><Plus size={14} /> Registrar Contato</Button>
              </div>
              {contatos.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhum contato registrado</p>}
              <div className="space-y-2">
                {contatos.map((c) => (
                  <div key={c.id} className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
                    <div className="h-7 w-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                      {tipoContatoIcon[c.tipo] ?? <Phone size={12} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-accent">{c.tipo}</span>
                        <span className={cn('text-xs px-1.5 py-0.5 rounded border', c.direcao === 'ENTRADA' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20')}>
                          {c.direcao}
                        </span>
                        {c.duracao_segundos && <span className="text-xs text-muted-foreground">{Math.floor(c.duracao_segundos / 60)}min</span>}
                        <span className="text-xs text-muted-foreground ml-auto">{fmt(c.criado_em)}</span>
                      </div>
                      <p className="text-sm text-foreground/80 mt-1">{c.descricao}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Notes section */}
          {subTab === 'notas' && (
            <Card className="p-4 space-y-3">
              <div className="flex justify-end">
                <Button onClick={() => setModalNota(true)} size="sm"><FileText size={14} /> Nova Nota</Button>
              </div>
              {notas.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhuma nota clínica</p>}
              <div className="space-y-2">
                {notas.map((n) => (
                  <div key={n.id} className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-semibold text-primary">{n.tipo}</span>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {n.medico_nome && <span>{n.medico_nome}</span>}
                        <span>{fmt(n.criado_em)}</span>
                      </div>
                    </div>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">{n.conteudo}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Modal Contato */}
      <Modal open={modalContato} onClose={() => setModalContato(false)} title="Registrar Contato"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setModalContato(false)}>Cancelar</Button>
            <Button onClick={salvarContato} disabled={salvando} size="sm">{salvando ? 'Salvando…' : 'Salvar'}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo</label>
              <select value={formContato.tipo} onChange={(e) => setFormContato((f) => ({ ...f, tipo: e.target.value }))}
                className="rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
                {TIPO_CONTATO.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Direção</label>
              <select value={formContato.direcao} onChange={(e) => setFormContato((f) => ({ ...f, direcao: e.target.value }))}
                className="rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
                <option value="SAIDA">SAIDA</option>
                <option value="ENTRADA">ENTRADA</option>
              </select>
            </div>
          </div>
          <Input label="Duração (segundos)" type="number" value={formContato.duracaoSegundos}
            onChange={(e) => setFormContato((f) => ({ ...f, duracaoSegundos: e.target.value }))} placeholder="120" />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descrição *</label>
            <textarea value={formContato.descricao} onChange={(e) => setFormContato((f) => ({ ...f, descricao: e.target.value }))} rows={3}
              className="rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground outline-none resize-none focus:ring-2 focus:ring-ring" placeholder="Resumo do contato…" />
          </div>
        </div>
      </Modal>

      {/* Modal Nota */}
      <Modal open={modalNota} onClose={() => setModalNota(false)} title="Nova Nota Clínica"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setModalNota(false)}>Cancelar</Button>
            <Button onClick={salvarNota} disabled={salvando} size="sm">{salvando ? 'Salvando…' : 'Salvar'}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo de Nota</label>
            <select value={formNota.tipo} onChange={(e) => setFormNota((f) => ({ ...f, tipo: e.target.value }))}
              className="rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
              {TIPO_NOTA.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conteúdo *</label>
            <textarea value={formNota.conteudo} onChange={(e) => setFormNota((f) => ({ ...f, conteudo: e.target.value }))} rows={5}
              className="rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground outline-none resize-none focus:ring-2 focus:ring-ring" placeholder="Evolução do paciente…" />
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Churn Tab ─────────────────────────────────────────────────────────────────

function ChurnTab() {
  const [lista, setLista] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    crmService.churn()
      .then(setLista)
      .catch(() => toast.error('Erro ao carregar lista de churn'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[hsl(184,80%,50%)]" /></div>
  if (lista.length === 0) return <div className="text-center py-16 text-muted-foreground">Nenhum paciente em risco de churn — ótimo sinal!</div>

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 stagger-children">
      {lista.map((row, i) => {
        const nome = String(row['nome'] ?? row['paciente_nome'] ?? '—')
        const dias = String(row['dias_sem_consulta'] ?? row['dias'] ?? '?')
        const email = String(row['email'] ?? '')
        const ultimaConsulta = String(row['ultima_consulta'] ?? row['ultimo_agendamento'] ?? '')
        return (
          <Card key={i} className="flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between">
              <div className="h-9 w-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <AlertTriangle size={16} className="text-orange-400" />
              </div>
              <span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                {dias} dias
              </span>
            </div>
            <div>
              <h3 className="font-bold text-secondary">{nome}</h3>
              {email && <p className="text-xs text-muted-foreground mt-0.5">{email}</p>}
            </div>
            {ultimaConsulta && (
              <p className="text-xs text-muted-foreground border-t border-border pt-2">
                Última consulta: {fmt(ultimaConsulta)}
              </p>
            )}
          </Card>
        )
      })}
    </div>
  )
}

// ── Analytics helpers ─────────────────────────────────────────────────────────

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm font-bold text-[hsl(184,80%,60%)] uppercase tracking-wider">
      {icon}{children}
    </div>
  )
}

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card className="p-4 flex flex-col gap-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-2xl font-extrabold text-secondary">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </Card>
  )
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────

function AnalyticsTab() {
  const [kpis, setKpis] = useState<KpisData | null>(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    crmService.kpis()
      .then(setKpis)
      .catch(() => setErro('Erro ao carregar analytics. Verifique se o sgsm-ia está online.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[hsl(184,80%,50%)]" /></div>
  if (erro) return <div className="text-center py-16 text-destructive">{erro}</div>
  if (!kpis) return null

  const { resumo, faturamentoMensal, funilMedico, ocupacaoAgenda, pacientesAltoValor, cancelamentos } = kpis
  const maxReceita = Math.max(...faturamentoMensal.map((r) => Number(r.receita_bruta ?? 0)), 1)
  const semDados = faturamentoMensal.length === 0 && funilMedico.length === 0 && pacientesAltoValor.length === 0

  return (
    <div className="space-y-8">
      {/* 1 — Resumo Executivo */}
      <section className="space-y-3">
        <SectionTitle icon={<Activity size={14} />}>Resumo Executivo</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <MetricCard label="Agendamentos" value={resumo.total_agendamentos ?? '—'} sub={`${resumo.concluidos ?? 0} concluídos · ${resumo.cancelados ?? 0} cancelados`} />
          <MetricCard label="Taxa de Conversão" value={fmtPct(resumo.taxa_conversao_pct)} sub={`${resumo.no_shows ?? 0} no-shows`} />
          <MetricCard label="Receita Total" value={fmtBRL(resumo.receita_total)} sub={`Ticket médio ${fmtBRL(resumo.ticket_medio_geral)}`} />
          <MetricCard label="Total de Pacientes" value={resumo.total_pacientes ?? '—'} sub={`${resumo.novos_pacientes_30d ?? 0} novos em 30 dias`} />
          <MetricCard label="Médicos Ativos" value={resumo.medicos_ativos ?? '—'} />
          <MetricCard label="No-shows" value={resumo.no_shows ?? '—'} />
        </div>
        {resumo.atualizado_em && (
          <p className="text-xs text-muted-foreground text-right">
            Mat. view atualizada em: {new Date(resumo.atualizado_em).toLocaleString('pt-BR')}
          </p>
        )}
      </section>

      {/* 2 — Faturamento Mensal */}
      {faturamentoMensal.length > 0 && (
        <section className="space-y-3">
          <SectionTitle icon={<DollarSign size={14} />}>Faturamento Mensal</SectionTitle>
          <Card className="p-4 space-y-2.5">
            {[...faturamentoMensal].slice(0, 12).reverse().map((r, i) => {
              const val = Number(r.receita_bruta ?? 0)
              const pct = (val / maxReceita) * 100
              return (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <span className="w-20 shrink-0 text-right text-muted-foreground">{fmtMes(r.mes)}</span>
                  <div className="flex-1 bg-muted/30 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[hsl(184,80%,25%)] to-[hsl(184,80%,50%)] rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                      style={{ width: `${Math.max(pct, 1.5)}%` }}
                    >
                      {pct > 25 && <span className="text-white font-semibold text-[10px]">{fmtBRL(val)}</span>}
                    </div>
                  </div>
                  <span className="w-28 shrink-0 text-muted-foreground font-medium text-right">
                    {pct <= 25 ? fmtBRL(val) : ''}
                  </span>
                </div>
              )
            })}
          </Card>
        </section>
      )}

      {/* 3 — Funil + Ocupação */}
      <div className="grid lg:grid-cols-2 gap-6">
        {funilMedico.length > 0 && (
          <section className="space-y-3">
            <SectionTitle icon={<TrendingUp size={14} />}>Funil por Médico</SectionTitle>
            <div className="overflow-x-auto rounded-xl border border-[hsl(190,100%,20%)]">
              <table className="w-full text-xs">
                <thead className="bg-[hsl(190,100%,12%)] text-[hsl(185,59%,55%)] uppercase tracking-wide">
                  <tr>
                    {['Médico', 'Total', 'Concluídos', 'Conversão', 'Receita'].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(190,100%,18%)]">
                  {funilMedico.map((r, i) => (
                    <tr key={i} className="bg-[hsl(190,100%,10%)] hover:bg-[hsl(190,100%,13%)] transition-colors">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-white">{r.medico_nome}</p>
                        <p className="text-[hsl(185,59%,45%)] text-[10px]">{r.especialidade}</p>
                      </td>
                      <td className="px-3 py-2.5 text-[hsl(185,59%,75%)]">{r.total}</td>
                      <td className="px-3 py-2.5 text-emerald-400 font-semibold">{r.concluidos}</td>
                      <td className="px-3 py-2.5">
                        <span className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] font-bold',
                          Number(r.taxa_conversao_pct) >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
                          Number(r.taxa_conversao_pct) >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400',
                        )}>
                          {fmtPct(Number(r.taxa_conversao_pct))}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[hsl(184,80%,60%)] font-semibold">{fmtBRL(Number(r.receita_total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {ocupacaoAgenda.length > 0 && (
          <section className="space-y-3">
            <SectionTitle icon={<BarChart2 size={14} />}>Ocupação da Agenda</SectionTitle>
            <Card className="p-4 space-y-4">
              {ocupacaoAgenda.map((r, i) => {
                const pct = Math.min(Number(r.taxa_ocupacao_pct ?? 0), 100)
                return (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-medium text-foreground">{r.medico_nome}</span>
                        <span className="ml-1.5 text-muted-foreground text-[10px]">{r.especialidade}</span>
                      </div>
                      <span className={cn(
                        'font-bold',
                        pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400',
                      )}>
                        {fmtPct(r.taxa_ocupacao_pct)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500',
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">{r.slots_usados}/{r.slots_totais} slots usados</p>
                  </div>
                )
              })}
            </Card>
          </section>
        )}
      </div>

      {/* 4 — Alto Valor + Cancelamentos */}
      <div className="grid lg:grid-cols-2 gap-6">
        {pacientesAltoValor.length > 0 && (
          <section className="space-y-3">
            <SectionTitle icon={<Star size={14} />}>Pacientes Alto Valor (LTV)</SectionTitle>
            <Card className="p-4 space-y-1">
              {pacientesAltoValor.slice(0, 10).map((r, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                  <span className={cn(
                    'h-6 w-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                    i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                    i === 1 ? 'bg-slate-400/20 text-slate-300' :
                    i === 2 ? 'bg-orange-500/20 text-orange-400' : 'bg-muted text-muted-foreground',
                  )}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.nome}</p>
                    <p className="text-xs text-muted-foreground">{r.total_pagamentos} pgtos</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[hsl(184,80%,60%)]">{fmtBRL(Number(r.ltv_total))}</p>
                    {r.quintil === 5 && <p className="text-[10px] text-yellow-400">Top 20%</p>}
                  </div>
                </div>
              ))}
            </Card>
          </section>
        )}

        {cancelamentos.length > 0 && (
          <section className="space-y-3">
            <SectionTitle icon={<XCircle size={14} />}>Cancelamentos por Origem</SectionTitle>
            <div className="overflow-x-auto rounded-xl border border-[hsl(190,100%,20%)]">
              <table className="w-full text-xs">
                <thead className="bg-[hsl(190,100%,12%)] text-[hsl(185,59%,55%)] uppercase tracking-wide">
                  <tr>
                    {['Origem', 'Mês', 'Total', 'Pacientes'].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(190,100%,18%)]">
                  {cancelamentos.slice(0, 15).map((r, i) => (
                    <tr key={i} className="bg-[hsl(190,100%,10%)] hover:bg-[hsl(190,100%,13%)] transition-colors">
                      <td className="px-3 py-2.5">
                        <span className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] font-semibold',
                          r.origem_cancelamento === 'PACIENTE' ? 'bg-blue-500/20 text-blue-400' :
                          r.origem_cancelamento === 'MEDICO' ? 'bg-purple-500/20 text-purple-400' :
                          r.origem_cancelamento === 'ESTABELECIMENTO' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-muted/20 text-muted-foreground',
                        )}>
                          {r.origem_cancelamento}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{fmtMes(r.mes)}</td>
                      <td className="px-3 py-2.5 font-bold text-red-400">{r.total_cancelamentos}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{r.pacientes_distintos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {semDados && (
        <div className="text-center py-16 text-muted-foreground">
          <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Sem dados analíticos ainda</p>
          <p className="text-sm mt-1">Crie agendamentos e registre pagamentos para ver as métricas aqui.</p>
        </div>
      )}
    </div>
  )
}

// ── CrmPage ───────────────────────────────────────────────────────────────────

type CrmTab = 'leads' | '360' | 'churn' | 'analytics'

export function CrmPage() {
  const [tab, setTab] = useState<CrmTab>('leads')

  const tabs: { id: CrmTab; label: string; icon: React.ReactNode }[] = [
    { id: 'leads', label: 'Leads', icon: <UserPlus size={14} /> },
    { id: '360', label: 'Paciente 360', icon: <Users size={14} /> },
    { id: 'churn', label: 'Risco de Churn', icon: <AlertTriangle size={14} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={14} /> },
  ]

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[hsl(190,100%,10%)] via-[hsl(190,100%,14%)] to-[hsl(190,100%,18%)] flex items-center justify-between gap-6 min-h-[140px] pr-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(0,210,255,0.18),transparent_65%)] pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-3 p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-400/70">Relacionamento</p>
          <h1 className="text-3xl font-extrabold text-white leading-tight">CRM</h1>
          <p className="text-sm text-white/50 max-w-xs">Leads, visão 360 de pacientes, histórico de contatos e notas clínicas.</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 border-b border-border/50 pb-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px',
              tab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'leads' && <LeadsTab />}
      {tab === '360' && <Paciente360Tab />}
      {tab === 'churn' && <ChurnTab />}
      {tab === 'analytics' && <AnalyticsTab />}
    </div>
  )
}
