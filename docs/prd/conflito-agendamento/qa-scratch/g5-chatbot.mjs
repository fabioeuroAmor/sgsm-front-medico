// QA070-QA074, QA080 (parte chatbot), QA093
import fs from 'node:fs'
import * as L from './lib.mjs'
const contas = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const browser = await L.launch()
const A = await L.newSession(browser, 'SEC-A')
const pa = A.page
const isReservaPost = (r) => r.url().endsWith('/agendamentos/reservas') && r.request().method() === 'POST'
const panel = () => pa.locator('div.fixed.bottom-24.right-6')
const msgs = async () => (await panel().locator('div.whitespace-pre-line').allTextContents())
const ultimas = async (n = 3) => (await msgs()).slice(-n)
const escolher = (re) => panel().getByRole('button', { name: re }).first().click()
const digitar = async (txt) => { const i = panel().locator('input'); await i.click(); await i.pressSequentially(txt, { delay: 30 }); await i.press('Enter') }
const choices = async () => panel().locator('div.max-h-36 button').allTextContents()
const contar = (i0, re) => L.LINES.slice(i0).filter((l) => re.test(l)).length

await L.login(pa, contas.A.email, contas.A.senha)
await L.irAgendamentos(pa)
await pa.getByRole('button', { name: 'Assistente virtual' }).click()
await panel().waitFor()

async function ateData(diaTxt = '21/10/2026') {
  await escolher(/Agendar uma consulta/)
  await panel().locator('input').waitFor()
  await digitar('94523179456')
  await panel().getByText(/Qual serviço você deseja agendar/).last().waitFor()
  const ops = await choices()
  L.note('servicos no chatbot: ' + JSON.stringify(ops))
  await escolher(/QA Descartavel/)
  await panel().getByText('Em qual estabelecimento deseja ser atendido(a)?').last().waitFor()
  L.note('estabelecimentos: ' + JSON.stringify(await choices()))
  await escolher(/Clinica São Lucas/)
  await panel().getByText('Qual data você deseja agendar? (DD/MM/AAAA)').last().waitFor()
  if (diaTxt) {
    await digitar(diaTxt)
  }
}

// QA070
L.start('QA070')
await ateData()
await panel().getByText('Escolha o horário desejado:').last().waitFor()
L.note('horarios no chatbot: ' + JSON.stringify(await choices()))
let w = pa.waitForResponse(isReservaPost)
await escolher(/^\s*\d+\.\s*14:30$/)
const r70 = await w
L.note(`POST reservas -> ${r70.status()} body=${await r70.text()}`)
await panel().getByText(/Horário reservado para você por alguns minutos/).last().waitFor()
L.note('bot: ' + JSON.stringify(await ultimas(2)))
await L.shot(pa, 'QA070')
await L.end('QA070')

// QA071
L.start('QA071')
await panel().locator('input').press('Enter')
await panel().getByText('Confirme o agendamento:', { exact: false }).last().waitFor()
await L.shot(pa, 'QA071-a-resumo')
w = pa.waitForResponse((r) => r.url().endsWith('/v1/api/agendamentos') && r.request().method() === 'POST')
await escolher(/Sim, confirmar/)
const r71 = await w
L.note(`POST agendamentos -> ${r71.status()} requestBody=${r71.request().postData()}`)
await panel().getByText(/Agendamento realizado com sucesso/).last().waitFor()
L.note('bot: ' + JSON.stringify(await ultimas(1)))
await L.shot(pa, 'QA071-b-sucesso')
await L.end('QA071')

// QA073 — cancelar apos reservar
L.start('QA073')
await panel().getByRole('button', { name: 'reiniciar' }).click()
await ateData()
await panel().getByText('Escolha o horário desejado:').last().waitFor()
w = pa.waitForResponse(isReservaPost)
await escolher(/^\s*\d+\.\s*15:00$/)
L.note('POST reservas 15:00 -> ' + (await w).status())
await panel().getByText(/Horário reservado para você por alguns minutos/).last().waitFor()
await panel().locator('input').press('Enter')
await panel().getByText('Confirme o agendamento:', { exact: false }).last().waitFor()
const d73 = pa.waitForResponse((r) => r.request().method() === 'DELETE' && r.url().includes('/reservas/'))
await escolher(/Não, cancelar/)
const rd = await d73
L.note(`DELETE ${rd.url()} -> ${rd.status()}`)
L.note('bot: ' + JSON.stringify(await ultimas(1)))
await L.shot(pa, 'QA073')
await L.end('QA073')

// QA072 — chatbot com lista desatualizada; SEC-B reserva 15:30 antes
L.start('QA072')
await panel().getByRole('button', { name: 'reiniciar' }).click()
await ateData()
await panel().getByText('Escolha o horário desejado:').last().waitFor()
L.note('lista do chatbot (SEC-A) antes de SEC-B reservar: ' + JSON.stringify(await choices()))
await L.shot(pa, 'QA072-a-lista-SEC-A')
const B = await L.newSession(browser, 'SEC-B')
const pb = B.page
await L.login(pb, contas.B.email, contas.B.senha)
await L.irAgendamentos(pb)
await L.wizardAte4(pb)
w = pb.waitForResponse(isReservaPost)
await L.slotBtn(pb, '15:30').click()
L.note('SEC-B POST reservas 15:30 -> ' + (await w).status())
await L.faixaReserva(pb).waitFor()
await L.shot(pb, 'QA072-b-SEC-B-reservou')
await pa.bringToFront()
w = pa.waitForResponse(isReservaPost)
await escolher(/^\s*\d+\.\s*15:30$/)
const r72 = await w
L.note(`SEC-A chatbot POST 15:30 -> ${r72.status()} body=${await r72.text()}`)
await panel().getByText(/Esse horário acabou de ser ocupado/).last().waitFor()
L.note('bot: ' + JSON.stringify(await ultimas(1)) + ' opcoes: ' + JSON.stringify(await choices()))
await L.shot(pa, 'QA072-c-409-alternativas')
w = pa.waitForResponse(isReservaPost)
await panel().locator('div.max-h-36 button').first().click()
const r72b = await w
L.note(`alternativa -> POST ${r72b.status()} requestBody=${r72b.request().postData()}`)
await panel().getByText(/Horário reservado para você por alguns minutos/).last().waitFor()
await L.shot(pa, 'QA072-d-alternativa-reservada')
// libera a reserva da alternativa
await panel().locator('input').press('Enter')
await panel().getByText('Confirme o agendamento:', { exact: false }).last().waitFor()
const d72 = pa.waitForResponse((r) => r.request().method() === 'DELETE' && r.url().includes('/reservas/'))
await escolher(/Não, cancelar/)
L.note('liberacao da alternativa: DELETE -> ' + (await d72).status())
await L.end('QA072')
await L.fecharModal(pb) // SEC-B libera 15:30
await L.sleep(1000)
await B.ctx.close()

// QA074 — datas invalidas
L.start('QA074')
await panel().getByRole('button', { name: 'reiniciar' }).click()
await ateData(null)
let i0 = L.LINES.length
await digitar('32/13/2026')
await L.sleep(800)
L.note('apos "32/13/2026": ' + JSON.stringify(await ultimas(1)))
const inp = panel().locator('input')
await inp.click(); await inp.pressSequentially('abc', { delay: 50 })
L.note('valor do campo apos digitar "abc" (mascara so aceita digitos): ' + JSON.stringify(await inp.inputValue()))
await inp.press('Enter')
await L.sleep(800)
L.note('apos "abc"+Enter: ' + JSON.stringify(await ultimas(1)))
await inp.press('Enter')
await L.sleep(800)
L.note('apos vazio+Enter: ' + JSON.stringify(await ultimas(1)))
L.note('chamadas /v1/api durante as datas invalidas: ' + contar(i0, />> (GET|POST) .*\/v1\/api/))
L.note('todas as mensagens do bot (ultimas 4): ' + JSON.stringify(await ultimas(4)))
await L.shot(pa, 'QA074')
await L.end('QA074')

// QA080 parte chatbot — domingo 25/10/2026
L.start('QA080-chatbot')
i0 = L.LINES.length
await digitar('25/10/2026')
await panel().getByText(/Sem horários disponíveis nesta data/).last().waitFor({ timeout: 10000 }).catch(() => {})
L.note('bot: ' + JSON.stringify(await ultimas(1)) + ' | POST reservas=' + contar(i0, />> POST .*reservas/))
await L.shot(pa, 'QA080-b-chatbot')
await L.end('QA080-chatbot')

// QA093 — cadastro de paciente ate o consentimento
L.start('QA093')
await panel().getByRole('button', { name: 'reiniciar' }).click()
await escolher(/Cadastrar-me como paciente/)
await digitar('Paciente QA Conflito Nao Concluir')
await digitar('52998224725')
await digitar('10/05/1990')
await digitar('paciente.qa.naoconcluir@teste.com')
await panel().locator('input').press('Enter')
await panel().getByText(/preciso do seu consentimento/).last().waitFor()
L.note('bot: ' + JSON.stringify(await ultimas(1)) + ' opcoes: ' + JSON.stringify(await choices()))
await L.shot(pa, 'QA093')
await L.end('QA093', 'fluxo parado na etapa de consentimento (nao concluido)')
await panel().getByRole('button', { name: 'reiniciar' }).click()
await L.sleep(1000)
L.saveAll('g5')
await browser.close()
