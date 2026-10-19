// RODADA 2 — QA082: medico de QA com UM unico horario (sexta 08:00-08:30). SEC-B abre a grade antes; SEC-A reserva; SEC-B clica -> 409 sem alternativas
import fs from 'node:fs'
import * as L from './lib.mjs'
const contas = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const isReservaPost = (r) => r.url().endsWith('/agendamentos/reservas') && r.request().method() === 'POST'
const browser = await L.launch()
const A = await L.newSession(browser, 'SEC-A')
const B = await L.newSession(browser, 'SEC-B')
const pa = A.page, pb = B.page
await L.login(pa, contas.A.email, contas.A.senha)
await L.login(pb, contas.B.email, contas.B.senha)
await L.irAgendamentos(pa); await L.irAgendamentos(pb)

async function ate4(pg) {
  await L.abrirWizard(pg)
  await L.passo1(pg)
  const m = L.modal(pg)
  await m.getByPlaceholder('Buscar por serviço, médico ou especialidade…').fill('QA Unico Horario')
  await m.getByRole('button').filter({ hasText: 'QA Unico Horario' }).first().click()
  await m.getByRole('button', { name: 'Próximo', exact: true }).click()
  await pg.getByText('Passo 3 / 5').waitFor()
  await L.passo3(pg, 'Presencial', 'Clinica São Lucas')
  await L.escolherDia(pg, '23')
  await L.esperarGrade(pg)
}
L.start('QA082-r2')
await ate4(pb)
L.note('grade SEC-B 23/10 (aberta antes): ' + JSON.stringify(await L.gradeHorarios(pb)))
await L.shot(pb, 'QA082-r2-a-SEC-B-grade-antes')
await ate4(pa)
L.note('grade SEC-A 23/10: ' + JSON.stringify(await L.gradeHorarios(pa)))
let w = pa.waitForResponse(isReservaPost)
await L.slotBtn(pa, '08:00').click()
let r = await w
L.note(`SEC-A POST reservas 08:00 -> ${r.status()} body=${await r.text()}`)
await L.faixaReserva(pa).waitFor()
await L.shot(pa, 'QA082-r2-b-SEC-A-reservou')
await pb.bringToFront()
w = pb.waitForResponse(isReservaPost)
await L.slotBtn(pb, '08:00').click()
r = await w
L.note(`SEC-B POST reservas 08:00 -> ${r.status()} body=${await r.text()}`)
await L.sleep(1800)
const m = L.modal(pb)
L.note('SEC-B mensagem de erro: ' + JSON.stringify(await m.locator('div.text-destructive').allTextContents()))
L.note('SEC-B bloco "Horários próximos disponíveis" no DOM: ' + await m.getByText('Horários próximos disponíveis', { exact: true }).count())
L.note('SEC-B grade apos 409: ' + JSON.stringify(await L.gradeHorarios(pb)) + ' | "Sem horários disponíveis nesta data" visivel: ' + await m.getByText(/Sem horários disponíveis/).isVisible().catch(() => false))
await L.shot(pb, 'QA082-r2-c-SEC-B-409-sem-alternativas')
await L.fecharModal(pb)
await pa.bringToFront()
const del = pa.waitForResponse((x) => x.request().method() === 'DELETE' && x.url().includes('/reservas/'), { timeout: 8000 }).catch(() => null)
await L.fecharModal(pa)
const d = await del
L.note('SEC-A fechou o modal: DELETE ' + (d ? d.status() : 'nao observado'))
await L.end('QA082-r2')
L.saveAll('r2-g')
await browser.close()
