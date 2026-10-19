// RODADA 5 — QA095 revisto (/registrar so de paciente; aviso do medico; API com MEDICO -> 400) + QA110 (F5 e "Voltar ao cadastro")
import * as L from './lib5.mjs'
import * as C from './r5-common.mjs'
const browser = await L.launch()
try {
  const S = await L.newSession(browser, 'ANON-095')
  const p = S.page
  L.start('QA095-r5')
  await p.goto(L.BASE + '/registrar')
  await p.getByRole('button', { name: 'Criar conta' }).waitFor()
  L.note('contexto limpo: refresh_token=' + ((await p.evaluate(() => localStorage.getItem('refresh_token'))) === null ? 'ausente' : 'presente') + ' | cookies=' + (await S.ctx.cookies()).length)
  const botoesPerfil = { Paciente: await p.getByRole('button', { name: 'Paciente', exact: true }).count(), Medico: await p.getByRole('button', { name: 'Médico', exact: true }).count() }
  const campos = {
    CRM: await p.getByLabel(/CRM/).count(), UF: await p.getByLabel(/UF/).count(), Especialidade: await p.getByLabel(/Especialidade/).count(),
    textoCRM: await p.getByText(/CRM/).count(), textoEspecialidade: await p.getByText(/Especialidade/i).count(),
  }
  const aviso = p.getByText(/É médico\? Seu acesso é criado pela clínica/)
  L.note(`seletor de perfil: botoes Paciente=${botoesPerfil.Paciente} Médico=${botoesPerfil.Medico} | campos/textos de medico: ${JSON.stringify(campos)} | aviso visivel=${await aviso.isVisible()} | texto do aviso=${JSON.stringify(await aviso.innerText().catch(() => ''))}`)
  L.note(`labels do formulario: ${JSON.stringify(await p.locator('form label').allInnerTexts())}`)
  await L.shot(p, 'QA095-r5-a-registrar-sem-seletor')
  const B = C.novoPaciente('B')
  await C.preencherPaciente(p, B)
  await L.shot(p, 'QA095-r5-b-paciente-form')
  const i0 = await C.criarConta(p)
  await L.sleep(800)
  await L.shot(p, 'QA095-r5-c-ative-sua-conta')
  const texto = await p.locator('form[aria-label="Ativar conta"]').innerText().catch(() => '(form de ativacao ausente)')
  L.note(`[Paciente] url=${p.url()} | heading "Ative sua conta"=${await p.getByRole('heading', { name: 'Ative sua conta' }).isVisible().catch(() => false)} | e-mail na tela=${texto.includes(B.email)} | toasts=${JSON.stringify(await L.toasts(p))}`)
  L.note(`[Paciente] respostas /v1: ${JSON.stringify(L.respostas(i0))}`)
  C.contarPublico(i0, 'QA095-paciente-B')
  C.r5.pacientes.push({ ...B, origem: 'QA095 (/registrar)', status: 'pendente' }); C.save()

  // API: auto-cadastro publico com MEDICO (no mesmo navegador anonimo, via fetch -> proxy do front -> auth de QA)
  const emailApi = `qa.conflito.med.r5.api.${Date.now()}@teste.com`
  const j0 = L.LINES.length
  const r = await p.evaluate(async (email) => {
    const resp = await fetch('/v1/api/auth/registrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, senha: 'QaRodada5#Api', tipoPerfil: 'MEDICO' }) })
    return { status: resp.status, body: await resp.text() }
  }, emailApi)
  await L.sleep(500)
  L.note(`[API] POST /v1/api/auth/registrar tipoPerfil=MEDICO email=${emailApi} -> ${r.status} | corpo=${r.body}`)
  C.r5.apiMedicoTentado = { email: emailApi, status: r.status }; C.save()
  await L.end('QA095-r5', 'contexto anonimo novo')

  // ── QA110 ──
  L.start('QA110-r5')
  const urlAntes = p.url()
  await p.reload()
  await p.getByRole('heading', { name: 'Ative sua conta' }).waitFor({ timeout: 15000 }).catch(() => {})
  const texto2 = await p.locator('form[aria-label="Ativar conta"]').innerText().catch(() => '(form de ativacao ausente)')
  L.note(`[F5] url antes=${urlAntes} | url depois=${p.url()} | heading=${await p.getByRole('heading', { name: 'Ative sua conta' }).isVisible().catch(() => false)} | mesmo e-mail na tela=${texto2.includes(B.email)}`)
  await L.shot(p, 'QA110-r5-a-apos-F5')
  await p.getByRole('button', { name: 'Voltar ao cadastro' }).click()
  await L.sleep(1200)
  L.note(`[Voltar] url=${p.url()} | contem "ativar"=${p.url().includes('ativar')} | botao "Criar conta" visivel=${await p.getByRole('button', { name: 'Criar conta' }).isVisible()} | heading ativacao visivel=${await p.getByRole('heading', { name: 'Ative sua conta' }).isVisible().catch(() => false)} | campo Nome vazio=${(await p.getByLabel('Nome completo').inputValue()) === ''}`)
  await L.shot(p, 'QA110-r5-b-voltar-ao-cadastro')
  await L.end('QA110-r5', `conta B (${B.email}) pendente`)
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally {
  L.saveAll('r5-a')
  await browser.close()
}
