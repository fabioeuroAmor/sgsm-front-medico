// RODADA 3 — QA095: /registrar anonimo. (1) Medico -> espera ficar em /registrar com toast da clinica e nenhum medico criado.
// (2) Paciente pelo mesmo /registrar ate o fim (e-mail e CPF unicos, LGPD marcado) -> toast de sucesso e /login.
import fs from 'node:fs'
import * as L from './lib.mjs'
const R3 = new URL('./contas-r3.json', import.meta.url)
const r3 = fs.existsSync(R3) ? JSON.parse(fs.readFileSync(R3)) : {}
const save = () => fs.writeFileSync(R3, JSON.stringify(r3, null, 2))
const stamp = Date.now()
const SENHA = 'QaRodada3#' + String(stamp).slice(-4)

function gerarCpf(seed) {
  const d = String(seed).padStart(9, '0').slice(-9).split('').map(Number)
  if (d.every((x) => x === d[0])) d[8] = (d[8] + 1) % 10
  const dv = (arr) => { const len = arr.length; let s = 0; for (let i = 0; i < len; i++) s += arr[i] * (len + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r }
  d.push(dv(d)); d.push(dv(d))
  return d.join('')
}

const browser = await L.launch()
const anon = await L.newSession(browser, 'ANON')
const p = anon.page
const toasts = () => p.locator('[data-sonner-toast]').allTextContents()

// ── parte 1: Medico ────────────────────────────────────────────────────────
L.start('QA095-r3')
const nomeMed = `QA Medico R3 ${String(stamp).slice(-6)}`
const emailMed = `qa.conflito.med.r3.${stamp}@teste.com`
const crm = String(stamp + 7).slice(-6)
await p.goto(L.BASE + '/registrar')
L.note('contexto limpo: localStorage.refresh_token=' + (await p.evaluate(() => localStorage.getItem('refresh_token')) === null ? 'ausente' : 'presente') + ' | cookies=' + (await anon.ctx.cookies()).length)
await p.getByRole('button', { name: 'Médico', exact: true }).click()
await p.getByLabel('Nome completo').fill(nomeMed)
await p.getByLabel('CRM', { exact: true }).fill(crm)
await p.getByLabel('Especialidade').selectOption('Cardiologia')
await p.getByLabel('E-mail').fill(emailMed)
await p.getByLabel('Senha', { exact: true }).fill(SENHA)
await p.getByLabel('Confirmar senha').fill(SENHA)
await L.shot(p, 'QA095-r3-a-medico-form')
const iMed = L.LINES.length
await p.getByRole('button', { name: 'Criar conta' }).click()
await p.locator('[data-sonner-toast]').first().waitFor({ timeout: 15000 }).catch(() => {})
await L.sleep(3000)
await L.shot(p, 'QA095-r3-b-medico-resultado')
const linMed = L.LINES.slice(iMed)
L.note('[Medico] url final=' + p.url() + ' | toasts=' + JSON.stringify(await toasts()) + ' | alertas=' + JSON.stringify(await p.getByRole('alert').allTextContents()))
L.note('[Medico] "Sua sessão expirou" visivel: ' + await p.getByText('Sua sessão expirou').isVisible().catch(() => false) + ' | NAVIGATED no periodo: ' + JSON.stringify(linMed.filter((l) => l.includes('NAVIGATED')).map((l) => l.split('NAVIGATED: ')[1])))
L.note('[Medico] respostas /v1 no periodo: ' + JSON.stringify(linMed.filter((l) => / << \d+ /.test(l)).map((l) => l.match(/<< (\d+ \w+ \S+)/)[1])))
L.note('[Medico] campos ainda preenchidos: nome=' + await p.getByLabel('Nome completo').inputValue() + ' email=' + await p.getByLabel('E-mail').inputValue())
r3.medicoTentado = { nome: nomeMed, email: emailMed, crm, urlFinal: p.url() }
save()

// ── parte 2: Paciente pelo mesmo /registrar (mesma aba, sem recarregar) ───
const nomePac = `QA Paciente R3 ${String(stamp).slice(-6)}`
const emailPac = `qa.conflito.pac.r3.${stamp}@teste.com`
const cpf = gerarCpf(Math.floor(stamp / 1000) % 1_000_000_000)
await L.sleep(4000) // deixa o toast anterior sair
await p.getByRole('button', { name: 'Paciente', exact: true }).click()
await p.getByLabel('Nome completo').fill(nomePac)
await p.locator('#cpf').fill(cpf)
await p.locator('#data-de-nascimento').fill('1985-03-12')
await p.getByLabel('E-mail', { exact: true }).fill(emailPac)
await p.getByLabel('Senha', { exact: true }).fill(SENHA)
await p.getByLabel('Confirmar senha').fill(SENHA)
await p.locator('input[type=checkbox]').check()
L.note('[Paciente] url antes=' + p.url() + ' | CPF exibido=' + await p.locator('#cpf').inputValue() + ' | LGPD marcado=' + await p.locator('input[type=checkbox]').isChecked())
await L.shot(p, 'QA095-r3-c-paciente-form')
const iPac = L.LINES.length
async function enviarPaciente(pg, rotulo, nome, email) {
  const t = async () => pg.locator('[data-sonner-toast]').allTextContents()
  const i0 = L.LINES.length
  await pg.getByRole('button', { name: 'Criar conta' }).click()
  await Promise.race([
    pg.waitForURL((u) => u.pathname === '/login', { timeout: 20000 }),
    pg.locator('[data-sonner-toast]').filter({ hasNotText: 'O cadastro de médico' }).first().waitFor({ timeout: 20000 }),
  ]).catch(() => {})
  await L.sleep(500)
  const tst = await t()
  L.note(`[${rotulo}] url=${pg.url()} | redirecionou para /login: ${new URL(pg.url()).pathname === '/login'} | toasts=${JSON.stringify(tst)} | "Sua sessão expirou" visivel: ${await pg.getByText('Sua sessão expirou').isVisible().catch(() => false)}`)
  const lin = L.LINES.slice(i0)
  L.note(`[${rotulo}] respostas /v1 no periodo: ` + JSON.stringify(lin.filter((l) => / << \d+ /.test(l)).map((l) => l.match(/<< (\d+ \w+ \S+)/)[1])))
  const ok = lin.find((l) => /<< 201 POST .*\/v1\/api\/pacientes /.test(l))
  return { nome, email, id: ok ? (ok.match(/"id":"([0-9a-f-]{36})"/) || [])[1] : null, urlFinal: pg.url(), toasts: tst }
}
r3.paciente = { ...(await enviarPaciente(p, 'Paciente (mesma aba)', nomePac, emailPac)), cpf }
await L.shot(p, 'QA095-r3-d-paciente-resultado')
save()

// controle: Paciente em OUTRO contexto limpo, sem a tentativa de Medico antes (isola o efeito da parte 1)
const anon2 = await L.newSession(browser, 'ANON2')
const p2 = anon2.page
const nomePac2 = `QA Paciente R3b ${String(stamp).slice(-6)}`
const emailPac2 = `qa.conflito.pac.r3b.${stamp}@teste.com`
const cpf2 = gerarCpf((Math.floor(stamp / 1000) + 777) % 1_000_000_000)
await p2.goto(L.BASE + '/registrar')
await p2.getByLabel('Nome completo').fill(nomePac2)
await p2.locator('#cpf').fill(cpf2)
await p2.locator('#data-de-nascimento').fill('1990-07-20')
await p2.getByLabel('E-mail', { exact: true }).fill(emailPac2)
await p2.getByLabel('Senha', { exact: true }).fill(SENHA)
await p2.getByLabel('Confirmar senha').fill(SENHA)
await p2.locator('input[type=checkbox]').check()
L.note('[Paciente controle] tipo padrao da tela, CPF=' + await p2.locator('#cpf').inputValue() + ' | LGPD=' + await p2.locator('input[type=checkbox]').isChecked())
await L.shot(p2, 'QA095-r3-e-paciente-controle-form')
r3.pacienteControle = { ...(await enviarPaciente(p2, 'Paciente controle', nomePac2, emailPac2)), cpf: cpf2 }
await L.shot(p2, 'QA095-r3-f-paciente-controle-resultado')
save()

await L.end('QA095-r3', 'contexto anonimo novo; parte 1 Medico, parte 2 Paciente na mesma aba; controle Paciente em contexto limpo')
L.saveAll('r3-a')
await browser.close()
