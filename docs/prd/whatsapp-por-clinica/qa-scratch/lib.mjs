// RODADA 5 — biblioteca de apoio do QA (Playwright biblioteca, navegador real, sem mock).
// Coleta console e rede crus por sessao; grava evidencias por item.
// Mascaramento: tokens, senhas, codigos e tokens de convite mostram so os 4 ultimos caracteres.
import { chromium } from 'file:///C:/AmbienteDev/sgsm-front-medico/docs/prd/administradores/qa-scratch/node_modules/playwright/index.mjs'
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

export const BASE = 'http://localhost:3001'
export const EVID = 'C:/AmbienteDev/sgsm-front-medico/docs/prd/whatsapp-por-clinica/evidence'
fs.mkdirSync(EVID, { recursive: true })

export const LINES = []
const starts = new Map()

function ts() { return new Date().toISOString() }

export function m4(v) { v = String(v ?? ''); return v.length <= 4 ? '*'.repeat(v.length) : '***' + v.slice(-4) }
// WhatsApp por clinica: tokens/JWT/senhas viram ***; codigos so com os 2 ultimos digitos; segredo do webhook omitido
export function m2(v) { v = String(v ?? ''); return v.length <= 2 ? '**' : '****' + v.slice(-2) }
const SEGREDO_WH = process.env.BOT_EVOLUTION_WEBHOOK_SECRET || null
export function mask(s) {
  if (!s) return s
  let out = String(s)
  if (SEGREDO_WH) out = out.split(SEGREDO_WH).join('***segredo-omitido***')
  return out
    // QR code: imagem base64 (nao e segredo, mas e enorme) -> prefixo + tamanho
    .replace(/(data:image\/png;base64,)([A-Za-z0-9+/=]{40,})/g, (m, p, b) => `${p}${b.slice(0, 24)}...(${b.length} chars base64)`)
    .replace(/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+/g, 'JWT***')
    .replace(/"(accessToken|refreshToken|token_refresh|token|reservaToken|hash|apikey)"\s*:\s*"([^"]*)"/g, (m, k) => `"${k}":"***"`)
    .replace(/"(senha|password|novaSenha|senhaAtual)"\s*:\s*"([^"]*)"/g, (m, k) => `"${k}":"***"`)
    .replace(/Bearer\s+([A-Za-z0-9._*-]+)/g, () => 'Bearer ***')
    .replace(/"(codigo|otp)"\s*:\s*"(\d*)"/g, (m, k, c) => `"${k}":"${m2(c)}"`)
    .replace(/([?&]token=)([^&\s"']+)/g, (m, k) => k + '***')
}
export const maskCodigo = m2

export function note(text) { const t = mask(text); LINES.push(`${ts()} [NOTA] ${t}`); console.log(`[NOTA] ${t}`) }

// Codigo de ativacao: a conta de e-mail de dev nao entrega para dominios de teste; o QA le o codigo no Redis
// no papel do usuario lendo o proprio e-mail (excecao autorizada pelo usuario).
export function codigoRedis(email) {
  const k = 'auth:ativacao:codigo:' + email.trim().toLowerCase()
  const v = execSync(`docker exec redis-sgsm redis-cli GET "${k}"`).toString().trim()
  LINES.push(`${ts()} [REDIS-LEITURA] GET "${k}" -> ${v ? m2(v) : '(nil)'}`)
  return v
}

// Token do convite do medico (link do e-mail): mesma razao; so o token mais recente do usuario dele (excecao autorizada)
export function tokenConvite(email) {
  const sql = `SELECT t.token FROM auth.reset_senha_token t JOIN auth.usuario u ON u.id = t.usuario_id WHERE lower(u.email) = lower('${email}') ORDER BY t.criado_em DESC LIMIT 1;`
  const v = execSync(`docker run --rm -i -e PGPASSWORD=postgres postgres:16-alpine psql -h host.docker.internal -U postgres -d postgres -t -c "${sql}"`,
    { env: { ...process.env, MSYS_NO_PATHCONV: '1' }, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim()
  LINES.push(`${ts()} [SQL-LEITURA] token de convite mais recente de ${email} -> ${v ? m2(v) : '(nenhum)'}`)
  return v
}
export const linkConvite = (t) => `${BASE}/resetar-senha?token=${encodeURIComponent(t)}&convite=1`

export function gerarCpf(seed) {
  const d = String(seed).padStart(9, '0').slice(-9).split('').map(Number)
  if (d.every((x) => x === d[0])) d[8] = (d[8] + 1) % 10
  const dv = (arr) => { const len = arr.length; let s = 0; for (let i = 0; i < len; i++) s += arr[i] * (len + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r }
  d.push(dv(d)); d.push(dv(d))
  return d.join('')
}

function relevante(url) { return url.includes('/v1/') || url.includes('/ia/') || url.includes('/crm/') || url.includes('/marketing/') }

export function attach(sessName, page) {
  const tag = () => `[${sessName}${page._qaTab ? '#' + page._qaTab : ''}]`
  page.on('console', (m) => LINES.push(`${ts()} ${tag()} CONSOLE.${m.type()}: ${mask(m.text())}`))
  page.on('pageerror', (e) => LINES.push(`${ts()} ${tag()} PAGEERROR: ${mask(e.message)}`))
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) LINES.push(`${ts()} ${tag()} NAVIGATED: ${mask(f.url())}`) })
  page.on('request', (r) => {
    if (!relevante(r.url())) return
    const ah = r.headers()['authorization']
    const auth = ah ? ` Authorization: ${mask(ah)}` : ' (sem Authorization)'
    const body = r.postData() ? ` BODY=${mask(r.postData())}` : ''
    LINES.push(`${ts()} ${tag()} >> ${r.method()} ${mask(r.url())}${auth}${body}`)
  })
  page.on('requestfailed', (r) => {
    if (!relevante(r.url())) return
    LINES.push(`${ts()} ${tag()} XX FAILED ${r.method()} ${mask(r.url())} ${r.failure()?.errorText}`)
  })
  page.on('response', async (resp) => {
    const r = resp.request()
    if (!relevante(r.url())) return
    let body = ''
    try { body = await resp.text() } catch { body = '(sem corpo)' }
    if (body.length > 3000) body = body.slice(0, 3000) + `...(truncado, ${body.length} chars)`
    LINES.push(`${ts()} ${tag()} << ${resp.status()} ${r.method()} ${mask(r.url())} BODY=${mask(body)}`)
  })
}

export async function launch() {
  return chromium.launch({ headless: false, slowMo: 150 })
}

export async function newSession(browser, name) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' })
  let n = 0
  ctx.on('page', (p) => { n += 1; p._qaTab = n; attach(name, p) })
  const page = await ctx.newPage()
  return { name, ctx, page }
}

export function start(id) { starts.set(id, LINES.length); note(`INICIO ${id}`) }

export async function end(id, extra = '') {
  await new Promise((r) => setTimeout(r, 800))
  note(`FIM ${id}`)
  const i = starts.get(id) ?? 0
  const txt = `# ${id} — saida crua (console + rede) — gerado ${ts()}\n` + (extra ? `# ${extra}\n` : '') + LINES.slice(i).join('\n') + '\n'
  fs.writeFileSync(path.join(EVID, `${id}.log`), txt)
}

export async function shot(page, name) {
  const f = path.join(EVID, `${name}.png`)
  await page.screenshot({ path: f, fullPage: false })
  note(`print salvo ${f}`)
}

export function saveAll(name) {
  fs.writeFileSync(path.join(EVID, `_full-${name}.log`), LINES.join('\n') + '\n')
}

export async function login(page, email, senha, { esperar = '**/pacientes' } = {}) {
  await page.goto(BASE + '/login')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(senha)
  await page.getByRole('button', { name: 'Entrar' }).click()
  if (esperar) await page.waitForURL(esperar, { timeout: 20000 })
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
export const toasts = (p) => p.locator('[data-sonner-toast]').allTextContents()
export async function esperarToastsSumirem(p) {
  await p.locator('[data-sonner-toast]').first().waitFor({ state: 'detached', timeout: 15000 }).catch(() => {})
}
export function respostas(desde, re = /\/v1\//) {
  return LINES.slice(desde).filter((l) => / << \d+ /.test(l) && re.test(l)).map((l) => l.match(/<< (\d+ \w+ \S+)/)[1])
}

// ─── wizard de agendamento ────────────────────────────────────────────────
export function modal(page) { return page.locator('div.fixed.inset-0.z-50').filter({ has: page.locator('h2') }).last() }

export async function irAgendamentos(page) {
  await page.getByRole('link', { name: 'Agendamentos' }).first().click()
  await page.waitForURL('**/agendamentos')
  await page.getByRole('button', { name: 'Novo Agendamento' }).waitFor()
}

export async function abrirWizard(page) {
  await page.getByRole('button', { name: 'Novo Agendamento' }).click()
  await page.getByText('Passo 1 / 5').waitFor()
}

export async function passo1(page, nome = 'Zilma') {
  const m = modal(page)
  await m.getByPlaceholder('Buscar por nome ou CPF…').fill(nome)
  await m.getByRole('button', { name: /Zilma Ruela/ }).first().click()
  await m.getByRole('button', { name: 'Próximo', exact: true }).click()
  await page.getByText('Passo 2 / 5').waitFor()
}

export async function passo2(page, servico = 'QA Descartavel') {
  const m = modal(page)
  await m.getByPlaceholder('Buscar por serviço, médico ou especialidade…').fill(servico)
  const row = m.getByRole('button').filter({ hasText: servico }).filter({ hasText: 'Fabio' }).first()
  await row.waitFor({ timeout: 15000 })
  await row.click()
  await m.getByRole('button', { name: 'Próximo', exact: true }).click()
  await page.getByText('Passo 3 / 5').waitFor()
}

export async function passo3(page, tipo = 'Presencial', estab = 'Clinica São Lucas') {
  const m = modal(page)
  await m.getByRole('button', { name: tipo, exact: true }).click()
  if (tipo !== 'Domiciliar') {
    await m.getByRole('button').filter({ hasText: estab }).first().click()
  }
  await m.getByRole('button', { name: 'Próximo', exact: true }).click()
  await page.getByText('Passo 4 / 5').waitFor()
}

export async function escolherDia(page, dia) {
  const m = modal(page)
  const b = m.locator('button:not([disabled])').filter({ hasText: new RegExp(`^${dia}$`) }).first()
  await b.waitFor({ timeout: 15000 })
  await b.click()
}

export function slotBtn(page, hhmm) {
  return modal(page).getByRole('button', { name: hhmm, exact: true })
}

export async function esperarGrade(page) {
  const m = modal(page)
  await m.getByText('Carregando horários…').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {})
  await m.locator('div.grid.grid-cols-3 > button, :text("Sem horários disponíveis nesta data")').first().waitFor({ timeout: 20000 })
}

export async function wizardAte4(page, { servico = 'QA Descartavel', tipo = 'Presencial', estab = 'Clinica São Lucas', dia = '21' } = {}) {
  await abrirWizard(page)
  await passo1(page)
  await passo2(page, servico)
  await passo3(page, tipo, estab)
  await escolherDia(page, dia)
  await esperarGrade(page)
}

export async function fecharModal(page) {
  await modal(page).locator('xpath=.//h2/following-sibling::button').click()
}

export function faixaReserva(page) { return modal(page).getByText(/Horário reservado para você — expira em/) }

// ─── WhatsApp por clinica: apoio (leituras crus de banco, Redis, Evolution e logs dos servicos) ─────────
export const CLIN_A = '655759aa-bf83-417e-a45b-b06258c4458f'
export const CLIN_B = '36a7eb52-9c10-4fc6-904e-04d80747217b'
export const DEV_EMAIL = 'dev-local@sgsm.local', DEV_SENHA = 'Dev088c00c5ba89!Aa'
export const LOGDIR = 'C:/Users/re048720/AppData/Local/Temp/sgsm-plano'

export function sql(q, { registrar = true } = {}) {
  let v
  try {
    v = execSync(`docker run --rm -i -e PGPASSWORD=postgres postgres:16-alpine psql -h host.docker.internal -U postgres -d postgres -c "${q.replace(/"/g, '\\"')}"`,
      { env: { ...process.env, MSYS_NO_PATHCONV: '1' }, stdio: ['pipe', 'pipe', 'pipe'] }).toString()
  } catch (e) { v = 'ERRO SQL: ' + (e.stderr?.toString() || e.message) }
  if (registrar) LINES.push(`${ts()} [SQL] ${q}\n${mask(v)}`)
  return v
}
export function redis(args, { registrar = true } = {}) {
  let v
  try { v = execSync(`docker exec redis-sgsm redis-cli ${args}`).toString().trim() } catch (e) { v = 'ERRO REDIS: ' + e.message }
  if (registrar) LINES.push(`${ts()} [REDIS] redis-cli ${args}\n${mask(v)}`)
  return v
}
export async function evo(pathUrl, { registrar = true, method = 'GET' } = {}) {
  let st, txt
  try {
    const r = await fetch('http://localhost:8090' + pathUrl, { method, headers: { apikey: 'sgsm-evolution-key' } })
    st = r.status; txt = await r.text()
  } catch (e) { st = 'ERRO'; txt = e.message }
  let curto = txt
  try {
    const j = JSON.parse(txt)
    if (Array.isArray(j)) curto = JSON.stringify(j.map((i) => ({ name: i.name, connectionStatus: i.connectionStatus, ownerJid: i.ownerJid, createdAt: i.createdAt })))
  } catch {}
  if (registrar) LINES.push(`${ts()} [EVOLUTION] ${method} http://localhost:8090${pathUrl} (header apikey: ***) -> ${st} BODY=${mask(curto).slice(0, 3000)}`)
  return { status: st, body: txt }
}
// Linhas do log JSON de um servico com @timestamp >= desde (ISO) e que casem com o filtro
export function logServico(arquivo, desdeIso, filtro = /./, { max = 200, registrar = true, rotulo } = {}) {
  const f = path.join(LOGDIR, arquivo)
  const ls = fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split(/\r?\n/) : []
  const out = []
  for (const l of ls) {
    const m = l.match(/"@timestamp":"([^"]+)"/)
    if (!m || m[1] < desdeIso) continue
    if (/org\.hibernate\.orm\.jdbc\.bind/.test(l)) continue
    if (filtro.test(l)) out.push(l.length > 2500 ? l.slice(0, 2500) + '...(truncado)' : l)
  }
  const sel = out.slice(-max)
  if (registrar) LINES.push(`${ts()} [LOG ${rotulo || arquivo} desde ${desdeIso} filtro ${filtro}] ${sel.length} linha(s)\n` + sel.map(mask).join('\n'))
  return sel
}
// Chamada pela propria app no navegador (mesmo axios/tokenStore da tela): aparece na rede capturada
export async function apiNaApp(page, method, url, body) {
  return page.evaluate(async ({ method, url, body }) => {
    const { default: api } = await import('/src/services/api.ts')
    try {
      const r = await api.request({ method, url, data: body })
      return { status: r.status, data: r.data }
    } catch (e) { return { status: e.status ?? null, erro: e.message, data: e.data ?? null } }
  }, { method, url, body })
}
export const isoAgora = () => new Date().toISOString()
