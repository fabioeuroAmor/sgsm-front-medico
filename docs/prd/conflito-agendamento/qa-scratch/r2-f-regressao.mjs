// RODADA 2 — QA001, QA011, QA021, QA061, QA039 (regressao) e QA063/QA064 (domiciliar visivel e cancelavel pela secretaria)
import fs from 'node:fs'
import * as L from './lib.mjs'
const contas = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const r2 = JSON.parse(fs.readFileSync(new URL('./contas-r2.json', import.meta.url)))
const isReservaPost = (r) => r.url().endsWith('/agendamentos/reservas') && r.request().method() === 'POST'
const isCad = (r) => r.url().endsWith('/v1/api/agendamentos') && r.request().method() === 'POST'
const isLista = (r) => /\/v1\/api\/agendamentos(\?|$)/.test(r.url()) && r.request().method() === 'GET'
const selecionados = (pg) => L.modal(pg).locator('div.grid.grid-cols-3 > button.bg-primary\\/10').allTextContents()
const cards = (pg) => pg.locator('div.grid > div').filter({ has: pg.locator('p.font-bold') })
const browser = await L.launch()
const A = await L.newSession(browser, 'SEC-A')
const B = await L.newSession(browser, 'SEC-B')
const pa = A.page, pb = B.page

// QA001
L.start('QA001-r2')
const i001 = L.LINES.length
await L.login(pa, contas.A.email, contas.A.senha)
await L.sleep(1500)
await L.shot(pa, 'QA001-r2-a-SEC-A')
await L.login(pb, contas.B.email, contas.B.senha)
await L.sleep(1500)
await L.shot(pb, 'QA001-r2-b-SEC-B')
const l001 = L.LINES.slice(i001)
L.note(`SEC-A url=${pa.url()} / SEC-B url=${pb.url()} | respostas 401/403: ${l001.filter((l) => / << 40[13] /.test(l)).length} | CONSOLE.error: ${l001.filter((l) => /CONSOLE\.error/.test(l)).length}`)
await L.end('QA001-r2')

// QA011
await L.irAgendamentos(pa)
L.start('QA011-r2')
await L.wizardAte4(pa)
const disabledObs = pa.evaluate(() => new Promise((res) => {
  const t0 = Date.now()
  const iv = setInterval(() => {
    const bs = [...document.querySelectorAll('div.grid.grid-cols-3 > button')]
    if (bs.length && bs.every((b) => b.disabled)) { clearInterval(iv); res(true) }
    if (Date.now() - t0 > 4000) { clearInterval(iv); res(false) }
  }, 5)
}))
let w = pa.waitForResponse(isReservaPost)
await L.slotBtn(pa, '10:00').click()
let r = await w
L.note(`POST reservas 10:00 -> ${r.status()} body=${await r.text()}`)
L.note('botoes desabilitados durante a requisicao (observado): ' + await disabledObs)
await L.faixaReserva(pa).waitFor()
L.note('faixa: ' + await L.faixaReserva(pa).textContent() + ' | selecionados=' + JSON.stringify(await selecionados(pa)) + ' | classe 10:00=' + await L.slotBtn(pa, '10:00').getAttribute('class'))
await L.shot(pa, 'QA011-r2')
await L.fecharModal(pa)
await L.sleep(1200)
await L.end('QA011-r2')

// QA021
L.start('QA021-r2')
await L.irAgendamentos(pb)
await L.wizardAte4(pa)
await L.wizardAte4(pb)
L.note('grade SEC-B (antes de SEC-A reservar): ' + JSON.stringify(await L.gradeHorarios(pb)))
await L.shot(pb, 'QA021-r2-a-grade-desatualizada-SEC-B')
w = pa.waitForResponse(isReservaPost)
await L.slotBtn(pa, '11:00').click()
L.note('SEC-A POST reservas 11:00 -> ' + (await w).status())
await L.faixaReserva(pa).waitFor()
w = pb.waitForResponse(isReservaPost)
const slotsDepois = pb.waitForResponse((x) => x.url().includes('/agendamentos/slots'), { timeout: 10000 }).catch(() => null)
await L.slotBtn(pb, '11:00').click()
r = await w
L.note('SEC-B POST reservas 11:00 -> ' + r.status() + ' body=' + (await r.text()))
const gs = await slotsDepois
L.note('GET slots apos 409: ' + (gs ? gs.status() + ' ' + gs.url() : 'NAO OCORREU'))
await L.sleep(1500)
let mb = L.modal(pb)
L.note('mensagem de erro: ' + JSON.stringify(await mb.locator('div.text-destructive').allTextContents()))
L.note('alternativas: ' + JSON.stringify(await mb.getByText('Horários próximos disponíveis', { exact: true }).locator('xpath=following-sibling::div//button').allTextContents()))
const g21 = await L.gradeHorarios(pb)
L.note('grade SEC-B apos 409: ' + JSON.stringify(g21) + ' | contem 11:00? ' + g21.includes('11:00') + ' | selecionados=' + JSON.stringify(await selecionados(pb)) + ' | faixa=' + await L.faixaReserva(pb).isVisible())
await L.shot(pb, 'QA021-r2-b-409-alternativas')
await L.fecharModal(pa); await L.fecharModal(pb)
await L.sleep(1200)
await L.end('QA021-r2')

// QA061
L.start('QA061-r2')
const res61 = await pa.evaluate(async () => {
  const { default: api } = await import('/src/services/api.ts')
  const out = []
  for (const [medicoId, estabelecimentoId] of [['c00b458a-db4b-491e-bcb6-4cdf046a17ba', '36a7eb52-9c10-4fc6-904e-04d80747217b'], ['ff9a2400-2217-48fa-ac91-b81a4032f2db', '36a7eb52-9c10-4fc6-904e-04d80747217b']]) {
    try { const r = await api.get('/agendamentos/slots', { params: { medicoId, estabelecimentoId, data: '2026-10-21' } }); out.push({ medicoId, status: r.status, n: r.data.length }) }
    catch (e) { out.push({ medicoId, status: e.status, msg: e.message }) }
  }
  return out
})
L.note('chamadas na sessao SEC-A: ' + JSON.stringify(res61))
await L.shot(pa, 'QA061-r2')
await L.end('QA061-r2')

// QA039
L.start('QA039-r2')
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
  const rr = await ww
  L.note(`aba ${t + 1} POST ${hor[t]} -> ${rr.status()} ${t === 3 ? 'body=' + (await rr.text()) : ''}`)
  await L.sleep(1000)
  if (t === 3) await L.shot(pg, 'QA039-r2')
}
const m4 = L.modal(tabs[3])
L.note('aba 4: erro=' + JSON.stringify(await m4.locator('div.text-destructive').allTextContents()) + ' selecionados=' + JSON.stringify(await selecionados(tabs[3])) + ' faixa=' + await L.faixaReserva(tabs[3]).isVisible() + ' | contem "Request failed": ' + await m4.getByText(/Request failed/).count())
for (let t = 0; t < 4; t++) { await tabs[t].bringToFront(); await L.fecharModal(tabs[t]); await L.sleep(800) }
for (let t = 1; t < 4; t++) await tabs[t].close()
await L.end('QA039-r2')

// QA063 — domiciliar do Fabio por SEC-A (Consulta de Rotina, 22/10 10:00)
await pa.bringToFront()
L.start('QA063-r2')
await L.abrirWizard(pa)
await L.passo1(pa)
await L.passo2(pa, 'Consulta de Rotina')
await L.passo3(pa, 'Domiciliar')
const s63 = pa.waitForResponse((x) => x.url().includes('/agendamentos/slots'))
await L.escolherDia(pa, '22')
L.note('GET slots domiciliar -> ' + (await s63).status())
await L.esperarGrade(pa)
w = pa.waitForResponse(isReservaPost)
await L.slotBtn(pa, '10:00').click()
r = await w
L.note(`POST reservas -> ${r.status()} body=${await r.text()}`)
await L.faixaReserva(pa).waitFor()
await L.modal(pa).getByRole('button', { name: 'Próximo', exact: true }).click()
await pa.getByText('Passo 5 / 5').waitFor()
w = pa.waitForResponse(isCad)
const lista63 = pa.waitForResponse(isLista, { timeout: 15000 }).catch(() => null)
await L.modal(pa).getByRole('button', { name: /Confirmar/ }).click()
r = await w
const ag63 = await r.json()
L.note(`POST agendamentos -> ${r.status()} id=${ag63.id} tipo=${ag63.tipo} reservaToken no corpo=${/reservaToken/.test(r.request().postData())}`)
r2.qa063 = ag63.id
fs.writeFileSync(new URL('./contas-r2.json', import.meta.url), JSON.stringify(r2, null, 2))
const l63 = await lista63
await L.sleep(2500)
await L.shot(pa, 'QA063-r2')
await L.end('QA063-r2')

// QA064 — aparece na lista da SEC-A, cancelavel pelo card; domiciliar do medico de fora nao aparece
L.start('QA064-r2')
const wl = pa.waitForResponse(isLista)
await pa.reload()
await pa.getByRole('button', { name: 'Novo Agendamento' }).waitFor()
const rl = await wl
const corpo = await rl.json()
const arr = Array.isArray(corpo) ? corpo : (corpo.content ?? [])
const dom = arr.filter((a) => a.tipo === 'DOMICILIAR')
L.note(`GET ${rl.url()} -> ${rl.status()} total=${arr.length} | DOMICILIAR=${JSON.stringify(dom.map((a) => ({ id: a.id, medico: a.medicoNome, quando: a.dataHoraInicio, status: a.status })))}`)
L.note(`contem o domiciliar criado por SEC-A (${ag63.id}): ${arr.some((a) => a.id === ag63.id)} | contem o domiciliar do medico de fora (${r2.medicoFora.agendamentoId}): ${arr.some((a) => a.id === r2.medicoFora.agendamentoId)} | algum card do medico de fora: ${arr.some((a) => a.medicoId === r2.medicoFora.id)}`)
await L.sleep(1500)
const card = cards(pa).filter({ hasText: 'Consulta de Rotina' }).filter({ hasText: '22/10/2026, 10:00' }).filter({ has: pa.getByRole('button', { name: /Cancelar/ }) }).first()
L.note('card do domiciliar na tela da SEC-A: ' + ((await card.count()) ? (await card.innerText()).replace(/\n/g, ' | ') : 'NAO ENCONTRADO'))
L.note('cards "QA Medico Fora"/"QA Domiciliar Fora" na tela: ' + await cards(pa).filter({ hasText: /QA Medico Fora|QA Domiciliar Fora/ }).count())
await card.scrollIntoViewIfNeeded().catch(() => {})
await L.shot(pa, 'QA064-r2-e-lista-SEC-A')
await card.getByRole('button', { name: /Cancelar/ }).click()
const mc = L.modal(pa)
await mc.getByLabel('Origem').selectOption('ESTABELECIMENTO')
await mc.locator('textarea').fill('QA rodada 2 - domiciliar cancelado pela secretaria')
w = pa.waitForResponse((x) => x.url().includes('/cancelar') && x.request().method() === 'PATCH')
await mc.getByRole('button', { name: 'Confirmar Cancelamento' }).click()
r = await w
L.note(`PATCH ${r.url()} -> ${r.status()}`)
await L.sleep(2000)
const cardDepois = cards(pa).filter({ hasText: 'Consulta de Rotina' }).filter({ hasText: '22/10/2026, 10:00' }).first()
L.note('card apos cancelar: ' + ((await cardDepois.count()) ? (await cardDepois.innerText()).replace(/\n/g, ' | ') : 'NAO ENCONTRADO'))
await cardDepois.scrollIntoViewIfNeeded().catch(() => {})
await L.shot(pa, 'QA064-r2-f-cancelado')
await L.end('QA064-r2')
L.saveAll('r2-f')
await browser.close()
