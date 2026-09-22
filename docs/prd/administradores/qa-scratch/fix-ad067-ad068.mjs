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

  // ---- AD067 (redo): 401 on GET administradores triggers refresh, then retries and succeeds ----
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
    await page.waitForTimeout(2200)
    await page.unroute('**/v1/api/administradores*')
    const url = page.url()
    const h3Count = await page.locator('h3').count()
    const emptyStateVisible = await page.locator('text=Nenhum resultado encontrado').isVisible().catch(() => false)
    const contentRendered = h3Count > 0 || emptyStateVisible
    const bodyTxt = await page.locator('body').innerText()
    logger.push(`[ASSERT] after simulated 401+refresh: url=${url} h3Count=${h3Count} emptyStateVisible=${emptyStateVisible} contentRendered=${contentRendered} bodyLen=${bodyTxt.trim().length}`)
    if (!url.includes('/administradores')) throw new Error(`Unexpectedly navigated away: ${url}`)
    if (!contentRendered) throw new Error('Page went blank instead of recovering via refresh+retry')
  })

  // ---- AD068 (redo): slow network on save -> button shows "Salvando..." disabled, no freeze ----
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
    await page.locator('h2').filter({ hasText: 'Novo Administrador' }).waitFor({ state: 'visible' })
    await page.getByLabel('Nome *').fill('Teste Rede Lenta 2')
    await page.getByLabel('CPF *').type(genValidCPF(Date.now() % 90000 + 20), { delay: 5 })
    await page.getByLabel('E-mail *').fill(`qa-slow2-${Date.now()}@teste.local`)
    await page.getByLabel('Senha de acesso *').fill('SenhaValida123')
    // scope strictly to the modal footer's exact "Salvar" button (avoid matching "Salvar Vínculos" elsewhere)
    const salvarBtn = page.getByRole('button', { name: 'Salvar', exact: true })
    await salvarBtn.click()
    await page.waitForTimeout(600)
    const btnText = await salvarBtn.innerText().catch((e) => `<error: ${e.message}>`)
    const btnDisabled = await salvarBtn.isDisabled().catch(() => null)
    logger.push(`[ASSERT] mid-flight (t=600ms of ~3000ms delay) button text="${btnText}" disabled=${btnDisabled}`)
    await screenshot(page, 'AD068')
    await page.waitForTimeout(3200)
    await page.unroute('**/v1/api/administradores')
    const modalGoneNow = !(await page.locator('h2').filter({ hasText: 'Novo Administrador' }).isVisible().catch(() => false))
    const cardVisible = await page.locator('h3:has-text("Teste Rede Lenta 2")').isVisible().catch(() => false)
    logger.push(`[ASSERT] eventually resolved: modal closed=${modalGoneNow}, new card visible=${cardVisible}`)
    if (btnText.trim() !== 'Salvando…') throw new Error(`Expected "Salvando…" text mid-flight, got "${btnText}"`)
    if (!btnDisabled) throw new Error('Salvar button not disabled during slow request')
    if (!modalGoneNow || !cardVisible) throw new Error('Save never completed / UI never recovered after slow request')
  })
} catch (e) {
  console.error('SCRIPT ERROR', e)
} finally {
  saveResults('results-fix-ad067-68.json')
  await browser.close()
}
