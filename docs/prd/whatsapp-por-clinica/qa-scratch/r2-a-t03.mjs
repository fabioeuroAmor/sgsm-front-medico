// RODADA 2 — WA-T03 (regressao): clinica sem numero -> card "Nenhum WhatsApp conectado", GET 404 sem toast
import fs from 'node:fs'
import * as L from './lib.mjs'
const C = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const browser = await L.launch()
try {
  L.start('R2-WA-T03')
  L.sql(`select instancia, status from sgsm.whatsapp_canal where estabelecimento_id='${L.CLIN_A}' and status<>'REMOVIDO'`)
  const A = await L.newSession(browser, 'ADM-A')
  const p = A.page
  await L.login(p, C.ADM_A.email, C.ADM_A.senha, { esperar: null })
  await p.waitForURL((u) => u.pathname !== '/login', { timeout: 20000 })
  const i0 = L.LINES.length
  await p.getByRole('link', { name: 'WhatsApp da clínica' }).first().click()
  await p.getByText('Nenhum WhatsApp conectado').waitFor({ timeout: 20000 })
  await L.sleep(2500)
  L.note(`respostas=${JSON.stringify(L.respostas(i0, /whatsapp|estabelecimentos/))} | card "Nenhum WhatsApp conectado": ${await p.getByText('Nenhum WhatsApp conectado').count()} | botao Conectar: ${await p.getByRole('button', { name: /Conectar WhatsApp/ }).count()} | toasts=${JSON.stringify(await L.toasts(p))} | cards de erro: ${await p.getByText(/Não foi possível/).count()}`)
  await L.shot(p, 'R2-WA-T03-nenhum-conectado')
  await L.end('R2-WA-T03')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally { L.saveAll('r2-a'); await browser.close() }
