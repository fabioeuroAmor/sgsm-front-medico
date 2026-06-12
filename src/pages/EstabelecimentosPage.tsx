import { useEffect, useState } from 'react'
import { Plus, Search, Pencil, Trash2, Building2, MapPin, Stethoscope } from 'lucide-react'
import { useEstabelecimentos } from '@/hooks/useEstabelecimentos'
import { medicoService } from '@/services/medicoService'
import { estabelecimentoService } from '@/services/estabelecimentoService'
import type {
  EstabelecimentoResponse, CadastrarEstabelecimentoRequest,
  MedicoResponse,
} from '@/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input, SelectField } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'

function buildMapsUrl(est: EstabelecimentoResponse) {
  const partes = [est.logradouro, est.numero, est.complemento, est.bairro, est.cidade, est.uf, est.cep, 'Brasil'].filter(Boolean)
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(partes.join(', '))}`
}

const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']
const emptyForm: CadastrarEstabelecimentoRequest = {
  nome: '', cnpj: '', telefone: '', email: '', logradouro: '', numero: '',
  complemento: '', bairro: '', cidade: '', uf: 'SP', cep: '',
}

export function EstabelecimentosPage() {
  const { estabelecimentos, loading, error, listar, cadastrar, atualizar, remover } = useEstabelecimentos()
  const [busca, setBusca] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState<boolean | undefined>(undefined)
  const [filtroUf, setFiltroUf] = useState('')
  const [filtroCidade, setFiltroCidade] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<EstabelecimentoResponse | null>(null)
  const [form, setForm] = useState<CadastrarEstabelecimentoRequest>(emptyForm)
  const [salvando, setSalvando] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)

  const [modalMedicosEstab, setModalMedicosEstab] = useState<EstabelecimentoResponse | null>(null)
  const [todosMedicos, setTodosMedicos] = useState<MedicoResponse[]>([])
  const [medicosVinculados, setMedicosVinculados] = useState<Set<string>>(new Set())
  const [loadingMedicos, setLoadingMedicos] = useState(false)
  const [salvandoMedicos, setSalvandoMedicos] = useState(false)
  const [erroMedicos, setErroMedicos] = useState<string | null>(null)

  useEffect(() => { listar({ ativo: filtroAtivo, uf: filtroUf || undefined, cidade: filtroCidade || undefined }) }, [filtroAtivo, filtroUf, filtroCidade, listar])

  const filtrados = estabelecimentos.filter((e) =>
    e.nome.toLowerCase().includes(busca.toLowerCase()) ||
    e.cnpj.includes(busca) ||
    e.cidade.toLowerCase().includes(busca.toLowerCase()),
  )

  function setField<K extends keyof CadastrarEstabelecimentoRequest>(key: K, value: CadastrarEstabelecimentoRequest[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function abrirCadastro() { setEditando(null); setForm(emptyForm); setFormError(null); setModalAberto(true) }

  function abrirEdicao(est: EstabelecimentoResponse) {
    setEditando(est)
    setForm({ nome: est.nome, cnpj: est.cnpj, telefone: est.telefone ?? '', email: est.email ?? '', logradouro: est.logradouro, numero: est.numero, complemento: est.complemento ?? '', bairro: est.bairro, cidade: est.cidade, uf: est.uf, cep: est.cep })
    setFormError(null); setModalAberto(true)
  }

  async function salvar() {
    setSalvando(true); setFormError(null)
    try {
      if (editando) {
        await atualizar(editando.id, { nome: form.nome || undefined, telefone: form.telefone || undefined, email: form.email || undefined, logradouro: form.logradouro || undefined, numero: form.numero || undefined, complemento: form.complemento || undefined, bairro: form.bairro || undefined, cidade: form.cidade || undefined, uf: form.uf || undefined, cep: form.cep || undefined })
      } else { await cadastrar(form) }
      setModalAberto(false); setEditando(null)
    } catch (err) { setFormError((err as Error).message) } finally { setSalvando(false) }
  }

  async function abrirModalMedicos(est: EstabelecimentoResponse) {
    setModalMedicosEstab(est); setErroMedicos(null); setLoadingMedicos(true)
    try {
      const [todos, vinculados] = await Promise.all([medicoService.listar({ ativo: true }), estabelecimentoService.listarMedicos(est.id)])
      setTodosMedicos(todos); setMedicosVinculados(new Set(vinculados.map((m) => m.id)))
    } catch (err) { setErroMedicos((err as Error).message) } finally { setLoadingMedicos(false) }
  }

  async function salvarMedicos() {
    if (!modalMedicosEstab) return
    setSalvandoMedicos(true); setErroMedicos(null)
    try {
      await estabelecimentoService.associarMedicos(modalMedicosEstab.id, { medicoIds: Array.from(medicosVinculados) })
      setModalMedicosEstab(null)
    } catch (err) { setErroMedicos((err as Error).message) } finally { setSalvandoMedicos(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Cadastros</p>
          <h1 className="text-3xl font-bold text-secondary mt-0.5">Estabelecimentos</h1>
        </div>
        <Button onClick={abrirCadastro}><Plus size={16} strokeWidth={2} /> Novo Estabelecimento</Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-52">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Buscar por nome, CNPJ ou cidade…" value={busca} onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-xl border border-border bg-input py-2 pl-9 pr-4 text-sm text-foreground outline-none transition-all focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60" />
          </div>
          <select value={filtroAtivo === undefined ? '' : String(filtroAtivo)} onChange={(e) => setFiltroAtivo(e.target.value === '' ? undefined : e.target.value === 'true')}
            className="rounded-xl border border-border bg-input px-4 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
            <option value="">Todos os status</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
          <select value={filtroUf} onChange={(e) => setFiltroUf(e.target.value)}
            className="rounded-xl border border-border bg-input px-4 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
            <option value="">Todos os estados</option>
            {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
          <input type="text" placeholder="Filtrar por cidade…" value={filtroCidade} onChange={(e) => setFiltroCidade(e.target.value)}
            className="rounded-xl border border-border bg-input px-4 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60" />
        </div>
      </Card>

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : filtrados.length === 0 ? <EmptyState /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((est) => (
            <Card key={est.id} className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Building2 size={18} className="text-primary" />
                </div>
                <Badge variant={est.ativo ? 'active' : 'inactive'}>{est.ativo ? 'Ativo' : 'Inativo'}</Badge>
              </div>
              <div>
                <h3 className="font-bold text-secondary">{est.nome}</h3>
                <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{est.cidade} — {est.uf}</p>
              </div>
              <div className="space-y-1.5 border-t border-border pt-3">
                <p className="text-xs text-foreground/70"><span className="font-semibold">CNPJ:</span> {est.cnpj}</p>
                <a href={buildMapsUrl(est)} target="_blank" rel="noopener noreferrer"
                  className="group flex items-start gap-1.5 text-xs text-foreground/70 hover:text-primary transition-colors">
                  <MapPin size={12} className="mt-px shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span>{est.logradouro}, {est.numero}{est.complemento ? ` — ${est.complemento}` : ''}, {est.bairro}</span>
                </a>
                {est.telefone && <p className="text-xs text-foreground/70"><span className="font-semibold">Tel:</span> {est.telefone}</p>}
              </div>
              <div className="flex gap-2 mt-auto">
                <Button variant="ghost" size="sm" onClick={() => abrirEdicao(est)} className="flex-1"><Pencil size={12} /> Editar</Button>
                <Button variant="outline" size="sm" onClick={() => abrirModalMedicos(est)} title="Gerenciar médicos"><Stethoscope size={12} /></Button>
                <a href={buildMapsUrl(est)} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-primary transition-colors">
                  <MapPin size={12} />
                </a>
                <Button variant="danger" size="sm" onClick={() => setConfirmandoId(est.id)} disabled={!est.ativo}><Trash2 size={12} /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal cadastro/edição */}
      <Modal open={modalAberto} onClose={() => { setModalAberto(false); setEditando(null) }} title={editando ? 'Editar Estabelecimento' : 'Novo Estabelecimento'} size="lg"
        footer={<><Button variant="ghost" size="sm" onClick={() => { setModalAberto(false); setEditando(null) }}>Cancelar</Button><Button onClick={salvar} disabled={salvando} size="sm">{salvando ? 'Salvando…' : 'Salvar'}</Button></>}>
        <div className="flex flex-col gap-4">
          {formError && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{formError}</div>}
          <Input label="Nome" value={form.nome} onChange={(e) => setField('nome', e.target.value)} placeholder="Clínica São Lucas" />
          <Input label="CNPJ" value={form.cnpj} onChange={(e) => setField('cnpj', e.target.value)} placeholder="00.000.000/0001-00" disabled={!!editando} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Telefone" value={form.telefone ?? ''} onChange={(e) => setField('telefone', e.target.value)} placeholder="(11) 3333-0000" />
            <Input label="E-mail" type="email" value={form.email ?? ''} onChange={(e) => setField('email', e.target.value)} placeholder="contato@clinica.com" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><Input label="Logradouro" value={form.logradouro} onChange={(e) => setField('logradouro', e.target.value)} placeholder="Rua das Flores" /></div>
            <Input label="Número" value={form.numero} onChange={(e) => setField('numero', e.target.value)} placeholder="123" />
          </div>
          <Input label="Complemento" value={form.complemento ?? ''} onChange={(e) => setField('complemento', e.target.value)} placeholder="Sala 42" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Bairro" value={form.bairro} onChange={(e) => setField('bairro', e.target.value)} placeholder="Jardins" />
            <Input label="CEP" value={form.cep} onChange={(e) => setField('cep', e.target.value)} placeholder="01310-100" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><Input label="Cidade" value={form.cidade} onChange={(e) => setField('cidade', e.target.value)} placeholder="São Paulo" /></div>
            <SelectField label="UF" value={form.uf} onChange={(e) => setField('uf', e.target.value)}>
              {UFS.map((uf) => <option key={uf}>{uf}</option>)}
            </SelectField>
          </div>
        </div>
      </Modal>

      {/* Modal médicos */}
      <Modal open={modalMedicosEstab !== null} onClose={() => setModalMedicosEstab(null)} title={`Médicos — ${modalMedicosEstab?.nome ?? ''}`}
        footer={<><Button variant="ghost" size="sm" onClick={() => setModalMedicosEstab(null)}>Cancelar</Button><Button onClick={salvarMedicos} disabled={salvandoMedicos} size="sm">{salvandoMedicos ? 'Salvando…' : 'Salvar Vínculos'}</Button></>}>
        {erroMedicos && <div className="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{erroMedicos}</div>}
        {loadingMedicos ? (
          <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : todosMedicos.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">Nenhum médico ativo cadastrado.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {todosMedicos.map((m) => {
              const checked = medicosVinculados.has(m.id)
              return (
                <label key={m.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all ${checked ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
                  <input type="checkbox" checked={checked} onChange={() => setMedicosVinculados((prev) => { const next = new Set(prev); if (next.has(m.id)) next.delete(m.id); else next.add(m.id); return next })}
                    className="h-4 w-4 rounded border-border accent-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{m.nome}</p>
                    <p className="text-xs text-muted-foreground">{m.especialidade} · CRM {m.crm}/{m.crmUf}</p>
                  </div>
                </label>
              )
            })}
          </div>
        )}
      </Modal>

      {/* Modal confirmação */}
      <Modal open={!!confirmandoId} onClose={() => setConfirmandoId(null)} title="Inativar Estabelecimento" size="sm"
        footer={<><Button variant="ghost" size="sm" onClick={() => setConfirmandoId(null)}>Cancelar</Button><Button variant="danger" size="sm" onClick={async () => { if (confirmandoId) { await remover(confirmandoId); setConfirmandoId(null) } }}>Inativar</Button></>}>
        <p className="text-sm text-foreground/70">O estabelecimento será <strong>inativado</strong> e não aparecerá nas listagens padrão.</p>
      </Modal>
    </div>
  )
}
