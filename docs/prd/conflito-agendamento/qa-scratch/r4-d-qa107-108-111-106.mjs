// RODADA 4 — QA107 (duplicidade CPF / e-mail), QA108 (validacoes da tela), QA111 (clique duplo) e QA106 refeito na conta C
import * as L from './lib4.mjs'
import * as C from './r4-common.mjs'
const browser = await L.launch()
const A = C.r4.pacientes.find((x) => x.rotulo === 'A')

async function tentativa(p, rotulo, dados, shot) {
  await p.goto(L.BASE + '/registrar')
  await C.preencherPaciente(p, dados)
  const i0 = await C.criarConta(p, rotulo)
  await L.sleep(500)
  const t = await C.toasts(p)
  await L.shot(p, shot)
  const corpo = (L.LINES.slice(i0).find((l) => /<< \d+ POST .*\/publico\/pacientes/.test(l)) || '').split('BODY=')[1] || '(sem POST /publico/pacientes)'
  L.note(`[${rotulo}] url=${p.url()} | toasts=${JSON.stringify(t)} | respostas=${JSON.stringify(C.respostas(i0))}`)
  L.note(`[${rotulo}] corpo /publico/pacientes: ${corpo}`)
  C.contarPublico(i0, rotulo)
  return { toasts: t, corpo }
}

try {
  // ── QA107 ──
  L.start('QA107-r4')
  const S = await L.newSession(browser, 'ANON-107')
  const p = S.page
  const d1 = C.novoPaciente('DupCPF'); d1.cpf = A.cpf
  const r1 = await tentativa(p, 'QA107 mesmo CPF (e-mail novo)', d1, 'QA107-r4-a-mesmo-cpf')
  await C.esperarToastsSumirem(p)
  const d2 = C.novoPaciente('DupEmail'); d2.email = A.email
  const r2 = await tentativa(p, 'QA107 mesmo e-mail (CPF novo)', d2, 'QA107-r4-b-mesmo-email')
  L.note(`mesma mensagem nas duas: ${JSON.stringify(r1.toasts) === JSON.stringify(r2.toasts)} | mesmo corpo: ${r1.corpo.replace(/"instance":"[^"]*",?/, '') === r2.corpo.replace(/"instance":"[^"]*",?/, '')}`)
  // o d2 so tem CPF novo; se nao houve POST nada foi criado. d1 nao cria (CPF existente).
  await L.end('QA107-r4')
  await C.esperarToastsSumirem(p)

  // ── QA108 ──
  L.start('QA108-r4')
  const casos = [
    ['CPF invalido', (d) => { d.cpf = '12345678900' }, {}],
    ['senha < 8', () => {}, { senha: 'Ab#123', confirmar: 'Ab#123' }],
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
    await L.sleep(500)
    const t = await C.toasts(p)
    const nativa = await p.evaluate(() => { const inv = document.querySelector('form :invalid'); return inv ? `${inv.getAttribute('type') || inv.tagName}: ${inv.validationMessage}` : null })
    await L.shot(p, `QA108-r4-${n}-${rot.replace(/[^a-z0-9]+/gi, '-')}`)
    const lin = L.LINES.slice(i0)
    L.note(`[${rot}] toasts=${JSON.stringify(t)} | validacao nativa do navegador=${JSON.stringify(nativa)} | >> /publico/pacientes=${lin.filter((l) => />> POST .*publico\/pacientes/.test(l)).length} | >> qualquer /v1=${lin.filter((l) => / >> /.test(l)).length} | url=${p.url()}`)
    await C.esperarToastsSumirem(p)
  }
  await L.end('QA108-r4')

  // ── QA111 ──
  L.start('QA111-r4')
  await p.goto(L.BASE + '/registrar')
  const Cc = C.novoPaciente('C')
  await C.preencherPaciente(p, Cc)
  const i0 = L.LINES.length
  const btn = p.getByRole('button', { name: 'Criar conta' })
  await btn.dblclick({ delay: 0 })
  await p.getByRole('heading', { name: 'Ative sua conta' }).waitFor({ timeout: 20000 }).catch(() => {})
  await L.sleep(2500)
  await L.shot(p, 'QA111-r4')
  const lin = L.LINES.slice(i0)
  L.note(`dblclick em "Criar conta": >> GET email-disponivel=${lin.filter((l) => />> GET .*email-disponivel/.test(l)).length} | >> POST /publico/pacientes=${lin.filter((l) => />> POST .*publico\/pacientes/.test(l)).length} | respostas=${JSON.stringify(C.respostas(i0))} | url=${p.url()}`)
  C.contarPublico(i0, 'QA111-C')
  C.r4.pacientes.push({ ...Cc, origem: 'QA111 (/registrar)', status: 'pendente' })
  C.save()
  await L.end('QA111-r4')
  await C.esperarToastsSumirem(p)

  // ── QA106 (refeito na conta C, recem-criada) ──
  L.start('QA106-r4')
  const cod = L.codigoRedis(Cc.email)
  const j0 = L.LINES.length
  await p.getByLabel('Código de ativação').fill(cod)
  const w = p.waitForResponse((r) => r.url().includes('/auth/ativar-conta') && r.request().method() === 'POST', { timeout: 15000 })
  await p.getByRole('button', { name: 'Ativar conta' }).click()
  const r = await w.catch(() => null)
  await p.waitForURL((u) => u.pathname === '/login', { timeout: 10000 }).catch(() => {})
  await p.locator('[data-sonner-toast]').first().waitFor({ timeout: 5000 }).catch(() => {})
  await L.sleep(400)
  L.note(`codigo certo (${L.maskCodigo(cod)}) -> ${r ? r.status() : 'sem resposta'} | toasts=${JSON.stringify(await C.toasts(p))} | url=${p.url()}`)
  await L.shot(p, 'QA106-r4-a-conta-ativada')
  await C.esperarToastsSumirem(p)
  await p.getByLabel('E-mail').fill(Cc.email)
  await p.getByLabel('Senha').fill(C.SENHA)
  await p.getByRole('button', { name: 'Entrar' }).click()
  await p.waitForURL('**/pacientes', { timeout: 20000 }).catch(() => {})
  await L.sleep(2000)
  L.note(`login apos ativar: url=${p.url()} | menu=${JSON.stringify((await p.locator('aside').first().innerText().catch(() => '')).replace(/\n/g, ' | '))}`)
  L.note(`respostas: ${JSON.stringify(C.respostas(j0))}`)
  await L.shot(p, 'QA106-r4-b-logado-paciente')
  C.r4.pacientes.find((x) => x.rotulo === 'C').status = 'ativado'; C.save()
  await L.end('QA106-r4', 'conta C (criada no QA111); codigo obtido no Redis no papel do usuario lendo o proprio e-mail')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split(String.fromCharCode(10))[0]) } finally {
  L.saveAll('r4-d')
  await browser.close()
}
