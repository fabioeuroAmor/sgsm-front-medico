
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
