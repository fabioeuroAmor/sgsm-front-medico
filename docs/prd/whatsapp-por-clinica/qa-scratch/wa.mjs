// WhatsApp por clinica — "o paciente fala": POST real no webhook do bot de QA (:8093, NUNCA o :8083), formato
// messages.upsert da Evolution, com "instance" = instancia da clinica (ou "sgsm-bot" = canal geral).
// A resposta do bot vai para o receptor local :8099, que grava em qa-scratch/evolution-captura.jsonl
// (campo "rota" = /message/sendText/{instancia}: por qual numero a resposta saiu). Nada vai para WhatsApp real.
// O segredo vem de process.env.BOT_EVOLUTION_WEBHOOK_SECRET e NUNCA e gravado. Codigos de 6 digitos: so os 2 ultimos.
// Uso CLI: node wa.mjs <numero> <instancia> <logId> "<texto>"   (texto "@OTP" = ultimo codigo recebido nesse numero)
import fs from 'node:fs'
import path from 'node:path'

const DIR = 'C:/AmbienteDev/sgsm-front-medico/docs/prd/whatsapp-por-clinica'
export const JSONL = path.join(DIR, 'qa-scratch/evolution-captura.jsonl')
const ts = () => new Date().toISOString()
const lerLinhas = () => (fs.existsSync(JSONL) ? fs.readFileSync(JSONL, 'utf8').split('\n').filter(Boolean) : [])
const doNumero = (ls, numero) => ls.filter((l) => { try { return JSON.parse(l).corpo?.number === numero } catch { return false } })
export const mascCod = (s) => String(s).replace(/(?<![\w.:\-/])(\d{4})(\d{2})(?![\w])/g, (m, a, b) => '****' + b)

export async function falar(numero, instancia, texto, { logId = 'avulso', espera = 240000, pushName = 'QA WA Paciente' } = {}) {
  const SEGREDO = process.env.BOT_EVOLUTION_WEBHOOK_SECRET
  if (!SEGREDO) throw new Error('BOT_EVOLUTION_WEBHOOK_SECRET ausente')
  const LOG = path.join(DIR, `evidence/_wa-${logId}.log`)
  const linhas = []
  const log = (s) => { const t = mascCod(s).split(SEGREDO).join('***'); fs.appendFileSync(LOG, t + '\n'); linhas.push(t); console.log(t) }
  let origem = ''
  if (texto === '@OTP') {
    const ultimos = doNumero(lerLinhas(), numero).map((l) => JSON.parse(l).corpo.text).reverse()
    const m = ultimos.map((t) => t.match(/\*(\d{6})\*/)).find(Boolean)
    if (!m) throw new Error('nenhum codigo recebido nesse numero')
    texto = m[1]; origem = 'codigo lido no jsonl (chegou por WhatsApp)'
  }
  const textoLog = /^\d{6}$/.test(texto) ? '****' + texto.slice(-2) + ` (${origem || 'codigo'}, mascarado)` : texto
  const antes = lerLinhas().length
  const id = 'QAWA' + Date.now() + Math.floor(Math.random() * 1000)
  const corpo = {
    event: 'messages.upsert', instance: instancia,
    data: { key: { remoteJid: `${numero}@s.whatsapp.net`, fromMe: false, id }, pushName, message: { conversation: texto }, messageTimestamp: String(Math.floor(Date.now() / 1000)) },
  }
  const corpoLog = JSON.parse(JSON.stringify(corpo)); corpoLog.data.message.conversation = textoLog
  const tEnvio = ts()
  const r = await fetch('http://localhost:8093/webhook/evolution', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': SEGREDO }, body: JSON.stringify(corpo) })
  log(`${ts()} [WA>>] POST http://localhost:8093/webhook/evolution (header X-Webhook-Secret: ***omitido***) -> HTTP ${r.status} BODY=${JSON.stringify(corpoLog)}`)
  const t0 = Date.now()
  let novas = []
  while (Date.now() - t0 < espera) {
    await new Promise((s) => setTimeout(s, 1000))
    novas = doNumero(lerLinhas().slice(antes), numero)
    if (novas.length) {
      await new Promise((s) => setTimeout(s, 4000))
      novas = doNumero(lerLinhas().slice(antes), numero)
      break
    }
  }
  if (!novas.length) log(`${ts()} [WA<<] (nenhuma resposta no jsonl para ${numero} em ${espera / 1000}s)`)
  for (const l of novas) log(`${ts()} [WA<< jsonl cru] ${l}`)
  log(`${ts()} [NOTA] tempo ate a resposta: ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  fs.appendFileSync(path.join(DIR, 'qa-scratch/wa-enviadas.jsonl'), JSON.stringify({ quando: tEnvio, numero, instancia, texto: textoLog, http: r.status }) + '\n')
  const respostas = novas.map((l) => { const j = JSON.parse(l); return { rota: j.rota, texto: j.corpo?.text } })
  return { http: r.status, respostas, linhas }
}

if (process.argv[1] && process.argv[1].endsWith('wa.mjs')) {
  const [numero, instancia, logId, ...resto] = process.argv.slice(2)
  await falar(numero, instancia, resto.join(' '), { logId, espera: Number(process.env.WA_ESPERA_MS || 240000) })
}
