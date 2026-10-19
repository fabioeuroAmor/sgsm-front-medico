// RODADA 5 — secao 12 parte 2: vinculo de M1 a Clinica São Lucas (UI), QA124 (reenvio do convite), QA125 (escopo),
// QA126 (clique repetido / limite de 3), QA127 (editar/inativar/reativar; esqueci minha senha)
import * as L from './lib5.mjs'
import * as C from './r5-common.mjs'
const browser = await L.launch()
const M1 = C.r5.medicos.find((x) => x.rotulo === 'Um')
const M2 = C.r5.medicos.find((x) => x.rotulo === 'Dois')
const SENHA_M1B = 'QaMedR5#Convite2'
const STRIX = 'c00b458a-db4b-491e-bcb6-4cdf046a17ba'

async function convitePorFetch(p, id) {
  return p.evaluate(async (id) => {
    const m = await import('/src/services/tokenStore.ts')
    const resp = await fetch(`/v1/api/medicos/${id}/convite-acesso`, { method: 'POST', headers: { Authorization: 'Bearer ' + m.tokenStore.get() } })
    return { status: resp.status, body: await resp.text() }
  }, id)
}

try {
  const SA = await L.newSession(browser, 'SEC-A')
  const pa = SA.page
  await L.login(pa, C.contas.A.email, C.contas.A.senha)

  // ── observacao: em sessao nova, SEC-A ainda ve M1/M2 (sem vinculo) em /medicos? ──
  L.start('SETUP-r5-vinculo')
  await C.irMedicos(pa)
  await C.buscarMedico(pa, 'QA Medico Rcinco')
  L.note(`SEC-A, sessao nova, /medicos busca "QA Medico Rcinco": ${await pa.locator('div.grid > div').filter({ hasText: 'QA Medico Rcinco' }).count()} cards | GET /medicos contem M1=${L.LINES.some((l) => /<< 200 GET .*\/v1\/api\/medicos(\?| )/.test(l) && l.includes(M1.id))} M2=${L.LINES.some((l) => /<< 200 GET .*\/v1\/api\/medicos(\?| )/.test(l) && l.includes(M2.id))}`)
  await L.shot(pa, 'SETUP-r5-a-SEC-A-nao-ve-medicos-sem-vinculo')
  // vinculo de M1 e M2 a Clinica São Lucas pela tela /estabelecimentos, como DEV (a lista da SEC-A nao os mostra)
  const SD = await L.newSession(browser, 'DEV')
  const pd = SD.page
  await L.login(pd, C.DEV_EMAIL, C.DEV_SENHA)
  await pd.getByRole('link', { name: 'Estabelecimentos' }).first().click()
  await pd.waitForURL('**/estabelecimentos')
  await L.sleep(1500)
  const est = pd.locator('div.grid > div').filter({ hasText: 'Clinica São Lucas' }).first()
  await est.getByTitle('Gerenciar médicos').click()
  let m = L.modal(pd)
  await m.getByText(M1.nome).waitFor({ timeout: 15000 })
  await m.locator('label').filter({ hasText: M1.nome }).locator('input[type=checkbox]').check()
  await m.locator('label').filter({ hasText: M2.nome }).locator('input[type=checkbox]').check()
  await L.shot(pd, 'SETUP-r5-b-vinculo-DEV')
  let w = pd.waitForResponse((r) => r.url().includes('/estabelecimentos/') && r.request().method() !== 'GET')
  await m.getByRole('button', { name: 'Salvar Vínculos' }).click()
  let r = await w
  L.note(`vinculo M1+M2 (DEV) -> ${r.request().method()} ${r.url()} -> ${r.status()} body=${r.request().postData()}`)
  await L.sleep(1500)
  await SD.ctx.close()
  await pa.reload()
  await L.sleep(2000)
  await C.buscarMedico(pa, 'QA Medico Rcinco')
  L.note(`SEC-A apos vinculo: ${await pa.locator('div.grid > div').filter({ hasText: 'QA Medico Rcinco' }).count()} cards`)
  await L.end('SETUP-r5-vinculo')

  // ── QA124 ──
  L.start('QA124-r5')
  await C.irMedicos(pa)
  await C.buscarMedico(pa, M1.email)
  const c1 = C.cardMedico(pa, M1.email)
  L.note(`card M1 (SEC-A): ${(await c1.innerText()).replace(/\n/g, ' | ')} | envelope=${await C.envelope(c1).count()} title=${JSON.stringify(await C.envelope(c1).getAttribute('title'))}`)
  let i0 = L.LINES.length
  w = pa.waitForResponse((r) => r.url().includes('/convite-acesso'), { timeout: 20000 })
  await C.envelope(c1).click()
  r = await w
  await pa.locator('[data-sonner-toast]').first().waitFor({ timeout: 8000 }).catch(() => {})
  await L.sleep(300)
  L.note(`envelope M1 -> ${r.status()} corpo=${C.corpoDe(i0, /convite-acesso/)} | toasts=${JSON.stringify(await L.toasts(pa))}`)
  await L.shot(pa, 'QA124-r5-a-convite-enviado')
  const tok2 = L.tokenConvite(M1.email)
  const SM = await L.newSession(browser, 'MED-M1')
  const pm = SM.page
  await pm.goto(L.linkConvite(tok2))
  await pm.getByLabel('Nova senha', { exact: true }).fill(SENHA_M1B)
  await pm.getByLabel('Confirmar nova senha').fill(SENHA_M1B)
  i0 = L.LINES.length
  await pm.getByRole('button', { name: 'Criar senha', exact: true }).click()
  await pm.waitForURL((u) => u.pathname === '/login', { timeout: 15000 }).catch(() => {})
  await pm.locator('[data-sonner-toast]').first().waitFor({ timeout: 5000 }).catch(() => {})
  await L.sleep(300)
  L.note(`novo link -> ${JSON.stringify(L.respostas(i0))} | toasts=${JSON.stringify(await L.toasts(pm))} | url=${pm.url()}`)
  await L.shot(pm, 'QA124-r5-b-nova-senha-criada')
  await L.esperarToastsSumirem(pm)
  i0 = L.LINES.length
  await L.login(pm, M1.email, 'QaMedR5#Convite1', { esperar: null })
  await pm.locator('[data-sonner-toast]').first().waitFor({ timeout: 10000 }).catch(() => {})
  await L.sleep(500)
  L.note(`login com a senha ANTIGA (QA121) -> ${JSON.stringify(L.respostas(i0))} | toasts=${JSON.stringify(await L.toasts(pm))}`)
  await L.esperarToastsSumirem(pm)
  i0 = L.LINES.length
  await L.login(pm, M1.email, SENHA_M1B, { esperar: null })
  await pm.waitForURL((u) => u.pathname !== '/login', { timeout: 20000 }).catch(() => {})
  await L.sleep(2000)
  L.note(`login com a senha NOVA -> ${JSON.stringify(L.respostas(i0, /auth\/login/))} | url=${pm.url()}`)
  await L.shot(pm, 'QA124-r5-c-logado-senha-nova')
  M1.senhaDefinida = 'QA124'; C.save()
  await L.end('QA124-r5', 'token do novo link lido em auth.reset_senha_token (mais recente do medico); mascarado')

  // ── QA125 ──
  L.start('QA125-r5')
  i0 = L.LINES.length
  const rs = await convitePorFetch(pa, STRIX)
  L.note(`SEC-A POST /medicos/${STRIX}/convite-acesso (Medico Teste Strix, outra clinica) -> ${rs.status} | corpo=${rs.body}`)
  const rc = await convitePorFetch(pa, M1.id)
  L.note(`controle, mesma tecnica, M1 (Clinica São Lucas) -> ${rc.status} | corpo=${rc.body}`)
  await L.shot(pa, 'QA125-r5-a-SEC-A')
  // medico logado: sem envelope; e so a propria agenda
  await C.irMedicos(pm)
  const cardsM = pm.locator('div.grid > div')
  const nM = await cardsM.count()
  const resumo = []
  for (let k = 0; k < nM; k++) {
    const c = cardsM.nth(k)
    const ag = c.locator('button[title*="agenda"]')
    resumo.push(`${(await c.locator('h3').innerText()).trim()}: editar=${(await c.getByRole('button', { name: 'Editar' }).isDisabled()) ? 'desabilitado' : 'habilitado'} agenda=${(await ag.count()) ? ((await ag.first().isDisabled()) ? 'desabilitada' : 'habilitada') : 'sem botao'} envelope=${await C.envelope(c).count()}`)
  }
  L.note(`/medicos como M1 (vinculado): ${nM} cards ${JSON.stringify(resumo)} | envelopes na pagina=${await pm.getByRole('button', { name: /Enviar convite de acesso/ }).count()}`)
  await L.shot(pm, 'QA125-r5-b-medico-sem-envelope')
  await L.end('QA125-r5', 'parte "medico inativo nao tem o botao" esta no QA127-r5')

  // ── QA126 ──
  L.start('QA126-r5')
  await C.buscarMedico(pa, M2.email)
  const c2 = C.cardMedico(pa, M2.email)
  const env = C.envelope(c2)
  const resultados = []
  for (let k = 1; k <= 3; k++) {
    i0 = L.LINES.length
    const pend = pa.waitForResponse((r) => r.url().includes('/convite-acesso'), { timeout: 20000 })
    await env.click({ noWaitAfter: true })
    const desab = await env.isDisabled()
    await env.click({ force: true, timeout: 1000, noWaitAfter: true }).catch(() => {})
    await env.click({ force: true, timeout: 1000, noWaitAfter: true }).catch(() => {})
    const rr = await pend
    await pa.locator('[data-sonner-toast]').first().waitFor({ timeout: 8000 }).catch(() => {})
    await L.sleep(1200)
    const posts = L.LINES.slice(i0).filter((l) => />> POST .*convite-acesso/.test(l)).length
    const t = await L.toasts(pa)
    resultados.push({ rodada: k, desabilitadoLogoAposClique: desab, postsNaRodada: posts, status: rr.status(), toasts: t })
    L.note(`[rodada ${k}: 1 clique + 2 cliques forcados] desabilitado logo apos o 1o clique=${desab} | POST convite-acesso na rodada=${posts} | status=${rr.status()} | corpo=${C.corpoDe(i0, /convite-acesso/)} | toasts=${JSON.stringify(t)}`)
    if (k === 1) await L.shot(pa, 'QA126-r5-a-primeiro')
    if (k === 3) await L.shot(pa, 'QA126-r5-b-limite')
    await L.esperarToastsSumirem(pa)
  }
  L.note(`convites de M2 em 15 min: 1 (cadastro, QA120) + ${resultados.filter((x) => x.status === 200).length} aceitos aqui; recusado(s): ${resultados.filter((x) => x.status !== 200).map((x) => x.rodada)}`)
  await L.end('QA126-r5')

  // ── QA127 ──
  L.start('QA127-r5')
  await c2.getByRole('button', { name: 'Editar' }).click()
  m = L.modal(pa)
  await m.getByLabel('Telefone (opcional)').fill('11987650127')
  await m.getByLabel('Especialidade').selectOption('Neurologia')
  i0 = L.LINES.length
  w = pa.waitForResponse((r) => r.url().includes(`/medicos/${M2.id}`) && ['PUT', 'PATCH'].includes(r.request().method()))
  await m.getByRole('button', { name: 'Salvar' }).click()
  r = await w
  await L.sleep(1500)
  L.note(`editar M2 -> ${r.request().method()} ${r.status()} | card=${(await C.cardMedico(pa, M2.email).innerText()).replace(/\n/g, ' | ')}`)
  await L.shot(pa, 'QA127-r5-a-editado')
  await C.cardMedico(pa, M2.email).locator('button.bg-destructive, button').filter({ has: pa.locator('svg.lucide-trash2, svg.lucide-trash-2') }).first().click()
  w = pa.waitForResponse((r) => r.url().includes(`/medicos/${M2.id}`) && r.request().method() !== 'GET')
  await L.modal(pa).getByRole('button', { name: 'Inativar' }).click()
  r = await w
  await L.sleep(1500)
  await pa.locator('select').first().selectOption('')
  await C.buscarMedico(pa, M2.email)
  await L.sleep(1200)
  const c2i = C.cardMedico(pa, M2.email)
  L.note(`inativar M2 -> ${r.request().method()} ${r.status()} | card=${(await c2i.innerText().catch(() => '(card nao visivel)')).replace(/\n/g, ' | ')} | envelope no card inativo=${await C.envelope(c2i).count()}`)
  await L.shot(pa, 'QA127-r5-b-inativo-sem-envelope')
  w = pa.waitForResponse((r) => r.url().includes(`/medicos/${M2.id}`) && r.request().method() !== 'GET')
  await c2i.getByRole('button', { name: /Reativar/ }).click()
  r = await w
  await pa.locator('[data-sonner-toast]').first().waitFor({ timeout: 8000 }).catch(() => {})
  await L.sleep(1000)
  L.note(`reativar M2 -> ${r.request().method()} ${r.status()} | toasts=${JSON.stringify(await L.toasts(pa))} | card=${(await C.cardMedico(pa, M2.email).innerText()).replace(/\n/g, ' | ')} | envelope=${await C.envelope(C.cardMedico(pa, M2.email)).count()}`)
  await L.shot(pa, 'QA127-r5-c-reativado')
  // esqueci minha senha (fluxo normal)
  const SE = await L.newSession(browser, 'ANON-127')
  const pe = SE.page
  await pe.goto(L.BASE + '/login')
  await pe.getByRole('link', { name: 'Esqueci minha senha' }).click()
  await pe.waitForURL('**/esqueci-senha')
  await L.sleep(800)
  L.note(`/esqueci-senha texto=${JSON.stringify((await pe.locator('body').innerText()).replace(/\n+/g, ' | ').slice(0, 500))}`)
  await L.shot(pe, 'QA127-r5-d-esqueci-senha')
  await pe.getByLabel(/E-mail/i).fill(`qa.inexistente.r5.${Date.now()}@teste.com`)
  i0 = L.LINES.length
  await pe.getByRole('button').filter({ hasText: /Enviar|link/i }).first().click()
  await L.sleep(2500)
  L.note(`esqueci-senha enviar -> ${JSON.stringify(L.respostas(i0))} | toasts=${JSON.stringify(await L.toasts(pe))} | texto=${JSON.stringify((await pe.locator('body').innerText()).replace(/\n+/g, ' | ').slice(0, 400))}`)
  await L.shot(pe, 'QA127-r5-e-esqueci-enviado')
  await pe.goto(L.BASE + '/resetar-senha?token=token-qualquer-r5-1234')
  await pe.getByRole('heading', { level: 1 }).waitFor()
  L.note(`/resetar-senha sem convite=1: titulo=${JSON.stringify(await pe.getByRole('heading', { level: 1 }).innerText())} | subtitulo=${JSON.stringify(await pe.locator('h1 + p').innerText())} | botao "Redefinir senha"=${await pe.getByRole('button', { name: 'Redefinir senha' }).count()} | botao "Criar senha"=${await pe.getByRole('button', { name: 'Criar senha', exact: true }).count()}`)
  await L.shot(pe, 'QA127-r5-f-resetar-senha-normal')
  await L.end('QA127-r5')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally {
  L.saveAll('r5-h2')
  await browser.close()
}
