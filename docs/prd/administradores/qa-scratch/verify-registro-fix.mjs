import { launch, login, Logger, screenshot, genValidCPF } from './helpers.mjs'

const { browser, page } = await launch(true)
const logger = new Logger()
logger.attach(page)

let falhas = []
function check(desc, cond) {
  console.log(`${cond ? 'OK ' : 'FAIL'} - ${desc}`)
  if (!cond) falhas.push(desc)
}

try {
  // ---- 1. RegisterPage nao mostra mais a opcao Funcionario ----
  await page.goto('http://localhost:3001/registrar', { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  const funcionarioTabVisible = await page.getByRole('button', { name: 'Funcionário' }).isVisible().catch(() => false)
  check('RegisterPage NAO mostra mais aba "Funcionário"', !funcionarioTabVisible)
  await screenshot(page, 'verify-1-registerpage')

  // ---- 2. Cadastrar funcionario com senha em FuncionariosPage cria login real ----
  await login(page, logger, 'dev-local@sgsm.local', 'Dev088c00c5ba89!Aa')
  await page.goto('http://localhost:3001/funcionarios', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)

  const cpf = genValidCPF(Date.now() % 90000 + 3)
  const email = `verify-func-${Date.now()}@teste.local`
  const senha = 'SenhaValida123'

  await page.getByRole('button', { name: /Novo Funcionário/ }).click()
  await page.locator('h2').filter({ hasText: 'Novo Funcionário' }).waitFor({ state: 'visible' })
  await page.getByLabel('Nome *').fill('Verificacao Fix Registro')
  await page.getByLabel('CPF *').type(cpf, { delay: 5 })
  await page.getByLabel('Cargo *').fill('QA')
  await page.getByLabel('E-mail *').fill(email)
  // seleciona o primeiro estabelecimento disponivel
  const select = page.locator('select#estabelecimento\\ \\*, select').filter({ has: page.locator('option') }).first()
  const options = await page.locator('select').last().locator('option').allTextContents()
  await page.locator('select').last().selectOption({ index: 1 })
  await page.getByLabel('Senha de acesso *').fill(senha)

  const [registrarResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/auth/registrar-staff'), { timeout: 10000 }),
    page.getByRole('button', { name: 'Salvar' }).click(),
  ])
  check('POST /auth/registrar-staff retornou 201 ao cadastrar funcionario', registrarResp.status() === 201)
  await screenshot(page, 'verify-2-funcionario-cadastrado')

  // confirma que o login realmente funciona
  await page.locator('button:has-text("Sair")').first().click({ force: true })
  await page.waitForTimeout(500)
  await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle' })
  await login(page, logger, email, senha)
  const onPacientes = page.url().includes('/pacientes')
  check('Login do funcionario recem-criado funciona (redirecionou pra /pacientes)', onPacientes)
  await screenshot(page, 'verify-3-login-funcionario-novo')

  logger.flushAll('verify-registro-fix')
} catch (e) {
  console.error('SCRIPT ERROR', e)
  falhas.push('erro de script: ' + e.message)
  logger.flushAll('verify-registro-fix-erro')
} finally {
  await browser.close()
  console.log('\n=== RESULTADO ===')
  if (falhas.length === 0) console.log('TUDO OK')
  else { console.log('FALHAS:', falhas); process.exitCode = 1 }
}
