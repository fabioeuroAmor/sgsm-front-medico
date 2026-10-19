// QA042 (complementar) — expiracao natural: remove so o refresh_token e espera o access token (900 s) vencer
import fs from 'node:fs'
import * as L from './lib.mjs'
const contas = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const browser = await L.launch()
const A = await L.newSession(browser, 'SEC-A')
const pa = A.page
await L.login(pa, contas.A.email, contas.A.senha)
const tLogin = Date.now()
await L.irAgendamentos(pa)
L.start('QA042-b')
await L.wizardAte4(pa)
await pa.evaluate(() => localStorage.removeItem('refresh_token'))
L.note('refresh_token removido do localStorage; access token (expiresIn 900 s) mantido em memoria; aguardando expirar')
await L.shot(pa, 'QA042-c-passo4-aguardando')
let clicou = false
while (Date.now() - tLogin < 17 * 60_000) {
  if (pa.url().includes('/login')) break
  if (!clicou && Date.now() - tLogin > 15.3 * 60_000) {
    clicou = true
    L.note('clicando em 09:30 apos o vencimento do access token')
    await L.slotBtn(pa, '09:30').click({ timeout: 3000 }).catch((e) => L.note('clique: ' + e.message.split('\n')[0]))
    await L.sleep(4000)
    continue
  }
  await L.sleep(3000)
}
await L.sleep(2000)
L.note('url final: ' + pa.url() + ' | textos "sess": ' + JSON.stringify(await pa.getByText(/sess[aã]o/i).allTextContents()) + ' | toasts=' + JSON.stringify(await pa.locator('[data-sonner-toast]').allTextContents()))
await L.shot(pa, 'QA042-d-final')
await L.end('QA042-b')
await browser.close()
