// RODADA 5 — QA126 complemento: no r5-h2 cada envio respondeu em ~40 ms e os cliques (slowMo 150) sairam em sequencia,
// sem medir o "desabilitado durante o envio". Aqui: medico novo M3 (SEC-A), MutationObserver no botao e dblclick real.
import * as L from './lib5.mjs'
import * as C from './r5-common.mjs'
const browser = await L.launch()
try {
  const SA = await L.newSession(browser, 'SEC-A')
  const pa = SA.page
  await L.login(pa, C.contas.A.email, C.contas.A.senha)
  await C.irMedicos(pa)
  L.start('QA126-r5-dblclick')
  const M = C.novoMedico('Tres')
  await pa.getByRole('button', { name: 'Novo Médico' }).click()
  const m = L.modal(pa)
  await m.getByLabel('Nome completo').fill(M.nome)
  await m.getByLabel('CRM', { exact: true }).fill(M.crm)
  await m.getByLabel('Especialidade').selectOption(M.especialidade)
  await m.getByLabel('E-mail').fill(M.email)
  let i0 = L.LINES.length
  const wc = pa.waitForResponse((r) => r.url().endsWith('/v1/api/medicos') && r.request().method() === 'POST')
  const wv = pa.waitForResponse((r) => r.url().includes('/convite-acesso'), { timeout: 20000 })
  await m.getByRole('button', { name: 'Salvar' }).click()
  const med = await (await wc).json(); await wv
  M.id = med.id; M.status = 'ativo'; C.r5.medicos.push(M); C.save()
  L.note(`M3 cadastrado ${M.id}: ${JSON.stringify(L.respostas(i0, /medicos/))}`)
  await L.esperarToastsSumirem(pa)
  await C.buscarMedico(pa, M.email)
  const env = C.envelope(C.cardMedico(pa, M.email))
  await env.waitFor()
  await env.evaluate((el) => {
    window.__qaDisabled = []
    new MutationObserver(() => window.__qaDisabled.push({ t: performance.now(), disabled: el.disabled, cls: el.querySelector('svg')?.getAttribute('class') })).observe(el, { attributes: true, subtree: true, attributeFilter: ['disabled', 'class'] })
  })
  i0 = L.LINES.length
  await env.dblclick({ delay: 0 })
  await pa.locator('[data-sonner-toast]').first().waitFor({ timeout: 8000 }).catch(() => {})
  await L.sleep(1500)
  const obs = await pa.evaluate(() => window.__qaDisabled)
  const posts = L.LINES.slice(i0).filter((l) => />> POST .*convite-acesso/.test(l)).length
  L.note(`dblclick no envelope de M3: POST convite-acesso=${posts} | respostas=${JSON.stringify(L.respostas(i0, /convite/))} | mudancas do botao (MutationObserver)=${JSON.stringify(obs)} | toasts=${JSON.stringify(await L.toasts(pa))}`)
  await L.shot(pa, 'QA126-r5-c-dblclick')
  await L.end('QA126-r5-dblclick')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally {
  L.saveAll('r5-h3')
  await browser.close()
}
