// RODADA 4 — QA095 revisto (Medico como na r3; Paciente agora deve ir para "Ative sua conta") + QA110 (F5 e "Voltar ao cadastro")
import * as L from './lib4.mjs'
import * as C from './r4-common.mjs'
const browser = await L.launch()
const S = await L.newSession(browser, 'ANON-095')
const p = S.page

L.start('QA095-r4')
const stamp = Date.now()
await p.goto(L.BASE + '/registrar')
L.note('contexto limpo: refresh_token=' + ((await p.evaluate(() => localStorage.getItem('refresh_token'))) === null ? 'ausente' : 'presente') + ' | cookies=' + (await S.ctx.cookies()).length)
// parte Medico
const nomeMed = `QA Medico R4 ${String(stamp).slice(-6)}`
const emailMed = `qa.conflito.med.r4.${stamp}@teste.com`
await p.getByRole('button', { name: 'Médico', exact: true }).click()
await p.getByLabel('Nome completo').fill(nomeMed)
await p.getByLabel('CRM', { exact: true }).fill(String(stamp).slice(-6))
await p.getByLabel('Especialidade').selectOption('Cardiologia')
await p.getByLabel('E-mail').fill(emailMed)
await p.getByLabel('Senha', { exact: true }).fill(C.SENHA)
await p.getByLabel('Confirmar senha').fill(C.SENHA)
await L.shot(p, 'QA095-r4-a-medico-form')
let i0 = L.LINES.length
await p.getByRole('button', { name: 'Criar conta' }).click()
await p.locator('[data-sonner-toast]').first().waitFor({ timeout: 15000 }).catch(() => {})
await L.sleep(2500)
await L.shot(p, 'QA095-r4-b-medico-resultado')
L.note(`[Medico] url=${p.url()} | toasts=${JSON.stringify(await C.toasts(p))} | "Sua sessão expirou" visivel=${await p.getByText('Sua sessão expirou').isVisible().catch(() => false)} | NAVIGATED=${JSON.stringify(L.LINES.slice(i0).filter((l) => l.includes('NAVIGATED')))}`)
L.note(`[Medico] respostas /v1: ${JSON.stringify(C.respostas(i0))}`)
C.r4.medicoTentado = { nome: nomeMed, email: emailMed }
C.save()

// parte Paciente (mesma aba)
await C.esperarToastsSumirem(p)
const B = C.novoPaciente('B')
await C.preencherPaciente(p, B)
await L.shot(p, 'QA095-r4-c-paciente-form')
i0 = await C.criarConta(p, 'QA095 Paciente')
await L.sleep(1000)
await L.shot(p, 'QA095-r4-d-paciente-ative-sua-conta')
const titulo = await p.getByRole('heading', { name: 'Ative sua conta' }).isVisible().catch(() => false)
const texto = await p.locator('form[aria-label="Ativar conta"]').innerText().catch(() => '(form de ativacao ausente)')
L.note(`[Paciente] url=${p.url()} | heading "Ative sua conta"=${titulo} | texto=${JSON.stringify(texto.replace(/\n/g, ' | '))} | e-mail na tela=${texto.includes(B.email)} | toasts=${JSON.stringify(await C.toasts(p))}`)
L.note(`[Paciente] respostas /v1: ${JSON.stringify(C.respostas(i0))}`)
C.contarPublico(i0, 'QA095-paciente-B')
C.r4.pacientes.push({ ...B, origem: 'QA095 (/registrar)', status: 'pendente' })
C.save()
await L.end('QA095-r4', 'contexto anonimo novo; Medico e depois Paciente na mesma aba')

// QA110 — F5 na etapa do codigo, depois "Voltar ao cadastro"
L.start('QA110-r4')
const urlAntes = p.url()
await p.reload()
await p.getByRole('heading', { name: 'Ative sua conta' }).waitFor({ timeout: 15000 }).catch(() => {})
const texto2 = await p.locator('form[aria-label="Ativar conta"]').innerText().catch(() => '(form de ativacao ausente)')
L.note(`[F5] url antes=${urlAntes} | url depois=${p.url()} | heading=${await p.getByRole('heading', { name: 'Ative sua conta' }).isVisible().catch(() => false)} | mesmo e-mail na tela=${texto2.includes(B.email)}`)
await L.shot(p, 'QA110-r4-a-apos-F5')
await p.getByRole('button', { name: 'Voltar ao cadastro' }).click()
await L.sleep(1200)
L.note(`[Voltar] url=${p.url()} | contem "ativar"=${p.url().includes('ativar')} | botao "Criar conta" visivel=${await p.getByRole('button', { name: 'Criar conta' }).isVisible()} | heading ativacao visivel=${await p.getByRole('heading', { name: 'Ative sua conta' }).isVisible().catch(() => false)}`)
await L.shot(p, 'QA110-r4-b-voltar-ao-cadastro')
await L.end('QA110-r4', `conta B (${B.email}) pendente; sem chamadas de rede esperadas alem do carregamento`)
L.saveAll('r4-a')
await browser.close()
