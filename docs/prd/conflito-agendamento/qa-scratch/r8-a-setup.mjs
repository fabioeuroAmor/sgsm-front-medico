// RODADA 8 — preparacao pela UI: DEV reativa SEC-A (/funcionarios); paciente de QA novo pelo /registrar (anonimo)
// e ativado com o codigo (excecao autorizada: leitura no Redis no papel do paciente lendo o proprio e-mail). Sem mock.
import fs from 'node:fs'
import * as L from './lib5.mjs'
import * as C from './r5-common.mjs'
const R8 = new URL('./contas-r8.json', import.meta.url)
const r8 = fs.existsSync(R8) ? JSON.parse(fs.readFileSync(R8)) : { pacientes: [], agendamentos: [] }
const save8 = () => fs.writeFileSync(R8, JSON.stringify(r8, null, 2))
const SENHA8 = 'QaRodada8#2026'
const browser = await L.launch()
const cards = (p, t) => p.locator('div.grid > div').filter({ hasText: t })
try {
  L.start('SETUP-r8')
  const D = await L.newSession(browser, 'DEV')
  const p = D.page
  await L.login(p, C.DEV_EMAIL, C.DEV_SENHA)
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
  await L.shot(p, 'SETUP-r8-a-SEC-A-reativada')
  await D.ctx.close()

  // paciente de QA novo
  const stamp = Date.now()
  const P = { rotulo: 'WA', nome: `QA Paciente R8 WA ${String(stamp).slice(-5)}`, cpf: L.gerarCpf((Math.floor(stamp / 13) + 888321) % 1_000_000_000), email: `qa.conflito.pac.r8.wa.${stamp}@teste.com`, nascimento: '1991-04-15' }
  const S = await L.newSession(browser, 'ANON-R8')
  const q = S.page
  await q.goto(L.BASE + '/registrar')
  await q.getByLabel('Nome completo').waitFor()
  await C.preencherPaciente(q, P, { senha: SENHA8 })
  const i0 = await C.criarConta(q)
  L.note(`cadastro paciente R8 -> ${JSON.stringify(L.respostas(i0))} | toasts=${JSON.stringify(await L.toasts(q))} | url=${q.url()}`)
  P.status = 'pendente'; r8.pacientes.push(P); save8()
  await q.getByRole('heading', { name: 'Ative sua conta' }).waitFor({ timeout: 15000 })
  const cod = L.codigoRedis(P.email)
  await q.getByLabel('Código de ativação').fill(cod)
  const w = q.waitForResponse((r) => r.url().endsWith('/auth/ativar-conta') && r.request().method() === 'POST', { timeout: 15000 })
  await q.getByRole('button', { name: 'Ativar conta' }).click()
  const ra = await w.catch(() => null)
  await q.waitForURL((u) => u.pathname === '/login', { timeout: 10000 }).catch(() => {})
  L.note(`ativar-conta -> ${ra ? ra.status() : 'sem resposta'} | toasts=${JSON.stringify(await L.toasts(q))}`)
  await L.esperarToastsSumirem(q)
  await q.getByLabel('E-mail').fill(P.email)
  await q.getByLabel('Senha').fill(SENHA8)
  const i1 = L.LINES.length
  await q.getByRole('button', { name: 'Entrar' }).click()
  await q.waitForURL((u) => u.pathname !== '/login', { timeout: 20000 }).catch(() => {})
  await L.sleep(2500)
  L.note(`login paciente R8 -> ${JSON.stringify(L.respostas(i1, /auth/))} | url=${q.url()}`)
  await L.shot(q, 'SETUP-r8-b-paciente-ativo-logado')
  P.status = 'ativada'; save8()
  await L.end('SETUP-r8', 'DEV reativa SEC-A; paciente R8 criado pelo /registrar e ativado (codigo lido no Redis, excecao autorizada)')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally {
  L.saveAll('r8-a')
  await browser.close()
}
