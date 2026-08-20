import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { KeyRound, ArrowLeft } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { authService } from '@/services/authService'

export function ResetarSenhaPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const navigate = useNavigate()

  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (novaSenha !== confirmar) {
      toast.error('As senhas não coincidem.')
      return
    }

    if (novaSenha.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres.')
      return
    }

    if (!token) {
      toast.error('Link inválido. Solicite um novo.')
      return
    }

    setLoading(true)
    try {
      await authService.resetarSenha(token, novaSenha)
      toast.success('Senha redefinida com sucesso!')
      navigate('/login', { replace: true })
    } catch (err) {
      toast.error((err as Error).message ?? 'Link inválido ou expirado.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 px-4">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-lg p-8 text-center space-y-4">
          <p className="text-foreground font-medium">Link inválido</p>
          <p className="text-sm text-muted-foreground">
            Este link de redefinição é inválido ou já expirou.
          </p>
          <Link to="/esqueci-senha" className="text-sm text-primary hover:underline">
            Solicitar novo link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <KeyRound className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Redefinir senha</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Escolha uma nova senha para sua conta
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
              label="Nova senha"
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />
            <Input
              label="Confirmar nova senha"
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />
            <Button type="submit" className="w-full mt-1" disabled={loading}>
              {loading ? 'Salvando...' : 'Redefinir senha'}
            </Button>
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para o login
            </Link>
          </form>
        </div>
      </div>
    </div>
  )
}
