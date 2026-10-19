// RODADA 3 — QA042 variante da rodada 1 (passo 5): remove so o refresh_token e espera o access token (900 s) vencer no passo 4
import fs from 'node:fs'
import * as L from './lib.mjs'
const contas = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const browser = await L.launch()
const S = await L.newSession(browser, 'SEC-A')
const p = S.page
await L.login(p, contas.A.email, contas.A.senha)
await L.irAgendamentos(p)
await L.wizardAte4(p)
L.start('QA042-r3-natural')
await p.evaluate(() => localStorage.removeItem('refresh_token'))
L.note('refresh_token removido; access token em memoria intacto; aguardando o vencimento natural (expiresIn 900 s) sem acao')
await L.shot(p, 'QA042-r3-3-a-passo4-aguardando')
const t0 = Date.now()
const ok = await p.waitForURL('**/login**', { timeout: 20 * 60_000 }).then(() => true).catch(() => false)
await L.sleep(2000)
L.note(`redirecionou=${ok} apos ${((Date.now() - t0) / 1000).toFixed(0)} s | url=${p.url()}`)
L.note('alerta: ' + JSON.stringify(await p.getByRole('alert').allTextContents()) + ' | "Sua sessão expirou" visivel: ' + await p.getByText('Sua sessão expirou. Faça login novamente.').isVisible().catch(() => false))
await L.shot(p, 'QA042-r3-3-b-login')
await L.end('QA042-r3-natural')
L.saveAll('r3-c')
await browser.close()
