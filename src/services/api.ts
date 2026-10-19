import axios from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { tokenStore } from './tokenStore'
import type { RefreshResponse } from '@/types'

interface RetryableConfig extends InternalAxiosRequestConfig {
  _isRetry?: boolean
}

// Mantém status e corpo da resposta (ex.: 409 de horário indisponível traz "alternativas")
export class ApiError extends Error {
  readonly status?: number
  readonly data?: unknown

  constructor(message: string, status?: number, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

// Mensagem do backend quando houver; senão um texto legível no lugar do "Request failed with status code N"
function mensagemDeErro(err: { message?: string; response?: { status: number; data?: { erro?: string; detail?: string } } }) {
  const doBackend = err.response?.data?.erro ?? err.response?.data?.detail
  if (doBackend) return doBackend
  if (!err.response) return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
  const status = err.response.status
  if (status >= 500) return 'Serviço temporariamente indisponível. Tente novamente em instantes.'
  if (status === 401) return 'Faça login para continuar.'
  if (status === 403) return 'Você não tem permissão para realizar esta ação.'
  if (status === 404) return 'Registro não encontrado.'
  return err.message ?? 'Erro desconhecido'
}

const api = axios.create({
  baseURL: '/v1/api',
  timeout: 300_000,
  headers: { 'Content-Type': 'application/json' },
})

// Endpoints públicos de autenticação: um 401 aqui é erro de credencial/entrada
// do próprio usuário, não sessão expirada — não deve disparar refresh/redirect.
const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/registrar', '/auth/esqueci-senha', '/auth/resetar-senha', '/auth/ativar-conta', '/publico/']

// Telas abertas (sem PrivateRoute, ver App.tsx): quem está nelas não tem sessão para "expirar" —
// um 401 vira erro comum da tela, sem mandar para /login?sessao=expirada
const PUBLIC_PAGES = ['/', '/world', '/login', '/registrar', '/esqueci-senha', '/resetar-senha']

let refreshPromise: Promise<string> | null = null

export function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) return Promise.reject(new Error('Não autenticado.'))

  if (!refreshPromise) {
    refreshPromise = axios
      .post<RefreshResponse>('/v1/api/auth/refresh', { refreshToken })
      .then((res) => {
        tokenStore.set(res.data.accessToken)
        localStorage.setItem('refresh_token', res.data.refreshToken)
        return res.data.accessToken
      })
      .finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

api.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config as RetryableConfig
    const isPublicAuthPath = PUBLIC_AUTH_PATHS.some((p) => originalRequest.url?.includes(p))

    if (err.response?.status === 401 && !originalRequest._isRetry && !isPublicAuthPath) {
      originalRequest._isRetry = true

      try {
        const accessToken = await refreshAccessToken()
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch {
        if (PUBLIC_PAGES.includes(window.location.pathname)) {
          return Promise.reject(new ApiError(mensagemDeErro(err), 401, err.response?.data))
        }
        tokenStore.clear()
        localStorage.removeItem('refresh_token')
        window.location.href = '/login?sessao=expirada'
        return Promise.reject(new Error('Sessão expirada. Faça login novamente.'))
      }
    }

    return Promise.reject(new ApiError(mensagemDeErro(err), err.response?.status, err.response?.data))
  },
)

export default api
