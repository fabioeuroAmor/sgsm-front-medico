// QA000 (criar secretarias), QA094 (login senha errada), QA062 (tentativa login MED)
import fs from 'node:fs'
import * as L from './lib.mjs'

function cpfValido(seed) {
  const d = String(seed).padStart(9, '0').slice(0, 9).split('').map(Number)
  const dv = (arr) => { let s = 0; for (let i = 0; i < arr.length; i++) s += arr[i] * (arr.length + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r }
  d.push(dv(d)); d.push(dv(d))
  return d.join('')
}

const stamp = Date.now()
const contas = {
  A: { nome: 'QA Secretaria A', email: `qa.conflito.seca.${stamp}@teste.com`, cpf: cpfValido(String(stamp).slice(-9)), senha: 'QaConflito#2026' },
  B: { nome: 'QA Secretaria B', email: `qa.conflito.secb.${stamp}@teste.com`, cpf: cpfValido(String(stamp + 7).slice(-9).split('').reverse().join('')), senha: 'QaConflito#2026' },
}
fs.writeFileSync(new URL('./contas.json', import.meta.url), JSON.stringify(contas, null, 2))

const browser = await L.launch()
const dev = await L.newSession(browser, 'DEV')
const p = dev.page

// QA094 primeiro: erro de senha de proposito com a conta DEV
L.start('QA094')
await p.goto(L.BASE + '/login')
await p.getByLabel('E-mail').fill('dev-local@sgsm.local')
await p.getByLabel('Senha').fill('SenhaErrada123!')
await p.getByLabel('Senha').press('Enter')
await p.getByText(/Credenciais|inválid|invalid/i).first().waitFor({ timeout: 10000 }).catch(() => {})
await L.sleep(500)
await L.shot(p, 'QA094')
L.note('Toast visivel: ' + JSON.stringify(await p.locator('[data-sonner-toast]').allTextContents()))
await L.end('QA094')

// QA000
L.start('QA000')
await L.login(p, 'dev-local@sgsm.local', 'Dev088c00c5ba89!Aa')
await p.getByRole('link', { name: 'Funcionários' }).first().click()
await p.waitForURL('**/funcionarios')
await p.getByRole('button', { name: 'Novo Funcionário' }).waitFor()
let i = 0
for (const k of ['A', 'B']) {
  const c = contas[k]
  await p.getByRole('button', { name: 'Novo Funcionário' }).click()
  const m = L.modal(p)
  await m.getByLabel('Nome *').fill(c.nome)
  if (k === 'A') {
    // erro de proposito: CPF invalido e senha curta
    await m.getByLabel('CPF *').fill('123.456.789-00')
    await m.getByLabel('Senha de acesso *').fill('curta')
    await m.getByRole('button', { name: 'Salvar' }).click()
    await L.sleep(400)
    await L.shot(p, 'QA000-a-erro-validacao')
    L.note('Erros de campo exibidos: ' + JSON.stringify(await m.locator('p.text-destructive').allTextContents()))
  }
  await m.getByLabel('CPF *').fill(c.cpf)
  await m.getByLabel('Cargo *').fill('Secretaria')
  await m.getByLabel('E-mail *').fill(c.email)
  await m.getByLabel('Estabelecimento *').selectOption({ label: 'Clinica São Lucas' })
  await m.getByLabel('Senha de acesso *').fill(c.senha)
  await L.shot(p, `QA000-${k === 'A' ? 'b' : 'd'}-form-${k}`)
  const respF = p.waitForResponse((r) => r.url().endsWith('/v1/api/funcionarios') && r.request().method() === 'POST')
  const respS = p.waitForResponse((r) => r.url().includes('/auth/registrar-staff'))
  await m.getByRole('button', { name: 'Salvar' }).click()
  const [rf, rs] = await Promise.all([respF, respS])
  L.note(`${k}: POST funcionarios ${rf.status()} / registrar-staff ${rs.status()}`)
  await p.locator('[data-sonner-toast]').first().waitFor({ timeout: 10000 })
  await L.sleep(300)
  await L.shot(p, `QA000-${k === 'A' ? 'c' : 'e'}-toast-${k}`)
  L.note('Toast: ' + JSON.stringify(await p.locator('[data-sonner-toast]').allTextContents()))
  await L.sleep(4500)
  i++
}
await p.getByPlaceholder('Buscar por nome, CPF, cargo ou e-mail…').fill('QA Secretaria')
await L.sleep(800)
await L.shot(p, 'QA000-f-lista')
await L.end('QA000', `contas: A=${contas.A.email} B=${contas.B.email} (senha mascarada)`)

// QA062 tentativa de login MED
const med = await L.newSession(browser, 'MED')
L.start('QA062')
await med.page.goto(L.BASE + '/login')
await med.page.getByLabel('E-mail').fill('fabioeuro@gmail.com')
await med.page.getByLabel('Senha').fill('famor966')
await med.page.getByRole('button', { name: 'Entrar' }).click()
await L.sleep(3000)
await L.shot(med.page, 'QA062')
L.note('URL apos login MED: ' + med.page.url() + ' toast=' + JSON.stringify(await med.page.locator('[data-sonner-toast]').allTextContents()))
await L.end('QA062')

L.saveAll('g0')
await browser.close()
