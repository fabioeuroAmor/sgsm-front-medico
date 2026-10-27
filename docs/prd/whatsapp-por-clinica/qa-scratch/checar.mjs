// Junta no evidence/<ID>.log: mensagens enviadas/recebidas do item (evidence/_wa-<ID>.log), leituras cruas de Redis e banco
// e as linhas do bot-qa.log (bot de QA :8093) e do sgsm.log desde <desde>. Sem segredo (mask) e codigos com 2 ultimos digitos.
// Uso: node checar.mjs <ID> <desdeIso> '<json: {"redis":["..."],"sql":["..."],"nota":"..."}>'
import fs from 'node:fs'
import path from 'node:path'
import * as L from './lib.mjs'
import { mascCod } from './wa.mjs'
const [ID, desde, cfgTxt] = process.argv.slice(2)
const cfg = cfgTxt ? JSON.parse(cfgTxt) : {}
L.start(ID)
if (cfg.nota) L.note(cfg.nota)
const wa = path.join(L.EVID, `_wa-${ID}.log`)
L.LINES.push(`# --- (1) conversa: mensagens enviadas ao webhook do bot de QA e respostas cruas do receptor :8099 (${path.basename(wa)}) ---`)
if (fs.existsSync(wa)) L.LINES.push(fs.readFileSync(wa, 'utf8').trimEnd())
L.LINES.push('# --- (2) leituras cruas (Redis / Postgres) feitas pelo QA depois da conversa ---')
for (const r of cfg.redis || []) L.redis(r)
for (const q of cfg.sql || []) L.sql(q)
L.LINES.push('# --- (3) bot-qa.log (ms-whatsapp-bot de QA, :8093) no periodo ---')
L.logServico('bot-qa.log', desde, cfg.filtroBot ? new RegExp(cfg.filtroBot) : /WARN|ERROR|INFO.*(br\.com\.sgsm)|Webhook|instância|clínica|Canal/, { max: 80, rotulo: 'bot-qa.log' })
L.LINES.push('# --- (4) sgsm.log no periodo (WARN/ERROR e endpoints internos do WhatsApp) ---')
L.logServico('sgsm.log', desde, cfg.filtroSgsm ? new RegExp(cfg.filtroSgsm) : /"level":"(WARN|ERROR)"|interno\/whatsapp|Canal WhatsApp|consentimento|paciente_estabelecimento/, { max: 40, rotulo: 'sgsm.log' })
if (cfg.ia) { L.LINES.push('# --- (5) sgsm-ia.log (classificacao do WhatsApp: mensagem e resposta bruta do LLM) ---'); L.logServico('sgsm-ia.log', desde, /WhatsApp|WARN|ERROR/, { max: 60, rotulo: 'sgsm-ia.log' }) }
for (let i = 0; i < L.LINES.length; i++) L.LINES[i] = mascCod(L.LINES[i])
await L.end(ID, cfg.titulo || '')
console.log(fs.readFileSync(path.join(L.EVID, `${ID}.log`), 'utf8').split('\n').filter((l) => /\[(REDIS|SQL)\]/.test(l) || /^\s*[\w-]+\s+\|/.test(l) || /^\(\d+ rows?\)/.test(l) || /^[0-9a-f-]{36}|^\s/.test(l)).slice(0, 80).join('\n'))
