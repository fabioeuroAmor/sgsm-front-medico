import api from './api'
import type {
  FuncionarioResponse,
  CadastrarFuncionarioRequest,
  AtualizarFuncionarioRequest,
  FiltrosFuncionario,
} from '../types'

const BASE = '/funcionarios'

export const funcionarioService = {
  listar: (filtros?: FiltrosFuncionario) =>
    api.get<FuncionarioResponse[]>(BASE, { params: filtros }).then((r) => r.data),

  consultar: (id: string) =>
    api.get<FuncionarioResponse>(`${BASE}/${id}`).then((r) => r.data),

  cadastrar: (body: CadastrarFuncionarioRequest) =>
    api.post<FuncionarioResponse>(BASE, body).then((r) => r.data),

  atualizar: (id: string, body: AtualizarFuncionarioRequest) =>
    api.put<FuncionarioResponse>(`${BASE}/${id}`, body).then((r) => r.data),

  remover: (id: string) => api.delete(`${BASE}/${id}`),

  reativar: (id: string) =>
    api.patch<FuncionarioResponse>(`${BASE}/${id}/reativar`).then((r) => r.data),
}
