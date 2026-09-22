import { launch, login, gotoAdministradores, Logger, screenshot, record, saveResults, genValidCPF } from './helpers.mjs'

const { browser, page } = await launch(true)
const logger = new Logger()
logger.attach(page)

function modalTitle(t) { return page.locator('h2').filter({ hasText: t }) }
function cardFor(nome) { return page.locator('div.rounded-2xl').filter({ hasText: nome }) }

async function step(id, fn) {
  try {
    await fn()
    record(id, 'pass')
    console.log(`${id} OK (re-captured mid-state screenshot)`)
  } catch (e) {
    record(id, 'fail', e.message)
    console.log(`${id} FAIL: ${e.message}`)
  }
  logger.flush(id)
}

const ANA_CPF = '435.767.841-28'
const ANA_EMAIL = 'qa-ana-1790101559913@teste.local'
const BRUNO_EMAIL = 'qa-bruno-1790101559913@teste.local'
const ORFAO_CPF = '727.288.139-90'

try {
  await login(page, logger, 'dev-local@sgsm.local', 'Dev088c00c5ba89!Aa')
  await gotoAdministradores(page)
  await page.waitForTimeout(500)

  // ---- AD023: duplicate CPF - capture screenshot WHILE error is showing, modal still open ----
  await step('AD023', async () => {
    await page.getByRole('button', { name: /Novo Administrador/ }).click()
    await modalTitle('Novo Administrador').waitFor({ state: 'visible' })
    await page.getByLabel('Nome *').fill('Tentativa CPF Duplicado 2')
    await page.getByLabel('CPF *').type(ANA_CPF, { delay: 5 })
    await page.getByLabel('E-mail *').fill(`qa-dup2-${Date.now()}@teste.local`)
    await page.getByLabel('Senha de acesso *').fill('SenhaValida123')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await page.waitForSelector('text=CPF já cadastrado', { timeout: 5000 })
    await page.waitForTimeout(200)
    await screenshot(page, 'AD023') // <-- captured HERE, while modal+error visible
    const modalOpen = await modalTitle('Novo Administrador').isVisible()
    if (!modalOpen) throw new Error('Modal unexpectedly closed')
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await page.waitForTimeout(200)
  })

  // ---- AD027: duplicate email ----
  await step('AD027', async () => {
    await page.getByRole('button', { name: /Novo Administrador/ }).click()
    await modalTitle('Novo Administrador').waitFor({ state: 'visible' })
    await page.getByLabel('Nome *').fill('Tentativa Email Duplicado 2')
    await page.getByLabel('CPF *').type(genValidCPF(Date.now() % 90000 + 41), { delay: 5 })
    await page.getByLabel('E-mail *').fill(ANA_EMAIL)
    await page.getByLabel('Senha de acesso *').fill('SenhaValida123')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await page.waitForSelector('text=E-mail já cadastrado', { timeout: 5000 })
    await page.waitForTimeout(200)
    await screenshot(page, 'AD027')
    const modalOpen = await modalTitle('Novo Administrador').isVisible()
    if (!modalOpen) throw new Error('Modal unexpectedly closed')
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await page.waitForTimeout(200)
  })

  // ---- AD039: retry with Orfao's CPF -> blocked as duplicate ----
  await step('AD039', async () => {
    await page.getByRole('button', { name: /Novo Administrador/ }).click()
    await modalTitle('Novo Administrador').waitFor({ state: 'visible' })
    await page.getByLabel('Nome *').fill('Retry Apos Orfao 2')
    await page.getByLabel('CPF *').type(ORFAO_CPF, { delay: 5 })
    await page.getByLabel('E-mail *').fill(`qa-retry2-${Date.now()}@teste.local`)
    await page.getByLabel('Senha de acesso *').fill('SenhaValida123')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await page.waitForSelector('text=CPF já cadastrado', { timeout: 5000 })
    await page.waitForTimeout(200)
    await screenshot(page, 'AD039')
    const modalOpen = await modalTitle('Novo Administrador').isVisible()
    if (!modalOpen) throw new Error('Modal unexpectedly closed')
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await page.waitForTimeout(200)
  })

  // ---- AD043: generic 500 on save ----
  await step('AD043', async () => {
    await page.route('**/v1/api/administradores', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ erro: 'Erro genérico simulado (QA)' }) })
      } else {
        await route.continue()
      }
    })
    await page.getByRole('button', { name: /Novo Administrador/ }).click()
    await modalTitle('Novo Administrador').waitFor({ state: 'visible' })
    await page.getByLabel('Nome *').fill('Teste Erro Generico 2')
    await page.getByLabel('CPF *').type(genValidCPF(Date.now() % 90000 + 55), { delay: 5 })
    await page.getByLabel('E-mail *').fill(`qa-generic2-${Date.now()}@teste.local`)
    await page.getByLabel('Senha de acesso *').fill('SenhaValida123')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await page.waitForSelector('text=Erro genérico simulado', { timeout: 5000 })
    await page.waitForTimeout(200)
    await screenshot(page, 'AD043')
    const modalOpen = await modalTitle('Novo Administrador').isVisible()
    const nomePreserved = (await page.getByLabel('Nome *').inputValue()) === 'Teste Erro Generico 2'
    await page.unroute('**/v1/api/administradores')
    if (!modalOpen) throw new Error('Modal unexpectedly closed')
    if (!nomePreserved) throw new Error('Form data lost')
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await page.waitForTimeout(200)
  })

  // ---- AD047: duplicate email on edit ----
  await step('AD047', async () => {
    await cardFor('Ana Beatriz Souza Silva').getByRole('button', { name: 'Editar' }).click()
    await modalTitle('Editar Administrador').waitFor({ state: 'visible' })
    await page.getByLabel('E-mail *').fill('')
    await page.getByLabel('E-mail *').fill(BRUNO_EMAIL)
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await page.waitForSelector('text=E-mail já cadastrado', { timeout: 5000 })
    await page.waitForTimeout(200)
    await screenshot(page, 'AD047')
    const modalOpen = await modalTitle('Editar Administrador').isVisible()
    if (!modalOpen) throw new Error('Modal unexpectedly closed')
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await page.waitForTimeout(200)
  })

  // ---- AD048: empty nome on edit ----
  await step('AD048', async () => {
    await cardFor('Ana Beatriz Souza Silva').getByRole('button', { name: 'Editar' }).click()
    await modalTitle('Editar Administrador').waitFor({ state: 'visible' })
    await page.getByLabel('Nome *').fill('')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await page.waitForSelector('text=Preencha todos os campos obrigatórios.', { timeout: 5000 })
    await page.waitForTimeout(200)
    await screenshot(page, 'AD048')
    const modalOpen = await modalTitle('Editar Administrador').isVisible()
    if (!modalOpen) throw new Error('Modal unexpectedly closed')
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await page.waitForTimeout(200)
  })

  // ---- AD062: network error saving vinculos ----
  await step('AD062', async () => {
    await cardFor('Ana Beatriz Souza Silva').locator('button').nth(1).click()
    await modalTitle('Estabelecimentos').waitFor({ state: 'visible' })
    await page.waitForTimeout(400)
    await page.route('**/v1/api/administradores/*/estabelecimentos', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ erro: 'Falha de rede simulada (QA)' }) })
      } else {
        await route.continue()
      }
    })
    const cb = page.locator('input[type="checkbox"]').first()
    if (!(await cb.isChecked())) await cb.check()
    else await cb.uncheck()
    await page.getByRole('button', { name: 'Salvar Vínculos' }).click()
    await page.waitForSelector('text=Falha de rede simulada', { timeout: 5000 })
    await page.waitForTimeout(200)
    await screenshot(page, 'AD062')
    const modalOpen = await modalTitle('Estabelecimentos').isVisible()
    await page.unroute('**/v1/api/administradores/*/estabelecimentos')
    if (!modalOpen) throw new Error('Modal unexpectedly closed')
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await page.waitForTimeout(200)
  })
} catch (e) {
  console.error('SCRIPT ERROR', e)
} finally {
  saveResults('results-fix-screenshots.json')
  await browser.close()
}
