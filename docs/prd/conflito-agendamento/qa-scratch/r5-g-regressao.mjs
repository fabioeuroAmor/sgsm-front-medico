// RODADA 5 — regressao: QA094 (senha errada), reativacao de SEC-A (DEV /funcionarios), QA042 cenario "sem tokens" (SEC-A),
// cadastro de paciente pela secretaria em /pacientes (POST /v1/api/pacientes, outro endpoint)
import fs from 'node:fs'
import * as L from './lib5.mjs'
import * as C from './r5-common.mjs'
const contas = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const DEV_EMAIL = 'dev-local@sgsm.local', DEV_SENHA = 'Dev088c00c5ba89!Aa'
const browser = await L.launch()
try {
  // ── QA094 ──
  L.start('QA094-r5')
  const an = await L.newSession(browser, 'ANON-094')
  await an.page.goto(L.BASE + '/login')
  await an.page.getByLabel('E-mail').fill(DEV_EMAIL)
  await an.page.getByLabel('Senha').fill('SenhaErrada123!')
  await an.page.getByRole('button', { name: 'Entrar' }).click()
  await an.page.locator('[data-sonner-toast]').first().waitFor({ timeout: 10000 }).catch(() => {})
  await L.sleep(800)
  await L.shot(an.page, 'QA094-r5')
  L.note('URL: ' + an.page.url() + ' | toasts=' + JSON.stringify(await L.toasts(an.page)) + ' | "Request failed": ' + (await an.page.getByText(/Request failed/).count()) + ' | "Sua sessão expirou" visivel: ' + await an.page.getByText('Sua sessão expirou').isVisible().catch(() => false))
  await L.end('QA094-r5')
  await an.ctx.close()

  // ── reativa SEC-A ──
  L.start('SETUP-r5')
  const dev = await L.newSession(browser, 'DEV')
  const p = dev.page
  await L.login(p, DEV_EMAIL, DEV_SENHA)
  await p.getByRole('link', { name: 'Funcionários' }).first().click()
  await p.waitForURL('**/funcionarios')
  await p.getByPlaceholder('Buscar por nome, CPF, cargo ou e-mail…').fill('qa.conflito')
  await L.sleep(2000)
  let cardA = p.locator('div.grid > div').filter({ hasText: contas.A.email }).first()
  L.note('card SEC-A antes: ' + (await cardA.innerText()).replace(/\n/g, ' | '))
  if ((await cardA.innerText()).includes('Inativo')) {
    const w = p.waitForResponse((r) => r.url().includes('/funcionarios/') && ['PATCH', 'PUT', 'POST'].includes(r.request().method()))
    await cardA.getByRole('button', { name: /Reativar/ }).click()
    const r = await w
    L.note(`reativar ${contas.A.email}: ${r.request().method()} ${r.url()} -> ${r.status()}`)
    await L.sleep(1500)
  } else L.note('SEC-A ja estava ativa')
  L.note('card SEC-A depois: ' + (await p.locator('div.grid > div').filter({ hasText: contas.A.email }).first().innerText()).replace(/\n/g, ' | '))
  await L.shot(p, 'SETUP-r5-SEC-A-reativada')
  await L.end('SETUP-r5')
  await dev.ctx.close()

  // ── QA042 sem tokens ──
  L.start('QA042-r5')
  const S = await L.newSession(browser, 'SEC-A')
  const pa = S.page
  await L.login(pa, contas.A.email, contas.A.senha)
  await L.irAgendamentos(pa)
  await L.wizardAte4(pa)
  await L.shot(pa, 'QA042-r5-a-passo4')
  let i0 = L.LINES.length
  await pa.evaluate(async () => { const m = await import('/src/services/tokenStore.ts'); m.tokenStore.clear(); localStorage.removeItem('refresh_token') })
  L.note('estado: ' + await pa.evaluate(async () => { const m = await import('/src/services/tokenStore.ts'); return `access=${m.tokenStore.get() === null ? 'null' : 'presente'} refresh_token=${localStorage.getItem('refresh_token') === null ? 'ausente' : 'presente'}` }))
  await L.slotBtn(pa, '09:00').click()
  const ok = await pa.waitForURL('**/login**', { timeout: 15000 }).then(() => true).catch(() => false)
  await L.sleep(1500)
  const lin = L.LINES.slice(i0)
  L.note(`redirecionou=${ok} | url=${pa.url()} | alerta=${JSON.stringify(await pa.getByRole('alert').allTextContents())} | respostas reservas=${JSON.stringify(lin.filter((l) => /<< \d+ POST .*\/reservas /.test(l)).map((l) => l.match(/<< (\d+)/)[1]))} | /auth/refresh=${lin.filter((l) => />> POST .*\/auth\/refresh/.test(l)).length}`)
  await L.shot(pa, 'QA042-r5-b-login')
  await L.login(pa, contas.A.email, contas.A.senha)
  await L.irAgendamentos(pa)
  await L.wizardAte4(pa)
  L.note(`apos novo login: title do 09:00=${await L.slotBtn(pa, '09:00').getAttribute('title').catch(() => 'sem botao')} | faixa=${await L.faixaReserva(pa).isVisible()} | selecionados=${JSON.stringify(await L.modal(pa).locator('div.grid.grid-cols-3 > button.bg-primary\\/10').allTextContents())}`)
  await L.shot(pa, 'QA042-r5-c-relogado')
  await L.fecharModal(pa)
  await L.end('QA042-r5', 'cenario sem tokens (access e refresh removidos), SEC-A')

  // ── cadastro de paciente pela secretaria ──
  L.start('REG-PAC-SEC-r5')
  await pa.getByRole('link', { name: 'Pacientes' }).first().click()
  await pa.waitForURL('**/pacientes')
  await pa.getByRole('button', { name: 'Novo Paciente' }).click()
  const m = L.modal(pa)
  await m.getByText('Novo Paciente').first().waitFor()
  const N = C.novoPaciente('Sec')
  await m.getByLabel('Nome completo').fill(N.nome)
  await m.getByLabel('CPF').fill(N.cpf)
  await m.getByLabel('Data de nascimento').fill('1979-11-03')
  await m.locator('input[type=checkbox]').check()
  await m.getByLabel('E-mail').fill(N.email)
  await L.shot(pa, 'REG-PAC-SEC-r5-a-form')
  i0 = L.LINES.length
  const w = pa.waitForResponse((r) => /\/v1\/api\/pacientes$/.test(r.url()) && r.request().method() === 'POST', { timeout: 20000 })
  await m.getByRole('button', { name: 'Salvar' }).click()
  const r = await w.catch(() => null)
  await pa.locator('[data-sonner-toast]').first().waitFor({ timeout: 8000 }).catch(() => {})
  await L.sleep(1500)
  L.note(`POST /v1/api/pacientes -> ${r ? r.status() : 'sem resposta'} | toasts=${JSON.stringify(await L.toasts(pa))} | respostas=${JSON.stringify(L.respostas(i0))}`)
  await pa.getByPlaceholder('Buscar por nome, CPF ou e-mail…').fill(N.nome)
  await L.sleep(1500)
  L.note(`card na lista: ${JSON.stringify((await pa.locator('div.grid > div').filter({ hasText: N.nome }).allInnerTexts()).map((t) => t.replace(/\n/g, ' | ')))}`)
  await L.shot(pa, 'REG-PAC-SEC-r5-b-lista')
  if (r && r.status() === 201) { C.r5.pacientes.push({ ...N, origem: 'secretaria SEC-A em /pacientes', status: 'criado' }); C.save() }
  await L.end('REG-PAC-SEC-r5')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split(String.fromCharCode(10))[0]) } finally {
  L.saveAll('r5-g')
  await browser.close()
}
