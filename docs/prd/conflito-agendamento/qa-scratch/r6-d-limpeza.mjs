// RODADA 6 — limpeza pela UI (DEV): inativa pacientes "QA Paciente R6", medicos "QA Medico Rseis", admin "QA Admin Rseis" e a SEC-A
import { execSync } from 'node:child_process'
import * as L from './lib5.mjs'
import * as C from './r6-common.mjs'
const browser = await L.launch()
const cards = (p, t) => p.locator('div.grid > div').filter({ hasText: t })
const txt = async (loc) => (await loc.allInnerTexts()).map((t) => t.replace(/\n/g, ' | '))
async function inativarTodos(p, filtro, botao, reUrl, rotulo, max = 10) {
  for (let g = 0; g < max; g++) {
    const ativos = cards(p, filtro).filter({ hasText: 'Ativo' }).filter({ hasNotText: 'Inativo' })
    if (await ativos.count() === 0) break
    const c = ativos.first()
    const nome = (await c.locator('h3').innerText()).trim()
    await botao(c).click()
    const w = p.waitForResponse((r) => reUrl.test(r.url()) && r.request().method() !== 'GET')
    await L.modal(p).getByRole('button', { name: 'Inativar' }).click()
    const r = await w
    L.note(`inativar ${rotulo} ${nome}: ${r.request().method()} ${r.url()} -> ${r.status()}`)
    await L.sleep(1500)
  }
}
const lixeira = (p) => (c) => c.locator('button').filter({ has: p.locator('svg.lucide-trash2, svg.lucide-trash-2') }).first()
try {
  L.start('LIMPEZA-r6')
  L.note('pacientes da rodada: ' + JSON.stringify(C.r6.pacientes.map((x) => `${x.nome} | ${x.email} | ${x.status}`)))
  L.note('medicos da rodada: ' + JSON.stringify(C.r6.medicos.map((x) => `${x.nome} | ${x.email} | ${x.id} | ${x.criadoPor}`)))
  L.note('admins da rodada: ' + JSON.stringify(C.r6.admins.map((x) => `${x.nome} | ${x.email} | ${x.id}`)))
  const D = await L.newSession(browser, 'DEV')
  const p = D.page
  await L.login(p, C.DEV_EMAIL, C.DEV_SENHA)
  // pacientes
  await p.getByRole('link', { name: 'Pacientes' }).first().click()
  await p.waitForURL('**/pacientes')
  await p.getByPlaceholder('Buscar por nome, CPF ou e-mail…').fill('QA Paciente R6')
  await L.sleep(2000)
  L.note('pacientes antes: ' + JSON.stringify(await txt(cards(p, 'QA Paciente R6'))))
  await inativarTodos(p, 'QA Paciente R6', (c) => c.locator('button').last(), /\/pacientes\//, 'paciente')
  L.note('pacientes depois: ' + JSON.stringify(await txt(cards(p, 'QA Paciente R6'))))
  await L.shot(p, 'LIMPEZA-r6-a-pacientes')
  // medicos
  await C.irMedicos(p)
  await C.buscarMedico(p, 'QA Medico Rseis')
  L.note('medicos antes: ' + JSON.stringify(await txt(cards(p, 'QA Medico Rseis'))))
  await inativarTodos(p, 'QA Medico Rseis', lixeira(p), /\/medicos\//, 'medico')
  await p.locator('select').first().selectOption('')
  await L.sleep(1500)
  await C.buscarMedico(p, 'QA Medico Rseis')
  L.note('medicos depois (Todos os status): ' + JSON.stringify(await txt(cards(p, 'QA Medico Rseis'))))
  await L.shot(p, 'LIMPEZA-r6-b-medicos')
  // admin
  await p.getByRole('link', { name: 'Administradores' }).first().click()
  await p.waitForURL('**/administradores')
  await L.sleep(1500)
  await p.getByPlaceholder('Buscar por nome, CPF ou e-mail…').fill('QA Admin Rseis')
  await L.sleep(1500)
  await inativarTodos(p, 'QA Admin Rseis', lixeira(p), /\/administradores\//, 'admin')
  await p.locator('select').first().selectOption('')
  await L.sleep(1500)
  L.note('admins depois (Todos os status): ' + JSON.stringify(await txt(cards(p, 'QA Admin Rseis'))))
  await L.shot(p, 'LIMPEZA-r6-c-admin')
  // SEC-A
  await C.irFuncionarios(p)
  await p.locator('select').nth(1).selectOption('').catch(() => {})
  await L.sleep(1500)
  for (const k of ['A', 'B']) {
    const card = cards(p, C.contas[k].email).first()
    if (!(await card.count())) { L.note(`SEC-${k}: card nao encontrado`); continue }
    if ((await card.innerText()).includes('Inativo')) { L.note(`SEC-${k} ja inativa`); continue }
    await card.locator('button').last().click()
    const w = p.waitForResponse((r) => r.url().includes('/funcionarios/') && r.request().method() !== 'GET')
    await L.modal(p).getByRole('button', { name: 'Inativar' }).click()
    const r = await w
    L.note(`inativar SEC-${k}: ${r.request().method()} ${r.url()} -> ${r.status()}`)
    await L.sleep(1500)
  }
  L.note('secretarias depois: ' + JSON.stringify(await txt(cards(p, 'qa.conflito'))))
  await L.shot(p, 'LIMPEZA-r6-d-funcionarios')
  const scan = execSync('docker exec redis-sgsm redis-cli --scan --pattern "sgsm:reserva*"').toString()
  L.note(`scan Redis sgsm:reserva* -> ${scan.trim().split('\n').filter(Boolean).length} chaves`)
  await L.end('LIMPEZA-r6')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally {
  L.saveAll('r6-d')
  await browser.close()
}
