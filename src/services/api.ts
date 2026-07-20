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
      const refreshToken = localStorage.getItem('refresh_token')

      if (refreshToken) {
        try {
          const res = await axios.post<{ accessToken: string }>(
            '/v1/api/auth/refresh',
            { refreshToken },
          )
          tokenStore.set(res.data.accessToken)
          originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`
          return api(originalRequest)
        } catch {
          tokenStore.clear()
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
          return Promise.reject(new Error('Sessão expirada. Faça login novamente.'))
        }
      } else {
        window.location.href = '/login'
        return Promise.reject(new Error('Não autenticado.'))
      }
    }

    const message =
      err.response?.data?.erro ?? err.response?.data?.detail ?? err.message ?? 'Erro desconhecido'
    return Promise.reject(new Error(message))
  },
)

export default api
