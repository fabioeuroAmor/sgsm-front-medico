// QA001, QA010-QA015, QA060, QA061
import fs from 'node:fs'
import * as L from './lib.mjs'
const contas = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const browser = await L.launch()
const A = await L.newSession(browser, 'SEC-A')
const B = await L.newSession(browser, 'SEC-B')
const pa = A.page, pb = B.page

// QA001
L.start('QA001')
await L.login(pa, contas.A.email, contas.A.senha)
await L.login(pb, contas.B.email, contas.B.senha)
await L.sleep(1500)
await L.shot(pa, 'QA001-a-SEC-A')
await L.shot(pb, 'QA001-b-SEC-B')
L.note('SEC-A url=' + pa.url() + ' / SEC-B url=' + pb.url())
await L.end('QA001')

// QA010
L.start('QA010')
await L.irAgendamentos(pa)
await L.abrirWizard(pa)
await L.passo1(pa)
await L.passo2(pa)
await L.passo3(pa)
// observador de DOM (somente leitura) para registrar se "Carregando horarios…" apareceu
await pa.evaluate(() => {
  window.__qa = { carregando: false, disabledDurante: false }
  new MutationObserver(() => {
    if (document.body.innerText.includes('Carregando horários…')) window.__qa.carregando = true
    const b = document.querySelectorAll('div.grid.grid-cols-3 > button')
    if (b.length && [...b].every((x) => x.disabled)) window.__qa.disabledDurante = true
  }).observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true })
})
const slotsResp = pa.waitForResponse((r) => r.url().includes('/agendamentos/slots'))
await L.escolherDia(pa, '21')
L.note('GET slots status=' + (await slotsResp).status())
await L.esperarGrade(pa)
L.note('"Carregando horários…" observado no DOM: ' + (await pa.evaluate(() => window.__qa.carregando)))
L.note('grade SEC-A: ' + JSON.stringify(await L.gradeHorarios(pa)))
await L.shot(pa, 'QA010')
await L.end('QA010')

// QA011
L.start('QA011')
await pa.evaluate(() => { window.__qa.disabledDurante = false })
const resResp = pa.waitForResponse((r) => r.url().endsWith('/agendamentos/reservas') && r.request().method() === 'POST')
await L.slotBtn(pa, '10:00').click()
const rr = await resResp
L.note('POST reservas status=' + rr.status() + ' body=' + (await rr.text()))
await L.faixaReserva(pa).waitFor({ timeout: 10000 })
L.note('botoes desabilitados durante a requisicao (observado): ' + (await pa.evaluate(() => window.__qa.disabledDurante)))
L.note('classe do botao 10:00: ' + await L.slotBtn(pa, '10:00').getAttribute('class'))
L.note('faixa: ' + await L.faixaReserva(pa).textContent())
await L.shot(pa, 'QA011')
await L.end('QA011')

// QA012
L.start('QA012')
const f1 = await L.faixaReserva(pa).textContent()
await L.shot(pa, 'QA012-a')
const t1 = Date.now()
await L.sleep(5000)
const f2 = await L.faixaReserva(pa).textContent()
await L.shot(pa, 'QA012-b')
L.note(`faixa 1: ${f1} | faixa 2 (${((Date.now() - t1) / 1000).toFixed(1)} s depois): ${f2}`)
await L.end('QA012')

// QA013
L.start('QA013')
await L.modal(pa).getByRole('button', { name: 'Próximo', exact: true }).click()
await pa.getByText('Passo 5 / 5').waitFor()
L.note('resumo: ' + (await L.modal(pa).locator('div.rounded-xl.border.bg-muted\\/50').first().innerText()).replace(/\n/g, ' | '))
L.note('faixa visivel no passo 5: ' + await L.faixaReserva(pa).isVisible())
await L.shot(pa, 'QA013')
await L.end('QA013')

// QA014
L.start('QA014')
const cad = pa.waitForResponse((r) => r.url().endsWith('/v1/api/agendamentos') && r.request().method() === 'POST')
await L.modal(pa).getByRole('button', { name: /Confirmar/ }).click()
const rc = await cad
L.note('POST agendamentos status=' + rc.status() + ' requestBody=' + rc.request().postData())
await pa.getByText('Passo 5 / 5').waitFor({ state: 'detached', timeout: 10000 }).catch(() => L.note('modal NAO fechou'))
await L.sleep(6000)
const cards = await pa.locator('div.grid > div').filter({ hasText: 'Zilma Ruela' }).filter({ hasText: '21/10/2026, 10:00' }).count()
L.note('cards Zilma 21/10/2026 10:00 na lista: ' + cards)
await L.shot(pa, 'QA014')
await L.end('QA014', 'verificar abaixo: nenhum DELETE /reservas apos o 201')

// QA015
L.start('QA015')
await L.wizardAte4(pa)
const g15 = await L.gradeHorarios(pa)
L.note('grade apos agendar: ' + JSON.stringify(g15) + ' | contem 10:00? ' + g15.includes('10:00'))
await L.shot(pa, 'QA015')
await L.end('QA015')
await L.fecharModal(pa)

// QA060
L.start('QA060')
await L.abrirWizard(pa)
await L.passo1(pa)
await L.passo2(pa)
const m = L.modal(pa)
await m.getByRole('button').filter({ hasText: 'Clinica São Lucas' }).first().waitFor()
L.note('estabelecimentos listados no passo 3: ' + JSON.stringify(await m.locator('div.max-h-52 button p.font-semibold').allTextContents()))
await L.shot(pa, 'QA060-a-passo3')
await m.getByRole('button').filter({ hasText: 'Clinica São Lucas' }).first().click()
await m.getByRole('button', { name: 'Próximo', exact: true }).click()
await pa.getByText('Passo 4 / 5').waitFor()
const s60 = pa.waitForResponse((r) => r.url().includes('/agendamentos/slots'))
await L.escolherDia(pa, '21')
L.note('GET slots status=' + (await s60).status())
await L.esperarGrade(pa)
await L.shot(pa, 'QA060-b-grade')
await L.end('QA060')

// QA061 — Clinica Teste Strix nao aparece no passo 3 (ver QA060-a); chamada na mesma sessao
L.start('QA061')
const res61 = await pa.evaluate(async () => {
  const { default: api } = await import('/src/services/api.ts')
  const out = []
  for (const params of [
    { medicoId: 'c00b458a-db4b-491e-bcb6-4cdf046a17ba', estabelecimentoId: '36a7eb52-9c10-4fc6-904e-04d80747217b', data: '2026-10-21' },
    { medicoId: 'ff9a2400-2217-48fa-ac91-b81a4032f2db', estabelecimentoId: '36a7eb52-9c10-4fc6-904e-04d80747217b', data: '2026-10-21' },
  ]) {
    try { const r = await api.get('/agendamentos/slots', { params }); out.push({ params, status: r.status, data: r.data }) }
    catch (e) { out.push({ params, status: e.status, msg: e.message, data: e.data }) }
  }
  return out
})
L.note('resultado (page.evaluate com o axios da app, mesma sessao/token): ' + JSON.stringify(res61))
await L.shot(pa, 'QA061')
await L.end('QA061', 'tecnica: page.evaluate(import("/src/services/api.ts")) -> api.get("/agendamentos/slots", params) — usa o tokenStore em memoria da propria sessao')
await L.fecharModal(pa)
await L.sleep(1500)
L.saveAll('g1')
await browser.close()
