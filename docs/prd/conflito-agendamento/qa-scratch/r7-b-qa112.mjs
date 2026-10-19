// RODADA 7 — QA112 pela TELA. Uso: node r7-b-qa112.mjs fora   (auth parado: cria dados D e tenta)
//                                   node r7-b-qa112.mjs volta  (auth de volta: mesmos CPF e e-mail)
import * as L from './lib5.mjs'
import * as C from './r7-common.mjs'
const fase = process.argv[2]
const browser = await L.launch()
try {
  const S = await L.newSession(browser, 'ANON-112-' + fase)
  const p = S.page
  L.start(`QA112-r7-${fase}`)
  let D = C.r7.pacientes.find((x) => x.rotulo === 'D')
  if (!D) { D = C.novoPaciente7('D'); D.origem = 'QA112'; D.status = 'nao criado (auth fora)'; C.r7.pacientes.push(D); C.save7() }
  L.note(`dados D: nome=${D.nome} cpf=${D.cpf} email=${D.email}`)
  const health = await fetch('http://localhost:8091/actuator/health').then((r) => r.status).catch((e) => 'conexao recusada: ' + (e.cause?.code || e.message))
  L.note(`auth de QA :8091 /actuator/health -> ${health}`)
  await p.goto(L.BASE + '/registrar')
  await C.preencherPaciente(p, D, { senha: C.SENHA7 })
  await L.shot(p, `QA112-r7-${fase === 'fora' ? 'a' : 'b'}0-form`)
  const i0 = await C.criarConta(p)
  await L.sleep(800)
  const t = await L.toasts(p)
  L.note(`[${fase}] respostas=${JSON.stringify(L.respostas(i0))} | corpo publico/pacientes=${C.corpoDe(i0, /publico\/pacientes/)}`)
  L.note(`[${fase}] toasts=${JSON.stringify(t)} | url=${p.url()} | heading "Ative sua conta"=${await p.getByRole('heading', { name: 'Ative sua conta' }).count()} | botao "Criar conta" visivel=${await p.getByRole('button', { name: 'Criar conta' }).isVisible().catch(() => false)}`)
  C.contar7(i0, 'QA112 ' + fase)
  await L.shot(p, fase === 'fora' ? 'QA112-r7-a-auth-fora' : 'QA112-r7-b-auth-de-volta')
  if (fase === 'volta' && C.corpoDe(i0, /publico\/pacientes/).includes('ativacaoPendente')) { D.status = 'pendente'; C.save7() }
  await L.end(`QA112-r7-${fase}`)
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally {
  L.saveAll('r7-b-' + fase)
  await browser.close()
}
