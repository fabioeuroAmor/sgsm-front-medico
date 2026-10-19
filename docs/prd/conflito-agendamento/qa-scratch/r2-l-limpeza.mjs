// RODADA 2 — QA099 (limpeza pela UI, DEV): cancela agendamentos criados na rodada 2; inativa servicos e medicos de QA; inativa as secretarias
import fs from 'node:fs'
import * as L from './lib.mjs'
const contas = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const r2 = JSON.parse(fs.readFileSync(new URL('./contas-r2.json', import.meta.url)))
const browser = await L.launch()
const D = await L.newSession(browser, 'DEV')
const p = D.page
const cards = () => p.locator('div.grid > div').filter({ has: p.locator('p.font-bold') })
await L.login(p, 'dev-local@sgsm.local', 'Dev088c00c5ba89!Aa')
L.start('QA099-r2')
await L.irAgendamentos(p)
await L.sleep(2500)
await L.shot(p, 'QA099-r2-a-agendamentos-antes')
const alvos = [['QA Descartavel', '21/10/2026, 15:00'], ['QA Domiciliar Fora', '22/10/2026, 08:00'], ['Consulta de Rotina', '22/10/2026, 10:00']]
for (const [serv, quando] of alvos) {
  const c = cards().filter({ hasText: serv }).filter({ hasText: quando }).filter({ has: p.getByRole('button', { name: /Cancelar/ }) }).first()
  if (!(await c.count())) { L.note(`sem card ativo (ja cancelado ou inexistente): ${serv} ${quando}`); continue }
  L.note('cancelando: ' + (await c.innerText()).replace(/\n/g, ' | '))
  await c.getByRole('button', { name: /Cancelar/ }).click()
  const m = L.modal(p)
  await m.getByLabel('Origem').selectOption('ESTABELECIMENTO')
  await m.locator('textarea').fill('Limpeza do QA rodada 2 (conflito de agendamento)')
  const w = p.waitForResponse((r) => r.url().includes('/cancelar') && r.request().method() === 'PATCH')
  await m.getByRole('button', { name: 'Confirmar Cancelamento' }).click()
  const r = await w
  L.note(`PATCH ${r.url()} -> ${r.status()}`)
  await L.sleep(1500)
}
const wl = p.waitForResponse((r) => /\/v1\/api\/agendamentos(\?|$)/.test(r.url()) && r.request().method() === 'GET')
await p.reload()
const lista = await (await wl).json()
const ids = [r2.qa052, r2.medicoFora.agendamentoId, r2.qa063]
L.note('status final dos agendamentos da rodada 2 (resposta do GET /agendamentos): ' + JSON.stringify(lista.filter((a) => ids.includes(a.id)).map((a) => ({ id: a.id, quando: a.dataHoraInicio, servico: a.servicoMedicoNome, status: a.status }))))
L.note('agendamentos NAO cancelados dos medicos de QA: ' + JSON.stringify(lista.filter((a) => [r2.medico.id, r2.medLogin.id, r2.medicoFora.id].includes(a.medicoId) && a.status !== 'CANCELADO').map((a) => a.id)))
await L.sleep(1500)
await L.shot(p, 'QA099-r2-b-agendamentos-depois')

// servicos de QA
await p.getByRole('link', { name: 'Serviços' }).first().click()
await p.waitForURL('**/servicos')
await L.sleep(2000)
for (const nome of ['QA Unico Horario', 'QA Servico Medico Login', 'QA Domiciliar Fora']) {
  const c = p.locator('div.grid > div').filter({ has: p.locator('h3', { hasText: new RegExp(`^${nome}$`) }) }).first()
  if (!(await c.count())) { L.note(`servico ${nome}: card nao encontrado`); continue }
  if ((await c.innerText()).includes('Inativo')) { L.note(`servico ${nome}: ja inativo`); continue }
  await c.locator('button').last().click()
  const w = p.waitForResponse((r) => r.url().includes('/servicos-medicos/') && r.request().method() !== 'GET')
  await L.modal(p).getByRole('button', { name: 'Inativar' }).click()
  const r = await w
  L.note(`inativar servico ${nome}: ${r.request().method()} ${r.url()} -> ${r.status()}`)
  await L.sleep(1200)
}
await L.shot(p, 'QA099-r2-c-servicos')

// medicos de QA
await p.getByRole('link', { name: 'Médicos' }).first().click()
await p.waitForURL('**/medicos')
await p.getByPlaceholder('Buscar por nome, CRM ou e-mail…').fill('qa.conflito.med')
await L.sleep(2000)
for (const nome of ['QA Medico Unico Horario', 'QA Medico Login', 'QA Medico Fora']) {
  const c = p.locator('div.grid > div').filter({ has: p.locator('h3', { hasText: new RegExp(`^${nome}$`) }) }).first()
  if (!(await c.count())) { L.note(`medico ${nome}: card nao encontrado`); continue }
  if ((await c.innerText()).includes('Inativo')) { L.note(`medico ${nome}: ja inativo`); continue }
  await c.locator('button').last().click()
  const w = p.waitForResponse((r) => r.url().includes('/medicos/') && r.request().method() !== 'GET')
  await L.modal(p).getByRole('button', { name: 'Inativar' }).click()
  const r = await w
  L.note(`inativar medico ${nome}: ${r.request().method()} ${r.url()} -> ${r.status()}`)
  await L.sleep(1200)
}
await L.sleep(1500)
L.note('cards medicos qa.conflito: ' + JSON.stringify((await p.locator('div.grid > div').filter({ hasText: 'qa.conflito.med' }).allInnerTexts()).map((t) => t.replace(/\n/g, ' | '))))
await L.shot(p, 'QA099-r2-d-medicos')

// secretarias
await p.getByRole('link', { name: 'Funcionários' }).first().click()
await p.waitForURL('**/funcionarios')
await p.getByPlaceholder('Buscar por nome, CPF, cargo ou e-mail…').fill('qa.conflito')
await L.sleep(2000)
for (const k of ['A', 'B']) {
  const card = p.locator('div.grid > div').filter({ hasText: contas[k].email }).first()
  if ((await card.innerText()).includes('Inativo')) { L.note(`${k} ja inativo`); continue }
  await card.locator('button').last().click()
  const w = p.waitForResponse((r) => r.url().includes('/funcionarios/') && ['DELETE', 'PATCH', 'PUT'].includes(r.request().method()))
  await L.modal(p).getByRole('button', { name: 'Inativar' }).click()
  const r = await w
  L.note(`inativar ${contas[k].email}: ${r.request().method()} ${r.url()} -> ${r.status()}`)
  await L.sleep(1500)
}
await p.locator('select').nth(1).selectOption('')
await L.sleep(2000)
L.note('cards secretarias QA: ' + JSON.stringify((await p.locator('div.grid > div').filter({ hasText: 'qa.conflito' }).allInnerTexts()).map((t) => t.replace(/\n/g, ' | '))))
await L.shot(p, 'QA099-r2-e-funcionarios')
await L.end('QA099-r2')
L.saveAll('r2-l')
await browser.close()
