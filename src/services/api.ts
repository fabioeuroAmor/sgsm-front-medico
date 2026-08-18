import axios from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { tokenStore } from './tokenStore'

interface RetryableConfig extends InternalAxiosRequestConfig {
  _isRetry?: boolean
}

const api = axios.create({
  baseURL: '/v1/api',
  timeout: 300_000,
  headers: { 'Content-Type': 'application/json' },
})

let refreshPromise: Promise<string> | null = null

export function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) return Promise.reject(new Error('Não autenticado.'))

  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ accessToken: string }>('/v1/api/auth/refresh', { refreshToken })
      .then((res) => {
        tokenStore.set(res.data.accessToken)
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

    if (err.response?.status === 401 && !originalRequest._isRetry) {
      originalRequest._isRetry = true

      try {
        const accessToken = await refreshAccessToken()
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch {
        tokenStore.clear()
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
        return Promise.reject(new Error('Sessão expirada. Faça login novamente.'))
      }
    }

    const message =
      err.response?.data?.erro ?? err.response?.data?.detail ?? err.message ?? 'Erro desconhecido'
    return Promise.reject(new Error(message))
  },
)

export default api
