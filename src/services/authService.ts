import api from './api'
import type {
  LoginRequest,
  LoginResponse,
  RegistrarRequest,
  RegistrarResponse,
  RefreshResponse,
  MeResponse,
} from '../types'

export const authService = {
  login: (body: LoginRequest) =>
    api.post<LoginResponse>('/auth/login', body).then((r) => r.data),

  registrar: (body: RegistrarRequest) =>
    api.post<RegistrarResponse>('/auth/registrar', body).then((r) => r.data),

  me: () =>
    api.get<MeResponse>('/auth/me').then((r) => r.data),

  refresh: (refreshToken: string) =>
    api.post<RefreshResponse>('/auth/refresh', { refreshToken }).then((r) => r.data),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
}
