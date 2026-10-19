// RODADA 7 — QA113 (endpoint email-disponivel removido; tela de cadastro sem chamada a ele), QA100, QA101, QA094. Sem mock.
import * as L from './lib5.mjs'
import * as C from './r7-common.mjs'
const browser = await L.launch()
const todasUrls = [] // qualquer requisicao da pagina (nao so /v1) que contenha email-disponivel
try {
  const S = await L.newSession(browser, 'ANON-R7')
  const p = S.page
  S.ctx.on('request', (r) => { if (/email-disponivel/i.test(r.url())) todasUrls.push(r.method() + ' ' + r.url()) })
  L.note(`contexto anonimo: cookies=${(await S.ctx.cookies()).length}`)

  // ── QA113 parte API: sem login, e-mail com conta x sem conta ──
  L.start('QA113-r7')
  await p.goto(L.BASE + '/login')
  const comConta = ['dev-local@sgsm.local', 'qa.conflito.pac.r6.a.1792290240168@teste.com']
  const semConta = `qa.inexistente.r7.${Date.now()}@teste.com`
  const api = await p.evaluate(async (emails) => {
    const out = []
    for (const e of emails) {
      const r = await fetch('/v1/api/auth/email-disponivel?email=' + encodeURIComponent(e))
      out.push({ e, status: r.status, ct: r.headers.get('content-type'), body: await r.text() })
    }
    return out
  }, [...comConta, semConta])
  for (const x of api) L.note(`(API via :3010, sem login) GET /v1/api/auth/email-disponivel?email=${x.e} -> ${x.status} | ${x.ct} | ${x.body}`)
  const norm = (b) => b.replace(/"instance":"[^"]*",?/, '')
  L.note(`QA113 API: status iguais=${new Set(api.map((x) => x.status)).size === 1} (${api.map((x) => x.status).join('/')}) | corpos iguais=${new Set(api.map((x) => norm(x.body))).size === 1} | algum "disponivel" no corpo=${api.some((x) => /disponivel"\s*:/.test(x.body))}`)
  // direto no auth de QA (:8091), sem passar pelo proxy
  for (const e of [comConta[0], semConta]) {
    const r = await fetch('http://localhost:8091/v1/api/auth/email-disponivel?email=' + encodeURIComponent(e))
    L.note(`(API direto :8091, sem login) GET /v1/api/auth/email-disponivel?email=${e} -> ${r.status} | ${await r.text()}`)
  }
  await p.goto(L.BASE + '/v1/api/auth/email-disponivel?email=' + encodeURIComponent(comConta[0]))
  await L.sleep(800)
  await L.shot(p, 'QA113-r7-a-endpoint-com-conta')
  await p.goto(L.BASE + '/v1/api/auth/email-disponivel?email=' + encodeURIComponent(semConta))
  await L.sleep(800)
  await L.shot(p, 'QA113-r7-b-endpoint-sem-conta')

  // ── QA113 parte tela + QA100: cadastro feliz, observando a rede inteira da tela ──
  L.start('QA100-r7')
  const iTela = L.LINES.length
  const nUrlsAntes = todasUrls.length
  L.note(`QA113 API: requisicoes com email-disponivel feitas pelo QA ate aqui (fetch + abertura direta)=${nUrlsAntes}`)
  await p.goto(L.BASE + '/registrar')
  const A = C.novoPaciente7('A')
  // digita e sai do campo e-mail com um e-mail que JA tem conta, para ver se algo e consultado no blur
  await p.getByLabel('E-mail', { exact: true }).fill(comConta[1])
  await p.getByLabel('E-mail', { exact: true }).blur()
  await L.sleep(1500)
  await C.preencherPaciente(p, A, { senha: C.SENHA7 })
  await p.getByLabel('E-mail', { exact: true }).blur()
  await L.sleep(1000)
  await L.shot(p, 'QA100-r7-a-form')
  const i0 = await C.criarConta(p)
  await L.sleep(500)
  L.note(`QA100: respostas=${JSON.stringify(L.respostas(i0))} | corpo=${C.corpoDe(i0, /publico\/pacientes/)}`)
  L.note(`QA100: url=${p.url()} | heading "Ative sua conta"=${await p.getByRole('heading', { name: 'Ative sua conta' }).count()} | e-mail na tela=${await p.getByText(A.email).count()}`)
  C.contar7(i0, 'QA100-A')
  A.origem = 'QA100 (/registrar)'; A.status = 'pendente'
  C.r7.pacientes.push(A); C.save7()
  await L.shot(p, 'QA100-r7-b-ative-sua-conta')
  await L.end('QA100-r7')
  const linTela = L.LINES.slice(iTela).filter((l) => !l.includes('[NOTA]'))
  L.note(`QA113 tela: requisicoes /v1 da tela de cadastro: ${JSON.stringify(linTela.filter((l) => / >> /.test(l)).map((l) => l.split(' >> ')[1].split(' (sem')[0].split(' Authorization')[0]))}`)
  L.note(`QA113 tela: requisicoes com "email-disponivel" vistas pelo contexto (qualquer URL) desde a abertura de /registrar = ${JSON.stringify(todasUrls.slice(nUrlsAntes))}`)
  await L.end('QA113-r7', `e-mails com conta: ${comConta.join(', ')}; sem conta: ${semConta}`)

  // ── QA101: login antes de ativar, senha certa ──
  L.start('QA101-r7')
  const S1 = await L.newSession(browser, 'ANON-101')
  const p1 = S1.page
  await p1.goto(L.BASE + '/login')
  await p1.getByLabel('E-mail').fill(A.email)
  await p1.getByLabel('Senha').fill(C.SENHA7)
  const j0 = L.LINES.length
  await p1.getByRole('button', { name: 'Entrar' }).click()
  await p1.locator('[data-sonner-toast]').first().waitFor({ timeout: 15000 }).catch(() => {})
  await L.sleep(1000)
  await L.shot(p1, 'QA101-r7-a-login-nao-ativada')
  const toastEl = p1.locator('[data-sonner-toast]').first()
  const temAcao = await toastEl.getByRole('button', { name: 'Digitar código' }).isVisible().catch(() => false)
  L.note(`url=${p1.url()} | toasts=${JSON.stringify(await L.toasts(p1))} | acao "Digitar código"=${temAcao} | refresh_token=${(await p1.evaluate(() => localStorage.getItem('refresh_token'))) ? 'presente' : 'ausente'}`)
  L.note(`respostas: ${JSON.stringify(L.respostas(j0))} | corpo login=${C.corpoDe(j0, /auth\/login/)}`)
  if (temAcao) await toastEl.getByRole('button', { name: 'Digitar código' }).click()
  await p1.getByRole('heading', { name: 'Ative sua conta' }).waitFor({ timeout: 10000 }).catch(() => {})
  await L.sleep(800)
  L.note(`apos "Digitar código": url=${p1.url()} | heading=${await p1.getByRole('heading', { name: 'Ative sua conta' }).isVisible().catch(() => false)} | e-mail na tela=${await p1.getByText(A.email).count()} | campo do codigo visivel=${await p1.getByLabel('Código de ativação').isVisible().catch(() => false)}`)
  await L.shot(p1, 'QA101-r7-b-etapa-codigo')
  await L.end('QA101-r7')
  await S1.ctx.close()

  // ── QA094: login com senha errada (DEV) ──
  L.start('QA094-r7')
  const S2 = await L.newSession(browser, 'ANON-094')
  const p2 = S2.page
  await p2.goto(L.BASE + '/login')
  await p2.getByLabel('E-mail').fill(C.DEV_EMAIL)
  await p2.getByLabel('Senha').fill('SenhaErrada#123!')
  await p2.getByRole('button', { name: 'Entrar' }).click()
  await p2.locator('[data-sonner-toast]').first().waitFor({ timeout: 10000 }).catch(() => {})
  await L.sleep(800)
  await L.shot(p2, 'QA094-r7')
  L.note('URL: ' + p2.url() + ' | toasts=' + JSON.stringify(await L.toasts(p2)) + ' | "Request failed": ' + (await p2.getByText(/Request failed/).count()) + ' | "Sua sessão expirou" visivel: ' + await p2.getByText('Sua sessão expirou').isVisible().catch(() => false))
  await L.end('QA094-r7')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally {
  L.saveAll('r7-a')
  await browser.close()
}
