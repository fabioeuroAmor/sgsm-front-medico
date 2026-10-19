// QA050 (backend fora), QA051 (backend volta). O script para em QA050 aguardando o arquivo "subiu.flag".
import fs from 'node:fs'
import { execSync } from 'node:child_process'
import * as L from './lib.mjs'
const contas = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const FLAG_PARAR = new URL('./parar.flag', import.meta.url)
const FLAG_SUBIU = new URL('./subiu.flag', import.meta.url)
const browser = await L.launch()
const A = await L.newSession(browser, 'SEC-A')
const pa = A.page
const isReservaPost = (r) => r.url().endsWith('/agendamentos/reservas') && r.request().method() === 'POST'
await L.login(pa, contas.A.email, contas.A.senha)
await L.irAgendamentos(pa)
await L.wizardAte4(pa)

L.start('QA050')
await L.shot(pa, 'QA050-a-passo4')
fs.writeFileSync(FLAG_PARAR, 'parar')
L.note('sinalizado para parar o sgsm :8095; aguardando porta fechar')
while (true) {
  try { execSync('curl -s -o NUL -m 2 http://localhost:8095/actuator/health', { shell: 'cmd.exe' }); await L.sleep(1000) } catch { break }
}
L.note('sgsm :8095 fora do ar (curl falhou)')
let w = pa.waitForResponse(isReservaPost, { timeout: 60000 })
const t = Date.now()
await L.slotBtn(pa, '09:30').click()
const r = await w
L.note(`POST reservas -> ${r.status()} em ${Date.now() - t} ms body=${await r.text()}`)
await L.sleep(1500)
const m = L.modal(pa)
L.note('erro: ' + JSON.stringify(await m.locator('div.text-destructive').allTextContents()))
L.note('botoes de horario habilitados: ' + JSON.stringify(await m.locator('div.grid.grid-cols-3 > button').evaluateAll((bs) => bs.map((b) => !b.disabled)).then((a) => ({ total: a.length, habilitados: a.filter(Boolean).length }))))
L.note('"Carregando horários…" visivel: ' + await m.getByText('Carregando horários…').isVisible())
await L.shot(pa, 'QA050-b-erro')
await L.end('QA050')

L.start('QA051')
L.note('aguardando o sgsm subir (subiu.flag)')
while (!fs.existsSync(FLAG_SUBIU)) await L.sleep(2000)
L.note('sgsm de volta; clicando de novo sem recarregar a pagina')
w = pa.waitForResponse(isReservaPost)
await L.slotBtn(pa, '09:30').click()
const r2 = await w
L.note(`POST reservas -> ${r2.status()} body=${await r2.text()}`)
await L.faixaReserva(pa).waitFor({ timeout: 10000 }).catch(() => {})
L.note('faixa: ' + await L.faixaReserva(pa).textContent().catch(() => 'NAO VISIVEL') + ' | erro: ' + JSON.stringify(await m.locator('div.text-destructive').allTextContents()))
await L.shot(pa, 'QA051')
await L.end('QA051')
await L.fecharModal(pa)
await L.sleep(1500)
L.saveAll('g6')
await browser.close()
