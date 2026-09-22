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
  try { await screenshot(page, id) } catch {}
  logger.flush(id)
}

async function search(text) {
  const box = page.getByPlaceholder('Buscar por nome, CPF ou e-mail…')
  await box.fill('')
  if (text) await box.type(text, { delay: 15 })
  await page.waitForTimeout(300)
}

try {
  await login(page, logger, 'dev-local@sgsm.local', 'Dev088c00c5ba89!Aa')
  logger.flush('LOGIN')
  await gotoAdministradores(page)
  await page.waitForTimeout(600)

  // ---- AD006: search partial nome ----
  await step('AD006', async () => {
    await search('Bruno')
    const brunoVisible = await page.locator('h3:has-text("Bruno Carvalho")').isVisible().catch(() => false)
    const anaVisible = await page.locator('h3:has-text("Ana Beatriz")').isVisible().catch(() => false)
    logger.push(`[ASSERT] Bruno visible=${brunoVisible}, Ana visible (should be false)=${anaVisible}`)
    if (!brunoVisible) throw new Error('Bruno not found by partial name search')
    if (anaVisible) throw new Error('Ana incorrectly shown for "Bruno" search')
  })

  // ---- AD007: search by CPF (with punctuation) ----
  await step('AD007', async () => {
    // read Bruno's CPF from the card text (rendered masked)
    const cardText = await page.locator('div.rounded-2xl').filter({ hasText: 'Bruno Carvalho' }).innerText()
    const cpfMatch = cardText.match(/CPF:\s*([\d.\-]+)/)
    const cpf = cpfMatch ? cpfMatch[1] : null
    logger.push(`[INFO] Bruno CPF detected = ${cpf}`)
    if (!cpf) throw new Error('Could not read Bruno CPF from card')
    await search(cpf)
    const brunoVisible = await page.locator('h3:has-text("Bruno Carvalho")').isVisible().catch(() => false)
    logger.push(`[ASSERT] Bruno visible via masked-CPF search = ${brunoVisible}`)
    if (!brunoVisible) throw new Error('CPF (masked) search did not find Bruno')
    // now try digits-only (unpunctuated)
    const digitsOnly = cpf.replace(/\D/g, '')
    await search(digitsOnly)
    const brunoVisible2 = await page.locator('h3:has-text("Bruno Carvalho")').isVisible().catch(() => false)
    logger.push(`[ASSERT] Bruno visible via digits-only CPF search = ${brunoVisible2}`)
    if (!brunoVisible2) throw new Error('CPF (digits only) search did not find Bruno')
  })

  // ---- AD008: search by email partial ----
  await step('AD008', async () => {
    const cardText = await page.locator('div.rounded-2xl').filter({ hasText: 'Bruno Carvalho' }).innerText()
    const emailMatch = cardText.match(/E-mail:\s*(\S+)/)
    const email = emailMatch ? emailMatch[1] : null
    logger.push(`[INFO] Bruno email = ${email}`)
    if (!email) throw new Error('Could not read Bruno email from card')
    const partial = email.slice(0, 10)
    await search(partial)
    const brunoVisible = await page.locator('h3:has-text("Bruno Carvalho")').isVisible().catch(() => false)
    logger.push(`[ASSERT] Bruno visible via partial email "${partial}" = ${brunoVisible}`)
    if (!brunoVisible) throw new Error('Partial email search did not find Bruno')
  })

  // ---- AD009: case-insensitive search ----
  await step('AD009', async () => {
    await search('BRUNO')
    const upperVisible = await page.locator('h3:has-text("Bruno Carvalho")').isVisible().catch(() => false)
    await search('bruno')
    const lowerVisible = await page.locator('h3:has-text("Bruno Carvalho")').isVisible().catch(() => false)
    logger.push(`[ASSERT] uppercase "BRUNO" match=${upperVisible}, lowercase "bruno" match=${lowerVisible}`)
    if (!upperVisible || !lowerVisible) throw new Error('Search is not case-insensitive')
  })

  // ---- AD010: search no results -> EmptyState ----
  await step('AD010', async () => {
    await search('zzznonexistentqa12345')
    const emptyVisible = await page.locator('text=Nenhum resultado encontrado').isVisible().catch(() => false)
    logger.push(`[ASSERT] EmptyState shown for no-match search = ${emptyVisible}`)
    if (!emptyVisible) throw new Error('EmptyState not shown for search with no matches')
  })

  // ---- AD011: clear search -> shows all again ----
  await step('AD011', async () => {
    await search('')
    await page.waitForTimeout(300)
    const count = await page.locator('div.rounded-2xl').filter({ has: page.locator('h3') }).count()
    logger.push(`[ASSERT] admin cards visible after clearing search = ${count}`)
    if (count < 2) throw new Error(`Expected multiple admins after clearing search, got ${count}`)
  })

  // ---- AD012: filter Ativos ----
  await step('AD012', async () => {
    await page.locator('select').selectOption('true')
    await page.waitForTimeout(500)
    const orfaoVisible = await page.locator('h3:has-text("Orfao Login Admin")').isVisible().catch(() => false)
    const brunoVisible = await page.locator('h3:has-text("Bruno Carvalho")').isVisible().catch(() => false)
    logger.push(`[ASSERT] Ativos filter: Orfao(inativo) visible=${orfaoVisible} (should be false), Bruno(ativo) visible=${brunoVisible} (should be true)`)
    if (orfaoVisible) throw new Error('Inactive admin shown under "Ativos" filter')
    if (!brunoVisible) throw new Error('Active admin missing under "Ativos" filter')
  })

  // ---- AD013: filter Inativos ----
  await step('AD013', async () => {
    await page.locator('select').selectOption('false')
    await page.waitForTimeout(500)
    const orfaoVisible = await page.locator('h3:has-text("Orfao Login Admin")').isVisible().catch(() => false)
    const brunoVisible = await page.locator('h3:has-text("Bruno Carvalho")').isVisible().catch(() => false)
    logger.push(`[ASSERT] Inativos filter: Orfao(inativo) visible=${orfaoVisible} (should be true), Bruno(ativo) visible=${brunoVisible} (should be false)`)
    if (!orfaoVisible) throw new Error('Inactive admin missing under "Inativos" filter')
    if (brunoVisible) throw new Error('Active admin incorrectly shown under "Inativos" filter')
  })

  // ---- AD014: filter Todos ----
  await step('AD014', async () => {
    await page.locator('select').selectOption('')
    await page.waitForTimeout(500)
    const orfaoVisible = await page.locator('h3:has-text("Orfao Login Admin")').isVisible().catch(() => false)
    const brunoVisible = await page.locator('h3:has-text("Bruno Carvalho")').isVisible().catch(() => false)
    logger.push(`[ASSERT] Todos filter: Orfao visible=${orfaoVisible}, Bruno visible=${brunoVisible} (both should be true)`)
    if (!orfaoVisible || !brunoVisible) throw new Error('Todos os status filter did not show both active and inactive admins')
  })
} catch (e) {
  console.error('SCRIPT ERROR', e)
} finally {
  saveResults('results-s4.json')
  await browser.close()
}
