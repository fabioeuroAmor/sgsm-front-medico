// QA024 — atualizacao ao focar: tentativas com janelas visiveis
import fs from 'node:fs'
import { execSync, spawn } from 'node:child_process'
import * as L from './lib.mjs'
const contas = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const browser = await L.launch()
const B = await L.newSession(browser, 'SEC-B')
const pb = B.page
await L.login(pb, contas.B.email, contas.B.senha)
await L.irAgendamentos(pb)
await L.wizardAte4(pb)
await pb.evaluate(() => {
  window.addEventListener('focus', () => console.log('QA-observador: window focus ' + new Date().toISOString()))
  window.addEventListener('blur', () => console.log('QA-observador: window blur ' + new Date().toISOString()))
})
L.start('QA024')
// Playwright emula foco por pagina (document.hasFocus sempre true); desliga a emulacao para valer o foco real do SO
const cdp = await B.ctx.newCDPSession(pb)
await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: false })
L.note('CDP Emulation.setFocusEmulationEnabled(false) aplicado na aba de SEC-B')
const espera = (lbl) => pb.waitForResponse((r) => r.url().includes('/agendamentos/slots'), { timeout: 8000 })
  .then((r) => L.note(`${lbl}: GET slots ${r.status()}`)).catch(() => L.note(`${lbl}: nenhum GET slots em 8 s`))

// Tentativa 1: outra JANELA (outro contexto) ganha o foco e depois a janela de SEC-B volta
const X = await L.newSession(browser, 'OUTRA-JANELA')
await X.page.goto(L.BASE + '/login')
await X.page.bringToFront()
await L.sleep(2000)
L.note('hasFocus SEC-B apos outra janela na frente: ' + await pb.evaluate(() => document.hasFocus()))
let w = espera('tentativa 1 (bringToFront janela SEC-B)')
await pb.bringToFront()
await w
L.note('hasFocus SEC-B: ' + await pb.evaluate(() => document.hasFocus()))

// Tentativa 2: foco real do SO via PowerShell (AppActivate) alternando para o Bloco de Notas e de volta para o Chromium
let np = null
try {
  np = spawn('notepad.exe', [])
  await L.sleep(2500)
  execSync(`powershell -NoProfile -Command "$w=New-Object -ComObject WScript.Shell; $null=$w.AppActivate('Bloco de notas'); $null=$w.AppActivate('Notepad')"`)
  await L.sleep(2000)
  L.note('hasFocus SEC-B com Bloco de Notas na frente: ' + await pb.evaluate(() => document.hasFocus()))
  await L.shot(pb, 'QA024-a-antes-de-voltar')
  const titulo = await pb.title()
  w = espera('tentativa 2 (AppActivate de volta para a janela do Chromium)')
  execSync(`powershell -NoProfile -Command "$w=New-Object -ComObject WScript.Shell; $null=$w.AppActivate('${titulo.replace(/'/g, '')}')"`)
  await w
  L.note('hasFocus SEC-B: ' + await pb.evaluate(() => document.hasFocus()))
} catch (e) { L.note('tentativa 2 erro: ' + e.message) }
await L.shot(pb, 'QA024-b')
await L.end('QA024', 'janelas visiveis (headed); tentativas: bringToFront entre janelas e AppActivate do SO')
try { np && np.kill() } catch {}
await L.fecharModal(pb)
await L.sleep(1000)
await browser.close()
