// RODADA 4 — helpers comuns do auto-cadastro de paciente (/registrar), sem mock.
import fs from 'node:fs'
import * as L from './lib4.mjs'
export const R4 = new URL('./contas-r4.json', import.meta.url)
export const r4 = fs.existsSync(R4) ? JSON.parse(fs.readFileSync(R4)) : { pacientes: [], tentativasPublico: [] }
export const save = () => fs.writeFileSync(R4, JSON.stringify(r4, null, 2))
export const SENHA = 'QaRodada4#2026'

export function novoPaciente(rotulo) {
  const stamp = Date.now() + Math.floor(Math.random() * 1000)
  const cpf = L.gerarCpf(Math.floor(stamp / 7) % 1_000_000_000)
  return { rotulo, nome: `QA Paciente R4 ${rotulo} ${String(stamp).slice(-5)}`, cpf, email: `qa.conflito.pac.r4.${rotulo.toLowerCase()}.${stamp}@teste.com`, nascimento: '1987-05-14' }
}

export const toasts = (p) => p.locator('[data-sonner-toast]').allTextContents()

export async function esperarToastsSumirem(p) {
  await p.locator('[data-sonner-toast]').first().waitFor({ state: 'detached', timeout: 12000 }).catch(() => {})
}

export async function preencherPaciente(p, d, { senha = SENHA, confirmar = senha, lgpd = true } = {}) {
  await p.getByRole('button', { name: 'Paciente', exact: true }).click()
  await p.getByLabel('Nome completo').fill(d.nome)
  await p.locator('#cpf').fill(d.cpf)
  await p.locator('#data-de-nascimento').fill(d.nascimento)
  await p.getByLabel('E-mail', { exact: true }).fill(d.email)
  await p.getByLabel('Senha', { exact: true }).fill(senha)
  await p.getByLabel('Confirmar senha').fill(confirmar)
  const cb = p.locator('input[type=checkbox]')
  if (lgpd) await cb.check(); else await cb.uncheck()
}

// registra a tentativa (para a conta do limite por IP) a partir das linhas de rede
export function contarPublico(desde, rotulo) {
  const lin = L.LINES.slice(desde).filter((l) => !l.includes('[NOTA]'))
  const reqs = lin.filter((l) => />> POST .*\/v1\/api\/publico\/pacientes/.test(l)).length
  const resps = lin.filter((l) => /<< \d+ POST .*\/v1\/api\/publico\/pacientes/.test(l)).map((l) => l.match(/<< (\d+)/)[1])
  for (const s of resps) r4.tentativasPublico.push({ rotulo, status: s, em: new Date().toISOString() })
  save()
  L.note(`[${rotulo}] POST /publico/pacientes requisicoes=${reqs} respostas=${JSON.stringify(resps)} | total acumulado na rodada=${r4.tentativasPublico.length}`)
  return { reqs, resps }
}

export async function criarConta(p, rotulo, { esperar = true } = {}) {
  const i0 = L.LINES.length
  await p.getByRole('button', { name: 'Criar conta' }).click()
  if (esperar) {
    await Promise.race([
      p.getByRole('heading', { name: 'Ative sua conta' }).waitFor({ timeout: 20000 }),
      p.locator('[data-sonner-toast]').first().waitFor({ timeout: 20000 }),
    ]).catch(() => {})
    await L.sleep(1500)
  }
  return i0
}

export function respostas(desde, re = /\/v1\//) {
  return L.LINES.slice(desde).filter((l) => / << \d+ /.test(l) && re.test(l)).map((l) => l.match(/<< (\d+ \w+ \S+)/)[1])
}
