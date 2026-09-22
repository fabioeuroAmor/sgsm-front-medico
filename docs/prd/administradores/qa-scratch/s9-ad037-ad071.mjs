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

function cardFor(nome) {
  return page.locator('div.rounded-2xl').filter({ hasText: nome })
}
function modalTitleContains(text) {
  return page.locator('h2').filter({ hasText: text })
}

const seed = Date.now() % 90000
const cpf = genValidCPF(seed + 21)
const email = `qa-elaine-${Date.now()}@teste.local`
const senha = 'SenhaValida123'
const NOME = 'Elaine Ferreira QA'

try {
  await login(page, logger, 'dev-local@sgsm.local', 'Dev088c00c5ba89!Aa')
  logger.flush('LOGIN_DEV')
  await gotoAdministradores(page)
  await page.waitForTimeout(500)

  // ---- AD037: full happy-path creation, now that the CHECK constraint fix (V7) is applied ----
  await step('AD037', async () => {
    await page.getByRole('button', { name: /Novo Administrador/ }).click()
    await modalTitleContains('Novo Administrador').waitFor({ state: 'visible' })
    await page.getByLabel('Nome *').fill(NOME)
    await page.getByLabel('CPF *').type(cpf, { delay: 5 })
    await page.getByLabel('E-mail *').fill(email)
    await page.getByLabel('Senha de acesso *').fill(senha)

    const [registrarResp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/auth/registrar'), { timeout: 10000 }),
      page.getByRole('button', { name: 'Salvar' }).click(),
    ])
    logger.push(`[ASSERT] /auth/registrar status = ${registrarResp.status()}`)

    const successToastVisible = await page.locator('text=Administrador cadastrado').isVisible().catch(() => false)
    const cardVisible = await cardFor(NOME).isVisible().catch(() => false)
    logger.push(`[ASSERT] successToastVisible=${successToastVisible} cardVisible=${cardVisible}`)

    if (registrarResp.status() !== 201) throw new Error(`Expected 201 from /auth/registrar, got ${registrarResp.status()}`)
    if (!cardVisible) throw new Error('New administrator card not visible in list after creation')

    // vincula a 1 estabelecimento (Clinica São Lucas), necessario pro escopo em AD071
    await cardFor(NOME).locator('button').nth(1).click()
    await modalTitleContains('Estabelecimentos').waitFor({ state: 'visible' })
    await page.waitForTimeout(400)
    const saoLucasRow = page.locator('label').filter({ hasText: 'Clinica São Lucas' })
    await saoLucasRow.locator('input[type="checkbox"]').check()
    await page.getByRole('button', { name: 'Salvar Vínculos' }).click()
    await page.waitForTimeout(700)
    logger.push('[ASSERT] linked to Clinica São Lucas only')
  })

  // ---- AD071: log out, log in as the new administrator, verify sidebar + scoping ----
  await step('AD071', async () => {
    await page.locator('button:has-text("Sair")').first().click({ force: true })
    await page.waitForTimeout(500)
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle' })

    await login(page, logger, email, senha)
    logger.push('[ASSERT] login as newly created ADMIN_ESTABELECIMENTO succeeded (real credential, real backend)')

    const navText = await page.locator('nav').innerText()
    const hasAdministradores = navText.includes('Administradores')
    const hasFuncionarios = navText.includes('Funcionários')
    const hasEstabelecimentos = navText.includes('Estabelecimentos')
    logger.push(`[ASSERT] sidebar: Administradores visible=${hasAdministradores} (expect false), Funcionários visible=${hasFuncionarios} (expect true), Estabelecimentos visible=${hasEstabelecimentos} (expect true)`)
    if (hasAdministradores) throw new Error('"Administradores" incorrectly visible for ADMIN_ESTABELECIMENTO')
    if (!hasFuncionarios || !hasEstabelecimentos) throw new Error('Expected staff-level nav items missing for ADMIN_ESTABELECIMENTO')

    await page.getByRole('link', { name: 'Estabelecimentos' }).click()
    await page.waitForTimeout(1000)
    const bodyTxt = await page.locator('body').innerText()
    const seesSaoLucas = bodyTxt.includes('Clinica São Lucas')
    const seesStrix = bodyTxt.includes('Clinica Teste Strix')
    logger.push(`[ASSERT] escopo por estabelecimento: vê "Clinica São Lucas"=${seesSaoLucas} (expect true), vê "Clinica Teste Strix"=${seesStrix} (expect false)`)
    if (!seesSaoLucas) throw new Error('Should see own linked establishment')
    if (seesStrix) throw new Error('Should NOT see establishment not linked to this admin - scoping leak!')
  })
} catch (e) {
  console.error('SCRIPT ERROR', e)
} finally {
  saveResults('results-s9.json')
  await browser.close()
}
