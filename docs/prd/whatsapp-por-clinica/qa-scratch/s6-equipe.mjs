// WA-E01 (paciente do WhatsApp na lista da equipe da clinica, sem consulta), WA-E02 (outra clinica nao ve),
// WA-E03 (exportacao LGPD traz clinicas e consentimentos), WA-E04 (paciente cadastrado pela secretaria -> origem CLINICA)
// + print do CRM da Clinica São Lucas com o lead do WhatsApp (complemento do WA-B09)
import fs from 'node:fs'
import path from 'node:path'
import * as L from './lib.mjs'
const C = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const save = () => fs.writeFileSync(new URL('./contas.json', import.meta.url), JSON.stringify(C, null, 2))
const PB = C.PAC_BOT
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
  L.start('WA-E01')
  L.sql(`select count(*) as agendamentos from sgsm.agendamento where paciente_id='${idPac}'`)
  L.sql(`select * from sgsm.paciente_estabelecimento where paciente_id='${idPac}'`)
  for (const [k, rot] of [['FUNC_A', 'FUNC-A'], ['ADM_A', 'ADM-A']]) {
    const S = await L.newSession(browser, rot)
    await entrar(S.page, C[k])
    const i = L.LINES.length
    const n = await buscarPaciente(S.page, PB.nome)
    const lista = L.LINES.slice(i).find((l) => /<< 200 GET .*\/v1\/api\/pacientes /.test(l)) || ''
    L.note(`${rot} (${C[k].perfil}, Clinica São Lucas) em /pacientes busca "${PB.nome}": cards encontrados=${n} | o GET /pacientes trouxe o id ${idPac}? ${lista.includes(idPac)}`)
    await L.shot(S.page, `WA-E01-${rot.toLowerCase()}-ve-paciente`)
    if (k === 'ADM_A') {
      // complemento do WA-B09: lead no CRM da clinica
      const i2 = L.LINES.length
      await S.page.getByRole('link', { name: 'CRM' }).first().click()
      await L.sleep(4000)
      await S.page.getByText('QA WA Paciente', { exact: false }).first().scrollIntoViewIfNeeded().catch(() => {})
      const leadResp = L.LINES.slice(i2).filter((l) => /<< \d+ GET .*\/crm\//.test(l)).map((l) => l.slice(0, 200))
      L.note(`ADM-A no CRM: respostas /crm=${JSON.stringify(leadResp)} | texto "QA WA Paciente" na tela=${await S.page.getByText('QA WA Paciente').count()}`)
      await L.shot(S.page, 'WA-B09-crm-lead-adm-a')
    }
    await S.ctx.close()
  }
  await L.end('WA-E01')

  // ── WA-E02 ──
  L.start('WA-E02')
  const B = await L.newSession(browser, 'ADM-B')
  await entrar(B.page, C.ADM_B)
  const i = L.LINES.length
  const n = await buscarPaciente(B.page, PB.nome)
  const lista = L.LINES.slice(i).find((l) => /<< 200 GET .*\/v1\/api\/pacientes /.test(l)) || ''
  L.note(`ADM-B (Clinica Teste Strix) em /pacientes busca "${PB.nome}": cards=${n} | o GET /pacientes trouxe o id? ${lista.includes(idPac)} | "Nenhum" na tela=${await B.page.getByText(/Nenhum paciente/i).count()}`)
  await L.shot(B.page, 'WA-E02-adm-b-nao-ve')
  for (const u of [`/pacientes/${idPac}`, `/pacientes/${idPac}/exportar`]) {
    const r = await L.apiNaApp(B.page, 'get', u)
    L.note(`ADM-B GET /v1/api${u} -> ${r.status} ${JSON.stringify(r.data).slice(0, 300)}`)
  }
  await L.end('WA-E02')
  await B.ctx.close()

  // ── WA-E03 ── (exportacao LGPD: na tela so DESENVOLVEDOR ou o proprio titular exportam)
  L.start('WA-E03')
  const D = await L.newSession(browser, 'DEV')
  const d = D.page
  await entrar(d, { email: L.DEV_EMAIL, senha: L.DEV_SENHA })
  await buscarPaciente(d, PB.nome)
  await d.locator('h3').filter({ hasText: PB.nome }).first().click()
  await d.getByRole('button', { name: /Exportar dados/ }).waitFor({ timeout: 10000 })
  await L.shot(d, 'WA-E03-a-detalhe')
  const wResp = d.waitForResponse((r) => r.url().endsWith(`/pacientes/${idPac}/exportar`), { timeout: 20000 })
  const wDown = d.waitForEvent('download', { timeout: 20000 }).catch(() => null)
  await d.getByRole('button', { name: /Exportar dados/ }).click()
  const rr = await wResp
  const dl = await wDown
  const json = await rr.json()
  if (dl) await dl.saveAs(path.join(L.EVID, 'WA-E03-exportacao.json'))
  await d.locator('[data-sonner-toast]').first().waitFor({ timeout: 8000 }).catch(() => {})
  L.note(`GET /exportar -> ${rr.status()} | arquivo baixado=${dl ? dl.suggestedFilename() : 'nao'} | chaves=${JSON.stringify(Object.keys(json))} | clinicas=${JSON.stringify(json.clinicas)} | consentimentos=${JSON.stringify(json.consentimentos)} | toasts=${JSON.stringify(await L.toasts(d))}`)
  await L.shot(d, 'WA-E03-b-exportado')
  await L.end('WA-E03')

  // ── WA-E04 ──
  L.start('WA-E04')
  const F = await L.newSession(browser, 'FUNC-A')
  const f = F.page
  await entrar(f, C.FUNC_A)
  await f.getByRole('link', { name: 'Pacientes' }).first().click()
  await f.waitForURL('**/pacientes')
  const st = Date.now()
  const PS = { nome: `QA WA Paciente Secretaria ${String(st).slice(-5)}`, cpf: L.gerarCpf((Math.floor(st / 9) + 555123) % 1_000_000_000), email: `qa.wa.pac.sec.${st}@teste.com`, nascimento: '1985-09-20' }
  C.PAC_SEC = { ...PS, perfil: 'PACIENTE (cadastrado pela FUNC-A, sem login)' }; save()
  await f.getByRole('button', { name: 'Novo Paciente' }).click()
  const m = L.modal(f)
  await m.getByLabel('Nome completo').fill(PS.nome)
  await m.getByLabel('CPF').fill(PS.cpf)
  await m.getByLabel('Data de nascimento').fill(PS.nascimento)
  await m.locator('input[type=checkbox]').first().check()
  await m.getByLabel('E-mail').fill(PS.email)
  await L.shot(f, 'WA-E04-a-form')
  const w = f.waitForResponse((r) => /\/v1\/api\/pacientes$/.test(r.url()) && r.request().method() === 'POST', { timeout: 20000 })
  await m.getByRole('button', { name: 'Salvar' }).click()
  const rp = await w
  const novo = await rp.json().catch(() => ({}))
  await f.locator('[data-sonner-toast]').first().waitFor({ timeout: 8000 }).catch(() => {})
  await L.sleep(800)
  L.note(`FUNC-A cadastrou "${PS.nome}" -> POST /pacientes ${rp.status()} id=${novo.id} | toasts=${JSON.stringify(await L.toasts(f))}`)
  C.PAC_SEC.id = novo.id; save()
  await L.shot(f, 'WA-E04-b-cadastrado')
  L.sql(`select pe.*, e.nome from sgsm.paciente_estabelecimento pe join sgsm.estabelecimento e on e.id=pe.estabelecimento_id where pe.paciente_id='${novo.id}'`)
  L.sql(`select count(*) as agendamentos from sgsm.agendamento where paciente_id='${novo.id}'`)
  await L.end('WA-E04')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally { L.saveAll('s6'); await browser.close() }
