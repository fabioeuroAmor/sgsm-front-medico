import { launch, login, gotoAdministradores, Logger, screenshot, record, saveResults } from './helpers.mjs'

const { browser, page } = await launch(true)
const logger = new Logger()
logger.attach(page)

try {
  await login(page, logger, 'dev-local@sgsm.local', 'Dev088c00c5ba89!Aa')
  await gotoAdministradores(page)
  await page.waitForTimeout(500)
  const wasAuthenticated = page.url().includes('/administradores')
  logger.push(`[INFO] confirmed authenticated on /administradores before logout = ${wasAuthenticated}`)

  const sairBtn = page.locator('button:has-text("Sair"), a:has-text("Sair")').first()
  const sairVisible = await sairBtn.isVisible().catch(() => false)
  logger.push(`[INFO] "Sair" (logout) control found = ${sairVisible}`)
  if (sairVisible) {
    await sairBtn.click()
  } else {
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  }
  await page.waitForTimeout(700)

  await page.goto('http://localhost:3001/administradores', { waitUntil: 'load' })
  await page.waitForTimeout(1000)
  const url = page.url()
  logger.push(`[ASSERT] URL after accessing /administradores post-logout = ${url}`)
  await screenshot(page, 'AD066')

  if (!url.includes('/login')) throw new Error(`Expected redirect to /login after logout, got: ${url}`)
  record('AD066', 'pass')
  console.log('AD066 OK')
} catch (e) {
  record('AD066', 'fail', e.message)
  console.log('AD066 FAIL:', e.message)
  try { await screenshot(page, 'AD066') } catch {}
} finally {
  logger.flush('AD066')
  saveResults('results-fix-ad066.json')
  await browser.close()
}
