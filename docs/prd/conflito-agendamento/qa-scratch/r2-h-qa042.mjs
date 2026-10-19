// RODADA 2 — QA042: (1) passos da rodada 1: sem access token + sem refresh_token, clicar horario;
// (2) variacao: access token INVALIDO + refresh_token removido, clicar horario
import fs from 'node:fs'
import * as L from './lib.mjs'
const contas = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const browser = await L.launch()

async function cenario(id, sufixo, slot, preparar) {
  const S = await L.newSession(browser, 'SEC-A')
  const pa = S.page
  await L.login(pa, contas.A.email, contas.A.senha)
  await L.irAgendamentos(pa)
  await L.wizardAte4(pa)
  await L.shot(pa, `QA042-r2-${sufixo}-a-passo4`)
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
  await L.shot(pa, `QA042-r2-${sufixo}-b-login`)
  // "nenhum horario preso": refaz login e confere que o horario nao ficou reservado
  await L.login(pa, contas.A.email, contas.A.senha)
  await L.irAgendamentos(pa)
  await L.wizardAte4(pa)
  L.note(`[${id}] apos novo login, title do ${slot}: ${await L.slotBtn(pa, slot).getAttribute('title').catch(() => 'sem botao')} | faixa: ${await L.faixaReserva(pa).isVisible()} | selecionados: ${JSON.stringify(await L.modal(pa).locator('div.grid.grid-cols-3 > button.bg-primary\\/10').allTextContents())}`)
  await L.shot(pa, `QA042-r2-${sufixo}-c-relogado`)
  await L.fecharModal(pa)
  await S.ctx.close()
}

L.start('QA042-r2')
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
await L.end('QA042-r2', 'cenario 1 = passos da rodada 1; cenario 2 = access token invalido + refresh_token removido')
L.saveAll('r2-h')
await browser.close()
