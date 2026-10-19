// RODADA 3 — limpeza pela UI (DEV): (1) /medicos: confirma que nenhum medico do QA095 foi criado;
// (2) /pacientes: procura os pacientes do QA095 e inativa se existirem; (3) /funcionarios: inativa SEC-A (reativada nesta rodada)
import fs from 'node:fs'
import * as L from './lib.mjs'
const contas = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const r3 = JSON.parse(fs.readFileSync(new URL('./contas-r3.json', import.meta.url)))
const browser = await L.launch()
const D = await L.newSession(browser, 'DEV')
const p = D.page
await L.login(p, 'dev-local@sgsm.local', 'Dev088c00c5ba89!Aa')
L.start('QA095-r3-limpeza')

// (1) medicos
const wMed = p.waitForResponse((r) => /\/v1\/api\/medicos(\?|$)/.test(r.url()) && r.request().method() === 'GET')
await p.getByRole('link', { name: 'Médicos' }).first().click()
await p.waitForURL('**/medicos')
const listaMed = await (await wMed).json().catch(() => [])
const arrMed = Array.isArray(listaMed) ? listaMed : (listaMed.content ?? [])
L.note(`GET /medicos (filtro "Todos") total=${arrMed.length} | com nome "QA Medico R3": ${JSON.stringify(arrMed.filter((m) => /QA Medico R3/i.test(m.nome)).map((m) => m.nome))} | com e-mail "qa.conflito.med.r3": ${JSON.stringify(arrMed.filter((m) => /qa\.conflito\.med\.r3/i.test(m.email ?? '')).map((m) => m.email))}`)
for (const termo of ['QA Medico R3', 'qa.conflito.med.r3', r3.medicoTentado.nome]) {
  await p.getByPlaceholder('Buscar por nome, CRM ou e-mail…').fill(termo)
  await L.sleep(1500)
  const n = await p.locator('div.grid > div').filter({ hasText: /QA Medico R3|qa\.conflito\.med\.r3/ }).count()
  L.note(`/medicos busca "${termo}": cards encontrados=${n} | texto "nenhum"/vazio na tela: ${JSON.stringify(await p.getByText(/Nenhum/i).allTextContents())}`)
}
await L.shot(p, 'QA095-r3-g-medicos-busca-DEV')

// (2) pacientes
const wPac = p.waitForResponse((r) => /\/v1\/api\/pacientes(\?|$)/.test(r.url()) && r.request().method() === 'GET')
await p.getByRole('link', { name: 'Pacientes' }).first().click()
await p.waitForURL('**/pacientes')
const listaPac = await (await wPac).json().catch(() => [])
const arrPac = Array.isArray(listaPac) ? listaPac : (listaPac.content ?? [])
const cpfs = [r3.paciente?.cpf, r3.pacienteControle?.cpf].filter(Boolean)
L.note(`GET /pacientes total=${arrPac.length} | com nome "QA Paciente R3": ${JSON.stringify(arrPac.filter((x) => /QA Paciente R3/i.test(x.nome)).map((x) => x.nome))} | com os CPFs do QA095: ${JSON.stringify(arrPac.filter((x) => cpfs.includes(String(x.cpf).replace(/\D/g, ''))).map((x) => x.id))}`)
for (const termo of ['QA Paciente R3', 'qa.conflito.pac.r3', ...cpfs]) {
  await p.getByPlaceholder('Buscar por nome, CPF ou e-mail…').fill(termo)
  await L.sleep(1500)
  const cards = p.locator('div.grid > div').filter({ hasText: /QA Paciente R3/ })
  const n = await cards.count()
  L.note(`/pacientes busca "${termo}": cards encontrados=${n}`)
  for (let i = 0; i < n; i++) {
    const c = cards.nth(i)
    if ((await c.innerText()).includes('Inativo')) continue
    await c.locator('button').last().click()
    const w = p.waitForResponse((r) => r.url().includes('/pacientes/') && r.request().method() !== 'GET')
    await L.modal(p).getByRole('button', { name: 'Inativar' }).click()
    const r = await w
    L.note(`inativar paciente: ${r.request().method()} ${r.url()} -> ${r.status()}`)
    await L.sleep(1200)
  }
}
await L.shot(p, 'QA095-r3-h-pacientes-busca-DEV')

// (3) SEC-A
await p.getByRole('link', { name: 'Funcionários' }).first().click()
await p.waitForURL('**/funcionarios')
await p.getByPlaceholder('Buscar por nome, CPF, cargo ou e-mail…').fill('qa.conflito')
await L.sleep(2000)
const card = p.locator('div.grid > div').filter({ hasText: contas.A.email }).first()
if ((await card.innerText()).includes('Inativo')) L.note('SEC-A ja inativa')
else {
  await card.locator('button').last().click()
  const w = p.waitForResponse((r) => r.url().includes('/funcionarios/') && ['DELETE', 'PATCH', 'PUT'].includes(r.request().method()))
  await L.modal(p).getByRole('button', { name: 'Inativar' }).click()
  const r = await w
  L.note(`inativar ${contas.A.email}: ${r.request().method()} ${r.url()} -> ${r.status()}`)
  await L.sleep(1500)
}
L.note('cards secretarias QA: ' + JSON.stringify((await p.locator('div.grid > div').filter({ hasText: 'qa.conflito' }).allInnerTexts()).map((t) => t.replace(/\n/g, ' | '))))
await L.shot(p, 'QA095-r3-i-funcionarios-DEV')
await L.end('QA095-r3-limpeza', `medicos tentados no QA095 (4 execucoes do script): ${JSON.stringify(['QA Medico R3 874443', 'QA Medico R3 893212', 'QA Medico R3 916720', r3.medicoTentado.nome])}`)
L.saveAll('r3-d')
await browser.close()
