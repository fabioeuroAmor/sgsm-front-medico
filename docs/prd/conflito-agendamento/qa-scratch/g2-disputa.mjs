// QA020-QA025 — disputa entre duas secretarias
import fs from 'node:fs'
import * as L from './lib.mjs'
const contas = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const browser = await L.launch()
const A = await L.newSession(browser, 'SEC-A')
const B = await L.newSession(browser, 'SEC-B')
const pa = A.page, pb = B.page

const focoLog = async (pg) => pg.evaluate(() => window.addEventListener('focus', () => console.log('QA-observador: evento window focus ' + new Date().toISOString())))

await L.login(pa, contas.A.email, contas.A.senha)
await L.login(pb, contas.B.email, contas.B.senha)
await L.irAgendamentos(pa); await L.irAgendamentos(pb)
// SEC-B abre a grade ANTES (ficara desatualizada) — QA021
L.start('QA021')
L.start('QA020')
await L.wizardAte4(pa) // SEC-A ja no passo 4, ainda sem reservar
await L.wizardAte4(pb)
await focoLog(pb)
L.note('grade SEC-B (antes de SEC-A reservar): ' + JSON.stringify(await L.gradeHorarios(pb)))
await L.shot(pb, 'QA021-a-grade-desatualizada-SEC-B')
// SEC-A reserva 11:00 — QA020 comeca aqui
const r11 = pa.waitForResponse((r) => r.url().endsWith('/agendamentos/reservas') && r.request().method() === 'POST')
await L.slotBtn(pa, '11:00').click()
L.note('SEC-A POST reservas 11:00 -> ' + (await r11).status())
await L.faixaReserva(pa).waitFor()
await L.shot(pa, 'QA020-a-SEC-A-reservou-11h')
// SEC-B clica 11:00 na grade desatualizada
const r409 = pb.waitForResponse((r) => r.url().endsWith('/agendamentos/reservas') && r.request().method() === 'POST')
const slotsDepois = pb.waitForResponse((r) => r.url().includes('/agendamentos/slots'), { timeout: 10000 }).catch(() => null)
await L.slotBtn(pb, '11:00').click()
const x = await r409
L.note('SEC-B POST reservas 11:00 -> ' + x.status() + ' body=' + (await x.text()))
const gs = await slotsDepois
L.note('GET slots apos 409: ' + (gs ? gs.status() + ' ' + gs.url() : 'NAO OCORREU'))
await L.sleep(1500)
const mb = L.modal(pb)
L.note('mensagem de erro: ' + JSON.stringify(await mb.locator('div.text-destructive').allTextContents()))
L.note('alternativas: ' + JSON.stringify(await mb.getByText('Horários próximos disponíveis').locator('xpath=following-sibling::div//button').allTextContents()))
L.note('grade SEC-B apos 409: ' + JSON.stringify(await L.gradeHorarios(pb)))
L.note('botoes selecionados (bg-primary/10) na grade: ' + await mb.locator('div.grid.grid-cols-3 > button.bg-primary\\/10').count())
L.note('faixa de reserva visivel: ' + await L.faixaReserva(pb).isVisible())
await L.shot(pb, 'QA021-b-409-alternativas')
await L.end('QA021')

// QA022 — escolher alternativa
L.start('QA022')
const alt = mb.getByText('Horários próximos disponíveis').locator('xpath=following-sibling::div//button').first()
const altTxt = await alt.textContent()
const r22 = pb.waitForResponse((r) => r.url().endsWith('/agendamentos/reservas') && r.request().method() === 'POST')
await alt.click()
const y = await r22
L.note(`alternativa clicada "${altTxt}" -> POST ${y.status()} body=${await y.text()} requestBody=${y.request().postData()}`)
await L.faixaReserva(pb).waitFor({ timeout: 10000 }).catch(() => {})
await L.sleep(800)
L.note('faixa: ' + await L.faixaReserva(pb).textContent().catch(() => 'NAO VISIVEL'))
L.note('bloco alternativas visivel: ' + await mb.getByText('Horários próximos disponíveis').isVisible())
L.note('erro visivel: ' + JSON.stringify(await mb.locator('div.text-destructive').allTextContents()))
L.note('selecionado: ' + JSON.stringify(await mb.locator('div.grid.grid-cols-3 > button.bg-primary\\/10').allTextContents()))
await L.shot(pb, 'QA022')
await L.end('QA022')

// QA020 — SEC-B abre a grade (outra aba do mesmo contexto) depois da reserva de SEC-A
const pb2 = await B.ctx.newPage()
await pb2.goto(L.BASE + '/agendamentos')
await pb2.getByRole('button', { name: 'Novo Agendamento' }).waitFor()
await L.wizardAte4(pb2)
const g20 = await L.gradeHorarios(pb2)
L.note('grade SEC-B (nova aba, apos reserva de SEC-A): ' + JSON.stringify(g20) + ' | contem 11:00? ' + g20.includes('11:00'))
await L.shot(pb2, 'QA020-b-SEC-B-sem-11h')
await L.fecharModal(pb2)
await L.end('QA020')
await pb2.close()

// QA023 — SEC-B parada; SEC-A (2a aba) reserva 14:00
L.start('QA023')
await pb.bringToFront()
await L.shot(pb, 'QA023-a-SEC-B-antes')
L.note('grade SEC-B antes: ' + JSON.stringify(await L.gradeHorarios(pb)))
const pa2 = await A.ctx.newPage()
await pa2.goto(L.BASE + '/agendamentos')
await pa2.getByRole('button', { name: 'Novo Agendamento' }).waitFor()
await L.wizardAte4(pa2)
const r14 = pa2.waitForResponse((r) => r.url().endsWith('/agendamentos/reservas') && r.request().method() === 'POST')
await L.slotBtn(pa2, '14:00').click()
L.note('SEC-A (aba 2) POST reservas 14:00 -> ' + (await r14).status())
const tReserva = Date.now()
let sumiu = null
while (Date.now() - tReserva < 40000) {
  const g = await L.gradeHorarios(pb)
  if (!g.includes('14:00')) { sumiu = Date.now(); break }
  await L.sleep(1000)
}
L.note('14:00 sumiu da grade de SEC-B ' + (sumiu ? `apos ${((sumiu - tReserva) / 1000).toFixed(1)} s sem acao de SEC-B` : 'NAO sumiu em 40 s'))
await L.shot(pb, 'QA023-b-SEC-B-depois')
await L.end('QA023', 'conferir GET /slots periodico de SEC-B (intervalo 30 s) e os eventos de foco registrados pelo observador')
// libera 14:00
await L.fecharModal(pa2)
await L.sleep(1000)

// QA024 — foco
L.start('QA024')
const outra = await B.ctx.newPage()
await outra.goto(L.BASE + '/pacientes')
await outra.bringToFront()
await L.sleep(2000)
const focoGet = pb.waitForResponse((r) => r.url().includes('/agendamentos/slots'), { timeout: 10000 }).catch(() => null)
const tFoco = Date.now()
await pb.bringToFront()
const fg = await focoGet
L.note('GET slots apos voltar para a aba: ' + (fg ? `${fg.status()} em ${((Date.now() - tFoco) / 1000).toFixed(2)} s` : 'NAO OCORREU em 10 s'))
await L.shot(pb, 'QA024')
await L.end('QA024', 'bringToFront na outra aba e depois na aba do wizard (janela visivel, headed)')
await outra.close()

// QA025 — SEC-A fecha o wizard com 11:00 reservado
L.start('QA025')
await pa.bringToFront()
const del = pa.waitForResponse((r) => r.url().includes('/agendamentos/reservas/') && r.request().method() === 'DELETE')
await L.fecharModal(pa)
const d = await del
L.note('SEC-A DELETE ' + d.url() + ' -> ' + d.status())
await L.shot(pa, 'QA025-a-SEC-A-fechou')
await pb.bringToFront()
const t25 = Date.now()
let voltou = null
while (Date.now() - t25 < 40000) {
  if ((await L.gradeHorarios(pb)).includes('11:00')) { voltou = Date.now(); break }
  await L.sleep(1000)
}
L.note('11:00 voltou na grade de SEC-B: ' + (voltou ? `apos ${((voltou - t25) / 1000).toFixed(1)} s` : 'NAO em 40 s'))
await L.shot(pb, 'QA025-b-SEC-B-11h-voltou')
await L.end('QA025')
// libera reserva de SEC-B
await L.fecharModal(pb)
await L.sleep(1500)
L.saveAll('g2')
await browser.close()
