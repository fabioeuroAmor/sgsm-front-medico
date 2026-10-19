// RODADA 4 — QA100 (cadastro A), QA101 (login senha certa antes de ativar), QA102 (senha errada),
// QA103 (campo do codigo), QA104 (codigo errado x5 e depois o certo)
import * as L from './lib4.mjs'
import * as C from './r4-common.mjs'
const browser = await L.launch()

// ── QA100 ──
L.start('QA100-r4')
const S = await L.newSession(browser, 'ANON-100')
const p = S.page
await p.goto(L.BASE + '/registrar')
const A = C.novoPaciente('A')
await C.preencherPaciente(p, A)
await L.shot(p, 'QA100-r4-a-form')
let i0 = await C.criarConta(p, 'QA100')
await L.sleep(1000)
await L.shot(p, 'QA100-r4-b-ative-sua-conta')
const texto = await p.locator('form[aria-label="Ativar conta"]').innerText().catch(() => '(ausente)')
const lin = L.LINES.slice(i0)
const resp = lin.find((l) => /<< \d+ POST .*\/publico\/pacientes/.test(l)) || ''
const corpo = resp.split('BODY=')[1] || ''
let campos = []
try { campos = Object.keys(JSON.parse(corpo)) } catch {}
L.note(`url=${p.url()} | esperado /registrar?ativar=${encodeURIComponent(A.email)} | igual=${p.url() === L.BASE + '/registrar?ativar=' + encodeURIComponent(A.email)}`)
L.note(`heading "Ative sua conta"=${await p.getByRole('heading', { name: 'Ative sua conta' }).isVisible().catch(() => false)} | e-mail na tela=${texto.includes(A.email)} | toasts=${JSON.stringify(await C.toasts(p))}`)
L.note(`corpo da resposta: ${corpo} | campos=${JSON.stringify(campos)} | tem "id"=${/"id"\s*:/.test(corpo)} | tem pacienteId=${/pacienteId|referenciaId/.test(corpo)}`)
C.contarPublico(i0, 'QA100-A')
C.r4.pacientes.push({ ...A, origem: 'QA100 (/registrar)', status: 'pendente' })
C.save()
await L.end('QA100-r4')
await S.ctx.close()

// ── QA101 ──
L.start('QA101-r4')
const S1 = await L.newSession(browser, 'ANON-101')
const p1 = S1.page
await p1.goto(L.BASE + '/login')
await p1.getByLabel('E-mail').fill(A.email)
await p1.getByLabel('Senha').fill(C.SENHA)
i0 = L.LINES.length
await p1.getByRole('button', { name: 'Entrar' }).click()
await p1.locator('[data-sonner-toast]').first().waitFor({ timeout: 15000 }).catch(() => {})
await L.sleep(1200)
await L.shot(p1, 'QA101-r4-a-login-nao-ativada')
const toastEl = p1.locator('[data-sonner-toast]').first()
L.note(`url=${p1.url()} | toasts=${JSON.stringify(await C.toasts(p1))} | botao "Digitar código" no toast=${await toastEl.getByRole('button', { name: 'Digitar código' }).isVisible().catch(() => false)}`)
L.note(`respostas: ${JSON.stringify(C.respostas(i0))}`)
await toastEl.getByRole('button', { name: 'Digitar código' }).click()
await p1.getByRole('heading', { name: 'Ative sua conta' }).waitFor({ timeout: 10000 }).catch(() => {})
await L.sleep(800)
const t101 = await p1.locator('form[aria-label="Ativar conta"]').innerText().catch(() => '(ausente)')
L.note(`apos "Digitar código": url=${p1.url()} | heading=${await p1.getByRole('heading', { name: 'Ative sua conta' }).isVisible().catch(() => false)} | e-mail na tela=${t101.includes(A.email)} | campo do codigo visivel=${await p1.getByLabel('Código de ativação').isVisible().catch(() => false)}`)
await L.shot(p1, 'QA101-r4-b-etapa-codigo')
await L.end('QA101-r4')

// ── QA102 ──
L.start('QA102-r4')
const S2 = await L.newSession(browser, 'ANON-102')
const p2 = S2.page
await p2.goto(L.BASE + '/login')
await p2.getByLabel('E-mail').fill(A.email)
await p2.getByLabel('Senha').fill('SenhaErrada#999')
i0 = L.LINES.length
await p2.getByRole('button', { name: 'Entrar' }).click()
await p2.locator('[data-sonner-toast]').first().waitFor({ timeout: 15000 }).catch(() => {})
await L.sleep(1200)
await L.shot(p2, 'QA102-r4')
L.note(`url=${p2.url()} | toasts=${JSON.stringify(await C.toasts(p2))} | menciona "ativ"=${(await C.toasts(p2)).some((t) => /ativ/i.test(t))} | botao "Digitar código"=${await p2.getByRole('button', { name: 'Digitar código' }).count()}`)
L.note(`respostas: ${JSON.stringify(C.respostas(i0))}`)
// controle: e-mail inexistente + senha errada (mesma resposta?)
await C.esperarToastsSumirem(p2)
await p2.getByLabel('E-mail').fill(`qa.inexistente.r4.${Date.now()}@teste.com`)
await p2.getByLabel('Senha').fill('SenhaErrada#999')
i0 = L.LINES.length
await p2.getByRole('button', { name: 'Entrar' }).click()
await p2.locator('[data-sonner-toast]').first().waitFor({ timeout: 15000 }).catch(() => {})
await L.sleep(1200)
L.note(`[controle e-mail inexistente] toasts=${JSON.stringify(await C.toasts(p2))} | respostas: ${JSON.stringify(C.respostas(i0))}`)
await L.shot(p2, 'QA102-r4-b-controle-inexistente')
await L.end('QA102-r4')
await S2.ctx.close()

// ── QA103 (na etapa do codigo aberta pelo QA101) ──
L.start('QA103-r4')
const campo = p1.getByLabel('Código de ativação')
await campo.fill('')
await campo.pressSequentially('ab1c2-3 4x5678', { delay: 40 })
L.note(`digitado "ab1c2-3 4x5678" -> valor do campo="${await campo.inputValue()}" (esperado so numeros, max 6)`)
await L.shot(p1, 'QA103-r4-a-so-numeros-max6')
await campo.fill('')
await campo.pressSequentially('123', { delay: 40 })
i0 = L.LINES.length
await p1.getByRole('button', { name: 'Ativar conta' }).click()
await p1.locator('[data-sonner-toast]').filter({ hasText: /6 números/ }).first().waitFor({ timeout: 8000 }).catch(() => {})
await L.sleep(1500)
await L.shot(p1, 'QA103-r4-b-menos-de-6')
const linhas103 = L.LINES.slice(i0)
L.note(`valor="${await campo.inputValue()}" | toasts=${JSON.stringify(await C.toasts(p1))} | requisicoes /auth/ativar-conta no periodo=${linhas103.filter((l) => />> POST .*\/auth\/ativar-conta/.test(l)).length} | qualquer >> /v1 no periodo=${linhas103.filter((l) => / >> /.test(l)).length}`)
await L.end('QA103-r4')

// ── QA104 ──
L.start('QA104-r4')
await C.esperarToastsSumirem(p1)
const real = L.codigoRedis(A.email)
const errados = []
for (let k = 0; errados.length < 5; k++) { const c = String((Number(real) + 111111 * (k + 1)) % 1000000).padStart(6, '0'); if (c !== real) errados.push(c) }
L.note(`codigo real termina em ${real.slice(-2)}; 5 codigos errados distintos do real gerados (mascarados): ${JSON.stringify(errados.map(L.maskCodigo))}`)
for (let k = 0; k < 5; k++) {
  await campo.fill(errados[k])
  i0 = L.LINES.length
  await p1.getByRole('button', { name: 'Ativar conta' }).click()
  await p1.waitForResponse((r) => r.url().includes('/auth/ativar-conta'), { timeout: 10000 }).catch(() => {})
  await L.sleep(900)
  L.note(`[erro ${k + 1}] respostas=${JSON.stringify(C.respostas(i0))} | toasts=${JSON.stringify(await C.toasts(p1))}`)
  if (k === 0) await L.shot(p1, 'QA104-r4-a-codigo-incorreto')
}
await L.shot(p1, 'QA104-r4-b-apos-5-erros')
await C.esperarToastsSumirem(p1)
await campo.fill(real)
i0 = L.LINES.length
await p1.getByRole('button', { name: 'Ativar conta' }).click()
await p1.waitForResponse((r) => r.url().includes('/auth/ativar-conta'), { timeout: 10000 }).catch(() => {})
await L.sleep(1200)
L.note(`[codigo CERTO apos 5 erros] respostas=${JSON.stringify(C.respostas(i0))} | toasts=${JSON.stringify(await C.toasts(p1))} | url=${p1.url()}`)
await L.shot(p1, 'QA104-r4-c-certo-bloqueado')
await L.end('QA104-r4', 'codigo obtido no Redis (auth:ativacao:codigo:<email>) no papel do usuario lendo o proprio e-mail; mascarado')
L.saveAll('r4-b')
await browser.close()
