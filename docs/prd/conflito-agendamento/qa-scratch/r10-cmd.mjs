// envia um passo (JS lido do stdin) ao r10-driver.mjs e espera o resultado
import fs from 'node:fs'
const DIR = new URL('./', import.meta.url)
const CMD = new URL('r10-cmd.js', DIR), RES = new URL('r10-res.txt', DIR)
const code = fs.readFileSync(0, 'utf8')
if (fs.existsSync(RES)) fs.unlinkSync(RES)
fs.writeFileSync(CMD, code)
const t0 = Date.now()
while (Date.now() - t0 < 900000) {
  if (fs.existsSync(RES)) { const t = fs.readFileSync(RES, 'utf8'); if (t.includes('__FIM__')) { console.log(t.replace('__FIM__\n', '')); process.exit(0) } }
  await new Promise((r) => setTimeout(r, 300))
}
console.log('timeout esperando o driver')
