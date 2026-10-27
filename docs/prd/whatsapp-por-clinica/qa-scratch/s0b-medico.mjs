// SETUP (parte 2) — DEV cadastra um MEDICO de QA em /medicos; a senha e criada pelo link do convite
// (token do convite lido no banco no papel do medico abrindo o proprio e-mail; gravado mascarado).
// Inclui tambem o PACIENTE de QA ja existente (rodada 11, conta ativada) no contas.json.
import fs from 'node:fs'
import * as L from './lib.mjs'

const CONTAS = new URL('./contas.json', import.meta.url)
const contas = JSON.parse(fs.readFileSync(CONTAS))
const save = () => fs.writeFileSync(CONTAS, JSON.stringify(contas, null, 2))
const stamp = Date.now()
const LETRAS = 'abcdefghij'
const s = String(stamp).slice(-6).split('').map((d) => LETRAS[Number(d)]).join('')
const M = { perfil: 'MEDICO', nome: `QA WA Medico ${s[0].toUpperCase()}${s.slice(1)}`, crm: String(stamp).slice(-7), crmUf: 'SP', especialidade: 'Cardiologia', email: `qa.wa.medico.${stamp}@teste.com`, senha: process.env.QA_SENHA }

const browser = await L.launch()
try {
  L.start('SETUP-MEDICO')
  const D = await L.newSession(browser, 'DEV')
  const p = D.page
  await L.login(p, L.DEV_EMAIL, L.DEV_SENHA)
  await p.getByRole('link', { name: 'Médicos' }).first().click()
  await p.waitForURL('**/medicos')
  await p.getByRole('button', { name: 'Novo Médico' }).click()
  const m = L.modal(p)
  await m.getByLabel('Nome completo').waitFor()
  await L.sleep(1200)
  await m.getByLabel('Nome completo').fill(M.nome)
  await m.getByLabel('CRM', { exact: true }).fill(M.crm)
  await m.getByLabel('Especialidade').selectOption(M.especialidade)
  await m.getByLabel('E-mail').fill(M.email)
  const i0 = L.LINES.length
  const wCad = p.waitForResponse((r) => r.url().endsWith('/v1/api/medicos') && r.request().method() === 'POST', { timeout: 20000 })
  const wConv = p.waitForResponse((r) => r.url().includes('/convite-acesso') && r.request().method() === 'POST', { timeout: 30000 }).catch(() => null)
  await m.getByRole('button', { name: 'Salvar' }).click()
  const rc = await wCad
  M.id = (await rc.json().catch(() => ({}))).id
  const rv = await wConv
  await L.sleep(800)
  L.note(`POST /medicos -> ${rc.status()} id=${M.id} | convite-acesso -> ${rv ? rv.status() : 'nao chamado'} | toasts=${JSON.stringify(await L.toasts(p))} | ${JSON.stringify(L.respostas(i0))}`)
  contas.MEDICO = M; save()

  const tok = L.tokenConvite(M.email)
  const S = await L.newSession(browser, 'MEDICO')
  const q = S.page
  await q.goto(L.linkConvite(tok))
  await q.getByLabel('Nova senha', { exact: true }).fill(M.senha)
  await q.getByLabel('Confirmar nova senha').fill(M.senha)
  const i1 = L.LINES.length
  await q.getByRole('button', { name: 'Criar senha', exact: true }).click()
  await q.waitForURL((u) => u.pathname === '/login', { timeout: 15000 }).catch(() => {})
  await L.sleep(800)
  L.note(`senha pelo link -> ${JSON.stringify(L.respostas(i1))} | url=${q.url()}`)
  await L.shot(q, 'SETUP-MEDICO-senha-criada')

  contas.PACIENTE = { perfil: 'PACIENTE', nome: 'QA Paciente R11 Conta 23181', email: 'qa.conflito.pac.r11.conta.1792353623181@teste.com', senha: process.env.QA_SENHA, origem: 'conta existente da rodada 11 (conflito-agendamento)' }
  save()
  await L.end('SETUP-MEDICO', 'medico de QA criado pelo DEV; senha criada pelo link do convite (token mascarado)')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally {
  L.saveAll('s0b')
  await browser.close()
}
