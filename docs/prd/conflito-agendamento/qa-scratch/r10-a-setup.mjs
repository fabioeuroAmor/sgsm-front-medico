// RODADA 10 — preparacao pela UI: DEV reativa SEC-A (/funcionarios); paciente de QA novo pelo /registrar (anonimo)
// e ativado com o codigo de ativacao (excecao autorizada: leitura no Redis no papel do paciente lendo o proprio e-mail).
// Sem mock, sem page.route. (A tentativa 1 da rodada 9, interrompida, foi descartada.)
import fs from 'node:fs'
import * as L from './lib5.mjs'
import * as C from './r5-common.mjs'
const R10 = new URL('./contas-r10.json', import.meta.url)
const r10 = fs.existsSync(R10) ? JSON.parse(fs.readFileSync(R10)) : { pacientes: [], agendamentos: [] }
const save10 = () => fs.writeFileSync(R10, JSON.stringify(r10, null, 2))
const SENHA10 = 'QaRodada10#2026'
const browser = await L.launch()
const cards = (p, t) => p.locator('div.grid > div').filter({ hasText: t })
try {
  L.start('SETUP-r10')
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
  await L.shot(p, 'SETUP-r10-a-SEC-A-reativada')
  await D.ctx.close()

  const stamp = Date.now()
  const P = { rotulo: 'WA', nome: `QA Paciente R10 Conta ${String(stamp).slice(-5)}`, cpf: L.gerarCpf((Math.floor(stamp / 17) + 929321) % 1_000_000_000), email: `qa.conflito.pac.r10.conta.${stamp}@teste.com`, nascimento: '1991-04-15' }
  const S = await L.newSession(browser, 'ANON-R10')
  const q = S.page
  await q.goto(L.BASE + '/registrar')
  await q.getByLabel('Nome completo').waitFor()
  await C.preencherPaciente(q, P, { senha: SENHA10 })
  const i0 = await C.criarConta(q)
  L.note(`cadastro paciente R10 -> ${JSON.stringify(L.respostas(i0))} | toasts=${JSON.stringify(await L.toasts(q))} | url=${q.url()}`)
  P.status = 'pendente'; r10.pacientes.push(P); save10()
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
  await q.getByLabel('Senha').fill(SENHA10)
  const i1 = L.LINES.length
  await q.getByRole('button', { name: 'Entrar' }).click()
  await q.waitForURL((u) => u.pathname !== '/login', { timeout: 20000 }).catch(() => {})
  await L.sleep(2500)
  L.note(`login paciente R10 -> ${JSON.stringify(L.respostas(i1, /auth/))} | url=${q.url()}`)
  await L.shot(q, 'SETUP-r10-b-paciente-ativo-logado')
  P.status = 'ativada'; save10()
  await L.end('SETUP-r10', 'DEV reativa SEC-A; paciente R10 criado pelo /registrar e ativado (codigo lido no Redis, excecao autorizada)')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]); L.saveAll('r10-a') } finally {
  L.saveAll('r10-a')
  await browser.close()
}
