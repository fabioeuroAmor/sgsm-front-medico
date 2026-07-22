import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Loader2, User, Sparkles, AlertCircle, BarChart3, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import iaApi from '@/services/iaService'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="shrink-0 w-8 h-8 rounded-xl bg-[hsl(184,80%,25%)] flex items-center justify-center">
          <Bot size={15} className="text-white" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-[hsl(184,80%,25%)] text-white rounded-tr-none'
            : 'bg-[hsl(190,100%,16%)] text-[hsl(185,59%,89%)] border border-[hsl(190,100%,22%)] rounded-tl-none',
        )}
      >
        <p className="whitespace-pre-wrap">{msg.content}</p>
        <p className={cn('text-xs mt-1.5', isUser ? 'text-[hsl(185,59%,75%)]' : 'text-[hsl(185,59%,50%)]')}>
          {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      {isUser && (
        <div className="shrink-0 w-8 h-8 rounded-xl bg-[hsl(190,100%,22%)] flex items-center justify-center">
          <User size={15} className="text-[hsl(185,59%,75%)]" />
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: unknown }) {
  const display = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '-')
  return (
    <div className="bg-[hsl(190,100%,14%)] border border-[hsl(190,100%,20%)] rounded-xl p-4">
      <p className="text-[hsl(185,59%,55%)] text-xs font-semibold uppercase tracking-wide mb-1">{label}</p>
      <p className="text-[hsl(185,59%,89%)] text-sm font-medium">{display}</p>
    </div>
  )
}

type Tab = 'chat' | 'kpis'

export function IaPage() {
  const [tab, setTab] = useState<Tab>('chat')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'Olá! Sou o assistente inteligente do SGSM. Posso responder perguntas sobre pacientes, médicos, agendamentos, serviços e também sobre o CRM Analítico — faturamento, churn, funil de conversão, ocupação de agenda e outros indicadores. Como posso ajudar?',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [kpis, setKpis] = useState<Record<string, unknown> | null>(null)
  const [kpisLoading, setKpisLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await iaApi.chat(text)
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: res.resposta,
          timestamp: new Date(),
        },
      ])
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Não consegui processar sua pergunta. ${errorMessage}`,
          timestamp: new Date(),
        },
      ])
      toast.error('Erro ao consultar o assistente')
    } finally {
      setLoading(false)
    }
  }

  async function loadKpis() {
    setKpisLoading(true)
    try {
      const data = await iaApi.kpis()
      setKpis(data)
    } catch {
      toast.error('Erro ao carregar KPIs')
    } finally {
      setKpisLoading(false)
    }
  }

  useEffect(() => {
    if (tab === 'kpis' && !kpis) {
      loadKpis()
    }
  }, [tab])

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-screen max-h-screen overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-[hsl(190,100%,20%)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[hsl(184,80%,25%)] flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-none">Assistente IA</h1>
            <p className="text-[hsl(185,59%,55%)] text-xs mt-0.5">Powered by RAG + Milvus</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-[hsl(190,100%,14%)] rounded-xl p-1">
          <button
            onClick={() => setTab('chat')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              tab === 'chat'
                ? 'bg-[hsl(184,80%,25%)] text-white'
                : 'text-[hsl(185,59%,65%)] hover:text-[hsl(185,59%,89%)]',
            )}
          >
            <Bot size={13} /> Chat
          </button>
          <button
            onClick={() => setTab('kpis')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              tab === 'kpis'
                ? 'bg-[hsl(184,80%,25%)] text-white'
                : 'text-[hsl(185,59%,65%)] hover:text-[hsl(185,59%,89%)]',
            )}
          >
            <BarChart3 size={13} /> KPIs
          </button>
        </div>
      </div>

      {/* Chat Tab */}
      {tab === 'chat' && (
        <>
          <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="shrink-0 w-8 h-8 rounded-xl bg-[hsl(184,80%,25%)] flex items-center justify-center">
                  <Bot size={15} className="text-white" />
                </div>
                <div className="bg-[hsl(190,100%,16%)] border border-[hsl(190,100%,22%)] rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-[hsl(184,80%,50%)]" />
                  <span className="text-[hsl(185,59%,65%)] text-sm">Consultando...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="shrink-0 px-6 py-4 border-t border-[hsl(190,100%,20%)]">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder="Pergunte sobre pacientes, agendamentos, médicos, faturamento, churn..."
                  rows={1}
                  className="w-full bg-[hsl(190,100%,14%)] border border-[hsl(190,100%,22%)] rounded-xl px-4 py-3 text-sm text-[hsl(185,59%,89%)] placeholder-[hsl(185,59%,40%)] resize-none focus:outline-none focus:border-[hsl(184,80%,40%)] transition-colors leading-relaxed"
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="shrink-0 h-12 w-12 rounded-xl bg-[hsl(184,80%,25%)] hover:bg-[hsl(184,80%,30%)] disabled:opacity-40 flex items-center justify-center p-0"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </Button>
            </div>
            <p className="text-[hsl(185,59%,40%)] text-xs mt-2 text-center">
              Enter para enviar · Shift+Enter para nova linha
            </p>
          </div>
        </>
      )}

      {/* KPIs Tab */}
      {tab === 'kpis' && (
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[hsl(185,59%,75%)] text-sm font-semibold">Indicadores do Sistema</p>
            <button
              onClick={loadKpis}
              disabled={kpisLoading}
              className="flex items-center gap-1.5 text-xs text-[hsl(185,59%,55%)] hover:text-[hsl(185,59%,89%)] transition-colors"
            >
              <RefreshCw size={12} className={kpisLoading ? 'animate-spin' : ''} />
              Atualizar
            </button>
          </div>

          {kpisLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-[hsl(184,80%,50%)]" />
            </div>
          )}

          {!kpisLoading && !kpis && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertCircle size={32} className="text-[hsl(185,59%,40%)]" />
              <p className="text-[hsl(185,59%,55%)] text-sm">Nenhum dado carregado</p>
            </div>
          )}

          {kpis && !kpisLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 stagger-children">
              {Object.entries(kpis).map(([key, value]) => (
                <KpiCard key={key} label={key.replace(/([A-Z])/g, ' $1').trim()} value={value} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
