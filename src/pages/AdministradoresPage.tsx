import { useEffect, useState, useRef } from 'react'
import { toast } from 'sonner'
import { Plus, Search, Pencil, Trash2, RotateCcw, UserCog, Building2 } from 'lucide-react'
import { useAdministradores } from '@/hooks/useAdministradores'
import { estabelecimentoService } from '@/services/estabelecimentoService'
import { administradorService } from '@/services/administradorService'
import { authService } from '@/services/authService'
import type {
  AdministradorResponse,
  CadastrarAdministradorRequest,
  EstabelecimentoResponse,
} from '@/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'

const emptyForm: CadastrarAdministradorRequest = {
  nome: '', cpf: '', email: '', telefone: '',
}

const emptyErros = { cpf: '', email: '', telefone: '', senha: '' }

function maskCPF(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function maskTelefone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function validarCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const calc = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += parseInt(d[i]) * (len + 1 - i)
    const r = (sum * 10) % 11
    return r === 10 || r === 11 ? 0 : r
  }
  return calc(9) === parseInt(d[9]) && calc(10) === parseInt(d[10])
}

function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const DDD_VALIDOS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
])

function validarTelefone(tel: string): boolean {
  const d = tel.replace(/\D/g, '')
  if (d.length !== 10 && d.length !== 11) return false
  const ddd = parseInt(d.slice(0, 2))
  if (!DDD_VALIDOS.has(ddd)) return false
  const numero = d.slice(2)
  if (/^(\d)\1+$/.test(numero)) return false
  if (d.length === 11 && numero[0] !== '9') return false
  if (d.length === 10 && !/^[2-5]/.test(numero)) return false
  return true
}

export function AdministradoresPage() {
  const { administradores, loading, error, listar, cadastrar, atualizar, remover, reativar } =
    useAdministradores()
  const [reativandoId, setReativandoId] = useState<string | null>(null)
  const reativandoRef = useRef<string | null>(null)
  const [busca, setBusca] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState<boolean | undefined>(undefined)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<AdministradorResponse | null>(null)
  const [form, setForm] = useState<CadastrarAdministradorRequest>(emptyForm)
  const [senha, setSenha] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)
  const [campoErros, setCampoErros] = useState(emptyErros)
  const salvandoRef = useRef(false)

  // ─── modal de estabelecimentos administrados ────────────────────────────────
  const [modalEstabAdmin, setModalEstabAdmin] = useState<AdministradorResponse | null>(null)
  const [todosEstabelecimentos, setTodosEstabelecimentos] = useState<EstabelecimentoResponse[]>([])
  const [estabelecimentosVinculados, setEstabelecimentosVinculados] = useState<Set<string>>(new Set())
  const [loadingEstab, setLoadingEstab] = useState(false)
  const [salvandoEstab, setSalvandoEstab] = useState(false)
  const [erroEstab, setErroEstab] = useState<string | null>(null)

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
    listar({ ativo: filtroAtivo })
  }, [filtroAtivo, listar])

  const filtrados = administradores.filter((a) => {
    const buscaDigits = busca.replace(/\D/g, '')
    return (
      a.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (buscaDigits.length > 0 && a.cpf.replace(/\D/g, '').includes(buscaDigits)) ||
      a.email.toLowerCase().includes(busca.toLowerCase())
    )
  })

  function setField<K extends keyof CadastrarAdministradorRequest>(key: K, value: CadastrarAdministradorRequest[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function abrirCadastro() {
    setEditando(null)
    setForm(emptyForm)
    setSenha('')
    setFormError(null)
    setCampoErros(emptyErros)
    setModalAberto(true)
  }

  function abrirEdicao(admin: AdministradorResponse) {
    setEditando(admin)
    setForm({
      nome: admin.nome,
      cpf: maskCPF(admin.cpf),
      email: admin.email,
      telefone: admin.telefone ? maskTelefone(admin.telefone) : '',
    })
    setSenha('')
    setFormError(null)
    setCampoErros(emptyErros)
    setModalAberto(true)
  }

  async function handleReativar(id: string) {
    if (reativandoRef.current) return
    reativandoRef.current = id
    setReativandoId(id)
    try {
      await reativar(id)
      toast.success('Administrador reativado com sucesso.')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      reativandoRef.current = null
      setReativandoId(null)
    }
  }

  async function salvar() {
    const erros = { ...emptyErros }
    let valido = true

    if (!form.nome.trim()) {
      setFormError('Preencha todos os campos obrigatórios.')
      valido = false
    } else {
      setFormError(null)
    }

    if (!editando) {
      if (!form.cpf) {
        erros.cpf = 'CPF obrigatório'
        valido = false
      } else if (!validarCPF(form.cpf)) {
        erros.cpf = 'CPF inválido'
        valido = false
      }
      if (!senha || senha.length < 8) {
        erros.senha = 'Senha obrigatória (mínimo 8 caracteres)'
        valido = false
      }
    }

    if (!form.email) {
      erros.email = 'E-mail obrigatório'
      valido = false
    } else if (!validarEmail(form.email)) {
      erros.email = 'E-mail inválido'
      valido = false
    }

    if (form.telefone && !validarTelefone(form.telefone)) {
      erros.telefone = 'Use o formato (11) 99999-0000'
      valido = false
    }

    setCampoErros(erros)
    if (!valido) return
    if (salvandoRef.current) return
    salvandoRef.current = true

    setSalvando(true)
    try {
      if (editando) {
        await atualizar(editando.id, {
          nome: form.nome.trim() || undefined,
          email: form.email || undefined,
          telefone: form.telefone || undefined,
        })
      } else {
        const novo = await cadastrar({ ...form, nome: form.nome.trim() })
        try {
          await authService.registrarStaff({
            email: form.email,
            senha,
            tipoPerfil: 'ADMIN_ESTABELECIMENTO',
            referenciaId: novo.id,
          })
          toast.success('Administrador cadastrado. Um e-mail com a senha de acesso foi enviado.')
        } catch (loginErr) {
          toast.error(
            `Administrador criado, mas o login não pôde ser gerado: ${(loginErr as Error).message}. ` +
            'Tente criar o login novamente mais tarde.',
          )
        }
      }
      setModalAberto(false)
      setEditando(null)
    } catch (err) {
      setFormError((err as Error).message)
    } finally {
      salvandoRef.current = false
      setSalvando(false)
    }
  }

  async function abrirModalEstabelecimentos(admin: AdministradorResponse) {
    setModalEstabAdmin(admin)
    setErroEstab(null)
    setLoadingEstab(true)
    try {
      const [todos, vinculados] = await Promise.all([
        estabelecimentoService.listar({ ativo: true }),
        administradorService.listarEstabelecimentos(admin.id),
      ])
      setTodosEstabelecimentos(todos)
      setEstabelecimentosVinculados(new Set(vinculados.map((e) => e.id)))
    } catch (err) {
      setErroEstab((err as Error).message)
    } finally {
      setLoadingEstab(false)
    }
  }

  async function salvarEstabelecimentos() {
    if (!modalEstabAdmin) return
    setSalvandoEstab(true)
    setErroEstab(null)
    try {
      await administradorService.associarEstabelecimentos(modalEstabAdmin.id, {
        estabelecimentoIds: Array.from(estabelecimentosVinculados),
      })
      setModalEstabAdmin(null)
    } catch (err) {
      setErroEstab((err as Error).message)
    } finally {
      setSalvandoEstab(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[hsl(190,100%,10%)] via-[hsl(190,100%,14%)] to-[hsl(190,100%,18%)] flex items-center justify-between gap-6 min-h-[140px] pr-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(0,210,255,0.18),transparent_65%)] pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-3 p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-400/70">Cadastros</p>
          <h1 className="text-3xl font-extrabold text-white leading-tight">Administradores</h1>
          <p className="text-sm text-white/50 max-w-xs">
            Donos e gestores de estabelecimento, com acesso restrito às clínicas que administram.
          </p>
          <div className="mt-1"><Button onClick={abrirCadastro}><Plus size={16} strokeWidth={2} /> Novo Administrador</Button></div>
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
      <Card className="p-4 animate-fade-in-up" style={{ animationDelay: '120ms' }}>
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-52">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF ou e-mail…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-xl border border-border bg-input py-2 pl-9 pr-4 text-sm text-foreground outline-none transition-all focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
            />
          </div>
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
        <div key="loading" className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtrados.length === 0 ? (
        <EmptyState />
      ) : (
        <div key="grid" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 stagger-children">
          {filtrados.map((admin) => (
            <Card key={admin.id} className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <UserCog size={18} className="text-primary" />
                </div>
                <Badge variant={admin.ativo ? 'active' : 'inactive'}>{admin.ativo ? 'Ativo' : 'Inativo'}</Badge>
              </div>
              <div>
                <h3 className="font-bold text-secondary">{admin.nome}</h3>
                <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Administrador de estabelecimento
                </p>
              </div>
              <div className="space-y-1.5 border-t border-border pt-3">
                <p className="text-xs text-foreground/70"><span className="font-semibold">CPF:</span> {admin.cpf}</p>
                <p className="text-xs text-foreground/70"><span className="font-semibold">E-mail:</span> {admin.email}</p>
                {admin.telefone && (
                  <p className="text-xs text-foreground/70"><span className="font-semibold">Tel:</span> {admin.telefone}</p>
                )}
              </div>
              <div className="flex gap-2 mt-auto">
                <Button variant="ghost" size="sm" onClick={() => abrirEdicao(admin)} className="flex-1">
                  <Pencil size={12} /> Editar
                </Button>
                <Button variant="outline" size="sm" onClick={() => abrirModalEstabelecimentos(admin)} title="Gerenciar estabelecimentos administrados">
                  <Building2 size={12} />
                </Button>
                {admin.ativo ? (
                  <Button variant="danger" size="sm" onClick={() => setConfirmandoId(admin.id)}>
                    <Trash2 size={12} />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReativar(admin.id)}
                    disabled={reativandoId === admin.id}
                  >
                    <RotateCcw size={12} className={reativandoId === admin.id ? 'animate-spin' : undefined} />
                    Reativar
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal cadastro/edição */}
      <Modal
        open={modalAberto}
        onClose={() => { setModalAberto(false); setEditando(null); setCampoErros(emptyErros) }}
        title={editando ? 'Editar Administrador' : 'Novo Administrador'}
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
          <Input label="Nome *" value={form.nome} onChange={(e) => setField('nome', e.target.value)} placeholder="Guilherme Dono" />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="CPF *"
              value={form.cpf}
              onChange={(e) => { setField('cpf', maskCPF(e.target.value)); setCampoErros((p) => ({ ...p, cpf: '' })) }}
              onBlur={() => {
                if (form.cpf && !validarCPF(form.cpf))
                  setCampoErros((p) => ({ ...p, cpf: 'CPF inválido' }))
              }}
              placeholder="000.000.000-00"
              disabled={!!editando}
              error={campoErros.cpf}
            />
            <Input
              label="E-mail *"
              type="text"
              value={form.email}
              onChange={(e) => { setField('email', e.target.value); setCampoErros((p) => ({ ...p, email: '' })) }}
              onBlur={() => {
                if (!form.email) {
                  setCampoErros((p) => ({ ...p, email: 'E-mail obrigatório' }))
                } else if (!validarEmail(form.email)) {
                  setCampoErros((p) => ({ ...p, email: 'E-mail inválido' }))
                }
              }}
              placeholder="dono@clinica.com"
              error={campoErros.email}
            />
          </div>
          <Input
            label="Telefone"
            value={form.telefone ?? ''}
            onChange={(e) => { setField('telefone', maskTelefone(e.target.value)); setCampoErros((p) => ({ ...p, telefone: '' })) }}
            onBlur={() => {
              if (form.telefone && !validarTelefone(form.telefone))
                setCampoErros((p) => ({ ...p, telefone: 'Use o formato (11) 99999-0000' }))
            }}
            placeholder="(11) 99999-0000"
            error={campoErros.telefone}
          />
          {!editando && (
            <Input
              label="Senha de acesso *"
              type="password"
              value={senha}
              onChange={(e) => { setSenha(e.target.value); setCampoErros((p) => ({ ...p, senha: '' })) }}
              onBlur={() => {
                if (!senha || senha.length < 8)
                  setCampoErros((p) => ({ ...p, senha: 'Senha obrigatória (mínimo 8 caracteres)' }))
              }}
              placeholder="Mínimo 8 caracteres"
              error={campoErros.senha}
            />
          )}
        </div>
      </Modal>

      {/* Modal de estabelecimentos administrados */}
      <Modal
        open={modalEstabAdmin !== null}
        onClose={() => setModalEstabAdmin(null)}
        title={`Estabelecimentos — ${modalEstabAdmin?.nome ?? ''}`}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setModalEstabAdmin(null)}>Cancelar</Button>
            <Button onClick={salvarEstabelecimentos} disabled={salvandoEstab} size="sm">{salvandoEstab ? 'Salvando…' : 'Salvar Vínculos'}</Button>
          </>
        }
      >
        {erroEstab && (
          <div className="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{erroEstab}</div>
        )}
        {loadingEstab ? (
          <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : todosEstabelecimentos.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">Nenhum estabelecimento ativo cadastrado.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {todosEstabelecimentos.map((e) => {
              const checked = estabelecimentosVinculados.has(e.id)
              return (
                <label key={e.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all ${checked ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setEstabelecimentosVinculados((prev) => {
                      const next = new Set(prev)
                      if (next.has(e.id)) next.delete(e.id)
                      else next.add(e.id)
                      return next
                    })}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{e.nome}</p>
                    <p className="text-xs text-muted-foreground">{e.cidade} — {e.uf}</p>
                  </div>
                </label>
              )
            })}
          </div>
        )}
      </Modal>

      {/* Modal confirmação */}
      <Modal
        open={!!confirmandoId}
        onClose={() => setConfirmandoId(null)}
        title="Inativar Administrador"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmandoId(null)}>Cancelar</Button>
            <Button
              variant="danger"
              size="sm"
              onClick={async () => { if (confirmandoId) { await remover(confirmandoId); setConfirmandoId(null) } }}
            >
              Inativar
            </Button>
          </>
        }
      >
        <p className="text-sm text-foreground/70">O administrador será <strong>inativado</strong> e não aparecerá nas listagens padrão.</p>
      </Modal>
    </div>
  )
}
