// WA-T05 (clique duplo em Conectar, ADM-B na Clinica Teste Strix), WA-T10 (ADM-B na API da Clinica São Lucas),
// WA-O02 (/v1/api/interno/whatsapp/** sem token de DESENVOLVEDOR), WA-T14 (sessao expirada na tela, ADM-B),
// WA-T13 (Desconectar: cancelar e confirmar, ADM-A), WA-T15 (Trafego pago, Pacientes, Agendamentos)
import fs from 'node:fs'
import * as L from './lib.mjs'
const C = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const STATUS_RE = /\/estabelecimentos\/[^/]+\/whatsapp$/
async function entrar(p, conta) {
  await L.login(p, conta.email, conta.senha, { esperar: null })
  await p.waitForURL((u) => u.pathname !== '/login', { timeout: 20000 })
  await L.sleep(1500)
}
async function abrirTela(p) {
  await p.getByRole('link', { name: 'WhatsApp da clínica' }).first().click()
  await p.waitForURL('**/whatsapp-clinica')
}
const conta = (desde, re) => L.LINES.slice(desde).filter((l) => re.test(l)).length

const browser = await L.launch()
try {
  const B = await L.newSession(browser, 'ADM-B')
  const p = B.page
  await entrar(p, C.ADM_B)
  await abrirTela(p)
  if (!process.env.DESDE_O02) await p.getByText('Nenhum WhatsApp conectado').waitFor({ timeout: 20000 })
  else await L.sleep(3000)

  if (!process.env.DESDE_O02) {
  // ── WA-T05 ──
  L.start('WA-T05')
  L.sql(`select instancia, status from sgsm.whatsapp_canal where estabelecimento_id='${L.CLIN_B}' and status<>'REMOVIDO'`)
  const i5 = L.LINES.length
  const btn = p.getByRole('button', { name: /Conectar WhatsApp/ })
  // estado do botao logo apos o 1o clique (amostrado no navegador)
  await p.evaluate(() => {
    window.__btn = []
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Conectar WhatsApp'))
    const t0 = performance.now()
    const tick = () => { const bb = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Conectar WhatsApp')); const s = bb ? (bb.disabled ? 'desabilitado' : 'habilitado') : 'sumiu'; const u = window.__btn[window.__btn.length - 1]; if (!u || u.s !== s) window.__btn.push({ ms: Math.round(performance.now() - t0), s }); if (performance.now() - t0 < 15000) setTimeout(tick, 10) }
    b.addEventListener('click', () => { window.__btn.push({ ms: 0, s: 'clique' }) }, { capture: true })
    tick()
  })
  await btn.dblclick()
  await p.locator('img[alt="QR code para conectar o WhatsApp da clínica"]').waitFor({ timeout: 60000 })
  await L.sleep(2500)
  L.note(`clique duplo -> POSTs enviados=${conta(i5, / >> POST .*\/estabelecimentos\/.*\/whatsapp /)} | respostas POST=${JSON.stringify(L.respostas(i5, /POST .*whatsapp/))} | estado do botao (amostras)=${JSON.stringify(await p.evaluate(() => window.__btn))}`)
  await L.shot(p, 'WA-T05-duplo-clique-um-post')
  L.sql(`select instancia, status, criado_em from sgsm.whatsapp_canal where estabelecimento_id='${L.CLIN_B}' and status<>'REMOVIDO'`)
  await L.evo('/instance/fetchInstances')
  await L.end('WA-T05')

  // ── WA-T10 ──
  L.start('WA-T10')
  for (const [m, rot] of [['get', 'consultar'], ['post', 'conectar'], ['delete', 'desconectar']]) {
    const r = await L.apiNaApp(p, m, `/estabelecimentos/${L.CLIN_A}/whatsapp`)
    L.note(`ADM-B (so Clinica Teste Strix) ${m.toUpperCase()} /estabelecimentos/${L.CLIN_A}/whatsapp (${rot}) -> ${r.status} ${JSON.stringify(r.data)}`)
  }
  // e pelo navegador "na mao": barra de endereco direto na API da clinica alheia (sem token -> so mostra o 401)
  L.sql(`select instancia, status from sgsm.whatsapp_canal where estabelecimento_id='${L.CLIN_A}' and status<>'REMOVIDO'`)
  await L.evo('/instance/fetchInstances')
  await L.shot(p, 'WA-T10-adm-b-tela-propria')
  // print com o resultado na propria tela: mostra as respostas num painel visivel
  await p.evaluate((txt) => { const d = document.createElement('pre'); d.id = 'qa-res'; d.style.cssText = 'position:fixed;bottom:10px;left:270px;right:10px;background:#111;color:#0f0;padding:10px;z-index:9999;font-size:12px;white-space:pre-wrap'; d.textContent = txt; document.body.appendChild(d) },
    'QA (saida crua das chamadas feitas pela app do ADM-B):\n' + L.LINES.slice(-40).filter((l) => /<< \d+ (GET|POST|DELETE) .*655759aa.*whatsapp/.test(l)).join('\n'))
  await L.shot(p, 'WA-T10-respostas-403')
  await p.evaluate(() => document.getElementById('qa-res')?.remove())
  await L.end('WA-T10')
  }

  // ── WA-O02 ──
  L.start('WA-O02')
  for (const u of ['/interno/whatsapp/canais', '/interno/whatsapp/canais/sgsm-bot', `/interno/whatsapp/consentimentos?telefone=5511900000000&estabelecimentoId=${L.CLIN_A}`]) {
    const r = await L.apiNaApp(p, 'get', u)
    L.note(`ADM-B (ADMIN_ESTABELECIMENTO) GET /v1/api${u} -> ${r.status} ${JSON.stringify(r.data)}`)
  }
  const T = await L.newSession(browser, 'ANONIMO')
  await T.page.goto(L.BASE + '/login')
  const crus = await T.page.evaluate(async () => {
    const out = []
    for (const u of ['/v1/api/interno/whatsapp/canais', '/v1/api/interno/whatsapp/canais/sgsm-bot', '/v1/api/interno/whatsapp/vinculos']) {
      const r = await fetch(u, { method: u.endsWith('vinculos') ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, body: u.endsWith('vinculos') ? '{}' : undefined })
      out.push(`${u.endsWith('vinculos') ? 'POST' : 'GET'} ${u} (sem Authorization) -> HTTP ${r.status} www-authenticate=${r.headers.get('www-authenticate')} corpo=${JSON.stringify((await r.text()).slice(0, 200))}`)
    }
    const d = document.createElement('pre'); d.style.cssText = 'position:fixed;top:10px;left:10px;right:10px;background:#111;color:#0f0;padding:12px;z-index:9999;font-size:13px;white-space:pre-wrap'; d.textContent = 'QA — navegador sem login chamando a API interna do WhatsApp:\n' + out.join('\n'); document.body.appendChild(d)
    return out
  })
  for (const c of crus) L.note('ANONIMO ' + c)
  await L.shot(T.page, 'WA-O02-sem-token-401')
  const P = await L.newSession(browser, 'PACIENTE')
  await entrar(P.page, C.PACIENTE)
  const rp = await L.apiNaApp(P.page, 'get', '/interno/whatsapp/canais')
  L.note(`PACIENTE GET /v1/api/interno/whatsapp/canais -> ${rp.status} ${JSON.stringify(rp.data)}`)
  await L.end('WA-O02')
  await T.ctx.close(); await P.ctx.close()

  // ── WA-T14 ── (ADM-B com QR pendente na tela: polling a cada 5s)
  L.start('WA-T14')
  await abrirTela(p)
  await p.locator('img[alt="QR code para conectar o WhatsApp da clínica"]').waitFor({ timeout: 20000 })
  await p.evaluate(async () => {
    const m = await import('/src/services/tokenStore.ts')
    m.tokenStore.set('token-expirado-qa')
    localStorage.setItem('refresh_token', 'refresh-revogado-qa')
  })
  L.note('sessao invalidada no navegador: token de acesso trocado por um invalido e refresh_token por um revogado (simula expiracao dos dois); nenhuma acao do usuario depois disso')
  const t14 = Date.now()
  await p.waitForURL('**/login?sessao=expirada', { timeout: 20000 }).then(() => L.note(`redirecionou sozinho em ${((Date.now() - t14) / 1000).toFixed(1)}s -> ${p.url()}`)).catch(() => L.note('NAO redirecionou; url=' + p.url()))
  await L.sleep(1500)
  L.note(`tela de login: textos com "sess"=${JSON.stringify(await p.getByText(/sess[aã]o/i).allInnerTexts())} | toasts=${JSON.stringify(await L.toasts(p))}`)
  await L.shot(p, 'WA-T14-login-sessao-expirada')
  await L.end('WA-T14')

  // ── WA-T13 ── (ADM-A, Clinica São Lucas com QR pendente)
  L.start('WA-T13')
  const A = await L.newSession(browser, 'ADM-A')
  const a = A.page
  await entrar(a, C.ADM_A)
  await abrirTela(a)
  await a.locator('img[alt="QR code para conectar o WhatsApp da clínica"]').waitFor({ timeout: 20000 })
  const instA = L.sql(`select instancia, status from sgsm.whatsapp_canal where estabelecimento_id='${L.CLIN_A}' and status<>'REMOVIDO'`)
  const nomeA = (instA.match(/sgsm-655759aa-[0-9a-f]{6}/) || [])[0]
  let msg = null
  a.once('dialog', async (d) => { msg = d.message(); L.note(`confirm aberto: ${JSON.stringify(d.message())} -> usuario clica CANCELAR`); await d.dismiss() })
  let i13 = L.LINES.length
  await a.getByRole('button', { name: /Desconectar/ }).click()
  await L.sleep(3000)
  L.note(`apos cancelar: DELETE enviados=${conta(i13, / >> DELETE /)} | QR ainda na tela=${await a.locator('img[alt="QR code para conectar o WhatsApp da clínica"]').count()}`)
  await L.shot(a, 'WA-T13-a-cancelou')
  a.once('dialog', async (d) => { L.note(`confirm aberto de novo -> usuario clica OK`); await d.accept() })
  i13 = L.LINES.length
  const wDel = a.waitForResponse((r) => STATUS_RE.test(r.url()) && r.request().method() === 'DELETE', { timeout: 30000 })
  await a.getByRole('button', { name: /Desconectar/ }).click()
  const rd = await wDel
  await a.getByText('Nenhum WhatsApp conectado').waitFor({ timeout: 10000 }).catch(() => {})
  await L.sleep(500)
  L.note(`confirmou: DELETE -> ${rd.status()} | toasts=${JSON.stringify(await L.toasts(a))} | card "Nenhum WhatsApp conectado"=${await a.getByText('Nenhum WhatsApp conectado').count()}`)
  await L.shot(a, 'WA-T13-b-desconectado')
  L.sql(`select instancia, status, atualizado_em from sgsm.whatsapp_canal where instancia='${nomeA}'`)
  await L.evo('/instance/fetchInstances')
  await L.evo(`/instance/connectionState/${nomeA}`)
  await L.end('WA-T13', `instancia da Clinica São Lucas: ${nomeA}`)

  // ── WA-T15 ──
  L.start('WA-T15')
  for (const [nome, rota] of [['Tráfego pago', '/marketing'], ['Pacientes', '/pacientes'], ['Agendamentos', '/agendamentos']]) {
    const i = L.LINES.length
    await a.getByRole('link', { name: nome }).first().click()
    await L.sleep(4000)
    const erros = L.LINES.slice(i).filter((l) => /PAGEERROR|CONSOLE\.error| << 5\d\d /.test(l))
    L.note(`${nome}: url=${a.url()} | h1=${JSON.stringify(await a.locator('h1').first().innerText().catch(() => '?'))} | respostas=${JSON.stringify(L.respostas(i, /\/(v1|marketing|crm|ia)\//))} | erros de pagina/5xx=${erros.length} | toasts=${JSON.stringify(await L.toasts(a))}`)
    await L.shot(a, `WA-T15-${rota.slice(1)}`)
  }
  await L.end('WA-T15')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally {
  L.saveAll('s1c')
  await browser.close()
}
