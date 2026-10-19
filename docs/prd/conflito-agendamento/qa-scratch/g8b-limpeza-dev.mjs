// QA099 parte 2 — DEV: cancela o domiciliar 22/10 10:00 e inativa as secretarias de QA pela tela /funcionarios
import fs from 'node:fs'
import * as L from './lib.mjs'
const contas = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const browser = await L.launch()
const D = await L.newSession(browser, 'DEV')
const p = D.page
await L.login(p, 'dev-local@sgsm.local', 'Dev088c00c5ba89!Aa')
L.start('QA099-b')
await L.irAgendamentos(p)
await p.getByPlaceholder('CPF ou nome do paciente…').fill('Zilma')
await p.getByRole('button', { name: /Zilma Ruela/ }).first().click()
await L.sleep(2500)
const cards = () => p.locator('div.grid > div').filter({ has: p.locator('p.font-bold') })
const c = cards().filter({ hasText: 'Consulta de Rotina' }).filter({ hasText: '22/10/2026, 10:00' }).filter({ has: p.getByRole('button', { name: /Cancelar/ }) }).first()
if (await c.count()) {
  L.note('cancelando (DEV): ' + (await c.innerText()).replace(/\n/g, ' | '))
  await c.getByRole('button', { name: /Cancelar/ }).click()
  const m = L.modal(p)
  await m.getByLabel('Origem').selectOption('ESTABELECIMENTO')
  await m.locator('textarea').fill('Limpeza do QA de conflito de agendamento')
  const w = p.waitForResponse((r) => r.url().includes('/cancelar') && r.request().method() === 'PATCH')
  await m.getByRole('button', { name: 'Confirmar Cancelamento' }).click()
  const r = await w
  L.note(`PATCH ${r.url()} -> ${r.status()}`)
  await L.sleep(1500)
} else L.note('card domiciliar 22/10 10:00 ativo nao encontrado na lista do DEV')
L.note('cards Zilma 21-22/10 (DEV): ' + JSON.stringify((await cards().filter({ hasText: /2[12]\/10\/2026/ }).allInnerTexts()).map((t) => t.replace(/\n/g, ' | '))))
await L.shot(p, 'QA099-c-agendamentos-DEV')

await p.getByRole('link', { name: 'Funcionários' }).first().click()
await p.waitForURL('**/funcionarios')
await p.getByPlaceholder('Buscar por nome, CPF, cargo ou e-mail…').fill('qa.conflito')
await L.sleep(2000)
for (const k of ['A', 'B']) {
  const card = p.locator('div.grid > div').filter({ hasText: contas[k].email }).first()
  if (!(await card.getByRole('button').filter({ hasText: /^$/ }).count()) && !(await card.locator('button').count())) continue
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
L.note('cards QA apos inativar: ' + JSON.stringify((await p.locator('div.grid > div').filter({ hasText: 'qa.conflito' }).allInnerTexts()).map((t) => t.replace(/\n/g, ' | '))))
await L.shot(p, 'QA099-d-funcionarios')
await L.end('QA099-b')
await browser.close()
