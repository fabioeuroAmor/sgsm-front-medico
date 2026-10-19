// QA036 (expiracao), QA037 (confirmar apos expirar), QA052 (409 na confirmacao)
// SEC-A aba 1: 12:30 (QA036/QA037). SEC-A aba 2: 13:00 (QA052). SEC-B agenda 13:00 apos a expiracao.
import fs from 'node:fs'
import * as L from './lib.mjs'
const contas = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const browser = await L.launch()
const A = await L.newSession(browser, 'SEC-A')
const B = await L.newSession(browser, 'SEC-B')
const a1 = A.page
const isReservaPost = (r) => r.url().endsWith('/agendamentos/reservas') && r.request().method() === 'POST'
const isCad = (r) => r.url().endsWith('/v1/api/agendamentos') && r.request().method() === 'POST'

await L.login(a1, contas.A.email, contas.A.senha)
await L.irAgendamentos(a1)
const a2 = await A.ctx.newPage()
await a2.goto(L.BASE + '/agendamentos'); await a2.getByRole('button', { name: 'Novo Agendamento' }).waitFor()

L.start('QA036')
L.start('QA052')
await L.wizardAte4(a1)
let w = a1.waitForResponse(isReservaPost)
await L.slotBtn(a1, '12:30').click()
L.note('aba1 POST 12:30 -> ' + (await w).status())
await L.faixaReserva(a1).waitFor()
await L.wizardAte4(a2)
w = a2.waitForResponse(isReservaPost)
await L.slotBtn(a2, '13:00').click()
L.note('aba2 POST 13:00 -> ' + (await w).status())
await L.faixaReserva(a2).waitFor()
// aba 2 ja avanca para o passo 5 (QA052) e fica parada ali
await L.modal(a2).getByRole('button', { name: 'Próximo', exact: true }).click()
await a2.getByText('Passo 5 / 5').waitFor()
await L.shot(a2, 'QA052-a-SEC-A-passo5-com-reserva')
await a1.bringToFront()
await L.shot(a1, 'QA036-a-inicio')
L.note('faixa aba1: ' + await L.faixaReserva(a1).textContent())

// espera real ate 00:00
const t0 = Date.now()
let sumiu = null
while (Date.now() - t0 < 11 * 60_000) {
  const vis = await L.faixaReserva(a1).isVisible().catch(() => false)
  if (!vis) { sumiu = Date.now(); break }
  const txt = await L.faixaReserva(a1).textContent().catch(() => '')
  if (/expira em 00:0[0-5]/.test(txt)) { await L.shot(a1, 'QA036-b-quase-zero') }
  await L.sleep(/expira em 00:[0-1]/.test(txt) ? 1000 : 15000)
}
L.note('faixa sumiu apos ' + (sumiu ? ((sumiu - t0) / 1000).toFixed(0) + ' s de espera' : 'NAO sumiu'))
await L.sleep(1000)
L.note('mensagem: ' + JSON.stringify(await L.modal(a1).locator('div.text-destructive').allTextContents()))
L.note('selecionado ainda: ' + JSON.stringify(await L.modal(a1).locator('div.grid.grid-cols-3 > button.bg-primary\\/10').allTextContents()))
await L.shot(a1, 'QA036-c-expirou')
await L.end('QA036', 'verificar: nenhum CONSOLE.error / PAGEERROR no periodo')

// QA037 — avancar e confirmar sem reserva
L.start('QA037')
await L.modal(a1).getByRole('button', { name: 'Próximo', exact: true }).click()
await a1.getByText('Passo 5 / 5').waitFor()
await L.shot(a1, 'QA037-a-passo5')
w = a1.waitForResponse(isCad)
await L.modal(a1).getByRole('button', { name: /Confirmar/ }).click()
const r37 = await w
L.note(`POST agendamentos -> ${r37.status()} requestBody=${r37.request().postData()} resposta=${(await r37.text()).slice(0, 300)}`)
await L.sleep(3000)
L.note('modal aberto=' + await a1.getByText('Passo 5 / 5').isVisible() + ' erros=' + JSON.stringify(await a1.locator('div.text-destructive').allTextContents()))
await L.shot(a1, 'QA037-b-resultado')
await L.end('QA037')

// QA052 — SEC-B agenda 13:00 (a reserva de SEC-A na aba 2 expirou junto)
const pb = B.page
await L.login(pb, contas.B.email, contas.B.senha)
await L.irAgendamentos(pb)
await L.wizardAte4(pb)
L.note('grade SEC-B: ' + JSON.stringify(await L.gradeHorarios(pb)))
w = pb.waitForResponse(isReservaPost)
await L.slotBtn(pb, '13:00').click()
L.note('SEC-B POST reserva 13:00 -> ' + (await w).status())
await L.modal(pb).getByRole('button', { name: 'Próximo', exact: true }).click()
await pb.getByText('Passo 5 / 5').waitFor()
w = pb.waitForResponse(isCad)
await L.modal(pb).getByRole('button', { name: /Confirmar/ }).click()
L.note('SEC-B POST agendamentos 13:00 -> ' + (await w).status())
await L.sleep(2000)
await L.shot(pb, 'QA052-b-SEC-B-agendou')
// SEC-A aba 2 confirma
await a2.bringToFront()
L.note('aba2 faixa visivel (deve ter expirado): ' + await L.faixaReserva(a2).isVisible())
w = a2.waitForResponse(isCad)
await L.modal(a2).getByRole('button', { name: /Confirmar/ }).click()
const r52 = await w
L.note(`aba2 POST agendamentos -> ${r52.status()} requestBody=${r52.request().postData()} resposta=${await r52.text()}`)
await L.sleep(2500)
const m2 = L.modal(a2)
L.note('titulo modal: ' + await m2.locator('h2').textContent())
L.note('erro: ' + JSON.stringify(await m2.locator('div.text-destructive').allTextContents()))
L.note('alternativas visiveis: ' + await m2.getByText('Horários próximos disponíveis').isVisible())
await L.shot(a2, 'QA052-c-409')
await L.fecharModal(a2)
await L.sleep(3000)
const n13 = await a2.locator('div.grid > div').filter({ hasText: 'Zilma Ruela' }).filter({ hasText: '21/10/2026, 13:00' }).count()
L.note('cards Zilma 21/10/2026 13:00 na lista de SEC-A: ' + n13)
await L.shot(a2, 'QA052-d-lista')
await L.end('QA052')
L.saveAll('g4a')
await browser.close()
