// QA063 (domiciliar), QA082 (tentativa 409 sem alternativas), QA090, QA091, QA092
import fs from 'node:fs'
import * as L from './lib.mjs'
const contas = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const browser = await L.launch()
const A = await L.newSession(browser, 'SEC-A')
const pa = A.page
const isReservaPost = (r) => r.url().endsWith('/agendamentos/reservas') && r.request().method() === 'POST'
const isCad = (r) => r.url().endsWith('/v1/api/agendamentos') && r.request().method() === 'POST'
await L.login(pa, contas.A.email, contas.A.senha)
await L.irAgendamentos(pa)

// QA063
L.start('QA063')
await L.abrirWizard(pa)
await L.passo1(pa)
{
  const m = L.modal(pa)
  await m.getByPlaceholder('Buscar por serviço, médico ou especialidade…').fill('Consulta de Rotina')
  await L.sleep(1500)
  L.note('servicos "Consulta de Rotina": ' + JSON.stringify((await m.locator('div.max-h-72 button').allInnerTexts()).map((t) => t.replace(/\n/g, ' | '))))
}
await L.passo2(pa, 'Consulta de Rotina')
await L.shot(pa, 'QA063-a-passo3')
await L.passo3(pa, 'Domiciliar')
const s63 = pa.waitForResponse((r) => r.url().includes('/agendamentos/slots'))
await L.escolherDia(pa, '22')
const rs = await s63
L.note('GET slots domiciliar -> ' + rs.status() + ' ' + rs.url())
await L.esperarGrade(pa)
L.note('grade 22/10 domiciliar: ' + JSON.stringify(await L.gradeHorarios(pa)))
let w = pa.waitForResponse(isReservaPost)
await L.slotBtn(pa, '10:00').click()
const r63 = await w
L.note(`POST reservas -> ${r63.status()} requestBody=${r63.request().postData()} body=${await r63.text()}`)
await L.faixaReserva(pa).waitFor()
await L.shot(pa, 'QA063-b-reservado')
await L.modal(pa).getByRole('button', { name: 'Próximo', exact: true }).click()
await pa.getByText('Passo 5 / 5').waitFor()
await L.shot(pa, 'QA063-c-resumo')
w = pa.waitForResponse(isCad)
await L.modal(pa).getByRole('button', { name: /Confirmar/ }).click()
const c63 = await w
L.note(`POST agendamentos -> ${c63.status()} requestBody=${c63.request().postData()} resposta=${(await c63.text()).slice(0, 400)}`)
await L.sleep(3000)
await L.shot(pa, 'QA063-d-lista')
await L.end('QA063')

// QA082 — tentativa de 409 sem alternativas: cliques simultaneos de duas secretarias (trava curta por medico)
L.start('QA082')
const B = await L.newSession(browser, 'SEC-B')
const pb = B.page
await L.login(pb, contas.B.email, contas.B.senha)
await L.irAgendamentos(pb)
await L.wizardAte4(pa); await L.wizardAte4(pb)
const pares = [['11:00', '11:30'], ['12:00', '14:00'], ['15:00', '16:00']]
for (const [ha, hb] of pares) {
  const wa = pa.waitForResponse(isReservaPost), wb = pb.waitForResponse(isReservaPost)
  await Promise.all([L.slotBtn(pa, ha).click({ noWaitAfter: true }), L.slotBtn(pb, hb).click({ noWaitAfter: true })])
  const [ra, rb] = await Promise.all([wa, wb])
  L.note(`simultaneo SEC-A ${ha} -> ${ra.status()} | SEC-B ${hb} -> ${rb.status()}`)
  await L.sleep(1500)
}
// mesmo horario ao mesmo tempo: um deve levar 409 (com alternativas, pois a grade tem outros livres)
{
  const wa = pa.waitForResponse(isReservaPost), wb = pb.waitForResponse(isReservaPost)
  await Promise.all([L.slotBtn(pa, '17:00').click({ noWaitAfter: true }), L.slotBtn(pb, '17:00').click({ noWaitAfter: true })])
  const [ra, rb] = await Promise.all([wa, wb])
  L.note(`mesmo horario 17:00 simultaneo: SEC-A -> ${ra.status()} ${ra.status() === 409 ? await ra.text() : ''} | SEC-B -> ${rb.status()} ${rb.status() === 409 ? await rb.text() : ''}`)
  await L.sleep(1500)
}
for (const [pg, nome] of [[pa, 'A'], [pb, 'B']]) {
  const m = L.modal(pg)
  L.note(`SEC-${nome}: erro=${JSON.stringify(await m.locator('div.text-destructive').allTextContents())} bloco alternativas visivel=${await m.getByText('Horários próximos disponíveis', { exact: true }).isVisible()}`)
}
await L.shot(pa, 'QA082-a-SEC-A')
await L.shot(pb, 'QA082-b-SEC-B')
await L.end('QA082', 'tentativa de obter 409 sem alternativas pela UI')
await L.fecharModal(pa); await L.fecharModal(pb)
await L.sleep(1000)
await B.ctx.close()

// QA090 — listagem e filtros
L.start('QA090')
await pa.reload()
await pa.getByRole('button', { name: 'Novo Agendamento' }).waitFor()
await L.sleep(2000)
const cards = () => pa.locator('div.grid > div').filter({ has: pa.locator('p.font-bold') })
L.note('cards (Todos): ' + await cards().count())
await L.shot(pa, 'QA090-a-todos')
await pa.getByRole('button', { name: 'Pendente', exact: true }).click()
await L.sleep(2000)
L.note('cards (Pendente): ' + await cards().count() + ' badges=' + JSON.stringify([...new Set(await pa.locator('div.grid > div span').filter({ hasText: /^(Pendente|Confirmado|Cancelado|Concluído|Em Andamento|Aguard\. Pagamento|Não Compareceu|A Caminho|Chegou)$/ }).allTextContents())]))
await L.shot(pa, 'QA090-b-pendente')
await pa.getByRole('button', { name: 'Cancelado', exact: true }).click()
await L.sleep(2000)
L.note('cards (Cancelado): ' + await cards().count())
await pa.getByRole('button', { name: 'Todos', exact: true }).click()
await L.sleep(1500)
await pa.getByPlaceholder('CRM ou nome do médico…').fill('Fabio')
await pa.getByRole('button', { name: /Fabio Monteiro Amorim/ }).first().click()
await L.sleep(2000)
L.note('cards (medico Fabio): ' + await cards().count() + ' medicos distintos=' + JSON.stringify([...new Set(await cards().locator('span.truncate').allTextContents())].slice(0, 10)))
await L.shot(pa, 'QA090-c-medico')
await pa.locator('div.rounded-xl').filter({ has: pa.locator('span', { hasText: /^Dr\(a\)\. / }) }).last().locator('button').click()
await L.sleep(1500)
await pa.getByPlaceholder('CPF ou nome do paciente…').fill('Zilma')
await pa.getByRole('button', { name: /Zilma Ruela/ }).first().click()
await L.sleep(2000)
L.note('cards (paciente Zilma): ' + await cards().count() + ' pacientes distintos=' + JSON.stringify([...new Set(await cards().locator('p.font-bold').allTextContents())]))
await L.shot(pa, 'QA090-d-paciente')
await L.end('QA090')

// QA092 — avancar status (Confirmar) do agendamento QA de 21/10 10:00
L.start('QA092')
const card10 = cards().filter({ hasText: '21/10/2026, 10:00' }).filter({ hasText: 'QA Descartavel' }).first()
L.note('card 21/10 10:00 antes: ' + (await card10.innerText()).replace(/\n/g, ' | '))
w = pa.waitForResponse((r) => r.url().includes('/status') && r.request().method() === 'PATCH')
await card10.getByRole('button', { name: 'Confirmar', exact: true }).click()
const st = await w
L.note(`PATCH ${st.url()} -> ${st.status()} requestBody=${st.request().postData()}`)
await L.sleep(2000)
L.note('card depois: ' + (await card10.innerText()).replace(/\n/g, ' | '))
await L.shot(pa, 'QA092')
await L.end('QA092')

// QA091 — cancelar pelo card (14:30 criado no chatbot) e conferir que o horario volta na grade
L.start('QA091')
const card1430 = cards().filter({ hasText: '21/10/2026, 14:30' }).filter({ hasText: 'QA Descartavel' }).first()
L.note('card 14:30: ' + (await card1430.innerText()).replace(/\n/g, ' | '))
await card1430.getByRole('button', { name: /Cancelar/ }).click()
const mc = L.modal(pa)
await mc.getByLabel('Origem').selectOption('ESTABELECIMENTO')
await mc.locator('textarea').fill('Limpeza do QA de conflito de agendamento')
await L.shot(pa, 'QA091-a-modal')
w = pa.waitForResponse((r) => r.url().includes('/cancelar') && r.request().method() === 'PATCH')
await mc.getByRole('button', { name: 'Confirmar Cancelamento' }).click()
const cc = await w
L.note(`PATCH ${cc.url()} -> ${cc.status()} requestBody=${cc.request().postData()}`)
await L.sleep(2000)
await L.shot(pa, 'QA091-b-cancelado')
await L.wizardAte4(pa)
const g91 = await L.gradeHorarios(pa)
L.note('grade 21/10 apos cancelar: ' + JSON.stringify(g91) + ' | contem 14:30? ' + g91.includes('14:30'))
await L.shot(pa, 'QA091-c-grade')
await L.fecharModal(pa)
await L.end('QA091')
L.saveAll('g7')
await browser.close()
