// RODADA 5 — secao 12 parte 1: QA120 (SEC-A cadastra M1 e M2), QA122 (login antes do link), QA121 (link do convite), QA123 (link usado / invalido)
import * as L from './lib5.mjs'
import * as C from './r5-common.mjs'
const browser = await L.launch()
const SENHA_M1 = 'QaMedR5#Convite1'
try {
  const SA = await L.newSession(browser, 'SEC-A')
  const pa = SA.page
  await L.login(pa, C.contas.A.email, C.contas.A.senha)
  await C.irMedicos(pa)

  L.start('QA120-r5')
  async function cadastrar(rotulo, shotPrefix) {
    const M = C.novoMedico(rotulo)
    await pa.getByRole('button', { name: 'Novo Médico' }).click()
    const m = L.modal(pa)
    await m.getByLabel('Nome completo').waitFor()
    L.note(`[${rotulo}] labels do modal Novo Médico: ${JSON.stringify(await m.locator('label').allTextContents())} | input[type=password] no modal=${await m.locator('input[type=password]').count()} | texto "senha" no modal=${await m.getByText(/senha/i).count()}`)
    await m.getByLabel('Nome completo').fill(M.nome)
    await m.getByLabel('CRM', { exact: true }).fill(M.crm)
    await m.getByLabel('Especialidade').selectOption(M.especialidade)
    await m.getByLabel('E-mail').fill(M.email)
    if (shotPrefix) await L.shot(pa, shotPrefix + '-form')
    const i0 = L.LINES.length
    const wCad = pa.waitForResponse((r) => r.url().endsWith('/v1/api/medicos') && r.request().method() === 'POST', { timeout: 20000 })
    const wConv = pa.waitForResponse((r) => r.url().includes('/convite-acesso') && r.request().method() === 'POST', { timeout: 30000 })
    await m.getByRole('button', { name: 'Salvar' }).click()
    const rc = await wCad
    const med = await rc.json().catch(() => ({}))
    const rv = await wConv.catch(() => null)
    await pa.locator('[data-sonner-toast]').first().waitFor({ timeout: 8000 }).catch(() => {})
    await L.sleep(400)
    const t = await L.toasts(pa)
    if (shotPrefix) await L.shot(pa, shotPrefix + '-toast')
    L.note(`[${rotulo}] POST /medicos -> ${rc.status()} id=${med.id} | POST convite-acesso -> ${rv ? rv.status() : 'nao chamado'} corpo=${C.corpoDe(i0, /convite-acesso/)} | toasts=${JSON.stringify(t)}`)
    L.note(`[${rotulo}] ordem das chamadas: ${JSON.stringify(L.respostas(i0, /\/medicos/))}`)
    M.id = med.id; M.status = 'ativo'
    C.r5.medicos.push(M); C.save()
    await L.esperarToastsSumirem(pa)
    return M
  }
  const M1 = await cadastrar('Um', 'QA120-r5-a-M1')
  const M2 = await cadastrar('Dois', 'QA120-r5-b-M2')
  await C.buscarMedico(pa, 'QA Medico Rcinco')
  L.note(`cards visiveis para SEC-A com "QA Medico Rcinco": ${JSON.stringify((await pa.locator('div.grid > div').filter({ hasText: 'QA Medico Rcinco' }).allInnerTexts()).map((x) => x.replace(/\n/g, ' | ')))}`)
  await L.shot(pa, 'QA120-r5-c-lista-SEC-A')
  await L.end('QA120-r5', 'SEC-A (FUNCIONARIO, Clinica São Lucas)')

  // ── QA122 ──
  L.start('QA122-r5')
  const S2 = await L.newSession(browser, 'ANON-122')
  const p2 = S2.page
  for (const s of ['QualquerSenha#1', 'Medico@2026!']) {
    await p2.goto(L.BASE + '/login')
    await p2.getByLabel('E-mail').fill(M1.email)
    await p2.getByLabel('Senha').fill(s)
    const i0 = L.LINES.length
    await p2.getByRole('button', { name: 'Entrar' }).click()
    await p2.locator('[data-sonner-toast]').first().waitFor({ timeout: 10000 }).catch(() => {})
    await L.sleep(600)
    L.note(`login M1 antes do link, senha ${L.m4(s)} -> ${JSON.stringify(L.respostas(i0))} | corpo=${C.corpoDe(i0, /auth\/login/)} | toasts=${JSON.stringify(await L.toasts(p2))} | url=${p2.url()}`)
    await L.shot(p2, 'QA122-r5')
    await L.esperarToastsSumirem(p2)
  }
  await L.end('QA122-r5')
  await S2.ctx.close()

  // ── QA121 ──
  L.start('QA121-r5')
  const tok1 = L.tokenConvite(M1.email)
  const S3 = await L.newSession(browser, 'MED-M1')
  const p3 = S3.page
  await p3.goto(L.linkConvite(tok1))
  await p3.getByRole('heading', { level: 1 }).waitFor()
  L.note(`tela do link: titulo=${JSON.stringify(await p3.getByRole('heading', { level: 1 }).innerText())} | subtitulo=${JSON.stringify(await p3.locator('h1 + p').innerText().catch(() => ''))} | botao "Criar senha"=${await p3.getByRole('button', { name: 'Criar senha', exact: true }).count()} | botao "Redefinir senha"=${await p3.getByRole('button', { name: 'Redefinir senha' }).count()}`)
  await L.shot(p3, 'QA121-r5-a-criar-sua-senha')
  await p3.getByLabel('Nova senha', { exact: true }).fill(SENHA_M1)
  await p3.getByLabel('Confirmar nova senha').fill(SENHA_M1)
  let i0 = L.LINES.length
  await p3.getByRole('button', { name: 'Criar senha', exact: true }).click()
  await p3.waitForURL((u) => u.pathname === '/login', { timeout: 15000 }).catch(() => {})
  await p3.locator('[data-sonner-toast]').first().waitFor({ timeout: 5000 }).catch(() => {})
  await L.sleep(300)
  L.note(`salvar -> ${JSON.stringify(L.respostas(i0))} | toasts=${JSON.stringify(await L.toasts(p3))} | url=${p3.url()}`)
  await L.shot(p3, 'QA121-r5-b-senha-criada')
  await L.esperarToastsSumirem(p3)
  i0 = L.LINES.length
  await L.login(p3, M1.email, SENHA_M1, { esperar: null })
  await p3.waitForURL((u) => u.pathname !== '/login', { timeout: 20000 }).catch(() => {})
  await L.sleep(2500)
  const claims = await p3.evaluate(async () => { const m = await import('/src/services/tokenStore.ts'); const t = m.tokenStore.get(); if (!t) return null; const c = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); return { roles: c.roles, tipoPerfil: c.tipoPerfil, referenciaId: c.referenciaId } })
  L.note(`login M1 -> url=${p3.url()} | claims=${JSON.stringify(claims)} | referenciaId == id do medico M1 (${M1.id}): ${claims?.referenciaId === M1.id} | menu=${JSON.stringify((await p3.locator('aside').first().innerText().catch(() => '')).replace(/\n/g, ' | '))}`)
  await L.shot(p3, 'QA121-r5-c-logado-medico')
  // so a propria agenda: /medicos (agenda dos outros desabilitada) e /agendamentos
  await C.irMedicos(p3)
  const cards = p3.locator('div.grid > div')
  const n = await cards.count()
  const resumo = []
  for (let k = 0; k < n; k++) {
    const c = cards.nth(k)
    const nome = (await c.locator('h3').innerText().catch(() => '?')).trim()
    const ag = c.locator('button[title*="agenda"]')
    resumo.push(`${nome}: agenda=${(await ag.count()) ? ((await ag.first().isDisabled()) ? 'desabilitada' : 'HABILITADA') : 'sem botao'} | envelope=${await C.envelope(c).count()}`)
  }
  L.note(`/medicos como M1: ${n} cards | ${JSON.stringify(resumo)}`)
  L.note(`botoes de convite (envelope) na pagina inteira para o MEDICO: ${await p3.getByRole('button', { name: /Enviar convite de acesso/ }).count()}`)
  await L.shot(p3, 'QA121-r5-d-medicos-como-M1')
  i0 = L.LINES.length
  await p3.getByRole('link', { name: 'Agendamentos' }).first().click()
  await p3.waitForURL('**/agendamentos').catch(() => {})
  await L.sleep(2500)
  L.note(`/agendamentos como M1: ${JSON.stringify(L.respostas(i0))} | corpo GET agendamentos=${C.corpoDe(i0, /\/agendamentos(\?|$| )/).slice(0, 300)}`)
  await L.shot(p3, 'QA121-r5-e-agendamentos-como-M1')
  M1.senhaDefinida = 'QA121'; C.save()
  await L.end('QA121-r5', 'token do link lido em auth.reset_senha_token (somente leitura, papel do medico lendo o proprio e-mail); mascarado')

  // ── QA123 ──
  L.start('QA123-r5')
  const S4 = await L.newSession(browser, 'ANON-123')
  const p4 = S4.page
  for (const [rot, url] of [['link ja usado', L.linkConvite(tok1)], ['token invalido', L.linkConvite('token-invalido-qa-r5-0000')]]) {
    await p4.goto(url)
    await p4.getByLabel('Nova senha', { exact: true }).fill('QaMedR5#Reuso99')
    await p4.getByLabel('Confirmar nova senha').fill('QaMedR5#Reuso99')
    const j0 = L.LINES.length
    await p4.getByRole('button', { name: 'Criar senha', exact: true }).click()
    await p4.locator('[data-sonner-toast]').first().waitFor({ timeout: 10000 }).catch(() => {})
    await L.sleep(500)
    L.note(`[${rot}] -> ${JSON.stringify(L.respostas(j0))} | corpo=${C.corpoDe(j0, /resetar-senha|reset/)} | toasts=${JSON.stringify(await L.toasts(p4))} | url=${p4.url()}`)
    await L.shot(p4, `QA123-r5-${rot === 'link ja usado' ? 'a-link-usado' : 'b-token-invalido'}`)
    await L.esperarToastsSumirem(p4)
  }
  await L.end('QA123-r5')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally {
  L.saveAll('r5-h1')
  await browser.close()
}
