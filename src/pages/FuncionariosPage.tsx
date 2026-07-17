import { useEffect, useState, useRef } from 'react'
import { Plus, Search, Pencil, Trash2, UserCog } from 'lucide-react'
import { useFuncionarios } from '@/hooks/useFuncionarios'
import { estabelecimentoService } from '@/services/estabelecimentoService'
import { useAuth } from '@/hooks/useAuth'
import type {
  FuncionarioResponse,
  CadastrarFuncionarioRequest,
  EstabelecimentoResponse,
} from '@/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input, SelectField } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'

const emptyForm: CadastrarFuncionarioRequest = {
  nome: '',
  cpf: '',
  email: '',
  telefone: '',
  cargo: '',
  estabelecimentoId: '',
}

export function FuncionariosPage() {
  const { funcionarios, loading, error, listar, cadastrar, atualizar, remover } = useFuncionarios()
  const { usuario } = useAuth()
  const [estabelecimentos, setEstabelecimentos] = useState<EstabelecimentoResponse[]>([])
  const [filtroEstab, setFiltroEstab] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState<boolean | undefined>(undefined)
  const [busca, setBusca] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<FuncionarioResponse | null>(null)
  const [form, setForm] = useState<CadastrarFuncionarioRequest>(emptyForm)
  const [salvando, setSalvando] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)

  const tiltRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 })
  const [hovering3d, setHovering3d] = useState(false)
  function onTiltMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = tiltRef.current; if (!el) return
    const { left, top, width, height } = el.getBoundingClientRect()
    const px = (e.clientX - left) / width
    const py = (e.clientY - top) / height
    setTilt({ rx: (py - 0.5) * -26, ry: (px - 0.5) * 26 })
  }

  useEffect(() => {
    const filtro = usuario?.perfil === 'MEDICO' && usuario.referenciaId
      ? { ativo: true, medicoId: usuario.referenciaId }
      : { ativo: true }
    estabelecimentoService.listar(filtro).then(setEstabelecimentos).catch(() => {})
  }, [usuario])

  useEffect(() => {
    listar({ estabelecimentoId: filtroEstab || undefined, ativo: filtroAtivo })
  }, [filtroEstab, filtroAtivo, listar])

  const filtrados = funcionarios.filter((f) =>
    f.nome.toLowerCase().includes(busca.toLowerCase()) ||
    f.cpf.includes(busca) ||
    f.cargo.toLowerCase().includes(busca.toLowerCase()) ||
    f.email.toLowerCase().includes(busca.toLowerCase()),
  )

  function setField<K extends keyof CadastrarFuncionarioRequest>(key: K, value: CadastrarFuncionarioRequest[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function abrirCadastro() {
    setEditando(null)
    setForm(emptyForm)
    setFormError(null)
    setModalAberto(true)
  }

  function abrirEdicao(func: FuncionarioResponse) {
    setEditando(func)
    setForm({
      nome: func.nome,
      cpf: func.cpf,
      email: func.email,
      telefone: func.telefone ?? '',
      cargo: func.cargo,
      estabelecimentoId: func.estabelecimentoId,
    })
    setFormError(null)
    setModalAberto(true)
  }

  async function salvar() {
    if (!form.nome || !form.cpf || !form.email || !form.cargo || !form.estabelecimentoId) {
      setFormError('Preencha todos os campos obrigatórios.')
      return
    }
    setSalvando(true)
    setFormError(null)
    try {
      if (editando) {
        await atualizar(editando.id, {
          nome: form.nome || undefined,
          email: form.email || undefined,
          telefone: form.telefone || undefined,
          cargo: form.cargo || undefined,
        })
      } else {
        await cadastrar(form)
      }
      setModalAberto(false)
      setEditando(null)
    } catch (err) {
      setFormError((err as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  const nomeEstabelecimento = (id: string) =>
    estabelecimentos.find((e) => e.id === id)?.nome ?? id.substring(0, 8) + '…'

  const isMedico = usuario?.perfil === 'MEDICO'

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[hsl(190,100%,10%)] via-[hsl(190,100%,14%)] to-[hsl(190,100%,18%)] flex items-center justify-between gap-6 min-h-[140px] pr-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(0,210,255,0.18),transparent_65%)] pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-3 p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-400/70">Gestão de Equipe</p>
          <h1 className="text-3xl font-extrabold text-white leading-tight">Funcionários</h1>
          <p className="text-sm text-white/50 max-w-xs">
            {isMedico ? 'Gerencie os funcionários dos seus estabelecimentos.' : 'Funcionários vinculados aos estabelecimentos.'}
          </p>
          <div className="mt-1"><Button onClick={abrirCadastro}><Plus size={16} strokeWidth={2} /> Novo Funcionário</Button></div>
        </div>
        <div className="relative hidden md:flex items-end justify-end flex-shrink-0 h-[145px] w-[110px] mr-6 cursor-pointer select-none" style={{ perspective: '900px' }}>
          <div
            ref={tiltRef}
            onMouseMove={onTiltMove}
            onMouseEnter={() => setHovering3d(true)}
            onMouseLeave={() => { setHovering3d(false); setTilt({ rx: 0, ry: 0 }) }}
            style={{
              transformStyle: 'preserve-3d',
              transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(${hovering3d ? 1.08 : 1})`,
              transition: hovering3d ? 'transform 0.07s linear' : 'transform 0.65s cubic-bezier(0.23,1,0.32,1)',
              animation: hovering3d ? 'none' : 'img-float 4s ease-in-out infinite',
            }}
            className="relative h-full w-full"
          >
            <style>{`@keyframes img-float { 0%,100%{transform:translateY(0) rotateX(4deg) rotateY(-4deg)} 50%{transform:translateY(-10px) rotateX(-4deg) rotateY(4deg)} }`}</style>
            <img src="/medico-3d.jpg" alt="" aria-hidden="true" className="h-full w-auto object-contain object-bottom"
              style={{ filter: `drop-shadow(0 0 ${hovering3d ? '40px' : '24px'} rgba(0,210,255,${hovering3d ? '0.75' : '0.5'}))`, transition: 'filter 0.3s ease' }} />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-52">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF, cargo ou e-mail…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-xl border border-border bg-input py-2 pl-9 pr-4 text-sm text-foreground outline-none transition-all focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
            />
          </div>
          <select
            value={filtroEstab}
            onChange={(e) => setFiltroEstab(e.target.value)}
            className="rounded-xl border border-border bg-input px-4 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todos os estabelecimentos</option>
            {estabelecimentos.map((e) => (
              <option key={e.id} value={e.id}>{e.nome}</option>
            ))}
          </select>
          <select
            value={filtroAtivo === undefined ? '' : String(filtroAtivo)}
            onChange={(e) => setFiltroAtivo(e.target.value === '' ? undefined : e.target.value === 'true')}
            className="rounded-xl border border-border bg-input px-4 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todos os status</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
        </div>
      </Card>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtrados.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((func) => (
            <Card key={func.id} className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <UserCog size={18} className="text-primary" />
                </div>
                <Badge variant={func.ativo ? 'active' : 'inactive'}>{func.ativo ? 'Ativo' : 'Inativo'}</Badge>
              </div>
              <div>
                <h3 className="font-bold text-secondary">{func.nome}</h3>
                <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{func.cargo}</p>
              </div>
              <div className="space-y-1.5 border-t border-border pt-3">
                <p className="text-xs text-foreground/70"><span className="font-semibold">CPF:</span> {func.cpf}</p>
                <p className="text-xs text-foreground/70"><span className="font-semibold">E-mail:</span> {func.email}</p>
                {func.telefone && (
                  <p className="text-xs text-foreground/70"><span className="font-semibold">Tel:</span> {func.telefone}</p>
                )}
                <p className="text-xs text-foreground/70"><span className="font-semibold">Estabelecimento:</span> {nomeEstabelecimento(func.estabelecimentoId)}</p>
              </div>
              <div className="flex gap-2 mt-auto">
                <Button variant="ghost" size="sm" onClick={() => abrirEdicao(func)} className="flex-1">
                  <Pencil size={12} /> Editar
                </Button>
                <Button variant="danger" size="sm" onClick={() => setConfirmandoId(func.id)} disabled={!func.ativo}>
                  <Trash2 size={12} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal cadastro/edição */}
      <Modal
        open={modalAberto}
        onClose={() => { setModalAberto(false); setEditando(null) }}
        title={editando ? 'Editar Funcionário' : 'Novo Funcionário'}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => { setModalAberto(false); setEditando(null) }}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando} size="sm">{salvando ? 'Salvando…' : 'Salvar'}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {formError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{formError}</div>
          )}
          <Input label="Nome *" value={form.nome} onChange={(e) => setField('nome', e.target.value)} placeholder="Maria da Silva" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="CPF *" value={form.cpf} onChange={(e) => setField('cpf', e.target.value)} placeholder="000.000.000-00" disabled={!!editando} />
            <Input label="Cargo *" value={form.cargo} onChange={(e) => setField('cargo', e.target.value)} placeholder="Recepcionista" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="E-mail *" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="maria@clinica.com" />
            <Input label="Telefone" value={form.telefone ?? ''} onChange={(e) => setField('telefone', e.target.value)} placeholder="(11) 99999-0000" />
          </div>
          <SelectField
            label="Estabelecimento *"
            value={form.estabelecimentoId}
            onChange={(e) => setField('estabelecimentoId', e.target.value)}
            disabled={!!editando}
          >
            <option value="">Selecione…</option>
            {estabelecimentos.map((e) => (
              <option key={e.id} value={e.id}>{e.nome}</option>
            ))}
          </SelectField>
        </div>
      </Modal>

      {/* Modal confirmação inativar */}
      <Modal
        open={!!confirmandoId}
        onClose={() => setConfirmandoId(null)}
        title="Inativar Funcionário"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmandoId(null)}>Cancelar</Button>
            <Button
              variant="danger"
              size="sm"
              onClick={async () => {
                if (confirmandoId) { await remover(confirmandoId); setConfirmandoId(null) }
              }}
            >
              Inativar
            </Button>
          </>
        }
      >
        <p className="text-sm text-foreground/70">O funcionário será <strong>inativado</strong> e não aparecerá nas listagens padrão.</p>
      </Modal>
    </div>
  )
}
