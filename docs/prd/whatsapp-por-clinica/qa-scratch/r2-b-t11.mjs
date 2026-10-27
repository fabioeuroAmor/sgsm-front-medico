// WA-T11 — Evolution fora do ar (sgsm reiniciado com --sgsm.whatsapp.evolution.base-url=http://localhost:8097, porta sem servico)
import fs from 'node:fs'
import * as L from './lib.mjs'
const C = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const STATUS_RE = /\/estabelecimentos\/[^/]+\/whatsapp$/
const browser = await L.launch()
try {
  L.start('R2-WA-T11')
  const t0 = L.isoAgora()
  const A = await L.newSession(browser, 'ADM-A')
  const a = A.page
  await L.login(a, C.ADM_A.email, C.ADM_A.senha, { esperar: null })
  await a.waitForURL((u) => u.pathname !== '/login', { timeout: 20000 })
  await a.getByRole('link', { name: 'WhatsApp da clínica' }).first().click()
  await a.getByText('Nenhum WhatsApp conectado').waitFor({ timeout: 20000 })
  const w = a.waitForResponse((r) => STATUS_RE.test(r.url()) && r.request().method() === 'POST', { timeout: 60000 })
  await a.getByRole('button', { name: /Conectar WhatsApp/ }).click()
  const r = await w
  await a.locator('[data-sonner-toast]').first().waitFor({ timeout: 10000 }).catch(() => {})
  await L.sleep(700)
  L.note(`ADM-A Conectar com a Evolution fora -> POST ${r.status()} | toasts=${JSON.stringify(await L.toasts(a))} | card "Nenhum WhatsApp conectado" continua=${await a.getByText('Nenhum WhatsApp conectado').count()} | botao Conectar habilitado=${await a.getByRole('button', { name: /Conectar WhatsApp/ }).isEnabled()}`)
  await L.shot(a, 'R2-WA-T11-a-toast-503')
  await L.sleep(4000)
  L.note(`4s depois (toast sumindo): tela inteira ok? h1=${JSON.stringify(await a.locator('h1').innerText())} | PAGEERROR=${L.LINES.filter((l) => /PAGEERROR/.test(l)).length}`)
  L.note(`apos o toast: botao Conectar habilitado=${await a.getByRole('button', { name: /Conectar WhatsApp/ }).isEnabled()} | card Nenhum=${await a.getByText('Nenhum WhatsApp conectado').count()}`)
  await L.shot(a, 'R2-WA-T11-b-depois-do-toast')
  L.sql(`select instancia, status from sgsm.whatsapp_canal where estabelecimento_id='${L.CLIN_A}' and status<>'REMOVIDO'`)
  await L.evo('/instance/fetchInstances')
  L.logServico('sgsm-t11.log', t0, /WhatsappCanal|Evolution|8097|ServicoIndisponivel|Connection refused|WARN|ERROR/, { max: 25, rotulo: 'sgsm.log (instancia com Evolution em :8097)' })
  await L.end('R2-WA-T11', 'sgsm rodando com --sgsm.whatsapp.evolution.base-url=http://localhost:8097 (nada escuta nessa porta)')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally { L.saveAll('r2-b'); await browser.close() }
