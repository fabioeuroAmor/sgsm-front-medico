// RODADA 6 — QA100 (cadastro feliz sem pre-checagem de e-mail) e QA107 (CPF e e-mail repetidos: mesma resposta). Sem mock.
import * as L from './lib5.mjs'
import * as C from './r6-common.mjs'
const browser = await L.launch()
const semInst = (s) => String(s).replace(/"instance":"[^"]*",?/, '')
try {
  const S = await L.newSession(browser, 'ANON-R6')
  const p = S.page
  L.note(`contexto anonimo: cookies=${(await S.ctx.cookies()).length}`)

  L.start('QA100-r6')
  await p.goto(L.BASE + '/registrar')
  const P = C.novoPaciente6('A')
  await C.preencherPaciente(p, P, { senha: C.SENHA6 })
  await L.shot(p, 'QA100-r6-a-form')
  let i0 = await C.criarConta(p)
  await L.sleep(500)
  let lin = L.LINES.slice(i0)
  L.note(`QA100: >> GET email-disponivel=${lin.filter((l) => />> GET .*email-disponivel/.test(l)).length} | >> POST /publico/pacientes=${lin.filter((l) => />> POST .*publico\/pacientes/.test(l)).length} | respostas=${JSON.stringify(L.respostas(i0))}`)
  L.note(`QA100: corpo da resposta=${C.corpoDe(i0, /publico\/pacientes/)} | url=${p.url()} | heading=${JSON.stringify(await p.getByRole('heading', { name: 'Ative sua conta' }).count())} | e-mail na tela=${await p.getByText(P.email).count()}`)
  C.contarPublico6(i0, 'QA100-A')
  P.origem = 'QA100 (/registrar)'; P.status = 'pendente'
  C.r6.pacientes.push(P); C.save6()
  await L.shot(p, 'QA100-r6-b-ative-sua-conta')
  await L.end('QA100-r6')

  L.start('QA107-r6')
  const res = []
  for (const [rot, mut, shot] of [
    ['mesmo CPF (e-mail novo)', (d) => { d.cpf = P.cpf }, 'QA107-r6-a-mesmo-cpf'],
    ['mesmo e-mail (CPF novo)', (d) => { d.email = P.email }, 'QA107-r6-b-mesmo-email'],
  ]) {
    await L.esperarToastsSumirem(p)
    await p.goto(L.BASE + '/registrar')
    const d = C.novoPaciente6('Dup'); mut(d)
    await C.preencherPaciente(p, d, { senha: C.SENHA6 })
    i0 = await C.criarConta(p)
    await L.sleep(300)
    const t = await L.toasts(p)
    await L.shot(p, shot)
    lin = L.LINES.slice(i0)
    const corpo = C.corpoDe(i0, /publico\/pacientes/)
    const st = (L.respostas(i0, /publico\/pacientes/)[0] || '').split(' ')[0]
    L.note(`[${rot}] dados: cpf=${d.cpf} email=${d.email} | >> GET email-disponivel=${lin.filter((l) => />> GET .*email-disponivel/.test(l)).length} | >> POST /publico/pacientes=${lin.filter((l) => />> POST .*publico\/pacientes/.test(l)).length} | status=${st} | toasts=${JSON.stringify(t)} | url=${p.url()}`)
    L.note(`[${rot}] corpo=${corpo}`)
    C.contarPublico6(i0, 'QA107 ' + rot)
    if (corpo.includes('ativacaoPendente')) { C.r6.pacientes.push({ ...d, origem: 'QA107 ' + rot + ' (inesperado: criado)', status: '?' }); C.save6() }
    res.push({ st, t, corpo })
  }
  const chave = (c) => { try { const j = JSON.parse(c); return JSON.stringify({ status: j.status, title: j.title, detail: j.detail, type: j.type }) } catch { return c } }
  L.note(`QA107: campos status/title/detail/type iguais=${chave(res[0].corpo) === chave(res[1].corpo)} | ${chave(res[0].corpo)}`)
  L.note(`QA107: mesmo status=${res[0].st === res[1].st} (${res[0].st}/${res[1].st}) | mesma mensagem na tela=${JSON.stringify(res[0].t) === JSON.stringify(res[1].t)} | mesmo corpo (sem instance)=${semInst(res[0].corpo) === semInst(res[1].corpo)}`)
  // complemento (fora do item): o endpoint publico de pre-checagem ainda responde?
  const pre = await p.evaluate(async (emails) => {
    const out = []
    for (const e of emails) { const r = await fetch('/v1/api/auth/email-disponivel?email=' + encodeURIComponent(e)); out.push({ e, status: r.status, body: await r.text() }) }
    return out
  }, [P.email, `qa.inexistente.r6.${Date.now()}@teste.com`])
  L.note(`(fora do item) GET /v1/api/auth/email-disponivel anonimo: ${JSON.stringify(pre)}`)
  await L.end('QA107-r6', `duplicidade contra a conta do QA100-r6 (${P.email})`)
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally {
  L.saveAll('r6-c')
  await browser.close()
}
