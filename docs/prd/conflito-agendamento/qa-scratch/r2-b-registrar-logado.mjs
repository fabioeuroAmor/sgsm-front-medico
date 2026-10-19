// RODADA 2 — QA062: 2a tentativa de obter login de MEDICO pela UI: /registrar (tipo Medico) aberto com a sessao do DEV ativa
import fs from 'node:fs'
import * as L from './lib.mjs'
const R2 = new URL('./contas-r2.json', import.meta.url)
const r2 = JSON.parse(fs.readFileSync(R2))
const stamp = Date.now()
const SENHA_MED = 'QaMedico#2026x'
const browser = await L.launch()
const dev = await L.newSession(browser, 'DEV')
const p = dev.page
await L.login(p, 'dev-local@sgsm.local', 'Dev088c00c5ba89!Aa')
L.start('QA062-r2-registrar-logado')
// navegacao SPA (sem recarregar) para manter o token em memoria
await p.evaluate(() => { window.history.pushState({}, '', '/registrar'); window.dispatchEvent(new PopStateEvent('popstate')) })
await L.sleep(1500)
L.note('url: ' + p.url())
await L.shot(p, 'QA062-r2-c-registrar-logado-form')
const temForm = await p.getByRole('button', { name: 'Criar conta' }).count()
L.note('formulario de registro visivel com DEV logado: ' + (temForm > 0))
if (temForm) {
  await p.getByRole('button', { name: 'Médico', exact: true }).click()
  const email = `qa.conflito.med.reg2.${stamp}@teste.com`
  await p.getByLabel('Nome completo').fill('QA Medico Login')
  await p.getByLabel('CRM', { exact: true }).fill(String(stamp + 29).slice(-6))
  await p.getByLabel('Especialidade').selectOption('Cardiologia')
  await p.getByLabel('E-mail').fill(email)
  await p.getByLabel('Senha', { exact: true }).fill(SENHA_MED)
  await p.getByLabel('Confirmar senha').fill(SENHA_MED)
  await p.getByRole('button', { name: 'Criar conta' }).click()
  await L.sleep(5000)
  L.note('resultado: url=' + p.url() + ' | toasts=' + JSON.stringify(await p.locator('[data-sonner-toast]').allTextContents()))
  await L.shot(p, 'QA062-r2-d-registrar-logado-resultado')
  r2.registrarLogado = { email, urlFinal: p.url() }
  fs.writeFileSync(R2, JSON.stringify(r2, null, 2))
}
await L.end('QA062-r2-registrar-logado', '/registrar com sessao de DEV ativa (navegacao SPA)')
await browser.close()
