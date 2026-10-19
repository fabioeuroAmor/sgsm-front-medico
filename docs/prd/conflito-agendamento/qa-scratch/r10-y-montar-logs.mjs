// RODADA 10 — monta evidence/<ID>-r10.log: (1) mensagens enviadas ao webhook + linhas cruas do jsonl do numero (codigos
// mascarados), (1b) verificacao de UUID nas respostas do bot, (2) rede do navegador da SEC-A (/v1/api/agendamentos*) + notas,
// (3) log do bot no periodo, (4) log do sgsm-ia de QA (:8092, WhatsAppService) no periodo, (5) WARN/ERROR do sgsm de QA.
import fs from 'node:fs'
const DIR = 'C:/AmbienteDev/sgsm-front-medico/docs/prd/conflito-agendamento'
const EV = DIR + '/evidence'
const TMP = 'C:/Users/re048720/AppData/Local/Temp/sgsm-plano'
const masc = (s) => s.replace(/(?<![\w.:-])(\d{4})(\d{2})(?![\w-])/g, (m, a, b) => '****' + b)
const ler = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '')
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
function trecho(arq, de, ate, filtro) {
  return ler(arq).split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } })
    .filter((j) => j && j['@timestamp'] >= de && j['@timestamp'] <= ate && filtro(j))
    .map((j) => `${j['@timestamp']} [${j.service?.name} ${j.log.level} ${j.log.logger.split('.').pop()}] ${masc(j.message)}${j.error ? ' | error.type=' + j.error.type + ' | error.message=' + String(j.error.message || '').slice(0, 200) : ''}`)
}
const itens = [
  { id: 'LOGIN', wa: ['LOGIN'], titulo: 'login do paciente pelo WhatsApp (fluxo do QA143) usado no QA140-142' },
  { id: 'QA140', wa: ['QA140'], browser: 'QA140-r10-browser' },
  { id: 'QA141', wa: ['QA141'], browser: 'QA141-r10-browser' },
  { id: 'QA142', wa: ['QA142'], browser: 'QA142-r10-browser' },
]
for (const it of itens) {
  const wa = it.wa.map((k) => ler(`${EV}/_wa-r10-${k}.log`)).join('')
  const tsWa = [...wa.matchAll(/^(\d{4}-\d\d-\d\dT[\d:.]+Z?)/gm)].map((m) => m[1].replace(/Z?$/, 'Z'))
  let out = `# ${it.id}-r10 — ${it.titulo || 'ponta a ponta secretaria x WhatsApp'} — gerado ${new Date().toISOString()}\n`
  out += '# Nenhuma mensagem foi para WhatsApp real: as respostas do bot vao para o receptor local :8099 (evolution-captura.jsonl).\n'
  out += '# Segredo do webhook omitido; codigos (OTP/login) mascarados: so os 2 ultimos digitos.\n\n'
  out += '## 1. WhatsApp: mensagens enviadas ao webhook (WA>>) e linhas cruas do evolution-captura.jsonl desse numero (WA<<)\n' + wa + '\n'
  const respostas = wa.split('\n').filter((l) => l.includes('[WA<< jsonl cru]')).map((l) => { try { return JSON.parse(l.split('[WA<< jsonl cru] ')[1]).corpo.text } catch { return '' } })
  const comUuid = respostas.filter((t) => UUID.test(t))
  out += `## 1b. Respostas do bot ao paciente com UUID: ${comUuid.length} de ${respostas.length}${comUuid.length ? ' -> ' + JSON.stringify(comUuid) : ''}\n\n`
  if (it.browser) {
    const b = ler(`${EV}/${it.browser}.log`).split('\n').filter((l) => /\/v1\/api\/agendamentos|\[NOTA\]|PAGEERROR|CONSOLE\.error/.test(l))
    out += `## 2. Navegador da SEC-A: rede /v1/api/agendamentos* + notas + erros de console (completo em ${it.browser}.log)\n` + b.join('\n') + '\n\n'
  }
  if (tsWa.length) {
    const sorted = tsWa.sort()
    const de = new Date(Date.parse(sorted[0]) - 2000).toISOString(), ate = new Date(Date.parse(sorted[sorted.length - 1]) + 5000).toISOString()
    out += `## 3. Log do ms-whatsapp-bot de QA (:8093, bot-qa.log) no periodo ${de} .. ${ate} (pacotes br.com.sgsm.whatsapp)\n`
    out += trecho(`${TMP}/bot-qa.log`, de, ate, (j) => /br\.com\.sgsm\.whatsapp/.test(j.log.logger)).join('\n') + '\n\n'
    out += `## 4. Log do sgsm-ia de QA (:8092, ia-qa.log) no periodo — prova de que o bot chama o :8092; classificacao crua do LLM (o prompt/contexto em si nao e logado)\n`
    out += trecho(`${TMP}/ia-qa.log`, de, ate, (j) => /WhatsApp|RagAutorizacao|Sanitiza/.test(j.log.logger) || ['WARN', 'ERROR'].includes(j.log.level)).join('\n') + '\n\n'
    const s = trecho(`${TMP}/sgsm-qa.log`, de, ate, (j) => ['WARN', 'ERROR'].includes(j.log.level))
    out += `## 5. Log do sgsm de QA (:8095, sgsm-qa.log) no periodo, WARN/ERROR: ${s.length} linha(s)\n` + s.join('\n') + '\n'
  }
  fs.writeFileSync(`${EV}/${it.id}-r10.log`, out)
  console.log(it.id, out.length, 'uuid em respostas:', comUuid.length, '/', respostas.length)
}
