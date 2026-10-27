// SETUP — pela UI, logado como DESENVOLVEDOR: cria as contas de teste do QA "WhatsApp por clinica".
//   ADM-A  = ADMIN_ESTABELECIMENTO so da Clinica São Lucas (655759aa)
//   ADM-B  = ADMIN_ESTABELECIMENTO so da Clinica Teste Strix (36a7eb52)
//   ADM-AB = ADMIN_ESTABELECIMENTO das duas (WA-T08)
//   FUNC-A = FUNCIONARIO da Clinica São Lucas
// Sem mock, sem page.route. Grava qa-scratch/contas.json (gitignored).
import fs from 'node:fs'
import * as L from './lib.mjs'

const CONTAS = new URL('./contas.json', import.meta.url)
const contas = fs.existsSync(CONTAS) ? JSON.parse(fs.readFileSync(CONTAS)) : {}
const save = () => fs.writeFileSync(CONTAS, JSON.stringify(contas, null, 2))
const SENHA = process.env.QA_SENHA
const stamp = Date.now()
const cards = (p, t) => p.locator('div.grid > div').filter({ hasText: t })

const browser = await L.launch()
try {
  L.start('SETUP')
  const D = await L.newSession(browser, 'DEV')
  const p = D.page
  await L.login(p, L.DEV_EMAIL, L.DEV_SENHA)

  // ── administradores ──
  const defs = [
    { k: 'ADM_A', rot: 'Admin A', clinicas: ['Clinica São Lucas'] },
    { k: 'ADM_B', rot: 'Admin B', clinicas: ['Clinica Teste Strix'] },
    { k: 'ADM_AB', rot: 'Admin Duas', clinicas: ['Clinica São Lucas', 'Clinica Teste Strix'] },
  ]
  let n = 0
  for (const d of defs) {
    if (contas[d.k]) { L.note(`${d.k} ja existe: ${contas[d.k].email}`); continue }
    n++
    await p.getByRole('link', { name: 'Administradores' }).first().click()
    await p.waitForURL('**/administradores')
    await L.sleep(1200)
    const A = { perfil: 'ADMIN_ESTABELECIMENTO', nome: `QA WA ${d.rot} ${String(stamp).slice(-5)}`, cpf: L.gerarCpf((Math.floor(stamp / 13) + 4111 * n) % 1_000_000_000), email: `qa.wa.${d.k.toLowerCase().replace('_', '')}.${stamp}@teste.com`, senha: SENHA, clinicas: d.clinicas }
    await p.getByRole('button', { name: 'Novo Administrador' }).click()
    let m = L.modal(p)
    await m.getByLabel('Nome *').fill(A.nome)
    await m.getByLabel('CPF *').fill(A.cpf)
    await m.getByLabel('E-mail *').fill(A.email)
    await m.getByLabel('Senha de acesso *').fill(A.senha)
    const i0 = L.LINES.length
    const wStaff = p.waitForResponse((r) => r.url().includes('registrar-staff'), { timeout: 20000 }).catch(() => null)
    await m.getByRole('button', { name: 'Salvar' }).click()
    const rs = await wStaff
    await p.locator('[data-sonner-toast]').first().waitFor({ timeout: 8000 }).catch(() => {})
    await L.sleep(800)
    L.note(`cadastro ${d.k} -> ${JSON.stringify(L.respostas(i0))} | registrar-staff=${rs ? rs.status() : 'nao chamado'} | toasts=${JSON.stringify(await L.toasts(p))}`)
    contas[d.k] = A; save()
    await L.esperarToastsSumirem(p)
    await p.getByPlaceholder('Buscar por nome, CPF ou e-mail…').fill(A.email)
    await L.sleep(1500)
    const cAdm = cards(p, A.email).first()
    await cAdm.getByTitle('Gerenciar estabelecimentos administrados').click()
    m = L.modal(p)
    await m.getByText('Clinica São Lucas').first().waitFor({ timeout: 15000 })
    for (const c of d.clinicas) await m.locator('label').filter({ hasText: c }).first().locator('input[type=checkbox]').check()
    const wv = p.waitForResponse((r) => r.url().includes('/administradores/') && r.request().method() !== 'GET', { timeout: 15000 })
    await m.getByRole('button', { name: 'Salvar Vínculos' }).click()
    const rv = await wv
    await L.sleep(1200)
    L.note(`vinculos ${d.k} -> ${rv.request().method()} ${rv.url()} -> ${rv.status()} body=${rv.request().postData()}`)
    await L.shot(p, `SETUP-${d.k}`)
    await L.esperarToastsSumirem(p)
  }

  // ── funcionario da Clinica São Lucas ──
  if (!contas.FUNC_A) {
    await p.getByRole('link', { name: 'Funcionários' }).first().click()
    await p.waitForURL('**/funcionarios')
    await p.getByRole('button', { name: 'Novo Funcionário' }).waitFor()
    const F = { perfil: 'FUNCIONARIO', nome: `QA WA Secretaria A ${String(stamp).slice(-5)}`, cpf: L.gerarCpf((Math.floor(stamp / 7) + 98765) % 1_000_000_000), email: `qa.wa.func.a.${stamp}@teste.com`, senha: SENHA, clinicas: ['Clinica São Lucas'] }
    await p.getByRole('button', { name: 'Novo Funcionário' }).click()
    const m = L.modal(p)
    await m.getByLabel('Nome *').fill(F.nome)
    await m.getByLabel('CPF *').fill(F.cpf)
    await m.getByLabel('Cargo *').fill('Secretaria')
    await m.getByLabel('E-mail *').fill(F.email)
    await m.getByLabel('Estabelecimento *').selectOption({ label: 'Clinica São Lucas' })
    await m.getByLabel('Senha de acesso *').fill(F.senha)
    const i0 = L.LINES.length
    const respS = p.waitForResponse((r) => r.url().includes('/auth/registrar-staff'), { timeout: 20000 }).catch(() => null)
    await m.getByRole('button', { name: 'Salvar' }).click()
    const rs = await respS
    await p.locator('[data-sonner-toast]').first().waitFor({ timeout: 10000 }).catch(() => {})
    await L.sleep(800)
    L.note(`cadastro FUNC_A -> ${JSON.stringify(L.respostas(i0))} | registrar-staff=${rs ? rs.status() : 'nao chamado'} | toasts=${JSON.stringify(await L.toasts(p))}`)
    contas.FUNC_A = F; save()
    await L.shot(p, 'SETUP-FUNC_A')
  }
  await L.end('SETUP', 'contas de teste criadas pelo DEV pela UI (senhas mascaradas)')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally {
  L.saveAll('s0')
  await browser.close()
}
