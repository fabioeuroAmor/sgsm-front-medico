// RODADA 4 — limpeza pela UI (DEV): inativa em /pacientes os pacientes criados na rodada ("QA Paciente R4") e inativa SEC-A em /funcionarios
import fs from 'node:fs'
import { execSync } from 'node:child_process'
import * as L from './lib4.mjs'
import * as C from './r4-common.mjs'
const contas = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const browser = await L.launch()
try {
  L.start('LIMPEZA-r4')
  L.note('pacientes registrados pelo QA nesta rodada: ' + JSON.stringify(C.r4.pacientes.map((x) => `${x.nome} | ${x.email} | ${x.status}`)))
  const D = await L.newSession(browser, 'DEV')
  const p = D.page
  await L.login(p, 'dev-local@sgsm.local', 'Dev088c00c5ba89!Aa')
  await p.getByRole('link', { name: 'Pacientes' }).first().click()
  await p.waitForURL('**/pacientes')
  await p.getByPlaceholder('Buscar por nome, CPF ou e-mail…').fill('QA Paciente R4')
  await L.sleep(2000)
  L.note('antes: ' + JSON.stringify((await p.locator('div.grid > div').filter({ hasText: 'QA Paciente R4' }).allInnerTexts()).map((t) => t.replace(/\n/g, ' | '))))
  await L.shot(p, 'LIMPEZA-r4-a-pacientes-antes')
  for (let guard = 0; guard < 15; guard++) {
    const ativos = p.locator('div.grid > div').filter({ hasText: 'QA Paciente R4' }).filter({ hasText: 'Ativo' }).filter({ hasNotText: 'Inativo' })
    if (await ativos.count() === 0) break
    const c = ativos.first()
    const nome = (await c.locator('h3').innerText()).trim()
    await c.locator('button').last().click()
    const w = p.waitForResponse((r) => r.url().includes('/pacientes/') && r.request().method() !== 'GET')
    await L.modal(p).getByRole('button', { name: 'Inativar' }).click()
    const r = await w
    L.note(`inativar ${nome}: ${r.request().method()} ${r.url()} -> ${r.status()}`)
    await L.sleep(1500)
  }
  L.note('depois: ' + JSON.stringify((await p.locator('div.grid > div').filter({ hasText: 'QA Paciente R4' }).allInnerTexts()).map((t) => t.replace(/\n/g, ' | '))))
  await L.shot(p, 'LIMPEZA-r4-b-pacientes-depois')

  await p.getByRole('link', { name: 'Funcionários' }).first().click()
  await p.waitForURL('**/funcionarios')
  await p.getByPlaceholder('Buscar por nome, CPF, cargo ou e-mail…').fill('qa.conflito')
  await L.sleep(2000)
  const card = p.locator('div.grid > div').filter({ hasText: contas.A.email }).first()
  if ((await card.innerText()).includes('Inativo')) L.note('SEC-A ja inativa')
  else {
    await card.locator('button').last().click()
    const w = p.waitForResponse((r) => r.url().includes('/funcionarios/') && ['DELETE', 'PATCH', 'PUT'].includes(r.request().method()))
    await L.modal(p).getByRole('button', { name: 'Inativar' }).click()
    const r = await w
    L.note(`inativar ${contas.A.email}: ${r.request().method()} ${r.url()} -> ${r.status()}`)
    await L.sleep(1500)
  }
  L.note('cards secretarias QA: ' + JSON.stringify((await p.locator('div.grid > div').filter({ hasText: 'qa.conflito' }).allInnerTexts()).map((t) => t.replace(/\n/g, ' | '))))
  await L.shot(p, 'LIMPEZA-r4-c-funcionarios')
  const scan = execSync('docker exec redis-sgsm redis-cli --scan --pattern "sgsm:reserva*"').toString()
  L.note(`scan Redis sgsm:reserva* -> ${scan.trim().split('\n').filter(Boolean).length} chaves ${JSON.stringify(scan.trim())}`)
  await L.end('LIMPEZA-r4')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split(String.fromCharCode(10))[0]) } finally {
  L.saveAll('r4-h')
  await browser.close()
}
