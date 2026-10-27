// WA-T02 (menu por perfil), WA-T01 (admin abre a tela), WA-T03 (clinica sem numero: card + 404 sem toast)
import fs from 'node:fs'
import * as L from './lib.mjs'
const C = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const itemMenu = (p) => p.getByRole('link', { name: 'WhatsApp da clínica' })
async function entrar(p, conta) {
  await L.login(p, conta.email, conta.senha, { esperar: null })
  await p.waitForURL((u) => u.pathname !== '/login', { timeout: 20000 })
  await L.sleep(2500)
}

const browser = await L.launch()
try {
  // ── WA-T02 ──
  L.start('WA-T02')
  const F = await L.newSession(browser, 'FUNC-A')
  await entrar(F.page, C.FUNC_A)
  L.note(`FUNC-A (${C.FUNC_A.email}) url=${F.page.url()} | item "WhatsApp da clínica" no menu: ${await itemMenu(F.page).count()}`)
  await itemMenu(F.page).first().scrollIntoViewIfNeeded().catch(() => {})
  await L.shot(F.page, 'WA-T02-a-funcionario-ve-item')
  const M = await L.newSession(browser, 'MEDICO')
  await entrar(M.page, C.MEDICO)
  L.note(`MEDICO (${C.MEDICO.email}) url=${M.page.url()} | item no menu: ${await itemMenu(M.page).count()} | links do menu: ${JSON.stringify((await M.page.locator('nav a').allInnerTexts()).map((t) => t.trim()))}`)
  await L.shot(M.page, 'WA-T02-b-medico-sem-item')
  await M.page.goto(L.BASE + '/whatsapp-clinica')
  await L.sleep(3000)
  const txt = await M.page.getByText('O WhatsApp da clínica é gerenciado pela equipe do estabelecimento.').count()
  L.note(`MEDICO abriu ${L.BASE}/whatsapp-clinica direto -> url=${M.page.url()} | mensagem de acesso visivel: ${txt} | botao Conectar: ${await M.page.getByRole('button', { name: /Conectar WhatsApp/ }).count()}`)
  await L.shot(M.page, 'WA-T02-c-medico-url-direta')
  const P = await L.newSession(browser, 'PACIENTE')
  await entrar(P.page, C.PACIENTE)
  L.note(`PACIENTE (${C.PACIENTE.email}) url=${P.page.url()} | item no menu: ${await itemMenu(P.page).count()} | links do menu: ${JSON.stringify((await P.page.locator('nav a').allInnerTexts()).map((t) => t.trim()))}`)
  await L.shot(P.page, 'WA-T02-d-paciente-sem-item')
  await L.end('WA-T02')

  // ── WA-T01 ──
  L.start('WA-T01')
  const A = await L.newSession(browser, 'ADM-A')
  const p = A.page
  await entrar(p, C.ADM_A)
  L.note(`ADM-A (${C.ADM_A.email}) url=${p.url()} | item no menu: ${await itemMenu(p).count()}`)
  const wGet = p.waitForResponse((r) => /\/estabelecimentos\/[^/]+\/whatsapp$/.test(r.url()) && r.request().method() === 'GET', { timeout: 20000 }).catch(() => null)
  await itemMenu(p).first().click()
  await p.waitForURL('**/whatsapp-clinica')
  await p.getByRole('heading', { name: /WhatsApp da clínica/ }).waitFor()
  const rGet = await wGet
  await L.sleep(1500)
  L.note(`clicou no item -> url=${p.url()} | titulo: ${JSON.stringify(await p.getByRole('heading', { level: 1 }).innerText())} | seletor: ${JSON.stringify(await p.getByLabel('Estabelecimento').locator('option').allInnerTexts())}`)
  await L.shot(p, 'WA-T01-tela-admin')
  await L.end('WA-T01')

  // ── WA-T03 ──
  L.start('WA-T03')
  L.note(`GET do status ao abrir a tela: ${rGet ? rGet.status() + ' ' + rGet.url() : 'nao capturado'}`)
  const i0 = L.LINES.length
  await p.reload()
  await p.getByText('Nenhum WhatsApp conectado').waitFor({ timeout: 20000 })
  await L.sleep(2500)
  L.note(`apos recarregar: respostas=${JSON.stringify(L.respostas(i0, /whatsapp/))} | card "Nenhum WhatsApp conectado": ${await p.getByText('Nenhum WhatsApp conectado').count()} | botao Conectar: ${await p.getByRole('button', { name: /Conectar WhatsApp/ }).count()} | toasts=${JSON.stringify(await L.toasts(p))} | card de erro: ${await p.getByText('Não foi possível consultar o WhatsApp da clínica').count()}`)
  L.sql(`select instancia, status from sgsm.whatsapp_canal where estabelecimento_id='${L.CLIN_A}' order by criado_em`)
  await L.shot(p, 'WA-T03-nenhum-conectado')
  await L.end('WA-T03')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally {
  L.saveAll('s1a')
  await browser.close()
}
