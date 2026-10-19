// RODADA 11 — visualizador local da conversa do QA143 (prova visual).
// NAO e mock: o conteudo vem 100% dos arquivos capturados:
//   - mensagens ENVIADAS ao webhook: qa-scratch/r11-enviadas.jsonl (gravado pelo r11-wa.mjs no momento do POST; codigos ja mascarados)
//   - respostas CRUAS do bot: qa-scratch/evolution-captura.jsonl (receptor :8099), filtradas pelo numero e pelo horario da rodada
//   - leituras de Redis (notas do QA, nao fazem parte da conversa): linhas [REDIS-LEITURA] de evidence/_wa-r11-*.log
// Leituras de Redis com hora so ate o segundo sao ordenadas como .000 (foram feitas antes da acao seguinte no mesmo segundo).
// Codigos de 6 digitos: so os 2 ultimos aparecem. O texto do bot e exibido literalmente (pre-wrap, sem interpretar *negrito*).
// Gera qa-scratch/r11-conversa.html, abre no Chromium visivel (Playwright biblioteca) e salva os prints + evidence/QA143-r11.log.
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'file:///C:/AmbienteDev/sgsm-front-medico/docs/prd/administradores/qa-scratch/node_modules/playwright/index.mjs'

const DIR = 'C:/AmbienteDev/sgsm-front-medico/docs/prd/conflito-agendamento'
const T_INI = '2026-10-18T20:00:00'
const NUMS = [
  { num: '5511900011431', rot: 'a-com-conta', titulo: 'QA143 (a) e-mail COM conta', logs: ['_wa-r11-QA143.log'] },
  { num: '5511900011432', rot: 'b-sem-conta', titulo: 'QA143 (b) e-mail SEM conta', logs: ['_wa-r11-QA143-semconta.log'] },
]
const mascCod = (s) => s.replace(/(?<![\d.:])(\d{4})(\d{2})(?![\d])/g, (m, a, b) => '****' + b)
const ler = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean)
const capt = ler(path.join(DIR, 'qa-scratch/evolution-captura.jsonl'))
const env = ler(path.join(DIR, 'qa-scratch/r11-enviadas.jsonl')).map((l) => JSON.parse(l))

const out = []
const dados = {}
for (const N of NUMS) {
  const cruas = capt.filter((l) => { try { const j = JSON.parse(l); return j.corpo?.number === N.num && j.quando >= T_INI } catch { return false } })
  const eventos = []
  for (const e of env.filter((e) => e.numero === N.num && e.quando >= T_INI)) eventos.push({ t: e.quando, lado: 'pac', texto: e.texto, fonte: `r11-enviadas.jsonl (POST /webhook/evolution -> HTTP ${e.http})` })
  for (const l of cruas) { const j = JSON.parse(l); eventos.push({ t: j.quando.replace('+00:00', 'Z'), lado: 'bot', texto: mascCod(j.corpo.text), fonte: `evolution-captura.jsonl rota=${j.rota}` }) }
  const redis = []
  for (const f of N.logs) for (const l of ler(path.join(DIR, 'evidence', f))) if (l.includes('[REDIS-LEITURA]')) {
    const m = l.match(/^(\S+) \[REDIS-LEITURA\] (.*)$/)
    if (m) { const t = m[1].length === 20 ? m[1].replace('Z', '.000Z') : m[1]; eventos.push({ t, lado: 'nota', texto: m[1] + ' [REDIS-LEITURA] ' + mascCod(m[2]), fonte: f }); redis.push(l) }
  }
  eventos.sort((a, b) => a.t.localeCompare(b.t))
  dados[N.rot] = { ...N, eventos }
  out.push(`## ${N.titulo} — numero ficticio ${N.num}`)
  out.push('### Mensagens ENVIADAS ao webhook (r11-enviadas.jsonl; codigo mascarado)')
  for (const e of env.filter((e) => e.numero === N.num && e.quando >= T_INI)) out.push(JSON.stringify(e))
  out.push(`### Linhas CRUAS do evolution-captura.jsonl para ${N.num} (codigos mascarados: so os 2 ultimos digitos) — ${cruas.length} linha(s)`)
  for (const l of cruas) out.push(mascCod(l))
  out.push('### Leituras de Redis (excecao autorizada; valores mascarados)')
  out.push(...redis)
  out.push('### Log detalhado do envio (evidence/' + N.logs[0] + ')')
  out.push(...ler(path.join(DIR, 'evidence', N.logs[0])).map(mascCod))
  out.push('')
}

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>QA143 r11 — visualizador local da conversa capturada</title>
<style>
body{margin:0;font-family:Segoe UI,Arial,sans-serif;background:#d1d7db}
.app{width:760px;margin:0 auto;background:#efeae2;min-height:100vh;display:flex;flex-direction:column}
.top{background:#008069;color:#fff;padding:12px 16px}
.top b{font-size:17px}.top small{display:block;opacity:.9;font-size:12px;margin-top:2px}
.aviso{background:#fff3c4;color:#5c4a00;font-size:12px;padding:8px 14px;border-bottom:1px solid #e0d39a}
.chat{padding:14px 18px;display:flex;flex-direction:column;gap:8px}
.msg{max-width:78%;padding:7px 10px 4px;border-radius:8px;box-shadow:0 1px .5px rgba(0,0,0,.13);font-size:14px;line-height:1.35}
.msg pre{margin:0;white-space:pre-wrap;word-break:break-word;font-family:inherit}
.pac{align-self:flex-end;background:#d9fdd3}.bot{align-self:flex-start;background:#fff}
.meta{font-size:10.5px;color:#667781;text-align:right;margin-top:3px}
.nota{align-self:center;background:#e1f2fb;color:#1f4f66;font-size:11.5px;padding:5px 10px;border-radius:7px;max-width:92%;font-family:Consolas,monospace;border:1px dashed #7fb2cc}
.quem{font-size:11px;font-weight:600;margin-bottom:2px}.pac .quem{color:#1f7a4d}.bot .quem{color:#7a4fb3}
</style></head><body><div class="app" id="app"></div>
<script>
const DADOS=${JSON.stringify(dados)};
const esc=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
function render(){const k=location.hash.slice(1)||'a-com-conta';const d=DADOS[k];const a=document.getElementById('app');
a.innerHTML='<div class="top"><b>'+esc(d.titulo)+'</b><small>Número fictício '+d.num+' · bot de QA :8093 · respostas lidas do receptor local :8099 (nenhuma mensagem foi para WhatsApp real)</small></div>'+
'<div class="aviso">Visualizador local dos dados capturados (a conversa não tem tela própria). Não é mock: verde = mensagens enviadas ao webhook (qa-scratch/r11-enviadas.jsonl); branco = corpo.text cru do bot em qa-scratch/evolution-captura.jsonl, exibido literalmente; azul tracejado = leitura de Redis feita pelo QA (não faz parte da conversa). Códigos de 6 dígitos: só os 2 últimos aparecem.</div>'+
'<div class="chat">'+d.eventos.map(e=>e.lado==='nota'?'<div class="nota">'+esc(e.texto)+'</div>':
'<div class="msg '+e.lado+'"><div class="quem">'+(e.lado==='pac'?'Paciente (QA → webhook)':'Bot SGSM (capturado)')+'</div><pre>'+esc(e.texto)+'</pre><div class="meta">'+esc(e.t)+' · '+esc(e.fonte)+'</div></div>').join('')+'</div>'}
addEventListener('hashchange',render);render();
</script></body></html>`
const HTML = path.join(DIR, 'qa-scratch/r11-conversa.html')
fs.writeFileSync(HTML, html)

const browser = await chromium.launch({ headless: false, slowMo: 150 })
try {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 950 }, locale: 'pt-BR' })
  const p = await ctx.newPage()
  for (const N of NUMS) {
    await p.goto('file:///' + HTML + '#' + N.rot)
    await p.reload()
    await p.waitForSelector('.chat')
    await p.waitForTimeout(800)
    const f = path.join(DIR, `evidence/QA143-r11-${N.rot}.png`)
    await p.screenshot({ path: f, fullPage: true })
    out.push(`${new Date().toISOString()} [NOTA] print salvo ${f} (file:///${HTML}#${N.rot}; ${dados[N.rot].eventos.length} itens na tela)`)
  }
} finally { await browser.close() }

const hdr = `# QA143-r11 — log cru — gerado ${new Date().toISOString()}\n# Segredo do webhook nunca gravado (***omitido***). Codigos: so os 2 ultimos digitos.\n\n`
fs.writeFileSync(path.join(DIR, 'evidence/QA143-r11.log'), hdr + out.join('\n') + '\n')
console.log(out.slice(-2).join('\n'))
