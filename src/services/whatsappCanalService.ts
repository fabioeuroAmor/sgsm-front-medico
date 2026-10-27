import api from './api'

// WhatsApp da clínica — sgsm, /estabelecimentos/{id}/whatsapp (Plano WhatsApp por clínica, Etapa 1)

export type StatusCanal = 'PENDENTE_QR' | 'CONECTADO' | 'DESCONECTADO' | 'REMOVIDO'

export interface WhatsappCanal {
  id: string
  estabelecimentoId: string
  provedor: 'EVOLUTION' | 'CLOUD_API'
  status: StatusCanal
  numero: string | null
  conectadoEm: string | null
  // só vem enquanto o número não foi conectado
  qrCodeBase64: string | null
}

const base = (estabelecimentoId: string) => `/estabelecimentos/${estabelecimentoId}/whatsapp`

export const whatsappCanalService = {
  consultar: (estabelecimentoId: string) =>
    api.get<WhatsappCanal>(base(estabelecimentoId)).then((r) => r.data),

  conectar: (estabelecimentoId: string) =>
    api.post<WhatsappCanal>(base(estabelecimentoId)).then((r) => r.data),

  desconectar: (estabelecimentoId: string): Promise<void> =>
    api.delete(base(estabelecimentoId)).then(() => undefined),
}
