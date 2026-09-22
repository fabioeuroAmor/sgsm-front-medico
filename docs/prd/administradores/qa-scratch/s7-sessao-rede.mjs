import { launch, login, gotoAdministradores, Logger, screenshot, record, saveResults, genValidCPF } from './helpers.mjs'

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
  try { await screenshot(page, id) } catch {}
  logger.flush(id)
}

try {
  await login(page, logger, 'dev-local@sgsm.local', 'Dev088c00c5ba89!Aa')
  logger.flush('LOGIN')
  await gotoAdministradores(page)
  await page.waitForTimeout(500)

  // ---- AD067 part A: 401 on GET administradores triggers refresh, then retries and succeeds ----
  await step('AD067', async () => {
    let failedOnce = false
    await page.route('**/v1/api/administradores*', async (route) => {
      if (route.request().method() === 'GET' && !failedOnce) {
        failedOnce = true
        await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ detail: 'Token expirado (simulado QA)' }) })
      } else {
        await route.continue()
      }
    })
    await page.reload({ waitUntil: 'load' })
    await page.waitForTimeout(2000)
    await page.unroute('**/v1/api/administradores*')
    const url = page.url()
    const bodyTxt = await page.locator('body').innerText()
    const stillOnAdminPage = url.includes('/administradores')
    const notBlank = bodyTxt.trim().length > 50
    const cardsOrEmptyVisible = await page.locator('h3, text=Nenhum resultado encontrado').first().isVisible().catch(() => false)
    logger.push(`[ASSERT] after simulated 401+refresh: url=${url} stillOnAdminPage=${stillOnAdminPage} notBlank=${notBlank} contentRendered=${cardsOrEmptyVisible}`)
    if (!stillOnAdminPage) throw new Error(`Unexpectedly navigated away: ${url}`)
    if (!notBlank || !cardsOrEmptyVisible) throw new Error('Page went blank instead of recovering via refresh+retry')
  })

  // ---- AD067 part B: refresh ALSO fails -> redirect to /login, no blank screen ----
  await step('AD067b', async () => {
    // corrupt the refresh token so the real refresh call fails
    await page.evaluate(() => localStorage.setItem('refresh_token', 'invalid-refresh-token-qa'))
    let failedOnce = false
    await page.route('**/v1/api/administradores*', async (route) => {
      if (route.request().method() === 'GET' && !failedOnce) {
        failedOnce = true
        await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ detail: 'Token expirado (simulado QA)' }) })
      } else {
        await route.continue()
      }
    })
    await page.reload({ waitUntil: 'load' })
    await page.waitForTimeout(2500)
    await page.unroute('**/v1/api/administradores*')
    const url = page.url()
    const bodyTxt = await page.locator('body').innerText()
    logger.push(`[ASSERT] after 401 + failed refresh: url=${url}, body length=${bodyTxt.trim().length}`)
    if (!url.includes('/login')) throw new Error(`Expected redirect to /login after failed refresh, got: ${url}`)
  })

  // re-login for AD068
  await login(page, logger, 'dev-local@sgsm.local', 'Dev088c00c5ba89!Aa')
  await gotoAdministradores(page)
  await page.waitForTimeout(500)

  // ---- AD068: slow network on save -> button shows "Salvando..." disabled, no freeze ----
  await step('AD068', async () => {
    await page.route('**/v1/api/administradores', async (route) => {
      if (route.request().method() === 'POST') {
        await new Promise((r) => setTimeout(r, 3000))
        await route.continue()
      } else {
        await route.continue()
      }
    })
    await page.getByRole('button', { name: /Novo Administrador/ }).click()
    await page.waitForTimeout(200)
    await page.getByLabel('Nome *').fill('Teste Rede Lenta')
    await page.getByLabel('CPF *').type(genValidCPF(Date.now() % 90000 + 10), { delay: 5 })
    await page.getByLabel('E-mail *').fill(`qa-slow-${Date.now()}@teste.local`)
    await page.getByLabel('Senha de acesso *').fill('SenhaValida123')
    const salvarBtn = page.getByRole('button', { name: /Salvar/ })
    await salvarBtn.click()
    await page.waitForTimeout(500)
    const btnText = await salvarBtn.innerText()
    const btnDisabled = await salvarBtn.isDisabled()
    logger.push(`[ASSERT] mid-flight button text="${btnText}" disabled=${btnDisabled}`)
    await screenshot(page, 'AD068')
    await page.waitForTimeout(3500)
    await page.unroute('**/v1/api/administradores')
    const modalGoneNow = !(await page.locator('h2').filter({ hasText: 'Novo Administrador' }).isVisible().catch(() => false))
    logger.push(`[ASSERT] eventually resolved, modal closed = ${modalGoneNow}`)
    if (btnText.trim() !== 'Salvando…') throw new Error(`Expected "Salvando…" text mid-flight, got "${btnText}"`)
    if (!btnDisabled) throw new Error('Salvar button not disabled during slow request')
    if (!modalGoneNow) throw new Error('Modal never resolved/closed after slow request completed')
  })
} catch (e) {
  console.error('SCRIPT ERROR', e)
} finally {
  saveResults('results-s7.json')
  await browser.close()
}
