// RODADA 5 — QA112 complemento (auth :8091 parado): a tela parou no email-disponivel (servido pelo auth);
// aqui a mesma chamada que a tela faria em seguida, POST /publico/pacientes com os dados D, direto do navegador anonimo.
import * as L from './lib5.mjs'
import * as C from './r5-common.mjs'
const browser = await L.launch()
const D = C.r5.pacientes.find((x) => x.rotulo === 'D')
try {
  L.start('QA112-r5-fora-api')
  const S = await L.newSession(browser, 'ANON-112api')
  const p = S.page
  await p.goto(L.BASE + '/registrar')
  const i0 = L.LINES.length
  const r = await p.evaluate(async (d) => {
    const resp = await fetch('/v1/api/publico/pacientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: d.nome, cpf: d.cpf, dataNascimento: d.nascimento, email: d.email, consentimentoLgpd: true, senha: 'QaRodada5#2026' }) })
    return { status: resp.status, body: await resp.text() }
  }, D)
  await L.sleep(500)
  L.note(`POST /v1/api/publico/pacientes (dados D, auth parado) -> ${r.status} | corpo=${r.body}`)
  C.contarPublico(i0, 'QA112-fora-api')
  await L.shot(p, 'QA112-r5-a2-api-auth-fora')
  await L.end('QA112-r5-fora-api')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally {
  L.saveAll('r5-e2')
  await browser.close()
}
