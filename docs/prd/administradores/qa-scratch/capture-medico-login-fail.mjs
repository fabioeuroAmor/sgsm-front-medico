import { launch, Logger, screenshot } from './helpers.mjs'

const { browser, page } = await launch(true)
const logger = new Logger()
logger.attach(page)

await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle' })
await page.getByLabel('E-mail').fill('fabioeuro@gmail.com')
await page.getByLabel('Senha').fill('famor966')
await page.getByRole('button', { name: /Entrar/ }).click()
await page.waitForTimeout(1500)
await screenshot(page, 'AD063')
logger.flushAll('AD063')
console.log('done, url=', page.url())
await browser.close()
