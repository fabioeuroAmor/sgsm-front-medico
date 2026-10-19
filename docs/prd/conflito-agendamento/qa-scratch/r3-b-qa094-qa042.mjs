// RODADA 3 — QA094 (senha errada em /login), reativacao de SEC-A pela UI (DEV) e QA042 cenarios 1 e 2 com SEC-A
import fs from 'node:fs'
import * as L from './lib.mjs'
const contas = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const R3 = new URL('./contas-r3.json', import.meta.url)
const DEV_EMAIL = 'dev-local@sgsm.local', DEV_SENHA = 'Dev088c00c5ba89!Aa'
const browser = await L.launch()

// ── QA094-r3 ──────────────────────────────────────────────────────────────
L.start('QA094-r3')
const anon = await L.newSession(browser, 'ANON')
const pa0 = anon.page
await pa0.goto(L.BASE + '/login')
await pa0.getByLabel('E-mail').fill(DEV_EMAIL)
await pa0.getByLabel('Senha').fill('SenhaErrada123!')
await pa0.getByRole('button', { name: 'Entrar' }).click()
await pa0.locator('[data-sonner-toast]').first().waitFor({ timeout: 10000 }).catch(() => {})
await L.sleep(2000)
await L.shot(pa0, 'QA094-r3')
L.note('URL: ' + pa0.url() + ' | Toast visivel: ' + JSON.stringify(await pa0.locator('[data-sonner-toast]').allTextContents()) + ' | alertas=' + JSON.stringify(await pa0.getByRole('alert').allTextContents()) + ' | "Request failed": ' + (await pa0.getByText(/Request failed/).count()) + ' | "Sua sessão expirou" visivel: ' + await pa0.getByText('Sua sessão expirou').isVisible().catch(() => false))
await L.end('QA094-r3')
await anon.ctx.close()

// ── reativacao de SEC-A (DEV, /funcionarios) ─────────────────────────────
L.start('SETUP-r3')
const dev = await L.newSession(browser, 'DEV')
const p = dev.page
await L.login(p, DEV_EMAIL, DEV_SENHA)
await p.getByRole('link', { name: 'Funcionários' }).first().click()
await p.waitForURL('**/funcionarios')
await p.getByRole('button', { name: 'Novo Funcionário' }).waitFor()
await p.getByPlaceholder('Buscar por nome, CPF, cargo ou e-mail…').fill('qa.conflito')
await L.sleep(2000)
let cardA = p.locator('div.grid > div').filter({ hasText: contas.A.email }).first()
L.note('card SEC-A antes: ' + (await cardA.innerText()).replace(/\n/g, ' | '))
if ((await cardA.innerText()).includes('Inativo')) {
  await p.locator('select').nth(1).selectOption('false')
  await L.sleep(1500)
  cardA = p.locator('div.grid > div').filter({ hasText: contas.A.email }).first()
  const w = p.waitForResponse((r) => r.url().includes('/funcionarios/') && ['PATCH', 'PUT', 'POST'].includes(r.request().method()))
  await cardA.getByRole('button', { name: /Reativar/ }).click()
  const r = await w
  L.note(`reativar ${contas.A.email}: ${r.request().method()} ${r.url()} -> ${r.status()}`)
  await L.sleep(1500)
  await p.locator('select').nth(1).selectOption('')
  await L.sleep(1500)
} else L.note('SEC-A ja estava ativa')
L.note('cards qa.conflito: ' + JSON.stringify((await p.locator('div.grid > div').filter({ hasText: 'qa.conflito' }).allInnerTexts()).map((t) => t.replace(/\n/g, ' | '))))
await L.shot(p, 'SETUP-r3-a-SEC-A-reativada')
await L.end('SETUP-r3')
const r3 = fs.existsSync(R3) ? JSON.parse(fs.readFileSync(R3)) : {}
r3.secAReativada = true
fs.writeFileSync(R3, JSON.stringify(r3, null, 2))
await dev.ctx.close()

// ── QA042-r3 cenarios 1 e 2 ──────────────────────────────────────────────
async function cenario(id, sufixo, slot, preparar) {
  const S = await L.newSession(browser, 'SEC-A')
  const pa = S.page
  await L.login(pa, contas.A.email, contas.A.senha)
  await L.irAgendamentos(pa)
  await L.wizardAte4(pa)
  await L.shot(pa, `QA042-r3-${sufixo}-a-passo4`)
  const i0 = L.LINES.length
  await pa.evaluate(preparar)
  L.note(`[${id}] estado preparado: ` + await pa.evaluate(async () => {
    const m = await import('/src/services/tokenStore.ts')
    const t = m.tokenStore.get()
    return `access=${t === null ? 'null' : (t.startsWith('qa-invalido') ? 'qa-invalido(fabricado)' : 'outro')} refresh_token=${localStorage.getItem('refresh_token') === null ? 'ausente' : 'presente'}`
  }))
  await L.slotBtn(pa, slot).click()
  const ok = await pa.waitForURL('**/login**', { timeout: 15000 }).then(() => true).catch(() => false)
  await L.sleep(2000)
  L.note(`[${id}] redirecionou: ${ok} | url=${pa.url()}`)
  L.note(`[${id}] alerta na tela de login: ` + JSON.stringify(await pa.getByRole('alert').allTextContents()) + ' | texto "Sua sessão expirou" visivel: ' + await pa.getByText('Sua sessão expirou. Faça login novamente.').isVisible().catch(() => false))
  const lin = L.LINES.slice(i0)
  L.note(`[${id}] POST /reservas: ${lin.filter((l) => />> POST .*\/agendamentos\/reservas /.test(l)).length} | respostas reservas: ${JSON.stringify(lin.filter((l) => /<< \d+ POST .*\/agendamentos\/reservas /.test(l)).map((l) => l.match(/<< (\d+)/)[1]))} | /auth/refresh chamadas: ${lin.filter((l) => />> POST .*\/auth\/refresh/.test(l)).length} | "Request failed": ${lin.filter((l) => /Request failed/.test(l)).length}`)
  await L.shot(pa, `QA042-r3-${sufixo}-b-login`)
  await L.login(pa, contas.A.email, contas.A.senha)
  await L.irAgendamentos(pa)
  await L.wizardAte4(pa)
  L.note(`[${id}] apos novo login, title do ${slot}: ${await L.slotBtn(pa, slot).getAttribute('title').catch(() => 'sem botao')} | faixa: ${await L.faixaReserva(pa).isVisible()} | selecionados: ${JSON.stringify(await L.modal(pa).locator('div.grid.grid-cols-3 > button.bg-primary\\/10').allTextContents())}`)
  await L.shot(pa, `QA042-r3-${sufixo}-c-relogado`)
  await L.fecharModal(pa)
  await L.sleep(1000)
  await S.ctx.close()
}

L.start('QA042-r3')
await cenario('sem-tokens', '1', '09:00', async () => {
  const m = await import('/src/services/tokenStore.ts')
  m.tokenStore.clear()
  localStorage.removeItem('refresh_token')
})
await cenario('access-invalido', '2', '09:30', async () => {
  const m = await import('/src/services/tokenStore.ts')
  m.tokenStore.set('qa-invalido.eyJ4IjoxfQ.assinatura-invalida')
  localStorage.removeItem('refresh_token')
})
await L.end('QA042-r3', 'cenario 1 = sem access e sem refresh_token; cenario 2 = access token invalido + refresh_token removido (SEC-A)')
L.saveAll('r3-b')
await browser.close()
