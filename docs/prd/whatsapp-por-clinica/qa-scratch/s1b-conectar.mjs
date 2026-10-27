// WA-T04 (Conectar -> 201 + QR), WA-T06 (polling ~5s e para ao trocar de pagina), WA-T07 (recarregar com QR pendente),
// WA-T09 (FUNCIONARIO ve o status sem botoes), WA-T08 (admin de duas clinicas troca no seletor, sem "piscar")
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
const qrInfo = (p) => p.evaluate(() => {
  const img = document.querySelector('img[alt="QR code para conectar o WhatsApp da clínica"]')
  return img ? { presente: true, completo: img.complete, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, prefixo: img.src.slice(0, 30), tamanhoSrc: img.src.length } : { presente: false }
})
const getsStatus = (desde) => L.LINES.slice(desde).filter((l) => / >> GET /.test(l) && STATUS_RE.test(l.split(' ')[4] || ''))

const browser = await L.launch()
try {
  const A = await L.newSession(browser, 'ADM-A')
  const p = A.page
  await entrar(p, C.ADM_A)
  await abrirTela(p)
  await p.getByText('Nenhum WhatsApp conectado').waitFor({ timeout: 20000 })

  // ── WA-T04 ──
  L.start('WA-T04')
  const t0 = L.isoAgora()
  await L.evo('/instance/fetchInstances')
  const wPost = p.waitForResponse((r) => STATUS_RE.test(r.url()) && r.request().method() === 'POST', { timeout: 60000 })
  await p.getByRole('button', { name: /Conectar WhatsApp/ }).click()
  const rp = await wPost
  await p.locator('img[alt="QR code para conectar o WhatsApp da clínica"]').waitFor({ timeout: 20000 })
  await L.sleep(1500)
  const qi = await qrInfo(p)
  L.note(`POST -> ${rp.status()} | QR: ${JSON.stringify(qi)} | "Conferindo a cada 5 segundos…": ${await p.getByText('Conferindo a cada 5 segundos…').count()} | titulo: ${JSON.stringify(await p.getByText('Aguardando a leitura do QR code').allInnerTexts())} | toasts=${JSON.stringify(await L.toasts(p))}`)
  await L.shot(p, 'WA-T04-qr')
  L.sql(`select instancia, status, numero_e164, criado_em from sgsm.whatsapp_canal where estabelecimento_id='${L.CLIN_A}' and status<>'REMOVIDO'`)
  await L.evo('/instance/fetchInstances')
  L.logServico('sgsm.log', t0, /Canal WhatsApp|whatsapp_canal|Evolution|WARN|ERROR/, { max: 30, rotulo: 'sgsm.log' })
  await L.end('WA-T04')

  // ── WA-T06 ──
  L.start('WA-T06')
  const i6 = L.LINES.length
  await L.sleep(21000)
  const gs = getsStatus(i6)
  const tempos = gs.map((l) => Date.parse(l.slice(0, 24)))
  const deltas = tempos.slice(1).map((t, k) => ((t - tempos[k]) / 1000).toFixed(1))
  L.note(`com o QR na tela, em 21s: ${gs.length} GET de status | intervalos (s): ${JSON.stringify(deltas)}`)
  await L.shot(p, 'WA-T06-a-qr-com-polling')
  await p.getByRole('link', { name: 'Pacientes' }).first().click()
  await p.waitForURL('**/pacientes')
  const i6b = L.LINES.length
  await L.sleep(16000)
  L.note(`depois de ir para /pacientes, em 16s: ${getsStatus(i6b).length} GET de status (esperado 0)`)
  await L.shot(p, 'WA-T06-b-outra-pagina-sem-polling')
  await L.end('WA-T06')

  // ── WA-T07 ──
  L.start('WA-T07')
  const antes = L.sql(`select id, instancia, status from sgsm.whatsapp_canal where estabelecimento_id='${L.CLIN_A}' and status<>'REMOVIDO'`)
  await abrirTela(p)
  await p.locator('img[alt="QR code para conectar o WhatsApp da clínica"]').waitFor({ timeout: 20000 })
  const i7 = L.LINES.length
  await p.reload()
  await p.locator('img[alt="QR code para conectar o WhatsApp da clínica"]').waitFor({ timeout: 20000 })
  await L.sleep(2000)
  L.note(`apos recarregar: respostas=${JSON.stringify(L.respostas(i7, /whatsapp/))} | POST disparado? ${L.LINES.slice(i7).some((l) => / >> POST .*\/whatsapp/.test(l))} | QR: ${JSON.stringify(await qrInfo(p))} | botao Conectar: ${await p.getByRole('button', { name: /Conectar WhatsApp/ }).count()}`)
  await L.shot(p, 'WA-T07-recarregado-qr')
  const depois = L.sql(`select id, instancia, status from sgsm.whatsapp_canal where estabelecimento_id='${L.CLIN_A}' and status<>'REMOVIDO'`)
  L.note(`mesmo canal antes/depois: ${antes.split('\n').slice(2, 3).join() === depois.split('\n').slice(2, 3).join()}`)
  await L.evo('/instance/fetchInstances')
  await L.end('WA-T07')

  // ── WA-T09 ──
  L.start('WA-T09')
  const F = await L.newSession(browser, 'FUNC-A')
  const f = F.page
  await entrar(f, C.FUNC_A)
  await abrirTela(f)
  await f.getByText(/Aguardando a leitura do QR code|O número desconectou/).first().waitFor({ timeout: 20000 })
  await L.sleep(1500)
  L.note(`FUNC-A: status visivel=${JSON.stringify(await f.getByText(/Aguardando a leitura do QR code|O número desconectou/).allInnerTexts())} | aviso=${JSON.stringify(await f.getByText('O administrador do estabelecimento precisa concluir a conexão.').allInnerTexts())} | botao Conectar: ${await f.getByRole('button', { name: /Conectar/ }).count()} | botao Desconectar: ${await f.getByRole('button', { name: /Desconectar/ }).count()} | QR: ${JSON.stringify(await qrInfo(f))}`)
  await L.shot(f, 'WA-T09-funcionario-status')
  await L.end('WA-T09')
  await F.ctx.close()

  // ── WA-T08 ──
  L.start('WA-T08')
  const AB = await L.newSession(browser, 'ADM-AB')
  const q = AB.page
  await entrar(q, C.ADM_AB)
  await abrirTela(q)
  await L.sleep(3000)
  const opts = await q.getByLabel('Estabelecimento').locator('option').evaluateAll((os) => os.map((o) => ({ v: o.value, t: o.textContent })))
  L.note(`ADM-AB opcoes do seletor: ${JSON.stringify(opts)} | selecionada: ${await q.getByLabel('Estabelecimento').inputValue()}`)
  // amostra o DOM a cada ~30ms durante a troca: qual estado aparece (QR, "Nenhum", spinner, erro)
  await q.evaluate(() => {
    window.__amostras = []
    const t0 = performance.now()
    const tick = () => {
      const img = document.querySelector('img[alt="QR code para conectar o WhatsApp da clínica"]')
      const txt = document.body.innerText
      const est = img ? 'QR(' + img.src.slice(-16) + ')' : txt.includes('Nenhum WhatsApp conectado') ? 'NENHUM' : txt.includes('Não foi possível consultar') ? 'ERRO' : document.querySelector('.animate-spin') ? 'CARREGANDO' : 'VAZIO'
      const sel = document.querySelector('select[aria-label="Estabelecimento"]')?.value?.slice(0, 8)
      const ult = window.__amostras[window.__amostras.length - 1]
      if (!ult || ult.est !== est || ult.sel !== sel) window.__amostras.push({ ms: Math.round(performance.now() - t0), sel, est })
      if (performance.now() - t0 < 20000) setTimeout(tick, 30)
    }
    tick()
  })
  const optA = opts.find((o) => o.v === L.CLIN_A), optB = opts.find((o) => o.v === L.CLIN_B)
  const atual = await q.getByLabel('Estabelecimento').inputValue()
  const ordem = atual === L.CLIN_A ? [optB, optA] : [optA, optB]
  await L.shot(q, 'WA-T08-a-inicio-' + (atual === L.CLIN_A ? 'saolucas' : 'strix'))
  for (const o of ordem) {
    const w = q.waitForResponse((r) => r.url().includes(o.v + '/whatsapp') && r.request().method() === 'GET', { timeout: 20000 }).catch(() => null)
    await q.getByLabel('Estabelecimento').selectOption(o.v)
    const r = await w
    await L.sleep(2500)
    L.note(`trocou para ${o.t} -> GET ${r ? r.status() : '?'} | tela: Nenhum=${await q.getByText('Nenhum WhatsApp conectado').count()} QR=${JSON.stringify(await qrInfo(q))} Desconectar=${await q.getByRole('button', { name: /Desconectar/ }).count()}`)
    await L.shot(q, 'WA-T08-b-trocou-para-' + (o.v === L.CLIN_A ? 'saolucas' : 'strix'))
  }
  await L.sleep(3000)
  L.note(`amostras do DOM durante as trocas (sel=8 1os chars da clinica selecionada): ${JSON.stringify(await q.evaluate(() => window.__amostras))}`)
  await L.end('WA-T08')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally {
  L.saveAll('s1b')
  await browser.close()
}
