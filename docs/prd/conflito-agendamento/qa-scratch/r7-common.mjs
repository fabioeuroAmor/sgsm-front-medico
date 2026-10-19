// RODADA 7 — helpers (reaproveita lib5, r5-common, r6-common); dados em contas-r7.json. Sem mock.
import fs from 'node:fs'
import * as L from './lib5.mjs'
export * from './r6-common.mjs'
export const R7 = new URL('./contas-r7.json', import.meta.url)
export const r7 = fs.existsSync(R7) ? JSON.parse(fs.readFileSync(R7)) : { pacientes: [], tentativasPublico: [] }
export const save7 = () => fs.writeFileSync(R7, JSON.stringify(r7, null, 2))
export const SENHA7 = 'QaRodada7#2026'

export function novoPaciente7(rotulo) {
  const stamp = Date.now() + Math.floor(Math.random() * 1000)
  const cpf = L.gerarCpf((Math.floor(stamp / 11) + 777123) % 1_000_000_000)
  return { rotulo, nome: `QA Paciente R7 ${rotulo} ${String(stamp).slice(-5)}`, cpf, email: `qa.conflito.pac.r7.${rotulo.toLowerCase()}.${stamp}@teste.com`, nascimento: '1990-09-09' }
}

export function contar7(desde, rotulo) {
  const lin = L.LINES.slice(desde).filter((l) => !l.includes('[NOTA]'))
  const reqs = lin.filter((l) => />> POST .*\/v1\/api\/publico\/pacientes/.test(l)).length
  const resps = lin.filter((l) => /<< \d+ POST .*\/v1\/api\/publico\/pacientes/.test(l)).map((l) => l.match(/<< (\d+)/)[1])
  const emailDisp = lin.filter((l) => /email-disponivel/.test(l)).length
  for (const s of resps) r7.tentativasPublico.push({ rotulo, status: s, em: new Date().toISOString() })
  save7()
  L.note(`[${rotulo}] linhas de rede com "email-disponivel"=${emailDisp} | >> POST /publico/pacientes=${reqs} respostas=${JSON.stringify(resps)} | total na rodada 7=${r7.tentativasPublico.length}`)
  return { reqs, resps, emailDisp }
}
