// RODADA 6 — helpers (reaproveita lib5 e r5-common), dados da rodada em contas-r6.json. Sem mock.
import fs from 'node:fs'
import * as L from './lib5.mjs'
import * as C5 from './r5-common.mjs'
export * from './r5-common.mjs'
export const R6 = new URL('./contas-r6.json', import.meta.url)
export const r6 = fs.existsSync(R6) ? JSON.parse(fs.readFileSync(R6)) : { pacientes: [], medicos: [], admins: [], tentativasPublico: [] }
export const save6 = () => fs.writeFileSync(R6, JSON.stringify(r6, null, 2))
export const SENHA6 = 'QaRodada6#2026'
export const STRIX = 'c00b458a-db4b-491e-bcb6-4cdf046a17ba'

export function novoPaciente6(rotulo) {
  const stamp = Date.now() + Math.floor(Math.random() * 1000)
  const cpf = L.gerarCpf((Math.floor(stamp / 7) + 654321) % 1_000_000_000)
  return { rotulo, nome: `QA Paciente R6 ${rotulo} ${String(stamp).slice(-5)}`, cpf, email: `qa.conflito.pac.r6.${rotulo.toLowerCase()}.${stamp}@teste.com`, nascimento: '1987-03-14' }
}

const LETRAS = 'abcdefghij'
export function novoMedico6(rotulo) {
  const stamp = Date.now()
  const s = String(stamp).slice(-6).split('').map((d) => LETRAS[Number(d)]).join('')
  return { rotulo, nome: `QA Medico Rseis ${rotulo} ${s[0].toUpperCase()}${s.slice(1)}`, crm: String(stamp).slice(-7), crmUf: 'SP', especialidade: 'Cardiologia', email: `qa.conflito.med.r6.${rotulo.toLowerCase()}.${stamp}@teste.com` }
}

export function contarPublico6(desde, rotulo) {
  const lin = L.LINES.slice(desde).filter((l) => !l.includes('[NOTA]'))
  const reqs = lin.filter((l) => />> POST .*\/v1\/api\/publico\/pacientes/.test(l)).length
  const resps = lin.filter((l) => /<< \d+ POST .*\/v1\/api\/publico\/pacientes/.test(l)).map((l) => l.match(/<< (\d+)/)[1])
  for (const s of resps) r6.tentativasPublico.push({ rotulo, status: s, em: new Date().toISOString() })
  save6()
  L.note(`[${rotulo}] POST /publico/pacientes requisicoes=${reqs} respostas=${JSON.stringify(resps)} | total na rodada 6=${r6.tentativasPublico.length}`)
  return { reqs, resps }
}

export async function convitePorFetch(p, id) {
  return p.evaluate(async (id) => {
    const m = await import('/src/services/tokenStore.ts')
    const resp = await fetch(`/v1/api/medicos/${id}/convite-acesso`, { method: 'POST', headers: { Authorization: 'Bearer ' + m.tokenStore.get() } })
    return { status: resp.status, body: await resp.text() }
  }, id)
}

// abre "Novo Médico", descreve o modal, preenche; estab = nome da clinica (so admin com >1 clinica)
export async function abrirNovoMedico(p, rotulo) {
  await p.getByRole('button', { name: 'Novo Médico' }).click()
  const m = L.modal(p)
  await m.getByLabel('Nome completo').waitFor()
  await L.sleep(1500) // tempo para a lista de clinicas do admin carregar
  const labels = await m.locator('label').allTextContents()
  const temEstab = await m.getByLabel('Estabelecimento', { exact: true }).count()
  const opcoes = temEstab ? await m.getByLabel('Estabelecimento', { exact: true }).locator('option').allTextContents() : []
  L.note(`[${rotulo}] labels do modal Novo Médico: ${JSON.stringify(labels)} | campo "Estabelecimento"=${temEstab} opcoes=${JSON.stringify(opcoes)} | input[type=password]=${await m.locator('input[type=password]').count()} | texto "senha"=${await m.getByText(/senha/i).count()}`)
  return { m, temEstab, opcoes }
}

export async function preencherMedico(m, M) {
  await m.getByLabel('Nome completo').fill(M.nome)
  await m.getByLabel('CRM', { exact: true }).fill(M.crm)
  await m.getByLabel('Especialidade').selectOption(M.especialidade)
  await m.getByLabel('E-mail').fill(M.email)
}

// clica Salvar e espera cadastro + convite; devolve {status, id, convite, toasts}
export async function salvarMedico(p, m, M, rotulo) {
  const i0 = L.LINES.length
  const wCad = p.waitForResponse((r) => r.url().endsWith('/v1/api/medicos') && r.request().method() === 'POST', { timeout: 20000 })
  const wConv = p.waitForResponse((r) => r.url().includes('/convite-acesso') && r.request().method() === 'POST', { timeout: 30000 })
  await m.getByRole('button', { name: 'Salvar' }).click()
  const rc = await wCad
  const med = await rc.json().catch(() => ({}))
  const rv = await wConv.catch(() => null)
  await p.locator('[data-sonner-toast]').first().waitFor({ timeout: 8000 }).catch(() => {})
  await L.sleep(400)
  const t = await L.toasts(p)
  const corpoReq = L.LINES.slice(i0).find((l) => />> POST .*\/v1\/api\/medicos (Auth|\(sem)/.test(l))
  L.note(`[${rotulo}] corpo enviado em POST /medicos: ${corpoReq ? corpoReq.split('BODY=')[1] : '?'}`)
  L.note(`[${rotulo}] POST /medicos -> ${rc.status()} id=${med.id} | POST convite-acesso -> ${rv ? rv.status() : 'nao chamado'} corpo=${C5.corpoDe(i0, /convite-acesso/)} | toasts=${JSON.stringify(t)}`)
  L.note(`[${rotulo}] ordem das chamadas: ${JSON.stringify(L.respostas(i0, /\/medicos|estabelecimentos/))}`)
  M.id = med.id; M.status = 'ativo'
  r6.medicos.push(M); save6()
  return { status: rc.status(), id: med.id, convite: rv ? rv.status() : null, toasts: t }
}

export async function definirSenhaPeloLink(browser, nomeSessao, email, senha, shotName) {
  const tok = L.tokenConvite(email)
  const S = await L.newSession(browser, nomeSessao)
  const p = S.page
  await p.goto(L.linkConvite(tok))
  await p.getByRole('heading', { level: 1 }).waitFor()
  L.note(`[${nomeSessao}] tela do link: titulo=${JSON.stringify(await p.getByRole('heading', { level: 1 }).innerText())} | botao "Criar senha"=${await p.getByRole('button', { name: 'Criar senha', exact: true }).count()}`)
  await p.getByLabel('Nova senha', { exact: true }).fill(senha)
  await p.getByLabel('Confirmar nova senha').fill(senha)
  const i0 = L.LINES.length
  await p.getByRole('button', { name: 'Criar senha', exact: true }).click()
  await p.waitForURL((u) => u.pathname === '/login', { timeout: 15000 }).catch(() => {})
  await p.locator('[data-sonner-toast]').first().waitFor({ timeout: 5000 }).catch(() => {})
  await L.sleep(300)
  L.note(`[${nomeSessao}] salvar senha pelo link -> ${JSON.stringify(L.respostas(i0))} | toasts=${JSON.stringify(await L.toasts(p))} | url=${p.url()}`)
  if (shotName) await L.shot(p, shotName)
  await L.esperarToastsSumirem(p)
  return { S, p, tok }
}

export async function loginLivre(p, email, senha) {
  const i0 = L.LINES.length
  await L.login(p, email, senha, { esperar: null })
  await p.waitForURL((u) => u.pathname !== '/login', { timeout: 20000 }).catch(() => {})
  await L.sleep(2000)
  const claims = await p.evaluate(async () => { const m = await import('/src/services/tokenStore.ts'); const t = m.tokenStore.get(); if (!t) return null; const c = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); return { roles: c.roles, tipoPerfil: c.tipoPerfil, referenciaId: c.referenciaId } }).catch(() => null)
  L.note(`login ${email} -> ${JSON.stringify(L.respostas(i0, /auth\/login/))} | url=${p.url()} | claims=${JSON.stringify(claims)}`)
  return claims
}

export async function resumoCards(p) {
  const cards = p.locator('div.grid > div')
  const n = await cards.count()
  const out = []
  for (let k = 0; k < n; k++) {
    const c = cards.nth(k)
    const nome = (await c.locator('h3').innerText().catch(() => '?')).trim()
    const ed = c.getByRole('button', { name: 'Editar' })
    const ag = c.locator('button[title*="agenda"]')
    out.push(`${nome}: editar=${(await ed.count()) ? ((await ed.first().isDisabled()) ? 'desabilitado' : 'habilitado') : 'sem botao'} agenda=${(await ag.count()) ? ((await ag.first().isDisabled()) ? 'desabilitada' : 'habilitada') : 'sem botao'} envelope=${await C5.envelope(c).count()}`)
  }
  return out
}
