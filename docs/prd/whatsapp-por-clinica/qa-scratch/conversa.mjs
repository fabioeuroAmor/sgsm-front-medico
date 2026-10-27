// Prova visual de uma conversa do bot de QA: monta uma pagina local SO com o que foi capturado
// (qa-scratch/wa-enviadas.jsonl = o que o "paciente" mandou ao webhook; qa-scratch/evolution-captura.jsonl = respostas cruas
// do bot, com a rota /message/sendText/{instancia} = por qual numero saiu). Abre no Chromium visivel e salva o print.
// Uso: node conversa.mjs <nomePng> <numero> <desdeIso> "<titulo>"
import fs from 'node:fs'
import path from 'node:path'
import * as L from './lib.mjs'
import { mascCod, JSONL } from './wa.mjs'
const [png, numero, desde, titulo] = process.argv.slice(2)
const ler = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [])
const ev = []
for (const e of ler(new URL('./wa-enviadas.jsonl', import.meta.url))) if (e.numero === numero && e.quando >= desde) ev.push({ t: e.quando, lado: 'pac', texto: e.texto, meta: `para a instancia "${e.instancia}" · webhook HTTP ${e.http}` })
for (const j of ler(JSONL)) if (j.corpo?.number === numero && j.quando.replace('+00:00', 'Z') >= desde) ev.push({ t: j.quando.replace('+00:00', 'Z'), lado: 'bot', texto: mascCod(j.corpo.text || ''), meta: `saiu por ${j.rota}` })
ev.sort((a, b) => a.t.localeCompare(b.t))
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;font-family:Segoe UI,Arial;background:#d1d7db}.app{width:900px;margin:0 auto;background:#efeae2;min-height:100vh}
.top{background:#008069;color:#fff;padding:12px 16px}.top small{display:block;opacity:.9;font-size:12px}
.aviso{background:#fff3c4;font-size:12px;padding:8px 14px}.chat{padding:14px 18px;display:flex;flex-direction:column;gap:8px}
.msg{max-width:80%;padding:7px 10px 4px;border-radius:8px;font-size:14px}.msg pre{margin:0;white-space:pre-wrap;font-family:inherit}
.pac{align-self:flex-end;background:#d9fdd3}.bot{align-self:flex-start;background:#fff}.meta{font-size:11px;color:#556;margin-top:3px;font-family:Consolas,monospace}
</style></head><body><div class="app"><div class="top"><b>${esc(titulo)}</b><small>contato ${numero} · desde ${desde}</small></div>
<div class="aviso">Visualizador local do QA: conteudo 100% dos arquivos capturados (wa-enviadas.jsonl e evolution-captura.jsonl do receptor :8099). Nenhuma mensagem foi para WhatsApp real. Codigos: so os 2 ultimos digitos.</div>
<div class="chat">${ev.map((e) => `<div class="msg ${e.lado}"><pre>${esc(e.texto)}</pre><div class="meta">${e.lado === 'pac' ? 'paciente' : 'bot'} · ${e.t.slice(11, 19)}Z · ${esc(e.meta)}</div></div>`).join('')}</div></div></body></html>`
fs.writeFileSync(new URL(`./conversa-${png}.html`, import.meta.url), html)
const browser = await L.launch()
const pg = await (await browser.newContext({ viewport: { width: 980, height: 900 } })).newPage()
await pg.goto(new URL(`./conversa-${png}.html`, import.meta.url).href)
await pg.screenshot({ path: path.join(L.EVID, `${png}.png`), fullPage: true })
await browser.close()
console.log(`print ${png}.png com ${ev.length} mensagens`)
