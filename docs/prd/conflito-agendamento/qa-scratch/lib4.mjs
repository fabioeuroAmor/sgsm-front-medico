// Biblioteca de apoio do QA (Playwright biblioteca, navegador real, sem mock).
// Coleta console e rede crus por sessao; grava evidencias por item.
import { chromium } from 'file:///C:/AmbienteDev/sgsm-front-medico/docs/prd/administradores/qa-scratch/node_modules/playwright/index.mjs'
import fs from 'node:fs'
import path from 'node:path'

export const BASE = 'http://localhost:3010'
export const EVID = 'C:/AmbienteDev/sgsm-front-medico/docs/prd/conflito-agendamento/evidence'
fs.mkdirSync(EVID, { recursive: true })

export const LINES = []
const starts = new Map()

function ts() { return new Date().toISOString() }

export function note(text) { LINES.push(`${ts()} [NOTA] ${text}`); console.log(`[NOTA] ${text}`) }

function mask(s) {
  if (!s) return s
  return String(s)
    .replace(/"(accessToken|refreshToken|token_refresh)"\s*:\s*"[^"]*"/g, '"$1":"***"')
    .replace(/"(senha|password|novaSenha)"\s*:\s*"[^"]*"/g, '"$1":"***"')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer ***')
    .replace(/"codigo"\s*:\s*"(\d*)"/g, (m, c) => `"codigo":"${maskCodigo(c)}"`)
}

export function maskCodigo(c) { c = String(c ?? ''); return c.length <= 2 ? '*'.repeat(c.length) : '*'.repeat(c.length - 2) + c.slice(-2) }

// Codigo de ativacao: a conta de e-mail de dev nao entrega para dominios de teste; o QA le o codigo no Redis
// no papel do usuario lendo o proprio e-mail (unica leitura fora da UI autorizada, alem do scan de limpeza).
import { execSync } from 'node:child_process'
export function codigoRedis(email) {
  const k = 'auth:ativacao:codigo:' + email.trim().toLowerCase()
  const v = execSync(`docker exec redis-sgsm redis-cli GET "${k}"`).toString().trim()
  LINES.push(`${new Date().toISOString()} [REDIS] GET "${k}" -> ${v ? maskCodigo(v) : '(nil)'}`)
  return v
}

export function gerarCpf(seed) {
  const d = String(seed).padStart(9, '0').slice(-9).split('').map(Number)
  if (d.every((x) => x === d[0])) d[8] = (d[8] + 1) % 10
  const dv = (arr) => { const len = arr.length; let s = 0; for (let i = 0; i < len; i++) s += arr[i] * (len + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r }
  d.push(dv(d)); d.push(dv(d))
  return d.join('')
}

function relevante(url) { return url.includes('/v1/') || url.includes('/ia/') || url.includes('/crm/') }

export function attach(sessName, page) {
  const tag = () => `[${sessName}${page._qaTab ? '#' + page._qaTab : ''}]`
  page.on('console', (m) => LINES.push(`${ts()} ${tag()} CONSOLE.${m.type()}: ${mask(m.text())}`))
  page.on('pageerror', (e) => LINES.push(`${ts()} ${tag()} PAGEERROR: ${mask(e.message)}`))
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) LINES.push(`${ts()} ${tag()} NAVIGATED: ${f.url()}`) })
  page.on('request', (r) => {
    if (!relevante(r.url())) return
    const auth = r.headers()['authorization'] ? ' Authorization: Bearer ***' : ' (sem Authorization)'
    const body = r.postData() ? ` BODY=${mask(r.postData())}` : ''
    LINES.push(`${ts()} ${tag()} >> ${r.method()} ${r.url()}${auth}${body}`)
  })
  page.on('requestfailed', (r) => {
    if (!relevante(r.url())) return
    LINES.push(`${ts()} ${tag()} XX FAILED ${r.method()} ${r.url()} ${r.failure()?.errorText}`)
  })
  page.on('response', async (resp) => {
    const r = resp.request()
    if (!relevante(r.url())) return
    let body = ''
    try { body = await resp.text() } catch { body = '(sem corpo)' }
    if (body.length > 3000) body = body.slice(0, 3000) + `...(truncado, ${body.length} chars)`
    LINES.push(`${ts()} ${tag()} << ${resp.status()} ${r.method()} ${r.url()} BODY=${mask(body)}`)
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

export async function login(page, email, senha) {
  await page.goto(BASE + '/login')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(senha)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL('**/pacientes', { timeout: 20000 })
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

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

export async function gradeHorarios(page) {
  const m = modal(page)
  const btns = m.locator('div.grid.grid-cols-3 > button')
  return (await btns.allTextContents()).map((t) => t.trim())
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
