import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

export const EVIDENCE_DIR = path.resolve('..', 'evidence')
if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true })

const BASE_URL = 'http://localhost:3001'

// ---- CPF generator (mirrors app's validarCPF algorithm) ----
function calcDigit(digits) {
  let sum = 0
  for (let i = 0; i < digits.length; i++) sum += digits[i] * (digits.length + 1 - i)
  const r = (sum * 10) % 11
  return r === 10 || r === 11 ? 0 : r
}
export function genValidCPF(seed) {
  // seed: integer, used to build 9 varying base digits deterministically
  const base = []
  let s = seed
  for (let i = 0; i < 9; i++) {
    let d = (s + i * 7) % 10
    // avoid all-same-digit sequences by nudging
    base.push(d)
    s = (s * 13 + 7) % 97
  }
  // guard against all digits identical
  if (base.every((d) => d === base[0])) base[0] = (base[0] + 1) % 10
  const d1 = calcDigit(base)
  const d2 = calcDigit([...base, d1])
  return [...base, d1, d2].join('')
}
export function maskCPF(digits) {
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`
}

export function timestamp() {
  return new Date().toISOString()
}

export class Logger {
  constructor() {
    this.entries = []
    this.checkpoint = 0
  }
  push(line) {
    this.entries.push(`[${timestamp()}] ${line}`)
  }
  attach(page) {
    page.on('console', (msg) => {
      this.push(`[CONSOLE:${msg.type()}] ${msg.text()}`)
    })
    page.on('pageerror', (err) => {
      this.push(`[PAGEERROR] ${err.message}`)
    })
    page.on('request', (req) => {
      if (req.url().includes('/v1/api')) {
        let body = ''
        try {
          const pd = req.postData()
          if (pd) body = ` BODY=${pd.slice(0, 1000)}`
        } catch {}
        this.push(`[REQUEST] ${req.method()} ${req.url()}${body}`)
      }
    })
    page.on('response', async (res) => {
      const url = res.url()
      if (url.includes('/v1/api')) {
        let bodyText = ''
        try {
          const ct = res.headers()['content-type'] || ''
          if (ct.includes('json') || ct.includes('text')) {
            const t = await res.text()
            bodyText = ` BODY=${t.slice(0, 1500)}`
          }
        } catch (e) {
          bodyText = ` BODY=<unreadable:${e.message}>`
        }
        this.push(`[RESPONSE] ${res.status()} ${res.request().method()} ${url}${bodyText}`)
      }
    })
    page.on('requestfailed', (req) => {
      if (req.url().includes('/v1/api')) {
        this.push(`[REQUESTFAILED] ${req.method()} ${req.url()} ${req.failure()?.errorText ?? ''}`)
      }
    })
  }
  // write the slice of entries since last checkpoint (plus optional preamble note) to file
  flush(id, note) {
    const slice = this.entries.slice(this.checkpoint)
    this.checkpoint = this.entries.length
    const lines = []
    if (note) lines.push(`=== ${id} NOTE === ${note}`)
    lines.push(...slice)
    if (slice.length === 0) lines.push('(no console/network events captured in this step window)')
    fs.writeFileSync(path.join(EVIDENCE_DIR, `${id}.log`), lines.join('\n'), 'utf-8')
  }
  // write full buffer regardless of checkpoint (for cases needing broader context)
  flushAll(id, note) {
    const lines = []
    if (note) lines.push(`=== ${id} NOTE === ${note}`)
    lines.push(...this.entries)
    fs.writeFileSync(path.join(EVIDENCE_DIR, `${id}.log`), lines.join('\n'), 'utf-8')
  }
}

export async function screenshot(page, id) {
  await page.screenshot({ path: path.join(EVIDENCE_DIR, `${id}.png`), fullPage: true })
}

export async function launch(headless = true) {
  const browser = await chromium.launch({ headless })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  return { browser, context, page }
}

export async function login(page, logger, email, senha) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(senha)
  await page.getByRole('button', { name: /Entrar/ }).click()
  await page.waitForURL(/\/pacientes/, { timeout: 15000 })
  await page.waitForTimeout(500)
}

export async function gotoAdministradores(page) {
  await page.goto(`${BASE_URL}/administradores`, { waitUntil: 'load' })
  await page.waitForTimeout(300)
}

export const results = {}
export function record(id, status, note) {
  results[id] = { status, note: note || '' }
}
export function saveResults(file) {
  fs.writeFileSync(file, JSON.stringify(results, null, 2), 'utf-8')
}
