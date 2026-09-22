import { launch, login, gotoAdministradores, Logger, screenshot, record, saveResults, genValidCPF } from './helpers.mjs'

const { browser, page } = await launch(true)
const logger = new Logger()
logger.attach(page)

try {
  await login(page, logger, 'dev-local@sgsm.local', 'Dev088c00c5ba89!Aa')
  await gotoAdministradores(page)
  await page.waitForTimeout(500)

  await page.route('**/v1/api/administradores', async (route) => {
    if (route.request().method() === 'POST') {
      await new Promise((r) => setTimeout(r, 3000))
      await route.continue()
    } else {
      await route.continue()
    }
  })
  await page.getByRole('button', { name: /Novo Administrador/ }).click()
  await page.locator('h2').filter({ hasText: 'Novo Administrador' }).waitFor({ state: 'visible' })
  await page.getByLabel('Nome *').fill('Teste Rede Lenta 3')
  await page.getByLabel('CPF *').type(genValidCPF(Date.now() % 90000 + 33), { delay: 5 })
  await page.getByLabel('E-mail *').fill(`qa-slow3-${Date.now()}@teste.local`)
  await page.getByLabel('Senha de acesso *').fill('SenhaValida123')

  // positional locator: modal footer's last button, independent of its (changing) text
  const footerLastBtn = page.locator('.border-t.border-border button').last()
  const preClickText = await footerLastBtn.innerText()
  logger.push(`[INFO] button text before click = "${preClickText}"`)
  await footerLastBtn.click()
  await page.waitForTimeout(600)
  const midText = await footerLastBtn.innerText()
  const midDisabled = await footerLastBtn.isDisabled()
  logger.push(`[ASSERT] mid-flight (t=600ms of ~3000ms delay) button text="${midText}" disabled=${midDisabled}`)
  await screenshot(page, 'AD068')
  await page.waitForTimeout(3200)
  await page.unroute('**/v1/api/administradores')
  const modalGoneNow = !(await page.locator('h2').filter({ hasText: 'Novo Administrador' }).isVisible().catch(() => false))
  const cardVisible = await page.locator('h3:has-text("Teste Rede Lenta 3")').isVisible().catch(() => false)
  logger.push(`[ASSERT] eventually resolved: modal closed=${modalGoneNow}, new card visible=${cardVisible}`)

  if (midText.trim() !== 'Salvando…') throw new Error(`Expected "Salvando…" text mid-flight, got "${midText}"`)
  if (!midDisabled) throw new Error('Salvar button not disabled during slow request')
  if (!modalGoneNow || !cardVisible) throw new Error('Save never completed / UI never recovered after slow request')

  record('AD068', 'pass')
  console.log('AD068 OK')
} catch (e) {
  record('AD068', 'fail', e.message)
  console.log('AD068 FAIL:', e.message)
  try { await screenshot(page, 'AD068') } catch {}
} finally {
  logger.flush('AD068')
  saveResults('results-fix-ad068-v2.json')
  await browser.close()
}
