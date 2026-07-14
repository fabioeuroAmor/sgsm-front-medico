import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { UserRound, Stethoscope, LogIn, Sparkles } from 'lucide-react'
import { Input, SelectField } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { medicoService } from '@/services/medicoService'
import { pacienteService } from '@/services/pacienteService'
import { authService } from '@/services/authService'
import { cn } from '@/lib/utils'

type Tipo = 'MEDICO' | 'PACIENTE'

const ESPECIALIDADES = [
  'Cardiologia', 'Dermatologia', 'Endocrinologia', 'Ginecologia',
  'Neurologia', 'Oftalmologia', 'Ortopedia', 'Pediatria', 'Psiquiatria', 'Urologia',
]

const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']

export function RegisterPage() {
  const [tipo, setTipo] = useState<Tipo>('PACIENTE')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // campos comuns
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')

  // campos paciente
  const [cpf, setCpf] = useState('')
  const [cpfDisplay, setCpfDisplay] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')

  // campos médico
  const [crm, setCrm] = useState('')
  const [crmUf, setCrmUf] = useState('SP')
  const [especialidade, setEspecialidade] = useState('')

  function handleCpfChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 11)
    let mask = digits
    if (digits.length > 9) mask = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
    else if (digits.length > 6) mask = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
    else if (digits.length > 3) mask = `${digits.slice(0, 3)}.${digits.slice(3)}`
    setCpfDisplay(mask)
    setCpf(digits)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (senha !== confirmarSenha) {
      toast.error('As senhas não conferem.')
      return
    }
    if (senha.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres.')
      return
    }

    setLoading(true)
    try {
      let referenciaId: string

      if (tipo === 'MEDICO') {
        const medico = await medicoService.cadastrar({ nome, crm, crmUf, especialidade, email })
        referenciaId = medico.id
      } else {
        const paciente = await pacienteService.cadastrar({ nome, cpf, dataNascimento, email })
        referenciaId = paciente.id
      }

      await authService.registrar({ email, senha, tipoPerfil: tipo, referenciaId })

      toast.success('Cadastro realizado! Faça login para acessar o sistema.')
      navigate('/login', { replace: true })
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Criar conta</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sistema de Gerenciamento de Serviços Médicos
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-lg p-8">
          {/* Seletor de tipo */}
          <div className="flex gap-3 mb-6">
            {(['PACIENTE', 'MEDICO'] as Tipo[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-2 rounded-xl border-2 py-3 text-xs font-semibold transition-all',
                  tipo === t
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/40',
                )}
              >
                {t === 'PACIENTE' ? <UserRound size={20} /> : <Stethoscope size={20} />}
                {t === 'PACIENTE' ? 'Paciente' : 'Médico'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder={tipo === 'MEDICO' ? 'Dr. João Silva' : 'Maria da Silva'}
              required
            />

            {tipo === 'PACIENTE' && (
              <>
                <Input
                  label="CPF"
                  value={cpfDisplay}
                  onChange={(e) => handleCpfChange(e.target.value)}
                  placeholder="000.000.000-00"
                  required
                />
                <Input
                  label="Data de nascimento"
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  required
                />
              </>
            )}

            {tipo === 'MEDICO' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="CRM"
                    value={crm}
                    onChange={(e) => setCrm(e.target.value)}
                    placeholder="123456"
                    required
                  />
                  <SelectField
                    label="UF do CRM"
                    value={crmUf}
                    onChange={(e) => setCrmUf(e.target.value)}
                  >
                    {UFS.map((uf) => <option key={uf}>{uf}</option>)}
                  </SelectField>
                </div>
                <SelectField
                  label="Especialidade"
                  value={especialidade}
                  onChange={(e) => setEspecialidade(e.target.value)}
                  required
                >
                  <option value="">Selecione…</option>
                  {ESPECIALIDADES.map((e) => <option key={e}>{e}</option>)}
                </SelectField>
              </>
            )}

            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              required
              autoComplete="email"
            />

            <div className="border-t border-border pt-4 flex flex-col gap-4">
              <Input
                label="Senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                autoComplete="new-password"
              />
              <Input
                label="Confirmar senha"
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Repita a senha"
                required
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" className="w-full mt-1" disabled={loading}>
              {loading ? 'Cadastrando...' : 'Criar conta'}
            </Button>
          </form>

          <div className="mt-6">
            <Link
              to="/login"
              className="group relative flex items-center justify-center gap-2.5 w-full rounded-xl px-5 py-3.5 text-sm font-semibold text-white transition-all duration-150 select-none"
              style={{
                background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 60%, #14b8a6 100%)',
                boxShadow: '0 6px 0 #0f5f59, 0 8px 16px rgba(13,148,136,0.45)',
                transform: 'translateY(0px)',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLAnchorElement
                el.style.transform = 'translateY(-2px)'
                el.style.boxShadow = '0 8px 0 #0f5f59, 0 12px 20px rgba(13,148,136,0.5)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLAnchorElement
                el.style.transform = 'translateY(0px)'
                el.style.boxShadow = '0 6px 0 #0f5f59, 0 8px 16px rgba(13,148,136,0.45)'
              }}
              onMouseDown={e => {
                const el = e.currentTarget as HTMLAnchorElement
                el.style.transform = 'translateY(4px)'
                el.style.boxShadow = '0 2px 0 #0f5f59, 0 4px 8px rgba(13,148,136,0.3)'
              }}
              onMouseUp={e => {
                const el = e.currentTarget as HTMLAnchorElement
                el.style.transform = 'translateY(0px)'
                el.style.boxShadow = '0 6px 0 #0f5f59, 0 8px 16px rgba(13,148,136,0.45)'
              }}
            >
              <Sparkles className="w-4 h-4 opacity-90" />
              <span>Já tem conta?</span>
              <span className="font-bold underline underline-offset-2">Entrar</span>
              <LogIn className="w-4 h-4 opacity-90" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
