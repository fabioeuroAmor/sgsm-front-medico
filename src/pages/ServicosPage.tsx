import { useEffect, useRef, useState } from 'react'
import { Plus, Search, Pencil, Trash2, ClipboardList, Clock, Home } from 'lucide-react'
import { useServicos } from '@/hooks/useServicos'
import { medicoService } from '@/services/medicoService'
import type {
  ServicoMedicoResponse, MedicoResponse,
  CadastrarServicoMedicoRequest,
} from '@/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input, SelectField } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'

const emptyForm: CadastrarServicoMedicoRequest = {
  medicoId: '', nome: '', descricao: '', preco: 0,
  duracaoMinutos: undefined, domiciliar: false, taxaDeslocamento: undefined,
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export function ServicosPage() {
  const { servicos, loading, error, listar, cadastrar, atualizar, remover } = useServicos()
  const [medicos, setMedicos] = useState<MedicoResponse[]>([])
  const [busca, setBusca] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState<boolean | undefined>(undefined)
  const [filtroMedicoId, setFiltroMedicoId] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<ServicoMedicoResponse | null>(null)
  const [form, setForm] = useState<CadastrarServicoMedicoRequest>(emptyForm)
  const [salvando, setSalvando] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)

  // 3D tilt effect state
  const tiltRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50 })
  const [hovering3d, setHovering3d] = useState(false)

  function onTiltMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = tiltRef.current
    if (!el) return
    const { left, top, width, height } = el.getBoundingClientRect()
    const px = (e.clientX - left) / width   // 0..1
    const py = (e.clientY - top) / height   // 0..1
    setTilt({ rx: (py - 0.5) * -26, ry: (px - 0.5) * 26, gx: px * 100, gy: py * 100 })
  }
  function onTiltLeave() {
    setHovering3d(false)
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 50 })
  }

  useEffect(() => { medicoService.listar({ ativo: true }).then(setMedicos).catch(() => {}) }, [])
  useEffect(() => { listar({ ativo: filtroAtivo, medicoId: filtroMedicoId || undefined }) }, [filtroAtivo, filtroMedicoId, listar])

  const filtrados = servicos.filter((s) =>
    s.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (s.descricao ?? '').toLowerCase().includes(busca.toLowerCase()),
  )

  function nomeMedico(id: string) {
    return medicos.find((m) => m.id === id)?.nome ?? id.slice(0, 8) + '…'
  }

  function abrirCadastro() { setEditando(null); setForm(emptyForm); setFormError(null); setModalAberto(true) }

  function abrirEdicao(s: ServicoMedicoResponse) {
    setEditando(s)
    setForm({ medicoId: s.medicoId, nome: s.nome, descricao: s.descricao ?? '', preco: s.preco, duracaoMinutos: s.duracaoMinutos, domiciliar: s.domiciliar ?? false, taxaDeslocamento: s.taxaDeslocamento })
    setFormError(null); setModalAberto(true)
  }

  async function salvar() {
    setSalvando(true); setFormError(null)
    try {
      if (editando) {
        await atualizar(editando.id, { nome: form.nome || undefined, descricao: form.descricao || undefined, preco: form.preco || undefined, duracaoMinutos: form.duracaoMinutos || undefined, domiciliar: form.domiciliar, taxaDeslocamento: form.taxaDeslocamento || undefined })
      } else { await cadastrar(form) }
      setModalAberto(false); setEditando(null)
    } catch (err) { setFormError((err as Error).message) } finally { setSalvando(false) }
  }

  return (
    <div className="space-y-6">
      {/* ── Hero banner ───────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[hsl(190,100%,10%)] via-[hsl(190,100%,14%)] to-[hsl(190,100%,18%)] flex items-center justify-between gap-6 min-h-[140px] pr-0">
        {/* Radial glow behind image */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(0,210,255,0.18),transparent_65%)] pointer-events-none" />

        {/* Left: title + button */}
        <div className="relative z-10 flex flex-col gap-3 p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-400/70">Cadastros</p>
          <h1 className="text-3xl font-extrabold text-white leading-tight">Serviços Médicos</h1>
          <p className="text-sm text-white/50 max-w-xs">Gerencie os serviços e procedimentos oferecidos pelos médicos cadastrados.</p>
          <div className="mt-1">
            <Button onClick={abrirCadastro}><Plus size={16} strokeWidth={2} /> Novo Serviço</Button>
          </div>
        </div>

        {/* Right: 3D tilt illustration */}
        <div
          className="relative hidden md:flex items-end justify-end flex-shrink-0 h-[145px] w-[110px] mr-6 cursor-pointer select-none"
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
              transition: hovering3d
                ? 'transform 0.07s linear'
                : 'transform 0.65s cubic-bezier(0.23,1,0.32,1)',
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

            {/* Glare overlay */}
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
            <input type="text" placeholder="Buscar por nome ou descrição…" value={busca} onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-xl border border-border bg-input py-2 pl-9 pr-4 text-sm text-foreground outline-none transition-all focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60" />
          </div>
          <select value={filtroAtivo === undefined ? '' : String(filtroAtivo)} onChange={(e) => setFiltroAtivo(e.target.value === '' ? undefined : e.target.value === 'true')}
            className="rounded-xl border border-border bg-input px-4 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
            <option value="">Todos os status</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
          <select value={filtroMedicoId} onChange={(e) => setFiltroMedicoId(e.target.value)}
            className="rounded-xl border border-border bg-input px-4 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
            <option value="">Todos os médicos</option>
            {medicos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </div>
      </Card>

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : filtrados.length === 0 ? <EmptyState /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((s) => (
            <Card key={s.id} className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                  <ClipboardList size={18} className="text-accent" />
                </div>
                <Badge variant={s.ativo ? 'active' : 'inactive'}>{s.ativo ? 'Ativo' : 'Inativo'}</Badge>
              </div>
              <div>
                <h3 className="font-bold text-secondary">{s.nome}</h3>
                <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{nomeMedico(s.medicoId)}</p>
              </div>
              {s.descricao && <p className="text-xs text-foreground/60 line-clamp-2">{s.descricao}</p>}
              <div className="space-y-1.5 border-t border-border pt-3">
                <p className="text-base font-bold text-primary">{formatCurrency(s.preco)}</p>
                <div className="flex gap-3 flex-wrap">
                  {s.duracaoMinutos && (
                    <span className="flex items-center gap-1 text-xs text-foreground/70"><Clock size={11} className="text-muted-foreground" />{s.duracaoMinutos} min</span>
                  )}
                  {s.domiciliar && (
                    <span className="flex items-center gap-1 text-xs text-foreground/70">
                      <Home size={11} className="text-muted-foreground" />
                      Domiciliar{s.taxaDeslocamento != null ? ` + ${formatCurrency(s.taxaDeslocamento)}` : ''}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-auto">
                <Button variant="ghost" size="sm" onClick={() => abrirEdicao(s)} className="flex-1"><Pencil size={12} /> Editar</Button>
                <Button variant="danger" size="sm" onClick={() => setConfirmandoId(s.id)} disabled={!s.ativo}><Trash2 size={12} /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal cadastro/edição */}
      <Modal open={modalAberto} onClose={() => { setModalAberto(false); setEditando(null) }} title={editando ? 'Editar Serviço' : 'Novo Serviço Médico'}
        footer={<><Button variant="ghost" size="sm" onClick={() => { setModalAberto(false); setEditando(null) }}>Cancelar</Button><Button onClick={salvar} disabled={salvando} size="sm">{salvando ? 'Salvando…' : 'Salvar'}</Button></>}>
        <div className="flex flex-col gap-4">
          {formError && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{formError}</div>}
          <SelectField label="Médico" value={form.medicoId} onChange={(e) => setForm((f) => ({ ...f, medicoId: e.target.value }))} disabled={!!editando}>
            <option value="">Selecione o médico…</option>
            {medicos.map((m) => <option key={m.id} value={m.id}>{m.nome} — {m.especialidade}</option>)}
          </SelectField>
          <Input label="Nome do Serviço" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Consulta de Rotina" />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descrição (opcional)</label>
            <textarea value={form.descricao ?? ''} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} placeholder="Descreva brevemente o serviço…" rows={3}
              className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none resize-none transition-all focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Preço (R$)" type="number" min={0} step={0.01} value={form.preco} onChange={(e) => setForm((f) => ({ ...f, preco: Number(e.target.value) }))} placeholder="150.00" />
            <Input label="Duração (min)" type="number" min={0} value={form.duracaoMinutos ?? ''} onChange={(e) => setForm((f) => ({ ...f, duracaoMinutos: e.target.value ? Number(e.target.value) : undefined }))} placeholder="30" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div onClick={() => setForm((f) => ({ ...f, domiciliar: !f.domiciliar }))}
              className={`relative h-6 w-11 rounded-full transition-colors duration-300 ${form.domiciliar ? 'bg-primary' : 'bg-border'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${form.domiciliar ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm font-medium text-foreground">Atendimento domiciliar</span>
          </label>
          {form.domiciliar && (
            <Input label="Taxa de deslocamento (R$)" type="number" min={0} step={0.01} value={form.taxaDeslocamento ?? ''} onChange={(e) => setForm((f) => ({ ...f, taxaDeslocamento: e.target.value ? Number(e.target.value) : undefined }))} placeholder="50.00" />
          )}
        </div>
      </Modal>

      {/* Modal confirmação */}
      <Modal open={!!confirmandoId} onClose={() => setConfirmandoId(null)} title="Inativar Serviço" size="sm"
        footer={<><Button variant="ghost" size="sm" onClick={() => setConfirmandoId(null)}>Cancelar</Button><Button variant="danger" size="sm" onClick={async () => { if (confirmandoId) { await remover(confirmandoId); setConfirmandoId(null) } }}>Inativar</Button></>}>
        <p className="text-sm text-foreground/70">O serviço será <strong>inativado</strong> e não aparecerá nas listagens padrão.</p>
      </Modal>
    </div>
  )
}
