import { useRef, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Stethoscope, LogIn, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { pacienteService } from '@/services/pacienteService'
import { authService } from '@/services/authService'

// Cadastro público só de paciente: o médico recebe o acesso pelo convite da clínica (tela /medicos)
export function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const enviandoRef = useRef(false)
  const navigate = useNavigate()

  // ativação da conta do auto-cadastro de paciente (código de 6 dígitos enviado ao e-mail);
  // /registrar?ativar=<email> abre direto nesta etapa (link do aviso de conta não ativada no login)
  const [params, setParams] = useSearchParams()
  const [ativacaoEmail, setAtivacaoEmail] = useState<string | null>(params.get('ativar'))
  const [codigo, setCodigo] = useState('')
  const [ativando, setAtivando] = useState(false)

  // campos do cadastro
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')

  const [cpf, setCpf] = useState('')
  const [cpfDisplay, setCpfDisplay] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [consentimentoLgpd, setConsentimentoLgpd] = useState(false)

  function validarCPF(digits: string): boolean {
    if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false
    const calc = (len: number) => {
      let sum = 0
      for (let i = 0; i < len; i++) sum += parseInt(digits[i]) * (len + 1 - i)
      const r = (sum * 10) % 11
      return r === 10 || r === 11 ? 0 : r
    }
    return calc(9) === parseInt(digits[9]) && calc(10) === parseInt(digits[10])
  }

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
    if (!validarCPF(cpf)) {
      toast.error('CPF inválido.')
      return
    }
    if (dataNascimento && new Date(dataNascimento) > new Date()) {
      toast.error('Data de nascimento não pode ser no futuro.')
      return
    }
    if (!consentimentoLgpd) {
      toast.error('É necessário concordar com o tratamento de dados (LGPD) para se cadastrar.')
      return
    }

    if (enviandoRef.current) return
    enviandoRef.current = true

    setLoading(true)
    try {
      // sem pré-checagem de e-mail: ela revelava quem já tem conta (CPF e e-mail repetidos recebem a
      // mesma resposta do backend, que também desfaz o cadastro se o login não puder ser criado)
      // uma chamada só: o sgsm cria o paciente e o login (inativo até o código do e-mail)
      const resposta = await pacienteService.autoCadastro({ nome, cpf, dataNascimento, email, consentimentoLgpd, senha })
      setAtivacaoEmail(resposta.email)
      // na URL: F5 nesta etapa continua no código, sem voltar ao formulário
      setParams({ ativar: resposta.email }, { replace: true })
      setCodigo('')
      toast.success('Enviamos um código de 6 dígitos para o seu e-mail.')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      enviandoRef.current = false
      setLoading(false)
    }
  }

  async function ativarConta(e: React.FormEvent) {
    e.preventDefault()
    if (!ativacaoEmail || ativando) return
    if (!/^\d{6}$/.test(codigo)) {
      toast.error('Digite os 6 números do código.')
      return
    }
    setAtivando(true)
    try {
      await authService.ativarConta(ativacaoEmail, codigo)
      toast.success('Conta ativada! Faça login para acessar o sistema.')
      navigate('/login', { replace: true })
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setAtivando(false)
    }
  }

  async function reenviarCodigo() {
    if (!ativacaoEmail) return
    try {
      await authService.reenviarCodigoAtivacao(ativacaoEmail)
      toast.success('Se houver cadastro aguardando ativação, enviamos um novo código.')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Criar conta</h1>
          <p className="text-sm text-muted-foreground mt-1">
            IA Sistema de Gerenciamento de Serviços Médicos
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-lg p-8">
          {ativacaoEmail ? (
            <form onSubmit={ativarConta} className="flex flex-col gap-4" aria-label="Ativar conta">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Ative sua conta</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Digite o código de 6 dígitos enviado para <strong className="text-foreground">{ativacaoEmail}</strong>.
                  Ele vale por 15 minutos.
                </p>
              </div>
              <Input
                label="Código de ativação"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                required
              />
              <Button type="submit" className="w-full" disabled={ativando}>
                {ativando ? 'Ativando...' : 'Ativar conta'}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={reenviarCodigo} className="text-primary hover:underline">
                  Reenviar código
                </button>
                <button type="button" onClick={() => { setAtivacaoEmail(null); setCodigo(''); setParams({}, { replace: true }) }}
                  className="text-muted-foreground hover:text-foreground">
                  Voltar ao cadastro
                </button>
              </div>
            </form>
          ) : (<>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Maria da Silva"
              required
            />

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
                <label className="flex items-start gap-2.5 text-sm text-foreground/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentimentoLgpd}
                    onChange={(e) => setConsentimentoLgpd(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border accent-primary shrink-0"
                    required
                  />
                  <span>
                    Concordo com o tratamento dos meus dados de saúde (nome, CPF, data de
                    nascimento, e-mail) conforme a <strong>LGPD</strong>, para fins de
                    agendamento e atendimento médico.
                  </span>
                </label>
            </>

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

          <p className="mt-5 flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            <Stethoscope size={14} className="mt-0.5 shrink-0 text-primary" />
            <span>
              É médico? Seu acesso é criado pela clínica: peça o convite ao administrador do
              estabelecimento e crie sua senha pelo link que chegar no seu e-mail.
            </span>
          </p>
          </>)}

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
