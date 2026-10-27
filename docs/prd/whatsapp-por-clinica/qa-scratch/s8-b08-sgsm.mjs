// WA-B08 (parte sgsm) — a defesa do sgsm: agendamento PRESENCIAL na Clinica Teste Strix com servico de medico que so atende
// na Clinica São Lucas. Feito pela propria app (axios da tela) logado como DESENVOLVEDOR, mesmo corpo que o bot enviaria.
import fs from 'node:fs'
import * as L from './lib.mjs'
const C = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const browser = await L.launch()
try {
  L.start('WA-B08-sgsm')
  const idPac = (L.sql(`select id from sgsm.paciente where email='${C.PAC_BOT_STRIX.email}'`, { registrar: false }).match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/) || [])[0]
  C.PAC_BOT_STRIX.id = idPac; fs.writeFileSync(new URL('./contas.json', import.meta.url), JSON.stringify(C, null, 2))
  L.sql(`select medico_id, estabelecimento_id, ativo from sgsm.medico_estabelecimento where medico_id='ff9a2400-2217-48fa-ac91-b81a4032f2db'`)
  const D = await L.newSession(browser, 'DEV')
  const p = D.page
  await L.login(p, L.DEV_EMAIL, L.DEV_SENHA)
  await p.getByRole('link', { name: 'Agendamentos' }).first().click()
  await L.sleep(2500)
  const corpo = { pacienteId: idPac, servicoMedicoId: '0f4d2d1e-7a44-49d3-87af-a8c72aafcb82', estabelecimentoId: L.CLIN_B, tipo: 'PRESENCIAL', dataHoraInicio: '2026-11-04T11:00:00-03:00' }
  const out = []
  for (const [u, b] of [['/agendamentos/reservas', corpo], ['/agendamentos', corpo]]) {
    const r = await L.apiNaApp(p, 'post', u, b)
    const t = `POST /v1/api${u} (Strix + servico do Dr. Fabio) -> ${r.status} ${JSON.stringify(r.data)}`
    L.note(t); out.push(t)
  }
  await p.evaluate((txt) => { const d = document.createElement('pre'); d.style.cssText = 'position:fixed;bottom:10px;left:270px;right:10px;background:#111;color:#0f0;padding:10px;z-index:9999;font-size:12px;white-space:pre-wrap'; d.textContent = 'QA — respostas cruas do sgsm (DEV, pela app):\n' + txt; document.body.appendChild(d) }, out.join('\n'))
  await L.shot(p, 'WA-B08-b-sgsm-recusa')
  L.sql(`select count(*) as agendamentos_strix_fabio from sgsm.agendamento where medico_id='ff9a2400-2217-48fa-ac91-b81a4032f2db' and estabelecimento_id='${L.CLIN_B}'`)
  await L.end('WA-B08-sgsm')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally { L.saveAll('s8'); await browser.close() }
