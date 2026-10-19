// RODADA 5 — QA109: limite por IP (10/h na instancia de QA). Tentativas anteriores da rodada ja contam (contas-r5.json).
// Enchimento com CPF da conta A e e-mail novo (409, nao cria paciente) ate o 429; depois, dados novos e validos (deve dar 429).
import * as L from './lib5.mjs'
import * as C from './r5-common.mjs'
const browser = await L.launch()
const A = C.r5.pacientes.find((x) => x.rotulo === 'A')
try {
  L.start('QA109-r5')
  L.note(`tentativas anteriores nesta rodada (desde ${C.r5.tentativasPublico[0]?.em}): ${C.r5.tentativasPublico.length} -> ${JSON.stringify(C.r5.tentativasPublico.map((t) => t.rotulo + ':' + t.status))}`)
  const S = await L.newSession(browser, 'ANON-109')
  const p = S.page
  let primeiro429 = null
  for (let k = 0; k < 8 && !primeiro429; k++) {
    await p.goto(L.BASE + '/registrar')
    const d = C.novoPaciente('Lim'); d.cpf = A.cpf
    await C.preencherPaciente(p, d)
    const i0 = await C.criarConta(p)
    const { resps } = C.contarPublico(i0, `QA109 tentativa ${C.r5.tentativasPublico.length + 1}`)
    const n = C.r5.tentativasPublico.length
    L.note(`[tentativa #${n} na janela] status=${JSON.stringify(resps)} | toasts=${JSON.stringify(await L.toasts(p))}`)
    if (resps.includes('429')) { primeiro429 = n; L.note('corpo 429: ' + C.corpoDe(i0, /publico\/pacientes/)); await L.shot(p, 'QA109-r5-a-429-tela') }
    else if (n === 10) await L.shot(p, 'QA109-r5-0-decima-409')
    await L.esperarToastsSumirem(p)
  }
  L.note(`primeiro 429 na tentativa #${primeiro429} da janela`)
  await p.goto(L.BASE + '/registrar')
  const E = C.novoPaciente('E')
  await C.preencherPaciente(p, E)
  const i1 = await C.criarConta(p)
  const { resps } = C.contarPublico(i1, 'QA109 dados novos validos')
  L.note(`[dados novos validos, tentativa #${C.r5.tentativasPublico.length}] status=${JSON.stringify(resps)} | toasts=${JSON.stringify(await L.toasts(p))} | etapa do codigo=${await p.getByRole('heading', { name: 'Ative sua conta' }).isVisible().catch(() => false)} | corpo=${C.corpoDe(i1, /publico\/pacientes/)}`)
  await L.shot(p, 'QA109-r5-b-429-dados-novos')
  if (resps.includes('201')) { C.r5.pacientes.push({ ...E, origem: 'QA109 (/registrar)', status: 'pendente' }); C.save() }
  await L.end('QA109-r5')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally {
  L.saveAll('r5-f')
  await browser.close()
}
