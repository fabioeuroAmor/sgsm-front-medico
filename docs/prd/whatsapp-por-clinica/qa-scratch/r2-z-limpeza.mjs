// LIMPEZA — (1) cancela o agendamento de teste do WA-B07 (FUNC-A, pela app); (2) ADM-A e ADM-B desconectam pela tela os
// canais de QA (status REMOVIDO); (3) confere na Evolution que as instancias de QA sumiram e que sgsm-bot continua "open".
import fs from 'node:fs'
import * as L from './lib.mjs'
const C = JSON.parse(fs.readFileSync(new URL('./contas.json', import.meta.url)))
const browser = await L.launch()
try {
  L.start('R2-LIMPEZA')
  L.sql(`select instancia, estabelecimento_id, status from sgsm.whatsapp_canal order by criado_em`)
  await L.evo('/instance/fetchInstances')
  // (1) agendamento de teste
  const F = await L.newSession(browser, 'FUNC-A')
  await L.login(F.page, C.FUNC_A.email, C.FUNC_A.senha)
  const ag = (L.sql(`select id from sgsm.agendamento where paciente_id='${C.PAC_BOT_R2.id}' and status<>'CANCELADO'`, { registrar: false }).match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g) || [])
  for (const id of ag) {
    const r = await L.apiNaApp(F.page, 'patch', `/agendamentos/${id}/cancelar`, { origemCancelamento: 'ESTABELECIMENTO', motivoCancelamento: 'Limpeza do QA WhatsApp por clinica (rodada 2)' })
    L.note(`cancelar agendamento de teste ${id} -> ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`)
  }
  L.sql(`select id, status, data_hora_inicio from sgsm.agendamento where paciente_id='${C.PAC_BOT_R2.id}'`)
  // (2) desconectar pela tela
  for (const [k, rot] of [['ADM_A', 'ADM-A'], ['ADM_B', 'ADM-B']]) {
    const S = await L.newSession(browser, rot)
    const p = S.page
    await L.login(p, C[k].email, C[k].senha, { esperar: null })
    await p.waitForURL((u) => u.pathname !== '/login', { timeout: 20000 })
    await p.getByRole('link', { name: 'WhatsApp da clínica' }).first().click()
    await L.sleep(3500)
    if (await p.getByRole('button', { name: /Desconectar/ }).count()) {
      p.once('dialog', (d) => d.accept())
      const w = p.waitForResponse((r) => /\/whatsapp$/.test(r.url()) && r.request().method() === 'DELETE', { timeout: 30000 })
      await p.getByRole('button', { name: /Desconectar/ }).click()
      const r = await w
      await p.getByText('Nenhum WhatsApp conectado').waitFor({ timeout: 10000 }).catch(() => {})
      L.note(`${rot} desconectou -> DELETE ${r.status()} | toasts=${JSON.stringify(await L.toasts(p))}`)
    } else L.note(`${rot}: sem canal para desconectar`)
    await L.shot(p, `R2-LIMPEZA-${rot}`)
    await S.ctx.close()
  }
  // (3) conferencia
  L.sql(`select instancia, estabelecimento_id, status, atualizado_em from sgsm.whatsapp_canal order by criado_em`)
  await L.evo('/instance/fetchInstances')
  await L.evo('/instance/connectionState/sgsm-bot')
  for (const i of ['sgsm-655759aa-825703', 'sgsm-36a7eb52-d2fd50']) await L.evo(`/instance/connectionState/${i}`)
  await L.end('R2-LIMPEZA')
} catch (e) { L.note('ERRO DO SCRIPT: ' + e.message.split('\n')[0]) } finally { L.saveAll('r2-z'); await browser.close() }
