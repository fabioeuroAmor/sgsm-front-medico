// RODADA 5 — QA105 (reenviar codigo; antigo deixa de valer) e QA106 (codigo novo -> ativa -> login como PACIENTE), conta B
import * as L from './lib5.mjs'
import * as C from './r5-common.mjs'
const browser = await L.launch()
const B = C.r5.pacientes.find((x) => x.rotulo === 'B')

async function enviarCodigo(p, codigo, rotulo, shot) {
  await p.getByLabel('Código de ativação').fill(codigo)
  const w = p.waitForResponse((r) => r.url().endsWith('/auth/ativar-conta') && r.request().method() === 'POST', { timeout: 15000 })
  await p.getByRole('button', { name: 'Ativar conta' }).click()
  const r = await w.catch(() => null)
  await p.locator('[data-sonner-toast]').first().waitFor({ timeout: 5000 }).catch(() => {})
  await L.sleep(400)
  const t = await L.toasts(p)
  if (shot) await L.shot(p, shot)
  L.note(`[${rotulo}] codigo=${L.m4(codigo)} -> ${r ? r.status() : 'sem resposta'} | toasts=${JSON.stringify(t)} | url=${p.url()}`)
  return r?.status()
}

try {
  L.start('QA105-r5')
  const S = await L.newSession(browser, 'ANON-105')
  const p = S.page
  await p.goto(L.BASE + '/registrar?ativar=' + encodeURIComponent(B.email))
  await p.getByRole('heading', { name: 'Ative sua conta' }).waitFor()
  const antigo = L.codigoRedis(B.email)
  const w = p.waitForResponse((r) => r.url().includes('/auth/ativar-conta/reenviar'), { timeout: 15000 })
  await p.getByRole('button', { name: 'Reenviar código' }).click()
  const rr = await w.catch(() => null)
  await p.locator('[data-sonner-toast]').first().waitFor({ timeout: 5000 }).catch(() => {})
  await L.sleep(400)
  L.note(`reenviar -> ${rr ? rr.status() : 'sem resposta'} | toasts=${JSON.stringify(await L.toasts(p))}`)
  await L.shot(p, 'QA105-r5-a-reenviado')
  await L.sleep(1500)
  const novo = L.codigoRedis(B.email)
  L.note(`codigo antigo=${L.m4(antigo)} | novo=${L.m4(novo)} | diferentes=${novo !== antigo}`)
  await L.esperarToastsSumirem(p)
  await enviarCodigo(p, antigo, 'B codigo ANTIGO apos reenvio', 'QA105-r5-b-codigo-antigo-recusado')
  await L.end('QA105-r5', 'codigos lidos no Redis no papel do usuario lendo o proprio e-mail; o "novo vale" e provado no QA106 (mesma pagina)')

  L.start('QA106-r5')
  await L.esperarToastsSumirem(p)
  const i0 = L.LINES.length
  await p.getByLabel('Código de ativação').fill(novo)
  const w2 = p.waitForResponse((r) => r.url().endsWith('/auth/ativar-conta') && r.request().method() === 'POST', { timeout: 15000 })
  await p.getByRole('button', { name: 'Ativar conta' }).click()
  const r2 = await w2.catch(() => null)
  await p.waitForURL((u) => u.pathname === '/login', { timeout: 10000 }).catch(() => {})
  await p.locator('[data-sonner-toast]').first().waitFor({ timeout: 5000 }).catch(() => {})
  await L.sleep(300)
  L.note(`codigo NOVO (${L.m4(novo)}) -> ${r2 ? r2.status() : 'sem resposta'} | toasts=${JSON.stringify(await L.toasts(p))} | url=${p.url()}`)
  await L.shot(p, 'QA106-r5-a-conta-ativada')
  await L.esperarToastsSumirem(p)
  await p.getByLabel('E-mail').fill(B.email)
  await p.getByLabel('Senha').fill(C.SENHA)
  await p.getByRole('button', { name: 'Entrar' }).click()
  await p.waitForURL((u) => u.pathname !== '/login', { timeout: 20000 }).catch(() => {})
  await L.sleep(2500)
  const perfil = await p.evaluate(async () => { try { const m = await import('/src/services/tokenStore.ts'); const t = m.tokenStore.get(); return t ? JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) : null } catch (e) { return 'erro: ' + e.message } })
  L.note(`login apos ativar: url=${p.url()} | claims do access token (sem assinatura): ${JSON.stringify(perfil && typeof perfil === 'object' ? { roles: perfil.roles ?? perfil.role ?? perfil.authorities, tipoPerfil: perfil.tipoPerfil ?? perfil.perfil, sub: perfil.sub } : perfil)}`)
  L.note(`menu: ${JSON.stringify((await p.locator('aside').first().innerText().catch(() => '')).replace(/\n/g, ' | '))}`)
  L.note(`respostas: ${JSON.stringify(L.respostas(i0))}`)
  await L.shot(p, 'QA106-r5-b-logado-paciente')
  B.status = 'ativado'; C.save()
  await L.end('QA106-r5')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally {
  L.saveAll('r5-c')
  await browser.close()
}
