import { launch, login, Logger, screenshot, record, saveResults } from './helpers.mjs'

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
  await login(page, logger, 'qa-medico-dedicado@teste.local', 'QaMedico123!')
  logger.flush('LOGIN_MEDICO')

  // ---- AD063: "Administradores" item not in sidebar for MEDICO ----
  await step('AD063', async () => {
    const itemVisible = await page.locator('nav a:has-text("Administradores"), a:has-text("Administradores")').isVisible().catch(() => false)
    const perfilShown = await page.locator('text=MEDICO').first().isVisible().catch(() => false)
    logger.push(`[ASSERT] "Administradores" nav item visible for MEDICO = ${itemVisible}, perfil MEDICO shown in sidebar = ${perfilShown}`)
    if (itemVisible) throw new Error('Administradores item incorrectly visible in MEDICO sidebar')
  })

  // ---- AD064: direct URL navigation as MEDICO -> page loads, GET returns 403, document actual behavior ----
  await step('AD064', async () => {
    await page.goto('http://localhost:3001/administradores', { waitUntil: 'load' })
    await page.waitForTimeout(1200)
    const bodyTxt = await page.locator('body').innerText()
    const spinnerStuck = await page.locator('.animate-spin').first().isVisible().catch(() => false)
    const errorBannerVisible = await page.locator('.text-destructive').first().isVisible().catch(() => false)
    const heroVisible = await page.locator('h1:has-text("Administradores")').isVisible().catch(() => false)
    const bodyIsBlank = bodyTxt.trim().length < 20
    logger.push(`[OBSERVED] spinnerStuck=${spinnerStuck} errorBannerVisible=${errorBannerVisible} heroVisible=${heroVisible} bodyBlank=${bodyIsBlank}`)
    logger.push(`[OBSERVED] body text snapshot (first 500 chars): ${bodyTxt.slice(0, 500).replace(/\n/g, ' | ')}`)
    // Documenting actual behavior is the goal here per test-plan (known probable UX bug) - not a hard pass/fail gate,
    // but we still flag if the page truly crashes (React error boundary / totally blank) as a harder failure.
    if (bodyIsBlank) throw new Error('Page appears blank/crashed for MEDICO on direct URL access - see screenshot')
  })

  // ---- AD065: try to open modal & save as MEDICO -> POST 403, error shown ----
  await step('AD065', async () => {
    const btn = page.getByRole('button', { name: /Novo Administrador/ })
    const btnVisible = await btn.isVisible().catch(() => false)
    logger.push(`[OBSERVED] "Novo Administrador" button visible for MEDICO on direct URL = ${btnVisible}`)
    if (!btnVisible) {
      logger.push('[OBSERVED] Cannot open modal - hero/button not rendered (page likely showed error banner instead of full UI). Documenting as-is.')
      throw new Error('"Novo Administrador" button not available to attempt save (page state: see AD064 evidence) - documented, not a script bug')
    }
    await btn.click()
    await page.waitForTimeout(300)
    await page.getByLabel('Nome *').fill('Teste Acesso Medico')
    await page.getByLabel('CPF *').fill('123.456.789-09')
    await page.getByLabel('E-mail *').fill(`qa-medico-403-${Date.now()}@teste.local`)
    await page.getByLabel('Senha de acesso *').fill('SenhaValida123')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await page.waitForTimeout(1000)
    const bodyTxt = await page.locator('body').innerText()
    logger.push(`[OBSERVED] body after attempted save as MEDICO (first 400 chars): ${bodyTxt.slice(0, 400).replace(/\n/g, ' | ')}`)
  })
} catch (e) {
  console.error('SCRIPT ERROR (pre-logout section)', e)
}

// ---- AD066: logout, try to access /administradores without session -> redirect to /login ----
await step('AD066', async () => {
  // find and click "Sair" (logout)
  const sairBtn = page.locator('button:has-text("Sair"), a:has-text("Sair")').first()
  if (await sairBtn.isVisible().catch(() => false)) {
    await sairBtn.click()
    await page.waitForTimeout(500)
  } else {
    // fallback: clear storage directly to simulate logged-out state
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  }
  await page.goto('http://localhost:3001/administradores', { waitUntil: 'load' })
  await page.waitForTimeout(1000)
  const url = page.url()
  logger.push(`[ASSERT] URL after accessing /administradores without session = ${url}`)
  if (!url.includes('/login')) throw new Error(`Expected redirect to /login, got: ${url}`)
})

saveResults('results-s6.json')
await browser.close()
