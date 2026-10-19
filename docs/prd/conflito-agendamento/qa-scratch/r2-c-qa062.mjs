// RODADA 2 — QA062: DEV prepara o medico com login (vinculo Sao Lucas, servico, agenda segunda 08:00-10:00); MEDICO testa o escopo
import fs from 'node:fs'
import * as L from './lib.mjs'
const r2 = JSON.parse(fs.readFileSync(new URL('./contas-r2.json', import.meta.url)))
const ML = r2.medLogin
const FABIO = 'ff9a2400-2217-48fa-ac91-b81a4032f2db', SAO_LUCAS = '655759aa-bf83-417e-a45b-b06258c4458f'
const browser = await L.launch()
const dev = await L.newSession(browser, 'DEV')
const p = dev.page
await L.login(p, 'dev-local@sgsm.local', 'Dev088c00c5ba89!Aa')
L.start('QA062-r2-setup')
await p.getByRole('link', { name: 'Estabelecimentos' }).first().click()
await p.waitForURL('**/estabelecimentos')
await L.sleep(1500)
await p.locator('div.grid > div').filter({ hasText: 'Clinica São Lucas' }).first().getByTitle('Gerenciar médicos').click()
let m = L.modal(p)
await m.getByText(ML.nome).waitFor({ timeout: 15000 })
await m.locator('label').filter({ hasText: ML.nome }).locator('input[type=checkbox]').check()
let w = p.waitForResponse((r) => r.url().includes('/estabelecimentos/') && r.request().method() !== 'GET')
await m.getByRole('button', { name: 'Salvar Vínculos' }).click()
let r = await w
L.note(`vinculos: ${r.request().method()} ${r.url()} -> ${r.status()} body=${r.request().postData()}`)
await L.sleep(1500)
await p.getByRole('link', { name: 'Serviços' }).first().click()
await p.waitForURL('**/servicos')
await p.getByRole('button', { name: 'Novo Serviço' }).click()
m = L.modal(p)
await m.getByLabel('Médico').selectOption({ label: `${ML.nome} — Cardiologia` })
await m.getByLabel('Nome do Serviço').fill('QA Servico Medico Login')
await m.getByLabel('Preço (R$)').fill('100')
await m.getByLabel('Duração (min)').fill('30')
w = p.waitForResponse((r) => r.url().includes('/servicos-medicos') && r.request().method() === 'POST')
await m.getByRole('button', { name: 'Salvar' }).click()
r = await w
const serv = await r.json().catch(() => ({}))
L.note(`POST servicos-medicos -> ${r.status()} id=${serv.id}`)
await L.sleep(1500)
await p.getByRole('link', { name: 'Médicos' }).first().click()
await p.waitForURL('**/medicos')
await p.getByPlaceholder('Buscar por nome, CRM ou e-mail…').fill(ML.nome)
await L.sleep(1500)
await p.locator('div.grid > div').filter({ hasText: ML.nome }).first().getByTitle('Gerenciar agenda').click()
m = L.modal(p)
await m.getByRole('button', { name: /Adicionar Horário/ }).click()
await m.getByLabel('Estabelecimento').selectOption({ label: 'Clinica São Lucas' })
await m.getByLabel('Dia da semana').selectOption('SEGUNDA')
await m.getByLabel('Duração do slot').selectOption('30')
await m.getByLabel('Hora início').fill('08:00')
await m.getByLabel('Hora fim').fill('10:00')
w = p.waitForResponse((r) => r.url().includes('/agenda-medico') && r.request().method() === 'POST')
await m.getByRole('button', { name: 'Salvar Horário' }).click()
r = await w
L.note(`POST agenda-medico -> ${r.status()} body=${r.request().postData()}`)
await L.sleep(1000)
await L.shot(p, 'QA062-r2-e-agenda-medico-login')
await L.end('QA062-r2-setup')
r2.medLogin.servicoId = serv.id
fs.writeFileSync(new URL('./contas-r2.json', import.meta.url), JSON.stringify(r2, null, 2))
await dev.ctx.close()

// ── MEDICO ────────────────────────────────────────────────────────────────
L.start('QA062-r2')
const med = await L.newSession(browser, 'MED')
const pm = med.page
const meResp = pm.waitForResponse((x) => x.url().includes('/auth/me'), { timeout: 20000 }).catch(() => null)
await pm.goto(L.BASE + '/login')
await pm.getByLabel('E-mail').fill(ML.email)
await pm.getByLabel('Senha').fill(ML.senha)
await pm.getByRole('button', { name: 'Entrar' }).click()
await pm.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }).catch(() => {})
const me = await meResp
L.note('login MEDICO: url=' + pm.url() + ' | /auth/me perfil=' + (me ? (await me.json().catch(() => ({}))).perfil : '?'))
await L.shot(pm, 'QA062-r2-f-medico-logado')
// grade da propria agenda pelo wizard
let gradeUI = null
try {
  await L.irAgendamentos(pm)
  await L.abrirWizard(pm)
  await L.passo1(pm)
  const mm = L.modal(pm)
  await mm.getByPlaceholder('Buscar por serviço, médico ou especialidade…').fill('QA Servico Medico Login')
  await mm.getByRole('button').filter({ hasText: 'QA Servico Medico Login' }).first().click()
  await mm.getByRole('button', { name: 'Próximo', exact: true }).click()
  await pm.getByText('Passo 3 / 5').waitFor()
  await L.passo3(pm, 'Presencial', 'Clinica São Lucas')
  const ws = pm.waitForResponse((x) => x.url().includes('/agendamentos/slots'))
  await L.escolherDia(pm, '19')
  const rs = await ws
  await L.esperarGrade(pm)
  gradeUI = rs.status()
  L.note(`wizard MEDICO, propria agenda 19/10: GET ${rs.url()} -> ${rs.status()} | grade=${JSON.stringify(await L.gradeHorarios(pm))}`)
  await L.shot(pm, 'QA062-r2-g-grade-propria')
} catch (e) { L.note('wizard MEDICO falhou: ' + e.message.split('\n')[0]); await L.shot(pm, 'QA062-r2-g-grade-propria') }
// mesma tecnica do QA061: axios da propria app, com o token em memoria da sessao
const res = await pm.evaluate(async ({ propria, fabio, est }) => {
  const { default: api } = await import('/src/services/api.ts')
  const out = {}
  for (const [k, medicoId] of [['propria', propria], ['fabio', fabio]]) {
    try { const r = await api.get('/agendamentos/slots', { params: { medicoId, estabelecimentoId: est, data: k === 'propria' ? '2026-10-19' : '2026-10-21' } }); out[k] = { status: r.status, n: r.data.length } }
    catch (e) { out[k] = { status: e.status, msg: e.message } }
  }
  return out
}, { propria: ML.id, fabio: FABIO, est: SAO_LUCAS })
L.note('chamadas na sessao MEDICO: ' + JSON.stringify(res))
await L.sleep(800)
await L.shot(pm, 'QA062-r2-h-apos-chamadas')
await L.end('QA062-r2', `MEDICO ${ML.email} (medico ${ML.id}); grade UI=${gradeUI}`)
L.saveAll('r2-c')
await browser.close()
