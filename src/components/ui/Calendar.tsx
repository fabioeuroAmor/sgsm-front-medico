import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, hojeLocal } from '@/lib/utils'

interface CalendarProps {
  /** Data selecionada, yyyy-MM-dd (string vazia = nenhuma) */
  value: string
  onChange: (data: string) => void
  /** yyyy-MM-dd — dias anteriores a essa data nunca ficam clicáveis */
  minDate?: string
  /** yyyy-MM-dd dos dias do mês visível que têm agenda disponível */
  diasDisponiveis: string[]
  loading?: boolean
  /** Disparado quando o usuário navega de mês (yyyy-MM) */
  onMonthChange?: (mes: string) => void
  label?: string
}

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function toISO(d: Date) {
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

function parseMes(mes: string): { ano: number; mesIdx: number } {
  const [ano, m] = mes.split('-').map(Number)
  return { ano, mesIdx: m - 1 }
}

export function Calendar({ value, onChange, minDate, diasDisponiveis, loading, onMonthChange, label }: CalendarProps) {
  const [mesVisivel, setMesVisivel] = useState(() => (value || minDate || hojeLocal()).slice(0, 7))

  useEffect(() => {
    onMonthChange?.(mesVisivel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesVisivel])

  const { ano, mesIdx } = parseMes(mesVisivel)
  const primeiroDia = new Date(ano, mesIdx, 1)
  const diasNoMes = new Date(ano, mesIdx + 1, 0).getDate()
  const offsetInicial = primeiroDia.getDay()
  const totalCelulas = Math.ceil((offsetInicial + diasNoMes) / 7) * 7

  const disponiveisSet = new Set(diasDisponiveis)
  const min = minDate ?? hojeLocal()

  const celulas = Array.from({ length: totalCelulas }, (_, i) => {
    const dia = new Date(ano, mesIdx, i - offsetInicial + 1)
    const iso = toISO(dia)
    return {
      iso,
      numero: dia.getDate(),
      noMesAtual: dia.getMonth() === mesIdx,
      disponivel: dia.getMonth() === mesIdx && iso >= min && disponiveisSet.has(iso),
      selecionado: iso === value,
    }
  })

  function irParaMes(delta: number) {
    const d = new Date(ano, mesIdx + delta, 1)
    setMesVisivel(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  function irParaHoje() {
    const hoje = hojeLocal()
    setMesVisivel(hoje.slice(0, 7))
    if (disponiveisSet.has(hoje) || hoje.slice(0, 7) !== mesVisivel) onChange(hoje)
  }

  const tituloMes = primeiroDia
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .replace(/^\w/, (c) => c.toUpperCase())

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      )}
      <div className="rounded-xl border border-border bg-input p-3">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => irParaMes(-1)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            aria-label="Mês anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-foreground">{tituloMes}</span>
          <button
            type="button"
            onClick={() => irParaMes(1)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            aria-label="Próximo mês"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {DIAS_SEMANA.map((d, i) => (
            <span key={i} className="py-1 text-[11px] font-semibold uppercase text-muted-foreground/70">
              {d}
            </span>
          ))}

          {loading
            ? Array.from({ length: totalCelulas }, (_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted-foreground/10" />
              ))
            : celulas.map((c) => (
                <button
                  key={c.iso}
                  type="button"
                  disabled={!c.disponivel}
                  onClick={() => onChange(c.iso)}
                  className={cn(
                    'aspect-square rounded-lg text-sm font-medium transition-all',
                    !c.noMesAtual && 'text-muted-foreground/30',
                    c.noMesAtual && !c.disponivel && 'text-muted-foreground/40 cursor-not-allowed',
                    c.disponivel && 'text-primary font-semibold hover:bg-primary/20 border border-primary/30 bg-primary/10',
                    c.selecionado && 'bg-primary text-primary-foreground border-primary hover:bg-primary',
                  )}
                >
                  {c.numero}
                </button>
              ))}
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-xs font-semibold">
          <button type="button" onClick={() => onChange('')} className="text-muted-foreground hover:text-foreground">
            Limpar
          </button>
          <button type="button" onClick={irParaHoje} className="text-primary hover:underline">
            Hoje
          </button>
        </div>
      </div>
    </div>
  )
}
