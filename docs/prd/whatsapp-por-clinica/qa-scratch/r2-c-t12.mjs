// WA-T12 — sgsm fora do ar com a tela aberta (ADM-AB, duas clinicas) e ao abrir a tela; depois o sgsm volta
// (subido de novo pelo subir.sh, fora deste script) e o botao "Tentar de novo" recupera.
import fs from 'node:fs'
import { execSync } from 'node:child_process'
import * as L from './lib.mjs'
const C = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const FLAG = new URL('./r2-t12-esperando-subir.flag', import.meta.url)
const STATUS_RE = /\/estabelecimentos\/[^/]+\/whatsapp$/
const codigo = async () => { try { return (await fetch('http://localhost:8080/actuator/health')).status } catch { return 'recusado' } }
function pararSgsm() {
  const ns = execSync('netstat -ano').toString().split(/\r?\n/).find((l) => /LISTENING/.test(l) && /0\.0\.0\.0:8080 /.test(l))
  const pid = ns.trim().split(/\s+/).pop()
  const pai = execSync(`powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}').ParentProcessId"`).toString().trim()
  execSync(`taskkill /PID ${pai} /T /F`)
  L.note(`sgsm parado: java ${pid} (mvn ${pai}) finalizado com taskkill`)
}
const browser = await L.launch()
try {
  L.start('R2-WA-T12')
  const S = await L.newSession(browser, 'ADM-AB')
  const p = S.page
  await L.login(p, C.ADM_AB.email, C.ADM_AB.senha, { esperar: null })
  await p.waitForURL((u) => u.pathname !== '/login', { timeout: 20000 })
  await p.getByRole('link', { name: 'WhatsApp da clínica' }).first().click()
  await p.getByText('Nenhum WhatsApp conectado').waitFor({ timeout: 20000 })
  L.note(`tela aberta com o sgsm no ar (Clinica São Lucas, sem numero). health=${await codigo()}`)
  await L.shot(p, 'R2-WA-T12-a-antes')
  pararSgsm()
  await L.sleep(3000)
  L.note(`health do sgsm agora: ${await codigo()}`)
  // 1) com a tela aberta, o usuario troca de clinica
  await p.getByLabel('Estabelecimento').selectOption(L.CLIN_B)
  await p.getByText('Não foi possível consultar o WhatsApp da clínica').waitFor({ timeout: 20000 }).catch(() => {})
  await L.sleep(1000)
  L.note(`sgsm fora, trocou para Strix: card de erro=${JSON.stringify(await p.getByText('Não foi possível consultar o WhatsApp da clínica').allInnerTexts())} | detalhe=${JSON.stringify(await p.locator('p.text-sm.text-muted-foreground').allInnerTexts())} | "Tentar de novo"=${await p.getByRole('button', { name: /Tentar de novo/ }).count()} | toasts=${JSON.stringify(await L.toasts(p))}`)
  await L.shot(p, 'R2-WA-T12-b-card-erro')
  // 2) clica "Tentar de novo" com o sgsm ainda fora
  await p.getByRole('button', { name: /Tentar de novo/ }).click()
  await L.sleep(3000)
  L.note(`"Tentar de novo" com o sgsm ainda fora: card de erro=${await p.getByText('Não foi possível consultar o WhatsApp da clínica').count()} | PAGEERROR=${L.LINES.filter((l) => /PAGEERROR/.test(l)).length}`)
  // 3) outro usuario ABRE a tela com o sgsm fora (sem ter carregado antes)
  const S2 = await L.newSession(browser, 'ADM-A')
  const q = S2.page
  await L.login(q, C.ADM_A.email, C.ADM_A.senha, { esperar: null })
  await q.waitForURL((u) => u.pathname !== '/login', { timeout: 20000 }).catch(() => {})
  await q.goto(L.BASE + '/whatsapp-clinica')
  await L.sleep(5000)
  L.note(`ADM-A abriu /whatsapp-clinica com o sgsm fora: url=${q.url()} | seletor=${JSON.stringify(await q.getByLabel('Estabelecimento').locator('option').allInnerTexts().catch(() => []))} | card "Não foi possível carregar os estabelecimentos"=${await q.getByText('Não foi possível carregar os estabelecimentos').count()} | card consultar=${await q.getByText('Não foi possível consultar o WhatsApp da clínica').count()} | "Tentar de novo"=${await q.getByRole('button', { name: /Tentar de novo/ }).count()} | "Nenhum WhatsApp conectado"=${await q.getByText('Nenhum WhatsApp conectado').count()} | toasts=${JSON.stringify(await L.toasts(q))}`)
  await L.shot(q, 'R2-WA-T12-c-abriu-com-sgsm-fora')
  // 4) espera o sgsm voltar (subido fora do script)
  fs.writeFileSync(FLAG, new Date().toISOString())
  L.note('aguardando o sgsm voltar (subir.sh sgsm)...')
  const t0 = Date.now()
  while ((await codigo()) !== 401 && Date.now() - t0 < 300000) await L.sleep(2000)
  fs.rmSync(FLAG, { force: true })
  L.note(`sgsm voltou: health=${await codigo()} apos ${((Date.now() - t0) / 1000).toFixed(0)}s`)
  await L.sleep(2000)
  const w = p.waitForResponse((r) => STATUS_RE.test(r.url()) && r.request().method() === 'GET', { timeout: 30000 })
  await p.getByRole('button', { name: /Tentar de novo/ }).click()
  const r = await w
  await p.locator('img[alt="QR code para conectar o WhatsApp da clínica"]').waitFor({ timeout: 20000 }).catch(() => {})
  await L.sleep(1500)
  L.note(`"Tentar de novo" com o sgsm de volta -> GET ${r.status()} | card de erro=${await p.getByText('Não foi possível consultar o WhatsApp da clínica').count()} | QR da Strix=${await p.locator('img[alt="QR code para conectar o WhatsApp da clínica"]').count()} | status=${JSON.stringify(await p.getByText(/Aguardando a leitura do QR code/).allInnerTexts())}`)
  await L.shot(p, 'R2-WA-T12-d-recuperou')
  const navAntes = L.LINES.filter((l) => /\[ADM-A#1\] NAVIGATED/.test(l)).length
  const wq = q.waitForResponse((r) => /\/v1\/api\/estabelecimentos$/.test(r.url()) && r.request().method() === 'GET', { timeout: 30000 }).catch(() => null)
  await q.getByRole('button', { name: /Tentar de novo/ }).click()
  const rq = await wq
  await q.getByText('Nenhum WhatsApp conectado').waitFor({ timeout: 20000 }).catch(() => {})
  await L.sleep(2000)
  L.note(`ADM-A clicou "Tentar de novo" (sem recarregar) com o sgsm de volta -> GET /estabelecimentos ${rq ? rq.status() : '?'} | navegacoes novas=${L.LINES.filter((l) => /\[ADM-A#1\] NAVIGATED/.test(l)).length - navAntes} | seletor=${JSON.stringify(await q.getByLabel('Estabelecimento').locator('option').allInnerTexts().catch(() => []))} | card carregar=${await q.getByText('Não foi possível carregar os estabelecimentos').count()} | "Nenhum WhatsApp conectado"=${await q.getByText('Nenhum WhatsApp conectado').count()}`)
  await L.shot(q, 'R2-WA-T12-e-adm-a-recuperou-sem-recarregar')
  await L.end('R2-WA-T12')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally { L.saveAll('r2-c'); await browser.close() }
