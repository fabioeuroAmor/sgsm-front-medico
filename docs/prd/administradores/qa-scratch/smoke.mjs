import { launch, login, gotoAdministradores, Logger, screenshot } from './helpers.mjs'

const { browser, page } = await launch(true)
const logger = new Logger()
logger.attach(page)

try {
  await login(page, logger, 'dev-local@sgsm.local', 'Dev088c00c5ba89!Aa')
  console.log('LOGIN OK, url=', page.url())
  await gotoAdministradores(page)
  console.log('ADM URL=', page.url())
  await page.waitForTimeout(1000)
  await screenshot(page, 'SMOKE')
  const bodyText = await page.locator('body').innerText()
  console.log('BODY SNIPPET:', bodyText.slice(0, 800))
} catch (e) {
  console.error('ERROR', e)
} finally {
  logger.flushAll('SMOKE')
  await browser.close()
}
