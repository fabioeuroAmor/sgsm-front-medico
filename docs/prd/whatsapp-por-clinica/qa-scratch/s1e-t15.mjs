// WA-T15 (refeito com a rede /marketing/ capturada): Trafego pago, Pacientes, Agendamentos abrem normalmente (ADM-A)
import fs from 'node:fs'
import * as L from './lib.mjs'
const C = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const browser = await L.launch()
try {
  L.start('WA-T15')
  const A = await L.newSession(browser, 'ADM-A')
  const a = A.page
  await L.login(a, C.ADM_A.email, C.ADM_A.senha, { esperar: null })
  await a.waitForURL((u) => u.pathname !== '/login', { timeout: 20000 })
  await L.sleep(1500)
  for (const [nome, arq] of [['Tráfego pago', 'trafego-pago'], ['Pacientes', 'pacientes'], ['Agendamentos', 'agendamentos'], ['WhatsApp da clínica', 'whatsapp-clinica']]) {
    const i = L.LINES.length
    await a.getByRole('link', { name: nome }).first().click()
    await L.sleep(4500)
    const erros = L.LINES.slice(i).filter((l) => /PAGEERROR| << 5\d\d /.test(l))
    L.note(`${nome}: url=${a.url()} | h1=${JSON.stringify(await a.locator('h1').first().innerText().catch(() => '?'))} | respostas=${JSON.stringify(L.respostas(i, /\/(v1|marketing|crm|ia)\//))} | PAGEERROR/5xx=${JSON.stringify(erros.map((l) => l.slice(0, 300)))} | toasts=${JSON.stringify(await L.toasts(a))}`)
    await L.shot(a, `WA-T15-${arq}`)
  }
  await L.end('WA-T15')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally { L.saveAll('s1e'); await browser.close() }
