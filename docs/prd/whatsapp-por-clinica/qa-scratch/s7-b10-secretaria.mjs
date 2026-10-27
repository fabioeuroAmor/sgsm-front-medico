// WA-B10 (parte 1) — com o horario 04/11/2026 10:00 pre-reservado pelo bot (paciente do WhatsApp da Clinica São Lucas, ainda
// sem confirmar), a secretaria FUNC-A tenta o mesmo horario pelo wizard de agendamento: a reserva precisa valer contra ela.
import fs from 'node:fs'
import * as L from './lib.mjs'
const C = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const browser = await L.launch()
try {
  L.start('WA-B10-secretaria')
  const F = await L.newSession(browser, 'FUNC-A')
  const p = F.page
  await L.login(p, C.FUNC_A.email, C.FUNC_A.senha)
  await L.irAgendamentos(p)
  await L.abrirWizard(p)
  await L.passo1(p)
  await L.passo2(p, 'QA Descartavel')
  await L.passo3(p, 'Presencial', 'Clinica São Lucas')
  const m = L.modal(p)
  await m.getByRole('button', { name: 'Próximo mês' }).click()
  await L.sleep(800)
  await L.escolherDia(p, '4')
  await L.esperarGrade(p)
  const grade = (await m.locator('div.grid.grid-cols-3 > button').allTextContents()).map((t) => t.trim())
  const b10 = L.slotBtn(p, '10:00')
  L.note(`grade de 04/11 vista pela FUNC-A: ${JSON.stringify(grade)} | 10:00 na grade? ${grade.includes('10:00')} | 10:00 desabilitado? ${await b10.count() ? await b10.isDisabled() : 'nao existe'} | title=${await b10.getAttribute('title').catch(() => null)}`)
  await L.shot(p, 'WA-B10-a-secretaria-grade')
  if (await b10.count() && !(await b10.isDisabled())) {
    const w = p.waitForResponse((r) => r.url().endsWith('/agendamentos/reservas') && r.request().method() === 'POST', { timeout: 15000 }).catch(() => null)
    await b10.click()
    const r = await w
    await L.sleep(1500)
    L.note(`FUNC-A clicou 10:00 -> POST /reservas ${r ? r.status() + ' ' + (await r.text()).slice(0, 400) : 'nao saiu'} | toasts=${JSON.stringify(await L.toasts(p))}`)
    await L.shot(p, 'WA-B10-b-secretaria-clicou-10h')
  }
  await L.fecharModal(p).catch(() => {})
  await L.end('WA-B10-secretaria')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally { L.saveAll('s7'); await browser.close() }
