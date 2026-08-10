import api from './api'

export interface Lead {
  id: string
  nome: string
  email: string
  telefone: string
  interesse: string
  origem: string
  status: string
  observacoes: string
  criado_em: string
  atualizado_em: string
}

export interface Tag {
  id: string
  paciente_id: string
  tag: string
  tipo: string
  criado_em: string
}

export interface Contato {
  id: string
  paciente_id: string
  tipo: string
  direcao: string
  descricao: string
  duracao_segundos: number | null
  criado_em: string
}

export interface NotaClinica {
  id: string
  paciente_id: string
  medico_id: string
  medico_nome: string
  tipo: string
  conteudo: string
  criado_em: string
}

export interface KpisData {
  resumo: {
    total_agendamentos: number
    concluidos: number
    cancelados: number
    no_shows: number
    taxa_conversao_pct: number
    receita_total: number
    ticket_medio_geral: number
    total_pacientes: number
    novos_pacientes_30d: number
    medicos_ativos: number
    atualizado_em: string
  }
  faturamentoMensal: Array<{
    mes: string
    total_transacoes: number
    aprovados: number
    recusados: number
    receita_bruta: number
    receita_pix: number
    receita_cartao: number
    total_reembolsos: number
    ticket_medio: number
  }>
  ocupacaoAgenda: Array<{
    medico_id: string
    medico_nome: string
    especialidade: string
    slots_usados: number
    slots_totais: number
    taxa_ocupacao_pct: number
  }>
  pacientesAltoValor: Array<{
    paciente_id: string
    nome: string
    email: string
    ltv_total: number
    total_pagamentos: number
    quintil: number
  }>
  churnRisco: Array<Record<string, unknown>>
  funilMedico: Array<{
    medico_id: string
    medico_nome: string
    especialidade: string
    total: number
    concluidos: number
    cancelados: number
    no_shows: number
    taxa_conversao_pct: number
    receita_total: number
  }>
  cancelamentos: Array<{
    origem_cancelamento: string
    mes: string
    total_cancelamentos: number
    pacientes_distintos: number
    medicos_distintos: number
  }>
}

const B = { baseURL: '' }

const crmService = {
  listarLeads: (status?: string, origem?: string) =>
    api.get<Lead[]>('/crm/leads', { ...B, params: { status, origem } }).then((r) => r.data),

  criarLead: (body: Partial<Lead>) =>
    api.post<{ id: string; status: string }>('/crm/leads', body, B).then((r) => r.data),

  atualizarStatusLead: (id: string, status: string, observacoes?: string) =>
    api.patch(`/crm/leads/${id}/status`, { status, observacoes }, B),

  listarTags: (pacienteId: string) =>
    api.get<Tag[]>(`/crm/paciente/${pacienteId}/tags`, B).then((r) => r.data),

  adicionarTag: (pacienteId: string, tag: string) =>
    api.post(`/crm/paciente/${pacienteId}/tags`, { tag }, B),

  removerTag: (tagId: string) =>
    api.delete(`/crm/tags/${tagId}`, B),

  listarContatos: (pacienteId: string) =>
    api.get<Contato[]>(`/crm/paciente/${pacienteId}/contatos`, B).then((r) => r.data),

  registrarContato: (pacienteId: string, body: { tipo: string; direcao: string; descricao: string; duracaoSegundos?: number }) =>
    api.post(`/crm/paciente/${pacienteId}/contatos`, body, B),

  listarNotas: (pacienteId: string) =>
    api.get<NotaClinica[]>(`/crm/paciente/${pacienteId}/notas`, B).then((r) => r.data),

  adicionarNota: (pacienteId: string, body: { tipo: string; conteudo: string; agendamentoId?: string }) =>
    api.post(`/crm/paciente/${pacienteId}/notas`, body, B),

  paciente360: (pacienteId: string) =>
    api.get<Record<string, unknown>>(`/crm/paciente/${pacienteId}/360`, B).then((r) => r.data),

  churn: () =>
    api.get<Record<string, unknown>[]>('/crm/churn', B).then((r) => r.data),

  kpis: () =>
    api.get<KpisData>('/ia/kpis', B).then((r) => r.data),
}

export default crmService
