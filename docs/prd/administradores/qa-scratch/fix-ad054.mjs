import { launch, login, gotoAdministradores, Logger, screenshot, record, saveResults } from './helpers.mjs'

const { browser, page } = await launch(true)
const logger = new Logger()
logger.attach(page)

function cardFor(nome) { return page.locator('div.rounded-2xl').filter({ hasText: nome }) }

try {
  await login(page, logger, 'dev-local@sgsm.local', 'Dev088c00c5ba89!Aa')
  await gotoAdministradores(page)
  await page.waitForTimeout(500)

  await page.route('**/v1/api/administradores/*/estabelecimentos', async (route) => {
    await new Promise((r) => setTimeout(r, 900))
    await route.continue()
  })
  await cardFor('Ana Beatriz Souza Silva').locator('button').nth(1).click()
  await page.waitForTimeout(200)
  const spinnerVisible = await page.locator('.animate-spin').first().isVisible().catch(() => false)
  logger.push(`[ASSERT] spinner visible right after opening modal = ${spinnerVisible}`)
  await screenshot(page, 'AD054') // <-- captured HERE, mid-spinner
  await page.waitForSelector('h2:has-text("Estabelecimentos")', { timeout: 5000 })
  await page.waitForTimeout(900)
  await page.unroute('**/v1/api/administradores/*/estabelecimentos')

  if (!spinnerVisible) throw new Error('Spinner not observed when opening estabelecimentos modal')
  record('AD054', 'pass')
  console.log('AD054 OK')
  await page.getByRole('button', { name: 'Cancelar' }).click()
} catch (e) {
  record('AD054', 'fail', e.message)
  console.log('AD054 FAIL:', e.message)
  try { await screenshot(page, 'AD054') } catch {}
} finally {
  logger.flush('AD054')
  saveResults('results-fix-ad054.json')
  await browser.close()
}
