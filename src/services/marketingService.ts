import api from './api'

// Tráfego pago (Meta Ads) — sgsm-ia, prefixo /marketing/meta (proxy do Vite / Nginx)

export interface StatusConexao {
  conectado: boolean
  status: 'NAO_CONECTADA' | 'ATIVA' | 'EXPIRADA' | 'REVOGADA' | 'ERRO'
  metaUsuario: string | null
  tipoToken: string | null
  expiraEm: string | null
  ultimoSyncEm: string | null
  ultimoErro: string | null
}

export interface ContaAnuncio {
  actId: string
  nome: string | null
  moeda: string | null
  fusoHorario: string | null
  statusConta: number | null
  selecionada: boolean
}

export interface Totais {
  gasto: number
  impressoes: number
  alcanceSomado: number
  cliques: number
  leads: number
  ctr: number | null
  cpc: number | null
  cpm: number | null
  cpl: number | null
}

export interface MetricaCampanha {
  campanha_id: string
  nome: string | null
  status_efetivo: string | null
  objetivo: string | null
  gasto: number
  impressoes: number
  cliques: number
  leads: number
  ctr: number | null
  cpl: number | null
}

export interface Dashboard {
  de: string
  ate: string
  moeda: string | null
  totais: Totais
  periodoAnterior: Totais
  porCampanha: MetricaCampanha[]
  serieDiaria: Array<{ data: string; gasto: number; cliques: number; leads: number }>
}

export interface ResultadoSync {
  status: 'SUCESSO' | 'PARCIAL'
  contas: number
  campanhas: number
  conjuntos: number
  anuncios: number
  insights: number
  interrompidoPorLimite: boolean
}

const B = { baseURL: '' }
const base = (estabelecimentoId: string) => `/marketing/meta/estabelecimentos/${estabelecimentoId}`

const marketingService = {
  iniciarConexao: (estabelecimentoId: string) =>
    api.post<{ url: string }>(`${base(estabelecimentoId)}/conexao/iniciar`, null, B).then((r) => r.data.url),

  status: (estabelecimentoId: string) =>
    api.get<StatusConexao>(`${base(estabelecimentoId)}/conexao`, B).then((r) => r.data),

  desconectar: (estabelecimentoId: string) =>
    api.delete(`${base(estabelecimentoId)}/conexao`, B),

  contasDisponiveis: (estabelecimentoId: string) =>
    api.get<ContaAnuncio[]>(`${base(estabelecimentoId)}/contas-disponiveis`, B).then((r) => r.data),

  selecionarContas: (estabelecimentoId: string, actIds: string[]) =>
    api.put<ContaAnuncio[]>(`${base(estabelecimentoId)}/contas`, { actIds }, B).then((r) => r.data),

  sincronizar: (estabelecimentoId: string) =>
    api.post<ResultadoSync>(`${base(estabelecimentoId)}/sincronizar`, null, B).then((r) => r.data),

  metricas: (estabelecimentoId: string, de: string, ate: string) =>
    api.get<Dashboard>(`${base(estabelecimentoId)}/metricas`, { ...B, params: { de, ate } }).then((r) => r.data),
}

export default marketingService
