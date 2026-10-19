// RODADA 4 — QA109 repetido em janela limpa (>= 1 h apos a 1a tentativa da rodada, que foi 19:48:53Z).
// Tentativas 1..10: CPF ja cadastrado (A) + e-mail novo -> 409 esperado (nao cria paciente). Tentativa 11: dados novos e validos -> 429 esperado.
import * as L from './lib4.mjs'
import * as C from './r4-common.mjs'
const browser = await L.launch()
const A = C.r4.pacientes.find((x) => x.rotulo === 'A')
const res = []
try {
  L.start('QA109-r4b')
  L.note(`inicio da janela nova: ${new Date().toISOString()} (ultima tentativa anterior da rodada: ${C.r4.tentativasPublico.at(-1)?.em})`)
  const S = await L.newSession(browser, 'ANON-109b')
  const p = S.page
  for (let k = 1; k <= 11; k++) {
    await p.goto(L.BASE + '/registrar')
    const d = C.novoPaciente(k < 11 ? 'Lim2' : 'F')
    if (k < 11) d.cpf = A.cpf
    await C.preencherPaciente(p, d)
    const i0 = await C.criarConta(p, 'QA109b')
    const { resps } = C.contarPublico(i0, `QA109b #${k}${k === 11 ? ' (dados novos validos)' : ''}`)
    const t = await C.toasts(p)
    res.push(`#${k}:${resps.join(',')}`)
    L.note(`[tentativa #${k} na janela nova] status=${JSON.stringify(resps)} | toasts=${JSON.stringify(t)} | etapa do codigo=${await p.getByRole('heading', { name: 'Ative sua conta' }).isVisible().catch(() => false)}`)
    if (k === 10) await L.shot(p, 'QA109-r4b-a-decima-409')
    if (k === 11) {
      await L.shot(p, 'QA109-r4b-b-decima-primeira-429')
      L.note(`corpo #11: ${(L.LINES.slice(i0).find((l) => /<< \d+ POST .*publico/.test(l) && !l.includes('[NOTA]')) || '').split('BODY=')[1]}`)
      if (resps.includes('201')) { C.r4.pacientes.push({ ...d, origem: 'QA109b (/registrar)', status: 'pendente' }); C.save() }
    }
    await C.esperarToastsSumirem(p)
  }
  L.note('resumo: ' + res.join(' '))
  await L.end('QA109-r4b')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split(String.fromCharCode(10))[0]) } finally {
  L.saveAll('r4-f2')
  await browser.close()
}
