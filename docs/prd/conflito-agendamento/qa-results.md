# QA Results — Conflito de agendamento (secretária x secretária x WhatsApp)

> **Ferramenta:** a execução usou **Playwright como biblioteca Node** (v1.63.0, Chromium real, sem mock e sem `page.route` alterando respostas). Isso foi autorizado pelo usuário no lugar do Playwright MCP, que não estava disponível na sessão.
> Import: `file:///C:/AmbienteDev/sgsm-front-medico/docs/prd/administradores/qa-scratch/node_modules/playwright/index.mjs`.
> **Janela:** a partir do pedido do usuário, todos os scripts rodaram com `chromium.launch({ headless: false, slowMo: 150 })` (janela visível). Única exceção: `g0-setup.mjs` (QA000, QA062, QA094), que já tinha rodado em headless antes do pedido chegar.
> Scripts: `qa-scratch/*.mjs` (biblioteca comum em `qa-scratch/lib.mjs`). Coleta crua por sessão: `page.on('console' | 'pageerror' | 'request' | 'response' | 'requestfailed')`, com Authorization, tokens e senhas mascarados (`***`).
> Logs completos por execução: `evidence/_full-*.log`.
> Data da execução: 2026-10-17 (UTC 06:07–07:09). Fuso do navegador: America/Sao_Paulo.

## Contas e dados criados

| Conta | E-mail | CPF | Senha |
|---|---|---|---|
| SEC-A (QA Secretaria A, FUNCIONARIO, Clinica São Lucas) | `qa.conflito.seca.1792217275275@teste.com` | 217.275.275-42 | 15 caracteres, registrada em `qa-scratch/contas.json` (não reproduzida aqui) |
| SEC-B (QA Secretaria B) | `qa.conflito.secb.1792217275275@teste.com` | 282.572.712-17 | idem |

- IDs de funcionário: A=`7f5a6eac-a3f7-460d-b01a-b9ef6eea163d` (auth `13daf867-…`), B=`8cb964bc-9517-43ff-8c78-4a34fe585602` (auth `18c8a0a6-…`).
- Agendamentos criados no QA (todos cancelados no QA091/QA099): `801d80cf` (21/10 10:00), `52ff9bde` (21/10 14:30, chatbot), `fe399bd3` (21/10 12:30), `375cf1bd` (21/10 13:00, SEC-B, 1ª execução do QA052), `2e7b7b5a` (21/10 13:30, SEC-B, QA052), `649d7acb` (22/10 10:00 domiciliar).

## Ocorrências de ambiente/execução (transparência)

1. **g1, 1ª execução:** o script parou num seletor ambíguo ("Próximo" x "Próximo mês"), um erro do script e não da app. A reserva 10:00 de SEC-A ficou órfã e expirou em 10 min. Rodei de novo e as provas de QA001–QA015 são da 2ª execução.
2. **g3, 1ª execução:** mesmo tipo de erro ("Anterior" x "Mês anterior") depois de QA032, deixando uma reserva 16:00 órfã de SEC-A. Na 2ª execução, o script esperou essa reserva expirar antes do QA039, para que o limite de 3 fosse medido do zero.
3. **QA052, 1ª execução (dentro de g4a):** depois do 409 o script parou num seletor de texto parcial meu, e o log não foi salvo. O comportamento observado foi idêntico ao da reexecução (409, volta ao passo 4, alternativas). Refiz o item inteiro com uma nova espera real de 10 min. O print dessa 1ª tentativa ficou como `QA052-execucao1-SEC-B-agendou-13h.png`.
4. **QA024:** a 1ª tentativa (em g2, troca de aba via `bringToFront`) não disparou foco. O Playwright emula foco por página (`document.hasFocus()` fica sempre `true`). Tratamento: no `g-qa024.mjs`, desliguei a emulação com CDP `Emulation.setFocusEmulationEnabled({enabled:false})`, para que o foco real do SO e da janela visível passasse a valer. Isso muda só o navegador, não a app nem as respostas. Print da 1ª tentativa: `QA024-tentativa1-g2-troca-de-aba.png`.
5. **QA050/QA051:** o sgsm de QA (:8095, PID 22792) foi finalizado com `taskkill` e subido de novo pelo comando indicado. O log registrou `Started SgsmApplication in 13.303 seconds` às 06:57:12Z (PID novo 31804). O sgsm de QA estava de pé no fim do QA. Nenhuma outra queda de 3010/8095 aconteceu.
6. A conta MED (`fabioeuro@gmail.com` / `famor966`) retornou 401 "Credenciais invalidas." tanto no curl quanto no navegador.

---

## 0. Preparação

### QA000 — APROVADO
- **Feito:** DEV logou e foi em `/funcionarios` → "Novo Funcionário". Errei de propósito primeiro (CPF `123.456.789-00` e senha "curta"): apareceram os erros "CPF inválido", "E-mail obrigatório" e "Senha obrigatória (mínimo 8 caracteres)". Depois cadastrei "QA Secretaria A" e "QA Secretaria B" (cargo Secretaria, Clinica São Lucas, CPF válido, senha de 8+ caracteres).
- **Observado = esperado:** toast "Funcionário cadastrado. Um e-mail com a senha de acesso foi enviado." para as duas; `POST /v1/api/funcionarios` 201 e `POST /v1/api/auth/registrar-staff` 201 para cada uma.
- **Evidências:** `evidence/QA000-a-erro-validacao.png`, `QA000-b-form-A.png`, `QA000-c-toast-A.png`, `QA000-d-form-B.png`, `QA000-e-toast-B.png`, `QA000-f-lista.png`, `QA000.log`
```
2026-10-17T06:07:59.725Z [DEV#1] << 201 POST http://localhost:3010/v1/api/funcionarios BODY={"id":"7f5a6eac-...","nome":"QA Secretaria A",...
2026-10-17T06:08:00.513Z [DEV#1] << 201 POST http://localhost:3010/v1/api/auth/registrar-staff BODY={"id":"13daf867-...","tipoPerfil":"FUNCIONARIO",...
2026-10-17T06:08:05.991Z [DEV#1] << 201 POST http://localhost:3010/v1/api/funcionarios BODY={"id":"8cb964bc-...","nome":"QA Secretaria B",...
2026-10-17T06:08:06.285Z [DEV#1] << 201 POST http://localhost:3010/v1/api/auth/registrar-staff ...
```

### QA001 — APROVADO
- **Feito:** login de SEC-A e de SEC-B em `browser.newContext()` distintos.
- **Observado:** as duas chegaram em `/pacientes` (painel). O log tem 0 respostas 4xx e 0 `CONSOLE.error`.
- **Evidências:** `QA001-a-SEC-A.png`, `QA001-b-SEC-B.png`, `QA001.log`
```
2026-10-17T06:10:04.034Z [SEC-A#1] << 200 POST .../v1/api/auth/login BODY={"accessToken":"***","expiresIn":900,...}
2026-10-17T06:10:05.152Z [SEC-B#1] << 200 POST .../v1/api/auth/login ...
[NOTA] SEC-A url=http://localhost:3010/pacientes / SEC-B url=http://localhost:3010/pacientes
```

## 1. Fluxo principal

### QA010 — APROVADO
- **Feito:** SEC-A → Agendamentos → Novo Agendamento → Zilma → QA Descartavel (Fabio) → Presencial + Clinica São Lucas → dia 21.
- **Observado:** um MutationObserver (só observação) registrou "Carregando horários…" no DOM antes da grade. `GET /agendamentos/slots` 200, e a grade carregou.
- **Evidências:** `QA010.png`, `QA010.log`
```
[NOTA] GET slots status=200
[NOTA] "Carregando horários…" observado no DOM: true
2026-10-17T06:10:10.147Z [SEC-A#1] << 200 GET .../v1/api/agendamentos/slots?medicoId=ff9a2400-...&estabelecimentoId=655759aa-...&data=2026-10-21
```

### QA011 — APROVADO
- **Observado:** `POST /agendamentos/reservas` 201 com `"reservado":true`. O botão 10:00 recebeu a classe de destaque (`border-primary/50 bg-primary/10 text-primary`) e apareceu a faixa "Horário reservado para você — expira em 09:59". O observador registrou todos os botões da grade `disabled` durante a requisição.
- **Evidências:** `QA011.png`, `QA011.log`
```
2026-10-17T06:10:11.389Z [SEC-A#1] << 201 POST .../v1/api/agendamentos/reservas BODY={"token":"7f4fa35c-...","dataHoraInicio":"2026-10-21T13:00:00Z",...,"reservado":true}
[NOTA] botoes desabilitados durante a requisicao (observado): true
```

### QA012 — APROVADO
- **Observado:** a faixa mostrou "09:58" e, 5,2 s depois, "09:53". A queda é coerente com 1 s por segundo.
- **Evidências:** `QA012-a.png`, `QA012-b.png`, `QA012.log`
```
[NOTA] faixa 1: Horário reservado para você — expira em 09:58 | faixa 2 (5.1 s depois): ... expira em 09:53
```

### QA013 — APROVADO
- **Observado:** o resumo mostra "DATA E HORA 21/10/2026, 10:00 — 10:30", e a faixa de reserva continua visível no passo 5.
- **Evidências:** `QA013.png`, `QA013.log`

### QA014 — APROVADO
- **Observado:** `POST /agendamentos` 201 com `reservaToken` no corpo. O modal fechou e o card "Zilma Ruela / QA Descartavel / 21/10/2026, 10:00" aparece na lista (1 card). Não houve nenhum `DELETE /reservas` depois do 201 (6 s observados).
- **Evidências:** `QA014.png`, `QA014.log`
```
>> POST .../v1/api/agendamentos BODY={...,"dataHoraInicio":"2026-10-21T10:00:00-03:00","reservaToken":"7f4fa35c-dc88-456e-b76b-46c1cffeba5a"}
2026-10-17T06:10:19.884Z [SEC-A#1] << 201 POST .../v1/api/agendamentos BODY={"id":"801d80cf-...
```

### QA015 — APROVADO
- **Observado:** ao reabrir o wizard em 21/10, a grade não traz 10:00 (`contem 10:00? false`).
- **Evidências:** `QA015.png`, `QA015.log`

## 2. Disputa entre duas secretárias

### QA020 — APROVADO
- **Feito:** SEC-A reservou 11:00 (201). Depois SEC-B abriu uma nova aba no seu contexto e foi até o passo 4 da mesma data e serviço.
- **Observado:** 11:00 não aparece na grade de SEC-B.
- **Evidências:** `QA020-a-SEC-A-reservou-11h.png`, `QA020-b-SEC-B-sem-11h.png`, `QA020.log`
```
[NOTA] grade SEC-B (nova aba, apos reserva de SEC-A): ["08:00",...,"10:30","11:30",...] | contem 11:00? false
```

### QA021 — APROVADO
- **Feito:** SEC-B abriu a grade antes (com 11:00). SEC-A reservou 11:00 e SEC-B clicou 11:00 na grade desatualizada.
- **Observado:** `POST /reservas` 409. Mensagem vermelha "Este horário acabou de ser ocupado ou está reservado por outra pessoa. Veja abaixo os horários próximos disponíveis." Bloco "Horários próximos disponíveis" com 3 opções (21/10 10:30, 11:30, 12:00). Nenhum horário selecionado, sem faixa. `GET /slots` 200 logo depois, e 11:00 sumiu da grade.
- **Evidências:** `QA021-a-grade-desatualizada-SEC-B.png`, `QA021-b-409-alternativas.png`, `QA021.log`
```
2026-10-17T06:11:45.345Z [SEC-B#1] << 409 POST .../v1/api/agendamentos/reservas BODY={"detail":"Horário em pré-reserva por outro usuário. Escolha outro horário.",...,"alternativas":[{"dataHoraInicio":"2026-10-21T10:30:00-03:00",...},{..."11:30..."},{..."12:00..."}]}
[NOTA] GET slots apos 409: 200 ...data=2026-10-21
[NOTA] botoes selecionados (bg-primary/10) na grade: 0
```

### QA022 — APROVADO
- **Observado:** cliquei a alternativa "21/10/2026, 10:30" → `POST /reservas` 201 com `dataHoraInicio 10:30-03:00`. 10:30 ficou selecionado, a faixa apareceu ("09:59") e o bloco de alternativas e a mensagem de erro sumiram.
- **Evidências:** `QA022.png`, `QA022.log`
```
2026-10-17T06:11:48.037Z [SEC-B#1] << 201 POST .../v1/api/agendamentos/reservas BODY={"token":"03440a58-...","dataHoraInicio":"2026-10-21T13:30:00Z",...}
[NOTA] bloco alternativas visivel: false / erro visivel: [] / selecionado: ["10:30"]
```

### QA023 — APROVADO
- **Feito:** SEC-B ficou parada no passo 4 enquanto SEC-A (2ª aba) reservava 14:00.
- **Observado:** 14:00 sumiu da grade de SEC-B 17,2 s depois, sem ação de SEC-B. O `GET /slots` periódico de SEC-B aparece a cada 30 s (06:11:44, 06:12:14, 06:12:44).
- **Evidências:** `QA023-a-SEC-B-antes.png`, `QA023-b-SEC-B-depois.png`, `QA023.log` (inclui trecho cru de `_full-g2.log` com a cadência)
```
2026-10-17T06:11:44.297Z [SEC-B#1] >> GET .../agendamentos/slots?...
2026-10-17T06:12:14.304Z [SEC-B#1] >> GET .../agendamentos/slots?...
2026-10-17T06:12:44.301Z [SEC-B#1] >> GET .../agendamentos/slots?...
[NOTA] 14:00 sumiu da grade de SEC-B apos 17.2 s sem acao de SEC-B
```

### QA024 — APROVADO (com tratamento da janela visível; ver ocorrência 4)
- **Feito:** com a emulação de foco desligada via CDP, testei duas trocas: (1) outra janela do Chromium vai para a frente e depois a janela de SEC-B volta; (2) foco real do SO via `WScript.Shell.AppActivate`, alternando para um Bloco de Notas aberto pelo script (e fechado pelo próprio PID) e de volta para o Chromium.
- **Observado:** nas duas trocas aconteceu `window blur` → `window focus` e, no mesmo instante, `GET /slots` 200.
- **Evidências:** `QA024-a-antes-de-voltar.png`, `QA024-b.png`, `QA024.log`
```
06:16:18.455Z [SEC-B#1] CONSOLE.log: QA-observador: window blur
06:16:20.985Z [SEC-B#1] >> GET .../v1/api/agendamentos/slots?...
06:16:20.985Z [SEC-B#1] CONSOLE.log: QA-observador: window focus
06:16:26.238Z [SEC-B#1] >> GET .../slots?...   (tentativa 2, AppActivate)
```

### QA025 — APROVADO
- **Observado:** SEC-A fechou o modal (X) com 11:00 reservado → `DELETE /reservas/25fac7fb…` 204. Na grade de SEC-B, 11:00 voltou 14,1 s depois, pela atualização de 30 s (GET às 06:12:44).
- **Evidências:** `QA025-a-SEC-A-fechou.png`, `QA025-b-SEC-B-11h-voltou.png`, `QA025.log`
```
2026-10-17T06:12:30.635Z [SEC-A#1] << 204 DELETE .../v1/api/agendamentos/reservas/25fac7fb-0dcb-4f5e-afa7-c856e166db19
2026-10-17T06:12:44.329Z [SEC-B#1] << 200 GET .../agendamentos/slots?...
```

## 3. Ciclo de vida da reserva

### QA030 — APROVADO
- **Observado:** reservei 15:00 (201) e depois cliquei 15:30 → `DELETE` da reserva de 15:00 (204) e `POST` 201 para 15:30. Só 15:30 fica destacado.
- **Evidências:** `QA030-a-15h.png`, `QA030-b-15h30.png`, `QA030.log`
```
06:18:21.704Z [SEC-A#1] << 204 DELETE .../reservas/e72eb8f5-...
06:18:21.731Z [SEC-A#1] << 201 POST .../reservas BODY={"token":"122eb436-...","dataHoraInicio":"2026-10-21T18:30:00Z",...}
```

### QA031 — APROVADO
- **Observado:** cliquei de novo em 15:30, que já estava reservado: 0 `POST /reservas` e 0 `DELETE` em 3 s, e a faixa continua.
- **Evidências:** `QA031.png`, `QA031.log`

### QA032 — APROVADO
- **Observado:** `dblclick` em 16:00 gerou exatamente 1 `POST /reservas` (201), nenhum 409, e 1 `DELETE` (que libera a 15:30 anterior). Nenhuma reserva órfã: 1 criada, a anterior liberada.
- **Evidências:** `QA032.png`, `QA032.log`
```
[NOTA] apos dblclick: POST reservas=1 (201=1, 409=0), DELETE=1
```

### QA033 — APROVADO
- **Observado:** "Anterior" no passo 4 → `DELETE /reservas/8de2a538…` 204. Ao voltar ao passo 4 não há horário selecionado, a faixa sumiu e "Próximo" está desabilitado.
- **Evidências:** `QA033-a-passo3.png`, `QA033-b-passo4.png`, `QA033.log`

### QA034 — APROVADO
- **Observado:** reservei 16:30 e troquei para o dia 28 → `DELETE` 204 e `GET /slots ...data=2026-10-28` 200. A nova grade carregou sem seleção e sem faixa.
- **Evidências:** `QA034-a-reservado.png`, `QA034-b-dia-28.png`, `QA034.log`

### QA035 — APROVADO
- **Observado:** com a faixa em 09:39, cliquei "Mais tempo" → `POST /reservas/{token}/renovar` 200, e a faixa voltou para 09:58.
- **Evidências:** `QA035-a-antes.png`, `QA035-b-depois.png`, `QA035.log`
```
06:18:56.562Z [SEC-A#1] << 200 POST .../reservas/92dc9520-.../renovar BODY={...,"expiraEm":"2026-10-17T03:28:56...","renovavelAte":"2026-10-17T03:48:36..."}
```

### QA036 — APROVADO
- **Feito:** esperei de verdade, sem renovar: 597 s na 1ª execução (g4a) e 601 s no reteste (`g-qa036b.mjs`).
- **Observado:** a faixa sumiu e apareceu "A reserva do horário expirou e ele pode ser ocupado por outra pessoa. Selecione-o novamente para garantir.". Não houve `CONSOLE.error` nem `PAGEERROR` no período.
- **Sobre o print:** no 1º print (`QA036-c`) o corpo do modal estava rolado para a grade, então a mensagem ficou fora da área capturada (ela estava no DOM). Fiz o reteste e o print `QA036-e` mostra a mensagem visível sem rolar.
- **Evidências:** `QA036-a-inicio.png`, `QA036-b-quase-zero.png`, `QA036-c-expirou.png`, `QA036-d-reteste-inicio.png`, `QA036-e-reteste-expirou-sem-rolar.png`, `QA036-f-reteste-expirou-rolado-para-cima.png`, `QA036.log`, `QA036-b.log`
```
[NOTA] faixa sumiu apos 601 s
[NOTA] mensagem: ["A reserva do horário expirou e ele pode ser ocupado por outra pessoa. Selecione-o novamente para garantir."] ... mensagem dentro da area visivel do corpo sem rolar=true
```

### QA037 — APROVADO
- **Observado:** depois do QA036, avancei e confirmei. `POST /agendamentos` foi enviado **sem** `reservaToken` e retornou 201 (12:30 estava livre). O modal fechou e nenhum erro ou 404 apareceu.
- **Evidências:** `QA037-a-passo5.png`, `QA037-b-resultado.png`, `QA037.log`
```
>> POST .../v1/api/agendamentos BODY={"pacienteId":"693a2996-...","servicoMedicoId":"0f4d2d1e-...","estabelecimentoId":"655759aa-...","tipo":"PRESENCIAL","dataHoraInicio":"2026-10-21T12:30:00-03:00"}
06:39:16.199Z [SEC-A#1] << 201 POST .../v1/api/agendamentos BODY={"id":"fe399bd3-...
```

### QA038 — APROVADO
- **Feito:** SEC-B reservou 17:30 (06:08:48Z) e renovou sempre que faltavam menos de 2:30. Fiquei observando por quase 31 min de tempo real.
- **Observado:** renovação #1 (t=7,5 min) 200 e #2 (t=15,1 min) 200, com o botão ainda visível. A renovação #3 (t=22,7 min) retornou 200 com a expiração limitada a 30 min desde a criação ("expira em 07:15"), e o botão "Mais tempo" sumiu. Nos 4 min seguintes não houve nenhum `/renovar`.
- **Evidências:** `QA038-a-reserva-criada.png`, `QA038-b-renovacao-1.png`, `QA038-b-renovacao-2.png`, `QA038-b-renovacao-3.png`, `QA038-c-sem-botao.png`, `QA038-d-final.png`, `QA038.log`
```
[NOTA] t=22.72min renovacao #3 -> 200; faixa agora: Horário reservado para você — expira em 07:15; botao visivel=false
[NOTA] renovacoes=3; botao sumiu 22.83 min apos criacao
```

### QA039 — APROVADO
- **Observado:** abas 1, 2 e 3 de SEC-A reservaram 08:00, 08:30 e 09:00 (201). A aba 4, em 09:30, recebeu `POST /reservas` 400 e o wizard mostrou "Limite de 3 pré-reservas ativas por usuário. Finalize ou libere uma antes de reservar outra." (texto legível, sem JSON nem stack). Nenhum horário ficou selecionado e não apareceu faixa.
- **Evidências:** `QA039-a-aba1.png`, `QA039-b-aba2.png`, `QA039-c-aba3.png`, `QA039-d-aba4.png`, `QA039.log`
```
[NOTA] aba 4 POST 09:30 -> 400 body={"detail":"Limite de 3 pré-reservas ativas por usuário. ...","status":400,...}
```

## 4. Recarregar, voltar, sessão

### QA040 — APROVADO
- **Feito:** reservei 08:00 e recarreguei. A tecla F5 enviada pelo CDP não recarrega a página, então usei `page.reload()`, que é a mesma ação de recarga do navegador (registrado no log).
- **Observado:** a página recarregou sem erro em `/agendamentos`. Ao refazer o wizard, 08:00 aparece na grade de SEC-A com `title="Reservado por você"`. Na grade de SEC-B, 08:00 não aparece.
- **Evidências:** `QA040-a-reservado.png`, `QA040-b-recarregado.png`, `QA040-c-SEC-A-grade.png`, `QA040-d-SEC-B-grade.png`, `QA040.log`
```
[NOTA] grade SEC-A ao refazer o wizard: ["08:00",...] | contem 08:00? true | title do 08:00=Reservado por você
[NOTA] grade SEC-B: ["08:30",...] | contem 08:00? false
```

### QA041 — APROVADO
- **Observado:** Pacientes → Agendamentos → wizard → reservei 08:30 → `page.goBack()`. A URL foi para `/pacientes` sem erro, e `DELETE /reservas/1ae8ab90…` 204 foi disparado ao desmontar.
- **Evidências:** `QA041-a-reservado.png`, `QA041-b-voltou.png`, `QA041.log`

### QA042 — REPROVADO
- **Feito (como o plano manda):** no passo 4, removi o access token (`tokenStore.clear()`, importando `/src/services/tokenStore.ts` via `page.evaluate`) e o `refresh_token` do localStorage, e cliquei em 09:00.
- **Observado:** a requisição saiu sem Authorization e o backend respondeu **403** (não 401). O interceptor só trata 401, então **não houve** redirecionamento para `/login`. O wizard mostrou a mensagem crua "Request failed with status code 403". Nenhum horário ficou selecionado como reservado.
- **Complementar (`g-qa042b.mjs`):** expiração natural, removendo só o `refresh_token` e esperando o access token (900 s) vencer. O `GET /slots` periódico recebeu 401 e a tela foi para `/login`, mas **sem nenhuma mensagem de sessão expirada** (nenhum toast nem texto com "sessão").
- **Esperado:** redirecionamento para `/login` com mensagem de sessão expirada.
- **Reprodução:**
  1. Logar como secretária e ir em Agendamentos → Novo Agendamento → até o passo 4 (21/10/2026).
  2. No console do navegador: `(await import('/src/services/tokenStore.ts')).tokenStore.clear(); localStorage.removeItem('refresh_token')`.
  3. Clicar em um horário.
  4. Aparece "Request failed with status code 403" em vermelho no wizard e a tela continua em `/agendamentos`. Deveria redirecionar para `/login` com aviso de sessão expirada.
  5. (Variante) Logar, abrir o passo 4, rodar só `localStorage.removeItem('refresh_token')` e esperar ~15 min: a tela vai para `/login` sem nenhuma mensagem.
- **Evidências:** `QA042-a-passo4.png`, `QA042-b-login.png` (mostra o 403 no wizard), `QA042-c-passo4-aguardando.png`, `QA042-d-final.png`, `QA042.log`, `QA042-b.log`
```
06:40:36.733Z [SEC-A#1] >> POST .../v1/api/agendamentos/reservas (sem Authorization) BODY={...,"dataHoraInicio":"2026-10-21T09:00:00-03:00"}
06:40:36.763Z [SEC-A#1] << 403 POST .../v1/api/agendamentos/reservas BODY={"timestamp":"...","status":403,"error":"Forbidden","path":"/v1/api/agendamentos/reservas"}
[NOTA] NAO redirecionou; url=http://localhost:3010/agendamentos
--- variante natural ---
06:56:23.571Z [SEC-A#1] << 401 GET .../agendamentos/slots?... BODY=(sem corpo)
06:56:23.553Z [SEC-A#1] NAVIGATED: http://localhost:3010/login
[NOTA] url final: http://localhost:3010/login | textos "sess": [] | toasts=[]
```

## 5. Erros de API e rede

### QA050 — REPROVADO (só pelo critério "mensagem legível")
- **Feito:** wizard no passo 4. Finalizei o sgsm :8095 (PID 22792) e cliquei em 09:30.
- **Observado:** `POST /reservas` → 500 (vazio, vindo do proxy do Vite) em 228 ms. Os botões voltaram habilitados (16/16) e a tela não travou ("Carregando horários…" não visível). A mensagem exibida foi **"Request failed with status code 500"**, texto técnico do axios em inglês.
- **Esperado:** mensagem de erro legível ao usuário (ex.: serviço indisponível, tente novamente). Os outros dois critérios (botões habilitados, sem travar) foram atendidos.
- **Reprodução:**
  1. Logar como secretária → Novo Agendamento → passo 4 em 21/10/2026.
  2. Parar o sgsm (:8095).
  3. Clicar num horário livre.
  4. Aparece "Request failed with status code 500". Deveria aparecer uma mensagem compreensível para o usuário.
- **Evidências:** `QA050-a-passo4.png`, `QA050-b-erro.png`, `QA050.log`
```
06:56:48.093Z [SEC-A#1] << 500 POST .../v1/api/agendamentos/reservas BODY=
[NOTA] erro: ["Request failed with status code 500"]
[NOTA] botoes de horario habilitados: {"total":16,"habilitados":16}
```

### QA051 — APROVADO
- **Observado:** com o sgsm de volta ("Started SgsmApplication" às 06:57:12Z), cliquei 09:30 de novo, sem recarregar a página → `POST /reservas` 201. A faixa apareceu ("09:59") e o erro sumiu.
- **Evidências:** `QA051.png`, `QA051.log`
```
06:57:15.105Z [SEC-A#1] << 201 POST .../v1/api/agendamentos/reservas BODY={"token":"91cc8b75-...","reservado":true}
```

### QA052 — APROVADO
- **Feito:** SEC-A reservou 13:30 e avançou ao passo 5. Fiquei parado até a reserva expirar (601 s), e o passo 5 passou a mostrar a mensagem de expiração. Então SEC-B agendou 13:30 (reserva 201 + `POST /agendamentos` 201), e SEC-A confirmou.
- **Observado:** `POST /agendamentos` 409 ("já existe agendamento para este médico neste período") com 3 alternativas. O wizard voltou ao "Passo 4 / 5", com a mensagem "Este horário acabou de ser ocupado…" e o bloco de alternativas (14:00, 14:30, 12:00). 13:30 sumiu da grade. Nenhum card duplicado na lista de SEC-A (0 cards de 13:30 criados por SEC-A). Observação: a lista de SEC-A não é recarregada depois do 409, então o card de SEC-B só aparece ao recarregar a página.
- **Evidências:** `QA052-a-SEC-A-passo5-com-reserva.png`, `QA052-b-SEC-A-passo5-sem-reserva.png`, `QA052-c-SEC-B-agendou.png`, `QA052-d-409-passo4.png`, `QA052-e-lista.png`, `QA052.log`
```
[NOTA] SEC-A POST agendamentos -> 409 requestBody={...,"dataHoraInicio":"2026-10-21T13:30:00-03:00"} resposta={"detail":"Horário indisponível: já existe agendamento para este médico neste período.",...,"alternativas":[...14:00...,...14:30...,...12:00...]}
[NOTA] titulo modal: Passo 4 / 5 — Data e Horário
```

## 6. Escopo por perfil

### QA060 — APROVADO
- **Observado:** o passo 3 lista só "Clinica São Lucas". Selecionei e cheguei ao passo 4 → `GET /slots` 200.
- **Evidências:** `QA060-a-passo3.png`, `QA060-b-grade.png`, `QA060.log`

### QA061 — APROVADO
- **Feito:** a Clinica Teste Strix não aparece no passo 3 (ver `QA060-a`). Chamei a URL na mesma sessão com `page.evaluate`, importando o axios da própria app (`import('/src/services/api.ts')` → `api.get('/agendamentos/slots', {params})`). Assim a chamada usa o token em memória (`tokenStore`) da sessão de SEC-A.
- **Observado:** 404 para `medicoId=c00b458a… (Medico Teste Strix) & estabelecimentoId=36a7eb52… (Clinica Teste Strix)`. Como extra, também deu 404 com o Fabio + a clínica Strix. Nenhum 200.
- **Evidências:** `QA061.png`, `QA061.log`
```
06:10:33.754Z [SEC-A#1] << 404 GET .../agendamentos/slots?medicoId=c00b458a-db4b-491e-bcb6-4cdf046a17ba&estabelecimentoId=36a7eb52-9c10-4fc6-904e-04d80747217b&data=2026-10-21 BODY={"detail":"Agenda não encontrada para o médico: c00b458a-...","status":404,...}
```

### QA062 — BLOQUEADO
- **Motivo:** a conta MED `fabioeuro@gmail.com` com a senha fornecida (`famor966`) não autentica: `POST /v1/api/auth/login` → 401 "Credenciais invalidas.", tanto no navegador quanto no curl de verificação. Sem sessão de médico, não dá para testar a grade dele.
- **Evidências:** `QA062.png` (toast "Credenciais invalidas." na tela de login), `QA062.log`
```
06:08:13.631Z [MED#1] << 401 POST .../v1/api/auth/login BODY={"detail":"Credenciais invalidas.","status":401,"title":"Credenciais inválidas",...}
```

### QA063 — APROVADO
- **Feito:** SEC-A → Zilma → "Consulta de Rotina" (Fabio, R$ 1.000,00; há 2 serviços com esse nome e escolhi o 1º) → Domiciliar → dia 22 → 10:00 → Confirmar.
- **Observado:** `GET /slots` (sem estabelecimento) 200, `POST /reservas` 201 (`tipo":"DOMICILIAR"`) e `POST /agendamentos` 201 com `reservaToken`.
- **Achado extra:** esse agendamento domiciliar não aparece na lista de agendamentos da própria SEC-A (procurei pelo filtro Zilma). Só o DEV o enxergou e cancelou no QA099.
- **Evidências:** `QA063-a-passo3.png`, `QA063-b-reservado.png`, `QA063-c-resumo.png`, `QA063-d-lista.png`, `QA063.log`
```
06:41:35.080Z [SEC-A#1] << 201 POST .../agendamentos/reservas BODY={"token":"0a83a6b1-...","dataHoraInicio":"2026-10-22T13:00:00Z",...}
06:41:35.922Z [SEC-A#1] << 201 POST .../v1/api/agendamentos BODY={"id":"649d7acb-c4e5-407f-94d5-0c0070eec642",...
```

## 7. Chatbot

### QA070 — APROVADO
- **Observado:** chatbot → Agendar → CPF 945.231.794-56 (Zilma) → QA Descartavel → Clinica São Lucas → 21/10/2026 → 14:30. `POST /reservas` 201 e a mensagem "Horário reservado para você por alguns minutos. Tem alguma observação…".
- **Evidências:** `QA070.png`, `QA070.log`

### QA071 — APROVADO
- **Observado:** Enter (sem observação) → resumo → "Sim, confirmar" → `POST /agendamentos` 201 com `reservaToken` → "Agendamento realizado com sucesso!…".
- **Evidências:** `QA071-a-resumo.png`, `QA071-b-sucesso.png`, `QA071.log`
```
>> POST .../v1/api/agendamentos BODY={...,"dataHoraInicio":"2026-10-21T14:30:00-03:00","reservaToken":"748b8b44-87e7-4ef4-9d0e-393515ea2398"}
06:30:01.126Z [SEC-A#1] << 201 POST .../v1/api/agendamentos BODY={"id":"52ff9bde-...
```

### QA072 — APROVADO
- **Observado:** a lista do chatbot de SEC-A tinha 15:30. SEC-B reservou 15:30 no wizard (201) e depois SEC-A escolheu 15:30 no chatbot → 409. O bot respondeu "Esse horário acabou de ser ocupado. Estes horários próximos estão livres:" com botões 15:00, 16:00 e 16:30. Escolhi a 1ª alternativa → `POST /reservas` 201 e a mensagem de reservado. A reserva foi liberada depois com "Não, cancelar" (DELETE 204).
- **Evidências:** `QA072-a-lista-SEC-A.png`, `QA072-b-SEC-B-reservou.png`, `QA072-c-409-alternativas.png`, `QA072-d-alternativa-reservada.png`, `QA072.log`

### QA073 — APROVADO
- **Observado:** reservei 15:00 no chatbot (201) → Enter → "Não, cancelar" → `DELETE /reservas/534ad1d1…` 204 → "Agendamento cancelado.".
- **Evidências:** `QA073.png`, `QA073.log`
```
06:30:05.543Z [SEC-A#1] << 204 DELETE .../v1/api/agendamentos/reservas/534ad1d1-c0da-45e7-bc37-3827b185f265
```

### QA074 — APROVADO
- **Observado:** "32/13/2026", "abc" e vazio dão, cada um, "Data inválida. Use o formato DD/MM/AAAA.", com 0 chamadas `/v1/api` no período. Obs.: a máscara do campo só aceita dígitos, então "abc" digitado vira campo vazio e o Enter envia vazio.
- **Evidências:** `QA074.png`, `QA074.log`

## 8. Edge cases de entrada

### QA080 — APROVADO (com observação)
- **Observado no wizard:** o domingo 25/10 aparece desabilitado no calendário. O clique forçado não seleciona o dia, não chama a API e não tenta reserva. A mensagem "Sem horários disponíveis nesta data" **não é alcançável** pelo wizard, porque o calendário já impede escolher o dia.
- **Observado no chatbot:** digitei 25/10/2026 → `GET /slots ...data=2026-10-25` 200 `[]` → "Sem horários disponíveis nesta data. Informe outra data:". Nenhuma reserva tentada.
- **Evidências:** `QA080-a-calendario.png`, `QA080-b-chatbot.png`, `QA080.log` (inclui `QA080-chatbot.log`)
```
06:30:26.262Z [SEC-A#1] << 200 GET .../agendamentos/slots?...&data=2026-10-25 BODY=[]
[NOTA] bot: ["Sem horários disponíveis nesta data. Informe outra data:"] | POST reservas=0
```

### QA081 — APROVADO
- **Observado:** todas as células de 1 a 20/10 estão `disabled`, incluindo a quarta 14/10. O clique forçado no 14 não abriu a grade.
- **Evidências:** `QA081.png`, `QA081.log`

### QA082 — BLOQUEADO
- **Motivo:** não há caminho de UI que gere 409 sem alternativas. O backend (`AgendamentoService.alternativas`) procura horários livres nos dias seguintes e sempre devolveu alternativas. Lista vazia só sai de casos internos: contenção da trava Redis de 5 s com retentativas, em `ReservaHorarioService.adquirirTrava`, e corrida na constraint de exclusão do banco.
- **Tentativa feita:** cliques simultâneos de SEC-A e SEC-B (3 pares de horários diferentes, todos 201) e no mesmo horário 17:00 (um 201 e um 409 **com** 3 alternativas). O bloco de alternativas nunca apareceu vazio, mas também não foi possível provocar o caso pedido.
- **Evidências:** `QA082-a-SEC-A.png`, `QA082-b-SEC-B.png`, `QA082.log`
```
[NOTA] mesmo horario 17:00 simultaneo: SEC-A -> 409 {"detail":"Horário em pré-reserva por outro usuário...","alternativas":[...16:30...,...17:30...,...16:00...]} | SEC-B -> 201
```

### QA083 — APROVADO
- **Observado:** a partir de 09:00, dois Tab levaram o foco a 10:30 (10:00 já estava ocupado). O foco ficou visível (`:focus-visible`, outline `auto`), como mostra o print. Enter → `POST /reservas` 201 para 10:30, que ficou selecionado. Shift+Tab → 09:30 + Espaço → `POST` 201 para 09:30, que ficou selecionado.
- **Evidências:** `QA083-a-foco.png`, `QA083-b-enter.png`, `QA083-c-espaco.png`, `QA083.log`
```
[NOTA] elemento focado apos Tab: {"texto":"10:30","outline":"auto 0.666667px rgb(16, 16, 16)","focusVisible":true}
[NOTA] Enter -> POST 201 body={...,"dataHoraInicio":"2026-10-21T10:30:00-03:00"}
```

## 9. Regressão

### QA090 — APROVADO
- **Observado:** a lista carregou 17 cards. Filtros: Pendente = 11 cards, todos com badge "Pendente"; Cancelado = 2; médico "Fabio Monteiro Amorim" pela sugestão = 17; paciente "Zilma" = 6 cards, todos de Zilma Ruela. Cada filtro gerou o `GET /agendamentos` com o parâmetro correspondente.
- **Evidências:** `QA090-a-todos.png`, `QA090-b-pendente.png`, `QA090-c-medico.png`, `QA090-d-paciente.png`, `QA090.log`

### QA091 — APROVADO
- **Observado:** no card 21/10 14:30 (criado no chatbot), fui em Cancelar → Origem "Estabelecimento" + motivo → `PATCH /agendamentos/52ff9bde…/cancelar` 204. Ao reabrir a grade de 21/10, 14:30 voltou a aparecer.
- **Evidências:** `QA091-a-modal.png`, `QA091-b-cancelado.png`, `QA091-c-grade.png`, `QA091.log`
```
06:42:17.883Z [SEC-A#1] << 204 PATCH .../v1/api/agendamentos/52ff9bde-ce6b-42f8-a5ae-f9f9a00664fa/cancelar
[NOTA] grade 21/10 apos cancelar: [...,"14:30",...] | contem 14:30? true
```

### QA092 — APROVADO
- **Observado:** no card 21/10 10:00 (Pendente), cliquei "Confirmar" → `PATCH /status` 200 `{"status":"CONFIRMADO"}`. O badge virou "Confirmado" e o botão seguinte passou a ser "Iniciar".
- **Evidências:** `QA092.png`, `QA092.log`

### QA093 — APROVADO
- **Observado:** chatbot → Cadastrar-me → nome, CPF 529.982.247-25, 10/05/1990, e-mail, telefone pulado → apareceu o texto de consentimento LGPD com "Sim, concordo" e "Não concordo". Parei ali e reiniciei, sem concluir o cadastro (nenhum `POST /pacientes`).
- **Evidências:** `QA093.png`, `QA093.log`

### QA094 — APROVADO
- **Observado:** login do DEV com senha errada → toast "Credenciais invalidas." (mesmo texto do `detail` da API). O texto continua legível após a troca para `ApiError`.
- **Evidências:** `QA094.png`, `QA094.log`
```
06:07:56.090Z [DEV#1] << 401 POST .../v1/api/auth/login BODY={"detail":"Credenciais invalidas.",...}
[NOTA] Toast visivel: ["Credenciais invalidas."]
```

## 10. Limpeza

### QA099 — REPROVADO (só pelo critério Redis; o resto foi cumprido)
- **Feito:**
  - Cancelei pela UI, como SEC-A: `801d80cf` (10:00), `fe399bd3` (12:30), `375cf1bd` (13:00) e `2e7b7b5a` (13:30), todos PATCH `/cancelar` 204. O `52ff9bde` (14:30) já tinha sido cancelado no QA091.
  - O domiciliar `649d7acb` (22/10 10:00) não aparece para SEC-A e foi cancelado pelo DEV na UI (204).
  - Inativei as duas secretárias pela tela `/funcionarios` (DEV), com `DELETE /funcionarios/{id}` 204. Os cards mostram "Inativo".
- **Redis (`docker exec redis-sgsm redis-cli --scan --pattern "sgsm:reserva*"`):**
  - Nenhuma chave de reserva `sgsm:reserva:<token>` ficou.
  - Restaram **2 chaves de índice** que casam com o padrão: `sgsm:reservas:dono:13daf867-…` (SEC-A) e `sgsm:reservas:medico:ff9a2400-…`. São zset com TTL ≈ 24 h e 1 membro cada (`ba1cb57a…`, token já expirado, `EXISTS = 0`).
  - Esse token é a reserva que expirou sozinha no reteste do QA036. O backend não tira o token do índice quando a reserva expira; só limpa no próximo cálculo de reservas ativas do mesmo dono.
- **Esperado:** nenhuma chave `sgsm:reserva*` remanescente.
- **Reprodução:**
  1. Reservar um horário e deixar a reserva expirar (10 min).
  2. Rodar `docker exec redis-sgsm redis-cli --scan --pattern "sgsm:reserva*"`.
  3. As chaves `sgsm:reservas:dono:<id>` e `sgsm:reservas:medico:<id>` continuam lá (TTL 1 dia) apontando para o token expirado. Pelo critério do plano, não deveria sobrar nenhuma chave nesse padrão.
- **Evidências:** `QA099-a-antes.png`, `QA099-b-depois.png`, `QA099-c-agendamentos-DEV.png`, `QA099-d-funcionarios.png`, `QA099.log` (inclui `QA099-a.log`, `QA099-b.log` e a saída crua do Redis)
```
# --- Redis 2026-10-17T07:08:43Z: docker exec redis-sgsm redis-cli --scan --pattern "sgsm:reserva*" ---
sgsm:reservas:dono:13daf867-9273-4cb0-a6c1-e9f9b7659bb6
sgsm:reservas:medico:ff9a2400-2217-48fa-ac91-b81a4032f2db
## sgsm:reservas:dono:13daf867-... type=zset ttl=85761 zcard=1
   membro ba1cb57a-5a26-4992-ad2e-11f865c934fd -> EXISTS sgsm:reserva:ba1cb57a-... = 0
# --- scan sgsm:reserva:* (chaves de reserva) ---
(fim)
```

---

## Resumo

| Status | Itens |
|---|---|
| APROVADO (44) | QA000, QA001, QA010–QA015, QA020–QA025, QA030–QA041, QA051, QA052, QA060, QA061, QA063, QA070–QA074, QA080, QA081, QA083, QA090–QA094 |
| REPROVADO (3) | QA042, QA050, QA099 |
| BLOQUEADO (2) | QA062, QA082 |

Achados fora dos itens:
- O agendamento domiciliar criado pela secretária não aparece na lista de agendamentos dela (QA063/QA099).
- Depois de um 409 na confirmação, a lista de agendamentos não é recarregada (QA052).

---

## Rodada 2 (reteste)

> **Data:** 2026-10-17, UTC 14:38–15:37. **Ferramenta:** a mesma da rodada 1, Playwright como biblioteca Node com `chromium.launch({ headless: false, slowMo: 150 })` (janela visível em todos os scripts). Não usei mock, nem `page.route`, nem SQL. Cada sessão independente roda num `browser.newContext()` próprio.
> **Ambiente conferido antes:** `curl` front :3010 → 200; sgsm :8095 sem token → **401** (na rodada 1 era 403); auth :8081 no ar. O sgsm de QA era o PID 30084 (`Started SgsmApplication` às 14:37:34Z).
> **Scripts:** `qa-scratch/r2-*.mjs`, que reaproveitam `lib.mjs` e `contas.json`. Os dados criados nesta rodada estão em `qa-scratch/contas-r2.json`. Logs completos por script: `evidence/_full-r2-*.log`. Tokens, Authorization e senhas aparecem mascarados (`***`) nos logs, e conferi com grep que nenhuma senha nem JWT vazou.

### Preparação da rodada 2 (feita pela UI, como DEV)
- **Secretárias:** **reativei** as duas secretárias da rodada 1 (SEC-A `qa.conflito.seca.1792217275275@teste.com`, SEC-B `qa.conflito.secb.1792217275275@teste.com`) em `/funcionarios` → filtro "Inativos" → "Reativar": `PATCH /funcionarios/7f5a6eac…/reativar` 200 e `PATCH /funcionarios/8cb964bc…/reativar` 200. Não criei secretárias novas.
- **Médico do QA082:** cadastrei "QA Medico Unico Horario" (`c68d2647…`) em `/medicos` → "Novo Médico" (201). Vinculei à Clinica São Lucas em `/estabelecimentos` → "Gerenciar médicos" (`PUT /estabelecimentos/655759aa…/medicos` 204, mantendo os vínculos que já existiam). Criei o serviço presencial "QA Unico Horario" (30 min, `0b04729e…`, 201) e uma agenda **sexta 08:00–08:30**, slot de 30 min, Clinica São Lucas, vigência a partir de 2026-10-17 (`a6fb0500…`, 201).
- **Médico com login (QA062):** "QA Medico Login" (`b13bedee…`, auth `a0e8696e…`). Os detalhes estão no QA062.
- **Médico de fora (QA064):** "QA Medico Fora" (`e5230be1…`), **sem vínculo** com nenhum estabelecimento, com o serviço domiciliar "QA Domiciliar Fora" e uma agenda domiciliar às quintas 08:00–10:00 (Brasília/DF). Os detalhes estão no QA064.
- **Evidências:** `SETUP-r2-a-secretarias-reativadas.png`, `SETUP-r2-b-novo-medico-form.png`, `SETUP-r2-c-vinculo.png`, `SETUP-r2-d-servico.png`, `SETUP-r2-e-agenda-form.png`, `SETUP-r2-f-agenda-salva.png`, `SETUP-r2.log`
```
[NOTA] reativar qa.conflito.seca...: PATCH http://localhost:3010/v1/api/funcionarios/7f5a6eac-a3f7-460d-b01a-b9ef6eea163d/reativar -> 200
[NOTA] reativar qa.conflito.secb...: PATCH http://localhost:3010/v1/api/funcionarios/8cb964bc-9517-43ff-8c78-4a34fe585602/reativar -> 200
[NOTA] POST agenda-medico -> 201 body={"estabelecimentoId":"655759aa-...","diaSemana":"SEXTA","horaInicio":"08:00","horaFim":"08:30","duracaoSlotMinutos":30,"dataVigenciaInicio":"2026-10-17","domiciliar":false,"medicoId":"c68d2647-..."}
```

### QA042-r2 — APROVADO
- **Feito:** três cenários, todos no passo 4 (Fabio, 21/10, Clinica São Lucas):
  1. **Passos da rodada 1:** `tokenStore.clear()` + `localStorage.removeItem('refresh_token')`, depois clique em 09:00.
  2. **Variação pedida:** access token **inválido** (`tokenStore.set('qa-invalido…')`) + `refresh_token` removido, depois clique em 09:30.
  3. **Variante natural da rodada 1** (SEC-B): removi só o `refresh_token` e esperei, sem nenhuma ação, o access token vencer.
- **Observado:**
  - **Cenários 1 e 2:** `POST /reservas` → **401**. Não houve chamada a `/auth/refresh`, porque não havia refresh token. A página foi para `/login?sessao=expirada` e o alerta **"Sua sessão expirou. Faça login novamente."** ficou visível. "Request failed" não apareceu. Depois de logar de novo e abrir o passo 4, o horário clicado não tem `title` "Reservado por você", não há faixa de reserva e nenhum horário fica selecionado, ou seja, nada ficou preso como reservado.
  - **Cenário 3:** após 902 s, o `GET /slots` periódico recebeu 401, a página foi para `/login?sessao=expirada` e a mesma mensagem ficou visível.
- **Esperado = observado.**
- **Evidências:** `QA042-r2-1-a-passo4.png`, `QA042-r2-1-b-login.png`, `QA042-r2-1-c-relogado.png`, `QA042-r2-2-a-passo4.png`, `QA042-r2-2-b-login.png`, `QA042-r2-2-c-relogado.png`, `QA042-r2-3-a-passo4-aguardando.png`, `QA042-r2-3-b-login.png`, `QA042-r2.log`, `QA042-r2-natural.log`
```
14:48:26.683Z [SEC-A#1] NAVIGATED: http://localhost:3010/login?sessao=expirada
14:48:26.700Z [SEC-A#1] << 401 POST http://localhost:3010/v1/api/agendamentos/reservas BODY=(sem corpo)
[NOTA] [sem-tokens] alerta na tela de login: ["Sua sessão expirou. Faça login novamente."] | texto "Sua sessão expirou" visivel: true
[NOTA] [sem-tokens] POST /reservas: 1 | respostas reservas: ["401"] | /auth/refresh chamadas: 0 | "Request failed": 0
14:48:37.443Z [SEC-A#1] << 401 POST http://localhost:3010/v1/api/agendamentos/reservas BODY=(sem corpo)      (cenario 2, access invalido)
[NOTA] [access-invalido] redirecionou: true | url=http://localhost:3010/login?sessao=expirada
--- natural ---
15:03:24.680Z [SEC-B#1] NAVIGATED: http://localhost:3010/login?sessao=expirada
15:03:24.694Z [SEC-B#1] << 401 GET http://localhost:3010/v1/api/agendamentos/slots?medicoId=ff9a2400-...&data=2026-10-21 BODY=(sem corpo)
[NOTA] redirecionou=true apos 902 s | url=http://localhost:3010/login?sessao=expirada
[NOTA] alerta: ["Sua sessão expirou. Faça login novamente."]
```

### QA050-r2 — APROVADO
- **Feito:** SEC-A no passo 4 (21/10). Finalizei o sgsm :8095 (PID 30084, `taskkill /F`, às 15:03:43Z) e cliquei em 09:30. Depois, ainda com o backend fora, troquei para o dia 28 e voltei para o 21.
- **Observado:**
  - `POST /reservas` → 500 (corpo vazio, gerado pelo proxy do Vite) em 229 ms.
  - Mensagem no wizard: **"Serviço temporariamente indisponível. Tente novamente em instantes."** Nenhum "Request failed" na tela.
  - Botões habilitados (19/19) e "Carregando horários…" não visível.
  - Na troca de dia, `GET /slots` também deu 500 e a mesma mensagem legível apareceu.
- **Evidências:** `QA050-r2-a-passo4.png`, `QA050-r2-b-erro.png`, `QA050-r2-c-troca-de-dia.png`, `QA050-r2.log`
```
15:03:45.979Z [SEC-A#1] << 500 POST http://localhost:3010/v1/api/agendamentos/reservas BODY=
[NOTA] [clique 09:30] erro: ["Serviço temporariamente indisponível. Tente novamente em instantes."]
[NOTA] [clique 09:30] "Request failed" na tela: 0
[NOTA] [clique 09:30] botoes de horario: {"total":19,"habilitados":19}
15:03:47.902Z [SEC-A#1] << 500 GET http://localhost:3010/v1/api/agendamentos/slots?...&data=2026-10-28 BODY=
[NOTA] [troca para o dia 28] mensagens visiveis: ["Serviço temporariamente indisponível. Tente novamente em instantes."] | "Request failed": 0
```

### QA051-r2 — APROVADO
- **Feito:** subi o sgsm de QA com o comando indicado. O log registrou `Started SgsmApplication in 12.854 seconds` às 15:04:14Z (PID novo 32512). Sem recarregar a página, cliquei em 09:30 de novo.
- **Observado:** `POST /reservas` 201, a faixa "Horário reservado para você — expira em 09:59" apareceu e a mensagem de erro sumiu. A URL continuou `/agendamentos`. Ao fechar o modal, a reserva foi liberada.
- **Estado final:** o sgsm de QA está de pé. `curl :8095` sem token responde 401 depois de todo o QA.
- **Evidências:** `QA051-r2.png`, `QA051-r2.log`
```
15:04:18.691Z [SEC-A#1] << 201 POST http://localhost:3010/v1/api/agendamentos/reservas BODY={"token":"411f4073-...","dataHoraInicio":"2026-10-21T12:30:00Z",...,"reservado":true}
[NOTA] faixa: Horário reservado para você — expira em 09:59 | erro: [] | url=http://localhost:3010/agendamentos
```

### QA052-r2 — APROVADO
- **Feito:** SEC-A reservou 15:00 em 21/10 (horário sem agendamento anterior: 0 cards antes), avançou ao passo 5 e ficou parada até a reserva expirar (601 s). O passo 5 mostrou "A reserva do horário expirou…". Em seguida, SEC-B (outro contexto) reservou e agendou 15:00 (`70e32a10…`, 201), e SEC-A confirmou.
- **Observado:**
  - `POST /agendamentos` de SEC-A → **409** ("já existe agendamento para este médico neste período") com 3 alternativas.
  - O wizard voltou para "Passo 4 / 5 — Data e Horário" com "Este horário acabou de ser ocupado… Veja abaixo os horários próximos disponíveis." e o bloco de alternativas (14:30, 15:30, 14:00).
  - 15:00 sumiu da grade.
  - Na lista existe só 1 card de 21/10 15:00, o de SEC-B. Não há card duplicado.
- **Evidências:** `QA052-r2-a-SEC-A-passo5-com-reserva.png`, `QA052-r2-b-SEC-A-passo5-sem-reserva.png`, `QA052-r2-c-SEC-B-agendou.png`, `QA052-r2-d-409-passo4.png`, `QA052-r2.log`
```
[NOTA] faixa sumiu no passo 5 apos 601 s; erro exibido=["A reserva do horário expirou e ele pode ser ocupado por outra pessoa. Selecione-o novamente para garantir."]
[NOTA] SEC-B POST agendamentos 15:00 -> 201 id=70e32a10-d8cd-4a20-92cf-ca81ced30938
14:59:33.208Z [SEC-A#1] << 409 POST http://localhost:3010/v1/api/agendamentos BODY={"detail":"Horário indisponível: já existe agendamento para este médico neste período.",...,"alternativas":[{"dataHoraInicio":"2026-10-21T14:30:00-03:00",...},{..."15:30..."},{..."14:00..."}]}
[NOTA] titulo modal: Passo 4 / 5 — Data e Horário
[NOTA] grade: [...,"14:30","15:30",...] | contem 15:00? false
```

### QA053-r2 — APROVADO
- **Feito:** continuação do QA052-r2, sem recarregar a página.
- **Observado:**
  - Junto com o 409, saiu `GET /agendamentos` 200 (pedido às 14:59:33.197Z, resposta às 14:59:33.280Z), e a resposta contém o agendamento de SEC-B (`70e32a10…`).
  - Com o modal ainda aberto, a lista ao fundo já tinha o card "Zilma Ruela | QA Descartavel | Pendente | Fabio Monteiro Amorim | Clinica São Lucas | 21/10/2026, 15:00".
  - Fechar o modal não disparou outro `GET /agendamentos` (0), e o card continuou lá, com a URL `/agendamentos` e sem reload.
- **Observação (não reprova):** pelo código (`AgendamentosPage.tsx`), essa recarga passa só o filtro de status (`listar(filtroStatus ? { status } : {})`). Neste teste a lista estava sem filtros. Não testei com filtro de médico ou de paciente ativo.
- **Evidências:** `QA052-r2-d-409-passo4.png` (lista ao fundo), `QA053-r2-lista-SEC-A.png`, `QA053-r2.log` (inclui o trecho cru do 409 e do GET copiado de `QA052-r2.log`)
```
14:59:33.197Z [SEC-A#1] >> GET http://localhost:3010/v1/api/agendamentos Authorization: Bearer ***
14:59:33.208Z [SEC-A#1] << 409 POST http://localhost:3010/v1/api/agendamentos BODY={"detail":"Horário indisponível: ...
14:59:33.280Z [SEC-A#1] << 200 GET http://localhost:3010/v1/api/agendamentos BODY=[...]
[NOTA] resposta da lista contem o agendamento de SEC-B (70e32a10-d8cd-4a20-92cf-ca81ced30938): true
[NOTA] (modal aberto) cards 21/10/2026, 15:00 no DOM da lista de SEC-A: 1 ["Zilma Ruela | | QA Descartavel | | Pendente | Fabio Monteiro Amorim | Clinica São Lucas | 21/10/2026, 15:00 | Cancelar | Confirmar"]
[NOTA] GET /agendamentos disparados ao fechar o modal: 0
```

### QA063-r2 — APROVADO
- **Feito:** SEC-A → Zilma → "Consulta de Rotina" (Fabio) → Domiciliar → 22/10 → 10:00 → Confirmar.
- **Observado:** `GET /slots` (sem estabelecimento) 200, `POST /reservas` 201 e `POST /agendamentos` 201 (`79c940ea…`, `tipo=DOMICILIAR`, com `reservaToken` no corpo).
- **Evidências:** `QA063-r2.png`, `QA063-r2.log`
```
14:46:53.157Z [SEC-A#1] << 201 POST http://localhost:3010/v1/api/agendamentos/reservas BODY={"token":"75853b33-...","dataHoraInicio":"2026-10-22T13:00:00Z",...}
14:46:53.594Z [SEC-A#1] << 201 POST http://localhost:3010/v1/api/agendamentos BODY={"id":"79c940ea-e1dd-49c4-8468-16850599bad0",...,"pacienteEndereco":"Rua 36, 4530, ..."
```

### QA064-r2 — APROVADO
- **Descoberta (DEV):** a lista do DEV (23 agendamentos) tinha 4 domiciliares, todos do Fabio, que é vinculado à São Lucas. Não havia nenhum domiciliar de médico sem vínculo com a São Lucas. Os vínculos da São Lucas na tela eram: QA Registro Seletor Teste, Fabio Monteiro Amorim e os dois médicos de QA desta rodada.
- **Preparação do "de fora", pela UI como DEV:** criei "QA Medico Fora" (sem vínculo), o serviço domiciliar "QA Domiciliar Fora" e uma agenda domiciliar às quintas. Pelo wizard, o DEV agendou um domiciliar para Zilma em 22/10 08:00: `POST /reservas` 201 e `POST /agendamentos` 201 (`d7eee134…`, DOMICILIAR).
- **Feito (SEC-A):** recarreguei `/agendamentos` depois do QA063-r2.
- **Observado:**
  - O `GET /agendamentos` de SEC-A traz 5 domiciliares, todos do Fabio, incluindo o recém-criado `79c940ea…` e os antigos `f311eac7…`, `35f42fbe…` e `489caf28…`.
  - O card "Zilma Ruela | Consulta de Rotina | Pendente | Fabio Monteiro Amorim | Domiciliar — Rua 36… | 22/10/2026, 10:00 | Cancelar | Confirmar" aparece na tela.
  - Cancelar pelo card (Origem Estabelecimento + motivo) → `PATCH /agendamentos/79c940ea…/cancelar` **204**, e o badge virou "Cancelado".
  - O domiciliar do médico de fora (`d7eee134…`) **não** está na resposta da lista, e nenhum card "QA Medico Fora" ou "QA Domiciliar Fora" aparece na tela.
- **Evidências:** `QA064-r2-a-DEV-lista.png`, `QA064-r2-b-vinculos-sao-lucas.png`, `QA064-r2-c-agenda-fora.png`, `QA064-r2-d-DEV-criou-domiciliar-fora.png`, `QA064-r2-e-lista-SEC-A.png`, `QA064-r2-f-cancelado.png`, `QA064-r2.log`, `QA064-r2-descoberta.log`, `QA064-r2-setup.log`
```
[NOTA] GET http://localhost:3010/v1/api/agendamentos -> 200 total=24 | DOMICILIAR=[{"id":"649d7acb-...","medico":"Fabio Monteiro Amorim",...,"status":"CANCELADO"},{"id":"f311eac7-..."},{"id":"79c940ea-...","status":"PENDENTE"},{"id":"35f42fbe-..."},{"id":"489caf28-..."}]
[NOTA] contem o domiciliar criado por SEC-A (79c940ea-...): true | contem o domiciliar do medico de fora (d7eee134-4a4d-42b0-832f-5b00affadc47): false | algum card do medico de fora: false
14:46:59.963Z [SEC-A#1] << 204 PATCH http://localhost:3010/v1/api/agendamentos/79c940ea-e1dd-49c4-8468-16850599bad0/cancelar BODY=
```

### QA062-r2 — APROVADO
- **Caminhos tentados para obter um login de MEDICO pela aplicação:**
  1. **`/medicos` (DEV):** o modal "Novo Médico" só tem Nome, CRM, UF do CRM, Especialidade, E-mail e Telefone. Não há senha nem criação de login. O médico é criado sem login.
  2. **`/registrar`, anônimo, tipo "Médico":** `POST /v1/api/medicos` sem Authorization → **401**. A tela foi para `/login?sessao=expirada` com "Sua sessão expirou. Faça login novamente." Não criou médico nem login (ver achado A1 abaixo).
  3. **`/registrar` com a sessão do DEV ativa** (cheguei por navegação SPA, sem recarregar): `POST /medicos` (com o token do DEV) 201 → `POST /auth/registrar` com `tipoPerfil: "MEDICO"` 201. **Foi este o caminho que funcionou.** Ele criou o médico "QA Medico Login" (`b13bedee…`) com login (auth `a0e8696e…`). O `/registrar` sempre cria um médico novo, então não é possível vincular o login a um médico que já existe.
- **Preparação (DEV, UI):** vinculei "QA Medico Login" à Clinica São Lucas (`PUT …/medicos` 204), criei o serviço "QA Servico Medico Login" e uma agenda às segundas 08:00–10:00 na São Lucas.
- **Feito (MEDICO):** login → `/auth/me` com perfil `MEDICO`. Abri o wizard (Zilma → QA Servico Medico Login → Presencial/São Lucas → 19/10). Depois, como no QA061, usei o axios da própria app com o token em memória para pedir a grade do Fabio (`ff9a2400…`, estabelecimento `655759aa…`).
- **Observado:** grade da própria agenda **200** (08:00, 08:30, 09:00, 09:30), tanto no wizard quanto na chamada direta. Grade do Fabio **404** "Agenda não encontrada para o médico: ff9a2400-…". Nenhum 200 com dados de outro médico.
- **Evidências:** `QA062-r2-a-registrar-form.png`, `QA062-r2-b-registrar-resultado.png`, `QA062-r2-c-registrar-logado-form.png`, `QA062-r2-d-registrar-logado-resultado.png`, `QA062-r2-e-agenda-medico-login.png`, `QA062-r2-f-medico-logado.png`, `QA062-r2-g-grade-propria.png`, `QA062-r2-h-apos-chamadas.png`, `QA062-r2.log`, `QA062-r2-registrar.log`, `QA062-r2-registrar-logado.log`, `QA062-r2-setup.log`
```
--- /registrar anonimo ---
14:41:45.171Z [ANON#1] << 401 POST http://localhost:3010/v1/api/medicos BODY=(sem corpo)
14:41:45.161Z [ANON#1] NAVIGATED: http://localhost:3010/login?sessao=expirada
--- /registrar com sessao DEV ---
14:42:50.220Z [DEV#1] << 201 POST http://localhost:3010/v1/api/medicos BODY={"id":"b13bedee-e771-481e-9efe-c812639b35ed","nome":"QA Medico Login",...}
14:42:50.508Z [DEV#1] << 201 POST http://localhost:3010/v1/api/auth/registrar BODY={"id":"a0e8696e-...","tipoPerfil":"MEDICO","referenciaId":"b13bedee-..."}
--- MEDICO ---
14:43:49.138Z [MED#1] << 200 POST http://localhost:3010/v1/api/auth/login BODY={"accessToken":"***","expiresIn":900,"refreshToken":"***",...}
14:43:51.550Z [MED#1] << 200 GET http://localhost:3010/v1/api/agendamentos/slots?medicoId=b13bedee-...&estabelecimentoId=655759aa-...&data=2026-10-19 BODY=[{"dataHoraInicio":"2026-10-19T08:00:00-03:00",...
[NOTA] chamadas na sessao MEDICO: {"propria":{"status":200,"n":4},"fabio":{"status":404,"msg":"Agenda não encontrada para o médico: ff9a2400-2217-48fa-ac91-b81a4032f2db"}}
```

### QA082-r2 — APROVADO
- **Feito:** usei o cenário montado pela UI (médico de QA com um único horário: sexta 23/10 08:00). SEC-B abriu o passo 4 em 23/10 (grade `["08:00"]`). SEC-A abriu o mesmo dia e reservou 08:00 (201). SEC-B clicou em 08:00 na grade desatualizada.
- **Observado:**
  - `POST /reservas` de SEC-B → **409** com `"alternativas":[]`. A busca de alternativas do backend cobre 7 dias a partir do pedido, e a próxima sexta (30/10) fica fora desse intervalo.
  - Mensagem: **"Este horário acabou de ser ocupado ou está reservado por outra pessoa. Escolha outro horário."**
  - O bloco "Horários próximos disponíveis" não está no DOM (0 ocorrências), ou seja, não há bloco vazio.
  - A grade foi recarregada (`GET /slots` 200 `[]`) e mostra "Sem horários disponíveis nesta data".
  - SEC-A fechou o modal → `DELETE /reservas` 204.
- **Evidências:** `QA082-r2-a-SEC-B-grade-antes.png`, `QA082-r2-b-SEC-A-reservou.png`, `QA082-r2-c-SEC-B-409-sem-alternativas.png`, `QA082-r2.log`
```
14:47:44.541Z [SEC-A#1] << 201 POST http://localhost:3010/v1/api/agendamentos/reservas BODY={"token":"d30fe96c-...","dataHoraInicio":"2026-10-23T11:00:00Z",...}
14:47:44.962Z [SEC-B#1] << 409 POST http://localhost:3010/v1/api/agendamentos/reservas BODY={"detail":"Horário em pré-reserva por outro usuário. Escolha outro horário.",...,"alternativas":[]}
14:47:44.979Z [SEC-B#1] << 200 GET http://localhost:3010/v1/api/agendamentos/slots?medicoId=c68d2647-...&estabelecimentoId=655759aa-...&data=2026-10-23 BODY=[]
[NOTA] SEC-B mensagem de erro: ["Este horário acabou de ser ocupado ou está reservado por outra pessoa. Escolha outro horário."]
[NOTA] SEC-B bloco "Horários próximos disponíveis" no DOM: 0
```

### Regressão

#### QA094-r2 — APROVADO
- **Observado:** login do DEV com senha errada → 401 e toast "Credenciais invalidas." (igual ao `detail` do backend). A tela fica em `/login`, sem `?sessao=expirada` e sem "Request failed".
- **Evidências:** `QA094-r2.png`, `QA094-r2.log`
```
14:41:41.318Z [DEV#1] << 401 POST http://localhost:3010/v1/api/auth/login BODY={"detail":"Credenciais invalidas.",...}
[NOTA] URL: http://localhost:3010/login | Toast visivel: ["Credenciais invalidas."] | contem "Request failed": 0
```

#### QA001-r2 — APROVADO
- **Observado:** SEC-A e SEC-B, em contextos distintos, chegaram a `/pacientes`. No período houve 0 respostas 401/403 e 0 `CONSOLE.error`.
- **Evidências:** `QA001-r2-a-SEC-A.png`, `QA001-r2-b-SEC-B.png`, `QA001-r2.log`
```
[NOTA] SEC-A url=http://localhost:3010/pacientes / SEC-B url=http://localhost:3010/pacientes | respostas 401/403: 0 | CONSOLE.error: 0
```

#### QA011-r2 — APROVADO
- **Observado:** `POST /reservas` 10:00 → 201 `reservado:true`. Os botões ficaram `disabled` durante a requisição (observado). O botão 10:00 recebeu `border-primary/50 bg-primary/10 text-primary` e apareceu a faixa "Horário reservado para você — expira em 09:59".
- **Evidências:** `QA011-r2.png`, `QA011-r2.log`
```
14:46:15.956Z [SEC-A#1] << 201 POST http://localhost:3010/v1/api/agendamentos/reservas BODY={"token":"e5634420-...","dataHoraInicio":"2026-10-21T13:00:00Z",...,"reservado":true}
[NOTA] botoes desabilitados durante a requisicao (observado): true
```

#### QA021-r2 — APROVADO
- **Observado:**
  - SEC-B tinha a grade aberta com 11:00. SEC-A reservou 11:00 (201). SEC-B clicou 11:00 → **409** com 3 alternativas.
  - A mensagem foi "Este horário acabou de ser ocupado… Veja abaixo os horários próximos disponíveis." e o bloco mostrou 21/10 10:30, 11:30 e 10:00.
  - `GET /slots` 200 logo depois, e 11:00 sumiu. Nenhum horário ficou selecionado e não apareceu faixa.
- **Evidências:** `QA021-r2-a-grade-desatualizada-SEC-B.png`, `QA021-r2-b-409-alternativas.png`, `QA021-r2.log`
```
14:46:24.245Z [SEC-B#1] << 409 POST http://localhost:3010/v1/api/agendamentos/reservas BODY={"detail":"Horário em pré-reserva por outro usuário. Escolha outro horário.",...,"alternativas":[{..."10:30..."},{..."11:30..."},{..."10:00..."}]}
[NOTA] alternativas: ["21/10/2026, 10:30","21/10/2026, 11:30","21/10/2026, 10:00"]
[NOTA] grade SEC-B apos 409: [...] | contem 11:00? false | selecionados=[] | faixa=false
```

#### QA061-r2 — APROVADO
- **Observado:** na sessão de SEC-A, pedi as grades pelo axios da app. Medico Teste Strix com a Clinica Teste Strix → **404**. Fabio com a Clinica Teste Strix → **404**. Nenhum 200.
- **Evidências:** `QA061-r2.png`, `QA061-r2.log`
```
14:46:28.494Z [SEC-A#1] << 404 GET .../agendamentos/slots?medicoId=c00b458a-...&estabelecimentoId=36a7eb52-...&data=2026-10-21 BODY={"detail":"Agenda não encontrada para o médico: c00b458a-...",...}
14:46:28.506Z [SEC-A#1] << 404 GET .../agendamentos/slots?medicoId=ff9a2400-...&estabelecimentoId=36a7eb52-...&data=2026-10-21 BODY={"detail":"Agenda não encontrada para o médico: ff9a2400-...",...}
```

#### QA039-r2 — APROVADO
- **Observado:** as abas 1 a 3 de SEC-A reservaram 08:00, 08:30 e 09:00 (201). A aba 4, em 09:30, recebeu **400**, e o wizard mostrou "Limite de 3 pré-reservas ativas por usuário. Finalize ou libere uma antes de reservar outra." (texto do backend, sem JSON e sem "Request failed"). Nenhum horário ficou selecionado e não apareceu faixa. Fechei as 4 abas, o que liberou as reservas.
- **Evidências:** `QA039-r2.png`, `QA039-r2.log`
```
[NOTA] aba 4 POST 09:30 -> 400 body={"detail":"Limite de 3 pré-reservas ativas por usuário. Finalize ou libere uma antes de reservar outra.","status":400,...}
[NOTA] aba 4: erro=["Limite de 3 pré-reservas ativas por usuário. Finalize ou libere uma antes de reservar outra."] selecionados=[] faixa=false | contem "Request failed": 0
```

### QA099-r2 — APROVADO
- **Feito (UI, DEV), por último:**
  - **Agendamentos da rodada 2:**
    - `70e32a10…` (21/10 15:00, SEC-B) → `PATCH /cancelar` 204.
    - `d7eee134…` (22/10 08:00, domiciliar do médico de fora) → 204.
    - `79c940ea…` (22/10 10:00, domiciliar) já tinha sido cancelado pela própria SEC-A no QA064-r2.
    - Status final na resposta do `GET /agendamentos`: os três CANCELADO. Nenhum agendamento não cancelado dos médicos de QA.
  - **Serviços inativados:** "QA Unico Horario", "QA Servico Medico Login" e "QA Domiciliar Fora", todos com `DELETE /servicos-medicos/{id}` 204.
  - **Médicos inativados:** "QA Medico Unico Horario", "QA Medico Login" e "QA Medico Fora", todos com `DELETE /medicos/{id}` 204. Os cards mostram "Inativo". Conferência extra: o login do "QA Medico Login" agora retorna 401 "A entidade vinculada esta inativa ou foi removida.".
  - **Secretárias inativadas:** SEC-A e SEC-B, com `DELETE /funcionarios/{id}` 204. Os cards mostram "Inativo".
  - **Não removido:** as agendas dos médicos de QA continuam cadastradas, mas o médico está inativo. Os vínculos com a São Lucas também continuam.
- **Redis:**
  - A última reserva criada na rodada 2 foi às **15:04:18.691Z** (QA051-r2). Rodei o scan às **15:36:45Z** (32 min 26 s depois). Resultado: **nenhuma chave** (contagem 0).
  - As 2 chaves de índice que sobraram da rodada 1 (`sgsm:reservas:dono:13daf867…` e `sgsm:reservas:medico:ff9a2400…`, com TTL de cerca de 58.700 s às 14:38Z) já não existiam às 15:05:51Z, antes da espera.
- **Evidências:** `QA099-r2-a-agendamentos-antes.png`, `QA099-r2-b-agendamentos-depois.png`, `QA099-r2-c-servicos.png`, `QA099-r2-d-medicos.png`, `QA099-r2-e-funcionarios.png`, `QA099-r2.log` (inclui a saída crua do Redis), `QA099-r2-redis.txt`
```
[NOTA] PATCH http://localhost:3010/v1/api/agendamentos/70e32a10-d8cd-4a20-92cf-ca81ced30938/cancelar -> 204
[NOTA] PATCH http://localhost:3010/v1/api/agendamentos/d7eee134-4a4d-42b0-832f-5b00affadc47/cancelar -> 204
[NOTA] inativar medico QA Medico Login: DELETE http://localhost:3010/v1/api/medicos/b13bedee-e771-481e-9efe-c812639b35ed -> 204
[NOTA] inativar qa.conflito.seca...: DELETE http://localhost:3010/v1/api/funcionarios/7f5a6eac-a3f7-460d-b01a-b9ef6eea163d -> 204
# Redis apos a espera (2026-10-17T15:36:45Z, 32 min+ apos a ultima reserva): docker exec redis-sgsm redis-cli --scan --pattern "sgsm:reserva*"
(fim da saida; linhas vazias acima = nenhuma chave)
# contagem: 0
```

### Achados fora dos itens (rodada 2)
- **A1 — `/registrar` como Médico, sem sessão, mostra "Sua sessão expirou".** A tela pública de registro chama `POST /v1/api/medicos` sem token. Agora esse pedido recebe 401, e o interceptor trata o 401 como sessão expirada: redireciona para `/login?sessao=expirada` com "Sua sessão expirou. Faça login novamente.". Para quem está se cadastrando, a mensagem é enganosa. Na rodada 1 esse pedido recebia 403. Não está no plano, por isso não reprova item. Reprodução:
  1. Abrir `/registrar` sem estar logado.
  2. Escolher "Médico" e preencher todos os campos.
  3. Clicar em "Criar conta".
  4. A tela vai para `/login?sessao=expirada` com o alerta de sessão expirada. Nenhum médico é criado.
  - Evidências: `QA062-r2-b-registrar-resultado.png`, `QA062-r2-registrar.log`.
- **A2 — `/registrar` aceita criar login de MEDICO quando aberto com uma sessão de DEV ativa.** Foi o único caminho de UI que gerou login de médico (QA062-r2, caminho 3). O `POST /auth/registrar` com `tipoPerfil: "MEDICO"` foi aceito (201). Registro o fato para avaliação de segurança e produto; está fora do escopo deste plano.

### Resumo da rodada 2

| ID | Status |
|---|---|
| QA042 | APROVADO |
| QA050 | APROVADO |
| QA051 | APROVADO |
| QA052 | APROVADO |
| QA053 | APROVADO |
| QA063 | APROVADO |
| QA064 | APROVADO |
| QA062 | APROVADO |
| QA082 | APROVADO |
| QA094, QA001, QA011, QA021, QA061, QA039 (regressão) | APROVADO |
| QA099 | APROVADO |

Nenhum item REPROVADO e nenhum BLOQUEADO na rodada 2.

---

## Rodada 3 (reteste)

> **Data:** 2026-10-17, UTC 15:45–16:05. **Ferramenta:** a mesma das rodadas anteriores (Playwright como biblioteca Node, `chromium.launch({ headless: false, slowMo: 150 })`, janela visível). Não usei mock, `page.route` nem SQL. Cada sessão roda num `browser.newContext()` próprio.
> **Ambiente conferido antes (curl):** front :3010 → 200; sgsm :8095 sem token → 401; `POST /v1/api/auth/login` (via :3010, credencial inválida) → 401, o que mostra o auth :8081 respondendo. Nada caiu durante a rodada.
> **Código do front sob teste:** working tree de `sgsm-front-medico` com `src/services/api.ts` e `src/pages/RegisterPage.tsx` modificados (sem commit). Li o diff só para saber o que conferir; o aceite vem do que o navegador mostrou.
> **Scripts:** `qa-scratch/r3-a-qa095.mjs`, `r3-b-qa094-qa042.mjs`, `r3-c-qa042-natural.mjs` e `r3-d-limpeza.mjs`. Dados da rodada em `qa-scratch/contas-r3.json`, sem senhas. Logs completos em `evidence/_full-r3-*.log`. Tokens, Authorization e senhas aparecem mascarados (`***`), e conferi com grep que não vazou senha nem JWT.

### Ocorrências de execução (transparência)
1. **`r3-a-qa095.mjs` precisou de 4 execuções.** As 3 primeiras pararam em seletores ambíguos do meu script: o rótulo do checkbox LGPD contém "CPF", "data de nascimento" e "e-mail", e `getByLabel('Senha')` casou com "Confirmar senha". Foi erro do script, não da app.
   - Em todas as execuções, a parte Médico chegou a "Criar conta", com o mesmo resultado (401, fica em `/registrar`, toast da clínica). Nomes tentados: `QA Medico R3 874443`, `893212`, `916720` e `982707`.
   - Na 3ª execução, a parte Paciente também enviou o formulário (`QA Paciente R3 916720`) e recebeu o mesmo 401 da execução final.
   - O print `QA095-r3-d-paciente-sucesso.png` é dessa 3ª execução. Apesar do nome, **mostra a falha** (toast "Faça login para continuar.").
   - As provas válidas são as da 4ª execução: `QA095-r3.log` e os prints `QA095-r3-a/b/c/d-paciente-resultado/e/f`.
2. **QA042 cenário 3:** desta vez rodei com a SEC-A, como pedido. Na rodada 2 tinha sido com a SEC-B.

### QA095 — REPROVADO (a parte Médico passou; a parte Paciente falhou)
- **Feito:**
  1. **Parte Médico:** contexto novo, sem login (`refresh_token` ausente, 0 cookies). Em `/registrar` → "Médico" → preenchi nome, CRM, UF SP, Cardiologia, e-mail único e senha/confirmação → "Criar conta".
  2. **Parte Paciente:** na mesma aba, sem recarregar → "Paciente" → nome, CPF válido e único (`792.251.982-64`), nascimento 12/03/1985, e-mail único, senha/confirmação, LGPD marcado → "Criar conta".
  3. **Controle:** repeti o cadastro de Paciente num **segundo contexto limpo**, sem a tentativa de Médico antes (CPF `792.252.759-43`, e-mail único), para descartar efeito da parte 1.
- **Observado na parte Médico (= esperado):**
  - `GET /auth/email-disponivel` 200, depois `POST /v1/api/medicos` (sem Authorization) → **401**.
  - A URL continuou `http://localhost:3010/registrar`. Não houve navegação no período e "Sua sessão expirou" não apareceu.
  - Toast: "O cadastro de médico é feito pela clínica. Peça seu acesso ao administrador do estabelecimento."
  - O formulário manteve os dados.
  - Nenhum médico criado: em `/medicos` como DEV, filtro "Todos", 12 médicos; nenhum com nome "QA Medico R3" nem e-mail `qa.conflito.med.r3`. As buscas na tela mostram "Nenhum resultado encontrado".
- **Observado na parte Paciente (≠ esperado):**
  - `GET /auth/email-disponivel` 200, depois `POST /v1/api/pacientes` (sem Authorization, `consentimentoLgpd:true`) → **401** sem corpo.
  - Toast "Faça login para continuar." e a tela fica em `/registrar`. Não houve redirecionamento para `/login` nem toast de sucesso.
  - O controle em contexto limpo deu exatamente o mesmo resultado.
  - Nenhum paciente criado: em `/pacientes` como DEV, nada com "QA Paciente R3", com o e-mail ou com os CPFs usados.
- **Esperado:** o cadastro de Paciente pelo `/registrar` vai até o fim, com toast de sucesso e redirecionamento para `/login`.
- **Leitura do 401 (só para orientar o dev, não altera o status):** o front envia o pedido sem token, e o backend sgsm de QA exige autenticação em `POST /v1/api/pacientes`, assim como em `/medicos`. O auto-cadastro de paciente pela tela pública não funciona neste ambiente. Não testei o cadastro de paciente pelo `/registrar` nas rodadas 1 e 2, então não afirmo desde quando está quebrado.
- **Reprodução:**
  1. Abrir `http://localhost:3010/registrar` sem estar logado (aba anônima).
  2. Manter "Paciente". Preencher nome, um CPF válido e não cadastrado, data de nascimento, e-mail não cadastrado, senha e confirmação (8+ caracteres) e marcar o consentimento LGPD.
  3. Clicar em "Criar conta".
  4. A rede mostra `POST /v1/api/pacientes` → 401, aparece o toast "Faça login para continuar." e a tela continua em `/registrar`. Deveria aparecer o toast de sucesso, com redirecionamento para `/login`.
- **Evidências:** `QA095-r3-a-medico-form.png`, `QA095-r3-b-medico-resultado.png`, `QA095-r3-c-paciente-form.png`, `QA095-r3-d-paciente-resultado.png`, `QA095-r3-e-paciente-controle-form.png`, `QA095-r3-f-paciente-controle-resultado.png`, `QA095-r3-g-medicos-busca-DEV.png`, `QA095-r3-h-pacientes-busca-DEV.png`, `QA095-r3.log`, `QA095-r3-limpeza.log`
```
15:46:25.089Z [ANON#1] >> POST http://localhost:3010/v1/api/medicos (sem Authorization) BODY={"nome":"QA Medico R3 982707","crm":"982714","crmUf":"SP","especialidade":"Cardiologia","email":"qa.conflito.med.r3.1792251982707@teste.com"}
15:46:25.093Z [ANON#1] CONSOLE.error: Failed to load resource: the server responded with a status of 401 (Unauthorized)
15:46:25.103Z [ANON#1] << 401 POST http://localhost:3010/v1/api/medicos BODY=
[NOTA] [Medico] url final=http://localhost:3010/registrar | toasts=["O cadastro de médico é feito pela clínica. Peça seu acesso ao administrador do estabelecimento."] | alertas=[]
[NOTA] [Medico] "Sua sessão expirou" visivel: false | NAVIGATED no periodo: []
15:46:34.062Z [ANON#1] >> POST http://localhost:3010/v1/api/pacientes (sem Authorization) BODY={"nome":"QA Paciente R3 982707","cpf":"79225198264","dataNascimento":"1985-03-12","email":"qa.conflito.pac.r3.1792251982707@teste.com","consentimentoLgpd":true}
15:46:34.070Z [ANON#1] << 401 POST http://localhost:3010/v1/api/pacientes BODY=
[NOTA] [Paciente (mesma aba)] url=http://localhost:3010/registrar | redirecionou para /login: false | toasts=["Faça login para continuar."] | "Sua sessão expirou" visivel: false
15:46:36.983Z [ANON2#1] << 401 POST http://localhost:3010/v1/api/pacientes BODY=
[NOTA] [Paciente controle] url=http://localhost:3010/registrar | redirecionou para /login: false | toasts=["Faça login para continuar."]
--- limpeza (DEV) ---
[NOTA] GET /medicos (filtro "Todos") total=12 | com nome "QA Medico R3": [] | com e-mail "qa.conflito.med.r3": []
[NOTA] GET /pacientes total=63 | com nome "QA Paciente R3": [] | com os CPFs do QA095: []
```

### QA042-r3 (regressão do api.ts) — APROVADO
- **Preparação:** SEC-A estava inativa. Reativei pela tela `/funcionarios` como DEV (`PATCH /funcionarios/7f5a6eac…/reativar` 200; evidência `SETUP-r3-a-SEC-A-reativada.png`, `SETUP-r3.log`). SEC-B continuou inativa e não foi usada.
- **Feito:** três cenários com SEC-A em `/agendamentos`, no passo 4 (Fabio, QA Descartavel, Clinica São Lucas, 21/10):
  1. `tokenStore.clear()` + `localStorage.removeItem('refresh_token')`, depois clique em 09:00.
  2. Access token inválido (`tokenStore.set('qa-invalido…')`) + `refresh_token` removido, depois clique em 09:30.
  3. Só o `refresh_token` removido, esperando sem nenhuma ação o access token vencer.
- **Observado:**
  - **Cenários 1 e 2:** `POST /reservas` → 401. Não houve chamada a `/auth/refresh` e a tela foi para `/login?sessao=expirada` com "Sua sessão expirou. Faça login novamente.". "Request failed" não apareceu.
  - Depois de logar de novo, o horário clicado não tem `title` "Reservado por você", não há faixa e nenhum horário fica selecionado.
  - **Cenário 3:** após 902 s, o `GET /slots` periódico recebeu 401, e a tela foi para `/login?sessao=expirada` com a mesma mensagem.
  - O único `CONSOLE.error` é o "Failed to load resource … 401" que o próprio navegador registra para o 401.
- **Esperado = observado.** As páginas privadas continuam com o comportamento de sessão expirada após a mudança das telas públicas.
- **Evidências:** `QA042-r3-1-a-passo4.png`, `QA042-r3-1-b-login.png`, `QA042-r3-1-c-relogado.png`, `QA042-r3-2-a-passo4.png`, `QA042-r3-2-b-login.png`, `QA042-r3-2-c-relogado.png`, `QA042-r3-3-a-passo4-aguardando.png`, `QA042-r3-3-b-login.png`, `QA042-r3.log`, `QA042-r3-natural.log`
```
15:47:20.357Z [SEC-A#1] >> POST http://localhost:3010/v1/api/agendamentos/reservas (sem Authorization) BODY={...,"tipo":"PRESENCIAL",...}
15:47:20.392Z [SEC-A#1] NAVIGATED: http://localhost:3010/login?sessao=expirada
15:47:20.406Z [SEC-A#1] << 401 POST http://localhost:3010/v1/api/agendamentos/reservas BODY=(sem corpo)
[NOTA] [sem-tokens] alerta na tela de login: ["Sua sessão expirou. Faça login novamente."] | texto "Sua sessão expirou" visivel: true
[NOTA] [sem-tokens] POST /reservas: 1 | respostas reservas: ["401"] | /auth/refresh chamadas: 0 | "Request failed": 0
[NOTA] [sem-tokens] apos novo login, title do 09:00: null | faixa: false | selecionados: []
15:47:31.988Z [SEC-A#1] << 401 POST http://localhost:3010/v1/api/agendamentos/reservas BODY=(sem corpo)      (cenario 2)
[NOTA] [access-invalido] redirecionou: true | url=http://localhost:3010/login?sessao=expirada
[NOTA] [access-invalido] apos novo login, title do 09:30: null | faixa: false | selecionados: []
--- natural (SEC-A) ---
16:03:01.572Z [SEC-A#1] NAVIGATED: http://localhost:3010/login?sessao=expirada
16:03:01.598Z [SEC-A#1] << 401 GET http://localhost:3010/v1/api/agendamentos/slots?medicoId=ff9a2400-...&estabelecimentoId=655759aa-...&data=2026-10-21 BODY=(sem corpo)
[NOTA] redirecionou=true apos 902 s | url=http://localhost:3010/login?sessao=expirada
[NOTA] alerta: ["Sua sessão expirou. Faça login novamente."]
```

### QA094-r3 (regressão do api.ts) — APROVADO
- **Feito:** em contexto anônimo, `/login` com o e-mail do DEV e uma senha errada → "Entrar".
- **Observado:** `POST /auth/login` → 401 `{"detail":"Credenciais invalidas.",...}`. Toast "Credenciais invalidas.", o mesmo texto do backend. A URL continuou `http://localhost:3010/login`, sem `?sessao=expirada`, sem alerta de sessão e sem "Request failed".
- **Evidências:** `QA094-r3.png`, `QA094-r3.log`
```
15:47:02.769Z [ANON#1] >> POST http://localhost:3010/v1/api/auth/login (sem Authorization) BODY={"email":"dev-local@sgsm.local","senha":"***"}
15:47:03.033Z [ANON#1] << 401 POST http://localhost:3010/v1/api/auth/login BODY={"detail":"Credenciais invalidas.","instance":"/v1/api/auth/login","status":401,"title":"Credenciais inválidas","type":"https://sgsm.com.br/erros/credenciais-invalidas"}
[NOTA] URL: http://localhost:3010/login | Toast visivel: ["Credenciais invalidas."] | alertas=[] | "Request failed": 0 | "Sua sessão expirou" visivel: false
```

### Limpeza da rodada 3 — feita
- **Paciente do QA095:** nenhum foi criado (todos os `POST /pacientes` deram 401), então não havia o que inativar. Em `/pacientes` como DEV, as buscas por "QA Paciente R3", `qa.conflito.pac.r3` e pelos dois CPFs retornam 0 cards.
- **Médico do QA095:** nenhum criado (ver QA095).
- **SEC-A:** inativada pela tela `/funcionarios` (DEV) com `DELETE /funcionarios/7f5a6eac…` 204. SEC-A e SEC-B aparecem como "Inativo".
- **Reservas:** a rodada não criou nenhuma reserva (todos os `POST /reservas` deram 401). Não criei agendamentos.
- **Evidências:** `QA095-r3-g-medicos-busca-DEV.png`, `QA095-r3-h-pacientes-busca-DEV.png`, `QA095-r3-i-funcionarios-DEV.png`, `QA095-r3-limpeza.log`
```
[NOTA] /pacientes busca "79225198264": cards encontrados=0
[NOTA] inativar qa.conflito.seca.1792217275275@teste.com: DELETE http://localhost:3010/v1/api/funcionarios/7f5a6eac-a3f7-460d-b01a-b9ef6eea163d -> 204
```

### Resumo da rodada 3

| ID | Status |
|---|---|
| QA095 | REPROVADO (Médico ok; Paciente: `POST /pacientes` 401, toast "Faça login para continuar.") |
| QA042 (3 cenários) | APROVADO |
| QA094 | APROVADO |

---

## Rodada 5 (auto-cadastro de paciente, convite do médico)

> **A rodada 4 foi interrompida (limite de uso) antes de escrever relatório e foi substituída por esta.** As evidências `*-r4*` são de código que já mudou e não valem como prova. Tudo foi refeito aqui (arquivos `*-r5*`). A rodada 4 não chegou a fazer a limpeza: a SEC-A estava **ativa** no início desta rodada, e os pacientes "QA Paciente R4 A/C/D/Sec" continuam ativos (ver Limpeza).
> **Data:** 2026-10-18, UTC 01:19–01:37. **Ferramenta:** Playwright como biblioteca Node (autorizado pelo usuário no lugar do MCP), `chromium.launch({ headless: false, slowMo: 150 })`, janela visível, um `browser.newContext()` por sessão. Não usei mock nem `page.route`.
> **Ambiente (conferido com curl antes):** front :3010 → 200; sgsm :8095 sem token → 401; `POST /v1/api/auth/login` via :3010 → 401 "Credenciais invalidas." (auth de QA :8091 respondendo). Os jars `auth-qa.jar` e `sgsm-qa.jar` são de 2026-10-17 22:17 (-03), e os processos (PIDs 11116 e 32524) subiram depois disso, então o código do dev estava no ar. No QA112 parei o auth (PID 11116) e subi de novo pelo comando indicado ("Started MsAuthApplication in 11.562 seconds", PID 31860). No fim, 3010, 8091 e 8095 estavam de pé.
> **Leituras fora da UI (só as duas exceções autorizadas, no papel do usuário lendo o próprio e-mail, porque a conta de e-mail de dev não entrega para domínios de teste):**
> - código de ativação: `docker exec redis-sgsm redis-cli GET "auth:ativacao:codigo:<email>"` (linhas `[REDIS-LEITURA]` nos logs);
> - token do convite: `SELECT t.token FROM auth.reset_senha_token … ORDER BY t.criado_em DESC LIMIT 1` (linhas `[SQL-LEITURA]`).
>
> Além disso, só o `--scan sgsm:reserva*` da limpeza (QA099). Nenhum dado foi preparado nem verificado por SQL/Redis.
> **Mascaramento:** tokens (JWT, refresh, convite), senhas e códigos aparecem só com os 4 últimos caracteres (`***xxxx`). Com grep, conferi que nenhuma senha usada e nenhum JWT aparece em claro nos arquivos `*-r5*`.
> **Scripts:** `qa-scratch/lib5.mjs`, `r5-common.mjs` e `r5-a` … `r5-j`. Dados da rodada em `qa-scratch/contas-r5.json`. Logs completos em `evidence/_full-r5-*.log`.
> **Ordem e limite por IP:** a janela de 10 cadastros por IP começou limpa: a rodada 4 foi há mais de 5 h e não havia chave do limitador no Redis. Chamadas a `/publico/pacientes` nesta rodada, em ordem:
>
> | # | Origem | Status |
> |---|---|---|
> | 1 | QA095 | 201 |
> | 2 | QA100 | 201 |
> | 3 | QA107 CPF | 409 |
> | 4 | QA111 | 201 |
> | 5 | QA107 API | 409 |
> | 6 | QA112 API | 503 |
> | 7 | QA112 volta | 201 |
> | 8–10 | QA109 | 409 |
> | 11 | QA109 | 429 |
> | 12 | QA109 (dados novos e válidos) | 429 |
>
> O QA109 rodou por último entre os itens de cadastro.

### QA095 (revisto) — APROVADO
- **Feito:** contexto anônimo (`refresh_token` ausente, 0 cookies) → `/registrar`. Inspecionei a tela, cadastrei a paciente B e chamei a API com `tipoPerfil: "MEDICO"` via `fetch` na mesma aba.
- **Observado = esperado:**
  - Não há botões "Paciente"/"Médico" (0 e 0) nem campo ou texto de CRM, UF ou especialidade. Os rótulos são só NOME COMPLETO, CPF, DATA DE NASCIMENTO, o consentimento LGPD, E-MAIL, SENHA e CONFIRMAR SENHA.
  - O aviso "É médico? Seu acesso é criado pela clínica: peça o convite ao administrador do estabelecimento e crie sua senha pelo link que chegar no seu e-mail." está visível.
  - O cadastro de paciente leva a "Ative sua conta" com o e-mail digitado.
  - `POST /v1/api/auth/registrar` com MEDICO → **400**.
- **Evidências:** `QA095-r5-a-registrar-sem-seletor.png`, `QA095-r5-b-paciente-form.png`, `QA095-r5-c-ative-sua-conta.png`, `QA095-r5.log`
```
01:23:46.255Z [ANON-095#1] << 201 POST http://localhost:3010/v1/api/publico/pacientes BODY={"email":"qa.conflito.pac.r5.b.1792286623296@teste.com","ativacaoPendente":true}
01:23:48.700Z [ANON-095#1] >> POST http://localhost:3010/v1/api/auth/registrar (sem Authorization) BODY={"email":"qa.conflito.med.r5.api.1792286628694@teste.com","senha":"***#Api","tipoPerfil":"MEDICO"}
01:23:48.760Z [ANON-095#1] << 400 POST http://localhost:3010/v1/api/auth/registrar BODY={"detail":"tipoPerfil invalido para auto-cadastro publico. Valores aceitos: [PACIENTE]",...,"status":400,"title":"Requisição inválida",...}
```

### QA100 — APROVADO
- **Feito:** `/registrar` anônimo com CPF válido inédito, e-mail inédito, senha de 14 caracteres e LGPD marcado → "Criar conta" (paciente A).
- **Observado = esperado:**
  - Houve **um** `POST /publico/pacientes` → 201, com corpo só `{"email":…,"ativacaoPendente":true}` (sem id).
  - A tela mostra "Ative sua conta … enviado para qa.conflito.pac.r5.a.1792286675126@teste.com".
  - A URL ficou `/registrar?ativar=qa.conflito.pac.r5.a.1792286675126%40teste.com`.
- **Evidências:** `QA100-r5-a-form.png`, `QA100-r5-b-ative-sua-conta.png`, `QA100-r5.log`
```
[NOTA] >> POST /publico/pacientes=1 | corpo da resposta={"email":"qa.conflito.pac.r5.a.1792286675126@teste.com","ativacaoPendente":true}
```

### QA101 — APROVADO (confirma a correção "conta nascia ativa")
- **Feito:** `/login` com o e-mail e a senha **certa** da conta A, ainda não ativada.
- **Observado = esperado:**
  - **401**, `refresh_token` ausente e a tela continua em `/login`.
  - Toast "Conta ainda não ativada. Digite o código enviado para o seu e-mail." com a ação "Digitar código".
  - A ação levou a `/registrar?ativar=<email>` já na etapa do código (campo "Código de ativação" visível e e-mail na tela).
- **Evidências:** `QA101-r5-a-login-nao-ativada.png`, `QA101-r5-b-etapa-codigo.png`, `QA101-r5.log`
```
<< 401 POST /v1/api/auth/login BODY={"detail":"Conta ainda não ativada. Digite o código enviado para o seu e-mail.","instance":"/v1/api/auth/login","status":401,"title":"Credenciais inválidas",...}
```

### QA102 — APROVADO
- **Feito:** login da conta A, pendente, com senha errada. Controle: e-mail inexistente com senha errada.
- **Observado = esperado:** nos dois casos, 401 com o mesmo corpo `"detail":"Credenciais invalidas."` e o toast "Credenciais invalidas.". O caso pendente não tem a ação "Digitar código" (0 botões) e não menciona ativação.
- **Evidências:** `QA102-r5-a-senha-errada.png`, `QA102-r5-b-controle-inexistente.png`, `QA102-r5.log`

### QA103 — APROVADO
- **Observado:**
  - Digitar "ab1c2-3 4x5678" deixou o campo com "123456" (só números, máximo 6).
  - Com "123", "Ativar conta" mostrou o toast "Digite os 6 números do código." e **nenhuma** requisição saiu (0 `>>` no período).
- **Evidências:** `QA103-r5-a-so-numeros-max6.png`, `QA103-r5-b-menos-de-6.png`, `QA103-r5.log`

### QA104 — APROVADO
- **Feito:** na conta A, enviei 5 códigos de 6 dígitos diferentes do real e depois o código real (lido no Redis).
- **Observado = esperado:**
  - Os 5 erros deram 400 com o toast "Código incorreto.".
  - O código **certo** depois disso deu 400 "Muitas tentativas com código incorreto. Solicite um novo código.", com o mesmo texto no toast. A conta A continua pendente.
- **Evidências:** `QA104-r5-a-codigo-incorreto.png`, `QA104-r5-b-quinto-erro.png`, `QA104-r5-c-certo-bloqueado.png`, `QA104-r5.log`
```
[NOTA] [erro 1] codigo=***9959 respostas=["400 POST http://localhost:3010/v1/api/auth/ativar-conta"] | toasts=["Código incorreto."]
[NOTA] [codigo CERTO apos 5 erros] ... corpo={"detail":"Muitas tentativas com código incorreto. Solicite um novo código.",...,"status":400,...} | toasts=["Muitas tentativas com código incorreto. Solicite um novo código."]
```

### QA105 — APROVADO
- **Feito:** na conta B (QA095), em `/registrar?ativar=<email>`, cliquei em "Reenviar código".
- **Observado = esperado:**
  - `POST /auth/ativar-conta/reenviar` → 204, com o toast genérico "Se houver cadastro aguardando ativação, enviamos um novo código.".
  - No Redis, o código mudou (`***7156` → `***9057`).
  - O código antigo deu 400 "Código incorreto.". O novo vale, como mostra o QA106.
- **Evidências:** `QA105-r5-a-reenviado.png`, `QA105-r5-b-codigo-antigo-recusado.png`, `QA105-r5.log`

### QA106 — APROVADO
- **Observado = esperado:**
  - O código novo da conta B deu `POST /auth/ativar-conta` → 204, com o toast "Conta ativada! Faça login para acessar o sistema." e a tela foi para `/login`.
  - O login com a mesma senha deu 200 e levou a `/pacientes`.
  - Claims do access token: `roles:["PACIENTE"]`, `tipoPerfil:"PACIENTE"`. O menu mostra "Home | Pacientes | Agendamentos" e o perfil "PACIENTE".
- **Evidências:** `QA106-r5-a-conta-ativada.png`, `QA106-r5-b-logado-paciente.png`, `QA106-r5.log`

### QA107 — REPROVADO
- **Feito:**
  1. Cadastro com o **CPF** da conta A e e-mail novo.
  2. Cadastro com o **e-mail** da conta A e CPF novo.
  3. Complemento: a mesma tentativa 2 enviada direto à API (`fetch` no navegador anônimo).
- **Observado:**
  - **Mesmo CPF:** `GET /auth/email-disponivel` 200 `{"disponivel":true}`, depois `POST /publico/pacientes` **409**, com o toast "Não foi possível concluir o cadastro com estes dados. Se você já tem cadastro, faça login ou use "Esqueci minha senha".".
  - **Mesmo e-mail:** o front para em `GET /auth/email-disponivel` → 200 `{"disponivel":false}` e mostra **outra** mensagem: "Este e-mail já está cadastrado. Faça login ou use outro e-mail.". Nenhum `POST /publico/pacientes` é enviado.
  - **API direta com mesmo e-mail:** 409 com o mesmo corpo do caso CPF. O backend, portanto, responde igual nos dois casos; a diferença está na pré-checagem do front.
- **Esperado:** as duas tentativas recebem a mesma resposta 409 e a mesma mensagem. Na tela, o caso e-mail revela que o e-mail já tem conta.
- **Reprodução:**
  1. Abrir `/registrar` sem login.
  2. Preencher com um e-mail que já tem conta (mesmo que pendente) e um CPF válido novo. Marcar LGPD e clicar em "Criar conta".
  3. A rede mostra só `GET /v1/api/auth/email-disponivel` → `{"disponivel":false}`, e o toast diz "Este e-mail já está cadastrado. Faça login ou use outro e-mail.".
  4. Repetir com um CPF já cadastrado e um e-mail novo: aparece o 409 com "Não foi possível concluir o cadastro com estes dados…". As mensagens são diferentes.
- **Evidências:** `QA107-r5-a-mesmo-cpf.png`, `QA107-r5-b-mesmo-email.png`, `QA107-r5-c-api-mesmo-email.png`, `QA107-r5.log`, `QA107-r5-api.log`
```
<< 200 GET /v1/api/auth/email-disponivel?email=qa.conflito.pac.r5.dupcpf.1792286785598%40teste.com BODY={"disponivel":true}
<< 409 POST /v1/api/publico/pacientes BODY={"detail":"Não foi possível concluir o cadastro com estes dados. Se você já tem cadastro, faça login ou use \"Esqueci minha senha\".",...,"status":409,"title":"Cadastro não concluído",...}
<< 200 GET /v1/api/auth/email-disponivel?email=qa.conflito.pac.r5.a.1792286675126%40teste.com BODY={"disponivel":false}
[NOTA] [QA107 mesmo e-mail (CPF novo)] toasts=["Este e-mail já está cadastrado. Faça login ou use outro e-mail."] | >> POST /publico/pacientes=0
[NOTA] (API) POST /v1/api/publico/pacientes (mesmo e-mail da conta A, CPF novo 42907420500) -> 409 | corpo={"detail":"Não foi possível concluir o cadastro com estes dados. ...","status":409,...}
```
- Na limpeza, o CPF `429.074.205-00` da tentativa pela API não aparece em `/pacientes`, então não ficou paciente órfão.

### QA108 — APROVADO
- **Observado:** nenhuma chamada à API em nenhum dos 5 casos (0 `>>` no período). Mensagem de cada caso:

| Caso | Mensagem |
|---|---|
| CPF inválido | "CPF inválido." |
| Senha com menos de 8 caracteres | "A senha deve ter no mínimo 8 caracteres." |
| Senhas diferentes | "As senhas não conferem." |
| Nascimento futuro | "Data de nascimento não pode ser no futuro." |
| LGPD desmarcado | Validação nativa do navegador no checkbox: "Marque esta caixa se deseja continuar.", visível no print |

- **Observação:** no caso LGPD, aparece a mensagem do navegador (o checkbox tem `required`), e não o toast do app "É necessário concordar com o tratamento de dados (LGPD)…". A mensagem é específica e visível, por isso aprovei.
- **Evidências:** `QA108-r5-1-CPF-invalido.png` … `QA108-r5-5-LGPD-desmarcado.png`, `QA108-r5.log`

### QA109 — APROVADO
- **Feito:** depois das 7 chamadas anteriores da janela, fiz 3 tentativas de enchimento (CPF da conta A, 409), depois a 11ª, e por fim uma tentativa com dados novos e válidos.
- **Observado = esperado:**
  - As tentativas 8 a 10 deram 409.
  - A **11ª** deu **429** com o toast "Muitas tentativas de cadastro a partir desta rede. Tente novamente mais tarde.".
  - A 12ª, com dados novos e válidos, também deu 429, e a etapa do código não abriu.
- **Evidências:** `QA109-r5-0-decima-409.png`, `QA109-r5-a-429-tela.png`, `QA109-r5-b-429-dados-novos.png`, `QA109-r5.log`
```
<< 429 POST /v1/api/publico/pacientes BODY={"detail":"Muitas tentativas de cadastro a partir desta rede. Tente novamente mais tarde.",...,"status":429,"title":"Muitas tentativas",...}
```

### QA110 — APROVADO
- **Observado:**
  - F5 em `/registrar?ativar=<email B>` manteve a etapa "Ative sua conta", com o mesmo e-mail na tela.
  - "Voltar ao cadastro" levou a `/registrar`, sem `?ativar`, com o formulário vazio e o botão "Criar conta".
- **Evidências:** `QA110-r5-a-apos-F5.png`, `QA110-r5-b-voltar-ao-cadastro.png`, `QA110-r5.log`

### QA111 — APROVADO
- **Observado:** `dblclick` em "Criar conta" gerou **1** `GET email-disponivel` e **1** `POST /publico/pacientes` (201). A tela foi para "Ative sua conta" (conta C).
- **Evidências:** `QA111-r5.png`, `QA111-r5.log`

### QA112 — APROVADO (com observação)
- **Feito:**
  1. Parei o auth de QA (:8091, `taskkill` no PID 11116) e tentei o cadastro D pela tela.
  2. Com o auth ainda parado, enviei a mesma chamada que a tela faria em seguida, `POST /publico/pacientes`, via `fetch`.
  3. Subi o auth de novo (PID 31860) e repeti o cadastro pela tela **com os mesmos CPF e e-mail**.
- **Observado:**
  - **Tela, auth fora:** a primeira chamada (`GET /auth/email-disponivel`, servida pelo auth) recebe 500 do proxy do Vite. Aparece o toast legível "Serviço temporariamente indisponível. Tente novamente em instantes." e a tela não vai para a etapa do código. Nenhum `POST /publico/pacientes` sai.
  - **API, auth fora:** `POST /publico/pacientes` → **503** "Cadastro temporariamente indisponível. Tente novamente em instantes.".
  - **Auth de volta, mesmos dados:** `email-disponivel` `{"disponivel":true}`, depois `POST /publico/pacientes` **201** e a etapa "Ative sua conta". Não ficou paciente órfão, e em `/pacientes` existe um único "QA Paciente R5 D".
- **Observação:** pela tela, o 503 do sgsm não chega a ser exercitado, porque a pré-checagem de e-mail no auth falha antes. O status visto pela tela é o 500 do proxy de dev. A mensagem é legível nos dois caminhos.
- **Evidências:** `QA112-r5-a-auth-fora.png`, `QA112-r5-a2-api-auth-fora.png`, `QA112-r5-b-auth-de-volta.png`, `QA112-r5-fora.log`, `QA112-r5-fora-api.log`, `QA112-r5-volta.log`
```
[fora] respostas=["500 GET http://localhost:3010/v1/api/auth/email-disponivel?email=qa.conflito.pac.r5.d.1792286871640%40teste.com"] | toasts=["Serviço temporariamente indisponível. Tente novamente em instantes."]
(API) POST /v1/api/publico/pacientes (dados D, auth parado) -> 503 | corpo={"detail":"Cadastro temporariamente indisponível. Tente novamente em instantes.",...,"status":503,"title":"Serviço indisponível",...}
[volta] respostas=["200 GET .../auth/email-disponivel?...","201 POST http://localhost:3010/v1/api/publico/pacientes"] | publico/pacientes={"email":"qa.conflito.pac.r5.d.1792286871640@teste.com","ativacaoPendente":true}
```

### Preparação da seção 12
- **SEC-A:** já estava **ativa** (resto da rodada 4 interrompida). Não foi preciso reativar (`SETUP-r5.log`, `SETUP-r5-SEC-A-reativada.png`). A SEC-B estava inativa e não foi usada.
- **Achado de preparação:** médicos cadastrados pela SEC-A sem vínculo (M1 e M2) aparecem na lista dela só na mesma sessão, logo após o cadastro.
  - Numa sessão nova, `GET /medicos?ativo=true` da SEC-A não os traz (0 cards na busca).
  - Com isso, o botão "Enviar convite" do card, que o toast de falha do convite recomenda, não fica acessível para a SEC-A. Ela também não consegue vinculá-los em `/estabelecimentos`, porque eles não aparecem lá.
  - Para seguir, vinculei M1 e M2 à Clinica São Lucas como **DEV** pela tela `/estabelecimentos` (`PUT /estabelecimentos/655759aa…/medicos` 204).
  - Evidências: `SETUP-r5-a-SEC-A-nao-ve-medicos-sem-vinculo.png`, `SETUP-r5-b-vinculo-DEV.png`, `SETUP-r5-vinculo.log`.

### QA120 — APROVADO
- **Feito:** SEC-A (FUNCIONARIO, Clinica São Lucas) → `/medicos` → "Novo Médico". Cadastrei M1 ("QA Medico Rcinco Um Aggjcg", CRM 7066926/SP) e M2 ("QA Medico Rcinco Dois Ahdbch", CRM 7073127/SP).
- **Observado = esperado:**
  - Os campos do modal são Nome completo, CRM, UF do CRM, Especialidade, E-mail e Telefone (opcional). Não há campo de senha (0 `input[type=password]`, 0 textos "senha").
  - Para cada um: `POST /medicos` 201 e, em seguida, `POST /medicos/{id}/convite-acesso` 200 `{"loginCriado":true}`.
  - Toast "Médico cadastrado. Enviamos para <email> o convite para ele criar a senha de acesso.".
- **Evidências:** `QA120-r5-a-M1-form.png`, `QA120-r5-a-M1-toast.png`, `QA120-r5-b-M2-form.png`, `QA120-r5-b-M2-toast.png`, `QA120-r5-c-lista-SEC-A.png`, `QA120-r5.log`
```
[Um] POST /medicos -> 201 id=b68b5499-22a7-4765-b96a-028fc6cff289 | POST convite-acesso -> 200 corpo={"email":"qa.conflito.med.r5.um.1792287066926@teste.com","loginCriado":true} | toasts=["Médico cadastrado. Enviamos para qa.conflito.med.r5.um.1792287066926@teste.com o convite para ele criar a senha de acesso."]
```

### QA121 — APROVADO (com observação)
- **Feito:** em contexto novo, abri o link `/resetar-senha?token=***8e85&convite=1` (token lido no banco), defini a senha e fiz login como M1.
- **Observado = esperado:**
  - Título "Criar sua senha", subtítulo "Bem-vindo(a) ao SGSM! Escolha a senha do seu acesso" e botão "Criar senha". Não aparece "Redefinir senha".
  - Salvar deu `POST /auth/resetar-senha` 204, com o toast "Senha criada! Faça login para acessar o sistema." e a tela foi para `/login`.
  - O login entrou com claims `roles:["MEDICO"]` e `referenciaId` igual ao id de M1.
  - Já vinculado à São Lucas (no QA125), em `/medicos` M1 vê 4 cards. Editar e Agenda ficam habilitados **só** no próprio card; nos de Fabio, M2 e "QA Registro Seletor Teste" ficam desabilitados.
  - `GET /agendamentos` → `[]`.
- **Observação:** antes do vínculo, `GET /medicos` do médico M1 retornou `[]` ("Nenhum resultado encontrado"). Um médico recém-convidado e ainda sem clínica não vê nem o próprio card para gerenciar a agenda.
- **Evidências:** `QA121-r5-a-criar-sua-senha.png`, `QA121-r5-b-senha-criada.png`, `QA121-r5-c-logado-medico.png`, `QA121-r5-d-medicos-como-M1.png`, `QA121-r5-e-agendamentos-como-M1.png`, `QA121-r5.log`, `QA125-r5-b-medico-sem-envelope.png`, `QA125-r5.log`
```
[SQL-LEITURA] token de convite mais recente de qa.conflito.med.r5.um.1792287066926@teste.com -> ***8e85
>> POST http://localhost:3010/v1/api/auth/resetar-senha (sem Authorization) BODY={"token":"***8e85","novaSenha":"***ite1"}
<< 204 POST http://localhost:3010/v1/api/auth/resetar-senha BODY=
[NOTA] login M1 -> url=http://localhost:3010/pacientes | claims={"roles":["MEDICO"],"referenciaId":"b68b5499-22a7-4765-b96a-028fc6cff289"}
```

### QA122 — APROVADO
- **Observado:** antes de usar o link, login de M1 com duas senhas quaisquer → 401 `"detail":"Credenciais invalidas."`, com o toast "Credenciais invalidas.".
- **Evidências:** `QA122-r5.png`, `QA122-r5.log`

### QA123 — APROVADO
- **Observado:**
  - Reabrir o link `***8e85`, já usado, e salvar deu `POST /auth/resetar-senha` 400 com o toast **"Este link já foi utilizado."**.
  - Um token inválido deu 400 com o toast **"Link inválido."**.
- **Evidências:** `QA123-r5-a-link-usado.png`, `QA123-r5-b-token-invalido.png`, `QA123-r5.log`

### QA124 — APROVADO
- **Feito:** SEC-A clicou no envelope (title "Enviar ao médico o convite para criar a senha de acesso") no card de M1, já ativo e vinculado à São Lucas.
- **Observado = esperado:**
  - O envelope deu 200 `{"loginCriado":false}`, com o toast "Convite de acesso enviado para qa.conflito.med.r5.um.1792287066926@teste.com.".
  - O novo token (`***a469`, diferente de `***8e85`) abriu "Criar sua senha" e o salvar deu 204.
  - O login com a senha antiga deu 401. O login com a senha nova deu 200.
- **Evidências:** `QA124-r5-a-convite-enviado.png`, `QA124-r5-b-nova-senha-criada.png`, `QA124-r5-c-logado-senha-nova.png`, `QA124-r5.log`

### QA125 — REPROVADO (as partes "médico logado" e "médico inativo" passaram; a parte do escopo entre clínicas falhou)
- **Feito:**
  1. Na sessão da SEC-A, `fetch` de `POST /v1/api/medicos/c00b458a-db4b-491e-bcb6-4cdf046a17ba/convite-acesso` (Medico Teste Strix) com o Bearer dela. Controle com a mesma técnica para M1.
  2. Como M1 logado, contei os envelopes em `/medicos`.
  3. No QA127, com M2 inativo, conferi o card.
- **Observado:**
  - **Strix:** **200** `{"email":"medico-strix-test@pentest.local","loginCriado":false}`. O backend gerou e enviou de fato um convite (token de redefinição) para esse médico.
  - **Controle M1:** 200.
  - **Médico logado:** 0 envelopes na página (ok).
  - **Médico inativo:** card "Inativo" sem envelope (ok).
- **Esperado:** 404 para o médico de outra clínica.
- **Diagnóstico (somente leitura, DEV pela tela `/estabelecimentos`):** a "Clinica Teste Strix" tem 0 médicos vinculados, e a São Lucas não inclui o Strix. Ou seja, o Medico Teste Strix está hoje **sem vínculo ativo**. A regra do `ConviteAcessoMedicoService.podeConvidar` libera FUNCIONARIO/ADMIN para "médicos das suas clínicas **ou** sem vínculo ativo". Com isso, uma secretária de qualquer clínica consegue disparar o convite (e criar login, quando não existe) para qualquer médico sem vínculo do sistema. Cabe ao usuário decidir se essa regra é a desejada; pelo plano, o item reprova.
- **Reprodução:**
  1. Logar como SEC-A (FUNCIONARIO da Clinica São Lucas).
  2. No console da página, executar `fetch('/v1/api/medicos/c00b458a-db4b-491e-bcb6-4cdf046a17ba/convite-acesso', {method:'POST', headers:{Authorization:'Bearer '+<access token da sessão>}})`.
  3. A resposta é 200 `{"email":"medico-strix-test@pentest.local","loginCriado":false}`. Esperado: 404.
- **Evidências:** `QA125-r5-a-SEC-A.png`, `QA125-r5-b-medico-sem-envelope.png`, `QA125-r5-c-vinculos-Clinica-Teste-Strix.png`, `QA125-r5-c-vinculos-Clinica-S-o-Lucas.png`, `QA125-r5.log`, `QA125-r5-diagnostico.log`, `QA127-r5-b-inativo-sem-envelope.png`
```
01:34:33.916Z [SEC-A#1] >> POST http://localhost:3010/v1/api/medicos/c00b458a-db4b-491e-bcb6-4cdf046a17ba/convite-acesso Authorization: Bearer ***GeYQ
01:34:34.002Z [SEC-A#1] << 200 POST http://localhost:3010/v1/api/medicos/c00b458a-db4b-491e-bcb6-4cdf046a17ba/convite-acesso BODY={"email":"medico-strix-test@pentest.local","loginCriado":false}
[NOTA] [Clinica Teste Strix] medicos vinculados (checkbox marcado): []
[NOTA] /medicos como M1 (vinculado): 4 cards [... envelope=0 ...] | envelopes na pagina=0
```

### QA126 — APROVADO
- **Feito:**
  1. **M2 (`r5-h2`):** três rodadas de "1 clique + 2 cliques forçados" no envelope. Cada envio respondeu em cerca de 40 ms, então os cliques (slowMo 150) saíram em sequência, e não durante o envio.
  2. **Complemento com o médico novo M3 (`r5-h3`):** `dblclick` real no envelope, com um MutationObserver no botão.
- **Observado:**
  - **Limite (M2):** o convite do cadastro (1) mais 2 aceitos (2 e 3) deram 200. A partir do 4º, 400 com o toast **"Muitos convites enviados para este médico. Tente novamente em alguns minutos."**, em todas as tentativas seguintes.
  - **Botão durante o envio (M3):** o `dblclick` gerou **1** `POST convite-acesso` (200). O observer registrou o botão `disabled:true` com o ícone `animate-pulse` e, 40 ms depois, `disabled:false`.
- **Evidências:** `QA126-r5-a-primeiro.png`, `QA126-r5-b-limite.png`, `QA126-r5-c-dblclick.png`, `QA126-r5.log`, `QA126-r5-dblclick.log`
```
<< 400 POST .../medicos/9634ed80-5c50-474a-a194-65a9f0cab088/convite-acesso BODY={"detail":"Muitos convites enviados para este médico. Tente novamente em alguns minutos.",...,"status":400,...}
[NOTA] dblclick no envelope de M3: POST convite-acesso=1 | mudancas do botao (MutationObserver)=[{"t":9399,"disabled":true,"cls":"lucide lucide-mail animate-pulse"},{"t":9439,"disabled":false,"cls":"lucide lucide-mail"}]
```

### QA127 — APROVADO
- **Observado em `/medicos` (SEC-A, médico M2):**

| Ação | Resultado |
|---|---|
| Editar (telefone e especialidade Neurologia) | `PUT` 200; o card mostra NEUROLOGIA e Tel (11) 98765-0127 |
| Inativar | `DELETE` 204; card "Inativo", sem envelope |
| Reativar | `PATCH` 200, toast "Médico reativado com sucesso."; envelope de volta |

- **Observado no fluxo normal de senha:**
  - "Esqueci minha senha" abre `/esqueci-senha` com "Informe seu e-mail e enviaremos um link para redefinir sua senha".
  - Enviar com um e-mail inexistente deu 200 e a mensagem "E-mail enviado! Se este e-mail estiver cadastrado, você receberá as instruções… O link expira em 2 horas.".
  - `/resetar-senha?token=…`, sem `convite=1`, mostra "Redefinir senha", "Escolha uma nova senha para sua conta" e o botão "Redefinir senha" (sem "Criar senha").
- **Evidências:** `QA127-r5-a-editado.png`, `QA127-r5-b-inativo-sem-envelope.png`, `QA127-r5-c-reativado.png`, `QA127-r5-d-esqueci-senha.png`, `QA127-r5-e-esqueci-enviado.png`, `QA127-r5-f-resetar-senha-normal.png`, `QA127-r5.log`

### Regressão

#### QA094 — APROVADO
- **Observado:** `/login` do DEV com senha errada → 401 "Credenciais invalidas.", com o toast igual. URL `/login`, sem "Request failed" e sem alerta de sessão.
- **Evidências:** `QA094-r5.png`, `QA094-r5.log`
```
>> POST http://localhost:3010/v1/api/auth/login (sem Authorization) BODY={"email":"dev-local@sgsm.local","senha":"***123!"}
<< 401 POST http://localhost:3010/v1/api/auth/login BODY={"detail":"Credenciais invalidas.",...}
```

#### QA042 (cenário "sem tokens", SEC-A) — APROVADO
- **Observado:**
  - No passo 4 (21/10, São Lucas), removi o access token e o `refresh_token` e cliquei em 09:00. `POST /reservas` deu 401, sem chamada a `/auth/refresh`, e a tela foi para `/login?sessao=expirada` com o alerta "Sua sessão expirou. Faça login novamente.".
  - Depois do novo login, 09:00 não tem `title` de reserva, não há faixa e nenhum horário fica selecionado.
- **Evidências:** `QA042-r5-a-passo4.png`, `QA042-r5-b-login.png`, `QA042-r5-c-relogado.png`, `QA042-r5.log`

#### Cadastro de paciente pela secretária em `/pacientes` (SEC-A) — APROVADO
- **Observado:** "Novo Paciente" → `POST /v1/api/pacientes` 201. O card "QA Paciente R5 Sec 90636" aparece Ativo na busca.
- **Evidências:** `REG-PAC-SEC-r5-a-form.png`, `REG-PAC-SEC-r5-b-lista.png`, `REG-PAC-SEC-r5.log`

### Limpeza da rodada 5 — feita pela UI (DEV)
- **Pacientes inativados** em `/pacientes` (`DELETE /pacientes/{id}` 204 cada):
  - QA Paciente R5 B 23296
  - QA Paciente R5 A 75126
  - QA Paciente R5 C 28771
  - QA Paciente R5 D 71640
  - QA Paciente R5 Sec 90636
- **Médicos inativados** em `/medicos` (`DELETE /medicos/{id}` 204 cada):
  - QA Medico Rcinco Um Aggjcg (`b68b5499…`)
  - QA Medico Rcinco Dois Ahdbch (`9634ed80…`)
  - QA Medico Rcinco Tres Degggb (`ba561af0…`)
  - Os vínculos de M1 e M2 com a Clinica São Lucas, feitos para o QA124, não foram desfeitos. Os médicos ficam inativos.
- **Secretárias:** SEC-A inativada em `/funcionarios` (`DELETE /funcionarios/7f5a6eac…` 204). A SEC-B já estava inativa. As duas aparecem "Inativo".
- **Reservas:** `--scan sgsm:reserva*` → 0 chaves. Não criei agendamentos.
- **Sobras da rodada 4 interrompida (não mexi, só registro):** QA Paciente R4 A 81680, C 65247, D 15687 e Sec 83090 continuam **ativos**; a R4 B está inativa.
- **Efeito colateral do QA125:** foi enviado um convite real (token de redefinição gerado) para `medico-strix-test@pentest.local`. O token não foi usado.
- **E-mails de login criados nesta rodada (ficam no auth):**
  - Pacientes (auto-cadastro):
    - `qa.conflito.pac.r5.b.1792286623296@teste.com` (ativada)
    - `qa.conflito.pac.r5.a.1792286675126@teste.com` (pendente, bloqueada por 5 códigos errados)
    - `qa.conflito.pac.r5.c.1792286828771@teste.com` (pendente)
    - `qa.conflito.pac.r5.d.1792286871640@teste.com` (pendente)
  - Paciente cadastrada pela secretária: `qa.conflito.pac.r5.sec.1792286990636@teste.com`. Não verifiquei se esse cadastro cria login; nenhum `registrar-staff` apareceu na rede da tela.
  - Médicos (convite):
    - `qa.conflito.med.r5.um.1792287066926@teste.com` (senha definida)
    - `qa.conflito.med.r5.dois.1792287073127@teste.com` (login sem senha conhecida)
    - `qa.conflito.med.r5.tres.1792287346661@teste.com` (login sem senha conhecida)
  - Tentativa `qa.conflito.med.r5.api.1792286628694@teste.com`: 400, nenhum login criado.
- **Evidências:** `LIMPEZA-r5-a-pacientes-antes.png`, `LIMPEZA-r5-b-pacientes-depois.png`, `LIMPEZA-r5-c-medicos-depois.png`, `LIMPEZA-r5-d-funcionarios.png`, `LIMPEZA-r5.log`

### Resumo da rodada 5

| ID | Status |
|---|---|
| QA095 | APROVADO |
| QA100 | APROVADO |
| QA101 | APROVADO |
| QA102 | APROVADO |
| QA103 | APROVADO |
| QA104 | APROVADO |
| QA105 | APROVADO |
| QA106 | APROVADO |
| QA107 | **REPROVADO** (mesmo e-mail: o front pré-checa e mostra "Este e-mail já está cadastrado…", diferente do 409 do CPF) |
| QA108 | APROVADO (LGPD: mensagem nativa do navegador) |
| QA109 | APROVADO |
| QA110 | APROVADO |
| QA111 | APROVADO |
| QA112 | APROVADO (pela tela falha antes o `email-disponivel`, com 500 do proxy; o 503 do sgsm foi visto via API) |
| QA120 | APROVADO |
| QA121 | APROVADO (médico sem vínculo vê lista vazia) |
| QA122 | APROVADO |
| QA123 | APROVADO |
| QA124 | APROVADO |
| QA125 | **REPROVADO** (convite do Medico Teste Strix pela SEC-A → 200; ele está sem vínculo ativo) |
| QA126 | APROVADO |
| QA127 | APROVADO |
| QA094 | APROVADO |
| QA042 (sem tokens) | APROVADO |
| Cadastro de paciente pela secretária | APROVADO |

**Achados fora dos itens:**
1. Um médico sem vínculo cadastrado pela secretária some da lista dela ao recarregar. Com isso, o "Enviar convite" do card, recomendado no toast de falha, fica inacessível, e ela não consegue vinculá-lo.
2. Um médico sem vínculo, ao logar, vê `/medicos` vazio, sem o próprio card.

## Rodada 6 (reteste)

> **Data:** 2026-10-18, UTC 01:49–02:26. **Ferramenta:** Playwright como biblioteca Node (autorizado pelo usuário), `chromium.launch({ headless: false, slowMo: 150 })`, janela visível, um `browser.newContext()` por sessão. Sem mock e sem `page.route`.
> **Ambiente (conferido antes):** front :3010 → 200 (PID 21772; o Vite aplicou por HMR, às 22:45 (-03), as mudanças em `RegisterPage.tsx`, `MedicosPage.tsx` e `types/index.ts`); sgsm :8095 sem token → 401 (PID 21944, subiu às 22:46 (-03) com `sgsm-qa.jar` de 22:45:56 (-03), "Started SgsmApplication in 11.737 seconds", `--sgsm.autocadastro.limite-por-ip=10`); `POST /v1/api/auth/login` via :3010 → 401 "Credenciais invalidas." (auth de QA :8091, PID 31860). Nada caiu durante a rodada.
> **Ocorrência de execução:** no início, a chave do limitador `sgsm:autocadastro:ip:0:0:0:0:0:0:0:1` ainda estava com valor 12 e TTL de 2105 s (resto da rodada 5). Não apaguei a chave, porque mexer no Redis para preparar o teste é proibido. Rodei primeiro os itens de médico e esperei a chave expirar (às 23:23:50 -03) para rodar QA100 e QA107. Nesta rodada houve 3 chamadas a `/publico/pacientes`: 201, 409 e 409.
> **Leituras fora da UI:** só a exceção autorizada do token do convite (linhas `[SQL-LEITURA]`, em `auth.reset_senha_token`). Não precisei ler código de ativação nesta rodada. Fora isso, li o TTL/valor do limitador (só para saber quando a janela fecharia) e fiz o `--scan sgsm:reserva*` da limpeza. Nenhum dado foi preparado nem verificado por SQL/Redis.
> **Mascaramento:** tokens, senhas e códigos aparecem só com os 4 últimos caracteres. Conferi com grep que nenhuma senha da rodada nem JWT aparece em claro nos arquivos `*-r6*`.
> **Scripts:** `qa-scratch/r6-common.mjs`, `r6-a-setup.mjs`, `r6-b-medicos.mjs`, `r6-c-qa100-qa107.mjs`, `r6-d-limpeza.mjs` (com `lib5.mjs`/`r5-common.mjs`). Dados em `qa-scratch/contas-r6.json`. Logs completos em `evidence/_full-r6-{a,b,c,d}.log`.

### Preparação (DEV, pela UI)
- **SEC-A:** reativada em `/funcionarios` (`PATCH /funcionarios/7f5a6eac…/reativar` 200, toast "Funcionário reativado com sucesso.").
- **Admin de QA com duas clínicas:** a tela `/administradores` permite isso, então a parte do QA128 não ficou bloqueada.
  - "Novo Administrador" cadastrou "QA Admin Rseis 62825" com senha digitada: `POST /administradores` 201 e `POST /auth/registrar-staff` 201.
  - Em "Gerenciar estabelecimentos administrados" marquei Clinica São Lucas e Clinica Teste Strix, as duas únicas clínicas ativas: `PUT /administradores/f3b8d161…/estabelecimentos` 204. Ao reabrir, as duas aparecem marcadas.
- **M0, para o QA129:** "QA Medico Rseis Zero Chdjca", cadastrado pelo DEV em `/medicos`. O modal do DEV não tem o campo "Estabelecimento", então o médico ficou sem clínica: `POST /medicos` 201 e `convite-acesso` 200 `{"loginCriado":true}`.
- **Evidências:** `SETUP-r6-a-SEC-A-reativada.png`, `SETUP-r6-b-admin-form.png`, `SETUP-r6-c-admin-duas-clinicas.png`, `SETUP-r6-d-admin-vinculos-reaberto.png`, `SETUP-r6-e-M0-DEV.png`, `SETUP-r6.log`

### QA107 (reteste) — APROVADO
- **Feito:** em contexto anônimo (0 cookies), `/registrar` duas vezes, usando a conta criada no QA100-r6:
  1. mesmo CPF (`042.117.202-95`) com e-mail novo;
  2. mesmo e-mail (`qa.conflito.pac.r6.a.1792290240168@teste.com`) com CPF novo.
- **Observado = esperado:**
  - Nas duas, **nenhum** `GET /auth/email-disponivel` sai da tela e sai **um** `POST /publico/pacientes`, que responde **409**.
  - O corpo é idêntico nas duas (status, title, detail, type e instance iguais).
  - O toast é o mesmo: "Não foi possível concluir o cadastro com estes dados. Se você já tem cadastro, faça login ou use "Esqueci minha senha".". A tela fica em `/registrar`.
- **Evidências:** `QA107-r6-a-mesmo-cpf.png`, `QA107-r6-b-mesmo-email.png`, `QA107-r6.log`
```
02:24:08.273Z [ANON-R6#1] << 409 POST http://localhost:3010/v1/api/publico/pacientes BODY={"detail":"Não foi possível concluir o cadastro com estes dados. Se você já tem cadastro, faça login ou use \"Esqueci minha senha\".","instance":"/v1/api/publico/pacientes","status":409,"title":"Cadastro não concluído","type":"https://sgsm.com.br/erros/cadastro-indisponivel"}
02:24:14.050Z [ANON-R6#1] << 409 POST http://localhost:3010/v1/api/publico/pacientes BODY={"detail":"Não foi possível concluir o cadastro com estes dados. Se você já tem cadastro, faça login ou use \"Esqueci minha senha\".","instance":"/v1/api/publico/pacientes","status":409,"title":"Cadastro não concluído","type":"https://sgsm.com.br/erros/cadastro-indisponivel"}
[NOTA] [mesmo CPF (e-mail novo)] ... >> GET email-disponivel=0 | >> POST /publico/pacientes=1 | status=409
[NOTA] [mesmo e-mail (CPF novo)] ... >> GET email-disponivel=0 | >> POST /publico/pacientes=1 | status=409
[NOTA] QA107: mesmo status=true (409/409) | mesma mensagem na tela=true | mesmo corpo (sem instance)=true
```
- **Observação (fora do item, ver Achados):** o endpoint público `GET /v1/api/auth/email-disponivel` continua no ar e responde sem login: `{"disponivel":false}` para o e-mail da conta A e `{"disponivel":true}` para um e-mail inexistente.

### QA125 (reteste completo) — APROVADO
- **Feito:**
  1. Na sessão da SEC-A (FUNCIONARIO, São Lucas), `fetch` de `POST /v1/api/medicos/{id}/convite-acesso` com o Bearer dela para três médicos:
     - Medico Teste Strix (`c00b458a…`);
     - M0, sem clínica (o caso que a regra antiga liberava);
     - controle: M1, da São Lucas.
  2. Como médico logado (M1, vinculado; e M0, sem clínica, no QA129), contei os envelopes em `/medicos`.
  3. No QA127, com M1 inativo, conferi o card.
- **Observado = esperado:**
  - Strix → **404** "Médico não encontrado: c00b458a-…".
  - M0, sem vínculo → **404**.
  - Controle M1 → 200 `{"loginCriado":false}`.
  - M1 logado vê 5 cards com 0 envelopes na página; Editar e agenda ficam habilitados só no próprio card. M0 logado: 0 envelopes.
  - Card de M1 inativo: "Inativo", sem envelope (0).
- **Evidências:** `QA125-r6-a-SEC-A.png`, `QA125-r6-b-M1-logado-sem-envelope.png`, `QA129-r6-b-M0-ve-proprio-card.png`, `QA127-r6-b-inativo-sem-envelope.png`, `QA125-r6.log`
```
01:53:07.598Z [SEC-A#1] >> POST http://localhost:3010/v1/api/medicos/c00b458a-db4b-491e-bcb6-4cdf046a17ba/convite-acesso Authorization: Bearer ***zmDw
01:53:07.667Z [SEC-A#1] << 404 POST http://localhost:3010/v1/api/medicos/c00b458a-db4b-491e-bcb6-4cdf046a17ba/convite-acesso BODY={"detail":"Médico não encontrado: c00b458a-db4b-491e-bcb6-4cdf046a17ba",...,"status":404,"title":"Recurso não encontrado",...}
01:53:07.682Z [SEC-A#1] << 404 POST http://localhost:3010/v1/api/medicos/2eb78c76-af5e-4d20-adc5-2fb8207ca868/convite-acesso BODY={"detail":"Médico não encontrado: 2eb78c76-...",...,"status":404,...}
01:53:07.716Z [SEC-A#1] << 200 POST http://localhost:3010/v1/api/medicos/1e2b4d05-8ee2-47f0-af5c-de3fe480ab4c/convite-acesso BODY={"email":"qa.conflito.med.r6.um.1792288356549@teste.com","loginCriado":false}
[NOTA] /medicos como M1 (vinculado): [..., "QA Medico Rseis Um Dfgfej: editar=habilitado agenda=habilitada envelope=0"] | envelopes na pagina=0
```

### QA128 (novo) — APROVADO
- **Parte secretária (SEC-A):**
  - O modal "Novo Médico" tem os campos Nome completo, CRM, UF do CRM, Especialidade, E-mail e Telefone (opcional). **Não tem** campo "Estabelecimento" nem de senha.
  - M1 ("QA Medico Rseis Um Dfgfej") foi cadastrado sem `estabelecimentoId` no corpo.
  - Depois de **F5**, a busca pelo e-mail de M1 mostra 1 card, e o `GET /medicos` traz o id de M1.
  - Numa **sessão nova** da SEC-A, também aparece 1 card, com envelope.
  - O envelope desse card deu 200 e o toast certo (detalhes no QA124).
  - DEV, em `/estabelecimentos` → Clinica São Lucas → "Gerenciar médicos": M1 aparece marcado, ou seja, nasceu vinculado à clínica da SEC-A.
- **Parte admin com duas clínicas (QA Admin Rseis, ADMIN_ESTABELECIMENTO, São Lucas + Strix):**
  - O modal tem o campo **"Estabelecimento"** com as opções "Selecione…", "Clinica São Lucas" e "Clinica Teste Strix".
  - Salvar sem escolher mostra no modal "Escolha o estabelecimento em que o médico vai atender.", o modal continua aberto e **nenhum** `POST /medicos` é enviado.
  - Com "Clinica Teste Strix" escolhida: `POST /medicos` com `estabelecimentoId:"36a7eb52…"` → 201, seguido de `convite-acesso` 200 `{"loginCriado":true}`.
  - Depois de F5, o admin vê o médico (1 card).
  - A SEC-A (São Lucas) não vê esse médico (0 cards).
  - DEV, em `/estabelecimentos`: o médico do admin está marcado na Strix e não na São Lucas.
- **Evidências:** `QA128-r6-a-SEC-A-apos-F5.png`, `QA128-r6-b-SEC-A-sessao-nova.png`, `QA128-r6-c-admin-campo-estabelecimento.png`, `QA128-r6-d-admin-sem-escolher.png`, `QA128-r6-e-admin-cadastrou.png`, `QA128-r6-f-admin-apos-F5.png`, `QA128-r6-g-SEC-A-nao-ve-medico-da-Strix.png`, `QA128-r6-h-vinculos-Clinica-S-o-Lucas.png`, `QA128-r6-h-vinculos-Clinica-Teste-Strix.png`, `QA120-r6-a-form-SEC-A.png`, `QA128-r6.log`, `QA128-r6-admin.log`
```
[NOTA] SEC-A apos F5: cards com qa.conflito.med.r6.um.1792288356549@teste.com = 1 | GET /medicos traz o id de M1 = true
[NOTA] SEC-A em sessao nova: cards com ... = 1 | card=Ativo | QA Medico Rseis Um Dfgfej | ... | envelope=1
[NOTA] [Admin (ADMIN-QA)] labels do modal Novo Médico: [...,"Telefone (opcional)","Estabelecimento"] | campo "Estabelecimento"=1 opcoes=["Selecione…","Clinica São Lucas","Clinica Teste Strix"]
[NOTA] admin salvou SEM escolher clinica: erro no modal=["Escolha o estabelecimento em que o médico vai atender."] | >> POST /medicos=0 | modal aberto=true
01:53:36.443Z [ADMIN-QA#1] >> POST http://localhost:3010/v1/api/medicos Authorization: Bearer ***Nbpg BODY={"nome":"QA Medico Rseis Admin Ebbhdc",...,"estabelecimentoId":"36a7eb52-9c10-4fc6-904e-04d80747217b"}
01:53:36.486Z [ADMIN-QA#1] << 201 POST http://localhost:3010/v1/api/medicos BODY={"id":"ff65434c-886f-4a62-9e42-25ad176cf1f0",...}
[NOTA] [Clinica São Lucas] medicos vinculados: [...,"QA Medico Rseis Um Dfgfej ..."] | M1=true MA=false M0=false Strix=false
[NOTA] [Clinica Teste Strix] medicos vinculados: ["QA Medico Rseis Admin Ebbhdc  Cardiologia · CRM 8411732/SP"] | M1=false MA=true M0=false Strix=false
```

### QA129 (novo) — APROVADO
- **Feito:** M0, cadastrado pelo DEV e sem clínica, abriu o link do convite (`token=***b487&convite=1`), criou a senha e fez login. Depois abriu `/medicos`, deu F5 e abriu `/estabelecimentos`.
- **Observado = esperado:**
  - O link deu `resetar-senha` 204 com o toast "Senha criada!…". O login deu 200, com `roles:["MEDICO"]` e `referenciaId` igual ao id de M0.
  - `GET /medicos` devolve só o próprio cadastro. A tela mostra 1 card "QA Medico Rseis Zero Chdjca", com Editar e agenda **habilitados** e sem envelope. Depois de F5, continua igual.
  - `/estabelecimentos` como M0 → `[]`, o que confirma que ele está mesmo sem clínica. Mesmo assim, ele vê o próprio card. Na rodada 5, nessa mesma situação, `/medicos` vinha vazio.
- **Evidências:** `QA129-r6-a-senha-criada.png`, `QA129-r6-b-M0-ve-proprio-card.png`, `QA129-r6-c-M0-estabelecimentos.png`, `QA129-r6.log`
```
[SQL-LEITURA] token de convite mais recente de qa.conflito.med.r6.zero.1792288273920@teste.com -> ***b487
01:53:12.215Z [MED-M0#1] << 204 POST http://localhost:3010/v1/api/auth/resetar-senha BODY=
[NOTA] /medicos como M0: ... corpo=[{"id":"2eb78c76-af5e-4d20-adc5-2fb8207ca868","nome":"QA Medico Rseis Zero Chdjca",...,"ativo":true,...}]
[NOTA] /medicos como M0: cards=["QA Medico Rseis Zero Chdjca: editar=habilitado agenda=habilitada envelope=0"] | envelopes na pagina=0
[NOTA] /estabelecimentos como M0 (prova de que esta sem clinica): ["200 GET .../v1/api/estabelecimentos",...] | corpo=[] | cards=[]
```

### Regressão

#### QA120 — APROVADO
- **Observado:** SEC-A cadastrou M1 em `/medicos`. O formulário não tem campo de senha (0 `input[type=password]` e 0 textos "senha").
  - A ordem foi `POST /medicos` 201 e depois `POST /medicos/{id}/convite-acesso` 200 `{"loginCriado":true}`.
  - Toast "Médico cadastrado. Enviamos para qa.conflito.med.r6.um.1792288356549@teste.com o convite para ele criar a senha de acesso.".
  - M1 já nasce vinculado, como mostra o QA128.
- **Evidências:** `QA120-r6-a-form-SEC-A.png`, `QA120-r6-b-toast.png`, `QA120-r6.log`
```
01:52:39.310Z [SEC-A#1] << 201 POST http://localhost:3010/v1/api/medicos BODY={"id":"1e2b4d05-8ee2-47f0-af5c-de3fe480ab4c",...}
01:52:39.629Z [SEC-A#1] << 200 POST http://localhost:3010/v1/api/medicos/1e2b4d05-8ee2-47f0-af5c-de3fe480ab4c/convite-acesso BODY={"email":"qa.conflito.med.r6.um.1792288356549@teste.com","loginCriado":true}
```

#### QA124 — APROVADO
- **Observado:** a SEC-A clicou no envelope do card de M1 (title "Enviar ao médico o convite para criar a senha de acesso").
  - Resposta 200 `{"loginCriado":false}`, com o toast "Convite de acesso enviado para qa.conflito.med.r6.um.1792288356549@teste.com.".
  - O novo link (`***f079`) abriu "Criar sua senha". Salvar deu 204 e o toast "Senha criada! Faça login para acessar o sistema.".
  - O login com essa senha deu 200, com `roles:["MEDICO"]` e `referenciaId` igual ao id de M1.
- **Evidências:** `QA124-r6-a-convite-enviado.png`, `QA124-r6-b-senha-pelo-novo-link.png`, `QA124-r6-c-M1-logado.png`, `QA124-r6.log`
```
[SQL-LEITURA] token de convite mais recente de qa.conflito.med.r6.um.1792288356549@teste.com -> ***f079
01:52:59.091Z [MED-M1#1] >> POST http://localhost:3010/v1/api/auth/resetar-senha (sem Authorization) BODY={"token":"***f079","novaSenha":"***ite1"}
01:52:59.347Z [MED-M1#1] << 204 POST http://localhost:3010/v1/api/auth/resetar-senha BODY=
```

#### QA100 — APROVADO
- **Observado:** contexto anônimo → `/registrar` com dados novos e válidos → "Criar conta".
  - Saiu **0** `GET email-disponivel` e **1** `POST /publico/pacientes` → 201, com corpo só `{"email":…,"ativacaoPendente":true}`.
  - A tela mostra "Ative sua conta" com o e-mail digitado. A URL ficou `/registrar?ativar=qa.conflito.pac.r6.a.1792290240168%40teste.com`.
- **Evidências:** `QA100-r6-a-form.png`, `QA100-r6-b-ative-sua-conta.png`, `QA100-r6.log`
```
02:24:02.074Z [ANON-R6#1] << 201 POST http://localhost:3010/v1/api/publico/pacientes BODY={"email":"qa.conflito.pac.r6.a.1792290240168@teste.com","ativacaoPendente":true}
[NOTA] QA100: >> GET email-disponivel=0 | >> POST /publico/pacientes=1 | respostas=["201 POST http://localhost:3010/v1/api/publico/pacientes"]
```

#### QA127 — APROVADO
- **Observado em `/medicos` (SEC-A, médico M1):**

| Ação | Resultado |
|---|---|
| Editar (telefone e especialidade Neurologia) | `PUT` 200; o card mostra NEUROLOGIA e Tel (11) 98765-0627 |
| Inativar | `DELETE` 204; card "Inativo", sem envelope |
| Reativar | `PATCH` 200, toast "Médico reativado com sucesso."; envelope de volta |

- **Observado no fluxo normal de senha:**
  - `/esqueci-senha` mostra "Informe seu e-mail e enviaremos um link para redefinir sua senha".
  - Enviar deu `POST /auth/esqueci-senha` 200 e a mensagem "E-mail enviado! … O link expira em 2 horas.".
  - `/resetar-senha?token=…`, sem `convite=1`, mostra "Redefinir senha", "Escolha uma nova senha para sua conta" e o botão "Redefinir senha" (0 botões "Criar senha").
- **Evidências:** `QA127-r6-a-editado.png`, `QA127-r6-b-inativo-sem-envelope.png`, `QA127-r6-c-reativado.png`, `QA127-r6-d-esqueci-senha.png`, `QA127-r6-e-esqueci-enviado.png`, `QA127-r6-f-resetar-senha-normal.png`, `QA127-r6.log`

### Limpeza da rodada 6 — feita pela UI (DEV)
- **Paciente inativado:** QA Paciente R6 A 40168 (`DELETE /pacientes/eacaf5a2…` 204).
- **Médicos inativados** (`DELETE /medicos/{id}` 204 cada):
  - QA Medico Rseis Zero Chdjca (`2eb78c76…`)
  - QA Medico Rseis Admin Ebbhdc (`ff65434c…`)
  - QA Medico Rseis Um Dfgfej (`1e2b4d05…`)
  - Os vínculos de M1 (São Lucas) e do médico do admin (Strix) ficam como estão, com os médicos inativos.
- **Admin inativado:** QA Admin Rseis 62825 (`DELETE /administradores/f3b8d161…` 204). O vínculo dele com as duas clínicas não foi desfeito.
- **Secretárias:** SEC-A inativada (`DELETE /funcionarios/7f5a6eac…` 204). A SEC-B já estava inativa.
- **Reservas:** `--scan sgsm:reserva*` → 0 chaves.
- **Convites:** nenhum convite foi enviado ao Strix nesta rodada (404). O convite do cadastro do médico do admin não foi usado.
- **E-mails de login criados nesta rodada (ficam no auth):**
  - `qa.conflito.pac.r6.a.1792290240168@teste.com`: paciente, pendente de ativação.
  - `qa.conflito.med.r6.zero.1792288273920@teste.com`: médico M0, senha definida.
  - `qa.conflito.med.r6.um.1792288356549@teste.com`: médico M1, senha definida.
  - `qa.conflito.med.r6.admin.1792288411732@teste.com`: médico do admin, login sem senha conhecida.
  - `qa.conflito.adm.r6.1792288262825@teste.com`: ADMIN_ESTABELECIMENTO, senha definida no cadastro.
  - As duas tentativas 409 do QA107 (`qa.conflito.pac.r6.dup.1792290247560@teste.com` e a do CPF `042.119.091-42`) não criaram paciente: em `/pacientes` só existe "QA Paciente R6 A".
- **Evidências:** `LIMPEZA-r6-a-pacientes.png`, `LIMPEZA-r6-b-medicos.png`, `LIMPEZA-r6-c-admin.png`, `LIMPEZA-r6-d-funcionarios.png`, `LIMPEZA-r6.log`

### Resumo da rodada 6

| ID | Status |
|---|---|
| QA107 | APROVADO |
| QA125 | APROVADO |
| QA128 | APROVADO (as duas partes, inclusive a do admin com duas clínicas) |
| QA129 | APROVADO |
| QA120 | APROVADO |
| QA124 | APROVADO |
| QA100 | APROVADO |
| QA127 | APROVADO |

**Achados fora dos itens:**
1. `GET /v1/api/auth/email-disponivel` continua público e responde `{"disponivel":false}` para e-mail com conta e `{"disponivel":true}` para e-mail sem conta. A tela não o usa mais, então o QA107 passa pela UI. Mas qualquer um ainda consegue descobrir, chamando a API direto, se um e-mail tem conta, que é o que a correção do QA107 quis evitar. Cabe ao usuário decidir se o endpoint deve sair ou ficar protegido.
2. Não foi retestado nesta rodada (não estava na lista): o QA112 pela tela. Sem a pré-checagem, com o auth fora do ar, a tela deve passar a receber o 503 do sgsm, e não mais o 500 do proxy visto na rodada 5.

## Rodada 7 (reteste)

> **Data:** 2026-10-18, UTC 11:21–11:24. **Ferramenta:** Playwright como biblioteca Node (autorizado pelo usuário), `chromium.launch({ headless: false, slowMo: 150 })`, janela visível, um `browser.newContext()` por sessão. Sem mock e sem `page.route`.
> **Ambiente (conferido antes com curl):** front :3010 → 200 (PID 20700); sgsm :8095 sem token → 401 (PID 30824); `POST /v1/api/auth/login` via :3010 → 401 "Credenciais invalidas." (auth de QA :8091, PID 10852). O `auth-qa.jar` é de 08:19:44 (-03), e os três processos subiram às 08:19:48–54 (-03), depois do jar. Não havia chave `sgsm:autocadastro*` no Redis, então a janela do limite por IP começou limpa. Nesta rodada houve 3 chamadas a `/publico/pacientes`: 201, 503 e 201.
> **Mudança do dev conferida (somente leitura):** `grep` por `email-disponivel|emailDisponivel` em `sgsm-front-medico/src` e `ms-sboot-auth/src` → 0 ocorrências. No `ms-sboot-auth`, `git status` mostra `D src/main/java/br/com/sgsm/auth/dto/EmailDisponivelResponse.java` e `AuthController.java` modificado.
> **QA112:** parei o auth (`taskkill` no PID 10852) e subi de novo pelo comando indicado ("Started MsAuthApplication in 10.142 seconds", PID 31464). No fim, 3010, 8091 e 8095 estavam de pé.
> **Leituras fora da UI:** só a exceção autorizada do código de ativação (linha `[REDIS-LEITURA]` no `QA106-r7.log`) e o `--scan sgsm:reserva*` da limpeza. Nenhum dado foi preparado nem verificado por SQL/Redis.
> **Mascaramento:** tokens, senhas e códigos aparecem só com os 4 últimos caracteres. Conferi com grep que nenhuma senha da rodada nem JWT aparece em claro nos arquivos `*-r7*`.
> **Scripts:** `qa-scratch/r7-common.mjs`, `r7-a-qa113-100-101-094.mjs`, `r7-b-qa112.mjs` (`fora` e `volta`), `r7-c-qa106-limpeza.mjs` (com `lib5.mjs`, `r5-common.mjs` e `r6-common.mjs`). Dados em `qa-scratch/contas-r7.json`. Logs completos em `evidence/_full-r7-{a,b-fora,b-volta,c}.log`.

### QA112 — APROVADO
- **Feito:**
  1. Parei o auth de QA (:8091). Confirmei a queda com `GET :8091/actuator/health`, que deu conexão recusada (ECONNREFUSED).
  2. Em contexto anônimo, preenchi `/registrar` com dados novos e válidos (paciente D) e cliquei em "Criar conta".
  3. Subi o auth de novo e repeti o cadastro pela tela **com os mesmos CPF (`939.192.796-38`) e e-mail**.
- **Observado (auth fora):**
  - A tela envia um único `POST /v1/api/publico/pacientes` (não há mais pré-checagem no auth), que responde **503** "Cadastro temporariamente indisponível. Tente novamente em instantes.".
  - O toast mostra o mesmo texto. A tela continua em `/registrar`, com o formulário e o botão "Criar conta", e **não** vai para "Ative sua conta" (0 headings).
  - No console aparece só o `Failed to load resource: … 503` do navegador.
- **Observado (auth de volta, mesmos dados):** `POST /publico/pacientes` **201** `{"email":…,"ativacaoPendente":true}`, o toast "Enviamos um código de 6 dígitos para o seu e-mail." e a etapa "Ative sua conta" (`/registrar?ativar=…`).
- **Paciente órfão:** não ficou. Na limpeza, a busca por "QA Paciente R7" em `/pacientes` (DEV) trouxe um único "QA Paciente R7 D 72410".
- **Esperado:** mensagem legível de indisponibilidade (503), sem ir para a etapa do código; depois 201 com os mesmos dados. Bate com o observado.
- **Mudança em relação à rodada 5:** antes a tela via um 500 do proxy no `email-disponivel`; agora vê o **503** do sgsm.
- **Evidências:** `QA112-r7-a0-form.png`, `QA112-r7-a-auth-fora.png`, `QA112-r7-b0-form.png`, `QA112-r7-b-auth-de-volta.png`, `QA112-r7.log` (junta `QA112-r7-fora.log` e `QA112-r7-volta.log`), `LIMPEZA-r7-a-pacientes-antes.png`
```
[NOTA] auth de QA :8091 /actuator/health -> conexao recusada: ECONNREFUSED
2026-10-18T11:22:54.363Z [ANON-112-fora#1] >> POST http://localhost:3010/v1/api/publico/pacientes (sem Authorization) BODY={"nome":"QA Paciente R7 D 72410","cpf":"93919279638","dataNascimento":"1990-09-09","email":"qa.conflito.pac.r7.d.1792322572410@teste.com","consentimentoLgpd":true,"senha":"***2026"}
2026-10-18T11:22:54.448Z [ANON-112-fora#1] CONSOLE.error: Failed to load resource: the server responded with a status of 503 (Service Unavailable)
2026-10-18T11:22:54.461Z [ANON-112-fora#1] << 503 POST http://localhost:3010/v1/api/publico/pacientes BODY={"detail":"Cadastro temporariamente indisponível. Tente novamente em instantes.","instance":"/v1/api/publico/pacientes","status":503,"title":"Serviço indisponível","type":"https://sgsm.com.br/erros/servico-indisponivel"}
[NOTA] [fora] toasts=["Cadastro temporariamente indisponível. Tente novamente em instantes."] | url=http://localhost:3010/registrar | heading "Ative sua conta"=0 | botao "Criar conta" visivel=true
2026-10-18T11:23:41.678Z [ANON-112-volta#1] << 201 POST http://localhost:3010/v1/api/publico/pacientes BODY={"email":"qa.conflito.pac.r7.d.1792322572410@teste.com","ativacaoPendente":true}
[NOTA] [volta] toasts=["Enviamos um código de 6 dígitos para o seu e-mail."] | url=http://localhost:3010/registrar?ativar=qa.conflito.pac.r7.d.1792322572410%40teste.com | heading "Ative sua conta"=1
```

### QA113 (novo) — APROVADO
- **Feito:**
  1. **Pela API, sem login** (contexto anônimo com 0 cookies, `fetch` na aba via :3010): `GET /v1/api/auth/email-disponivel` com dois e-mails que têm conta (`dev-local@sgsm.local` e `qa.conflito.pac.r6.a.1792290240168@teste.com`) e um sem conta (`qa.inexistente.r7.1792322530008@teste.com`).
  2. Repeti a chamada direto no auth de QA (:8091, sem proxy) e também abrindo a URL na barra do navegador.
  3. **Pela tela:** abri `/registrar`. Digitei no campo E-mail um e-mail **que tem conta** e saí do campo (blur). Depois preenchi o cadastro completo (QA100) e enviei. Contei **toda** requisição do contexto cuja URL contém `email-disponivel`, de qualquer origem.
- **Observado = esperado:**
  - Os três e-mails, via :3010, receberam a mesma resposta: **404** `application/problem+json` `{"detail":"No static resource v1/api/auth/email-disponivel.",…,"status":404,"title":"Not Found"}`, com corpo idêntico. Nenhum corpo tem o campo `disponivel`.
  - Direto no :8091 também deu 404 com o mesmo corpo, tanto para o e-mail com conta quanto para o sem conta.
  - Na tela de cadastro, desde a abertura de `/registrar` até a etapa "Ative sua conta", saiu **0** requisição com `email-disponivel`. A única requisição `/v1` da tela foi `POST /v1/api/publico/pacientes` (201). O cadastro funciona sem o endpoint (ver QA100).
- **Evidências:** `QA113-r7-a-endpoint-com-conta.png`, `QA113-r7-b-endpoint-sem-conta.png`, `QA113-r7.log`, `QA100-r7-a-form.png`, `QA100-r7-b-ative-sua-conta.png`
```
2026-10-18T11:22:10.019Z [ANON-R7#1] >> GET http://localhost:3010/v1/api/auth/email-disponivel?email=dev-local%40sgsm.local (sem Authorization)
2026-10-18T11:22:10.038Z [ANON-R7#1] << 404 GET http://localhost:3010/v1/api/auth/email-disponivel?email=dev-local%40sgsm.local BODY={"detail":"No static resource v1/api/auth/email-disponivel.","instance":"/v1/api/auth/email-disponivel","status":404,"title":"Not Found"}
[NOTA] (API via :3010, sem login) GET /v1/api/auth/email-disponivel?email=qa.conflito.pac.r6.a.1792290240168@teste.com -> 404 | application/problem+json | {"detail":"No static resource v1/api/auth/email-disponivel.",...,"status":404,"title":"Not Found"}
[NOTA] (API via :3010, sem login) GET /v1/api/auth/email-disponivel?email=qa.inexistente.r7.1792322530008@teste.com -> 404 | application/problem+json | {"detail":"No static resource v1/api/auth/email-disponivel.",...,"status":404,"title":"Not Found"}
[NOTA] QA113 API: status iguais=true (404/404/404) | corpos iguais=true | algum "disponivel" no corpo=false
[NOTA] (API direto :8091, sem login) GET /v1/api/auth/email-disponivel?email=dev-local@sgsm.local -> 404 | {"detail":"No static resource v1/api/auth/email-disponivel.",...}
[NOTA] (API direto :8091, sem login) GET /v1/api/auth/email-disponivel?email=qa.inexistente.r7.1792322530008@teste.com -> 404 | {"detail":"No static resource v1/api/auth/email-disponivel.",...}
[NOTA] QA113 tela: requisicoes /v1 da tela de cadastro: ["POST http://localhost:3010/v1/api/publico/pacientes"]
[NOTA] QA113 tela: requisicoes com "email-disponivel" vistas pelo contexto (qualquer URL) desde a abertura de /registrar = []
```

### Regressão

#### QA100 — APROVADO
- **Observado:** contexto anônimo → `/registrar` com dados novos e válidos (paciente A, senha de 14 caracteres, LGPD marcado) → "Criar conta".
  - Saiu **1** `POST /publico/pacientes` → **201**, com corpo só `{"email":…,"ativacaoPendente":true}` (sem id) e 0 `email-disponivel`.
  - A tela mostra "Ative sua conta" com o e-mail digitado. A URL ficou `/registrar?ativar=qa.conflito.pac.r7.a.1792322533587%40teste.com`.
- **Evidências:** `QA100-r7-a-form.png`, `QA100-r7-b-ative-sua-conta.png`, `QA100-r7.log`
```
2026-10-18T11:22:17.281Z [ANON-R7#1] >> POST http://localhost:3010/v1/api/publico/pacientes (sem Authorization) BODY={"nome":"QA Paciente R7 A 33587","cpf":"93918926710","dataNascimento":"1990-09-09","email":"qa.conflito.pac.r7.a.1792322533587@teste.com","consentimentoLgpd":true,"senha":"***2026"}
2026-10-18T11:22:18.572Z [ANON-R7#1] << 201 POST http://localhost:3010/v1/api/publico/pacientes BODY={"email":"qa.conflito.pac.r7.a.1792322533587@teste.com","ativacaoPendente":true}
```

#### QA101 — APROVADO
- **Observado:** `/login` com o e-mail e a senha **certa** da conta A, ainda não ativada.
  - Resposta **401**, sem `refresh_token`, e a tela continua em `/login`.
  - Toast "Conta ainda não ativada. Digite o código enviado para o seu e-mail.", com a ação "Digitar código".
  - A ação levou a `/registrar?ativar=<email>` já na etapa do código: o heading "Ative sua conta", o e-mail na tela e o campo "Código de ativação" estão visíveis.
- **Evidências:** `QA101-r7-a-login-nao-ativada.png`, `QA101-r7-b-etapa-codigo.png`, `QA101-r7.log`
```
2026-10-18T11:22:23.522Z [ANON-101#1] << 401 POST http://localhost:3010/v1/api/auth/login BODY={"detail":"Conta ainda não ativada. Digite o código enviado para o seu e-mail.","instance":"/v1/api/auth/login","status":401,"title":"Credenciais inválidas","type":"https://sgsm.com.br/erros/credenciais-invalidas"}
[NOTA] apos "Digitar código": url=http://localhost:3010/registrar?ativar=qa.conflito.pac.r7.a.1792322533587%40teste.com | heading=true | e-mail na tela=1 | campo do codigo visivel=true
```

#### QA106 — APROVADO
- **Observado:** na conta A, em `/registrar?ativar=<email>`, digitei o código certo, lido no Redis no papel do usuário lendo o próprio e-mail.
  - `POST /auth/ativar-conta` → **204**, com o toast "Conta ativada! Faça login para acessar o sistema." e a tela foi para `/login`.
  - O login com a mesma senha deu **200** e levou a `/pacientes`. O access token tem `roles:["PACIENTE"]`, e `/auth/me` responde `"perfil":"PACIENTE"`. O menu mostra "Home | Pacientes | Agendamentos" e o perfil "PACIENTE".
- **Observação:** o access token agora não tem a claim `tipoPerfil` (na rodada 5 vinha `"PACIENTE"`), e a resposta do login traz `"tipoPerfil":null`. A role e o perfil estão corretos e a área logada funciona. Só registro a diferença.
- **Evidências:** `QA106-r7-a-codigo.png`, `QA106-r7-b-conta-ativada.png`, `QA106-r7-c-logado-paciente.png`, `QA106-r7.log`
```
2026-10-18T11:23:47.218Z [ANON-106#1] >> POST http://localhost:3010/v1/api/auth/ativar-conta (sem Authorization) BODY={"email":"qa.conflito.pac.r7.a.1792322533587@teste.com","codigo":"***3775"}
2026-10-18T11:23:47.302Z [ANON-106#1] << 204 POST http://localhost:3010/v1/api/auth/ativar-conta BODY=
2026-10-18T11:23:52.496Z [ANON-106#1] << 200 POST http://localhost:3010/v1/api/auth/login BODY={"accessToken":"***VXUw","expiresIn":900,"refreshToken":"***f655","tipo":"Bearer","tipoPerfil":null}
2026-10-18T11:23:52.577Z [ANON-106#1] << 200 GET http://localhost:3010/v1/api/auth/me BODY={...,"perfil":"PACIENTE",...,"roles":["PACIENTE"],...}
[NOTA] login apos ativar: url=http://localhost:3010/pacientes | claims={"roles":["PACIENTE"]} | menu="... | Home | Pacientes | Agendamentos | | QA Paciente R7 A 33587 | | PACIENTE | | Sair"
```

#### QA094 — APROVADO
- **Observado:** `/login` do DEV com senha errada → 401 "Credenciais invalidas.", com o toast igual. A URL fica `/login`, sem "Request failed" e sem o alerta "Sua sessão expirou".
- **Evidências:** `QA094-r7.png`, `QA094-r7.log`
```
2026-10-18T11:22:27.944Z [ANON-094#1] >> POST http://localhost:3010/v1/api/auth/login (sem Authorization) BODY={"email":"dev-local@sgsm.local","senha":"***123!"}
2026-10-18T11:22:28.205Z [ANON-094#1] << 401 POST http://localhost:3010/v1/api/auth/login BODY={"detail":"Credenciais invalidas.","instance":"/v1/api/auth/login","status":401,"title":"Credenciais inválidas","type":"https://sgsm.com.br/erros/credenciais-invalidas"}
```

### Limpeza da rodada 7 — feita pela UI (DEV)
- **Pacientes inativados** em `/pacientes` (`DELETE /pacientes/{id}` 204 cada). Os dois aparecem "Inativo":
  - QA Paciente R7 A 33587 (`d67d284b…`)
  - QA Paciente R7 D 72410 (`95621d15…`)
- **Reservas:** `--scan sgsm:reserva*` → 0 chaves. Não criei médicos, secretárias nem agendamentos nesta rodada.
- **E-mails de login criados nesta rodada (ficam no auth):**
  - `qa.conflito.pac.r7.a.1792322533587@teste.com`: paciente, ativada no QA106.
  - `qa.conflito.pac.r7.d.1792322572410@teste.com`: paciente, pendente de ativação (QA112).
  - A tentativa 503 do QA112 não criou paciente nem login (o 201 seguinte, com o mesmo e-mail e CPF, prova isso).
- **Evidências:** `LIMPEZA-r7-a-pacientes-antes.png`, `LIMPEZA-r7-b-pacientes-depois.png`, `LIMPEZA-r7.log`

### Resumo da rodada 7

| ID | Status |
|---|---|
| QA112 | APROVADO (a tela agora recebe o 503 do sgsm, com a mensagem "Cadastro temporariamente indisponível. Tente novamente em instantes.") |
| QA113 | APROVADO (404 igual para e-mail com e sem conta; 0 chamadas a `email-disponivel` na tela) |
| QA100 | APROVADO |
| QA101 | APROVADO |
| QA106 | APROVADO (observação: o access token não tem mais a claim `tipoPerfil`) |
| QA094 | APROVADO |

## Rodada 8 (ponta a ponta WhatsApp)

> **Data:** 2026-10-18, UTC 11:56–12:15. **Ferramenta:** Playwright como biblioteca Node (autorizado), `chromium.launch({ headless: false, slowMo: 150 })`, janela visível, um contexto por sessão. Sem mock e sem `page.route`. O navegador da SEC-A ficou aberto durante todo o teste, controlado passo a passo (`qa-scratch/r8-driver.mjs` + `r8-cmd.mjs`), para intercalar com a conversa do WhatsApp.
> **Ambiente (conferido antes com curl/netstat):** front :3010 → 200 (PID 20700); sgsm :8095 sem token → 401 (PID 30824); auth :8091 (PID 31464); bot :8093 `/actuator/health` → 200 (PID 26748, cmdline com `--bot.evolution.base-url=http://localhost:8099 --bot.sgsm.base-url=http://localhost:8095 --bot.auth.base-url=http://localhost:8091`); sgsm-ia :8082 → 200 (PID 16164); receptor :8099 → 200.
> **WhatsApp:** nenhuma mensagem foi para WhatsApp real. O paciente "falou" por `POST http://localhost:8093/webhook/evolution` (header `X-Webhook-Secret` lido do `.env`, nunca gravado), formato `messages.upsert` da Evolution (`qa-scratch/r8-wa.mjs`). As respostas do bot foram lidas no `qa-scratch/evolution-captura.jsonl`. Nos logs, o código OTP aparece só com os 2 últimos dígitos.
> **Ocorrência de ambiente (receptor):** a 1ª resposta do bot foi gravada como `{"corpo": {"bruto": ""}}`. O bot envia o `POST /message/sendText` com `Transfer-Encoding: chunked`, sem `Content-Length`, e o `evolution-captura.py` só lê o corpo pelo `Content-Length`. Não editei esse arquivo. Parei o processo dele (PID 6584) e subi no mesmo :8099, gravando no mesmo `evolution-captura.jsonl` e no mesmo formato, o `qa-scratch/r8-captura-chunked.py` (cópia que também lê corpo chunked). Validei antes com um POST chunked de teste (linha `"number": "0000teste"` no jsonl). No fim, parei o meu receptor e subi de novo o `evolution-captura.py` original no :8099 (PID 1968).
> **Leituras fora da UI:** o código de ativação do paciente web no Redis (exceção autorizada, `SETUP-r8.log`) e o `--scan sgsm:reserva*` da limpeza. Li também o código-fonte do bot, do sgsm e do sgsm-ia e os logs dos serviços (`bot-qa.log`, `sgsm-qa.log`), só para diagnóstico. Nada foi preparado nem verificado por SQL/Redis.
> **Grade antes de começar:** 10:00, 11:00 e 14:00 de 21/10/2026 estavam livres na grade da SEC-A (`QA140-r8-a-grade-antes.png`). Usei esses horários.
> **Scripts:** `qa-scratch/r8-a-setup.mjs`, `r8-wa.mjs`, `r8-driver.mjs`, `r8-cmd.mjs`, `r8-captura-chunked.py`, `r8-z-montar-logs.mjs`. Dados em `qa-scratch/contas-r8.json`. Cada `evidence/<ID>-r8.log` junta três partes: (1) mensagens enviadas ao webhook + linhas cruas do jsonl do número; (2) rede `/v1/api/agendamentos*` do navegador da SEC-A; (3) trecho do log do bot no período. Logs completos em `evidence/<ID>-r8-browser.log`, `_wa-r8-*.log`, `_full-r8-driver.log` e `_full-r8-a.log`.

### Preparação
- **SEC-A:** reativada pelo DEV em `/funcionarios` (`PATCH /funcionarios/7f5a6eac…/reativar` 200). Evidência: `SETUP-r8-a-SEC-A-reativada.png`.
- **Paciente web:** "QA Paciente R8 WA 88637" (`qa.conflito.pac.r8.wa.1792324688637@teste.com`), criado pelo `/registrar` (`POST /publico/pacientes` 201) e ativado com o código (`ativar-conta` 204). O login dele deu 200 como PACIENTE. Evidências: `SETUP-r8-b-paciente-ativo-logado.png`, `SETUP-r8.log`.
- **Achado 1 — login de conta existente pelo WhatsApp não envia OTP (número `5511900009721`):**
  - Depois de "ACEITO", o paciente pediu login e mandou o e-mail três vezes, com frases diferentes.
  - Todas as mensagens foram classificadas como `AUTENTICAR`. A IA respondeu "Código enviado para seu e‑mail" e "Código ainda não chegou? Verifique a pasta de spam", mas nenhum código chegou ao jsonl.
  - No código do bot (`BotOrquestradorService`), o ramo `AUTENTICAR` só devolve texto. `enviarOtp` só é chamado em `executarCadastro`, então uma conta existente não tem como se autenticar pelo WhatsApp.
  - O paciente web não pôde ser usado. Ver `PREP-r8.log`, parte "AUTH".
- **Caminho usado (fluxo do próprio bot):** cadastro pelo WhatsApp em um número novo, `5511900009092`.
  - Sequência: "Quero me cadastrar" → consentimento do cadastro "ACEITO" → dados → "Sim".
  - **Achado 2:** com a data de nascimento "15/04/1991", o "Sim" deu "Erro ao realizar cadastro. Verifique se o CPF ou e-mail já estão cadastrados.". O log do bot mostra que a causa real foi `POST /v1/api/pacientes` → **400 "Failed to read request"**, não CPF/e-mail duplicado.
  - Antes disso, a IA respondeu "*Cadastro concluído!*" sem ter cadastrado nada.
  - Com a data em "1991-04-15", o "Sim" criou o cadastro. O OTP chegou no jsonl (`*****28*`), o código foi enviado e o bot respondeu "Conta ativada com sucesso!". Paciente criado: "QA Paciente Rotto Whats 6206" (`qa.conflito.pac.r8.wa2.1792325116206@teste.com`).
- **Observação de segurança (log do bot):** o `bot-qa.log` (DEBUG) grava o OTP em claro duas vezes: na saída ("Mensagem enviada … Seu código de verificação SGSM: *…*") e na entrada ("Webhook recebido de …: '<código>'"). Nas evidências, o código aparece mascarado.
```
{"quando": "2026-10-18T12:04:16.599920+00:00", … "text": "*Código enviado para seu e‑mail.* Por favor, verifique a caixa de entrada.\n\n_Digite seu e-mail cadastrado para receber um código de verificação._"}}   (nenhum OTP gerado)
2026-10-18T12:06:19.871Z [BOT ERROR BotOrquestradorService] Erro no cadastro para 5511900009092: 400 : "{"detail":"Failed to read request","instance":"/v1/api/pacientes","status":400,"title":"Bad Request"}"
{"quando": "2026-10-18T12:06:49.178477+00:00", "rota": "/message/sendText/sgsm-bot", "corpo": {"number": "5511900009092", "text": "Seu código de verificação SGSM: *****28*\n\n_Válido por 5 minutos._"}}
{"quando": "2026-10-18T12:07:01.159077+00:00", "rota": "/message/sendText/sgsm-bot", "corpo": {"number": "5511900009092", "text": "Conta ativada com sucesso! Como posso ajudar?\n\n*1.* Ver meus agendamentos\n*2.* Agendar consulta\n*3.* Cancelar agendamento\n*4.* Falar com a IA\n\nOu me faça uma pergunta diretamente!"}}
```

### QA140 — REPROVADO
- **Feito:**
  1. SEC-A, no navegador, abriu o wizard (Zilma, QA Descartavel, Presencial, Clinica São Lucas, 21/10) e reservou **10:00**: `POST /reservas` **201**, com a faixa "expira em 09:59".
  2. Com a reserva ativa, o paciente mandou pelo WhatsApp: "Quero agendar QA Descartavel com o Dr. Fabio Monteiro Amorim no dia 21/10/2026 às 10:00 na Clinica São Lucas".
  3. O paciente respondeu "Sim".
  4. SEC-A avançou ao passo 5 e confirmou.
- **Observado:**
  - O bot **pediu confirmação das 10:00**: "*Agendamento solicitado!* … em 21/10/2026 às 10:00 … Responda *Sim* para confirmar ou *Não* para cancelar.". Não disse que o horário estava ocupado e não ofereceu alternativas.
  - No log do bot, a pré-reserva recebeu **500** do sgsm: `Pré-reserva indisponível, seguindo sem reserva: 500 … "instance":"/v1/api/agendamentos/reservas"`. O bot seguiu sem reserva.
  - Ao "Sim", o bot tentou criar o agendamento, que deu **500** em `POST /v1/api/agendamentos`. O paciente recebeu "Não foi possível realizar o agendamento. Tente novamente ou entre em contato pelo portal.".
  - A SEC-A confirmou as 10:00 com **201** (`reservaToken` no corpo).
  - Na lista dela, o único card ativo de 21/10 10:00 é o da Zilma ("Pendente"). Não há agendamento do paciente do WhatsApp.
- **Esperado:** a resposta do bot diz que o horário "acabou de ser ocupado" e oferece alternativas, sem pedir confirmação. O observado diverge nisso. Dois pontos do esperado bateram: nenhum agendamento do paciente às 10:00 (porque o POST deu 500, não por conflito) e a SEC-A confirmou com 201.
- **Diagnóstico (só leitura, não confirmado):**
  - No `sgsm-qa.log` não há nenhuma linha (nem SQL) no instante das duas chamadas do bot (12:07:50 e 12:10:21). Isso é compatível com uma falha antes do primeiro acesso ao banco, por exemplo `servicoMedicoId` nulo em `servicoMedicoRepository.findById(...)`, que cai no handler genérico (500).
  - O bot não loga o corpo que enviou, então não dá para confirmar.
  - O `ReservaCreateRequest` do bot também não envia `estabelecimentoId` nem `tipo`.
- **Passos para reproduzir:**
  1. Subir o ambiente da seção 13 (bot :8093 → sgsm :8095, auth :8091, sgsm-ia :8082; receptor :8099).
  2. Pelo webhook, autenticar um paciente no WhatsApp. Pelo achado 1, isso só é possível pelo cadastro no bot, com a data de nascimento em `AAAA-MM-DD` (achado 2).
  3. SEC-A em `/agendamentos` → Novo Agendamento → Zilma → QA Descartavel → Presencial / Clinica São Lucas → 21/10/2026 → clicar em 10:00 (201).
  4. O paciente envia "Quero agendar QA Descartavel com o Dr. Fabio Monteiro Amorim no dia 21/10/2026 às 10:00 na Clinica São Lucas".
  5. Ver no `evolution-captura.jsonl` que o bot pede "Responda *Sim* para confirmar" e, no `bot-qa.log`, "Pré-reserva indisponível … 500".
- **Evidências:** `QA140-r8-a-grade-antes.png`, `QA140-r8-b-SEC-A-reservou-10h.png`, `QA140-r8-c-SEC-A-passo5.png`, `QA140-r8-d-SEC-A-confirmou.png`, `QA140-r8-e-lista-paciente-whatsapp.png`, `QA140-r8.log` (completo em `QA140-r8-browser.log`)
```
2026-10-18T12:07:36.623Z [SEC-A#1] << 201 POST http://localhost:3010/v1/api/agendamentos/reservas BODY={"token":"***a8ea","dataHoraInicio":"2026-10-21T13:00:00Z","dataHoraFim":"2026-10-21T13:15:00Z",…,"reservado":true}
2026-10-18T12:07:45.126Z [WA>>] POST http://localhost:8093/webhook/evolution (header X-Webhook-Secret: ***omitido***) -> HTTP 200 BODY={…"message":{"conversation":"Quero agendar QA Descartavel com o Dr. Fabio Monteiro Amorim no dia 21/10/2026 às 10:00 na Clinica São Lucas"},…}
2026-10-18T12:07:50.411Z [BOT WARN ExecutorAcaoService] Pré-reserva indisponível, seguindo sem reserva: 500 : "{"detail":"Erro interno. Tente novamente mais tarde.","instance":"/v1/api/agendamentos/reservas","status":500,"title":"Erro interno",…}"
{"quando": "2026-10-18T12:07:50.419048+00:00", "rota": "/message/sendText/sgsm-bot", "corpo": {"number": "5511900009092", "text": "*Agendamento solicitado!*\nQA Descartavel com Dr. Fabio Monteiro Amorim em 21/10/2026 às 10:00 na Clinica São Lucas.\nResponda *Sim* para confirmar ou *Não* para cancelar."}}
2026-10-18T12:10:21.734Z [BOT ERROR ExecutorAcaoService] Erro ao criar agendamento: 500 : "{"detail":"Erro interno. Tente novamente mais tarde.","instance":"/v1/api/agendamentos","status":500,…}"
{"quando": "2026-10-18T12:10:21.739752+00:00", "rota": "/message/sendText/sgsm-bot", "corpo": {"number": "5511900009092", "text": "Não foi possível realizar o agendamento. Tente novamente ou entre em contato pelo portal."}}
2026-10-18T12:10:38.330Z [SEC-A#1] << 201 POST http://localhost:3010/v1/api/agendamentos BODY={"id":"1d7c75fc-853c-42eb-81a8-6f632d7707ec",…"pacienteNome":"Zilma Ruela",…}
```

### QA141 — REPROVADO
- **Feito:**
  1. SEC-A abriu a grade de 21/10 **antes** do pedido. As 11:00 estavam livres.
  2. O paciente pediu 21/10/2026 **11:00** pelo WhatsApp.
  3. A SEC-A ficou parada 35 s (atualização periódica) e clicou nas 11:00.
  4. A SEC-A fechou o wizard, o que liberou a reserva dela (`DELETE` 204).
  5. O paciente respondeu "Não, obrigado. Desisti desse horário".
  6. Reabri a grade.
- **Observado:**
  - O bot pediu confirmação das 11:00, mas **sem pré-reserva**: o log mostra de novo `Pré-reserva indisponível … 500`.
  - Depois do `GET /slots` periódico (200), as **11:00 continuaram na grade** da SEC-A.
  - O clique nas 11:00 deu **`POST /reservas` 201** para a SEC-A, com a faixa "expira em 09:58". Não houve 409 nem alternativas.
  - Ao "Não", o bot classificou `RECUSAR` e respondeu "Tudo bem! Como posso ajudar? …". Na grade reaberta, as 11:00 estavam presentes, mas elas nunca saíram da grade.
- **Esperado:** com a pré-reserva do bot, as 11:00 somem da grade da SEC-A; com a grade desatualizada, o clique dá 409 com alternativas; depois do "Não", as 11:00 voltam. A primeira parte não aconteceu, porque o bot não conseguiu reservar (500 do sgsm).
- **Passos para reproduzir:**
  1. Paciente autenticado no WhatsApp (ver QA140, passo 2).
  2. SEC-A com o wizard aberto no passo 4 de 21/10 (Zilma, QA Descartavel, Clinica São Lucas).
  3. O paciente envia "Quero agendar QA Descartavel com o Dr. Fabio Monteiro Amorim no dia 21/10/2026 às 11:00 na Clinica São Lucas" e recebe o pedido de confirmação.
  4. Esperar 30 s na grade da SEC-A: as 11:00 continuam.
  5. Clicar nas 11:00: `POST /reservas` 201, em vez de 409.
- **Evidências:** `QA141-r8-a-grade-antes.png`, `QA141-r8-b-grade-apos-atualizar.png`, `QA141-r8-c-SEC-A-clicou-11h.png`, `QA141-r8-d-grade-apos-nao.png`, `QA141-r8.log` (completo em `QA141-r8-browser.log`)
```
{"quando": "2026-10-18T12:11:15.353690+00:00", "rota": "/message/sendText/sgsm-bot", "corpo": {"number": "5511900009092", "text": "*Agendamento solicitado!* QA Descartavel com Dr. Fabio Monteiro Amorim em 21/10/2026 às 11:00 na Clinica São Lucas. Responda *Sim* para confirmar ou *Não* para cancelar."}}
2026-10-18T12:11:15.348Z [BOT WARN ExecutorAcaoService] Pré-reserva indisponível, seguindo sem reserva: 500 : "{…"instance":"/v1/api/agendamentos/reservas","status":500,…}"
[NOTA] QA141 apos 35 s (atualizacao periodica): GET slots=["200 GET …/v1/api/agendamentos/slots?…&data=2026-10-21"] | 11:00 na grade=true
[NOTA] QA141 SEC-A clicou 11:00 -> POST /reservas 201 | faixa=Horário reservado para você — expira em 09:58 | msg erro=[]
[NOTA] QA141 SEC-A fechou o wizard (libera a propria reserva das 11:00) -> DELETE 204
{"quando": "2026-10-18T12:12:23.031159+00:00", "rota": "/message/sendText/sgsm-bot", "corpo": {"number": "5511900009092", "text": "Tudo bem! Como posso ajudar?\n\n*1.* Ver meus agendamentos\n*2.* Agendar consulta\n*3.* Cancelar agendamento\n*4.* Falar com a IA\n\nOu me faça uma pergunta diretamente!"}}
```

### QA142 — REPROVADO
- **Feito:**
  1. O paciente pediu 21/10/2026 **14:00** e respondeu "Sim".
  2. Segunda tentativa, conversando como paciente: perguntou "Quais serviços o Dr. Fabio Monteiro Amorim atende na Clinica São Lucas?". A IA listou "Consulta de Rotina" e "QA Descartavel".
  3. Pediu de novo "o serviço QA Descartavel … quarta-feira 21/10/2026 às 14:00, presencial na Clinica São Lucas" e respondeu "Sim, confirmo".
  4. Conferi a lista e a grade da SEC-A.
- **Observado:**
  - Nas duas tentativas o bot pediu confirmação: a pré-reserva deu 500 e ele seguiu sem reserva.
  - Ao "Sim", `POST /v1/api/agendamentos` deu **500** e o paciente recebeu "Não foi possível realizar o agendamento. Tente novamente ou entre em contato pelo portal.".
  - Na lista da SEC-A (após recarregar) não há agendamento de 21/10 14:00, e as 14:00 continuam livres na grade.
- **Esperado:** "Agendamento confirmado com sucesso!" e o agendamento das 14:00 na lista da SEC-A. Não aconteceu.
- **Passos para reproduzir:**
  1. Paciente autenticado no WhatsApp.
  2. O paciente envia "Quero agendar QA Descartavel com o Dr. Fabio Monteiro Amorim no dia 21/10/2026 às 14:00 na Clinica São Lucas" e recebe o pedido de confirmação.
  3. O paciente envia "Sim" e recebe "Não foi possível realizar o agendamento…". No `bot-qa.log` aparece `Erro ao criar agendamento: 500`.
  4. Na lista e na grade da SEC-A, nada às 14:00.
- **Evidências:** `QA142-r8-a-lista-sem-14h.png`, `QA142-r8-b-grade-14h-livre.png`, `QA142-r8.log` (completo em `QA142-r8-browser.log`)
```
{"quando": "2026-10-18T12:12:59.365408+00:00", "rota": "/message/sendText/sgsm-bot", "corpo": {"number": "5511900009092", "text": "Não foi possível realizar o agendamento. Tente novamente ou entre em contato pelo portal."}}
{"quando": "2026-10-18T12:13:11.610632+00:00", "rota": "/message/sendText/sgsm-bot", "corpo": {"number": "5511900009092", "text": "*Dr. Fabio Monteiro Amorim* atende na Clínica São Lucas os seguintes serviços:\n- Consulta de Rotina\n- QA Descartavel\n*Estou à disposição para agendar ou esclarecer dúvidas!*"}}
2026-10-18T12:13:22.8Z [BOT WARN ExecutorAcaoService] Pré-reserva indisponível, seguindo sem reserva: 500 : "{…"instance":"/v1/api/agendamentos/reservas","status":500,…}"
{"quando": "2026-10-18T12:13:38.592702+00:00", "rota": "/message/sendText/sgsm-bot", "corpo": {"number": "5511900009092", "text": "Não foi possível realizar o agendamento. Tente novamente ou entre em contato pelo portal."}}
[NOTA] QA142 lista da SEC-A (cards de 21/10/2026) apos o "Sim" do paciente: [... só cards "Cancelado" e "Zilma Ruela | QA Descartavel | Pendente | ... | 21/10/2026, 10:00" ...]
[NOTA] QA142 grade apos o "Sim": 14:00 presente=true
```

### Limpeza da rodada 8 — feita pela UI
- **Agendamento:** o das 10:00 da Zilma (QA140) foi cancelado pela SEC-A no card (`PATCH …/cancelar` 204, origem ESTABELECIMENTO). Depois disso, não há card ativo em 21/10/2026. O bot não criou agendamentos.
- **Pacientes inativados pelo DEV em `/pacientes`:**
  - "QA Paciente R8 WA 88637" (web)
  - "QA Paciente Rotto Whats 6206" (criado pelo bot; só existe um, o 400 da 1ª tentativa não criou paciente)
- **SEC-A:** inativada em `/funcionarios`.
- **Reservas:** `docker exec redis-sgsm redis-cli --scan --pattern "sgsm:reserva*"` → vazio (0 chaves).
- **Logins que ficam no auth:**
  - `qa.conflito.pac.r8.wa.1792324688637@teste.com` (web, ativada)
  - `qa.conflito.pac.r8.wa2.1792325116206@teste.com` (criado pelo bot com senha temporária desconhecida)
- **Sessões do bot:** ficam no Redis do bot (números fictícios `5511900009721` e `5511900009092`). Não mexi nelas.
- **Receptor:** o `evolution-captura.py` original voltou a rodar no :8099.
- **Evidências:** `LIMPEZA-r8-a-agendamento-cancelado.png`, `LIMPEZA-r8-b-pacientes-web.png`, `LIMPEZA-r8-b-pacientes-bot.png`, `LIMPEZA-r8-c-SEC-A-inativa.png`, `LIMPEZA-r8.log`

### Resumo da rodada 8

| ID | Status |
|---|---|
| QA140 | REPROVADO (pré-reserva do bot → 500; o bot pede confirmação das 10:00 em vez de "acabou de ser ocupado" + alternativas; a SEC-A confirmou com 201) |
| QA141 | REPROVADO (o bot não reserva as 11:00 (500); as 11:00 continuam na grade da SEC-A e o clique dá 201, não 409) |
| QA142 | REPROVADO (`POST /agendamentos` do bot → 500; "Não foi possível realizar o agendamento…"; nada às 14:00) |

Achados fora do plano:
1. O login de conta existente pelo WhatsApp nunca envia OTP (ramo `AUTENTICAR`).
2. O cadastro pelo bot com data de nascimento "DD/MM/AAAA" dá 400 no sgsm e a mensagem ao paciente culpa CPF/e-mail duplicado.
3. O `bot-qa.log` (DEBUG) grava o OTP em claro.
4. O `evolution-captura.py` não lê corpo chunked (ocorrência de ambiente do QA).

## Rodada 9 (ponta a ponta WhatsApp e login pelo WhatsApp)

> **Data:** 2026-10-18, UTC 19:22–19:37. **Ferramenta:** Playwright como biblioteca Node (autorizado), `chromium.launch({ headless: false, slowMo: 150 })`, janela visível, um contexto por sessão. Sem mock e sem `page.route`. O navegador da SEC-A ficou aberto e foi controlado passo a passo (`qa-scratch/r9-driver.mjs` + `r9-cmd.mjs`).
> **Tentativa anterior (interrompida):** encontrei arquivos `*-r9*` de uma tentativa de 12:26–12:31Z. Considerei todos descartados e movi para `evidence/_descartado-r9-tentativa1/` e `qa-scratch/_descartado-r9-tentativa1/`. Nenhum deles é usado como prova nesta rodada.
>   - A tentativa deixou a SEC-A **ativa**. O setup a encontrou "Ativo" e não precisou reativar.
>   - Ela também deixou o paciente "QA Paciente Rnove Whats Cddb" (`qa.conflito.pac.r9.wa.1792326412331@teste.com`, criado pelo bot). Ele foi inativado na limpeza.
>   - Não deixou agendamento ativo em 21/10/2026: na lista da SEC-A, todos os cards de 21/10 estavam "Cancelado". Não deixou reserva: `--scan sgsm:reserva*` deu 0 chaves antes de começar. Por isso usei os horários 10:00, 11:00 e 14:00, livres na grade (`QA140-r9-a-grade-antes.png`).
> **Ambiente (conferido com curl/netstat):** auth, bot, sgsm, receptor e front foram (re)iniciados às 19:21Z, depois dos jars (auth/bot de 19:21Z, sgsm de 12:24Z).
>   - front :3010 → 200 (PID 6580)
>   - sgsm :8095 sem token → 401 (PID 24056, `sgsm-qa.jar`)
>   - auth :8091 (PID 31292, `auth-qa.jar`)
>   - bot :8093 `/actuator/health` → 200 (PID 22400, cmdline com `--bot.evolution.base-url=http://localhost:8099 --bot.sgsm.base-url=http://localhost:8095 --bot.auth.base-url=http://localhost:8091`)
>   - sgsm-ia :8082 → 200 (PID 16164, no ar desde 17/10, sem a correção nova do sgsm-ia)
>   - receptor :8099 → 200 (PID 29912, `evolution-captura.py` original)
> **Receptor:** o `evolution-captura.py` no ar agora trata `Transfer-Encoding: chunked` (linhas 18–19 do arquivo). Todas as respostas do bot desta rodada foram gravadas com corpo completo, e não precisei do receptor substituto da rodada 8.
> **WhatsApp:** nenhuma mensagem foi para WhatsApp real.
>   - O paciente "falou" por `POST http://localhost:8093/webhook/evolution`, no formato `messages.upsert`, com o header `X-Webhook-Secret` lido do `.env` e nunca gravado (`qa-scratch/r9-wa.mjs`).
>   - As respostas foram lidas no `qa-scratch/evolution-captura.jsonl`. Nas evidências, os códigos aparecem só com os 2 últimos dígitos.
>   - Conferi com grep que nenhum código completo nem o segredo aparece nos arquivos `evidence/*r9*`.
> **Leituras fora da UI:** todas são exceções autorizadas:
>   - o código de ativação do paciente web (`auth:ativacao:codigo:<email>`, `SETUP-r9.log`);
>   - o código de login enviado ao e-mail (`auth:otp:<email>`, linhas `[REDIS-LEITURA]` do `QA143-r9.log`), além de `EXISTS`/`TTL`/`--scan` de `auth:otp:*` para provar que o e-mail sem conta não gerou código;
>   - o `--scan sgsm:reserva*` da limpeza.
>   Li código-fonte do bot, do auth e do sgsm-ia e os logs dos serviços só para diagnóstico.
> **Scripts:** `qa-scratch/r9-a-setup.mjs`, `r9-wa.mjs`, `r9-driver.mjs`, `r9-cmd.mjs`, `r9-y-montar-logs.mjs`, `r9-z-limpeza.mjs`. Dados em `qa-scratch/contas-r9.json` e `r9-pac-bot.json`.
>   - Cada `evidence/<ID>-r9.log` junta: (1) mensagens enviadas ao webhook e linhas cruas do jsonl do número; (2) rede `/v1/api/agendamentos*` do navegador da SEC-A; (3) o log do bot no período; (4) o log do auth (QA143) ou as linhas WARN/ERROR do sgsm de QA (QA140–142) no período.
>   - Logs completos em `_wa-r9-*.log`, `_full-r9-driver.log`, `_full-r9-a.log` e `_full-r9-z.log`.

### Preparação
- **SEC-A:** já estava ativa (resto da tentativa interrompida), conferido pelo DEV em `/funcionarios`. Evidência: `SETUP-r9-a-SEC-A-reativada.png`.
- **Paciente com conta (para o QA143 e o QA140–142):** "QA Paciente R9 Conta 70435" (`qa.conflito.pac.r9.conta.1792351470435@teste.com`).
  - Criado pelo `/registrar` (`POST /publico/pacientes` 201) e ativado com o código (`ativar-conta` 204).
  - O login web deu 200 como PACIENTE.
  - Evidências: `SETUP-r9-b-paciente-ativo-logado.png`, `SETUP-r9.log`.
- Como o QA143 passou, o QA140–142 usaram esse paciente pelo número `5511900009431`.

### QA143 (novo) — APROVADO
- **Feito:**
  1. **Número `5511900009431`, e-mail com conta:**
     - mandei "Olá, boa noite" e depois "ACEITO";
     - mandei só o e-mail da conta;
     - li o código no "e-mail" (`auth:otp:<email>`, no papel do paciente lendo o próprio e-mail) e digitei esse código no WhatsApp.
  2. **Número `5511900009432`, e-mail sem conta:**
     - mandei "Oi" e "ACEITO", depois o e-mail sem conta `qa.inexistente.r9.1792351526893@teste.com`;
     - conferi o Redis (`EXISTS auth:otp:<email>` antes e depois, e `--scan auth:otp:*inexistente*`);
     - digitei um código qualquer.
  3. **Quem pode chamar o endpoint novo:** `POST :8091/v1/api/auth/otp/enviar-email` sem token e com o access token do próprio paciente.
  4. Depois do login, o paciente pediu agendamento (ver QA140).
- **Observado = esperado:**
  - **Com conta:**
    - O bot respondeu "Se houver uma conta com o e-mail qa.conflito.pac.r9.conta.1792351470435@teste.com, enviei para ele um código de 6 dígitos (vale 5 minutos). Digite o código aqui para entrar.".
    - **Nenhum código apareceu no WhatsApp:** entre o e-mail e o código digitado, a única linha do jsonl para esse número é essa resposta.
    - `auth:otp:<email>` não existia antes e passou a existir (TTL 295 s).
    - O auth tentou mandar o e-mail: `EmailService` "Falha ao enviar código de login do WhatsApp para <email>" com `MailAuthenticationException`. A conta SMTP de dev não autentica, então a entrega real não foi verificada, como o plano já prevê.
    - Com o código digitado, o bot respondeu "Conta ativada com sucesso! Como posso ajudar? … *1.* Ver meus agendamentos …", que é o menu de autenticado, e a chave foi consumida (`EXISTS` → 0).
    - Em seguida o paciente pediu agendamento: o intent foi `AGENDAR` com sessão autenticada (ver QA140). Ele não recebeu "primeiro preciso confirmar sua identidade".
  - **Sem conta:**
    - A resposta foi **a mesma** ("Se houver uma conta com o e-mail qa.inexistente.r9.1792351526893@teste.com, enviei para ele um código de 6 dígitos…").
    - `auth:otp:<email>` **não** foi criada (`EXISTS` 0 antes e depois). O auth não registrou nenhuma tentativa de e-mail para esse endereço.
    - O único registro no Redis é `auth:otp:envio-email:<email>` = `"1"` (TTL ~900 s). É um contador de envios (`ENVIO_EMAIL_PREFIX` do `OtpService`), não um código. A conta com e-mail também recebeu esse contador.
    - O código qualquer deu "Código incorreto ou expirado. Tente novamente.".
  - **Endpoint:** sem `Authorization` → 400 "Required header 'Authorization' is not present."; com o token do paciente → **401** "Apenas o bot sistema pode gerar OTP para outro usuário.". O endpoint não gerou código (`EXISTS` 0).
- **Evidências:** `QA143-r9.log` (junta `_wa-r9-QA143.log`, `_wa-r9-QA143-semconta.log`, `_wa-r9-QA143-endpoint.log`, mais os trechos do bot e do auth)
```
2026-10-18T19:24:51Z [REDIS-LEITURA] EXISTS auth:otp:qa.conflito.pac.r9.conta.1792351470435@teste.com (antes) -> 0
2026-10-18T19:25:02.515Z [WA>>] POST http://localhost:8093/webhook/evolution (header X-Webhook-Secret: ***omitido***) -> HTTP 200 BODY={…"remoteJid":"5511900009431@s.whatsapp.net"…"message":{"conversation":"qa.conflito.pac.r9.conta.1792351470435@teste.com"}…}
2026-10-18T19:25:07.538Z [WA<< jsonl cru] {"quando": "2026-10-18T19:25:02.839569+00:00", "rota": "/message/sendText/sgsm-bot", "corpo": {"text": "Se houver uma conta com o e-mail qa.conflito.pac.r9.conta.1792351470435@teste.com, enviei para ele um código de 6 dígitos (vale 5 minutos). Digite o código aqui para entrar.", "number": "5511900009431"}}
2026-10-18T19:25:07Z [REDIS-LEITURA] EXISTS auth:otp:qa.conflito.pac.r9.conta.1792351470435@teste.com (depois) -> 1 TTL=295
2026-10-18T19:25:05.811805200Z [ms-sboot-auth ERROR EmailService] Falha ao enviar código de login do WhatsApp para qa.conflito.pac.r9.conta.1792351470435@teste.com | error.type=org.springframework.mail.MailAuthenticationException | error.message=Authentication failed
[REDIS-LEITURA] GET "auth:otp:qa.conflito.pac.r9.conta.1792351470435@teste.com" -> ****46  (paciente lendo o proprio e-mail; excecao autorizada)
2026-10-18T19:25:14.478Z [WA>>] … "message":{"conversation":"****46 (codigo lido no e-mail da conta (Redis auth:otp), mascarado)"} …
2026-10-18T19:25:19.487Z [WA<< jsonl cru] {"quando": "2026-10-18T19:25:14.541969+00:00", …, "corpo": {"text": "Conta ativada com sucesso! Como posso ajudar?\n\n*1.* Ver meus agendamentos\n*2.* Agendar consulta\n*3.* Cancelar agendamento\n*4.* Falar com a IA\n\nOu me faça uma pergunta diretamente!", "number": "5511900009431"}}
2026-10-18T19:25:19Z [REDIS-LEITURA] EXISTS auth:otp:qa.conflito.pac.r9.conta.1792351470435@teste.com (apos usar o codigo) -> 0
2026-10-18T19:25:42.578Z [WA<< jsonl cru] {"quando": "2026-10-18T19:25:37.601878+00:00", …, "corpo": {"text": "Se houver uma conta com o e-mail qa.inexistente.r9.1792351526893@teste.com, enviei para ele um código de 6 dígitos (vale 5 minutos). Digite o código aqui para entrar.", "number": "5511900009432"}}
2026-10-18T19:25:45Z [REDIS-LEITURA] EXISTS auth:otp:qa.inexistente.r9.1792351526893@teste.com (depois) -> 0 | scan auth:otp:*inexistente* -> [auth:otp:envio-email:qa.inexistente.r9.1792351526893@teste.com ]
{"detail":"Apenas o bot sistema pode gerar OTP para outro usuário.","instance":"/v1/api/auth/otp/enviar-email","status":401,"title":"Credenciais inválidas",…} << HTTP 401
```

### Log do bot sem texto/OTP (correção da rodada 8) — verificado
- No `bot-qa.log` inteiro desta instância (DEBUG, PID 22400, 98 linhas), deu **0** ocorrência para cada um destes trechos: "boa noite", "ACEITO", "Quero agendar", "QA Descartavel", "Desisti", os e-mails, o CPF, "15/04/1991", "Se houver uma conta", "Conta ativada" e "verifica" (do "código de verificação").
- Também não há nenhuma sequência isolada de 6 dígitos no campo `message`.
- Por mensagem, o bot agora grava só "Webhook recebido de <número> (N caracteres)", "Intent detectado para <número>: <INTENT>" e "Mensagem enviada para <número> (N caracteres)".
- Isso vale também para o OTP do cadastro pelo bot (19:32:34, "Mensagem enviada … (65 caracteres)") e para o código digitado (19:32:45, "Webhook recebido … (6 caracteres)").
- **Evidência:** `LOGBOT-r9-sem-texto.log`

### Cadastro pelo bot com nascimento DD/MM/AAAA (correção da rodada 8) — verificado
- **Número `5511900009433`:** mandei "Olá", "ACEITO", "Quero me cadastrar" e "ACEITO". Depois mandei os dados com "data de nascimento: 15/04/1991" e respondi "Sim".
- **Observado:**
  - O bot mandou "Seu código de verificação SGSM: *****71*" e "Cadastro criado! Para ativar sua conta, digite o código que acabei de enviar para este WhatsApp.". Com o código, respondeu "Conta ativada com sucesso!".
  - O paciente "QA Paciente Rnove Bot 4708" aparece em `/pacientes` com nascimento 15/04/1991. Não houve mais o 400 "Failed to read request" da rodada 8.
- **Evidência:** `CAD-r9.log`, `LIMPEZA-r9-b2-pacientes-Rnove.png`

### sgsm sem `servicoMedicoId` (correção da rodada 8) — verificado
- **Feito:** na sessão da SEC-A (fetch via :3010 com o token da própria sessão), mandei os dois POSTs sem `servicoMedicoId`.
- **Observado:** os dois deram **400** "Informe o serviço médico do agendamento." (`type …/argumento-invalido`), não 500.
- A parte "500 inesperado agora é registrado no log" **não foi exercitada**: não houve nenhum 500 nesta rodada, e o `sgsm-qa.log` tem 0 linhas ERROR.
- **Evidência:** `SGSM-r9-sem-servico.log`
```
[NOTA] POST /v1/api/agendamentos/reservas (sem servicoMedicoId) -> 400 {"detail":"Informe o serviço médico do agendamento.","instance":"/v1/api/agendamentos/reservas","status":400,"title":"Requisição inválida","type":"https://sgsm.com.br/erros/argumento-invalido"}
[NOTA] POST /v1/api/agendamentos (sem servicoMedicoId) -> 400 {"detail":"Informe o serviço médico do agendamento.","instance":"/v1/api/agendamentos","status":400,"title":"Requisição inválida","type":"https://sgsm.com.br/erros/argumento-invalido"}
```

### QA140 — BLOQUEADO
- **Motivo:** a IA de classificação (sgsm-ia :8082) não extraiu o serviço (`servicoMedicoId`) em nenhuma das 7 mensagens do paciente. Por isso o bot nunca chegou à pré-reserva, e não foi possível verificar a resposta "acabou de ser ocupado" com alternativas.
- **Feito:**
  1. SEC-A, no navegador, abriu o wizard (Zilma, QA Descartavel, Presencial, Clinica São Lucas, 21/10) e reservou **10:00**: `POST /reservas` **201**, faixa "expira em 09:59".
  2. Com a reserva ativa, o paciente autenticado no QA143 (`5511900009431`) mandou a frase do plano: "Quero agendar QA Descartavel com o Dr. Fabio Monteiro Amorim no dia 21/10/2026 às 10:00 na Clinica São Lucas".
  3. Conversei como paciente, com 6 mensagens a mais:
     - perguntei os serviços do médico;
     - repeti o pedido com "o serviço QA Descartavel … presencial na Clinica São Lucas, no dia 21/10/2026 às 10:00";
     - informei o nome completo quando a IA pediu;
     - perguntei o código do serviço;
     - mandei "Quero a consulta QA Descartavel, dia 21/10/2026 às 10:00";
     - informei o e-mail quando a IA pediu.
  4. SEC-A avançou ao passo 5 e confirmou.
- **Observado:**
  - Correção do bot verificada: a IA classificou `AGENDAR` sem o serviço, e o bot **não** reservou nem pediu "Sim". Em 3 das mensagens ele respondeu "Para agendar, preciso saber o serviço (ou consulta), a data e o horário. Pode me dizer qual consulta deseja e quando?". Não houve erro nem 500.
  - Nas outras mensagens, a IA listou os serviços ("Consulta de Rotina", "QA Descartavel") e pediu o nome e depois o e-mail. Também respondeu "*O serviço QA Descartavel* não possui um código público divulgado.".
  - O log do bot não tem nenhuma linha de reserva/agendamento, e o `sgsm-qa.log` tem 0 WARN/ERROR no período.
  - A SEC-A confirmou as 10:00 com **201** (`reservaToken` no corpo; id `fe7b450e…`).
  - O único card ativo de 21/10 na lista dela é "Zilma Ruela | QA Descartavel | Pendente | … | 21/10/2026, 10:00". Não há agendamento do paciente do WhatsApp.
- **Esperado não verificável:** o bot dizer que o horário "acabou de ser ocupado" e oferecer alternativas, sem pedir confirmação. Ele não chega à pré-reserva sem o serviço. As partes "nenhum agendamento do paciente às 10:00" e "SEC-A confirma com 201" bateram, mas porque o bot não tentou agendar.
- **Diagnóstico (só leitura):**
  - O sgsm-ia em execução (commit `7c5e7e9`) monta o CONTEXTO do LLM só com `m.embedded().text()` (`WhatsAppService.classificar`). O texto do documento de serviço (`DocumentoBuilder.construirServico`: "Serviço médico: %s. Médico: %s (%s). Descrição…") não contém o ID do serviço.
  - Por isso o LLM não tem de onde tirar `servicoMedicoId`, e nenhuma conversa resolve isso nesta instância.
  - O sgsm-ia tem alterações locais não commitadas em `WhatsAppService.java` (a correção "só testada em unidade"), que não estão no ar.
- **Evidências:** `QA140-r9-a-grade-antes.png`, `QA140-r9-b-SEC-A-reservou-10h.png`, `QA140-r9-c-SEC-A-passo5.png`, `QA140-r9-d-SEC-A-confirmou.png`, `QA140-r9.log` (completo em `QA140-r9-browser.log`)
  - O card novo "Pendente" das 10:00 ficou fora da área visível do print `-d`. O texto do card está na nota "QA140 cards ativos…" do log.
```
2026-10-18T19:27:00.901Z [SEC-A#1] << 201 POST http://localhost:3010/v1/api/agendamentos/reservas BODY={"token":"***9988","dataHoraInicio":"2026-10-21T13:00:00Z","dataHoraFim":"2026-10-21T13:15:00Z",…}
2026-10-18T19:27:02.136Z >> Quero agendar QA Descartavel com o Dr. Fabio Monteiro Amorim no dia 21/10/2026 às 10:00 na Clinica São Lucas
2026-10-18T19:27:05.984157800Z [ms-whatsapp-bot DEBUG BotOrquestradorService] Intent detectado para 5511900009431: AGENDAR
{"quando": "2026-10-18T19:27:05.992436+00:00", "rota": "/message/sendText/sgsm-bot", "corpo": {"text": "Para agendar, preciso saber o serviço (ou consulta), a data e o horário. Pode me dizer qual consulta deseja e quando?", "number": "5511900009431"}}
2026-10-18T19:27:29.628500+00:00 << *Dr. Fabio Monteiro Amorim* oferece os seguintes serviços na Clínica São Lucas:\n- Consulta de Rotina\n- QA Descartavel
2026-10-18T19:27:37.648565+00:00 << *Para confirmar o agendamento, preciso do seu nome completo.* Por favor, informe.
2026-10-18T19:27:51.203895+00:00 << Para agendar, preciso saber o serviço (ou consulta), a data e o horário. Pode me dizer qual consulta deseja e quando?
2026-10-18T19:28:07.402473+00:00 << *O serviço QA Descartavel* não possui um código público divulgado. Caso queira agendar ou saber mais, estou à disposição.
2026-10-18T19:28:16.973829+00:00 << *Para confirmar o agendamento, preciso do seu e‑mail cadastrado.* Por favor, informe.
2026-10-18T19:28:31.447442+00:00 << Para agendar, preciso saber o serviço (ou consulta), a data e o horário. Pode me dizer qual consulta deseja e quando?
2026-10-18T19:29:05.206Z [SEC-A#1] << 201 POST http://localhost:3010/v1/api/agendamentos BODY={"id":"fe7b450e-4cfb-4daa-b5c5-a291177e54b8",…"pacienteNome":"Zilma Ruela",…}
[NOTA] QA140 cards ativos de 21/10/2026 na lista da SEC-A: ["Zilma Ruela |  | QA Descartavel |  | Pendente | Fabio Monteiro Amorim | Clinica São Lucas | 21/10/2026, 10:00 | Cancelar | Confirmar"]
## 4. Log do sgsm de QA (sgsm-qa.log) no periodo, WARN/ERROR: 0 linha(s)
```

### QA141 — BLOQUEADO
- **Motivo:** o mesmo do QA140. A IA não extraiu o serviço, então o bot não faz a pré-reserva das 11:00 e não dá para verificar o bloqueio na grade da SEC-A nem o 409.
- **Feito:**
  1. SEC-A abriu a grade de 21/10 **antes** do pedido. As 11:00 estavam livres; as 10:00 já não apareciam, por causa do agendamento do QA140.
  2. O paciente mandou a frase do plano para as 11:00 e depois "O serviço é QA Descartavel, dia 21/10/2026, às 11:00, presencial na Clinica São Lucas com o Dr. Fabio Monteiro Amorim".
  3. A SEC-A ficou parada 35 s.
  4. O paciente mandou "Não, obrigado. Desisti desse horário".
- **Observado:**
  - Nas duas mensagens, a IA deu `AGENDAR` e o bot **perguntou** "Para agendar, preciso saber o serviço (ou consulta), a data e o horário…", sem erro e sem pedir confirmação.
  - Depois do `GET /slots` periódico (200), as 11:00 continuaram na grade. Isso é coerente, porque não houve pré-reserva. Não cliquei nas 11:00, porque com o horário livre o 409 esperado não se aplica.
  - O "Não" foi classificado `RECUSAR` e o bot respondeu "Tudo bem! Como posso ajudar? …".
  - A SEC-A fechou o wizard; não havia reserva dela.
- **Evidências:** `QA141-r9-a-grade-antes.png`, `QA141-r9-b-grade-apos-pedido.png`, `QA141-r9.log` (completo em `QA141-r9-browser.log`)
```
2026-10-18T19:29:54.769213+00:00 << Para agendar, preciso saber o serviço (ou consulta), a data e o horário. Pode me dizer qual consulta deseja e quando?
2026-10-18T19:30:03.718215+00:00 << Para agendar, preciso saber o serviço (ou consulta), a data e o horário. Pode me dizer qual consulta deseja e quando?
[NOTA] QA141 apos 35 s (atualizacao periodica): GET slots=["200 GET http://localhost:3010/v1/api/agendamentos/slots?…&data=2026-10-21"] | 11:00 na grade=true
2026-10-18T19:30:53.170347800Z [ms-whatsapp-bot DEBUG BotOrquestradorService] Intent detectado para 5511900009431: RECUSAR
2026-10-18T19:30:53.178652+00:00 << Tudo bem! Como posso ajudar?\n\n*1.* Ver meus agendamentos\n*2.* Agendar consulta\n*3.* Cancelar agendamento\n*4.* Falar com a IA …
```

### QA142 — BLOQUEADO
- **Motivo:** o mesmo do QA140. Sem o serviço extraído, o bot não chega à confirmação e não dá para verificar o "Agendamento confirmado com sucesso!".
- **Feito:**
  1. O paciente pediu 21/10/2026 **14:00** com a frase do plano e respondeu "Sim".
  2. Fiz uma segunda tentativa: "Quero o serviço QA Descartavel do Dr. Fabio Monteiro Amorim na Clinica São Lucas, quarta-feira 21/10/2026 às 14:00. Pode confirmar?" e depois "Sim, confirmo".
  3. Conferi a lista e a grade da SEC-A.
- **Observado:**
  - Ao pedido, o bot respondeu "Para agendar, preciso saber o serviço…".
  - Ao "Sim", "Não há nenhuma ação pendente para confirmar.". O bot não criou nada e não houve erro.
  - A IA classificou a frase com "Pode confirmar?" como `CONFIRMAR`, e as respostas a ela e ao "Sim, confirmo" foram as mesmas.
  - Na lista da SEC-A (após recarregar), o único card ativo de 21/10 é o das 10:00 da Zilma. As 14:00 continuam livres na grade.
- **Evidências:** `QA142-r9-a-lista-sem-14h.png`, `QA142-r9-b-grade-14h-livre.png`, `QA142-r9.log` (completo em `QA142-r9-browser.log`)
```
2026-10-18T19:31:12.843995+00:00 << Para agendar, preciso saber o serviço (ou consulta), a data e o horário. Pode me dizer qual consulta deseja e quando?
2026-10-18T19:31:19.508501+00:00 << Não há nenhuma ação pendente para confirmar.      (resposta ao "Sim"; intent CONFIRMAR)
2026-10-18T19:31:27.677455+00:00 << Não há nenhuma ação pendente para confirmar.      (resposta ao pedido com "Pode confirmar?"; intent CONFIRMAR)
2026-10-18T19:31:34.400082+00:00 << Não há nenhuma ação pendente para confirmar.      (resposta ao "Sim, confirmo")
[NOTA] QA142 cards ativos de 21/10/2026 na lista da SEC-A apos o "Sim" do paciente: [só "Zilma Ruela | … | 21/10/2026, 10:00"]
[NOTA] QA142 grade apos o "Sim": 14:00 presente=true
```

### Limpeza da rodada 9 — feita pela UI
- **Agendamento:** a SEC-A cancelou no card o agendamento das 10:00 da Zilma (QA140): `PATCH …/cancelar` **204**, origem Estabelecimento, motivo "Limpeza do QA rodada 9". Depois disso, há 0 card ativo em 21/10/2026. O bot não criou agendamentos.
- **Pacientes inativados pelo DEV em `/pacientes`** (`DELETE /pacientes/{id}` 204 cada; os três aparecem "Inativo"):
  - "QA Paciente R9 Conta 70435" (web)
  - "QA Paciente Rnove Bot 4708" (cadastro pelo bot desta rodada)
  - "QA Paciente Rnove Whats Cddb" (resto da tentativa interrompida)
- **SEC-A:** inativada em `/funcionarios` (`DELETE /funcionarios/7f5a6eac…` 204, "Inativo").
- **Reservas:** `docker exec redis-sgsm redis-cli --scan --pattern "sgsm:reserva*"` → vazio (0 chaves), sem precisar esperar expirar.
- **Logins que ficam no auth:**
  - `qa.conflito.pac.r9.conta.1792351470435@teste.com` (web, ativada)
  - `qa.conflito.pac.r9.bot.1792351924708@teste.com` e `qa.conflito.pac.r9.wa.1792326412331@teste.com` (criados pelo bot)
- **Sessões do bot:** ficam no Redis do bot (números fictícios `5511900009431`, `…432`, `…433` e `…193` da tentativa 1). Não mexi nelas.
- **Evidências:** `LIMPEZA-r9-a-agendamento-cancelado.png`, `LIMPEZA-r9-b1-pacientes-QA-Paciente-R9.png`, `LIMPEZA-r9-b2-pacientes-Rnove.png`, `LIMPEZA-r9-c-SEC-A-inativa.png`, `LIMPEZA-r9.log`, `LIMPEZA-r9-SEC-A.log`

### Resumo da rodada 9

| ID | Status |
|---|---|
| QA143 | APROVADO (código só no e-mail da conta, nada no WhatsApp; login com o código funciona; e-mail sem conta tem a mesma resposta e não gera `auth:otp`; endpoint recusa token de paciente com 401) |
| QA140 | BLOQUEADO (a IA :8082 não extrai `servicoMedicoId`; o bot pergunta pelo serviço em vez de dar erro; a SEC-A confirmou as 10:00 com 201) |
| QA141 | BLOQUEADO (mesmo motivo; sem pré-reserva, as 11:00 continuam na grade; "Não" → "Tudo bem!") |
| QA142 | BLOQUEADO (mesmo motivo; "Sim" → "Não há nenhuma ação pendente para confirmar."; nada às 14:00) |

Correções da rodada 8 conferidas:
- **sgsm:** sem serviço dá 400 "Informe o serviço médico do agendamento.". A parte do log de 500 não foi exercitada.
- **bot:** pergunta pelo que falta em vez de reservar.
- **cadastro pelo bot:** aceita DD/MM/AAAA.
- **log do bot:** não traz texto nem OTP.
- **receptor:** lê corpo chunked.

Observações fora do plano:
1. O auth não consegue enviar e-mail no ambiente de QA (`MailAuthenticationException` no `EmailService`, tanto na ativação quanto no código de login). A entrega real do código por e-mail continua não verificada.
2. Na inicialização, o bot registrou `ERROR SistemaAuthService` "Falha ao renovar token de sistema do bot … Connection refused", porque o auth ainda não estava de pé. O token foi renovado com sucesso no primeiro uso (19:25:02).
3. Em `/pacientes`, o telefone dos pacientes criados pelo bot aparece truncado, por exemplo "(55) 11900-0094" para o número `5511900009433`. Só registro.

## Rodada 10 (reteste ponta a ponta WhatsApp)

> **Data:** 2026-10-18, UTC 19:44–19:55. **Ferramenta:** Playwright como biblioteca Node (autorizado), `chromium.launch({ headless: false, slowMo: 150 })`, janela visível, um contexto por sessão. Sem mock e sem `page.route`. O navegador da SEC-A ficou aberto e foi controlado passo a passo (`qa-scratch/r10-driver.mjs` + `r10-cmd.mjs`).
> **Ambiente (conferido com curl/netstat antes de começar):**
>   - front :3010 → 200 (PID 6580)
>   - auth de QA :8091 (PID 31292)
>   - **sgsm-ia de QA :8092** `/actuator/health` → 200 (PID 30416). A cmdline é a pedida: `ia-qa.jar --spring.profiles.active=dev --server.port=8092 --ia.redis.stream-key=sgsm:events:vetorizacao-qa-isolado --ia.redis.group=sgsm-ia-qa-group --ia.redis.consumer=sgsm-ia-qa-1 …`. Foi iniciado às 19:43:01Z.
>   - **bot de QA :8093** `/actuator/health` → 200 (PID 29200). A cmdline tem `--bot.evolution.base-url=http://localhost:8099 --bot.sgsm.base-url=http://localhost:8095 --bot.auth.base-url=http://localhost:8091 --bot.sgsm-ia.base-url=http://localhost:8092`. Foi iniciado às 19:43:23Z.
>   - sgsm de QA :8095 sem token → 401 (PID 24056)
>   - receptor :8099 → 200 (PID 29912, `evolution-captura.py`)
>   - O sgsm-ia de dev :8082 continua no ar (PID 16164), mas não foi usado.
> **Correção do sgsm-ia, conferida (só leitura):**
>   - `ia-qa.jar` (18/10 16:42 local) contém `WhatsAppService.class` com o método `documentoComReferencia`.
>   - No fonte (alteração local não commitada em `sgsm-ia`, HEAD `7c5e7e9`), o CONTEXTO passa a ter `"[tipo=" + tipo + " referencia_id=" + referencia + "] " + texto`, e o prompt ganhou as regras "use o referencia_id do documento tipo=SERVICO_MEDICO em servicoMedicoId" e "Nunca mostre IDs (referencia_id) na respostaUsuario".
>   - O ia-qa.log **não** grava o prompt nem o contexto. Ele grava só a mensagem ("WhatsApp classificar - mensagem") e o JSON cru do LLM ("WhatsApp LLM resposta bruta"). Esse JSON está nas evidências.
> **O bot chama o :8092:** cada mensagem que passa pela IA aparece no `bot-qa.log` ("Webhook recebido…") e, cerca de 0,1–0,6 s depois, no `ia-qa.log` do :8092 ("WhatsApp classificar - mensagem: …"). Exemplos: 19:47:40.242 bot → 19:47:40.842 ia-qa; 19:50:10.699 → 19:50:10.901; 19:51:39.330 → 19:51:39.524. Ver a parte 4 de cada `evidence/<ID>-r10.log`.
> **WhatsApp:** nenhuma mensagem foi para WhatsApp real.
>   - O paciente "falou" por `POST http://localhost:8093/webhook/evolution`, no formato `messages.upsert`, com o header `X-Webhook-Secret` lido do `.env` e nunca gravado (`qa-scratch/r10-wa.mjs` e `r10-fala.sh`).
>   - As respostas foram lidas no `qa-scratch/evolution-captura.jsonl`.
>   - Conferi por grep que o valor do segredo não aparece em nenhum `evidence/*r10*` (0 arquivos). O código de login aparece só como `****13`.
> **Leituras fora da UI** (todas exceções autorizadas):
>   - o código de ativação (`auth:ativacao:codigo:<email>`, `SETUP-r10.log`);
>   - o código de login (`auth:otp:<email>`, `LOGIN-r10.log`);
>   - o `--scan sgsm:reserva*` da limpeza.
>   Li também o código-fonte do bot e do sgsm-ia e os logs (`bot-qa.log`, `ia-qa.log`, `sgsm-qa.log`), só para diagnóstico.
>   No QA142 li o corpo da resposta do `GET /v1/api/agendamentos` que a própria tela da SEC-A fez ao recarregar (`page.waitForResponse`, sem alterar nada).
> **Grade antes de começar:** 10:00, 11:00 e 14:00 de 21/10/2026 estavam livres. A grade tinha 08:00–17:30 completa (`QA140-r10-a-grade-antes.png`), e não havia card ativo em 21/10. Usei esses horários.
> **Scripts:** `qa-scratch/r10-a-setup.mjs`, `r10-wa.mjs`, `r10-fala.sh`, `r10-driver.mjs`, `r10-cmd.mjs`, `r10-y-montar-logs.mjs`, `r10-z-limpeza.mjs`. Dados em `qa-scratch/contas-r10.json`.
>   - Cada `evidence/<ID>-r10.log` junta: (1) mensagens enviadas ao webhook e linhas cruas do jsonl do número; (1b) contagem de respostas do bot com UUID; (2) rede `/v1/api/agendamentos*` e notas do navegador da SEC-A; (3) `bot-qa.log`; (4) `ia-qa.log` (:8092); (5) WARN/ERROR do `sgsm-qa.log`, tudo no período.
>   - Logs completos em `_wa-r10-*.log`, `_full-r10-driver.log` e `_full-r10-a.log`.

### Preparação
- **SEC-A:** estava "Inativo". O DEV a reativou em `/funcionarios` (`PATCH /funcionarios/7f5a6eac…/reativar` 200, toast "Funcionário reativado com sucesso."). Evidência: `SETUP-r10-a-SEC-A-reativada.png`.
- **Paciente:** "QA Paciente R10 Conta 69523" (`qa.conflito.pac.r10.conta.1792352769523@teste.com`).
  - Criado pelo `/registrar` (`POST /publico/pacientes` 201) e ativado com o código (`ativar-conta` 204).
  - O login web deu 200 e foi para `/pacientes`.
  - Evidências: `SETUP-r10-b-paciente-ativo-logado.png`, `SETUP-r10.log`.
- **Login pelo WhatsApp (fluxo do QA143), número `5511900010431`:**
  - "Olá, boa tarde" → termo LGPD; "ACEITO" → menu.
  - O e-mail da conta → "Se houver uma conta com o e-mail …, enviei para ele um código de 6 dígitos…". Nenhum código apareceu no jsonl.
  - O código lido em `auth:otp:<email>` (`****13`) → "Conta ativada com sucesso! Como posso ajudar? … *1.* Ver meus agendamentos …".
  - Evidência: `LOGIN-r10.log`.

### QA140 — APROVADO
- **Feito:**
  1. A SEC-A abriu o wizard (Zilma, QA Descartavel, Presencial, Clinica São Lucas, 21/10) e clicou em **10:00**: `POST /reservas` **201**, faixa "expira em 09:59".
  2. Com a reserva ativa, o paciente mandou a frase do plano: "Quero agendar QA Descartavel com o Dr. Fabio Monteiro Amorim no dia 21/10/2026 às 10:00 na Clinica São Lucas".
  3. Conversei como paciente: informei o nome quando a IA pediu, repeti o pedido com o nome e mandei um pedido completo terminando em "Pode agendar para mim?" (4ª mensagem).
  4. O paciente respondeu "Sim".
  5. A SEC-A avançou ao passo 5 e confirmou.
  6. Recarreguei a lista da SEC-A.
- **Observado:**
  - **1ª mensagem:** a IA (:8092) já extraiu `servicoMedicoId: "0f4d2d1e-7a44-49d3-87af-a8c72aafcb82"` e `medicoId: "ff9a2400-…"`. Mas marcou `dadosFaltantes: ["nomePaciente"]` e respondeu "*Claro! Para confirmar o agendamento, preciso do seu nome completo.*". O bot não reservou.
  - **2ª mensagem** (só o nome): a IA perdeu o serviço (`servicoMedicoId: null`; a busca no Milvus usa só a mensagem atual) e pediu a especialidade.
  - **3ª mensagem:** extraiu o serviço, mas não o médico, e pediu "*Falta o ID do médico…*".
  - **4ª mensagem:** a IA trouxe os dois IDs com `requerConfirmacao: true`. O bot tentou a pré-reserva e respondeu ao paciente: **"Esse horário acabou de ser ocupado. Tenho estas opções próximas: *1.* 21/10 às 09:30 *2.* 21/10 às 10:30 *3.* 21/10 às 09:00 Qual delas prefere? Me diga a data e o horário."**. Não pediu confirmação: o texto da IA "*Confirme o agendamento:* … Responda com 'sim'" foi substituído pelo do bot.
  - Ao "Sim", o bot respondeu "Não há nenhuma ação pendente para confirmar." e não criou nada. A IA tinha escrito "*Ótimo, seu agendamento está confirmado.*", mas o bot não usa esse texto.
  - A SEC-A confirmou as 10:00 com **201** (`reservaToken` no corpo; id `226da8e0…`). O agendamento dela tem `servicoMedicoId` `0f4d2d1e-7a44-49d3-87af-a8c72aafcb82` (QA Descartavel), o mesmo que a IA extraiu.
  - Na lista recarregada, o único card ativo de 21/10 é "Zilma Ruela | QA Descartavel | Pendente | … | Clinica São Lucas | 21/10/2026, 10:00". Não há agendamento do paciente do WhatsApp.
  - Nenhuma das 5 respostas do bot tem UUID. O `sgsm-qa.log` tem 0 WARN/ERROR no período.
- **Esperado:** "acabou de ser ocupado" com alternativas, sem pedir confirmação; nenhum agendamento do paciente às 10:00; a SEC-A confirma com 201. Bateu.
- **Ressalva:** o pedido exato do plano (1ª mensagem) não chegou à pré-reserva, porque a IA pediu o nome. Foram precisas 4 mensagens até a IA marcar `requerConfirmacao`. Isso está registrado como observação 1 no fim da rodada.
- **Evidências:** `QA140-r10-a-grade-antes.png`, `QA140-r10-b-SEC-A-reservou-10h.png`, `QA140-r10-c-SEC-A-passo5.png`, `QA140-r10-d-SEC-A-confirmou.png`, `QA140-r10-e-lista-so-zilma-10h.png`, `QA140-r10.log` (completo em `QA140-r10-browser.log`)
```
2026-10-18T19:47:33.840Z [SEC-A#1] << 201 POST http://localhost:3010/v1/api/agendamentos/reservas BODY={"token":"***384b",… "reservado":true}   (faixa: "Horário reservado para você — expira em 09:59")
[ia-qa.log] 2026-10-18T19:47:43.981Z WhatsApp LLM resposta bruta: { "intent": "AGENDAR", … "medicoId": "ff9a2400-2217-48fa-ac91-b81a4032f2db", "servicoMedicoId": "0f4d2d1e-7a44-49d3-87af-a8c72aafcb82", … "respostaUsuario": "*Claro! Para confirmar o agendamento, preciso do seu nome completo.*", "requerConfirmacao": false, "dadosFaltantes": ["nomePaciente"] }
[ia-qa.log] 2026-10-18T19:48:02.392Z … "servicoMedicoId": null, … "nomeCompleto": "QA Paciente R10 Conta 69523" … "dadosFaltantes": ["especialidade", "medicoId", "servicoMedicoId"]
[ia-qa.log] 2026-10-18T19:48:27.976Z … "medicoId": null, "servicoMedicoId": "0f4d2d1e-…" … "respostaUsuario": "*Falta o ID do médico para concluir o agendamento.* …", "dadosFaltantes": ["medicoId"]
2026-10-18T19:48:58.846Z [WA>>] … "conversation":"Meu nome é QA Paciente R10 Conta 69523. Quero marcar a consulta QA Descartavel com o médico Fabio Monteiro Amorim, na Clinica São Lucas, no dia 21/10/2026 às 10:00. Pode agendar para mim?"
[ia-qa.log] 2026-10-18T19:49:01.942Z … "medicoId": "ff9a2400-2217-48fa-ac91-b81a4032f2db", "servicoMedicoId": "0f4d2d1e-7a44-49d3-87af-a8c72aafcb82", … "requerConfirmacao": true, "dadosFaltantes": []
{"quando": "2026-10-18T19:49:02.019248+00:00", "rota": "/message/sendText/sgsm-bot", "corpo": {"text": "Esse horário acabou de ser ocupado. Tenho estas opções próximas:\n\n*1.* 21/10 às 09:30\n*2.* 21/10 às 10:30\n*3.* 21/10 às 09:00\n\nQual delas prefere? Me diga a data e o horário.", "number": "5511900010431"}}
2026-10-18T19:49:20.937Z [SEC-A#1] << 201 POST http://localhost:3010/v1/api/agendamentos BODY={"id":"226da8e0-2d7d-417b-b7f5-6b31740c0914",…"pacienteNome":"Zilma Ruela","servicoMedicoId":"0f4d2d1e-7a44-49d3-87af-a8c72aafcb82","servicoMedicoNome":"QA Descartavel",…}
{"quando": "2026-10-18T19:49:34.683693+00:00", "rota": "/message/sendText/sgsm-bot", "corpo": {"text": "Não há nenhuma ação pendente para confirmar.", "number": "5511900010431"}}   (resposta ao "Sim")
[NOTA] QA140 cards ativos de 21/10/2026 na lista da SEC-A (apos recarregar): ["Zilma Ruela | QA Descartavel | Pendente | Fabio Monteiro Amorim | Clinica São Lucas | 21/10/2026, 10:00 | Cancelar | Confirmar"]
```

### QA141 — APROVADO
- **Feito:**
  1. A SEC-A abriu a grade de 21/10 **antes** do pedido. As 11:00 estavam livres; as 10:00 já não apareciam, por causa do QA140.
  2. O paciente pediu as 11:00 (mesmo formato da 4ª mensagem do QA140).
  3. Logo depois da resposta do bot, sem esperar a atualização periódica, a SEC-A clicou nas 11:00 da grade desatualizada.
  4. O paciente respondeu "Não, obrigado. Desisti desse horário".
  5. A SEC-A ficou parada 35 s no passo 4.
  6. A SEC-A fechou o wizard.
- **Observado:**
  - **Bot:** "*Confirme o agendamento:* QA Descartavel com Dr. Fabio Monteiro Amorim em 21/10/2026 às 11:00. Responda com 'sim' para confirmar.". O `bot-qa.log` não tem "Pré-reserva indisponível" nem "recusada", e a reserva foi feita (ver o 409 abaixo).
  - **Clique da SEC-A nas 11:00 (grade desatualizada):**
    - `POST /reservas` deu **409** `"detail":"Horário em pré-reserva por outro usuário. Escolha outro horário."`, com 3 `alternativas` (10:30, 11:30, 12:00).
    - A tela mostrou "Este horário acabou de ser ocupado ou está reservado por outra pessoa. Veja abaixo os horários próximos disponíveis." e o bloco "HORÁRIOS PRÓXIMOS DISPONÍVEIS" com 21/10/2026 10:30, 11:30 e 12:00.
    - Nenhum horário ficou selecionado e não apareceu faixa de reserva. A grade foi recarregada (`GET /slots` 200), e **as 11:00 não aparecem** nela.
  - **"Não":** a IA classificou `RECUSAR` e o bot respondeu "Tudo bem! Como posso ajudar? …".
  - **Depois de 35 s:** o `GET /slots` periódico (200) trouxe **as 11:00 de volta** na grade da SEC-A.
  - No fechamento do wizard não houve chamada de reserva, porque a SEC-A não tinha reserva.
  - Nenhuma das 2 respostas do bot tem UUID. O `sgsm-qa.log` tem 0 WARN/ERROR no período.
- **Esperado:** as 11:00 somem para a SEC-A; com a grade desatualizada o clique dá 409 com alternativas; depois do "Não", as 11:00 voltam após atualizar. Bateu.
- **Evidências:** `QA141-r10-a-grade-antes.png`, `QA141-r10-b-SEC-A-clicou-11h-409.png`, `QA141-r10-c-grade-apos-nao-11h-voltou.png`, `QA141-r10.log` (completo em `QA141-r10-browser.log`)
```
[NOTA] QA141 grade 21/10 antes do pedido do paciente: ["08:00","08:30","09:00","09:30","10:30","11:00","11:30",…,"17:30"]
{"quando": "2026-10-18T19:50:15.119354+00:00", "rota": "/message/sendText/sgsm-bot", "corpo": {"text": "*Confirme o agendamento:* QA Descartavel com Dr. Fabio Monteiro Amorim em 21/10/2026 às 11:00. Responda com 'sim' para confirmar.", "number": "5511900010431"}}
2026-10-18T19:50:30.017Z [SEC-A#1] << 409 POST http://localhost:3010/v1/api/agendamentos/reservas BODY={"detail":"Horário em pré-reserva por outro usuário. Escolha outro horário.","instance":"/v1/api/agendamentos/reservas","status":409,"title":"Horário indisponível","type":"https://sgsm.com.br/erros/horario-indisponivel","alternativas":[{"dataHoraInicio":"2026-10-21T10:30:00-03:00",…},{"dataHoraInicio":"2026-10-21T11:30:00-03:00",…},{"dataHoraInicio":"2026-10-21T12:00:00-03:00",…}]}
[NOTA] QA141 SEC-A clicou 11:00 (grade desatualizada) -> ["409 POST …/agendamentos/reservas","200 GET …/agendamentos/slots?…&data=2026-10-21"] | faixa reserva=0 | grade depois: 11:00 presente=false
{"quando": "2026-10-18T19:50:44.666619+00:00", "rota": "/message/sendText/sgsm-bot", "corpo": {"text": "Tudo bem! Como posso ajudar?\n\n*1.* Ver meus agendamentos\n*2.* Agendar consulta\n*3.* Cancelar agendamento\n*4.* Falar com a IA\n\nOu me faça uma pergunta diretamente!", "number": "5511900010431"}}
[NOTA] QA141 apos o "Nao" do paciente, 35 s parada (atualizacao periodica): GET slots=["200 GET …/agendamentos/slots?…&data=2026-10-21"] | 11:00 na grade=true
```

### QA142 — APROVADO
- **Feito:**
  1. O paciente pediu as 14:00 (mesmo formato) e respondeu "Sim".
  2. A SEC-A recarregou a lista e abriu a grade de 21/10.
- **Observado:**
  - **Pedido:** "*Confirme o agendamento:* … 21/10/2026 às 14:00. Responda com 'sim' para confirmar.".
  - **"Sim":** **"Agendamento confirmado com sucesso!"**. O `bot-qa.log` não tem erro nem aviso de reserva.
  - **Lista da SEC-A (recarregada):** o card "QA Paciente R10 Conta 69523 | QA Descartavel | Pendente | Fabio Monteiro Amorim | Presencial | 21/10/2026, 14:00" está presente.
  - **`GET /v1/api/agendamentos` da tela:** id `bf3239ac-fb82-4c0a-aff1-002be12076ab`, `dataHoraInicio` `2026-10-21T17:00:00Z` (14:00 local), `PENDENTE`, `PRESENCIAL`.
  - **Grade de 21/10:** sem 14:00 e sem 10:00.
  - A pré-reserva do bot não bloqueou o próprio paciente.
  - Nenhuma das 2 respostas do bot tem UUID. O `sgsm-qa.log` tem 0 WARN/ERROR no período.
- **Esperado:** "Agendamento confirmado com sucesso!" e o agendamento das 14:00 na lista da SEC-A. Bateu.
- **Observação (fora do esperado do item):** o agendamento criado pelo bot ficou com `estabelecimentoId: null` e `estabelecimentoNome: null`, embora o paciente tenha dito "na Clinica São Lucas". Por isso o card mostra "Presencial" em vez de "Clinica São Lucas". O agendamento da SEC-A tem `estabelecimentoId 655759aa…` e "Clinica São Lucas". Ver a observação 2 no fim da rodada.
- **Evidências:** `QA142-r10-a-lista-com-14h-paciente.png`, `QA142-r10-b-grade-sem-14h.png`, `QA142-r10.log` (completo em `QA142-r10-browser.log`)
```
[ia-qa.log] 2026-10-18T19:51:42.716Z … "hora": "14:00", … "medicoId": "ff9a2400-2217-48fa-ac91-b81a4032f2db", "servicoMedicoId": "0f4d2d1e-7a44-49d3-87af-a8c72aafcb82", … "requerConfirmacao": true, "dadosFaltantes": []
{"quando": "2026-10-18T19:51:42.758637+00:00", "rota": "/message/sendText/sgsm-bot", "corpo": {"text": "*Confirme o agendamento:* QA Descartavel com Dr. Fabio Monteiro Amorim em 21/10/2026 às 14:00. Responda com 'sim' para confirmar.", "number": "5511900010431"}}
{"quando": "2026-10-18T19:51:52.672693+00:00", "rota": "/message/sendText/sgsm-bot", "corpo": {"text": "Agendamento confirmado com sucesso!", "number": "5511900010431"}}
[NOTA] QA142 cards ativos de 21/10/2026 na lista da SEC-A apos o "Sim" do paciente (recarregada): ["Zilma Ruela | QA Descartavel | Pendente | Fabio Monteiro Amorim | Clinica São Lucas | 21/10/2026, 10:00 | Cancelar | Confirmar","QA Paciente R10 Conta 69523 | QA Descartavel | Pendente | Fabio Monteiro Amorim | Presencial | 21/10/2026, 14:00 | Cancelar | Confirmar"]
[NOTA] QA142 resposta do GET http://localhost:3010/v1/api/agendamentos (200) feito pela propria tela, ativos de 21/10: [{"id":"226da8e0-…","pacienteNome":"Zilma Ruela",…,"estabelecimentoId":"655759aa-bf83-417e-a45b-b06258c4458f","estabelecimentoNome":"Clinica São Lucas"},{"id":"bf3239ac-fb82-4c0a-aff1-002be12076ab","pacienteNome":"QA Paciente R10 Conta 69523","servicoMedicoNome":"QA Descartavel","dataHoraInicio":"2026-10-21T17:00:00Z","status":"PENDENTE","tipo":"PRESENCIAL","estabelecimentoId":null,"estabelecimentoNome":null}]
[NOTA] QA142 grade 21/10 apos o "Sim": 14:00 presente=false
```

### Limpeza da rodada 10 — feita pela UI
- **Agendamentos:** a SEC-A cancelou no card, com origem Estabelecimento e motivo "Limpeza do QA rodada 10 (conflito de agendamento)":
  - 10:00 Zilma (`226da8e0…`): `PATCH …/cancelar` **204**
  - 14:00 paciente do WhatsApp (`bf3239ac…`): `PATCH …/cancelar` **204**
  - O `GET /agendamentos` seguinte mostra os dois `CANCELADO` e 0 ativos em 21/10/2026.
- **Paciente:** "QA Paciente R10 Conta 69523" inativado pelo DEV em `/pacientes` (`DELETE /pacientes/d0abe06e…` 204, card "Inativo").
- **SEC-A:** inativada em `/funcionarios` (`DELETE /funcionarios/7f5a6eac…` 204, "Inativo").
- **Reservas:** `docker exec redis-sgsm redis-cli --scan --pattern "sgsm:reserva*"` → vazio (0 chaves), sem precisar esperar expirar.
- **O que fica:** o login `qa.conflito.pac.r10.conta.1792352769523@teste.com` continua no auth, e a sessão do número fictício `5511900010431` continua no Redis do bot (não mexi). Os serviços de QA continuam no ar.
- **Evidências:** `LIMPEZA-r10-a-agendamentos-cancelados.png`, `LIMPEZA-r10-b1-pacientes-QA-Paciente-R10.png`, `LIMPEZA-r10-c-SEC-A-inativa.png`, `LIMPEZA-r10-SEC-A.log`, `LIMPEZA-r10.log`

### Resumo da rodada 10

| ID | Status |
|---|---|
| QA140 | APROVADO (bot :8093 → IA :8092 extrai `servicoMedicoId`; com as 10:00 reservadas pela SEC-A, o bot responde "Esse horário acabou de ser ocupado" + 3 alternativas, sem pedir confirmação; "Sim" → nada pendente; a SEC-A confirmou com 201; nenhum agendamento do paciente às 10:00) |
| QA141 | APROVADO (o bot pré-reservou as 11:00; o clique da SEC-A na grade desatualizada deu 409 "pré-reserva por outro usuário" + alternativas e a grade recarregada ficou sem 11:00; "Não" → as 11:00 voltaram no `GET /slots` periódico) |
| QA142 | APROVADO ("Sim" → "Agendamento confirmado com sucesso!"; card 21/10 14:00 do paciente na lista da SEC-A; 14:00 sumiu da grade) |

Correção do sgsm-ia conferida: o contexto agora traz `[tipo=… referencia_id=…]` (jar e fonte), e a IA preenche `servicoMedicoId`/`medicoId` com os IDs reais. Nenhuma das 13 respostas do bot ao paciente nesta rodada contém UUID (login 0/4, QA140 0/5, QA141 0/2, QA142 0/2).

Observações fora do plano:
1. **A IA nem sempre fecha o pedido na 1ª mensagem.** Com a frase exata do plano, a IA extraiu os IDs, mas pediu o "nome completo" (`dadosFaltantes: ["nomePaciente"]`), embora o paciente esteja autenticado. Na mensagem seguinte (só o nome), perdeu o serviço, porque a busca no Milvus usa só a mensagem atual. Numa terceira, extraiu o serviço sem o médico e respondeu "*Falta o ID do médico…*", um texto que expõe ao paciente o conceito de "ID", embora não mostre o ID em si. O pedido completo com o nome e "Pode agendar para mim?" funcionou nas 3 vezes em que foi usado (10:00, 11:00, 14:00).
2. **Agendamento pelo WhatsApp sem estabelecimento.** O agendamento criado pelo bot fica com `estabelecimentoId` nulo (card "Presencial" em vez de "Clinica São Lucas"), mesmo com a clínica citada. Isso é coerente com a nota da rodada 8 de que o `ReservaCreateRequest` do bot não envia `estabelecimentoId`. Não impediu o conflito: os slots de 10:00/11:00/14:00 foram bloqueados normalmente.
3. **Texto da IA no "Sim" sem pendência.** Ao "Sim" sem pendência, o texto gerado pela IA era "*Ótimo, seu agendamento está confirmado.*". O bot corretamente não usou esse texto e respondeu "Não há nenhuma ação pendente para confirmar.".
