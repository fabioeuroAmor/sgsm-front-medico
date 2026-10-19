// RODADA 7 — QA106 (codigo certo da conta A -> ativa -> login PACIENTE) e limpeza pela UI (DEV): inativa "QA Paciente R7". Sem mock.
import { execSync } from 'node:child_process'
import * as L from './lib5.mjs'
import * as C from './r7-common.mjs'
const browser = await L.launch()
const cards = (p, t) => p.locator('div.grid > div').filter({ hasText: t })
const txt = async (loc) => (await loc.allInnerTexts()).map((t) => t.replace(/\n/g, ' | '))
const A = C.r7.pacientes.find((x) => x.rotulo === 'A')
try {
  L.start('QA106-r7')
  const S = await L.newSession(browser, 'ANON-106')
  const p = S.page
  await p.goto(L.BASE + '/registrar?ativar=' + encodeURIComponent(A.email))
  await p.getByRole('heading', { name: 'Ative sua conta' }).waitFor()
  const cod = L.codigoRedis(A.email)
  await p.getByLabel('Código de ativação').fill(cod)
  await L.shot(p, 'QA106-r7-a-codigo')
  const i0 = L.LINES.length
  const w = p.waitForResponse((r) => r.url().endsWith('/auth/ativar-conta') && r.request().method() === 'POST', { timeout: 15000 })
  await p.getByRole('button', { name: 'Ativar conta' }).click()
  const r = await w.catch(() => null)
  await p.waitForURL((u) => u.pathname === '/login', { timeout: 10000 }).catch(() => {})
  await p.locator('[data-sonner-toast]').first().waitFor({ timeout: 5000 }).catch(() => {})
  await L.sleep(300)
  L.note(`codigo (${L.m4(cod)}) -> ${r ? r.status() : 'sem resposta'} | toasts=${JSON.stringify(await L.toasts(p))} | url=${p.url()}`)
  await L.shot(p, 'QA106-r7-b-conta-ativada')
  await L.esperarToastsSumirem(p)
  await p.getByLabel('E-mail').fill(A.email)
  await p.getByLabel('Senha').fill(C.SENHA7)
  await p.getByRole('button', { name: 'Entrar' }).click()
  await p.waitForURL((u) => u.pathname !== '/login', { timeout: 20000 }).catch(() => {})
  await L.sleep(2500)
  const c = await p.evaluate(async () => { const m = await import('/src/services/tokenStore.ts'); const t = m.tokenStore.get(); if (!t) return null; const j = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); return { roles: j.roles, tipoPerfil: j.tipoPerfil } }).catch((e) => 'erro: ' + e.message)
  L.note(`login apos ativar: url=${p.url()} | claims=${JSON.stringify(c)} | menu=${JSON.stringify((await p.locator('aside').first().innerText().catch(() => '')).replace(/\n/g, ' | '))}`)
  L.note(`respostas: ${JSON.stringify(L.respostas(i0))}`)
  await L.shot(p, 'QA106-r7-c-logado-paciente')
  A.status = 'ativada'; C.save7()
  await L.end('QA106-r7', 'codigo lido no Redis no papel do usuario lendo o proprio e-mail (excecao autorizada)')
  await S.ctx.close()

  L.start('LIMPEZA-r7')
  L.note('pacientes da rodada: ' + JSON.stringify(C.r7.pacientes.map((x) => `${x.nome} | ${x.email} | ${x.status}`)))
  const D = await L.newSession(browser, 'DEV')
  const q = D.page
  await L.login(q, C.DEV_EMAIL, C.DEV_SENHA)
  await q.getByRole('link', { name: 'Pacientes' }).first().click()
  await q.waitForURL('**/pacientes')
  await q.getByPlaceholder('Buscar por nome, CPF ou e-mail…').fill('QA Paciente R7')
  await L.sleep(2000)
  L.note('pacientes antes: ' + JSON.stringify(await txt(cards(q, 'QA Paciente R7'))))
  await L.shot(q, 'LIMPEZA-r7-a-pacientes-antes')
  for (let g = 0; g < 10; g++) {
    const ativos = cards(q, 'QA Paciente R7').filter({ hasText: 'Ativo' }).filter({ hasNotText: 'Inativo' })
    if (await ativos.count() === 0) break
    const card = ativos.first()
    const nome = (await card.locator('h3').innerText()).trim()
    await card.locator('button').last().click()
    const wr = q.waitForResponse((r) => /\/pacientes\//.test(r.url()) && r.request().method() !== 'GET')
    await L.modal(q).getByRole('button', { name: 'Inativar' }).click()
    const rr = await wr
    L.note(`inativar paciente ${nome}: ${rr.request().method()} ${rr.url()} -> ${rr.status()}`)
    await L.sleep(1500)
  }
  L.note('pacientes depois: ' + JSON.stringify(await txt(cards(q, 'QA Paciente R7'))))
  await L.shot(q, 'LIMPEZA-r7-b-pacientes-depois')
  const scan = execSync('docker exec redis-sgsm redis-cli --scan --pattern "sgsm:reserva*"').toString()
  L.note(`scan Redis sgsm:reserva* -> ${scan.trim().split('\n').filter(Boolean).length} chaves`)
  await L.end('LIMPEZA-r7')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally {
  L.saveAll('r7-c')
  await browser.close()
}
