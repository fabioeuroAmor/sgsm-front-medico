// RODADA 5 — QA107 (duplicidade CPF / e-mail), QA108 (validacoes da tela), QA111 (clique duplo)
import * as L from './lib5.mjs'
import * as C from './r5-common.mjs'
const browser = await L.launch()
const A = C.r5.pacientes.find((x) => x.rotulo === 'A')

async function tentativa(p, rotulo, dados, shot) {
  await p.goto(L.BASE + '/registrar')
  await C.preencherPaciente(p, dados)
  const i0 = await C.criarConta(p)
  await L.sleep(300)
  const t = await L.toasts(p)
  await L.shot(p, shot)
  const corpo = C.corpoDe(i0, /publico\/pacientes/)
  const lin = L.LINES.slice(i0)
  L.note(`[${rotulo}] url=${p.url()} | toasts=${JSON.stringify(t)} | respostas=${JSON.stringify(L.respostas(i0))} | >> POST /publico/pacientes=${lin.filter((l) => />> POST .*publico\/pacientes/.test(l)).length}`)
  L.note(`[${rotulo}] corpo email-disponivel: ${C.corpoDe(i0, /email-disponivel/)} | corpo /publico/pacientes: ${corpo}`)
  C.contarPublico(i0, rotulo)
  return { toasts: t, corpo }
}

try {
  L.start('QA107-r5')
  const S = await L.newSession(browser, 'ANON-107')
  const p = S.page
  const d1 = C.novoPaciente('DupCPF'); d1.cpf = A.cpf
  const r1 = await tentativa(p, 'QA107 mesmo CPF (e-mail novo)', d1, 'QA107-r5-a-mesmo-cpf')
  await L.esperarToastsSumirem(p)
  const d2 = C.novoPaciente('DupEmail'); d2.email = A.email
  const r2 = await tentativa(p, 'QA107 mesmo e-mail (CPF novo)', d2, 'QA107-r5-b-mesmo-email')
  const semInst = (s) => s.replace(/"instance":"[^"]*",?/, '')
  L.note(`mesma mensagem na tela nas duas: ${JSON.stringify(r1.toasts) === JSON.stringify(r2.toasts)} | mesmo corpo de /publico/pacientes: ${semInst(r1.corpo) === semInst(r2.corpo)}`)
  if (r2.corpo.includes('ativacaoPendente')) { C.r5.pacientes.push({ ...d2, origem: 'QA107 mesmo e-mail (inesperado: criado)', status: '?' }); C.save() }
  await L.end('QA107-r5', `CPF/e-mail duplicados da conta A (${A.email})`)
  await L.esperarToastsSumirem(p)

  L.start('QA108-r5')
  const casos = [
    ['CPF invalido', (d) => { d.cpf = '12345678900' }, {}],
    ['senha menor que 8', () => {}, { senha: 'Ab#123', confirmar: 'Ab#123' }],
    ['senhas diferentes', () => {}, { senha: C.SENHA, confirmar: C.SENHA + 'x' }],
    ['nascimento futuro', (d) => { d.nascimento = '2030-01-15' }, {}],
    ['LGPD desmarcado', () => {}, { lgpd: false }],
  ]
  let n = 0
  for (const [rot, mut, opt] of casos) {
    n++
    await p.goto(L.BASE + '/registrar')
    const d = C.novoPaciente('Val'); mut(d)
    await C.preencherPaciente(p, d, opt)
    const i0 = L.LINES.length
    await p.getByRole('button', { name: 'Criar conta' }).click()
    await p.locator('[data-sonner-toast]').first().waitFor({ timeout: 4000 }).catch(() => {})
    await L.sleep(400)
    const t = await L.toasts(p)
    const nativa = await p.evaluate(() => { const inv = document.querySelector('form :invalid'); return inv ? `${inv.getAttribute('type') || inv.tagName}: ${inv.validationMessage}` : null })
    await L.shot(p, `QA108-r5-${n}-${rot.replace(/[^a-z0-9]+/gi, '-')}`)
    const lin = L.LINES.slice(i0)
    L.note(`[${rot}] toasts=${JSON.stringify(t)} | validacao nativa do navegador=${JSON.stringify(nativa)} | >> /publico/pacientes=${lin.filter((l) => />> POST .*publico\/pacientes/.test(l)).length} | >> qualquer /v1=${lin.filter((l) => / >> /.test(l)).length} | url=${p.url()}`)
    await L.esperarToastsSumirem(p)
  }
  await L.end('QA108-r5')

  L.start('QA111-r5')
  await p.goto(L.BASE + '/registrar')
  const Cc = C.novoPaciente('C')
  await C.preencherPaciente(p, Cc)
  const i0 = L.LINES.length
  await p.getByRole('button', { name: 'Criar conta' }).dblclick({ delay: 0 })
  await p.getByRole('heading', { name: 'Ative sua conta' }).waitFor({ timeout: 20000 }).catch(() => {})
  await L.sleep(2500)
  await L.shot(p, 'QA111-r5')
  const lin = L.LINES.slice(i0)
  L.note(`dblclick em "Criar conta": >> GET email-disponivel=${lin.filter((l) => />> GET .*email-disponivel/.test(l)).length} | >> POST /publico/pacientes=${lin.filter((l) => />> POST .*publico\/pacientes/.test(l)).length} | respostas=${JSON.stringify(L.respostas(i0))} | url=${p.url()} | toasts=${JSON.stringify(await L.toasts(p))}`)
  C.contarPublico(i0, 'QA111-C')
  C.r5.pacientes.push({ ...Cc, origem: 'QA111 (/registrar)', status: 'pendente' }); C.save()
  await L.end('QA111-r5')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally {
  L.saveAll('r5-d')
  await browser.close()
}
