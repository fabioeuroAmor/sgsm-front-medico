// QA030-QA035, QA039, QA080, QA081, QA083
import fs from 'node:fs'
import * as L from './lib.mjs'
const contas = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const browser = await L.launch()
const A = await L.newSession(browser, 'SEC-A')
const pa = A.page
const isReservaPost = (r) => r.url().endsWith('/agendamentos/reservas') && r.request().method() === 'POST'
const contar = (i0, re) => L.LINES.slice(i0).filter((l) => re.test(l)).length
const selecionados = (pg) => L.modal(pg).locator('div.grid.grid-cols-3 > button.bg-primary\\/10').allTextContents()

await L.login(pa, contas.A.email, contas.A.senha)
await L.irAgendamentos(pa)
await L.wizardAte4(pa)

// QA030
L.start('QA030')
let w = pa.waitForResponse(isReservaPost)
await L.slotBtn(pa, '15:00').click()
L.note('POST 15:00 -> ' + (await w).status())
await L.faixaReserva(pa).waitFor()
await L.shot(pa, 'QA030-a-15h')
const del30 = pa.waitForResponse((r) => r.request().method() === 'DELETE' && r.url().includes('/reservas/'))
w = pa.waitForResponse(isReservaPost)
await L.slotBtn(pa, '15:30').click()
const [d30, p30] = await Promise.all([del30, w])
L.note(`DELETE ${d30.url()} -> ${d30.status()} | POST 15:30 -> ${p30.status()} body=${p30.request().postData()}`)
await L.sleep(800)
L.note('selecionados: ' + JSON.stringify(await selecionados(pa)))
await L.shot(pa, 'QA030-b-15h30')
await L.end('QA030')

// QA031
L.start('QA031')
let i0 = L.LINES.length
await L.slotBtn(pa, '15:30').click()
await L.sleep(3000)
L.note('POST /reservas apos clicar de novo em 15:30: ' + contar(i0, />> POST .*\/agendamentos\/reservas /) + ' | DELETE: ' + contar(i0, />> DELETE /))
L.note('selecionados: ' + JSON.stringify(await selecionados(pa)) + ' faixa=' + await L.faixaReserva(pa).textContent())
await L.shot(pa, 'QA031')
await L.end('QA031')

// QA032 — clique duplo em 16:00
L.start('QA032')
i0 = L.LINES.length
await L.slotBtn(pa, '16:00').dblclick()
await L.sleep(4000)
const posts = contar(i0, />> POST .*\/agendamentos\/reservas /)
const p201 = contar(i0, /<< 201 POST .*\/agendamentos\/reservas /)
const p409 = contar(i0, /<< 409 POST .*\/agendamentos\/reservas /)
const dels = contar(i0, />> DELETE .*\/reservas\//)
L.note(`apos dblclick: POST reservas=${posts} (201=${p201}, 409=${p409}), DELETE=${dels}`)
L.note('selecionados: ' + JSON.stringify(await selecionados(pa)) + ' erro=' + JSON.stringify(await L.modal(pa).locator('div.text-destructive').allTextContents()))
await L.shot(pa, 'QA032')
await L.end('QA032', 'contagem: 1 DELETE esperado (libera 15:30) e 1 POST 201 (16:00)')

// QA033 — Anterior com reserva ativa
L.start('QA033')
const del33 = pa.waitForResponse((r) => r.request().method() === 'DELETE' && r.url().includes('/reservas/'))
await L.modal(pa).getByRole('button', { name: 'Anterior', exact: true }).click()
const d33 = await del33
L.note(`DELETE ${d33.url()} -> ${d33.status()}`)
await pa.getByText('Passo 3 / 5').waitFor()
await L.shot(pa, 'QA033-a-passo3')
await L.modal(pa).getByRole('button', { name: 'Próximo', exact: true }).click()
await pa.getByText('Passo 4 / 5').waitFor()
await L.esperarGrade(pa)
L.note('ao voltar ao passo 4: selecionados=' + JSON.stringify(await selecionados(pa)) + ' faixa visivel=' + await L.faixaReserva(pa).isVisible() + ' botao Proximo habilitado=' + await L.modal(pa).getByRole('button', { name: 'Próximo', exact: true }).isEnabled())
await L.shot(pa, 'QA033-b-passo4')
await L.end('QA033')

// QA034 — trocar o dia com reserva ativa
L.start('QA034')
await L.esperarGrade(pa)
w = pa.waitForResponse(isReservaPost)
await L.slotBtn(pa, '16:30').click()
L.note('POST 16:30 -> ' + (await w).status())
await L.faixaReserva(pa).waitFor()
await L.shot(pa, 'QA034-a-reservado')
const del34 = pa.waitForResponse((r) => r.request().method() === 'DELETE' && r.url().includes('/reservas/'))
const sl34 = pa.waitForResponse((r) => r.url().includes('/agendamentos/slots') && r.url().includes('2026-10-28'))
await L.escolherDia(pa, '28')
const [d34, s34] = await Promise.all([del34, sl34])
L.note(`DELETE ${d34.url()} -> ${d34.status()} | GET slots 28/10 -> ${s34.status()}`)
await L.esperarGrade(pa)
L.note('grade 28/10 selecionados=' + JSON.stringify(await selecionados(pa)) + ' faixa=' + await L.faixaReserva(pa).isVisible())
await L.shot(pa, 'QA034-b-dia-28')
await L.end('QA034')

// QA035 — Mais tempo
L.start('QA035')
await L.escolherDia(pa, '21')
await L.esperarGrade(pa)
w = pa.waitForResponse(isReservaPost)
await L.slotBtn(pa, '16:30').click()
L.note('POST 16:30 -> ' + (await w).status())
await L.faixaReserva(pa).waitFor()
await L.sleep(20000)
L.note('faixa antes de renovar: ' + await L.faixaReserva(pa).textContent())
await L.shot(pa, 'QA035-a-antes')
const ren = pa.waitForResponse((r) => r.url().includes('/renovar'))
await L.modal(pa).getByRole('button', { name: 'Mais tempo' }).click()
const rn = await ren
L.note(`POST ${rn.url()} -> ${rn.status()} body=${await rn.text()}`)
await L.sleep(1200)
L.note('faixa depois de renovar: ' + await L.faixaReserva(pa).textContent())
await L.shot(pa, 'QA035-b-depois')
await L.end('QA035')
await L.fecharModal(pa) // libera 16:30
await L.sleep(1500)

// QA081 — datas passadas
L.start('QA081')
await L.abrirWizard(pa); await L.passo1(pa); await L.passo2(pa); await L.passo3(pa)
await L.sleep(1500)
const dias = await L.modal(pa).locator('div.grid.grid-cols-7 > button').evaluateAll((bs) => bs.map((b) => `${b.textContent}:${b.disabled ? 'D' : 'H'}`))
L.note('celulas do calendario (D=desabilitado,H=habilitado): ' + dias.join(' '))
const b14 = L.modal(pa).locator('div.grid.grid-cols-7 > button').filter({ hasText: /^14$/ }).first()
L.note('dia 14/10 (quarta passada) disabled=' + await b14.isDisabled())
await b14.click({ force: true }).catch((e) => L.note('clique forcado no 14: ' + e.message.split('\n')[0]))
await L.sleep(800)
L.note('apos tentar clicar em 14: texto "Horários disponíveis" visivel=' + await L.modal(pa).getByText('Horários disponíveis').isVisible())
await L.shot(pa, 'QA081')
await L.end('QA081')

// QA080 — domingo 25/10
L.start('QA080')
const b25 = L.modal(pa).locator('div.grid.grid-cols-7 > button').filter({ hasText: /^25$/ }).first()
L.note('dia 25/10 (domingo) disabled=' + await b25.isDisabled())
i0 = L.LINES.length
await b25.click({ force: true }).catch((e) => L.note('clique forcado no 25: ' + e.message.split('\n')[0]))
await L.sleep(1500)
L.note('apos clicar em 25: "Sem horários" visivel=' + await L.modal(pa).getByText('Sem horários disponíveis nesta data').isVisible() + ' | POST reservas=' + contar(i0, />> POST .*reservas/) + ' | GET slots=' + contar(i0, />> GET .*slots/))
await L.shot(pa, 'QA080-a-calendario')
await L.end('QA080', 'parte calendario; parte chatbot no script g5')
await L.fecharModal(pa)

// QA039 — 3 abas com reservas + 4a aba
if (process.argv[2]) {
  const alvo = new Date(process.argv[2]).getTime()
  L.note(`aguardando ate ${process.argv[2]} (expirar reserva orfa de SEC-A deixada pela execucao anterior interrompida) antes do QA039`)
  while (Date.now() < alvo) await L.sleep(5000)
}
L.start('QA039')
const tabs = []
const hor = ['08:00', '08:30', '09:00', '09:30']
for (let t = 0; t < 4; t++) {
  const pg = t === 0 ? pa : await A.ctx.newPage()
  if (t > 0) { await pg.goto(L.BASE + '/agendamentos'); await pg.getByRole('button', { name: 'Novo Agendamento' }).waitFor() }
  await L.wizardAte4(pg)
  tabs.push(pg)
}
for (let t = 0; t < 4; t++) {
  const pg = tabs[t]
  await pg.bringToFront()
  const ww = pg.waitForResponse(isReservaPost)
  await L.slotBtn(pg, hor[t]).click()
  const r = await ww
  L.note(`aba ${t + 1} POST ${hor[t]} -> ${r.status()} ${t === 3 ? 'body=' + (await r.text()) : ''}`)
  await L.sleep(1000)
  await L.shot(pg, `QA039-${'abcd'[t]}-aba${t + 1}`)
}
const m4 = L.modal(tabs[3])
L.note('aba 4: erro=' + JSON.stringify(await m4.locator('div.text-destructive').allTextContents()) + ' selecionados=' + JSON.stringify(await selecionados(tabs[3])) + ' faixa=' + await L.faixaReserva(tabs[3]).isVisible())
await L.end('QA039')

// QA083 — teclado (aba 4, sem reserva propria)
L.start('QA083')
for (let t = 0; t < 3; t++) { await tabs[t].bringToFront(); await L.fecharModal(tabs[t]); await L.sleep(700) }
const pk = tabs[3]
await pk.bringToFront()
await L.slotBtn(pk, '09:00').focus() // ponto de partida: horario anterior; dali so Tab
await pk.keyboard.press('Tab')
await pk.keyboard.press('Tab')
const foco = await pk.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); return { texto: e.textContent, outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor, boxShadow: cs.boxShadow, focusVisible: e.matches(':focus-visible') } })
L.note('elemento focado apos Tab: ' + JSON.stringify(foco))
await L.shot(pk, 'QA083-a-foco')
w = pk.waitForResponse(isReservaPost)
await pk.keyboard.press('Enter')
const rk = await w
L.note(`Enter -> POST ${rk.status()} body=${rk.request().postData()}`)
await L.faixaReserva(pk).waitFor({ timeout: 8000 }).catch(() => {})
L.note('selecionados=' + JSON.stringify(await selecionados(pk)))
await L.shot(pk, 'QA083-b-enter')
await pk.keyboard.press('Shift+Tab')
const foco2 = await pk.evaluate(() => document.activeElement.textContent)
const ws = pk.waitForResponse(isReservaPost)
await pk.keyboard.press('Space')
const rs = await ws
L.note(`Shift+Tab foco em "${foco2}" + Espaco -> POST ${rs.status()} body=${rs.request().postData()}`)
await L.sleep(1000)
L.note('selecionados=' + JSON.stringify(await selecionados(pk)))
await L.shot(pk, 'QA083-c-espaco')
await L.end('QA083')
await L.fecharModal(pk)
await L.sleep(1500)
L.saveAll('g3')
await browser.close()
