import { launch, login, gotoAdministradores, Logger, screenshot, record, saveResults } from './helpers.mjs'

const { browser, page } = await launch(true)
const logger = new Logger()
logger.attach(page)

function modalTitle(title) {
  return page.locator('h2').filter({ hasText: title })
}

try {
  await login(page, logger, 'dev-local@sgsm.local', 'Dev088c00c5ba89!Aa')
  await gotoAdministradores(page)
  await page.waitForTimeout(500)
  const countBefore = await page.locator('div.rounded-2xl').filter({ has: page.locator('h3') }).count()

  await page.getByRole('button', { name: /Novo Administrador/ }).click()
  await modalTitle('Novo Administrador').waitFor({ state: 'visible' })
  await page.getByLabel('Nome *').fill('Descartar Este Rascunho')
  await page.getByRole('button', { name: 'Cancelar' }).click()
  await page.waitForTimeout(400)

  const modalStillVisible = await modalTitle('Novo Administrador').isVisible().catch(() => false)
  const countAfter = await page.locator('div.rounded-2xl').filter({ has: page.locator('h3') }).count()
  const discardedCardExists = await page.locator('h3:has-text("Descartar Este Rascunho")').isVisible().catch(() => false)
  logger.push(`[ASSERT] modal closed = ${!modalStillVisible}`)
  logger.push(`[ASSERT] card count before=${countBefore} after=${countAfter} (should be equal)`)
  logger.push(`[ASSERT] no card with discarded draft name created = ${!discardedCardExists}`)
  await screenshot(page, 'AD041')

  if (modalStillVisible) throw new Error('Modal did not close on Cancelar')
  if (countBefore !== countAfter) throw new Error(`Admin count changed after Cancelar: ${countBefore} -> ${countAfter}`)
  if (discardedCardExists) throw new Error('Draft data was persisted despite Cancelar')

  record('AD041', 'pass')
  console.log('AD041 OK')
} catch (e) {
  record('AD041', 'fail', e.message)
  console.log('AD041 FAIL:', e.message)
  try { await screenshot(page, 'AD041') } catch {}
} finally {
  logger.flush('AD041')
  saveResults('results-fix-ad041.json')
  await browser.close()
}
