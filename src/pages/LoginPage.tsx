import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { LogIn, UserPlus, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { httpErrorMsg } from '@/lib/httpError'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation('login')
  const { t: tc } = useTranslation('common')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await login({ email, senha })
      navigate('/pacientes', { replace: true })
    } catch (err) {
      toast.error(httpErrorMsg(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <LogIn className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t('titulo')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('subtitulo')}</p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
              label={tc('email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('email_placeholder')}
              required
              autoComplete="email"
            />
            <Input
              label={tc('senha')}
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
            <Button type="submit" className="w-full mt-1" disabled={loading}>
              {loading ? t('entrando') : t('entrar')}
            </Button>
          </form>

          <div className="mt-6">
            <Link
              to="/registrar"
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
              <span>{t('novo_sistema')}</span>
              <span className="font-bold underline underline-offset-2">{t('criar_conta')}</span>
              <UserPlus className="w-4 h-4 opacity-90" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
