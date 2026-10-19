// RODADA 9 — preparacao pela UI: DEV reativa SEC-A em /funcionarios. Sem mock, sem page.route.
import * as L from './lib5.mjs'
import * as C from './r5-common.mjs'
const browser = await L.launch()
const cards = (p, t) => p.locator('div.grid > div').filter({ hasText: t })
try {
  L.start('SETUP-r9')
  const D = await L.newSession(browser, 'DEV')
  const p = D.page
  await L.login(p, C.DEV_EMAIL, C.DEV_SENHA)
  await C.irFuncionarios(p)
  await p.locator('select').nth(1).selectOption('').catch(() => {})
  await L.sleep(1500)
  const ca = cards(p, C.contas.A.email).first()
  L.note(`SEC-A antes: ${(await ca.innerText()).replace(/\n/g, ' | ')}`)
  if ((await ca.innerText()).includes('Inativo')) {
    const w = p.waitForResponse((r) => r.url().includes('/funcionarios/') && r.request().method() !== 'GET')
    await ca.getByRole('button', { name: /Reativar/ }).click()
    const r = await w
    await L.sleep(1500)
    L.note(`reativar SEC-A -> ${r.request().method()} ${r.url()} -> ${r.status()} | toasts=${JSON.stringify(await L.toasts(p))}`)
  }
  L.note(`SEC-A depois: ${(await cards(p, C.contas.A.email).first().innerText()).replace(/\n/g, ' | ')}`)
  await L.shot(p, 'SETUP-r9-a-SEC-A-reativada')
  await D.ctx.close()
  await L.end('SETUP-r9', 'DEV reativa SEC-A em /funcionarios')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally {
  L.saveAll('r9-a')
  await browser.close()
}
