// RODADA 5 — helpers comuns (auto-cadastro de paciente e medicos), sem mock.
import fs from 'node:fs'
import * as L from './lib5.mjs'
export const R5 = new URL('./contas-r5.json', import.meta.url)
export const r5 = fs.existsSync(R5) ? JSON.parse(fs.readFileSync(R5)) : { pacientes: [], medicos: [], tentativasPublico: [] }
export const save = () => fs.writeFileSync(R5, JSON.stringify(r5, null, 2))
export const SENHA = 'QaRodada5#2026'
export const contas = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
export const DEV_EMAIL = 'dev-local@sgsm.local', DEV_SENHA = 'Dev088c00c5ba89!Aa'

export function novoPaciente(rotulo) {
  const stamp = Date.now() + Math.floor(Math.random() * 1000)
  const cpf = L.gerarCpf((Math.floor(stamp / 3) + 123456) % 1_000_000_000)
  return { rotulo, nome: `QA Paciente R5 ${rotulo} ${String(stamp).slice(-5)}`, cpf, email: `qa.conflito.pac.r5.${rotulo.toLowerCase()}.${stamp}@teste.com`, nascimento: '1988-06-21' }
}

const LETRAS = 'abcdefghij'
export function novoMedico(rotulo) {
  const stamp = Date.now()
  const sufixo = String(stamp).slice(-6).split('').map((d) => LETRAS[Number(d)]).join('')
  return { rotulo, nome: `QA Medico Rcinco ${rotulo} ${sufixo[0].toUpperCase()}${sufixo.slice(1)}`, crm: String(stamp).slice(-7), crmUf: 'SP', especialidade: 'Cardiologia', email: `qa.conflito.med.r5.${rotulo.toLowerCase()}.${stamp}@teste.com` }
}

export async function preencherPaciente(p, d, { senha = SENHA, confirmar = senha, lgpd = true } = {}) {
  await p.getByLabel('Nome completo').fill(d.nome)
  await p.locator('#cpf').fill(d.cpf)
  await p.locator('#data-de-nascimento').fill(d.nascimento)
  await p.getByLabel('E-mail', { exact: true }).fill(d.email)
  await p.getByLabel('Senha', { exact: true }).fill(senha)
  await p.getByLabel('Confirmar senha').fill(confirmar)
  const cb = p.locator('input[type=checkbox]')
  if (lgpd) await cb.check(); else await cb.uncheck()
}

export function contarPublico(desde, rotulo) {
  const lin = L.LINES.slice(desde).filter((l) => !l.includes('[NOTA]'))
  const reqs = lin.filter((l) => />> POST .*\/v1\/api\/publico\/pacientes/.test(l)).length
  const resps = lin.filter((l) => /<< \d+ POST .*\/v1\/api\/publico\/pacientes/.test(l)).map((l) => l.match(/<< (\d+)/)[1])
  for (const s of resps) r5.tentativasPublico.push({ rotulo, status: s, em: new Date().toISOString() })
  save()
  L.note(`[${rotulo}] POST /publico/pacientes requisicoes=${reqs} respostas=${JSON.stringify(resps)} | total acumulado na rodada=${r5.tentativasPublico.length}`)
  return { reqs, resps }
}

export async function criarConta(p, { esperar = true } = {}) {
  const i0 = L.LINES.length
  await p.getByRole('button', { name: 'Criar conta' }).click()
  if (esperar) {
    await Promise.race([
      p.getByRole('heading', { name: 'Ative sua conta' }).waitFor({ timeout: 20000 }),
      p.locator('[data-sonner-toast]').first().waitFor({ timeout: 20000 }),
    ]).catch(() => {})
    await L.sleep(1200)
  }
  return i0
}

export function corpoDe(desde, re) {
  const l = L.LINES.slice(desde).find((x) => re.test(x) && / << \d+ /.test(x))
  return l ? l.split('BODY=')[1] : '(sem resposta)'
}

// ─── medicos (/medicos) ───────────────────────────────────────────────────
export async function irMedicos(p) {
  await p.getByRole('link', { name: 'Médicos' }).first().click()
  await p.waitForURL('**/medicos')
  await p.getByRole('heading', { name: 'Médicos' }).waitFor()
  await L.sleep(1200)
}
export function cardMedico(p, texto) { return p.locator('div.grid > div').filter({ hasText: texto }).first() }
export async function buscarMedico(p, texto) {
  await p.getByPlaceholder('Buscar por nome, CRM ou e-mail…').fill(texto)
  await L.sleep(800)
}
export const envelope = (card) => card.getByRole('button', { name: /Enviar convite de acesso/ })

export async function irFuncionarios(p) {
  await p.getByRole('link', { name: 'Funcionários' }).first().click()
  await p.waitForURL('**/funcionarios')
  await p.getByPlaceholder('Buscar por nome, CPF, cargo ou e-mail…').fill('qa.conflito')
  await L.sleep(2000)
}
