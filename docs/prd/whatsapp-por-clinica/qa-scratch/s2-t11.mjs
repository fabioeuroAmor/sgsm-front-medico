// WA-T11 — Evolution fora do ar (sgsm reiniciado com --sgsm.whatsapp.evolution.base-url=http://localhost:8097, porta sem servico)
import fs from 'node:fs'
import * as L from './lib.mjs'
const C = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const STATUS_RE = /\/estabelecimentos\/[^/]+\/whatsapp$/
const browser = await L.launch()
try {
  L.start('WA-T11')
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
  await L.shot(a, 'WA-T11-a-toast-503')
  await L.sleep(4000)
  L.note(`4s depois (toast sumindo): tela inteira ok? h1=${JSON.stringify(await a.locator('h1').innerText())} | PAGEERROR=${L.LINES.filter((l) => /PAGEERROR/.test(l)).length}`)
  L.sql(`select instancia, status from sgsm.whatsapp_canal where estabelecimento_id='${L.CLIN_A}' and status<>'REMOVIDO'`)
  // clinica com canal pendente (Strix): a consulta de status tambem depende da Evolution
  const B = await L.newSession(browser, 'ADM-B')
  const b = B.page
  await L.login(b, C.ADM_B.email, C.ADM_B.senha, { esperar: null })
  await b.waitForURL((u) => u.pathname !== '/login', { timeout: 20000 })
  const wg = b.waitForResponse((r) => STATUS_RE.test(r.url()) && r.request().method() === 'GET', { timeout: 60000 })
  await b.getByRole('link', { name: 'WhatsApp da clínica' }).first().click()
  const rg = await wg
  await L.sleep(2000)
  L.note(`ADM-B (canal pendente) abre a tela com a Evolution fora -> GET ${rg.status()} | card de erro=${JSON.stringify(await b.getByText('Não foi possível consultar o WhatsApp da clínica').allInnerTexts())} | botao "Tentar de novo"=${await b.getByRole('button', { name: /Tentar de novo/ }).count()} | toasts=${JSON.stringify(await L.toasts(b))}`)
  await L.shot(b, 'WA-T11-b-status-com-evolution-fora')
  L.logServico('sgsm-t11.log', t0, /WhatsappCanal|Evolution|8097|ServicoIndisponivel|Connection refused|WARN|ERROR/, { max: 25, rotulo: 'sgsm.log (instancia com Evolution em :8097)' })
  await L.end('WA-T11', 'sgsm rodando com --sgsm.whatsapp.evolution.base-url=http://localhost:8097 (nada escuta nessa porta)')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally { L.saveAll('s2'); await browser.close() }
