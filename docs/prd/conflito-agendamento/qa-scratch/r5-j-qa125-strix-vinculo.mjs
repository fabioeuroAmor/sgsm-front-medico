// RODADA 5 — QA125 diagnostico (somente leitura, DEV pela tela /estabelecimentos): o Medico Teste Strix esta vinculado a que clinica?
import * as L from './lib5.mjs'
import * as C from './r5-common.mjs'
const browser = await L.launch()
try {
  L.start('QA125-r5-diagnostico')
  const D = await L.newSession(browser, 'DEV')
  const p = D.page
  await L.login(p, C.DEV_EMAIL, C.DEV_SENHA)
  await p.getByRole('link', { name: 'Estabelecimentos' }).first().click()
  await p.waitForURL('**/estabelecimentos')
  await L.sleep(2000)
  const nomes = await p.locator('div.grid > div h3').allInnerTexts()
  L.note(`estabelecimentos visiveis ao DEV: ${JSON.stringify(nomes)}`)
  for (const nome of nomes.filter((n) => /Strix|São Lucas/i.test(n))) {
    const est = p.locator('div.grid > div').filter({ hasText: nome }).first()
    await est.getByTitle('Gerenciar médicos').click()
    const m = L.modal(p)
    await L.sleep(2000)
    const marcados = await m.locator('label').filter({ has: p.locator('input:checked') }).allInnerTexts()
    L.note(`[${nome}] medicos vinculados (checkbox marcado): ${JSON.stringify(marcados.map((t) => t.replace(/\n/g, ' ')))}`)
    await L.shot(p, `QA125-r5-c-vinculos-${nome.replace(/[^a-z0-9]+/gi, '-')}`)
    await L.fecharModal(p).catch(async () => { await p.keyboard.press('Escape') })
    await L.sleep(800)
  }
  L.note(`GET /estabelecimentos/*/medicos com o id do Strix: ${JSON.stringify(L.LINES.filter((l) => /<< 200 GET .*estabelecimentos\/[^/]+\/medicos/.test(l)).map((l) => l.match(/estabelecimentos\/([^/]+)\/medicos/)[1] + ' contem Strix=' + l.includes('c00b458a')))}`)
  await L.end('QA125-r5-diagnostico')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally {
  L.saveAll('r5-j')
  await browser.close()
}
