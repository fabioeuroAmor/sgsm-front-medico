// WA-E01 (paciente do WhatsApp na lista da equipe da clinica, sem consulta), WA-E02 (outra clinica nao ve),
// WA-E03 (exportacao LGPD traz clinicas e consentimentos), WA-E04 (paciente cadastrado pela secretaria -> origem CLINICA)
// + print do CRM da Clinica São Lucas com o lead do WhatsApp (complemento do WA-B09)
import fs from 'node:fs'
import path from 'node:path'
import * as L from './lib.mjs'
const C = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const save = () => fs.writeFileSync(new URL('./contas.json', import.meta.url), JSON.stringify(C, null, 2))
const PB = C.PAC_BOT_R2
async function entrar(p, conta) {
  await L.login(p, conta.email, conta.senha, { esperar: null })
  await p.waitForURL((u) => u.pathname !== '/login', { timeout: 20000 })
  await L.sleep(1500)
}
async function buscarPaciente(p, termo) {
  await p.getByRole('link', { name: 'Pacientes' }).first().click()
  await p.waitForURL('**/pacientes')
  await L.sleep(2500)
  await p.getByPlaceholder('Buscar por nome, CPF ou e-mail…').fill(termo)
  await L.sleep(1500)
  return p.locator('h3').filter({ hasText: termo }).count()
}
const browser = await L.launch()
try {
  const idPac = (L.sql(`select id from sgsm.paciente where email='${PB.email}'`, { registrar: false }).match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/) || [])[0]
  PB.id = idPac; save()

  // ── WA-E01 ──
  L.start('R2-WA-E01')
  L.sql(`select count(*) as agendamentos from sgsm.agendamento where paciente_id='${idPac}'`)
  L.sql(`select * from sgsm.paciente_estabelecimento where paciente_id='${idPac}'`)
  for (const [k, rot] of [['FUNC_A', 'FUNC-A'], ['ADM_A', 'ADM-A']]) {
    const S = await L.newSession(browser, rot)
    await entrar(S.page, C[k])
    const i = L.LINES.length
    const n = await buscarPaciente(S.page, PB.nome)
    const lista = L.LINES.slice(i).find((l) => /<< 200 GET .*\/v1\/api\/pacientes /.test(l)) || ''
    L.note(`${rot} (${C[k].perfil}, Clinica São Lucas) em /pacientes busca "${PB.nome}": cards encontrados=${n} | o GET /pacientes trouxe o id ${idPac}? ${lista.includes(idPac)}`)
    await L.shot(S.page, `R2-WA-E01-${rot.toLowerCase()}-ve-paciente`)
    if (k === 'ADM_A') {
      // complemento do WA-B09: lead no CRM da clinica
      const i2 = L.LINES.length
      await S.page.getByRole('link', { name: 'CRM' }).first().click()
      await L.sleep(4000)
      await S.page.getByText('QA WA Paciente', { exact: false }).first().scrollIntoViewIfNeeded().catch(() => {})
      const leadResp = L.LINES.slice(i2).filter((l) => /<< \d+ GET .*\/crm\//.test(l)).map((l) => l.slice(0, 200))
      L.note(`ADM-A no CRM: respostas /crm=${JSON.stringify(leadResp)} | texto "QA WA Paciente" na tela=${await S.page.getByText('QA WA Paciente').count()}`)
      await L.shot(S.page, 'R2-WA-B09-crm-lead-convertido')
    }
    await S.ctx.close()
  }
  await L.end('R2-WA-E01')

  // ── WA-E02 ──
  L.start('R2-WA-E02')
  const B = await L.newSession(browser, 'ADM-B')
  await entrar(B.page, C.ADM_B)
  const i = L.LINES.length
  const n = await buscarPaciente(B.page, PB.nome)
  const lista = L.LINES.slice(i).find((l) => /<< 200 GET .*\/v1\/api\/pacientes /.test(l)) || ''
  L.note(`ADM-B (Clinica Teste Strix) em /pacientes busca "${PB.nome}": cards=${n} | o GET /pacientes trouxe o id? ${lista.includes(idPac)} | "Nenhum" na tela=${await B.page.getByText(/Nenhum paciente/i).count()}`)
  await L.shot(B.page, 'R2-WA-E02-adm-b-nao-ve')
  const rg = await L.apiNaApp(B.page, 'get', `/pacientes/${idPac}`)
  L.note(`ADM-B (so Strix) GET /v1/api/pacientes/${idPac} -> ${rg.status} ${JSON.stringify(rg.data).slice(0, 300)}`)
  // PUT com um corpo plausivel (nome alterado): se passar, o dado muda — por isso conferimos o banco depois
  const corpoPut = { nome: PB.nome + ' ALTERADO PELA STRIX', email: PB.email, telefone: PB.telefone }
  const rpu = await L.apiNaApp(B.page, 'put', `/pacientes/${idPac}`, corpoPut)
  L.note(`ADM-B (so Strix) PUT /v1/api/pacientes/${idPac} BODY=${JSON.stringify(corpoPut)} -> ${rpu.status} ${JSON.stringify(rpu.data).slice(0, 300)}`)
  const rex = await L.apiNaApp(B.page, 'get', `/pacientes/${idPac}/exportar`)
  L.note(`ADM-B (so Strix) GET /v1/api/pacientes/${idPac}/exportar -> ${rex.status} ${JSON.stringify(rex.data).slice(0, 200)}`)
  await B.page.evaluate((txt) => { const d = document.createElement('pre'); d.style.cssText = 'position:fixed;bottom:10px;left:270px;right:10px;background:#111;color:#0f0;padding:10px;z-index:9999;font-size:12px;white-space:pre-wrap'; d.textContent = 'QA — respostas cruas do sgsm para a ADM-B (so Clinica Teste Strix): ' + txt; document.body.appendChild(d) },
    [`GET /v1/api/pacientes/${idPac} -> ${rg.status} ${JSON.stringify(rg.data).slice(0, 160)}`, `PUT /v1/api/pacientes/${idPac} -> ${rpu.status} ${JSON.stringify(rpu.data).slice(0, 160)}`, `GET .../exportar -> ${rex.status}`].join(' || '))
  await L.shot(B.page, 'R2-WA-E02-adm-b-get-put-403')
  L.sql(`select nome, atualizado_em from sgsm.paciente where id='${idPac}'`)
  for (const [k, rot] of [['ADM_A', 'ADM-A'], ['FUNC_A', 'FUNC-A']]) {
    const S = await L.newSession(browser, rot)
    await entrar(S.page, C[k])
    const r = await L.apiNaApp(S.page, 'get', `/pacientes/${idPac}`)
    L.note(`${rot} (Clinica São Lucas) GET /v1/api/pacientes/${idPac} -> ${r.status} nome=${r.data?.nome} id=${r.data?.id}`)
    await S.page.evaluate((txt) => { const d = document.createElement('pre'); d.style.cssText = 'position:fixed;bottom:10px;left:270px;right:10px;background:#111;color:#0f0;padding:10px;z-index:9999;font-size:12px;white-space:pre-wrap'; d.textContent = txt; document.body.appendChild(d) }, `QA — ${rot} (Clinica São Lucas) GET /v1/api/pacientes/${idPac} -> ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`)
    await L.shot(S.page, `R2-WA-E02-${rot.toLowerCase()}-le-200`)
    await S.ctx.close()
  }
  await L.end('R2-WA-E02')
  await B.ctx.close()

} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally { L.saveAll('r2-e'); await browser.close() }
