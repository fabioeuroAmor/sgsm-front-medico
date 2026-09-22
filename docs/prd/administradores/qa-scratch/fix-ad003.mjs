import { launch, login, gotoAdministradores, Logger, screenshot, record, saveResults } from './helpers.mjs'

const { browser, page } = await launch(true)
const logger = new Logger()
logger.attach(page)

try {
  await login(page, logger, 'dev-local@sgsm.local', 'Dev088c00c5ba89!Aa')
  await gotoAdministradores(page)
  await page.waitForTimeout(700)

  // Bruno Carvalho has telefone="" (empty) - verify no "Tel:" line and no broken layout
  const brunoCard = page.locator('div.rounded-2xl').filter({ hasText: 'Bruno Carvalho' })
  const brunoText = await brunoCard.innerText()
  const brunoHasTel = /Tel:/.test(brunoText)
  const brunoHasNome = /Bruno Carvalho/.test(brunoText)
  const brunoHasBadge = /Ativo|Inativo/.test(brunoText)
  const brunoHasCpf = /CPF:/.test(brunoText)
  const brunoHasEmail = /E-mail:/.test(brunoText)

  // Ana Beatriz Souza Silva HAS telefone - verify "Tel:" line present
  const anaCard = page.locator('div.rounded-2xl').filter({ hasText: 'Ana Beatriz Souza Silva' })
  const anaText = await anaCard.innerText()
  const anaHasTel = /Tel:/.test(anaText)

  logger.push(`[ASSERT] Bruno (no telefone) card: nome=${brunoHasNome} badge=${brunoHasBadge} cpf=${brunoHasCpf} email=${brunoHasEmail} hasTelLine(should be false)=${brunoHasTel}`)
  logger.push(`[ASSERT] Ana (has telefone) card: hasTelLine(should be true)=${anaHasTel}`)
  logger.push(`[RAW] Bruno card text:\n${brunoText}`)
  logger.push(`[RAW] Ana card text:\n${anaText}`)

  await screenshot(page, 'AD003')

  if (!brunoHasNome || !brunoHasBadge || !brunoHasCpf || !brunoHasEmail) throw new Error('Bruno card missing a required field')
  if (brunoHasTel) throw new Error('Bruno card (no telefone) incorrectly shows a Tel: line')
  if (!anaHasTel) throw new Error('Ana card (has telefone) missing Tel: line')

  record('AD003', 'pass')
  console.log('AD003 OK')
} catch (e) {
  record('AD003', 'fail', e.message)
  console.log('AD003 FAIL:', e.message)
  try { await screenshot(page, 'AD003') } catch {}
} finally {
  logger.flush('AD003')
  saveResults('results-fix-ad003.json')
  await browser.close()
}
