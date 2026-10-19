// RODADA 9 — monta evidence/<ID>-r9.log: (1) mensagens enviadas ao webhook + linhas cruas do jsonl do numero (codigos
// mascarados), (2) rede do navegador da SEC-A (/v1/api/agendamentos*) + notas, (3) trecho do log do bot no periodo,
// (4) trecho do log do auth / sgsm de QA no periodo (quando houver erro ou for o fluxo do item).
import fs from 'node:fs'
const DIR = 'C:/AmbienteDev/sgsm-front-medico/docs/prd/conflito-agendamento'
const EV = DIR + '/evidence'
const TMP = 'C:/Users/re048720/AppData/Local/Temp/sgsm-plano'
const masc = (s) => s.replace(/(?<![\w.:-])(\d{4})(\d{2})(?![\w-])/g, (m, a, b) => '****' + b)
const ler = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '')
function trecho(arq, de, ate, filtro) {
  return ler(arq).split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } })
    .filter((j) => j && j['@timestamp'] >= de && j['@timestamp'] <= ate && filtro(j))
    .map((j) => `${j['@timestamp']} [${j.service?.name} ${j.log.level} ${j.log.logger.split('.').pop()}] ${masc(j.message)}${j.error ? ' | error.type=' + j.error.type + ' | error.message=' + String(j.error.message || '').slice(0, 200) : ''}`)
}
const itens = [
  { id: 'QA143', wa: ['QA143', 'QA143-semconta', 'QA143-endpoint'], auth: true },
  { id: 'QA140', wa: ['QA140'], browser: 'QA140-r9-browser', sgsm: true },
  { id: 'QA141', wa: ['QA141'], browser: 'QA141-r9-browser', sgsm: true },
  { id: 'QA142', wa: ['QA142'], browser: 'QA142-r9-browser', sgsm: true },
  { id: 'CAD', wa: ['CAD'], titulo: 'Cadastro pelo bot com nascimento DD/MM/AAAA (verificacao da correcao)' },
]
for (const it of itens) {
  const wa = it.wa.map((k) => ler(`${EV}/_wa-r9-${k}.log`)).join('')
  const tsWa = [...wa.matchAll(/^(\d{4}-\d\d-\d\dT[\d:.]+Z?)/gm)].map((m) => m[1].replace(/Z?$/, 'Z'))
  let out = `# ${it.id}-r9 — ${it.titulo || 'ponta a ponta secretaria x WhatsApp'} — gerado ${new Date().toISOString()}\n`
  out += '# Nenhuma mensagem foi para WhatsApp real: as respostas do bot vao para o receptor local :8099 (evolution-captura.jsonl).\n'
  out += '# Segredo do webhook omitido; codigos (OTP/login) mascarados: so os 2 ultimos digitos.\n\n'
  out += '## 1. WhatsApp: mensagens enviadas ao webhook (WA>>) e linhas cruas do evolution-captura.jsonl desse numero (WA<<)\n' + wa + '\n'
  if (it.browser) {
    const b = ler(`${EV}/${it.browser}.log`).split('\n').filter((l) => /\/v1\/api\/agendamentos|\[NOTA\]|PAGEERROR|CONSOLE\.error/.test(l))
    out += `## 2. Navegador da SEC-A: rede /v1/api/agendamentos* + notas + erros de console (completo em ${it.browser}.log)\n` + b.join('\n') + '\n\n'
  }
  if (tsWa.length) {
    const sorted = tsWa.sort()
    const de = sorted[0].replace(/\.\d+Z$/, ''), ate = new Date(Date.parse(sorted[sorted.length - 1]) + 5000).toISOString()
    out += `## 3. Log do ms-whatsapp-bot de QA (bot-qa.log) no periodo ${de} .. ${ate} (todas as linhas dos pacotes br.com.sgsm.whatsapp)\n`
    out += trecho(`${TMP}/bot-qa.log`, de, ate, (j) => /br\.com\.sgsm\.whatsapp/.test(j.log.logger)).join('\n') + '\n\n'
    if (it.auth) out += `## 4. Log do auth de QA (auth-qa.log) no periodo, linhas br.com.sgsm.auth (INFO+)\n` + trecho(`${TMP}/auth-qa.log`, de, ate, (j) => /br\.com\.sgsm\.auth/.test(j.log.logger)).join('\n') + '\n\n'
    if (it.sgsm) {
      const s = trecho(`${TMP}/sgsm-qa.log`, de, ate, (j) => ['WARN', 'ERROR'].includes(j.log.level))
      out += `## 4. Log do sgsm de QA (sgsm-qa.log) no periodo, WARN/ERROR: ${s.length} linha(s)\n` + s.join('\n') + '\n'
    }
  }
  fs.writeFileSync(`${EV}/${it.id}-r9.log`, out)
  console.log(it.id, out.length)
}
