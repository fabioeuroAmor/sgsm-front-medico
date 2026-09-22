import api from './api'
import type {
  AdministradorResponse,
  CadastrarAdministradorRequest,
  AtualizarAdministradorRequest,
  AssociarEstabelecimentosRequest,
  FiltrosAdministrador,
  EstabelecimentoResponse,
} from '../types'

const BASE = '/administradores'

export const administradorService = {
  listar: (filtros?: FiltrosAdministrador) =>
    api.get<AdministradorResponse[]>(BASE, { params: filtros }).then((r) => r.data),

  consultar: (id: string) =>
    api.get<AdministradorResponse>(`${BASE}/${id}`).then((r) => r.data),

  cadastrar: (body: CadastrarAdministradorRequest) =>
    api.post<AdministradorResponse>(BASE, body).then((r) => r.data),

  atualizar: (id: string, body: AtualizarAdministradorRequest) =>
    api.put<AdministradorResponse>(`${BASE}/${id}`, body).then((r) => r.data),

  remover: (id: string) => api.delete(`${BASE}/${id}`),

  reativar: (id: string) =>
    api.patch<AdministradorResponse>(`${BASE}/${id}/reativar`).then((r) => r.data),

  listarEstabelecimentos: (id: string): Promise<EstabelecimentoResponse[]> =>
    api.get<EstabelecimentoResponse[]>(`${BASE}/${id}/estabelecimentos`).then((r) => r.data),

  associarEstabelecimentos: (id: string, body: AssociarEstabelecimentosRequest): Promise<void> =>
    api.put(`${BASE}/${id}/estabelecimentos`, body).then(() => undefined),
}
