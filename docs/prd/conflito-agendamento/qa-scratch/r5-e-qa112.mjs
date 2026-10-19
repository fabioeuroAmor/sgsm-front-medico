// RODADA 5 — QA112. Uso: node r5-e-qa112.mjs fora (auth :8091 parado) | node r5-e-qa112.mjs volta (auth de pe de novo)
import * as L from './lib5.mjs'
import * as C from './r5-common.mjs'
const fase = process.argv[2]
const browser = await L.launch()
try {
  L.start(`QA112-r5-${fase}`)
  let D = C.r5.pacientes.find((x) => x.rotulo === 'D')
  if (!D) { D = { ...C.novoPaciente('D'), origem: 'QA112 (/registrar)', status: 'nao criado' }; C.r5.pacientes.push(D); C.save() }
  const S = await L.newSession(browser, `ANON-112-${fase}`)
  const p = S.page
  await p.goto(L.BASE + '/registrar')
  await C.preencherPaciente(p, D)
  L.note(`dados (mesmos nas duas fases): cpf=${D.cpf} email=${D.email}`)
  const i0 = await C.criarConta(p)
  await L.sleep(800)
  const t = await L.toasts(p)
  const ativ = await p.getByRole('heading', { name: 'Ative sua conta' }).isVisible().catch(() => false)
  await L.shot(p, `QA112-r5-${fase === 'fora' ? 'a-auth-fora' : 'b-auth-de-volta'}`)
  L.note(`[${fase}] url=${p.url()} | etapa do codigo visivel=${ativ} | toasts=${JSON.stringify(t)} | respostas=${JSON.stringify(L.respostas(i0))}`)
  L.note(`[${fase}] corpos: email-disponivel=${C.corpoDe(i0, /email-disponivel/)} | publico/pacientes=${C.corpoDe(i0, /publico\/pacientes/)}`)
  C.contarPublico(i0, `QA112-${fase}`)
  if (fase === 'volta' && ativ) { D.status = 'pendente'; C.save() }
  await L.end(`QA112-r5-${fase}`)
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally {
  L.saveAll(`r5-e-${fase}`)
  await browser.close()
}
