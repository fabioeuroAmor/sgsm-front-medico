// QA052 — SEC-A no passo 5 com reserva expirada; SEC-B agenda o mesmo horario; SEC-A confirma -> 409
import fs from 'node:fs'
import * as L from './lib.mjs'
const contas = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const SLOT = process.argv[2] || '13:30'
const browser = await L.launch()
const A = await L.newSession(browser, 'SEC-A')
const B = await L.newSession(browser, 'SEC-B')
const pa = A.page, pb = B.page
const isReservaPost = (r) => r.url().endsWith('/agendamentos/reservas') && r.request().method() === 'POST'
const isCad = (r) => r.url().endsWith('/v1/api/agendamentos') && r.request().method() === 'POST'
const cards = (pg) => pg.locator('div.grid > div').filter({ has: pg.locator('p.font-bold') })

await L.login(pa, contas.A.email, contas.A.senha)
await L.irAgendamentos(pa)
L.start('QA052')
await L.wizardAte4(pa)
let w = pa.waitForResponse(isReservaPost)
await L.slotBtn(pa, SLOT).click()
L.note(`SEC-A POST reserva ${SLOT} -> ` + (await w).status())
await L.faixaReserva(pa).waitFor()
await L.modal(pa).getByRole('button', { name: 'Próximo', exact: true }).click()
await pa.getByText('Passo 5 / 5').waitFor()
await L.shot(pa, 'QA052-a-SEC-A-passo5-com-reserva')
const t0 = Date.now()
while (await L.faixaReserva(pa).isVisible().catch(() => false)) {
  if (Date.now() - t0 > 11 * 60_000) break
  await L.sleep(5000)
}
L.note(`faixa de reserva sumiu no passo 5 apos ${((Date.now() - t0) / 1000).toFixed(0)} s (reserva expirada); erro exibido=${JSON.stringify(await L.modal(pa).locator('div.text-destructive').allTextContents())}`)
await L.shot(pa, 'QA052-b-SEC-A-passo5-sem-reserva')

await L.login(pb, contas.B.email, contas.B.senha)
await L.irAgendamentos(pb)
await L.wizardAte4(pb)
L.note('grade SEC-B: ' + JSON.stringify(await L.gradeHorarios(pb)))
w = pb.waitForResponse(isReservaPost)
await L.slotBtn(pb, SLOT).click()
L.note(`SEC-B POST reserva ${SLOT} -> ` + (await w).status())
await L.modal(pb).getByRole('button', { name: 'Próximo', exact: true }).click()
await pb.getByText('Passo 5 / 5').waitFor()
w = pb.waitForResponse(isCad)
await L.modal(pb).getByRole('button', { name: /Confirmar/ }).click()
const rb = await w
L.note(`SEC-B POST agendamentos ${SLOT} -> ${rb.status()} id=${(await rb.json()).id}`)
await L.sleep(2000)
await L.shot(pb, 'QA052-c-SEC-B-agendou')

await pa.bringToFront()
w = pa.waitForResponse(isCad)
await L.modal(pa).getByRole('button', { name: /Confirmar/ }).click()
const r = await w
L.note(`SEC-A POST agendamentos -> ${r.status()} requestBody=${r.request().postData()} resposta=${await r.text()}`)
await L.sleep(2500)
const m = L.modal(pa)
L.note('titulo modal: ' + await m.locator('h2').textContent())
L.note('erro: ' + JSON.stringify(await m.locator('div.text-destructive').allTextContents()))
L.note('alternativas: visivel=' + await m.getByText('Horários próximos disponíveis', { exact: true }).isVisible() + ' ' + JSON.stringify(await m.getByText('Horários próximos disponíveis', { exact: true }).locator('xpath=following-sibling::div[1]/button').allTextContents()))
L.note('grade: ' + JSON.stringify(await L.gradeHorarios(pa)))
await L.shot(pa, 'QA052-d-409-passo4')
await L.fecharModal(pa)
await L.sleep(3000)
L.note(`cards Zilma 21/10/2026, ${SLOT} na lista de SEC-A: ` + await cards(pa).filter({ hasText: `21/10/2026, ${SLOT}` }).count())
await L.shot(pa, 'QA052-e-lista')
await L.end('QA052')
L.saveAll('qa052')
await browser.close()
