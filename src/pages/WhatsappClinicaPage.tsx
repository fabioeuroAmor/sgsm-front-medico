import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageCircle, Link2, Unlink, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { estabelecimentoService } from '@/services/estabelecimentoService'
import { whatsappCanalService, type WhatsappCanal } from '@/services/whatsappCanalService'
import { ApiError } from '@/services/api'
import type { EstabelecimentoResponse } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

// WhatsApp da clínica — Etapa 1 do Plano_Desenvolvimento_WhatsApp_Por_Clinica_SGSM.docx:
// o ADMIN_ESTABELECIMENTO conecta o número da clínica lendo o QR code no celular (DW2, um número
// por clínica — DW3). A partir daí, as conversas desse número entram no SGSM já na clínica certa.
// A equipe (FUNCIONARIO) só acompanha o status. A barreira real é o sgsm (403/404).

const PODE_VER = ['FUNCIONARIO', 'ADMIN_ESTABELECIMENTO', 'DESENVOLVEDOR']
const PODE_CONECTAR = ['ADMIN_ESTABELECIMENTO', 'DESENVOLVEDOR']
const INTERVALO_STATUS_MS = 5000

function imagemQr(base64: string) {
  return base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`
}

function telefone(e164: string | null) {
  if (!e164) return '—'
  const d = e164.replace(/\D/g, '')
  const m = d.match(/^55(\d{2})(\d{4,5})(\d{4})$/)
  return m ? `+55 (${m[1]}) ${m[2]}-${m[3]}` : `+${d}`
}

export function WhatsappClinicaPage() {
  const { usuario } = useAuth()
  const perfil = usuario?.perfil ?? ''
  const podeConectar = PODE_CONECTAR.includes(perfil)

  const [clinicas, setClinicas] = useState<EstabelecimentoResponse[]>([])
  const [clinicaId, setClinicaId] = useState('')
  const [canal, setCanal] = useState<WhatsappCanal | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  // resposta de uma clínica antiga (troca no meio da consulta) não pode sobrescrever a atual
  const clinicaAtual = useRef('')
  // sgsm fora do ar ao abrir a tela: sem a lista de clínicas não há o que consultar (QA WA-T12)
  const [erroClinicas, setErroClinicas] = useState<string | null>(null)
  const [carregandoClinicas, setCarregandoClinicas] = useState(true)

  const carregarClinicas = useCallback(async () => {
    setCarregandoClinicas(true)
    try {
      const lista = await estabelecimentoService.listar()
      setClinicas(lista)
      setClinicaId((atual) => atual || lista[0]?.id || '')
      setErroClinicas(null)
    } catch (e) {
      setErroClinicas((e as Error).message)
    } finally {
      setCarregandoClinicas(false)
    }
  }, [])

  useEffect(() => { carregarClinicas() }, [carregarClinicas])

  const consultar = useCallback(async (id: string, silencioso = false) => {
    if (!silencioso) setCarregando(true)
    try {
      const c = await whatsappCanalService.consultar(id)
      if (clinicaAtual.current !== id) return
      setCanal((anterior) => {
        if (anterior && anterior.status !== 'CONECTADO' && c.status === 'CONECTADO') {
          toast.success('WhatsApp da clínica conectado')
        }
        return c
      })
      setErro(null)
    } catch (e) {
      if (clinicaAtual.current !== id) return
      if (e instanceof ApiError && e.status === 404) {
        setCanal(null)
        setErro(null)
      } else if (!silencioso) {
        setErro((e as Error).message)
      }
    } finally {
      if (!silencioso && clinicaAtual.current === id) setCarregando(false)
    }
  }, [])

  useEffect(() => {
    clinicaAtual.current = clinicaId
    setCanal(null)
    setErro(null)
    if (clinicaId) consultar(clinicaId)
  }, [clinicaId, consultar])

  // Enquanto o QR está na tela, confere o status até o celular ler o código
  const aguardandoLeitura = !!canal && canal.status !== 'CONECTADO'
  useEffect(() => {
    if (!aguardandoLeitura || !clinicaId) return
    const timer = window.setInterval(() => consultar(clinicaId, true), INTERVALO_STATUS_MS)
    return () => window.clearInterval(timer)
  }, [aguardandoLeitura, clinicaId, consultar])

  async function conectar() {
    setOcupado(true)
    try {
      const c = await whatsappCanalService.conectar(clinicaId)
      if (clinicaAtual.current === clinicaId) setCanal(c)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  async function desconectar() {
    if (!window.confirm('Desconectar o WhatsApp desta clínica? Os pacientes deixam de ser atendidos por este número até ele ser conectado de novo.')) return
    setOcupado(true)
    try {
      await whatsappCanalService.desconectar(clinicaId)
      toast.success('WhatsApp da clínica desconectado')
      setCanal(null)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  if (!PODE_VER.includes(perfil)) {
    return <div className="text-center py-16 text-muted-foreground">O WhatsApp da clínica é gerenciado pela equipe do estabelecimento.</div>
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[hsl(190,100%,10%)] via-[hsl(190,100%,14%)] to-[hsl(190,100%,18%)] p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-400/70">Atendimento</p>
        <h1 className="text-3xl font-extrabold text-white leading-tight flex items-center gap-3"><MessageCircle size={26} /> WhatsApp da clínica</h1>
        <p className="text-sm text-white/50 max-w-xl mt-2">Conecte o número de WhatsApp da clínica. Pacientes que falarem com ele são atendidos pelo assistente e cadastrados já nesta clínica.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select value={clinicaId} onChange={(e) => setClinicaId(e.target.value)} aria-label="Estabelecimento"
          className="rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring min-w-64">
          {clinicas.length === 0 && <option value="">Nenhum estabelecimento</option>}
          {clinicas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        {canal && podeConectar && (
          <div className="ml-auto">
            <Button size="sm" variant="ghost" onClick={desconectar} disabled={ocupado}><Unlink size={14} /> Desconectar</Button>
          </div>
        )}
      </div>

      {(carregando || carregandoClinicas) && <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-[hsl(184,80%,50%)]" /></div>}

      {!carregandoClinicas && erroClinicas && (
        <Card className="p-6 flex gap-3 items-start">
          <AlertTriangle size={20} className="text-orange-400 shrink-0" />
          <div className="space-y-2">
            <p className="font-semibold text-secondary">Não foi possível carregar os estabelecimentos</p>
            <p className="text-sm text-muted-foreground">{erroClinicas}</p>
            <Button size="sm" variant="ghost" onClick={carregarClinicas}><RefreshCw size={14} /> Tentar de novo</Button>
          </div>
        </Card>
      )}

      {!carregandoClinicas && !erroClinicas && clinicas.length === 0 && (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Você não está vinculado a nenhum estabelecimento.</p>
        </Card>
      )}

      {!carregando && erro && (
        <Card className="p-6 flex gap-3 items-start">
          <AlertTriangle size={20} className="text-orange-400 shrink-0" />
          <div className="space-y-2">
            <p className="font-semibold text-secondary">Não foi possível consultar o WhatsApp da clínica</p>
            <p className="text-sm text-muted-foreground">{erro}</p>
            <Button size="sm" variant="ghost" onClick={() => consultar(clinicaId)}><RefreshCw size={14} /> Tentar de novo</Button>
          </div>
        </Card>
      )}

      {!carregando && !erro && clinicaId && !canal && (
        <Card className="p-6 flex flex-col items-start gap-3">
          <p className="font-semibold text-secondary">Nenhum WhatsApp conectado</p>
          {podeConectar ? (
            <>
              <p className="text-sm text-muted-foreground">Ao conectar, aparece um QR code. No celular da clínica, abra o WhatsApp › Aparelhos conectados › Conectar um aparelho e leia o código.</p>
              <Button onClick={conectar} disabled={ocupado}>
                {ocupado ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />} Conectar WhatsApp
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Peça ao administrador do estabelecimento para conectar o número da clínica.</p>
          )}
        </Card>
      )}

      {!carregando && !erro && canal?.status === 'CONECTADO' && (
        <Card className="p-6 flex gap-3 items-start">
          <CheckCircle2 size={22} className="text-emerald-400 shrink-0" />
          <div>
            <p className="font-semibold text-secondary">Conectado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Número <span className="font-semibold text-secondary" data-testid="numero-clinica">{telefone(canal.numero)}</span>
              {canal.conectadoEm && <> · desde {new Date(canal.conectadoEm).toLocaleString('pt-BR')}</>}
            </p>
          </div>
        </Card>
      )}

      {!carregando && !erro && aguardandoLeitura && (
        <Card className="p-6 flex flex-col sm:flex-row gap-6 items-start">
          {canal.qrCodeBase64 ? (
            <img src={imagemQr(canal.qrCodeBase64)} alt="QR code para conectar o WhatsApp da clínica"
              className="w-64 h-64 rounded-xl bg-white p-2 shrink-0" />
          ) : (
            <div className="w-64 h-64 rounded-xl border border-border flex items-center justify-center text-sm text-muted-foreground shrink-0">
              Gerando QR code…
            </div>
          )}
          <div className="space-y-2">
            <p className="font-semibold text-secondary">
              {canal.status === 'DESCONECTADO' ? 'O número desconectou — leia o QR code de novo' : 'Aguardando a leitura do QR code'}
            </p>
            {podeConectar ? (
              <ol className="text-sm text-muted-foreground list-decimal ml-4 space-y-1">
                <li>No celular da clínica, abra o WhatsApp.</li>
                <li>Toque em Aparelhos conectados › Conectar um aparelho.</li>
                <li>Aponte a câmera para o código ao lado.</li>
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">O administrador do estabelecimento precisa concluir a conexão.</p>
            )}
            <p className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Conferindo a cada 5 segundos…</p>
          </div>
        </Card>
      )}
    </div>
  )
}
