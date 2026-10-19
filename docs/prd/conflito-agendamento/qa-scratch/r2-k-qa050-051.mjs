// RODADA 2 — QA050 (backend fora) e QA051 (backend volta). Para em QA050 aguardando "r2-subiu.flag".
import fs from 'node:fs'
import { execSync } from 'node:child_process'
import * as L from './lib.mjs'
const contas = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const FLAG_PARAR = new URL('./r2-parar.flag', import.meta.url)
const FLAG_SUBIU = new URL('./r2-subiu.flag', import.meta.url)
const browser = await L.launch()
const A = await L.newSession(browser, 'SEC-A')
const pa = A.page
const isReservaPost = (r) => r.url().endsWith('/agendamentos/reservas') && r.request().method() === 'POST'
await L.login(pa, contas.A.email, contas.A.senha)
await L.irAgendamentos(pa)
await L.wizardAte4(pa)
const m = L.modal(pa)
const estado = async (rot) => {
  L.note(`${rot} erro: ` + JSON.stringify(await m.locator('div.text-destructive').allTextContents()))
  L.note(`${rot} "Request failed" na tela: ` + await pa.getByText(/Request failed/).count())
  L.note(`${rot} botoes de horario: ` + JSON.stringify(await m.locator('div.grid.grid-cols-3 > button').evaluateAll((bs) => bs.map((b) => !b.disabled)).then((a) => ({ total: a.length, habilitados: a.filter(Boolean).length }))))
  L.note(`${rot} "Carregando horários…" visivel: ` + await m.getByText('Carregando horários…').isVisible())
}

L.start('QA050-r2')
await L.shot(pa, 'QA050-r2-a-passo4')
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
await estado('[clique 09:30]')
await L.shot(pa, 'QA050-r2-b-erro')
// troca de dia com o backend fora (GET /slots tambem falha)
await L.escolherDia(pa, '28')
await L.sleep(3000)
L.note('[troca para o dia 28] mensagens visiveis: ' + JSON.stringify(await m.locator('.text-destructive').allTextContents()) + ' | "Request failed": ' + await pa.getByText(/Request failed/).count())
await L.shot(pa, 'QA050-r2-c-troca-de-dia')
await L.escolherDia(pa, '21')
await L.sleep(2000)
await L.end('QA050-r2')

L.start('QA051-r2')
L.note('aguardando o sgsm subir (r2-subiu.flag)')
while (!fs.existsSync(FLAG_SUBIU)) await L.sleep(2000)
L.note('sgsm de volta; clicando de novo sem recarregar a pagina')
// a troca de dia acima pode ter deixado a grade vazia (GET /slots falhou): seleciona o dia de novo para recarregar
if (!(await L.slotBtn(pa, '09:30').count())) { await L.escolherDia(pa, '28'); await L.sleep(1500); await L.escolherDia(pa, '21'); await L.esperarGrade(pa) }
w = pa.waitForResponse(isReservaPost)
await L.slotBtn(pa, '09:30').click()
const r2 = await w
L.note(`POST reservas -> ${r2.status()} body=${await r2.text()}`)
await L.faixaReserva(pa).waitFor({ timeout: 10000 }).catch(() => {})
L.note('faixa: ' + await L.faixaReserva(pa).textContent().catch(() => 'NAO VISIVEL') + ' | erro: ' + JSON.stringify(await m.locator('div.text-destructive').allTextContents()) + ' | url=' + pa.url())
await L.shot(pa, 'QA051-r2')
await L.fecharModal(pa)
await L.sleep(1500)
await L.end('QA051-r2')
L.saveAll('r2-k')
await browser.close()
