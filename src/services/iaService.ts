import api from './api'

export interface ChatResponse {
  resposta: string
}

export interface DocumentoDto {
  tipo: string
  referenciaId: string
  conteudo: string
  score: number
}

export interface BuscaResponse {
  documentos: DocumentoDto[]
}

const iaApi = {
  chat: (pergunta: string) =>
    api.post<ChatResponse>('/ia/chat', { pergunta }, { baseURL: '' }).then((r) => r.data),

  busca: (q: string, tipo?: string) =>
    api.get<BuscaResponse>('/ia/busca', { baseURL: '', params: { q, tipo } }).then((r) => r.data),

  resumoPaciente: (id: string) =>
    api.get<ChatResponse>(`/ia/paciente/${id}/resumo`, { baseURL: '' }).then((r) => r.data),

  kpis: () =>
    api.get<Record<string, unknown>>('/ia/kpis', { baseURL: '' }).then((r) => r.data),

  etlSync: (tipo?: string) =>
    api.post<Record<string, unknown>>('/ia/etl/sync', null, { baseURL: '', params: { tipo } }).then((r) => r.data),
}

export default iaApi
