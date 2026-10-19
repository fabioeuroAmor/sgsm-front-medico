// QA038 — limite de 30 min de reserva: renovar ate o botao "Mais tempo" sumir (SEC-B, 21/10 17:30)
import fs from 'node:fs'
import * as L from './lib.mjs'
const contas = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const SLOT = process.argv[2] || '17:30'

const browser = await L.launch()
const s = await L.newSession(browser, 'SEC-B')
const p = s.page
L.start('QA038')
await L.login(p, contas.B.email, contas.B.senha)
await L.irAgendamentos(p)
await L.wizardAte4(p)
L.note('grade: ' + JSON.stringify(await L.gradeHorarios(p)))
await L.slotBtn(p, SLOT).click()
await L.faixaReserva(p).waitFor({ timeout: 15000 })
const t0 = Date.now()
L.note(`reserva ${SLOT} criada; faixa: ` + await L.faixaReserva(p).textContent())
await L.shot(p, 'QA038-a-reserva-criada')

const mais = () => L.modal(p).getByRole('button', { name: 'Mais tempo' })
let renovacoes = 0
let sumiuEm = null
while (Date.now() - t0 < 31 * 60_000) {
  await L.sleep(5000)
  const faixa = await L.faixaReserva(p).textContent().catch(() => null)
  const temBotao = await mais().isVisible().catch(() => false)
  const min = ((Date.now() - t0) / 60000).toFixed(2)
  if (!faixa) { L.note(`t=${min}min faixa sumiu`); break }
  const m = faixa.match(/(\d\d):(\d\d)/)
  const restante = m ? Number(m[1]) * 60 + Number(m[2]) : 999
  if (!temBotao) {
    if (!sumiuEm) {
      sumiuEm = Date.now()
      L.note(`t=${min}min BOTAO "Mais tempo" NAO VISIVEL; faixa: ${faixa}`)
      await L.shot(p, 'QA038-c-sem-botao')
    }
    if (Date.now() - sumiuEm > 4 * 60_000) break
    continue
  }
  if (restante < 150) {
    const resp = p.waitForResponse((r) => r.url().includes('/renovar'))
    await mais().click()
    const r = await resp
    renovacoes++
    await L.sleep(1200)
    L.note(`t=${min}min renovacao #${renovacoes} -> ${r.status()}; faixa agora: ${await L.faixaReserva(p).textContent().catch(() => '-')}; botao visivel=${await mais().isVisible().catch(() => false)}`)
    await L.shot(p, `QA038-b-renovacao-${renovacoes}`)
  }
}
await L.shot(p, 'QA038-d-final')
L.note(`renovacoes=${renovacoes}; botao sumiu ${sumiuEm ? ((sumiuEm - t0) / 60000).toFixed(2) + ' min apos criacao' : 'NAO sumiu'}`)
await L.end('QA038')
// libera: fecha o wizard
await L.fecharModal(p).catch(() => {})
await L.sleep(2000)
L.saveAll('qa038')
await browser.close()
