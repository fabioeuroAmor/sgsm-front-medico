// RODADA 2 — QA052 + QA053: SEC-A no passo 5 com reserva expirada; SEC-B agenda o mesmo horario; SEC-A confirma -> 409;
// QA053: sem recarregar, a lista ao fundo passa a mostrar o agendamento de SEC-B (GET /agendamentos logo apos o 409)
import fs from 'node:fs'
import * as L from './lib.mjs'
const contas = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const SLOT = process.argv[2] || '15:00'
const QUANDO = `21/10/2026, ${SLOT}`
const browser = await L.launch()
const A = await L.newSession(browser, 'SEC-A')
const B = await L.newSession(browser, 'SEC-B')
const pa = A.page, pb = B.page
const isReservaPost = (r) => r.url().endsWith('/agendamentos/reservas') && r.request().method() === 'POST'
const isCad = (r) => r.url().endsWith('/v1/api/agendamentos') && r.request().method() === 'POST'
const isLista = (r) => /\/v1\/api\/agendamentos(\?|$)/.test(r.url()) && r.request().method() === 'GET'
const cards = (pg) => pg.locator('div.grid > div').filter({ has: pg.locator('p.font-bold') })
const cardsSlot = (pg) => cards(pg).filter({ hasText: QUANDO }).filter({ hasText: 'QA Descartavel' })
const r2f = new URL('./contas-r2.json', import.meta.url)

await L.login(pa, contas.A.email, contas.A.senha)
await L.irAgendamentos(pa)
await L.sleep(2000)
L.start('QA052-r2')
L.note(`cards ${QUANDO} na lista de SEC-A antes: ${await cardsSlot(pa).count()} ${JSON.stringify((await cardsSlot(pa).allInnerTexts()).map((t) => t.replace(/\n/g, ' | ')))}`)
await L.wizardAte4(pa)
let w = pa.waitForResponse(isReservaPost)
await L.slotBtn(pa, SLOT).click()
L.note(`SEC-A POST reserva ${SLOT} -> ` + (await w).status())
await L.faixaReserva(pa).waitFor()
await L.modal(pa).getByRole('button', { name: 'Próximo', exact: true }).click()
await pa.getByText('Passo 5 / 5').waitFor()
await L.shot(pa, 'QA052-r2-a-SEC-A-passo5-com-reserva')
const t0 = Date.now()
while (await L.faixaReserva(pa).isVisible().catch(() => false)) {
  if (Date.now() - t0 > 11 * 60_000) break
  await L.sleep(5000)
}
L.note(`faixa sumiu no passo 5 apos ${((Date.now() - t0) / 1000).toFixed(0)} s; erro exibido=${JSON.stringify(await L.modal(pa).locator('div.text-destructive').allTextContents())}`)
await L.shot(pa, 'QA052-r2-b-SEC-A-passo5-sem-reserva')

await L.login(pb, contas.B.email, contas.B.senha)
await L.irAgendamentos(pb)
await L.wizardAte4(pb)
w = pb.waitForResponse(isReservaPost)
await L.slotBtn(pb, SLOT).click()
L.note(`SEC-B POST reserva ${SLOT} -> ` + (await w).status())
await L.modal(pb).getByRole('button', { name: 'Próximo', exact: true }).click()
await pb.getByText('Passo 5 / 5').waitFor()
w = pb.waitForResponse(isCad)
await L.modal(pb).getByRole('button', { name: /Confirmar/ }).click()
const rb = await w
const idB = (await rb.json()).id
L.note(`SEC-B POST agendamentos ${SLOT} -> ${rb.status()} id=${idB}`)
const r2 = JSON.parse(fs.readFileSync(r2f)); r2.qa052 = idB; fs.writeFileSync(r2f, JSON.stringify(r2, null, 2))
await L.sleep(2000)
await L.shot(pb, 'QA052-r2-c-SEC-B-agendou')

await pa.bringToFront()
w = pa.waitForResponse(isCad)
const listaApos = pa.waitForResponse(isLista, { timeout: 10000 }).catch(() => null)
await L.modal(pa).getByRole('button', { name: /Confirmar/ }).click()
const r = await w
const t409 = Date.now()
L.note(`SEC-A POST agendamentos -> ${r.status()} requestBody=${r.request().postData()} resposta=${await r.text()}`)
const gl = await listaApos
let corpoLista = null
if (gl) { corpoLista = await gl.json().catch(() => null) }
await L.sleep(2500)
const m = L.modal(pa)
L.note('titulo modal: ' + await m.locator('h2').textContent())
L.note('erro: ' + JSON.stringify(await m.locator('div.text-destructive').allTextContents()))
L.note('alternativas: visivel=' + await m.getByText('Horários próximos disponíveis', { exact: true }).isVisible() + ' ' + JSON.stringify(await m.getByText('Horários próximos disponíveis', { exact: true }).locator('xpath=following-sibling::div[1]/button').allTextContents()))
L.note('grade: ' + JSON.stringify(await L.gradeHorarios(pa)) + ' | contem ' + SLOT + '? ' + (await L.gradeHorarios(pa)).includes(SLOT))
await L.shot(pa, 'QA052-r2-d-409-passo4')
await L.end('QA052-r2')

L.start('QA053-r2')
L.note(`GET /agendamentos apos o 409 (sem recarregar, modal ainda aberto): ${gl ? `${gl.status()} ${gl.url()} ${Date.now() - t409 < 0 ? '' : ''}` : 'NAO OCORREU'}`)
if (corpoLista) {
  const arr = Array.isArray(corpoLista) ? corpoLista : (corpoLista.content ?? [])
  L.note(`resposta da lista contem o agendamento de SEC-B (${idB}): ${arr.some((a) => a.id === idB)}`)
}
L.note(`(modal aberto) cards ${QUANDO} no DOM da lista de SEC-A: ${await cardsSlot(pa).count()} ${JSON.stringify((await cardsSlot(pa).allInnerTexts()).map((t) => t.replace(/\n/g, ' | ')))}`)
let i0 = L.LINES.length
await L.fecharModal(pa)
await L.sleep(2500)
L.note(`GET /agendamentos disparados ao fechar o modal: ${L.LINES.slice(i0).filter((l) => />> GET .*\/v1\/api\/agendamentos(\?| )/.test(l)).length}`)
const c = cardsSlot(pa).first()
await c.scrollIntoViewIfNeeded().catch(() => {})
L.note(`(modal fechado, sem recarregar) cards ${QUANDO}: ${await cardsSlot(pa).count()} ${JSON.stringify((await cardsSlot(pa).allInnerTexts()).map((t) => t.replace(/\n/g, ' | ')))} | url=${pa.url()}`)
await L.shot(pa, 'QA053-r2-lista-SEC-A')
await L.end('QA053-r2', `agendamento de SEC-B ${idB}`)
L.saveAll('r2-j')
await browser.close()
