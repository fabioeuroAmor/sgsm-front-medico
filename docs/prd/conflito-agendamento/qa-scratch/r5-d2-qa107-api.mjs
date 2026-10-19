// RODADA 5 — QA107 complemento: a mesma tentativa "mesmo e-mail (CPF novo)" direto na API publica (o front parou antes, no email-disponivel)
import * as L from './lib5.mjs'
import * as C from './r5-common.mjs'
const browser = await L.launch()
const A = C.r5.pacientes.find((x) => x.rotulo === 'A')
try {
  L.start('QA107-r5-api')
  const S = await L.newSession(browser, 'ANON-107api')
  const p = S.page
  await p.goto(L.BASE + '/registrar')
  const d = C.novoPaciente('DupEmailApi'); d.email = A.email
  const i0 = L.LINES.length
  const r = await p.evaluate(async (d) => {
    const resp = await fetch('/v1/api/publico/pacientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: d.nome, cpf: d.cpf, dataNascimento: d.nascimento, email: d.email, consentimentoLgpd: true, senha: 'QaRodada5#2026' }) })
    return { status: resp.status, body: await resp.text() }
  }, d)
  await L.sleep(500)
  L.note(`POST /v1/api/publico/pacientes (mesmo e-mail da conta A, CPF novo ${d.cpf}) -> ${r.status} | corpo=${r.body}`)
  C.contarPublico(i0, 'QA107 API mesmo e-mail')
  if (r.status === 201) { C.r5.pacientes.push({ ...d, origem: 'QA107 API (inesperado)', status: '?' }); C.save() }
  await L.shot(p, 'QA107-r5-c-api-mesmo-email')
  await L.end('QA107-r5-api')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally {
  L.saveAll('r5-d2')
  await browser.close()
}
