// RODADA 4 — complemento do QA104 (toasts na tela), QA105 (reenviar codigo) e QA106 (codigo certo + login) com a conta B
import * as L from './lib4.mjs'
import * as C from './r4-common.mjs'
const browser = await L.launch()
const A = C.r4.pacientes.find((x) => x.rotulo === 'A')
const B = C.r4.pacientes.find((x) => x.rotulo === 'B')

async function enviarCodigo(p, codigo, rotulo, shot) {
  const campo = p.getByLabel('Código de ativação')
  await campo.fill(codigo)
  const w = p.waitForResponse((r) => r.url().includes('/auth/ativar-conta') && r.request().method() === 'POST', { timeout: 15000 })
  await p.getByRole('button', { name: 'Ativar conta' }).click()
  const r = await w.catch(() => null)
  await p.locator('[data-sonner-toast]').first().waitFor({ timeout: 5000 }).catch(() => {})
  await L.sleep(400)
  const t = await C.toasts(p)
  if (shot) await L.shot(p, shot)
  L.note(`[${rotulo}] codigo=${L.maskCodigo(codigo)} -> ${r ? r.status() : 'sem resposta'} | toasts=${JSON.stringify(t)} | url=${p.url()}`)
  return { status: r?.status(), toasts: t }
}

try {
  L.start('QA104-r4-complemento')
  const SA = await L.newSession(browser, 'ANON-104A')
  await SA.page.goto(L.BASE + '/registrar?ativar=' + encodeURIComponent(A.email))
  await SA.page.getByRole('heading', { name: 'Ative sua conta' }).waitFor()
  const realA = L.codigoRedis(A.email)
  await enviarCodigo(SA.page, realA, 'A bloqueada, codigo CERTO', 'QA104-r4-d-toast-muitas-tentativas')
  await SA.ctx.close()
  const SB = await L.newSession(browser, 'ANON-105')
  const p = SB.page
  await p.goto(L.BASE + '/registrar?ativar=' + encodeURIComponent(B.email))
  await p.getByRole('heading', { name: 'Ative sua conta' }).waitFor()
  const antigo = L.codigoRedis(B.email)
  const errado = String((Number(antigo) + 500000) % 1000000).padStart(6, '0')
  await enviarCodigo(p, errado, 'B codigo errado', 'QA104-r4-e-toast-codigo-incorreto')
  await L.end('QA104-r4-complemento', 'toasts capturados logo apos a resposta (na 1a execucao a captura foi tarde demais)')

  // ── QA105 ──
  L.start('QA105-r4')
  await C.esperarToastsSumirem(p)
  L.note(`codigo vigente antes do reenvio termina em ${antigo.slice(-2)}`)
  const w = p.waitForResponse((r) => r.url().includes('/auth/ativar-conta/reenviar'), { timeout: 15000 })
  await p.getByRole('button', { name: 'Reenviar código' }).click()
  const rr = await w.catch(() => null)
  await p.locator('[data-sonner-toast]').first().waitFor({ timeout: 5000 }).catch(() => {})
  await L.sleep(400)
  L.note(`reenviar -> ${rr ? rr.status() : 'sem resposta'} | toasts=${JSON.stringify(await C.toasts(p))}`)
  await L.shot(p, 'QA105-r4-a-reenviado')
  await L.sleep(1500)
  const novo = L.codigoRedis(B.email)
  L.note(`codigo novo termina em ${novo.slice(-2)} | diferente do antigo=${novo !== antigo}`)
  await C.esperarToastsSumirem(p)
  const rAntigo = await enviarCodigo(p, antigo, 'B codigo ANTIGO apos reenvio', 'QA105-r4-b-codigo-antigo-recusado')
  await L.end('QA105-r4', 'codigos obtidos no Redis no papel do usuario lendo o proprio e-mail; o "novo vale" e provado no QA106')

  // ── QA106 ──
  L.start('QA106-r4')
  await C.esperarToastsSumirem(p)
  const i0 = L.LINES.length
  const campo = p.getByLabel('Código de ativação')
  await campo.fill(novo)
  const w2 = p.waitForResponse((r) => r.url().includes('/auth/ativar-conta') && r.request().method() === 'POST', { timeout: 15000 })
  await p.getByRole('button', { name: 'Ativar conta' }).click()
  const r2 = await w2.catch(() => null)
  await p.waitForURL((u) => u.pathname === '/login', { timeout: 10000 }).catch(() => {})
  await p.locator('[data-sonner-toast]').first().waitFor({ timeout: 5000 }).catch(() => {})
  await L.sleep(400)
  L.note(`codigo NOVO -> ${r2 ? r2.status() : 'sem resposta'} | toasts=${JSON.stringify(await C.toasts(p))} | url=${p.url()}`)
  await L.shot(p, 'QA106-r4-a-conta-ativada')
  await C.esperarToastsSumirem(p)
  await p.getByLabel('E-mail').fill(B.email)
  await p.getByLabel('Senha').fill(C.SENHA)
  await p.getByRole('button', { name: 'Entrar' }).click()
  await p.waitForURL('**/pacientes', { timeout: 20000 }).catch(() => {})
  await L.sleep(2000)
  L.note(`login apos ativar: url=${p.url()} | menu=${JSON.stringify((await p.locator('aside').first().innerText().catch(() => '')).replace(/\n/g, ' | '))}`)
  L.note(`respostas: ${JSON.stringify(C.respostas(i0))}`)
  await L.shot(p, 'QA106-r4-b-logado-paciente')
  const pb = C.r4.pacientes.find((x) => x.rotulo === 'B'); pb.status = 'ativado'; C.save()
  await L.end('QA106-r4')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split(String.fromCharCode(10))[0]) } finally {
  L.saveAll('r4-c')
  await browser.close()
}
