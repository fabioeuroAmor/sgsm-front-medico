// RODADA 2 — preparacao pela UI: QA094-r2, reativacao das secretarias, tentativa de login de MEDICO (/registrar e /medicos),
// medico de QA (cadastro, vinculo com a Clinica Sao Lucas, servico presencial, agenda sexta 08:00-08:30)
import fs from 'node:fs'
import * as L from './lib.mjs'
const contas = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const R2 = new URL('./contas-r2.json', import.meta.url)
const r2 = fs.existsSync(R2) ? JSON.parse(fs.readFileSync(R2)) : {}
const stamp = Date.now()
const SENHA_MED = 'QaMedico#2026x'
const crm1 = String(stamp).slice(-6), crm2 = String(stamp + 13).slice(-6)
const save = () => fs.writeFileSync(R2, JSON.stringify(r2, null, 2))

const browser = await L.launch()
const dev = await L.newSession(browser, 'DEV')
const p = dev.page

// ── QA094-r2 ──────────────────────────────────────────────────────────────
L.start('QA094-r2')
await p.goto(L.BASE + '/login')
await p.getByLabel('E-mail').fill('dev-local@sgsm.local')
await p.getByLabel('Senha').fill('SenhaErrada123!')
await p.getByLabel('Senha').press('Enter')
await p.locator('[data-sonner-toast]').first().waitFor({ timeout: 10000 }).catch(() => {})
await L.sleep(600)
await L.shot(p, 'QA094-r2')
L.note('URL: ' + p.url() + ' | Toast visivel: ' + JSON.stringify(await p.locator('[data-sonner-toast]').allTextContents()) + ' | contem "Request failed": ' + (await p.getByText(/Request failed/).count()))
await L.end('QA094-r2')

// ── QA062-r2 parte 1: /registrar como MEDICO (sessao anonima) ─────────────
L.start('QA062-r2-registrar')
const anon = await L.newSession(browser, 'ANON')
const pr = anon.page
await pr.goto(L.BASE + '/registrar')
await pr.getByRole('button', { name: 'Médico', exact: true }).click()
const emailReg = `qa.conflito.med.reg.${stamp}@teste.com`
await pr.getByLabel('Nome completo').fill('QA Medico Registro')
await pr.getByLabel('CRM', { exact: true }).fill(crm2)
await pr.getByLabel('Especialidade').selectOption('Cardiologia')
await pr.getByLabel('E-mail').fill(emailReg)
await pr.getByLabel('Senha', { exact: true }).fill(SENHA_MED)
await pr.getByLabel('Confirmar senha').fill(SENHA_MED)
await L.shot(pr, 'QA062-r2-a-registrar-form')
await pr.getByRole('button', { name: 'Criar conta' }).click()
await L.sleep(5000)
await L.shot(pr, 'QA062-r2-b-registrar-resultado')
L.note('/registrar MEDICO: url final=' + pr.url() + ' | toasts=' + JSON.stringify(await pr.locator('[data-sonner-toast]').allTextContents()) + ' | alerta=' + JSON.stringify(await pr.getByRole('alert').allTextContents()))
r2.registrar = { email: emailReg, crm: crm2, urlFinal: pr.url() }
save()
await L.end('QA062-r2-registrar', 'tentativa de registrar um MEDICO pela tela publica /registrar')
await anon.ctx.close()

// ── reativacao das secretarias de QA (rodada 1) ───────────────────────────
L.start('SETUP-r2')
await L.login(p, 'dev-local@sgsm.local', 'Dev088c00c5ba89!Aa')
await p.getByRole('link', { name: 'Funcionários' }).first().click()
await p.waitForURL('**/funcionarios')
await p.getByRole('button', { name: 'Novo Funcionário' }).waitFor()
await p.locator('select').nth(1).selectOption('false')
await L.sleep(1500)
await p.getByPlaceholder('Buscar por nome, CPF, cargo ou e-mail…').fill('qa.conflito')
await L.sleep(1000)
for (const k of ['A', 'B']) {
  const card = p.locator('div.grid > div').filter({ hasText: contas[k].email }).first()
  if (!(await card.count())) { L.note(`${k}: card inativo nao encontrado`); continue }
  const w = p.waitForResponse((r) => r.url().includes('/funcionarios/') && ['PATCH', 'PUT', 'POST'].includes(r.request().method()))
  await card.getByRole('button', { name: /Reativar/ }).click()
  const r = await w
  L.note(`reativar ${contas[k].email}: ${r.request().method()} ${r.url()} -> ${r.status()}`)
  await L.sleep(1500)
}
await p.locator('select').nth(1).selectOption('')
await L.sleep(1500)
L.note('cards qa.conflito: ' + JSON.stringify((await p.locator('div.grid > div').filter({ hasText: 'qa.conflito' }).allInnerTexts()).map((t) => t.replace(/\n/g, ' | '))))
await L.shot(p, 'SETUP-r2-a-secretarias-reativadas')

// ── QA062-r2 parte 2 / QA082-r2 preparacao: medico de QA pela tela /medicos ──
await p.getByRole('link', { name: 'Médicos' }).first().click()
await p.waitForURL('**/medicos')
await p.getByRole('button', { name: 'Novo Médico' }).click()
let m = L.modal(p)
await m.getByLabel('Nome completo').waitFor()
L.note('campos do modal Novo Médico: ' + JSON.stringify(await m.locator('label').allTextContents()))
const emailMed = `qa.conflito.med.${stamp}@teste.com`
await m.getByLabel('Nome completo').fill('QA Medico Unico Horario')
await m.getByLabel('CRM', { exact: true }).fill(crm1)
await m.getByLabel('Especialidade').selectOption('Cardiologia')
await m.getByLabel('E-mail').fill(emailMed)
await L.shot(p, 'SETUP-r2-b-novo-medico-form')
let w = p.waitForResponse((r) => r.url().endsWith('/v1/api/medicos') && r.request().method() === 'POST')
await m.getByRole('button', { name: 'Salvar' }).click()
let r = await w
const med = await r.json().catch(() => ({}))
L.note(`POST /medicos -> ${r.status()} id=${med.id}`)
r2.medico = { id: med.id, nome: 'QA Medico Unico Horario', email: emailMed, crm: crm1 }
save()
await L.sleep(1500)

// vinculo com a Clinica Sao Lucas (tela /estabelecimentos)
await p.getByRole('link', { name: 'Estabelecimentos' }).first().click()
await p.waitForURL('**/estabelecimentos')
await L.sleep(1500)
const est = p.locator('div.grid > div').filter({ hasText: 'Clinica São Lucas' }).first()
await est.getByTitle('Gerenciar médicos').click()
m = L.modal(p)
await m.getByText('QA Medico Unico Horario').waitFor({ timeout: 15000 })
L.note('vinculados antes: ' + JSON.stringify(await m.locator('label').filter({ has: p.locator('input:checked') }).allInnerTexts()))
await m.locator('label').filter({ hasText: 'QA Medico Unico Horario' }).locator('input[type=checkbox]').check()
await L.shot(p, 'SETUP-r2-c-vinculo')
w = p.waitForResponse((r) => r.url().includes('/estabelecimentos/') && r.request().method() !== 'GET')
await m.getByRole('button', { name: 'Salvar Vínculos' }).click()
r = await w
L.note(`vinculos: ${r.request().method()} ${r.url()} -> ${r.status()} body=${r.request().postData()}`)
await L.sleep(1500)

// servico presencial
await p.getByRole('link', { name: 'Serviços' }).first().click()
await p.waitForURL('**/servicos')
await p.getByRole('button', { name: 'Novo Serviço' }).click()
m = L.modal(p)
await m.getByLabel('Médico').selectOption({ label: 'QA Medico Unico Horario — Cardiologia' })
await m.getByLabel('Nome do Serviço').fill('QA Unico Horario')
await m.getByLabel('Preço (R$)').fill('100')
await m.getByLabel('Duração (min)').fill('30')
await L.shot(p, 'SETUP-r2-d-servico')
w = p.waitForResponse((r) => r.url().includes('/servicos-medicos') && r.request().method() === 'POST')
await m.getByRole('button', { name: 'Salvar' }).click()
r = await w
const serv = await r.json().catch(() => ({}))
L.note(`POST servicos-medicos -> ${r.status()} id=${serv.id} body=${r.request().postData()}`)
r2.servico = { id: serv.id, nome: 'QA Unico Horario' }
save()
await L.sleep(1500)

// agenda: sexta 08:00-08:30, 30 min, Clinica Sao Lucas, vigencia a partir de hoje
await p.getByRole('link', { name: 'Médicos' }).first().click()
await p.waitForURL('**/medicos')
await p.getByPlaceholder('Buscar por nome, CRM ou e-mail…').fill('QA Medico Unico')
await L.sleep(1500)
const cardMed = p.locator('div.grid > div').filter({ hasText: 'QA Medico Unico Horario' }).first()
await cardMed.getByTitle('Gerenciar agenda').click()
m = L.modal(p)
await m.getByRole('button', { name: /Adicionar Horário/ }).click()
await m.getByLabel('Estabelecimento').selectOption({ label: 'Clinica São Lucas' })
await m.getByLabel('Dia da semana').selectOption('SEXTA')
await m.getByLabel('Duração do slot').selectOption('30')
await m.getByLabel('Hora início').fill('08:00')
await m.getByLabel('Hora fim').fill('08:30')
L.note('vigencia inicio (default do form): ' + await m.getByLabel('Vigência início').inputValue())
await L.shot(p, 'SETUP-r2-e-agenda-form')
w = p.waitForResponse((r) => r.url().includes('/agenda-medico') && r.request().method() === 'POST')
await m.getByRole('button', { name: 'Salvar Horário' }).click()
r = await w
const ag = await r.json().catch(() => ({}))
L.note(`POST agenda-medico -> ${r.status()} body=${r.request().postData()} resp=${JSON.stringify(ag)}`)
r2.agenda = { id: ag.id }
save()
await L.sleep(1500)
await L.shot(p, 'SETUP-r2-f-agenda-salva')
await L.end('SETUP-r2', 'reativacao das secretarias e preparacao do medico de QA pela UI (DEV)')
L.saveAll('r2-a')
await browser.close()
