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

try {
  await login(page, logger, 'dev-local@sgsm.local', 'Dev088c00c5ba89!Aa')
  logger.flush('LOGIN')
  await gotoAdministradores(page)
  await page.waitForTimeout(500)

  // ---- AD044 + AD033 + AD045: open Editar on Ana -> prefilled fields, CPF disabled, no senha field ----
  await step('AD044', async () => {
    await cardFor('Ana Beatriz Souza').getByRole('button', { name: 'Editar' }).click()
    await page.waitForSelector('text=Editar Administrador')
    await page.waitForTimeout(300)
    const nomeVal = await page.getByLabel('Nome *').inputValue()
    const cpfVal = await page.getByLabel('CPF *').inputValue()
    const emailVal = await page.getByLabel('E-mail *').inputValue()
    const telVal = await page.getByLabel('Telefone').inputValue()
    const senhaFieldCount = await page.getByLabel('Senha de acesso *').count()
    logger.push(`[ASSERT] nome="${nomeVal}" cpf="${cpfVal}" email="${emailVal}" telefone="${telVal}" senhaFieldPresent=${senhaFieldCount > 0}`)
    if (nomeVal.trim() !== 'Ana Beatriz Souza') throw new Error(`Nome not prefilled correctly: "${nomeVal}"`)
    if (!cpfVal.includes('.') || !cpfVal.includes('-')) throw new Error(`CPF not masked: "${cpfVal}"`)
    if (senhaFieldCount !== 0) throw new Error('Senha field present in edit modal (should be absent) - AD033 FAILS')
  })

  await step('AD033', async () => {
    const senhaFieldCount = await page.getByLabel('Senha de acesso *').count()
    logger.push(`[ASSERT] senha field count in edit modal = ${senhaFieldCount}`)
    if (senhaFieldCount !== 0) throw new Error('Senha field unexpectedly present in edit modal')
  })

  await step('AD045', async () => {
    const disabled = await page.getByLabel('CPF *').isDisabled()
    logger.push(`[ASSERT] CPF field disabled in edit mode = ${disabled}`)
    if (!disabled) throw new Error('CPF field is not disabled in edit mode')
  })

  // ---- AD046: change only nome, save -> PUT, card updates without reload ----
  await step('AD046', async () => {
    const nomeField = page.getByLabel('Nome *')
    await nomeField.fill('')
    await nomeField.fill('Ana Beatriz Souza Silva')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await page.waitForTimeout(1000)
    const modalGone = !(await page.locator('text=Editar Administrador').isVisible().catch(() => false))
    const newCardVisible = await page.locator('h3:has-text("Ana Beatriz Souza Silva")').isVisible().catch(() => false)
    logger.push(`[ASSERT] modal closed = ${modalGone}, updated card visible = ${newCardVisible}`)
    if (!modalGone) throw new Error('Modal did not close after edit save')
    if (!newCardVisible) throw new Error('Updated name not reflected in listing without reload')
  })

  // ---- AD047: change email to duplicate (Bruno's) -> backend error ----
  await step('AD047', async () => {
    await cardFor('Ana Beatriz Souza Silva').getByRole('button', { name: 'Editar' }).click()
    await page.waitForSelector('text=Editar Administrador')
    await page.waitForTimeout(200)
    const emailField = page.getByLabel('E-mail *')
    await emailField.fill('')
    // Bruno's email is timestamp-based; read it from Bruno's card is not possible (email not shown truncated)... use listing page text scan
    const brunoCard = cardFor('Bruno Carvalho')
    const brunoText = await brunoCard.innerText()
    const emailMatch = brunoText.match(/E-mail:\s*(\S+)/)
    const brunoEmail = emailMatch ? emailMatch[1] : null
    logger.push(`[INFO] Bruno email detected = ${brunoEmail}`)
    if (!brunoEmail) throw new Error('Could not detect Bruno email from listing for duplicate test')
    await emailField.fill(brunoEmail)
    await page.getByRole('button', { name: 'Salvar' }).click()
    await page.waitForTimeout(1000)
    const bodyTxt = await page.locator('body').innerText()
    const hasErr = /E-mail já cadastrado/i.test(bodyTxt)
    const modalStillOpen = await page.locator('text=Editar Administrador').isVisible().catch(() => false)
    logger.push(`[ASSERT] duplicate email error shown = ${hasErr}, modal still open = ${modalStillOpen}`)
    if (!hasErr) throw new Error('Duplicate email error not shown on edit')
    if (!modalStillOpen) throw new Error('Modal closed despite backend rejection')
    // restore email back and cancel
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await page.waitForTimeout(200)
  })

  // ---- AD048: clear nome in edit + Salvar -> blocked, no PUT ----
  await step('AD048', async () => {
    await cardFor('Ana Beatriz Souza Silva').getByRole('button', { name: 'Editar' }).click()
    await page.waitForSelector('text=Editar Administrador')
    await page.waitForTimeout(200)
    await page.getByLabel('Nome *').fill('')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await page.waitForTimeout(400)
    const errText = await page.locator('text=Preencha todos os campos obrigatórios.').isVisible().catch(() => false)
    const modalStillOpen = await page.locator('text=Editar Administrador').isVisible().catch(() => false)
    logger.push(`[ASSERT] formError visible = ${errText}, modal still open = ${modalStillOpen}`)
    if (!errText) throw new Error('formError not shown for empty nome on edit')
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await page.waitForTimeout(200)
  })

  // ---- AD049: open inativar modal on Bruno (ativo) ----
  await step('AD049', async () => {
    await cardFor('Bruno Carvalho').locator('button').last().click()
    await page.waitForSelector('text=Inativar Administrador')
    await page.waitForTimeout(200)
    const confirmTextVisible = await page.locator('text=será inativado').isVisible().catch(() => false)
    logger.push(`[ASSERT] confirm modal text visible = ${confirmTextVisible}`)
    if (!confirmTextVisible) throw new Error('Confirmation text not found in Inativar modal')
  })

  // ---- AD050: confirm inactivation -> DELETE, 204, badge Inativo + Reativar btn ----
  await step('AD050', async () => {
    await page.getByRole('button', { name: 'Inativar' }).click()
    await page.waitForTimeout(1000)
    const brunoCard = cardFor('Bruno Carvalho')
    const badgeInativo = await brunoCard.locator('text=Inativo').isVisible().catch(() => false)
    const reativarBtn = await brunoCard.locator('text=Reativar').isVisible().catch(() => false)
    logger.push(`[ASSERT] badge Inativo visible = ${badgeInativo}, Reativar button visible = ${reativarBtn}`)
    if (!badgeInativo) throw new Error('Inativo badge not shown after DELETE')
    if (!reativarBtn) throw new Error('Reativar button not shown after inactivation')
  })

  // ---- AD051: cancel inativar modal on Orfao Login Admin -> no change, no request ----
  await step('AD051', async () => {
    await cardFor('Orfao Login Admin').locator('button').last().click()
    await page.waitForSelector('text=Inativar Administrador')
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await page.waitForTimeout(300)
    const orfaoCard = cardFor('Orfao Login Admin')
    const stillAtivo = await orfaoCard.locator('text=Ativo').isVisible().catch(() => false)
    logger.push(`[ASSERT] Orfao Login Admin still Ativo after cancel = ${stillAtivo}`)
    if (!stillAtivo) throw new Error('Status changed despite cancel')
  })

  // ---- AD052: reactivate Bruno -> PATCH, badge back Ativo ----
  await step('AD052', async () => {
    await cardFor('Bruno Carvalho').getByRole('button', { name: /Reativar/ }).click()
    await page.waitForTimeout(1000)
    const brunoCard = cardFor('Bruno Carvalho')
    const badgeAtivo = await brunoCard.locator('text=Ativo').isVisible().catch(() => false)
    const trashBtnBack = (await brunoCard.locator('button').count()) === 3
    logger.push(`[ASSERT] badge Ativo restored = ${badgeAtivo}, button count back to 3 = ${trashBtnBack}`)
    if (!badgeAtivo) throw new Error('Badge did not revert to Ativo after reactivation')
  })

  // ---- AD053: loading state during reativar (throttled) ----
  await step('AD053', async () => {
    // first inactivate Bruno again so we can reactivate with throttle
    await cardFor('Bruno Carvalho').locator('button').last().click()
    await page.waitForSelector('text=Inativar Administrador')
    await page.getByRole('button', { name: 'Inativar' }).click()
    await page.waitForTimeout(800)

    await page.route('**/v1/api/administradores/*/reativar', async (route) => {
      await new Promise((r) => setTimeout(r, 1200))
      await route.continue()
    })
    const reativarBtn = cardFor('Bruno Carvalho').getByRole('button', { name: /Reativar/ })
    await reativarBtn.click()
    await page.waitForTimeout(300)
    const spinning = await cardFor('Bruno Carvalho').locator('.animate-spin').isVisible().catch(() => false)
    const disabled = await reativarBtn.isDisabled().catch(() => false)
    await screenshot(page, 'AD053')
    logger.push(`[ASSERT] spin icon visible during reativar = ${spinning}, button disabled during call = ${disabled}`)
    await page.waitForTimeout(1500)
    await page.unroute('**/v1/api/administradores/*/reativar')
    if (!spinning) throw new Error('Spinning icon not observed during reativar call')
    if (!disabled) throw new Error('Reativar button not disabled during call')
  })

  // ---- setup for later filter tests (AD012-014): leave "Orfao Login Admin" inactive ----
  await step('SETUP_INATIVAR_ORFAO', async () => {
    await cardFor('Orfao Login Admin').locator('button').last().click()
    await page.waitForSelector('text=Inativar Administrador')
    await page.getByRole('button', { name: 'Inativar' }).click()
    await page.waitForTimeout(800)
    const stillInativo = await cardFor('Orfao Login Admin').locator('text=Inativo').isVisible().catch(() => false)
    logger.push(`[SETUP] Orfao Login Admin left Inativo for AD013 filter test = ${stillInativo}`)
  })
} catch (e) {
  console.error('SCRIPT ERROR', e)
} finally {
  saveResults('results-s3.json')
  await browser.close()
}
