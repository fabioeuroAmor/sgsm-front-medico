// RODADA 4 — QA109: limite por IP (10/h na instancia de QA). Tentativas anteriores da rodada ja contam (contas-r4.json).
// Tentativas "de enchimento" com CPF ja cadastrado (A) e e-mail novo -> 409, sem criar paciente; ao passar do limite, 429.
// Depois do 1o 429, uma tentativa com dados totalmente novos e validos (deve dar 429 tambem).
import * as L from './lib4.mjs'
import * as C from './r4-common.mjs'
const browser = await L.launch()
const A = C.r4.pacientes.find((x) => x.rotulo === 'A')
try {
  L.start('QA109-r4')
  L.note(`tentativas anteriores nesta rodada (desde ${C.r4.tentativasPublico[0]?.em}): ${C.r4.tentativasPublico.length} -> ${JSON.stringify(C.r4.tentativasPublico.map((t) => t.rotulo + ':' + t.status))}`)
  const S = await L.newSession(browser, 'ANON-109')
  const p = S.page
  let primeiro429 = null
  for (let k = 0; k < 9 && !primeiro429; k++) {
    await p.goto(L.BASE + '/registrar')
    const d = C.novoPaciente('Lim'); d.cpf = A.cpf
    await C.preencherPaciente(p, d)
    const i0 = await C.criarConta(p, 'QA109')
    const { resps } = C.contarPublico(i0, `QA109 tentativa ${C.r4.tentativasPublico.length + 1}`)
    const n = C.r4.tentativasPublico.length
    const t = await C.toasts(p)
    L.note(`[tentativa #${n} na janela] status=${JSON.stringify(resps)} | toasts=${JSON.stringify(t)}`)
    if (resps.includes('429')) { primeiro429 = n; await L.shot(p, 'QA109-r4-a-429-tela') }
    else if (n === 10) await L.shot(p, 'QA109-r4-0-decima-409')
    await C.esperarToastsSumirem(p)
  }
  L.note(`primeiro 429 na tentativa #${primeiro429} da janela`)
  // dados novos e validos depois do limite
  await p.goto(L.BASE + '/registrar')
  const E = C.novoPaciente('E')
  await C.preencherPaciente(p, E)
  const i1 = await C.criarConta(p, 'QA109-novo')
  const { resps } = C.contarPublico(i1, 'QA109 dados novos validos')
  L.note(`[dados novos validos, tentativa #${C.r4.tentativasPublico.length}] status=${JSON.stringify(resps)} | toasts=${JSON.stringify(await C.toasts(p))} | etapa do codigo=${await p.getByRole('heading', { name: 'Ative sua conta' }).isVisible().catch(() => false)} | corpo=${(L.LINES.slice(i1).find((l) => /<< \d+ POST .*publico/.test(l)) || '').split('BODY=')[1]}`)
  await L.shot(p, 'QA109-r4-b-429-dados-novos')
  if (resps.includes('201')) { C.r4.pacientes.push({ ...E, origem: 'QA109 (/registrar)', status: 'pendente' }); C.save() }
  await L.end('QA109-r4')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split(String.fromCharCode(10))[0]) } finally {
  L.saveAll('r4-f')
  await browser.close()
}
