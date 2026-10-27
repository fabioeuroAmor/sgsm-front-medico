// SETUP-BOT — ADM-A conecta de novo o WhatsApp da Clinica São Lucas pela tela (canal PENDENTE_QR para os itens WA-B*)
import fs from 'node:fs'
import * as L from './lib.mjs'
const C = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const browser = await L.launch()
try {
  L.start('R2-SETUP-BOT')
  for (const [k, rot, png] of [['ADM_A', 'ADM-A', 'saolucas'], ['ADM_B', 'ADM-B', 'strix']]) {
  const A = await L.newSession(browser, rot)
  const a = A.page
  await L.login(a, C[k].email, C[k].senha, { esperar: null })
  await a.waitForURL((u) => u.pathname !== '/login', { timeout: 20000 })
  await a.getByRole('link', { name: 'WhatsApp da clínica' }).first().click()
  await a.getByText('Nenhum WhatsApp conectado').waitFor({ timeout: 20000 })
  const w = a.waitForResponse((r) => /\/whatsapp$/.test(r.url()) && r.request().method() === 'POST', { timeout: 60000 })
  await a.getByRole('button', { name: /Conectar WhatsApp/ }).click()
  L.note(`POST -> ${(await w).status()}`)
  await a.locator('img[alt="QR code para conectar o WhatsApp da clínica"]').waitFor({ timeout: 20000 })
  await L.shot(a, 'R2-SETUP-BOT-qr-' + png)
  }
  L.sql(`select instancia, estabelecimento_id, status from sgsm.whatsapp_canal where status<>'REMOVIDO'`)
  await L.evo('/instance/fetchInstances')
  await L.end('R2-SETUP-BOT')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally { L.saveAll('r2-d'); await browser.close() }
