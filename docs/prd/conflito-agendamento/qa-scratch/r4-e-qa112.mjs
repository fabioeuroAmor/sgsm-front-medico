// RODADA 4 — QA112. Uso: node r4-e-qa112.mjs fora   (auth :8091 parado)  |  node r4-e-qa112.mjs volta  (auth de pe de novo)
import fs from 'node:fs'
import * as L from './lib4.mjs'
import * as C from './r4-common.mjs'
const fase = process.argv[2]
const browser = await L.launch()
try {
  L.start(`QA112-r4-${fase}`)
  let D = C.r4.pacientes.find((x) => x.rotulo === 'D')
  if (!D) { D = { ...C.novoPaciente('D'), origem: 'QA112 (/registrar)', status: 'nao criado' }; C.r4.pacientes.push(D); C.save() }
  const S = await L.newSession(browser, `ANON-112-${fase}`)
  const p = S.page
  await p.goto(L.BASE + '/registrar')
  await C.preencherPaciente(p, D)
  L.note(`dados (mesmos nas duas fases): cpf=${D.cpf} email=${D.email}`)
  const i0 = await C.criarConta(p, `QA112-${fase}`)
  await L.sleep(1000)
  const t = await C.toasts(p)
  const ativ = await p.getByRole('heading', { name: 'Ative sua conta' }).isVisible().catch(() => false)
  await L.shot(p, `QA112-r4-${fase === 'fora' ? 'a-auth-fora' : 'b-auth-de-volta'}`)
  L.note(`[${fase}] url=${p.url()} | etapa do codigo visivel=${ativ} | toasts=${JSON.stringify(t)} | respostas=${JSON.stringify(C.respostas(i0))}`)
  L.note(`[${fase}] falhas de rede no periodo=${JSON.stringify(L.LINES.slice(i0).filter((l) => l.includes('XX FAILED')))}`)
  C.contarPublico(i0, `QA112-${fase}`)
  if (fase === 'volta' && ativ) { D.status = 'pendente'; C.save() }
  await L.end(`QA112-r4-${fase}`)
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split(String.fromCharCode(10))[0]) } finally {
  L.saveAll(`r4-e-${fase}`)
  await browser.close()
}
