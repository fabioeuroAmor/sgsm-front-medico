// RODADA 6 — preparacao pela UI como DEV: reativa SEC-A (/funcionarios), cria admin de QA com login e vincula
// Clinica São Lucas + Clinica Teste Strix (/administradores), cadastra medico M0 sem clinica (/medicos, para o QA129).
import * as L from './lib5.mjs'
import * as C from './r6-common.mjs'
const browser = await L.launch()
const cards = (p, t) => p.locator('div.grid > div').filter({ hasText: t })
try {
  L.start('SETUP-r6')
  const D = await L.newSession(browser, 'DEV')
  const p = D.page
  await L.login(p, C.DEV_EMAIL, C.DEV_SENHA)

  // ── SEC-A ──
  await C.irFuncionarios(p)
  await p.locator('select').nth(1).selectOption('').catch(() => {})
  await L.sleep(1500)
  const ca = cards(p, C.contas.A.email).first()
  L.note(`SEC-A antes: ${(await ca.innerText()).replace(/\n/g, ' | ')}`)
  if ((await ca.innerText()).includes('Inativo')) {
    const w = p.waitForResponse((r) => r.url().includes('/funcionarios/') && r.request().method() !== 'GET')
    await ca.getByRole('button', { name: /Reativar/ }).click()
    const r = await w
    await L.sleep(1500)
    L.note(`reativar SEC-A -> ${r.request().method()} ${r.url()} -> ${r.status()} | toasts=${JSON.stringify(await L.toasts(p))}`)
  }
  L.note(`SEC-A depois: ${(await cards(p, C.contas.A.email).first().innerText()).replace(/\n/g, ' | ')}`)
  await L.shot(p, 'SETUP-r6-a-SEC-A-reativada')

  // ── admin de QA ──
  await p.getByRole('link', { name: 'Administradores' }).first().click()
  await p.waitForURL('**/administradores')
  await L.sleep(1500)
  const stamp = Date.now()
  const A = { nome: `QA Admin Rseis ${String(stamp).slice(-5)}`, cpf: L.gerarCpf((Math.floor(stamp / 11) + 777) % 1_000_000_000), email: `qa.conflito.adm.r6.${stamp}@teste.com`, senha: 'QaAdmR6#2026x' }
  await p.getByRole('button', { name: 'Novo Administrador' }).click()
  let m = L.modal(p)
  await m.getByLabel('Nome *').fill(A.nome)
  await m.getByLabel('CPF *').fill(A.cpf)
  await m.getByLabel('E-mail *').fill(A.email)
  await m.getByLabel('Senha de acesso *').fill(A.senha)
  await L.shot(p, 'SETUP-r6-b-admin-form')
  let i0 = L.LINES.length
  const wStaff = p.waitForResponse((r) => r.url().includes('registrar-staff'), { timeout: 20000 }).catch(() => null)
  await m.getByRole('button', { name: 'Salvar' }).click()
  const rs = await wStaff
  await p.locator('[data-sonner-toast]').first().waitFor({ timeout: 8000 }).catch(() => {})
  await L.sleep(800)
  L.note(`cadastro admin -> ${JSON.stringify(L.respostas(i0))} | registrar-staff=${rs ? rs.status() : 'nao chamado'} | toasts=${JSON.stringify(await L.toasts(p))}`)
  const adminResp = L.LINES.slice(i0).find((l) => /<< 201 POST .*\/administradores /.test(l))
  A.id = adminResp ? (adminResp.match(/"id":"([^"]+)"/) || [])[1] : undefined
  C.r6.admins.push(A); C.save6()
  await p.getByPlaceholder('Buscar por nome, CPF ou e-mail…').fill(A.email)
  await L.sleep(1500)
  const cAdm = cards(p, A.email).first()
  await cAdm.getByTitle('Gerenciar estabelecimentos administrados').click()
  m = L.modal(p)
  await m.getByText('Clinica São Lucas').first().waitFor({ timeout: 15000 })
  L.note(`estabelecimentos no modal: ${JSON.stringify((await m.locator('label').allInnerTexts()).map((t) => t.replace(/\n/g, ' ')))}`)
  await m.locator('label').filter({ hasText: 'Clinica São Lucas' }).first().locator('input[type=checkbox]').check()
  await m.locator('label').filter({ hasText: 'Clinica Teste Strix' }).first().locator('input[type=checkbox]').check()
  await L.shot(p, 'SETUP-r6-c-admin-duas-clinicas')
  i0 = L.LINES.length
  const wv = p.waitForResponse((r) => r.url().includes('/administradores/') && r.request().method() !== 'GET', { timeout: 15000 })
  await m.getByRole('button', { name: 'Salvar Vínculos' }).click()
  const rv = await wv
  await L.sleep(1500)
  L.note(`vinculos do admin -> ${rv.request().method()} ${rv.url()} -> ${rv.status()} body=${rv.request().postData()}`)
  // confere reabrindo o modal
  await cAdm.getByTitle('Gerenciar estabelecimentos administrados').click()
  m = L.modal(p)
  await L.sleep(2000)
  L.note(`admin: estabelecimentos marcados ao reabrir: ${JSON.stringify((await m.locator('label').filter({ has: p.locator('input:checked') }).allInnerTexts()).map((t) => t.replace(/\n/g, ' ')))}`)
  await L.shot(p, 'SETUP-r6-d-admin-vinculos-reaberto')
  await m.getByRole('button', { name: 'Cancelar' }).click()
  await L.sleep(600)

  // ── M0: medico cadastrado pelo DEV, sem clinica (para QA129) ──
  await C.irMedicos(p)
  const M0 = C.novoMedico6('Zero')
  const { m: mm, temEstab } = await C.abrirNovoMedico(p, 'Zero (DEV)')
  await C.preencherMedico(mm, M0)
  const r0 = await C.salvarMedico(p, mm, M0, 'Zero (DEV)')
  M0.criadoPor = 'DEV (sem clinica)'; C.save6()
  await L.shot(p, 'SETUP-r6-e-M0-DEV')
  L.note(`M0 criado pelo DEV: ${JSON.stringify(r0)} | campo Estabelecimento para DEV=${temEstab}`)
  await L.end('SETUP-r6', 'DEV, pela UI')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally {
  L.saveAll('r6-a')
  await browser.close()
}
