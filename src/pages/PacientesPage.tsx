import { useEffect, useState, useRef } from 'react'
import { Plus, Search, Pencil, Trash2, UserRound, CalendarDays, Mail, Phone, MapPin } from 'lucide-react'
import { usePacientes } from '@/hooks/usePacientes'
import type { PacienteResponse, CadastrarPacienteRequest } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'

// ── UFs válidas ─────────────────────────────────────────────────────────────
const UFS_VALIDAS = new Set([
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
])

// ── Validadores ──────────────────────────────────────────────────────────────
function validarCpfDigitos(digits: string): boolean {
  if (digits.length !== 11) return false
  if (/^(\d)\1{10}$/.test(digits)) return false   // todos iguais: 111.111.111-11
  let sum = 0
  for (let i = 0; i < 9; i++) sum += +digits[i] * (10 - i)
  let rem = (sum * 10) % 11
  if (rem >= 10) rem = 0
  if (rem !== +digits[9]) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += +digits[i] * (11 - i)
  rem = (sum * 10) % 11
  if (rem >= 10) rem = 0
  return rem === +digits[10]
}

function validarEmail(email: string): string | null {
  if (!email) return 'E-mail é obrigatório'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return 'E-mail inválido'
  return null
}

function validarTelefoneDigitos(digits: string): string | null {
  if (!digits) return null   // opcional
  if (digits.length < 10 || digits.length > 11) return 'Telefone deve ter DDD + 8 ou 9 dígitos'
  if (digits.length === 11 && digits[2] !== '9') return 'Celular deve começar com 9 após o DDD'
  return null
}

function validarCepDigitos(digits: string): string | null {
  if (!digits) return null   // opcional
  if (digits.length !== 8) return 'CEP deve ter 8 dígitos'
  return null
}

function validarNumero(num: string): string | null {
  if (!num) return null   // opcional
  if (!/^[a-zA-Z0-9\s/\-]+$/.test(num)) return 'Número inválido (use apenas letras, números e /-)'
  return null
}

function validarUf(uf: string): string | null {
  if (!uf) return null   // opcional
  if (!UFS_VALIDAS.has(uf.toUpperCase())) return 'UF inválida'
  return null
}

// ── Máscaras ────────────────────────────────────────────────────────────────
function maskTelefone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2)  return `(${d}`
  if (d.length <= 6)  return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function maskCep(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

// ── Helpers de display ───────────────────────────────────────────────────────
function formatCpf(cpf: string) {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11) return cpf
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function formatDate(iso: string) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function calcIdade(iso: string) {
  if (!iso) return null
  const hoje = new Date()
  const nasc = new Date(iso)
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const passou =
    hoje.getMonth() > nasc.getMonth() ||
    (hoje.getMonth() === nasc.getMonth() && hoje.getDate() >= nasc.getDate())
  if (!passou) idade--
  return idade
}

// ── Tipos locais ────────────────────────────────────────────────────────────
type FormErrors = Partial<Record<
  'nome' | 'cpf' | 'dataNascimento' | 'email' | 'telefone' | 'cep' | 'numero' | 'uf',
  string
>>

const emptyForm: CadastrarPacienteRequest = {
  nome: '', cpf: '', dataNascimento: '', email: '', telefone: '',
  logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '',
}

export function PacientesPage() {
  const { pacientes, loading, error, listar, cadastrar, atualizar, remover } = usePacientes()
  const [busca, setBusca] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState<boolean | undefined>(undefined)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<PacienteResponse | null>(null)
  const [form, setForm] = useState<CadastrarPacienteRequest>(emptyForm)
  const [cpfDisplay, setCpfDisplay] = useState('')
  const [telefoneDisplay, setTelefoneDisplay] = useState('')
  const [cepDisplay, setCepDisplay] = useState('')
  const [cepBuscando, setCepBuscando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)
  const [erroInativacao, setErroInativacao] = useState<string | null>(null)
  const [detalhe, setDetalhe] = useState<PacienteResponse | null>(null)

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
  function onTiltLeave() { setHovering3d(false); setTilt({ rx: 0, ry: 0 }) }

  useEffect(() => { listar({ ativo: filtroAtivo }) }, [filtroAtivo, listar])

  const filtrados = pacientes.filter((p) => {
    const t = busca.toLowerCase()
    const cpfDigits = busca.replace(/\D/g, '')
    return (
      p.nome.toLowerCase().includes(t) ||
      (cpfDigits.length > 0 && p.cpf.replace(/\D/g, '').includes(cpfDigits)) ||
      p.email.toLowerCase().includes(t)
    )
  })

  function abrirCadastro() {
    setEditando(null)
    setForm(emptyForm)
    setCpfDisplay('')
    setTelefoneDisplay('')
    setCepDisplay('')
    setFormError(null)
    setFormErrors({})
    setModalAberto(true)
  }

  function abrirEdicao(p: PacienteResponse) {
    setEditando(p)
    setForm({
      nome: p.nome, cpf: p.cpf, dataNascimento: p.dataNascimento, email: p.email,
      telefone: p.telefone ?? '', logradouro: p.logradouro ?? '', numero: p.numero ?? '',
      complemento: p.complemento ?? '', bairro: p.bairro ?? '', cidade: p.cidade ?? '',
      uf: p.uf ?? '', cep: p.cep ?? '',
    })
    setCpfDisplay(formatCpf(p.cpf))
    setTelefoneDisplay(maskTelefone(p.telefone ?? ''))
    setCepDisplay(maskCep(p.cep ?? ''))
    setFormError(null)
    setFormErrors({})
    setModalAberto(true)
  }

  // ── Handlers de campos com máscara ────────────────────────────────────────
  function handleCpfChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 11)
    let mask = digits
    if (digits.length > 9) mask = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
    else if (digits.length > 6) mask = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
    else if (digits.length > 3) mask = `${digits.slice(0, 3)}.${digits.slice(3)}`
    setCpfDisplay(mask)
    setForm((f) => ({ ...f, cpf: digits }))
    setFormErrors((e) => ({ ...e, cpf: undefined }))
  }

  function handleTelefoneChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 11)
    setTelefoneDisplay(maskTelefone(digits))
    setForm((f) => ({ ...f, telefone: digits }))
    setFormErrors((e) => ({ ...e, telefone: undefined }))
  }

  function handleCepChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    setCepDisplay(maskCep(digits))
    setForm((f) => ({ ...f, cep: digits }))
    setFormErrors((e) => ({ ...e, cep: undefined }))
  }

  // ── Validação de campo individual (blur) ──────────────────────────────────
  function validarCampo(campo: keyof FormErrors) {
    setFormErrors((prev) => {
      const erros = { ...prev }
      switch (campo) {
        case 'cpf': {
          const d = form.cpf.replace(/\D/g, '')
          if (!editando) {
            if (d.length !== 11) erros.cpf = 'CPF deve ter 11 dígitos'
            else if (!validarCpfDigitos(d)) erros.cpf = 'CPF inválido'
            else delete erros.cpf
          }
          break
        }
        case 'email': {
          const err = validarEmail(form.email)
          if (err) erros.email = err; else delete erros.email
          break
        }
        case 'telefone': {
          const err = validarTelefoneDigitos((form.telefone ?? '').replace(/\D/g, ''))
          if (err) erros.telefone = err; else delete erros.telefone
          break
        }
        case 'cep': {
          const err = validarCepDigitos((form.cep ?? '').replace(/\D/g, ''))
          if (err) erros.cep = err; else delete erros.cep
          break
        }
        case 'numero': {
          const err = validarNumero(form.numero ?? '')
          if (err) erros.numero = err; else delete erros.numero
          break
        }
        case 'uf': {
          const err = validarUf(form.uf ?? '')
          if (err) erros.uf = err; else delete erros.uf
          break
        }
        case 'nome': {
          if (!form.nome.trim()) erros.nome = 'Nome é obrigatório'
          else delete erros.nome
          break
        }
        case 'dataNascimento': {
          if (!form.dataNascimento) {
            erros.dataNascimento = 'Data de nascimento é obrigatória'
          } else {
            const nasc = new Date(form.dataNascimento)
            const hoje = new Date(); hoje.setHours(0,0,0,0)
            const minDate = new Date(); minDate.setFullYear(minDate.getFullYear() - 130)
            if (nasc >= hoje) erros.dataNascimento = 'Data de nascimento não pode ser hoje ou futura'
            else if (nasc < minDate) erros.dataNascimento = 'Data de nascimento inválida (mais de 130 anos)'
            else delete erros.dataNascimento
          }
          break
        }
      }
      return erros
    })
  }

  // ── Validação completa antes de salvar ────────────────────────────────────
  function validarTudo(): boolean {
    const erros: FormErrors = {}

    if (!form.nome.trim()) erros.nome = 'Nome é obrigatório'
    if (!form.dataNascimento) {
      erros.dataNascimento = 'Data de nascimento é obrigatória'
    } else {
      const nasc = new Date(form.dataNascimento)
      const hoje = new Date(); hoje.setHours(0,0,0,0)
      const minDate = new Date(); minDate.setFullYear(minDate.getFullYear() - 130)
      if (nasc >= hoje) erros.dataNascimento = 'Data de nascimento não pode ser hoje ou futura'
      else if (nasc < minDate) erros.dataNascimento = 'Data de nascimento inválida (mais de 130 anos)'
    }

    if (!editando) {
      const d = form.cpf.replace(/\D/g, '')
      if (d.length !== 11) erros.cpf = 'CPF deve ter 11 dígitos'
      else if (!validarCpfDigitos(d)) erros.cpf = 'CPF inválido'
    }

    const emailErr = validarEmail(form.email)
    if (emailErr) erros.email = emailErr

    const telErr = validarTelefoneDigitos((form.telefone ?? '').replace(/\D/g, ''))
    if (telErr) erros.telefone = telErr

    const cepErr = validarCepDigitos((form.cep ?? '').replace(/\D/g, ''))
    if (cepErr) erros.cep = cepErr

    const numErr = validarNumero(form.numero ?? '')
    if (numErr) erros.numero = numErr

    const ufErr = validarUf(form.uf ?? '')
    if (ufErr) erros.uf = ufErr

    setFormErrors(erros)
    return Object.keys(erros).length === 0
  }

  async function buscarCep(cep: string) {
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8) return
    setCepBuscando(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm((f) => ({
          ...f,
          logradouro: data.logradouro ?? f.logradouro,
          bairro: data.bairro ?? f.bairro,
          cidade: data.localidade ?? f.cidade,
          uf: data.uf ?? f.uf,
          cep: digits,
        }))
        setFormErrors((e) => ({ ...e, cep: undefined }))
      } else {
        setFormErrors((e) => ({ ...e, cep: 'CEP não encontrado' }))
      }
    } catch { /* ViaCEP offline */ } finally { setCepBuscando(false) }
  }

  async function salvar() {
    if (!validarTudo()) return
    setSalvando(true); setFormError(null)
    try {
      if (editando) {
        await atualizar(editando.id, {
          nome: form.nome || undefined, dataNascimento: form.dataNascimento || undefined,
          email: form.email || undefined, telefone: form.telefone || undefined,
          logradouro: form.logradouro || undefined, numero: form.numero || undefined,
          complemento: form.complemento || undefined, bairro: form.bairro || undefined,
          cidade: form.cidade || undefined, uf: form.uf || undefined, cep: form.cep || undefined,
        })
      } else {
        await cadastrar({ ...form, cpf: form.cpf.replace(/\D/g, '') })
      }
      setModalAberto(false); setEditando(null)
    } catch (err) { setFormError((err as Error).message) } finally { setSalvando(false) }
  }

  return (
    <div className="space-y-6">
      {/* ── Hero banner ───────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[hsl(190,100%,10%)] via-[hsl(190,100%,14%)] to-[hsl(190,100%,18%)] flex items-center justify-between gap-6 min-h-[140px] pr-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(0,210,255,0.18),transparent_65%)] pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-3 p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-400/70">Cadastros</p>
          <h1 className="text-3xl font-extrabold text-white leading-tight">Pacientes</h1>
          <p className="text-sm text-white/50 max-w-xs">Gerencie o cadastro de pacientes com integração ViaCEP.</p>
          <div className="mt-1"><Button onClick={abrirCadastro}><Plus size={16} strokeWidth={2} /> Novo Paciente</Button></div>
        </div>
        <div className="relative hidden md:flex items-end justify-end flex-shrink-0 h-[145px] w-[110px] mr-6 cursor-pointer select-none" style={{ perspective: '900px' }}>
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
            <style>{`@keyframes img-float { 0%,100%{transform:translateY(0) rotateX(4deg) rotateY(-4deg)} 50%{transform:translateY(-10px) rotateX(-4deg) rotateY(4deg)} }`}</style>
            <img src="/medico-3d.jpg" alt="" aria-hidden="true" className="h-full w-auto object-contain object-bottom"
              style={{ filter: `drop-shadow(0 0 ${hovering3d ? '40px' : '24px'} rgba(0,210,255,${hovering3d ? '0.75' : '0.5'}))`, transition: 'filter 0.3s ease' }} />
            <div className="absolute inset-0 pointer-events-none rounded-lg"
              style={{ background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,${hovering3d ? '0.18' : '0'}), transparent 55%)`, transition: hovering3d ? 'none' : 'background 0.5s ease' }} />
          </div>
        </div>
      </div>

      {/* filtros */}
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
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && filtrados.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {filtrados.length} paciente{filtrados.length !== 1 ? 's' : ''} encontrado{filtrados.length !== 1 ? 's' : ''}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtrados.length === 0 ? (
        <EmptyState title="Nenhum paciente encontrado" description="Tente ajustar os filtros ou cadastre um novo paciente." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 stagger-children">
          {filtrados.map((p) => {
            const idade = calcIdade(p.dataNascimento)
            return (
              <Card key={p.id} hover className="flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <UserRound size={18} className="text-primary" />
                  </div>
                  <Badge variant={p.ativo ? 'active' : 'inactive'}>
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>

                <div>
                  <h3
                    className="cursor-pointer font-bold text-secondary hover:text-primary transition-colors"
                    onClick={() => setDetalhe(p)}
                  >
                    {p.nome}
                  </h3>
                  <p className="mt-0.5 text-xs font-mono text-muted-foreground">{formatCpf(p.cpf)}</p>
                </div>

                <div className="space-y-1.5 border-t border-border pt-3">
                  <div className="flex items-center gap-2 text-xs text-foreground/70">
                    <CalendarDays size={12} className="shrink-0 text-muted-foreground" />
                    <span>{formatDate(p.dataNascimento)}{idade !== null && <span className="ml-1 text-muted-foreground">({idade} anos)</span>}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-foreground/70">
                    <Mail size={12} className="shrink-0 text-muted-foreground" />
                    <span className="truncate">{p.email}</span>
                  </div>
                  {p.telefone && (
                    <div className="flex items-center gap-2 text-xs text-foreground/70">
                      <Phone size={12} className="shrink-0 text-muted-foreground" />
                      <span>{maskTelefone(p.telefone)}</span>
                    </div>
                  )}
                  {p.cidade && (
                    <div className="flex items-center gap-2 text-xs text-foreground/70">
                      <MapPin size={12} className="shrink-0 text-muted-foreground" />
                      <span>{p.cidade}{p.uf ? ` — ${p.uf}` : ''}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-auto">
                  <Button variant="ghost" size="sm" onClick={() => abrirEdicao(p)} className="flex-1">
                    <Pencil size={12} /> Editar
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setConfirmandoId(p.id)} disabled={!p.ativo}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Modal cadastro/edição ─────────────────────────────────────────── */}
      <Modal
        open={modalAberto}
        onClose={() => { setModalAberto(false); setEditando(null) }}
        title={editando ? 'Editar Paciente' : 'Novo Paciente'}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => { setModalAberto(false); setEditando(null) }}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando} size="sm">{salvando ? 'Salvando…' : 'Salvar'}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {formError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {formError}
            </div>
          )}

          {/* Nome */}
          <Input
            label="Nome completo"
            value={form.nome}
            onChange={(e) => { setForm((f) => ({ ...f, nome: e.target.value })); setFormErrors((fe) => ({ ...fe, nome: undefined })) }}
            onBlur={() => validarCampo('nome')}
            placeholder="Maria da Silva"
            error={formErrors.nome}
          />

          {/* CPF */}
          <Input
            label="CPF"
            value={cpfDisplay}
            onChange={(e) => handleCpfChange(e.target.value)}
            onBlur={() => validarCampo('cpf')}
            placeholder="000.000.000-00"
            disabled={!!editando}
            error={formErrors.cpf}
          />

          {/* Data de nascimento */}
          <Input
            label="Data de nascimento"
            type="date"
            value={form.dataNascimento}
            onChange={(e) => { setForm((f) => ({ ...f, dataNascimento: e.target.value })); setFormErrors((fe) => ({ ...fe, dataNascimento: undefined })) }}
            onBlur={() => validarCampo('dataNascimento')}
            error={formErrors.dataNascimento}
          />

          {/* E-mail */}
          <Input
            label="E-mail"
            type="email"
            value={form.email}
            onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value })); setFormErrors((fe) => ({ ...fe, email: undefined })) }}
            onBlur={() => validarCampo('email')}
            placeholder="maria@email.com"
            error={formErrors.email}
          />

          {/* Telefone */}
          <Input
            label="Telefone (opcional)"
            value={telefoneDisplay}
            onChange={(e) => handleTelefoneChange(e.target.value)}
            onBlur={() => validarCampo('telefone')}
            placeholder="(11) 99999-0000"
            error={formErrors.telefone}
          />

          <div className="border-t border-border pt-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Endereço (opcional)</p>

            {/* CEP */}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  label="CEP"
                  value={cepDisplay}
                  onChange={(e) => handleCepChange(e.target.value)}
                  onBlur={(e) => { validarCampo('cep'); buscarCep(e.target.value) }}
                  placeholder="00000-000"
                  maxLength={9}
                  error={formErrors.cep}
                />
              </div>
              {cepBuscando && <div className="mb-1 h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />}
            </div>

            <div className="mt-3 space-y-3">
              <Input
                label="Logradouro"
                value={form.logradouro ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, logradouro: e.target.value }))}
                placeholder="Rua das Flores"
              />

              <div className="flex gap-2">
                {/* Número */}
                <div className="w-24">
                  <Input
                    label="Número"
                    value={form.numero ?? ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '')
                      setForm((f) => ({ ...f, numero: val }))
                      setFormErrors((fe) => ({ ...fe, numero: undefined }))
                    }}
                    placeholder="123"
                    inputMode="numeric"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    label="Complemento"
                    value={form.complemento ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, complemento: e.target.value }))}
                    placeholder="Apto 42"
                  />
                </div>
              </div>

              <Input
                label="Bairro"
                value={form.bairro ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))}
                placeholder="Centro"
              />

              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    label="Cidade"
                    value={form.cidade ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
                    placeholder="São Paulo"
                  />
                </div>
                {/* UF */}
                <div className="w-20">
                  <Input
                    label="UF"
                    value={form.uf ?? ''}
                    onChange={(e) => { setForm((f) => ({ ...f, uf: e.target.value.toUpperCase().slice(0, 2) })); setFormErrors((fe) => ({ ...fe, uf: undefined })) }}
                    onBlur={() => validarCampo('uf')}
                    placeholder="SP"
                    maxLength={2}
                    error={formErrors.uf}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal confirmação inativação */}
      <Modal
        open={!!confirmandoId}
        onClose={() => { setConfirmandoId(null); setErroInativacao(null) }}
        title="Inativar Paciente"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => { setConfirmandoId(null); setErroInativacao(null) }}>Cancelar</Button>
            <Button variant="danger" size="sm" onClick={async () => {
              if (!confirmandoId) return
              try {
                await remover(confirmandoId)
                setConfirmandoId(null)
                setErroInativacao(null)
              } catch (err) {
                setErroInativacao((err as Error).message)
              }
            }}>Inativar</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-foreground/70">
            O paciente será <strong>inativado</strong> e não aparecerá nas listagens padrão. O histórico é preservado.
          </p>
          {erroInativacao && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {erroInativacao}
            </div>
          )}
        </div>
      </Modal>

      {/* Modal detalhe */}
      <Modal
        open={!!detalhe}
        onClose={() => setDetalhe(null)}
        title="Detalhes do Paciente"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDetalhe(null)}>Fechar</Button>
            {detalhe && (
              <Button size="sm" onClick={() => { setDetalhe(null); abrirEdicao(detalhe) }}>
                <Pencil size={12} /> Editar
              </Button>
            )}
          </>
        }
      >
        {detalhe && (
          <div className="space-y-3">
            <DetailRow label="Nome" value={detalhe.nome} />
            <DetailRow label="CPF" value={formatCpf(detalhe.cpf)} mono />
            <DetailRow label="Nascimento" value={`${formatDate(detalhe.dataNascimento)} — ${calcIdade(detalhe.dataNascimento)} anos`} />
            <DetailRow label="E-mail" value={detalhe.email} />
            {detalhe.telefone && <DetailRow label="Telefone" value={maskTelefone(detalhe.telefone)} />}
            <DetailRow label="Status" value={detalhe.ativo ? 'Ativo' : 'Inativo'} />
            {(detalhe.logradouro || detalhe.cidade) && (
              <div className="border-t border-border pt-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Endereço</p>
                {detalhe.logradouro && <DetailRow label="Logradouro" value={[detalhe.logradouro, detalhe.numero, detalhe.complemento].filter(Boolean).join(', ')} />}
                {detalhe.bairro && <DetailRow label="Bairro" value={detalhe.bairro} />}
                {detalhe.cidade && <DetailRow label="Cidade / UF" value={[detalhe.cidade, detalhe.uf].filter(Boolean).join(' — ')} />}
                {detalhe.cep && <DetailRow label="CEP" value={maskCep(detalhe.cep)} mono />}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className={`text-right text-sm text-foreground ${mono ? 'font-mono tracking-wide' : ''}`}>{value}</span>
    </div>
  )
}
