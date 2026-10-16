import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Megaphone, Link2, Unlink, RefreshCw, Loader2, AlertTriangle, CheckSquare, Square } from 'lucide-react'
import { toast } from 'sonner'
import marketingService, { type ContaAnuncio, type Dashboard, type StatusConexao, type Totais } from '@/services/marketingService'
import { estabelecimentoService } from '@/services/estabelecimentoService'
import type { EstabelecimentoResponse } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { podeIa } from '@/lib/permissoesIa'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

// Tráfego pago (Meta Ads) — Etapa 1 do Plano_Desenvolvimento_Trafego_Pago_Meta_Ads_SGSM.docx:
// o ADMIN_ESTABELECIMENTO conecta a conta Meta da clínica, escolhe as contas de anúncio e acompanha
// gasto, leads, CPL e CTR. Os dados vêm do banco do SGSM (sincronizado a cada 3h), não da Meta em
// tempo real. O token da Meta nunca chega ao navegador.

const PERIODOS = [7, 30, 90] as const

const MENSAGENS_RETORNO: Record<string, string> = {
  state_invalido: 'O link de conexão expirou ou já foi usado. Tente conectar de novo.',
  permissao_negada: 'A permissão de leitura de anúncios (ads_read) não foi concedida na Meta.',
  falha_meta: 'A Meta não concluiu a conexão. Tente novamente em instantes.',
}

function isoDia(d: Date) {
  return d.toISOString().slice(0, 10)
}

function dinheiro(v: number | null | undefined, moeda: string | null) {
  if (v == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda ?? 'BRL' }).format(Number(v))
}

function numero(v: number | null | undefined, casas = 0) {
  if (v == null) return '—'
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

function dataHora(iso: string | null) {
  return iso ? new Date(iso).toLocaleString('pt-BR') : '—'
}

// Variação contra o período anterior de mesmo tamanho; para CPL, cair é bom
function Variacao({ atual, anterior, menorMelhor = false }: { atual: number | null; anterior: number | null; menorMelhor?: boolean }) {
  if (atual == null || anterior == null || Number(anterior) === 0) return null
  const pct = ((Number(atual) - Number(anterior)) / Number(anterior)) * 100
  const bom = menorMelhor ? pct < 0 : pct > 0
  return (
    <span className={cn('text-[11px] font-semibold', bom ? 'text-emerald-400' : 'text-red-400')}>
      {pct > 0 ? '+' : ''}{pct.toFixed(1)}% vs período anterior
    </span>
  )
}

function Metrica({ titulo, valor, atual, anterior, menorMelhor }: {
  titulo: string; valor: string; atual: number | null; anterior: number | null; menorMelhor?: boolean
}) {
  return (
    <Card className="p-4 flex flex-col gap-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</p>
      <p className="text-2xl font-extrabold text-secondary">{valor}</p>
      <Variacao atual={atual} anterior={anterior} menorMelhor={menorMelhor} />
    </Card>
  )
}

function PainelMetricas({ dashboard }: { dashboard: Dashboard }) {
  const { totais: t, periodoAnterior: a, moeda } = dashboard
  const maxGasto = Math.max(...dashboard.serieDiaria.map((d) => Number(d.gasto)), 1)
  const cartoes: Array<{ titulo: string; valor: string; chave: keyof Totais; menorMelhor?: boolean }> = [
    { titulo: 'Gasto', valor: dinheiro(t.gasto, moeda), chave: 'gasto' },
    { titulo: 'Leads', valor: numero(t.leads), chave: 'leads' },
    { titulo: 'Custo por lead (CPL)', valor: dinheiro(t.cpl, moeda), chave: 'cpl', menorMelhor: true },
    { titulo: 'CTR', valor: t.ctr == null ? '—' : `${numero(t.ctr, 2)}%`, chave: 'ctr' },
    { titulo: 'Cliques', valor: numero(t.cliques), chave: 'cliques' },
    { titulo: 'Impressões', valor: numero(t.impressoes), chave: 'impressoes' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {cartoes.map((c) => (
          <Metrica key={c.chave} titulo={c.titulo} valor={c.valor} menorMelhor={c.menorMelhor}
            atual={t[c.chave] as number | null} anterior={a[c.chave] as number | null} />
        ))}
      </div>

      {dashboard.serieDiaria.length > 0 && (
        <Card className="p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gasto por dia</p>
          <div className="flex items-end gap-1 h-32">
            {dashboard.serieDiaria.map((d) => (
              <div key={d.data} className="flex-1 bg-[hsl(184,80%,40%)] rounded-t"
                style={{ height: `${Math.max((Number(d.gasto) / maxGasto) * 100, 2)}%` }}
                title={`${new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR')}: ${dinheiro(d.gasto, moeda)} · ${d.leads} leads`} />
            ))}
          </div>
        </Card>
      )}

      <div className="overflow-x-auto rounded-xl border border-[hsl(190,100%,20%)]">
        <table className="w-full text-sm">
          <thead className="bg-[hsl(190,100%,12%)] text-[hsl(185,59%,55%)] text-xs uppercase tracking-wide">
            <tr>
              {['Campanha', 'Status', 'Gasto', 'Leads', 'CPL', 'CTR'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(190,100%,18%)]">
            {dashboard.porCampanha.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhuma campanha com dados no período</td></tr>
            )}
            {dashboard.porCampanha.map((c) => (
              <tr key={c.campanha_id} className="bg-[hsl(190,100%,10%)]">
                <td className="px-4 py-3 font-medium text-white">{c.nome ?? c.campanha_id}</td>
                <td className="px-4 py-3 text-xs text-[hsl(185,59%,65%)]">{c.status_efetivo ?? '—'}</td>
                <td className="px-4 py-3 text-[hsl(185,59%,80%)]">{dinheiro(c.gasto, moeda)}</td>
                <td className="px-4 py-3 text-[hsl(185,59%,80%)]">{numero(c.leads)}</td>
                <td className="px-4 py-3 text-[hsl(185,59%,80%)]">{dinheiro(c.cpl, moeda)}</td>
                <td className="px-4 py-3 text-[hsl(185,59%,80%)]">{c.ctr == null ? '—' : `${numero(c.ctr, 2)}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function TrafegoPagoPage() {
  const { usuario } = useAuth()
  const [params, setParams] = useSearchParams()
  const [clinicas, setClinicas] = useState<EstabelecimentoResponse[]>([])
  const [clinicaId, setClinicaId] = useState<string>('')
  const [status, setStatus] = useState<StatusConexao | null>(null)
  const [contas, setContas] = useState<ContaAnuncio[]>([])
  const [escolha, setEscolha] = useState<Set<string>>(new Set())
  const [dias, setDias] = useState<(typeof PERIODOS)[number]>(30)
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [naoConfigurada, setNaoConfigurada] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  // Resultado da volta da Meta (?meta=conectado|cancelado|erro&estabelecimento=...&motivo=...)
  useEffect(() => {
    const resultado = params.get('meta')
    if (!resultado) return
    if (resultado === 'conectado') toast.success('Conta Meta Ads conectada. Agora escolha as contas de anúncio da clínica.')
    else if (resultado === 'cancelado') toast.info('Conexão com a Meta cancelada.')
    else toast.error(MENSAGENS_RETORNO[params.get('motivo') ?? ''] ?? 'Não foi possível conectar à Meta.')
    const clinicaRetorno = params.get('estabelecimento')
    if (clinicaRetorno) setClinicaId(clinicaRetorno)
    setParams({}, { replace: true })
  }, [params, setParams])

  // O sgsm já devolve só as clínicas do escopo do usuário
  useEffect(() => {
    estabelecimentoService.listar()
      .then((lista) => {
        setClinicas(lista)
        setClinicaId((atual) => atual || lista[0]?.id || '')
      })
      .catch(() => toast.error('Erro ao carregar estabelecimentos'))
  }, [])

  const carregar = useCallback(async (id: string) => {
    setCarregando(true)
    setDashboard(null)
    setContas([])
    try {
      const s = await marketingService.status(id)
      setNaoConfigurada(false)
      setStatus(s)
      if (s.conectado) {
        const lista = await marketingService.contasDisponiveis(id)
        setContas(lista)
        setEscolha(new Set(lista.filter((c) => c.selecionada).map((c) => c.actId)))
      }
    } catch (e) {
      const msg = (e as Error).message
      if (msg.toLowerCase().includes('não configurada')) setNaoConfigurada(true)
      else toast.error(msg)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { if (clinicaId) carregar(clinicaId) }, [clinicaId, carregar])

  const temContaSelecionada = contas.some((c) => c.selecionada)

  useEffect(() => {
    if (!clinicaId || !status?.conectado || !temContaSelecionada) return
    const ate = new Date()
    const de = new Date()
    de.setDate(ate.getDate() - (dias - 1))
    marketingService.metricas(clinicaId, isoDia(de), isoDia(ate))
      .then(setDashboard)
      .catch((e) => toast.error((e as Error).message))
  }, [clinicaId, status, temContaSelecionada, dias])

  async function conectar() {
    setOcupado(true)
    try {
      // O navegador vai para a Meta e volta pelo callback do sgsm-ia
      window.location.href = await marketingService.iniciarConexao(clinicaId)
    } catch (e) {
      toast.error((e as Error).message)
      setOcupado(false)
    }
  }

  async function desconectar() {
    if (!window.confirm('Desconectar a conta Meta Ads desta clínica? O histórico de métricas é mantido.')) return
    setOcupado(true)
    try {
      await marketingService.desconectar(clinicaId)
      toast.success('Conta Meta Ads desconectada')
      await carregar(clinicaId)
    } catch (e) { toast.error((e as Error).message) } finally { setOcupado(false) }
  }

  async function salvarContas() {
    setOcupado(true)
    try {
      const lista = await marketingService.selecionarContas(clinicaId, [...escolha])
      setContas(lista)
      toast.success('Contas de anúncio salvas. Sincronizando…')
      await sincronizar()
    } catch (e) { toast.error((e as Error).message) } finally { setOcupado(false) }
  }

  async function sincronizar() {
    setOcupado(true)
    try {
      const r = await marketingService.sincronizar(clinicaId)
      if (r.interrompidoPorLimite) toast.warning('Sincronização parcial: limite de uso da API da Meta. O restante vem na próxima rodada.')
      else toast.success(`Sincronizado: ${r.campanhas} campanhas, ${r.insights} registros de métricas`)
      await carregar(clinicaId)
    } catch (e) { toast.error((e as Error).message) } finally { setOcupado(false) }
  }

  function alternar(actId: string) {
    setEscolha((atual) => {
      const nova = new Set(atual)
      if (nova.has(actId)) nova.delete(actId)
      else nova.add(actId)
      return nova
    })
  }

  if (!podeIa(usuario?.perfil, 'trafegoPago')) {
    return <div className="text-center py-16 text-muted-foreground">Tráfego pago é exclusivo do administrador do estabelecimento.</div>
  }

  const precisaReconectar = status && !status.conectado && (status.status === 'EXPIRADA' || status.status === 'ERRO')

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[hsl(190,100%,10%)] via-[hsl(190,100%,14%)] to-[hsl(190,100%,18%)] p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-400/70">Marketing</p>
        <h1 className="text-3xl font-extrabold text-white leading-tight flex items-center gap-3"><Megaphone size={26} /> Tráfego pago</h1>
        <p className="text-sm text-white/50 max-w-xl mt-2">Conecte a conta Meta Ads da clínica e acompanhe gasto, leads e custo por lead das campanhas.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select value={clinicaId} onChange={(e) => setClinicaId(e.target.value)}
          className="rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring min-w-64">
          {clinicas.length === 0 && <option value="">Nenhum estabelecimento</option>}
          {clinicas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        {status?.conectado && (
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="ghost" onClick={sincronizar} disabled={ocupado}><RefreshCw size={14} /> Sincronizar agora</Button>
            <Button size="sm" variant="ghost" onClick={desconectar} disabled={ocupado}><Unlink size={14} /> Desconectar</Button>
          </div>
        )}
      </div>

      {carregando && <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-[hsl(184,80%,50%)]" /></div>}

      {!carregando && naoConfigurada && (
        <Card className="p-6 flex gap-3 items-start">
          <AlertTriangle size={20} className="text-orange-400 shrink-0" />
          <div>
            <p className="font-semibold text-secondary">Integração com a Meta não configurada neste ambiente</p>
            <p className="text-sm text-muted-foreground mt-1">O sgsm-ia precisa de META_HABILITADO, META_APP_ID, META_APP_SECRET e META_TOKEN_CRYPTO_KEY.</p>
          </div>
        </Card>
      )}

      {!carregando && !naoConfigurada && status && !status.conectado && (
        <Card className="p-6 flex flex-col items-start gap-3">
          {precisaReconectar ? (
            <>
              <p className="font-semibold text-secondary">A conexão com a Meta expirou</p>
              <p className="text-sm text-muted-foreground">{status.ultimoErro ?? 'Reconecte a conta para voltar a sincronizar.'}</p>
            </>
          ) : (
            <>
              <p className="font-semibold text-secondary">Conta Meta Ads não conectada</p>
              <p className="text-sm text-muted-foreground">Você vai entrar na Meta e autorizar o SGSM a ler as métricas das campanhas (somente leitura).</p>
            </>
          )}
          <Button onClick={conectar} disabled={ocupado || !clinicaId}>
            <Link2 size={14} /> {precisaReconectar ? 'Reconectar Meta Ads' : 'Conectar Meta Ads'}
          </Button>
        </Card>
      )}

      {!carregando && status?.conectado && (
        <>
          <Card className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Conectado como <span className="font-semibold text-secondary">{status.metaUsuario ?? '—'}</span>
                {' · '}último sync: {dataHora(status.ultimoSyncEm)}
                {status.expiraEm && <> · expira em {dataHora(status.expiraEm)}</>}
              </p>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contas de anúncio da clínica</p>
            {contas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma conta de anúncio encontrada nesta conexão.</p>}
            <div className="grid sm:grid-cols-2 gap-2">
              {contas.map((c) => (
                <button key={c.actId} onClick={() => alternar(c.actId)}
                  className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-left text-sm hover:bg-muted">
                  {escolha.has(c.actId) ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} />}
                  <span className="flex-1">{c.nome ?? c.actId}</span>
                  <span className="text-xs text-muted-foreground">{c.moeda}</span>
                </button>
              ))}
            </div>
            {contas.length > 0 && (
              <Button size="sm" onClick={salvarContas} disabled={ocupado}>Salvar contas e sincronizar</Button>
            )}
          </Card>

          {temContaSelecionada && (
            <>
              <div className="flex gap-1 bg-[hsl(190,100%,14%)] p-1 rounded-xl w-fit">
                {PERIODOS.map((p) => (
                  <button key={p} onClick={() => setDias(p)}
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                      dias === p ? 'bg-[hsl(184,80%,25%)] text-white' : 'text-[hsl(185,59%,65%)] hover:text-white')}>
                    Últimos {p} dias
                  </button>
                ))}
              </div>
              {dashboard ? <PainelMetricas dashboard={dashboard} /> : (
                <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-[hsl(184,80%,50%)]" /></div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
