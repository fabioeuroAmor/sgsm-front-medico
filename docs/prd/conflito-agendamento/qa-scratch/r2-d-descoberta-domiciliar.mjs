// RODADA 2 — QA064 (descoberta): DEV abre /agendamentos e lista, a partir da resposta real do GET /agendamentos,
// os agendamentos DOMICILIAR e de quais medicos sao; depois confere pela tela /estabelecimentos os medicos vinculados a Sao Lucas
import fs from 'node:fs'
import * as L from './lib.mjs'
const browser = await L.launch()
const dev = await L.newSession(browser, 'DEV')
const p = dev.page
await L.login(p, 'dev-local@sgsm.local', 'Dev088c00c5ba89!Aa')
L.start('QA064-r2-descoberta')
const w = p.waitForResponse((r) => /\/v1\/api\/agendamentos(\?|$)/.test(r.url()) && r.request().method() === 'GET')
await L.irAgendamentos(p)
const r = await w
const lista = await r.json()
const pag = Array.isArray(lista) ? lista : (lista.content ?? [])
L.note(`GET ${r.url()} -> ${r.status()} total=${pag.length}`)
const dom = pag.filter((a) => a.tipo === 'DOMICILIAR')
L.note('DOMICILIAR: ' + JSON.stringify(dom.map((a) => ({ id: a.id, medico: a.medicoNome, medicoId: a.medicoId, quando: a.dataHoraInicio, status: a.status, servico: a.servicoMedicoNome, paciente: a.pacienteNome }))))
await L.shot(p, 'QA064-r2-a-DEV-lista')
// vinculos da Sao Lucas pela tela
await p.getByRole('link', { name: 'Estabelecimentos' }).first().click()
await p.waitForURL('**/estabelecimentos')
await L.sleep(1500)
await p.locator('div.grid > div').filter({ hasText: 'Clinica São Lucas' }).first().getByTitle('Gerenciar médicos').click()
const m = L.modal(p)
await m.locator('label').first().waitFor()
L.note('medicos vinculados a Sao Lucas (tela): ' + JSON.stringify((await m.locator('label').filter({ has: p.locator('input:checked') }).allInnerTexts()).map((t) => t.replace(/\n+/g, ' | '))))
L.note('todos os medicos ativos (tela): ' + JSON.stringify((await m.locator('label').allInnerTexts()).map((t) => t.replace(/\n+/g, ' | '))))
await L.shot(p, 'QA064-r2-b-vinculos-sao-lucas')
await m.getByRole('button', { name: 'Cancelar' }).click()
await L.end('QA064-r2-descoberta')
fs.writeFileSync(new URL('./dom-descoberta.json', import.meta.url), JSON.stringify(dom, null, 2))
await browser.close()
