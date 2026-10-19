
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
