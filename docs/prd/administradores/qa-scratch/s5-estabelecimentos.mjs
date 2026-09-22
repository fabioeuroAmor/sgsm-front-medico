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

function cardFor(nome) {
  return page.locator('div.rounded-2xl').filter({ hasText: nome })
}
function modalTitleContains(text) {
  return page.locator('h2').filter({ hasText: text })
}

const ADMIN_NOME = 'Ana Beatriz Souza Silva' // renamed by S3's AD046 step

try {
  await login(page, logger, 'dev-local@sgsm.local', 'Dev088c00c5ba89!Aa')
  logger.flush('LOGIN')
  await gotoAdministradores(page)
  await page.waitForTimeout(600)

  // building icon is the 2nd button in the card (Editar, Building, Trash/Reativar)
  function buildingBtn(nome) {
    return cardFor(nome).locator('button').nth(1)
  }

  // ---- AD054: open modal -> spinner then list ----
  await step('AD054', async () => {
    await page.route('**/v1/api/administradores/*/estabelecimentos', async (route) => {
      await new Promise((r) => setTimeout(r, 600))
      await route.continue()
    })
    await buildingBtn(ADMIN_NOME).click()
    await page.waitForTimeout(150)
    const spinnerVisible = await page.locator('.animate-spin').first().isVisible().catch(() => false)
    logger.push(`[ASSERT] spinner visible right after opening modal = ${spinnerVisible}`)
    await page.waitForSelector(`h2:has-text("Estabelecimentos")`, { timeout: 5000 })
    await page.waitForTimeout(800)
    await page.unroute('**/v1/api/administradores/*/estabelecimentos')
    if (!spinnerVisible) throw new Error('Spinner not observed when opening estabelecimentos modal')
  })

  // ---- AD055 + AD058: lists estabelecimentos, all unchecked initially (no vinculos yet) ----
  await step('AD055', async () => {
    await page.waitForTimeout(300)
    const labels = page.locator('div.space-y-2 label, div[class*="space-y-2"] label')
    const count = await labels.count()
    logger.push(`[ASSERT] estabelecimentos listed count = ${count}`)
    const namesFound = await labels.allInnerTexts()
    logger.push(`[INFO] establishments: ${JSON.stringify(namesFound)}`)
    if (count < 2) throw new Error(`Expected at least 2 estabelecimentos, got ${count}`)
  })

  await step('AD058', async () => {
    const checkboxes = page.locator('input[type="checkbox"]')
    const count = await checkboxes.count()
    let anyChecked = false
    for (let i = 0; i < count; i++) {
      if (await checkboxes.nth(i).isChecked()) anyChecked = true
    }
    logger.push(`[ASSERT] any checkbox pre-checked (should be false, no vinculos yet) = ${anyChecked}`)
    if (anyChecked) throw new Error('Unexpected pre-checked establishment for admin with no vinculos')
  })

  // ---- AD060: cancel without saving -> no vinculos change ----
  await step('AD060', async () => {
    const firstCheckbox = page.locator('input[type="checkbox"]').first()
    await firstCheckbox.check()
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await page.waitForTimeout(300)
    // reopen to verify nothing was persisted
    await buildingBtn(ADMIN_NOME).click()
    await page.waitForSelector(`h2:has-text("Estabelecimentos")`)
    await page.waitForTimeout(500)
    const checkboxes = page.locator('input[type="checkbox"]')
    const count = await checkboxes.count()
    let anyChecked = false
    for (let i = 0; i < count; i++) {
      if (await checkboxes.nth(i).isChecked()) anyChecked = true
    }
    logger.push(`[ASSERT] any checkbox checked after cancel+reopen (should be false) = ${anyChecked}`)
    if (anyChecked) throw new Error('Cancel did not discard the checkbox change')
  })

  // ---- AD056: check one, save -> PUT with list; modal closes ----
  let firstEstabName = ''
  await step('AD056', async () => {
    const labels = page.locator('div.space-y-2 label, div[class*="space-y-2"] label')
    firstEstabName = (await labels.first().innerText()).split('\n')[0]
    await page.locator('input[type="checkbox"]').first().check()
    await page.getByRole('button', { name: 'Salvar Vínculos' }).click()
    await page.waitForTimeout(800)
    const modalGone = !(await modalTitleContains('Estabelecimentos').isVisible().catch(() => false))
    logger.push(`[ASSERT] modal closed after save = ${modalGone}, checked establishment = "${firstEstabName}"`)
    if (!modalGone) throw new Error('Modal did not close after saving vinculos')
  })

  // ---- AD057: reopen reflects persisted state ----
  await step('AD057', async () => {
    await buildingBtn(ADMIN_NOME).click()
    await page.waitForSelector(`h2:has-text("Estabelecimentos")`)
    await page.waitForTimeout(500)
    const firstChecked = await page.locator('input[type="checkbox"]').first().isChecked()
    logger.push(`[ASSERT] first establishment (${firstEstabName}) still checked after reopen = ${firstChecked}`)
    if (!firstChecked) throw new Error('Vinculo not persisted - unchecked after reopen')
  })

  // ---- AD059: uncheck all, save -> PUT [] ----
  await step('AD059', async () => {
    const checkboxes = page.locator('input[type="checkbox"]')
    const count = await checkboxes.count()
    for (let i = 0; i < count; i++) {
      if (await checkboxes.nth(i).isChecked()) await checkboxes.nth(i).uncheck()
    }
    await page.getByRole('button', { name: 'Salvar Vínculos' }).click()
    await page.waitForTimeout(800)
    const modalGone = !(await modalTitleContains('Estabelecimentos').isVisible().catch(() => false))
    logger.push(`[ASSERT] modal closed after saving empty vinculos = ${modalGone}`)
    if (!modalGone) throw new Error('Modal did not close after saving empty vinculos list')
  })

  // verify persistence of empty state + re-check for AD062 prep
  await step('VERIFY_EMPTY_AFTER_AD059', async () => {
    await buildingBtn(ADMIN_NOME).click()
    await page.waitForSelector(`h2:has-text("Estabelecimentos")`)
    await page.waitForTimeout(400)
    const checkboxes = page.locator('input[type="checkbox"]')
    const count = await checkboxes.count()
    let anyChecked = false
    for (let i = 0; i < count; i++) { if (await checkboxes.nth(i).isChecked()) anyChecked = true }
    logger.push(`[INFO] all unchecked after empty save+reopen = ${!anyChecked}`)
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await page.waitForTimeout(200)
  })

  // ---- AD062: network error saving vinculos -> error inside modal, doesn't close ----
  await step('AD062', async () => {
    await buildingBtn(ADMIN_NOME).click()
    await page.waitForSelector(`h2:has-text("Estabelecimentos")`)
    await page.waitForTimeout(400)
    await page.route('**/v1/api/administradores/*/estabelecimentos', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ erro: 'Falha de rede simulada (QA)' }) })
      } else {
        await route.continue()
      }
    })
    await page.locator('input[type="checkbox"]').first().check()
    await page.getByRole('button', { name: 'Salvar Vínculos' }).click()
    await page.waitForTimeout(800)
    const bodyTxt = await page.locator('body').innerText()
    const hasErr = /Falha de rede simulada/i.test(bodyTxt)
    const modalStillOpen = await modalTitleContains('Estabelecimentos').isVisible().catch(() => false)
    logger.push(`[ASSERT] error shown in modal = ${hasErr}, modal still open = ${modalStillOpen}`)
    await page.unroute('**/v1/api/administradores/*/estabelecimentos')
    if (!hasErr) throw new Error('Network error message not shown in vinculos modal')
    if (!modalStillOpen) throw new Error('Modal closed despite network error on save')
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await page.waitForTimeout(200)
  })

  // ---- AD061: no active establishments -> friendly empty message (simulated via route mock of GET) ----
  await step('AD061', async () => {
    await page.route('**/v1/api/estabelecimentos*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      } else {
        await route.continue()
      }
    })
    await buildingBtn(ADMIN_NOME).click()
    await page.waitForSelector(`h2:has-text("Estabelecimentos")`)
    await page.waitForTimeout(500)
    const msgVisible = await page.locator('text=Nenhum estabelecimento ativo cadastrado.').isVisible().catch(() => false)
    logger.push(`[ASSERT] "Nenhum estabelecimento ativo cadastrado." shown = ${msgVisible}`)
    await page.unroute('**/v1/api/estabelecimentos*')
    if (!msgVisible) throw new Error('Empty-establishments message not shown')
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await page.waitForTimeout(200)
  })
} catch (e) {
  console.error('SCRIPT ERROR', e)
} finally {
  saveResults('results-s5.json')
  await browser.close()
}
