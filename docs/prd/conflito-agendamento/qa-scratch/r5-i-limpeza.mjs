// RODADA 5 — limpeza pela UI (DEV): inativa pacientes "QA Paciente R5", medicos "QA Medico Rcinco" e a SEC-A
import { execSync } from 'node:child_process'
import * as L from './lib5.mjs'
import * as C from './r5-common.mjs'
const browser = await L.launch()
const cards = (p, t) => p.locator('div.grid > div').filter({ hasText: t })
const txt = async (loc) => (await loc.allInnerTexts()).map((t) => t.replace(/\n/g, ' | '))
try {
  L.start('LIMPEZA-r5')
  L.note('pacientes registrados nesta rodada: ' + JSON.stringify(C.r5.pacientes.map((x) => `${x.nome} | ${x.email} | ${x.status}`)))
  L.note('medicos registrados nesta rodada: ' + JSON.stringify(C.r5.medicos.map((x) => `${x.nome} | ${x.email} | ${x.id}`)))
  const D = await L.newSession(browser, 'DEV')
  const p = D.page
  await L.login(p, C.DEV_EMAIL, C.DEV_SENHA)
  // pacientes
  await p.getByRole('link', { name: 'Pacientes' }).first().click()
  await p.waitForURL('**/pacientes')
  await p.getByPlaceholder('Buscar por nome, CPF ou e-mail…').fill('QA Paciente R5')
  await L.sleep(2000)
  L.note('pacientes antes: ' + JSON.stringify(await txt(cards(p, 'QA Paciente R5'))))
  for (const cpf of ['42907420500']) L.note(`CPF da tentativa QA107-API (mesmo e-mail) aparece na lista: ${(await txt(cards(p, 'QA Paciente R5'))).some((t) => t.includes(cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')))}`)
  await L.shot(p, 'LIMPEZA-r5-a-pacientes-antes')
  for (let guard = 0; guard < 15; guard++) {
    const ativos = cards(p, 'QA Paciente R5').filter({ hasText: 'Ativo' }).filter({ hasNotText: 'Inativo' })
    if (await ativos.count() === 0) break
    const c = ativos.first()
    const nome = (await c.locator('h3').innerText()).trim()
    await c.locator('button').last().click()
    const w = p.waitForResponse((r) => r.url().includes('/pacientes/') && r.request().method() !== 'GET')
    await L.modal(p).getByRole('button', { name: 'Inativar' }).click()
    const r = await w
    L.note(`inativar paciente ${nome}: ${r.request().method()} ${r.url()} -> ${r.status()}`)
    await L.sleep(1500)
  }
  L.note('pacientes depois: ' + JSON.stringify(await txt(cards(p, 'QA Paciente R5'))))
  await L.shot(p, 'LIMPEZA-r5-b-pacientes-depois')
  await p.getByPlaceholder('Buscar por nome, CPF ou e-mail…').fill('QA Paciente R4')
  await L.sleep(2000)
  L.note('(somente leitura) sobras da rodada 4 interrompida: ' + JSON.stringify(await txt(cards(p, 'QA Paciente R4'))))
  // medicos
  await C.irMedicos(p)
  await C.buscarMedico(p, 'QA Medico Rcinco')
  L.note('medicos antes: ' + JSON.stringify(await txt(cards(p, 'QA Medico Rcinco'))))
  for (let guard = 0; guard < 6; guard++) {
    const ativos = cards(p, 'QA Medico Rcinco').filter({ hasText: 'Ativo' }).filter({ hasNotText: 'Inativo' })
    if (await ativos.count() === 0) break
    const c = ativos.first()
    const nome = (await c.locator('h3').innerText()).trim()
    await c.locator('button').filter({ has: p.locator('svg.lucide-trash2, svg.lucide-trash-2') }).first().click()
    const w = p.waitForResponse((r) => r.url().includes('/medicos/') && r.request().method() !== 'GET')
    await L.modal(p).getByRole('button', { name: 'Inativar' }).click()
    const r = await w
    L.note(`inativar medico ${nome}: ${r.request().method()} ${r.url()} -> ${r.status()}`)
    await L.sleep(1500)
  }
  await p.locator('select').first().selectOption('')
  await L.sleep(1500)
  await C.buscarMedico(p, 'QA Medico Rcinco')
  L.note('medicos depois (filtro Todos os status): ' + JSON.stringify(await txt(cards(p, 'QA Medico Rcinco'))))
  await L.shot(p, 'LIMPEZA-r5-c-medicos-depois')
  // secretarias
  await C.irFuncionarios(p)
  await p.locator('select').nth(1).selectOption('').catch(() => {})
  await L.sleep(1500)
  L.note('secretarias antes: ' + JSON.stringify(await txt(cards(p, 'qa.conflito'))))
  for (const k of ['A', 'B']) {
    const card = cards(p, C.contas[k].email).first()
    if (!(await card.count())) { L.note(`SEC-${k}: card nao encontrado`); continue }
    if ((await card.innerText()).includes('Inativo')) { L.note(`SEC-${k} ja inativa`); continue }
    await card.locator('button').last().click()
    const w = p.waitForResponse((r) => r.url().includes('/funcionarios/') && ['DELETE', 'PATCH', 'PUT'].includes(r.request().method()))
    await L.modal(p).getByRole('button', { name: 'Inativar' }).click()
    const r = await w
    L.note(`inativar SEC-${k}: ${r.request().method()} ${r.url()} -> ${r.status()}`)
    await L.sleep(1500)
  }
  L.note('secretarias depois: ' + JSON.stringify(await txt(cards(p, 'qa.conflito'))))
  await L.shot(p, 'LIMPEZA-r5-d-funcionarios')
  const scan = execSync('docker exec redis-sgsm redis-cli --scan --pattern "sgsm:reserva*"').toString()
  L.note(`scan Redis sgsm:reserva* -> ${scan.trim().split('\n').filter(Boolean).length} chaves`)
  await L.end('LIMPEZA-r5')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally {
  L.saveAll('r5-i')
  await browser.close()
}
