import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { authService } from '@/services/authService'
import { tokenStore } from '@/services/tokenStore'
import type { LoginRequest, MeResponse } from '@/types'

interface AuthContextType {
  usuario: MeResponse | null
  loading: boolean
  isAuthenticated: boolean
  login: (body: LoginRequest) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      setLoading(false)
      return
    }
    authService
      .refresh(refreshToken)
      .then((res) => {
        tokenStore.set(res.accessToken)
        localStorage.setItem('refresh_token', res.refreshToken)
        return authService.me()
      })
      .then((me) => setUsuario(me))
      .catch(() => {
        tokenStore.clear()
        localStorage.removeItem('refresh_token')
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (body: LoginRequest) => {
    const res = await authService.login(body)
    tokenStore.set(res.accessToken)
    localStorage.setItem('refresh_token', res.refreshToken)
    const me = await authService.me()
    setUsuario(me)
  }, [])

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (refreshToken) {
      try {
        await authService.logout(refreshToken)
      } catch {
        // ignora erro de logout — limpa localmente de qualquer forma
      }
    }
    tokenStore.clear()
    localStorage.removeItem('refresh_token')
    setUsuario(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{ usuario, loading, isAuthenticated: usuario !== null, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro do AuthProvider')
  return ctx
}
