// RODADA 8 — monta evidence/<ID>-r8.log: (1) mensagens enviadas ao webhook + linhas cruas do jsonl desse numero
// (OTP mascarado), (2) rede do navegador da SEC-A (/v1/api/agendamentos*) + notas, (3) trecho do log do bot no periodo.
import fs from 'node:fs'
const DIR = 'C:/AmbienteDev/sgsm-front-medico/docs/prd/conflito-agendamento'
const EV = DIR + '/evidence'
const BOTLOG = 'C:/Users/re048720/AppData/Local/Temp/sgsm-plano/bot-qa.log'
const mascOtp = (s) => s.replace(/'(\d{4})(\d{2})'/g, (m, a, b) => "'****" + b + "'").replace(/(verifica[cç][aã]o SGSM: \*)(\d+)(\*)/gi, (m, a, d, b) => a + '*'.repeat(d.length - 2) + d.slice(-2) + b)
const ler = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '')

function botTrecho(numeros, de, ate) {
  return ler(BOTLOG).split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } })
    .filter((j) => j && j['@timestamp'] >= de && j['@timestamp'] <= ate && /whatsapp\.(service|controller|client)/.test(j.log.logger))
    .filter((j) => !/Webhook recusado/.test(j.message) || true)
    .map((j) => `${j['@timestamp']} [BOT ${j.log.level} ${j.log.logger.split('.').pop()}] ${mascOtp(j.message)}`)
}

const itens = [
  { id: 'PREP', wa: ['AUTH', 'CAD'], browser: null, titulo: 'Preparacao do paciente no WhatsApp (login de conta existente e cadastro pelo bot)' },
  { id: 'QA140', wa: ['QA140'], browser: 'QA140-r8-browser' },
  { id: 'QA141', wa: ['QA141'], browser: 'QA141-r8-browser' },
  { id: 'QA142', wa: ['QA142'], browser: 'QA142-r8-browser' },
]
for (const it of itens) {
  const wa = it.wa.map((k) => ler(`${EV}/_wa-r8-${k}.log`)).join('')
  const tsWa = [...wa.matchAll(/^(\d{4}-\d\d-\d\dT[\d:.]+Z)/gm)].map((m) => m[1])
  let out = `# ${it.id}-r8 — ${it.titulo || 'ponta a ponta secretaria x WhatsApp'} — gerado ${new Date().toISOString()}\n`
  out += '# Nenhuma mensagem foi para WhatsApp real: as respostas do bot vao para o receptor local :8099 (evolution-captura.jsonl).\n'
  out += '# Segredo do webhook omitido; codigo OTP mascarado (so os 2 ultimos digitos).\n\n'
  out += '## 1. WhatsApp: mensagens enviadas ao webhook (WA>>) e linhas cruas do evolution-captura.jsonl desse numero (WA<<)\n' + wa + '\n'
  if (it.browser) {
    const b = ler(`${EV}/${it.browser}.log`).split('\n').filter((l) => /\/v1\/api\/agendamentos|\[NOTA\]|PAGEERROR|CONSOLE\.error/.test(l))
    out += `## 2. Navegador da SEC-A: rede /v1/api/agendamentos* + notas + erros de console (completo em ${it.browser}.log)\n` + b.join('\n') + '\n\n'
  }
  if (tsWa.length) {
    const de = tsWa[0].replace(/\.\d+Z$/, ''), ate = new Date(Date.parse(tsWa[tsWa.length - 1]) + 5000).toISOString()
    out += `## 3. Log do ms-whatsapp-bot de QA no periodo (${de} .. ${ate}; OTP mascarado)\n` + botTrecho(null, de, ate).join('\n') + '\n'
  }
  fs.writeFileSync(`${EV}/${it.id}-r8.log`, out)
  console.log(it.id, out.length)
}
