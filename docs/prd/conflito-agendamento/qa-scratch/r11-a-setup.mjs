// RODADA 11 — preparacao pela UI: paciente de QA novo pelo /registrar (anonimo) e ativado com o codigo de ativacao
// (excecao autorizada: leitura de auth:ativacao:codigo:<email> no Redis, no papel do paciente lendo o proprio e-mail).
// Sem mock, sem page.route.
import fs from 'node:fs'
import * as L from './lib5.mjs'
import * as C from './r5-common.mjs'
const R11 = new URL('./contas-r11.json', import.meta.url)
const r11 = fs.existsSync(R11) ? JSON.parse(fs.readFileSync(R11)) : { pacientes: [] }
const save = () => fs.writeFileSync(R11, JSON.stringify(r11, null, 2))
const SENHA = 'QaRodada11#2026'
const browser = await L.launch()
try {
  L.start('SETUP-r11')
  const stamp = Date.now()
  const P = { rotulo: 'WA', nome: `QA Paciente R11 Conta ${String(stamp).slice(-5)}`, cpf: L.gerarCpf((Math.floor(stamp / 17) + 931171) % 1_000_000_000), email: `qa.conflito.pac.r11.conta.${stamp}@teste.com`, nascimento: '1991-04-15' }
  const S = await L.newSession(browser, 'ANON-R11')
  const q = S.page
  await q.goto(L.BASE + '/registrar')
  await q.getByLabel('Nome completo').waitFor()
  await C.preencherPaciente(q, P, { senha: SENHA })
  const i0 = await C.criarConta(q)
  L.note(`cadastro paciente R11 -> ${JSON.stringify(L.respostas(i0))} | toasts=${JSON.stringify(await L.toasts(q))} | url=${q.url()}`)
  P.status = 'pendente'; r11.pacientes.push(P); save()
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
  await q.getByLabel('Senha').fill(SENHA)
  const i1 = L.LINES.length
  await q.getByRole('button', { name: 'Entrar' }).click()
  await q.waitForURL((u) => u.pathname !== '/login', { timeout: 20000 }).catch(() => {})
  await L.sleep(2500)
  L.note(`login paciente R11 -> ${JSON.stringify(L.respostas(i1, /auth/))} | url=${q.url()}`)
  await L.shot(q, 'SETUP-r11-paciente-ativo-logado')
  P.status = 'ativada'; save()
  await L.end('SETUP-r11', 'paciente R11 criado pelo /registrar e ativado (codigo lido no Redis, excecao autorizada)')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally {
  L.saveAll('r11-a')
  await browser.close()
}
