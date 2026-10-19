// RODADA 10 — limpeza pela UI (DEV): inativa os pacientes de QA da rodada 
// e a SEC-A; scan sgsm:reserva* no Redis (unica leitura permitida na limpeza). Sem mock.
import { execSync } from 'node:child_process'
import * as L from './lib5.mjs'
import * as C from './r5-common.mjs'
const browser = await L.launch()
const cards = (p, t) => p.locator('div.grid > div').filter({ hasText: t })
const txt = async (loc) => (await loc.allInnerTexts()).map((t) => t.replace(/\n+/g, ' | '))
const BUSCAS = ["QA Paciente R10"]
try {
  L.start('LIMPEZA-r10')
  const D = await L.newSession(browser, 'DEV')
  const q = D.page
  await L.login(q, C.DEV_EMAIL, C.DEV_SENHA)
  await q.getByRole('link', { name: 'Pacientes' }).first().click()
  await q.waitForURL('**/pacientes')
  for (const [n, b] of BUSCAS.entries()) {
    await q.getByPlaceholder('Buscar por nome, CPF ou e-mail…').fill(b)
    await L.sleep(2000)
    L.note(`pacientes "${b}" antes: ` + JSON.stringify(await txt(cards(q, b))))
    for (let g = 0; g < 10; g++) {
      const ativos = cards(q, b).filter({ hasText: 'Ativo' }).filter({ hasNotText: 'Inativo' })
      if (await ativos.count() === 0) break
      const card = ativos.first()
      const nome = (await card.locator('h3').innerText()).trim()
      await card.locator('button').last().click()
      const wr = q.waitForResponse((r) => /\/pacientes\//.test(r.url()) && r.request().method() !== 'GET')
      await L.modal(q).getByRole('button', { name: 'Inativar' }).click()
      const rr = await wr
      L.note(`inativar paciente ${nome}: ${rr.request().method()} ${rr.url()} -> ${rr.status()}`)
      await L.sleep(1500)
    }
    L.note(`pacientes "${b}" depois: ` + JSON.stringify(await txt(cards(q, b))))
    await L.shot(q, `LIMPEZA-r10-b${n + 1}-pacientes-${b.replace(/\s+/g, '-')}`)
  }
  await C.irFuncionarios(q)
  await q.locator('select').nth(1).selectOption('').catch(() => {})
  await L.sleep(1500)
  const card = cards(q, C.contas.A.email).first()
  if ((await card.innerText()).includes('Inativo')) L.note('SEC-A ja inativa')
  else {
    await card.locator('button').last().click()
    const w = q.waitForResponse((r) => r.url().includes('/funcionarios/') && r.request().method() !== 'GET')
    await L.modal(q).getByRole('button', { name: 'Inativar' }).click()
    const r = await w
    L.note(`inativar SEC-A: ${r.request().method()} ${r.url()} -> ${r.status()}`)
    await L.sleep(1500)
  }
  L.note('SEC-A depois: ' + JSON.stringify(await txt(cards(q, C.contas.A.email))))
  await L.shot(q, 'LIMPEZA-r10-c-SEC-A-inativa')
  const scan = execSync('docker exec redis-sgsm redis-cli --scan --pattern "sgsm:reserva*"').toString()
  L.note(`scan Redis sgsm:reserva* -> ${scan.trim().split('\n').filter(Boolean).length} chaves ${JSON.stringify(scan.trim())}`)
  await L.end('LIMPEZA-r10', 'DEV inativa pacientes de QA da rodada 10 e a SEC-A; scan sgsm:reserva*')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally {
  L.saveAll('r10-z')
  await browser.close()
}
