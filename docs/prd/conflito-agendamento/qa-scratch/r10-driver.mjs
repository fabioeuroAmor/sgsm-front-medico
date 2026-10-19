// RODADA 10 — navegador da SEC-A mantido aberto (Playwright biblioteca, janela visivel, sem mock/page.route)
// e controlado por passos: cada passo e um trecho de JS em r10-cmd.js (executado com p, L, S, browser),
// resultado em r10-res.txt. Permite intercalar o navegador com a conversa do WhatsApp (r10-wa.mjs).
import fs from 'node:fs'
import * as L from './lib5.mjs'
import * as C from './r5-common.mjs'
const DIR = new URL('./', import.meta.url)
const CMD = new URL('r10-cmd.js', DIR), RES = new URL('r10-res.txt', DIR), STOP = new URL('r10-stop.flag', DIR)
const browser = await L.launch()
const S = await L.newSession(browser, 'SEC-A')
const p = S.page
await L.login(p, C.contas.A.email, C.contas.A.senha)
L.note('SEC-A logada; driver pronto')
fs.writeFileSync(RES, 'PRONTO\n')
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
while (!fs.existsSync(STOP)) {
  if (fs.existsSync(CMD)) {
    const code = fs.readFileSync(CMD, 'utf8'); fs.unlinkSync(CMD)
    let out
    try { const r = await new AsyncFunction('p', 'L', 'S', 'browser', 'C', code)(p, L, S, browser, C); out = 'OK ' + (typeof r === 'string' ? r : JSON.stringify(r, null, 1)) }
    catch (e) { out = 'ERRO ' + e.message.split('\n').slice(0, 3).join(' | ') }
    L.saveAll('r10-driver')
    fs.writeFileSync(RES, out + '\n__FIM__\n')
  }
  await L.sleep(300)
}
L.saveAll('r10-driver')
await browser.close()
