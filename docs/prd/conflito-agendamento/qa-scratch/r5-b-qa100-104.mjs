// RODADA 5 — QA100 (cadastro A) + QA101 (login antes de ativar, senha certa) + QA102 (senha errada) + QA103 (campo do codigo) + QA104 (codigo errado x5)
import * as L from './lib5.mjs'
import * as C from './r5-common.mjs'
const browser = await L.launch()
let i0
try {
  // ── QA100 ──
  L.start('QA100-r5')
  const S0 = await L.newSession(browser, 'ANON-100')
  const p0 = S0.page
  await p0.goto(L.BASE + '/registrar')
  const A = C.novoPaciente('A')
  await C.preencherPaciente(p0, A)
  await L.shot(p0, 'QA100-r5-a-form')
  i0 = await C.criarConta(p0)
  await L.sleep(800)
  await L.shot(p0, 'QA100-r5-b-ative-sua-conta')
  const t100 = await p0.locator('form[aria-label="Ativar conta"]').innerText().catch(() => '(ausente)')
  const lin = L.LINES.slice(i0)
  L.note(`>> POST /publico/pacientes=${lin.filter((l) => />> POST .*publico\/pacientes/.test(l)).length} | corpo da resposta=${C.corpoDe(i0, /publico\/pacientes/)}`)
  L.note(`url=${p0.url()} | url esperada contem ?ativar=${encodeURIComponent(A.email)}: ${p0.url().includes('ativar=' + encodeURIComponent(A.email))} | heading=${await p0.getByRole('heading', { name: 'Ative sua conta' }).isVisible()} | e-mail digitado na tela=${t100.includes(A.email)} | texto=${JSON.stringify(t100.replace(/\n/g, ' | '))}`)
  C.contarPublico(i0, 'QA100-A')
  C.r5.pacientes.push({ ...A, origem: 'QA100 (/registrar)', status: 'pendente' }); C.save()
  await L.end('QA100-r5')
  await S0.ctx.close()

  // ── QA101 ──
  L.start('QA101-r5')
  const S1 = await L.newSession(browser, 'ANON-101')
  let p1 = S1.page
  await p1.goto(L.BASE + '/login')
  await p1.getByLabel('E-mail').fill(A.email)
  await p1.getByLabel('Senha').fill(C.SENHA)
  i0 = L.LINES.length
  await p1.getByRole('button', { name: 'Entrar' }).click()
  await p1.locator('[data-sonner-toast]').first().waitFor({ timeout: 15000 }).catch(() => {})
  await L.sleep(1000)
  await L.shot(p1, 'QA101-r5-a-login-nao-ativada')
  const toastEl = p1.locator('[data-sonner-toast]').first()
  const temAcao = await toastEl.getByRole('button', { name: 'Digitar código' }).isVisible().catch(() => false)
  L.note(`url=${p1.url()} | toasts=${JSON.stringify(await L.toasts(p1))} | acao "Digitar código" no toast=${temAcao} | refresh_token=${(await p1.evaluate(() => localStorage.getItem('refresh_token'))) ? 'presente' : 'ausente'}`)
  L.note(`respostas: ${JSON.stringify(L.respostas(i0))} | corpo login=${C.corpoDe(i0, /auth\/login/)}`)
  if (temAcao) await toastEl.getByRole('button', { name: 'Digitar código' }).click()
  await p1.getByRole('heading', { name: 'Ative sua conta' }).waitFor({ timeout: 10000 }).catch(() => {})
  await L.sleep(800)
  const t101 = await p1.locator('form[aria-label="Ativar conta"]').innerText().catch(() => '(ausente)')
  L.note(`apos "Digitar código": url=${p1.url()} | heading=${await p1.getByRole('heading', { name: 'Ative sua conta' }).isVisible().catch(() => false)} | e-mail na tela=${t101.includes(A.email)} | campo do codigo visivel=${await p1.getByLabel('Código de ativação').isVisible().catch(() => false)}`)
  await L.shot(p1, 'QA101-r5-b-etapa-codigo')
  await L.end('QA101-r5')

  // ── QA102 ──
  L.start('QA102-r5')
  const S2 = await L.newSession(browser, 'ANON-102')
  const p2 = S2.page
  await p2.goto(L.BASE + '/login')
  await p2.getByLabel('E-mail').fill(A.email)
  await p2.getByLabel('Senha').fill('SenhaErrada#999')
  i0 = L.LINES.length
  await p2.getByRole('button', { name: 'Entrar' }).click()
  await p2.locator('[data-sonner-toast]').first().waitFor({ timeout: 15000 }).catch(() => {})
  await L.sleep(1000)
  await L.shot(p2, 'QA102-r5-a-senha-errada')
  L.note(`[pendente + senha errada] url=${p2.url()} | toasts=${JSON.stringify(await L.toasts(p2))} | botao "Digitar código"=${await p2.getByRole('button', { name: 'Digitar código' }).count()} | corpo=${C.corpoDe(i0, /auth\/login/)}`)
  await L.esperarToastsSumirem(p2)
  await p2.getByLabel('E-mail').fill(`qa.inexistente.r5.${Date.now()}@teste.com`)
  await p2.getByLabel('Senha').fill('SenhaErrada#999')
  i0 = L.LINES.length
  await p2.getByRole('button', { name: 'Entrar' }).click()
  await p2.locator('[data-sonner-toast]').first().waitFor({ timeout: 15000 }).catch(() => {})
  await L.sleep(1000)
  L.note(`[controle e-mail inexistente] toasts=${JSON.stringify(await L.toasts(p2))} | corpo=${C.corpoDe(i0, /auth\/login/)}`)
  await L.shot(p2, 'QA102-r5-b-controle-inexistente')
  await L.end('QA102-r5')
  await S2.ctx.close()

  // ── QA103 ──
  L.start('QA103-r5')
  const campo = p1.getByLabel('Código de ativação')
  await campo.fill('')
  await campo.pressSequentially('ab1c2-3 4x5678', { delay: 40 })
  L.note(`digitado "ab1c2-3 4x5678" -> valor do campo="${await campo.inputValue()}" (esperado so numeros, max 6)`)
  await L.shot(p1, 'QA103-r5-a-so-numeros-max6')
  await campo.fill('')
  await campo.pressSequentially('123', { delay: 40 })
  i0 = L.LINES.length
  await p1.getByRole('button', { name: 'Ativar conta' }).click()
  await p1.locator('[data-sonner-toast]').filter({ hasText: /6 números/ }).first().waitFor({ timeout: 8000 }).catch(() => {})
  await L.sleep(800)
  await L.shot(p1, 'QA103-r5-b-menos-de-6')
  const l103 = L.LINES.slice(i0)
  L.note(`valor="${await campo.inputValue()}" | toasts=${JSON.stringify(await L.toasts(p1))} | >> /auth/ativar-conta no periodo=${l103.filter((l) => />> POST .*\/auth\/ativar-conta/.test(l)).length} | qualquer >> /v1 no periodo=${l103.filter((l) => / >> /.test(l)).length}`)
  await L.end('QA103-r5')

  // ── QA104 ──
  L.start('QA104-r5')
  await L.esperarToastsSumirem(p1)
  const real = L.codigoRedis(A.email)
  const errados = []
  for (let k = 0; errados.length < 5; k++) { const c = String((Number(real) + 111111 * (k + 1)) % 1000000).padStart(6, '0'); if (c !== real) errados.push(c) }
  for (let k = 0; k < 5; k++) {
    await campo.fill(errados[k])
    i0 = L.LINES.length
    const w = p1.waitForResponse((r) => r.url().includes('/auth/ativar-conta'), { timeout: 10000 })
    await p1.getByRole('button', { name: 'Ativar conta' }).click()
    await w.catch(() => {})
    await L.sleep(500)
    L.note(`[erro ${k + 1}] codigo=${L.m4(errados[k])} respostas=${JSON.stringify(L.respostas(i0))} | toasts=${JSON.stringify(await L.toasts(p1))}`)
    if (k === 0) await L.shot(p1, 'QA104-r5-a-codigo-incorreto')
    if (k === 4) await L.shot(p1, 'QA104-r5-b-quinto-erro')
    await L.esperarToastsSumirem(p1)
  }
  await campo.fill(real)
  i0 = L.LINES.length
  const w = p1.waitForResponse((r) => r.url().includes('/auth/ativar-conta'), { timeout: 10000 })
  await p1.getByRole('button', { name: 'Ativar conta' }).click()
  await w.catch(() => {})
  await L.sleep(500)
  L.note(`[codigo CERTO apos 5 erros] respostas=${JSON.stringify(L.respostas(i0))} | corpo=${C.corpoDe(i0, /ativar-conta/)} | toasts=${JSON.stringify(await L.toasts(p1))} | url=${p1.url()}`)
  await L.shot(p1, 'QA104-r5-c-certo-bloqueado')
  C.r5.pacientes.find((x) => x.rotulo === 'A').status = 'pendente (bloqueada por 5 codigos errados)'; C.save()
  await L.end('QA104-r5', 'codigo obtido no Redis (auth:ativacao:codigo:<email>) no papel do usuario lendo o proprio e-mail; mascarado')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally {
  L.saveAll('r5-b')
  await browser.close()
}
