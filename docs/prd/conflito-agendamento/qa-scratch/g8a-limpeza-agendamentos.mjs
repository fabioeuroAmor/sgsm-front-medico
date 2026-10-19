// QA099 parte 1 — cancelar pela UI os agendamentos criados no QA
import fs from 'node:fs'
import * as L from './lib.mjs'
const contas = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const browser = await L.launch()
const A = await L.newSession(browser, 'SEC-A')
const pa = A.page
await L.login(pa, contas.A.email, contas.A.senha)
await L.irAgendamentos(pa)
L.start('QA099-a')
await pa.getByPlaceholder('CPF ou nome do paciente…').fill('Zilma')
await pa.getByRole('button', { name: /Zilma Ruela/ }).first().click()
await L.sleep(2000)
const cards = () => pa.locator('div.grid > div').filter({ has: pa.locator('p.font-bold') })
await L.shot(pa, 'QA099-a-antes')
const alvos = [
  ['QA Descartavel', '21/10/2026, 10:00'], ['QA Descartavel', '21/10/2026, 12:30'],
  ['QA Descartavel', '21/10/2026, 13:00'], ['QA Descartavel', '21/10/2026, 13:30'],
  ['Consulta de Rotina', '22/10/2026, 10:00'],
]
for (const [serv, quando] of alvos) {
  const c = cards().filter({ hasText: serv }).filter({ hasText: quando }).filter({ has: pa.getByRole('button', { name: /Cancelar/ }) }).first()
  if (!(await c.count())) { L.note(`nao encontrado card ativo ${serv} ${quando}`); continue }
  L.note('cancelando: ' + (await c.innerText()).replace(/\n/g, ' | '))
  await c.getByRole('button', { name: /Cancelar/ }).click()
  const m = L.modal(pa)
  await m.getByLabel('Origem').selectOption('ESTABELECIMENTO')
  await m.locator('textarea').fill('Limpeza do QA de conflito de agendamento')
  const w = pa.waitForResponse((r) => r.url().includes('/cancelar') && r.request().method() === 'PATCH')
  await m.getByRole('button', { name: 'Confirmar Cancelamento' }).click()
  const r = await w
  L.note(`PATCH ${r.url()} -> ${r.status()}`)
  await L.sleep(1500)
}
L.note('cards Zilma 21-22/10 apos limpeza: ' + JSON.stringify((await cards().filter({ hasText: /2[12]\/10\/2026/ }).allInnerTexts()).map((t) => t.replace(/\n/g, ' | '))))
await L.shot(pa, 'QA099-b-depois')
await L.end('QA099-a')
await browser.close()
