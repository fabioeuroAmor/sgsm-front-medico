import fs from 'node:fs'

const results = JSON.parse(fs.readFileSync('final-results.json', 'utf-8'))
const planPath = '../test-plan.md'
let content = fs.readFileSync(planPath, 'utf-8')

let updated = 0
for (const [id, r] of Object.entries(results)) {
  if (r.status === 'pass') {
    const marker = `- [ ] **${id}**`
    const replacement = `- [x] **${id}**`
    if (content.includes(marker)) {
      content = content.replace(marker, replacement)
      updated++
    } else {
      console.log('NOT FOUND for', id)
    }
  }
}
fs.writeFileSync(planPath, content, 'utf-8')
console.log('updated', updated, 'items')
