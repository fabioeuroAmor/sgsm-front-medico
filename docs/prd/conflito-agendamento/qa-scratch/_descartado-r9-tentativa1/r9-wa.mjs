// RODADA 9 — "paciente fala pelo WhatsApp": POST real no webhook do bot de QA (:8093) e espera a resposta
// no evolution-captura.jsonl (receptor local no lugar da Evolution; nenhuma mensagem vai para WhatsApp real).
// Uso: node r9-wa.mjs <numero> <logId> "<texto>"   (texto "@OTP" = envia o ultimo codigo recebido nesse numero)
// O segredo vem de process.env.BOT_EVOLUTION_WEBHOOK_SECRET (set -a; . /c/AmbienteDev/.env) e NUNCA e gravado.
// Grava em evidence/_wa-r9-<logId>.log: mensagem enviada (sem segredo) e linhas cruas do jsonl desse numero (OTP mascarado).
import fs from 'node:fs'
import path from 'node:path'

const [numero, logId, ...resto] = process.argv.slice(2)
let texto = resto.join(' ')
const DIR = 'C:/AmbienteDev/sgsm-front-medico/docs/prd/conflito-agendamento'
const JSONL = path.join(DIR, 'qa-scratch/evolution-captura.jsonl')
const LOG = path.join(DIR, `evidence/_wa-r9-${logId}.log`)
const SEGREDO = process.env.BOT_EVOLUTION_WEBHOOK_SECRET
if (!SEGREDO) { console.error('BOT_EVOLUTION_WEBHOOK_SECRET ausente'); process.exit(2) }
const espera = Number(process.env.WA_ESPERA_MS || 240000)

const ts = () => new Date().toISOString()
const lerLinhas = () => (fs.existsSync(JSONL) ? fs.readFileSync(JSONL, 'utf8').split('\n').filter(Boolean) : [])
const doNumero = (ls) => ls.filter((l) => { try { return JSON.parse(l).corpo?.number === numero } catch { return false } })
// mascara o codigo OTP (so os 2 ultimos digitos) em qualquer texto
const mascOtp = (s) => s.replace(/(c[oó]digo de verifica[cç][aã]o SGSM: \*)(\d+)(\*)/gi, (m, a, d, b) => a + '*'.repeat(d.length - 2) + d.slice(-2) + b)
const log = (s) => { fs.appendFileSync(LOG, s + '\n'); console.log(s) }

if (texto === '@OTP') {
  const ultimos = doNumero(lerLinhas()).map((l) => JSON.parse(l).corpo.text).reverse()
  const m = ultimos.map((t) => t.match(/verifica[cç][aã]o SGSM: \*(\d+)\*/i)).find(Boolean)
  if (!m) { console.error('nenhum OTP recebido nesse numero'); process.exit(3) }
  texto = m[1]
}
const textoLog = /^\d{6}$/.test(texto) ? '****' + texto.slice(-2) + ' (codigo OTP lido no jsonl, mascarado)' : texto

const antes = lerLinhas().length
const id = 'QAR9' + Date.now() + Math.floor(Math.random() * 1000)
const corpo = {
  event: 'messages.upsert', instance: 'sgsm-bot',
  data: { key: { remoteJid: `${numero}@s.whatsapp.net`, fromMe: false, id }, pushName: 'QA Paciente WhatsApp', message: { conversation: texto }, messageTimestamp: String(Math.floor(Date.now() / 1000)) },
}
const corpoLog = JSON.parse(JSON.stringify(corpo)); corpoLog.data.message.conversation = textoLog
const r = await fetch('http://localhost:8093/webhook/evolution', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': SEGREDO }, body: JSON.stringify(corpo) })
log(`${ts()} [WA>>] POST http://localhost:8093/webhook/evolution (header X-Webhook-Secret: ***omitido***) -> HTTP ${r.status} BODY=${JSON.stringify(corpoLog)}`)

const t0 = Date.now()
let novas = []
while (Date.now() - t0 < espera) {
  await new Promise((s) => setTimeout(s, 1000))
  novas = doNumero(lerLinhas().slice(antes))
  if (novas.length) {
    // espera um pouco mais por mensagens seguidas (ex.: OTP + texto)
    await new Promise((s) => setTimeout(s, 4000))
    novas = doNumero(lerLinhas().slice(antes))
    break
  }
}
if (!novas.length) log(`${ts()} [WA<<] (nenhuma resposta no jsonl para ${numero} em ${espera / 1000}s)`)
for (const l of novas) log(`${ts()} [WA<< jsonl cru] ${mascOtp(l)}`)
log(`${ts()} [NOTA] tempo ate a resposta: ${((Date.now() - t0) / 1000).toFixed(1)}s`)
