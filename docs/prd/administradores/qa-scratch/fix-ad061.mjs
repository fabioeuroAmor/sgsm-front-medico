import { launch, login, gotoAdministradores, Logger, screenshot, record, saveResults } from './helpers.mjs'

const { browser, page } = await launch(true)
const logger = new Logger()
logger.attach(page)

function cardFor(nome) { return page.locator('div.rounded-2xl').filter({ hasText: nome }) }

try {
  await login(page, logger, 'dev-local@sgsm.local', 'Dev088c00c5ba89!Aa')
  await gotoAdministradores(page)
  await page.waitForTimeout(500)

  await page.route('**/v1/api/estabelecimentos*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    } else {
      await route.continue()
    }
  })
  await cardFor('Ana Beatriz Souza Silva').locator('button').nth(1).click()
  await page.waitForSelector('h2:has-text("Estabelecimentos")')
  await page.waitForTimeout(500)
  const msgVisible = await page.locator('text=Nenhum estabelecimento ativo cadastrado.').isVisible().catch(() => false)
  logger.push(`[ASSERT] "Nenhum estabelecimento ativo cadastrado." shown = ${msgVisible}`)
  await screenshot(page, 'AD061') // <-- captured HERE, while modal+message visible
  await page.unroute('**/v1/api/estabelecimentos*')

  if (!msgVisible) throw new Error('Empty-establishments message not shown')
  record('AD061', 'pass')
  console.log('AD061 OK')

  await page.getByRole('button', { name: 'Cancelar' }).click()
} catch (e) {
  record('AD061', 'fail', e.message)
  console.log('AD061 FAIL:', e.message)
  try { await screenshot(page, 'AD061') } catch {}
} finally {
  logger.flush('AD061')
  saveResults('results-fix-ad061.json')
  await browser.close()
}
