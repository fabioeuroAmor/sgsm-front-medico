import { launch, login, gotoAdministradores, Logger, screenshot, record, saveResults } from './helpers.mjs'

const { browser, page } = await launch(true)
const logger = new Logger()
logger.attach(page)

async function step(id, fn) {
  try {
    await fn()
    record(id, 'pass')
    console.log(`${id} OK`)
  } catch (e) {
    record(id, 'fail', e.message)
    console.log(`${id} FAIL: ${e.message}`)
  }
  logger.flush(id)
}

try {
  await login(page, logger, 'dev-local@sgsm.local', 'Dev088c00c5ba89!Aa')
  logger.flush('LOGIN')

  // AD002: empty listing -> EmptyState (DB confirmed empty at session start)
  await step('AD002', async () => {
    await gotoAdministradores(page)
    await page.waitForSelector('text=Nenhum resultado encontrado', { timeout: 8000 })
    await screenshot(page, 'AD002')
  })

  // AD005: hero title + button
  await step('AD005', async () => {
    await page.waitForSelector('h1:has-text("Administradores")')
    await page.waitForSelector('button:has-text("Novo Administrador")')
    await screenshot(page, 'AD005')
  })

  // AD001: spinner then grid/emptystate - reload with artificial delay on the GET
  await step('AD001', async () => {
    await page.route('**/v1/api/administradores*', async (route) => {
      await new Promise((r) => setTimeout(r, 900))
      await route.continue()
    })
    const navPromise = page.goto('http://localhost:3001/administradores', { waitUntil: 'commit' })
    await navPromise
    // try to catch the spinner mid-flight
    await page.waitForTimeout(200)
    const spinnerVisible = await page.locator('.animate-spin').first().isVisible().catch(() => false)
    await screenshot(page, 'AD001')
    logger.push(`[ASSERT] spinner visible during load = ${spinnerVisible}`)
    await page.waitForSelector('text=Nenhum resultado encontrado', { timeout: 8000 })
    await page.unroute('**/v1/api/administradores*')
    if (!spinnerVisible) throw new Error('Spinner not observed during load (timing) - see screenshot/log for actual behavior')
  })

  // AD004: network error on listing -> red error banner, no infinite spinner
  await step('AD004', async () => {
    await page.route('**/v1/api/administradores*', async (route) => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ erro: 'Erro interno simulado (QA)' }) })
    })
    await page.goto('http://localhost:3001/administradores', { waitUntil: 'load' })
    await page.waitForTimeout(800)
    await screenshot(page, 'AD004')
    const spinnerStillThere = await page.locator('.animate-spin').first().isVisible().catch(() => false)
    logger.push(`[ASSERT] spinner stuck after error = ${spinnerStillThere}`)
    const bannerVisible = await page.locator('.text-destructive').first().isVisible().catch(() => false)
    logger.push(`[ASSERT] destructive banner visible = ${bannerVisible}`)
    await page.unroute('**/v1/api/administradores*')
    if (spinnerStillThere) throw new Error('Loading spinner stuck after API error')
    if (!bannerVisible) throw new Error('No error banner shown after API 500')
  })
} finally {
  saveResults('results-s1.json')
  await browser.close()
}
