# QA — WhatsApp por clínica (resultado da execução ao vivo)

- **Plano executado:** `test-plan.md` (33 itens).
- **Quando:** 27/10/2026, 05:31–06:02 UTC (02:31–03:02 em Brasília).
- **Como foi feito:**
  - Playwright usado como biblioteca, com `chromium.launch({ headless: false, slowMo: 150 })`: janela visível e um contexto por usuário.
  - Sem mock e sem `page.route`. A coleta de console e rede é crua, com máscara.
  - O paciente "falou" com o bot de QA por `POST http://localhost:8093/webhook/evolution`, no formato `messages.upsert` e com o campo `instance`.
  - As respostas foram lidas no receptor local `:8099` (`qa-scratch/evolution-captura.jsonl`). O campo `rota` mostra por qual número cada resposta saiu.
  - Nenhuma mensagem foi para WhatsApp real. O bot real `:8083` não foi usado e a instância `sgsm-bot` não foi alterada.
- **Regra de aprovação:** um item só foi APROVADO com print (PNG) e log cru (`.log`) em `evidence/`, os dois com o prefixo do id.
- **Máscaras:**
  - tokens e JWT aparecem como `***`;
  - senhas aparecem como `***`;
  - o segredo do webhook nunca foi gravado;
  - códigos de 6 dígitos (OTP) mostram só os 2 últimos (`****69`).
- **Varredura final em `evidence/`:**
  - 0 arquivos com o segredo, com JWT (`eyJ…`), com senha das contas, com a apikey ou com o token de instância da Evolution;
  - 0 tokens de reserva;
  - os números de 6 dígitos que restaram são CRMs de médicos, não códigos.

## Ambiente conferido (curl/netstat, 27/10 05:31 UTC, antes de começar)

| Serviço | Porta | Resultado |
|---|---|---|
| Front (Vite) | :3001 | 200 |
| sgsm | :8080 | `/actuator/health` 401 (no ar, exige token). PID 20096, `--spring.profiles.active=dev` |
| ms-sboot-auth | :8081 | no ar (login 200 nas contas de teste) |
| sgsm-ia | :8082 | `/actuator/health` 200 |
| Evolution API real | :8090 | `fetchInstances` 200. Havia só `sgsm-bot`, com `connectionStatus: open` |
| Bot de QA | :8093 | `/actuator/health` 200. PID 16580, `--spring.profiles.active=dev --server.port=8093 --bot.evolution.base-url=http://localhost:8099`. Log em `%TEMP%/sgsm-plano/bot-qa.log` |
| Receptor | :8099 | 200. PID 23320, `evolution-captura.py 8099 …/whatsapp-por-clinica/qa-scratch/evolution-captura.jsonl` |
| Postgres / Redis | — | acessíveis (container `postgres:16-alpine` e `docker exec redis-sgsm redis-cli`) |

- **Estado inicial de `sgsm.whatsapp_canal`:** três canais, todos `REMOVIDO`: `sgsm-655759aa-528873`, `sgsm-36a7eb52-01932a` e `sgsm-655759aa-f9ad78`.
  - Foram criados em 26/10 pelo usuário DESENVOLVEDOR (`dev-local@sgsm.local`), numa tentativa anterior a esta execução.
  - Não fazem parte das evidências.
- **Canais criados nesta execução**, todos pela tela:
  - `sgsm-655759aa-52a9d1`: WA-T04 a WA-T09, removido no WA-T13;
  - `sgsm-36a7eb52-9ea181`: WA-T05, usado nos itens WA-B*;
  - `sgsm-655759aa-23f525`: reconectado em `SETUP-BOT`, usado nos itens WA-B*.

## Resumo

| Id | Status | Evidências (`evidence/`) |
|---|---|---|
| WA-T01 | APROVADO | WA-T01-tela-admin.png, WA-T01.log |
| WA-T02 | APROVADO | WA-T02-a/b/c/d-*.png, WA-T02.log |
| WA-T03 | APROVADO | WA-T03-nenhum-conectado.png, WA-T03.log |
| WA-T04 | APROVADO | WA-T04-qr.png, WA-T04.log |
| WA-T05 | APROVADO | WA-T05-duplo-clique-um-post.png, WA-T05.log |
| WA-T06 | APROVADO | WA-T06-a-qr-com-polling.png, WA-T06-b-outra-pagina-sem-polling.png, WA-T06.log |
| WA-T07 | APROVADO | WA-T07-recarregado-qr.png, WA-T07.log |
| WA-T08 | APROVADO | WA-T08-a-inicio-saolucas.png, WA-T08-b-trocou-para-strix.png, WA-T08-b-trocou-para-saolucas.png, WA-T08.log |
| WA-T09 | APROVADO | WA-T09-funcionario-status.png, WA-T09.log |
| WA-T10 | APROVADO | WA-T10-adm-b-tela-propria.png, WA-T10-respostas-403.png, WA-T10.log |
| WA-T11 | **REPROVADO** (texto do toast diverge) | WA-T11-a-toast-503.png, WA-T11-b-status-com-evolution-fora.png, WA-T11.log |
| WA-T12 | **REPROVADO** | WA-T12-a…e-*.png, WA-T12.log |
| WA-T13 | APROVADO | WA-T13-a-cancelou.png, WA-T13-b-desconectado.png, WA-T13.log |
| WA-T14 | APROVADO | WA-T14-login-sessao-expirada.png, WA-T14.log |
| WA-T15 | APROVADO | WA-T15-trafego-pago/pacientes/agendamentos/whatsapp-clinica.png, WA-T15.log |
| WA-C01 | BLOQUEADO | — (aguardando celular de teste) |
| WA-C02 | BLOQUEADO | — (aguardando celular de teste) |
| WA-B01 | APROVADO | WA-B01-conversa.png, WA-B01.log, _wa-WA-B01.log |
| WA-B02 | APROVADO | WA-B02-conversa.png, WA-B02.log, _wa-WA-B02.log |
| WA-B03 | APROVADO | WA-B03-conversa.png, WA-B03.log, _wa-WA-B03.log |
| WA-B04 | APROVADO | WA-B04-conversa.png, WA-B04.log, _wa-WA-B04.log |
| WA-B05 | APROVADO | WA-B05-conversa.png, WA-B05.log, _wa-WA-B05.log |
| WA-B06 | **REPROVADO** | WA-B06-a-saolucas.png, WA-B06-b-strix.png, WA-B06.log, _wa-WA-B06.log |
| WA-B07 | APROVADO | WA-B07-conversa.png, WA-B07.log, _wa-WA-B07.log |
| WA-B08 | APROVADO (com ressalva) | WA-B08-a-conversa.png, WA-B08-b-sgsm-recusa.png, WA-B08.log, WA-B08-sgsm.log, _wa-WA-B08.log |
| WA-B09 | **REPROVADO** | WA-B09-conversa.png, WA-B09-crm-lead-adm-a.png, WA-B09.log, _wa-WA-B09.log |
| WA-B10 | APROVADO | WA-B10-a-secretaria-grade.png, WA-B10-conversa.png, WA-B10.log, WA-B10-secretaria.log, _wa-WA-B10.log |
| WA-E01 | APROVADO | WA-E01-func-a-ve-paciente.png, WA-E01-adm-a-ve-paciente.png, WA-E01.log |
| WA-E02 | **REPROVADO** | WA-E02-adm-b-nao-ve.png, WA-E02.log |
| WA-E03 | APROVADO | WA-E03-a-detalhe.png, WA-E03-b-exportado.png, WA-E03-exportacao.json, WA-E03.log |
| WA-E04 | APROVADO | WA-E04-a-form.png, WA-E04-b-cadastrado.png, WA-E04.log |
| WA-O01 | BLOQUEADO | WA-O01.log, _wa-WA-O01.log (disparo real feito; o ramo por clínica não pôde ser exercitado) |
| WA-O02 | APROVADO | WA-O02-sem-token-401.png, WA-O02.log |

**Totais:** 25 APROVADOS, 5 REPROVADOS (T11, T12, B06, B09, E02) e 3 BLOQUEADOS (C01, C02, O01).

## Itens — o que foi feito e trecho do log cru

### 1. Tela "WhatsApp da clínica"

**WA-T01 — APROVADO.**
- ADM-A (`ADMIN_ESTABELECIMENTO` só da Clinica São Lucas) entrou e viu 1 item "WhatsApp da clínica" no menu.
- Ao clicar, foi para `/whatsapp-clinica`, com o título "WhatsApp da clínica" e o seletor `["Clinica São Lucas"]`.
```
[NOTA] ADM-A (qa.wa.adma.1793044999759@teste.com) url=http://localhost:3001/pacientes | item no menu: 1
[NOTA] clicou no item -> url=http://localhost:3001/whatsapp-clinica | titulo: "WhatsApp da clínica" | seletor: ["Clinica São Lucas"]
```

**WA-T02 — APROVADO.**
- FUNCIONARIO vê o item; MEDICO e PACIENTE não veem.
- O MEDICO abrindo a URL direto vê "O WhatsApp da clínica é gerenciado pela equipe do estabelecimento." e nenhum botão.
```
[NOTA] FUNC-A ... item "WhatsApp da clínica" no menu: 1
[NOTA] MEDICO ... item no menu: 0 | links do menu: ["Home","Pacientes","Médicos","Estabelecimentos","Serviços","Agendamentos","Funcionários","Assistente IA","CRM"]
[NOTA] MEDICO abriu http://localhost:3001/whatsapp-clinica direto -> url=http://localhost:3001/whatsapp-clinica | mensagem de acesso visivel: 1 | botao Conectar: 0
[NOTA] PACIENTE ... item no menu: 0 | links do menu: ["Home","Pacientes","Agendamentos"]
```

**WA-T03 — APROVADO.**
- Aparece o card "Nenhum WhatsApp conectado" com o botão "Conectar WhatsApp".
- O GET devolve 404, sem toast e sem card de erro.
```
<< 404 GET http://localhost:3001/v1/api/estabelecimentos/655759aa-…/whatsapp BODY={"detail":"Esta clínica ainda não conectou um WhatsApp.",…,"status":404,…}
[NOTA] … card "Nenhum WhatsApp conectado": 1 | botao Conectar: 1 | toasts=[] | card de erro: 0
```

**WA-T04 — APROVADO.**
- O POST devolveu 201.
- O QR é um PNG válido, carregado e com 348×348 px (`naturalWidth`/`naturalHeight`); o print mostra o QR.
- A tela mostra "Aguardando a leitura do QR code" e "Conferindo a cada 5 segundos…".
- A instância nova `sgsm-655759aa-52a9d1` apareceu na Evolution (`connecting`) e o sgsm logou "Canal WhatsApp criado".
```
<< 201 POST …/estabelecimentos/655759aa-…/whatsapp BODY={"id":"7d694729-…","provedor":"EVOLUTION","status":"PENDENTE_QR","numero":null,"conectadoEm":null,"qrCodeBase64":"data:image/png;base64,iVBORw0KGgo…"
[NOTA] POST -> 201 | QR: {"presente":true,"completo":true,"naturalWidth":348,"naturalHeight":348,"prefixo":"data:image/png;base64,iVBORw0K",…} | "Conferindo a cada 5 segundos…": 1
sgsm.log: "Canal WhatsApp criado para o estabelecimento 655759aa-… (instância sgsm-655759aa-52a9d1)"
```

**WA-T05 — APROVADO.**
- ADM-B (Clinica Teste Strix) deu clique duplo em "Conectar WhatsApp".
- Saiu 1 POST (201). O botão ficou desabilitado 40 ms depois do 1º clique.
- O banco ficou com 1 canal e a Evolution com 1 instância `sgsm-36a7eb52-9ea181`.
```
[NOTA] clique duplo -> POSTs enviados=1 | respostas POST=["201 POST …/36a7eb52-…/whatsapp"] | estado do botao (amostras)=[{"ms":0,"s":"habilitado"},{"ms":0,"s":"clique"},{"ms":40,"s":"desabilitado"},{"ms":5502,"s":"sumiu"}]
```

**WA-T06 — APROVADO.**
- Com o QR na tela, saíram 4 GETs em 21 s, com intervalos de 5,0 s.
- Depois de ir para `/pacientes`, não saiu nenhum GET em 16 s.
```
>> GET …/whatsapp 05:35:32.633 / 05:35:37.632 / 05:35:42.631 / 05:35:47.631
[NOTA] com o QR na tela, em 21s: 4 GET de status | intervalos (s): ["5.0","5.0","5.0"]
[NOTA] depois de ir para /pacientes, em 16s: 0 GET de status (esperado 0)
```

**WA-T07 — APROVADO.**
- Depois de recarregar, a tela voltou no QR com um GET 200 e nenhum POST.
- O canal é o mesmo (`7d694729…`, `sgsm-655759aa-52a9d1`).
- A Evolution continuou com uma única instância da São Lucas.
```
[NOTA] apos recarregar: respostas=["200 GET …/655759aa-…/whatsapp"] | POST disparado? false | QR: {"presente":true,…} | botao Conectar: 0
[NOTA] mesmo canal antes/depois: true
[EVOLUTION] … BODY=[{"name":"sgsm-bot","connectionStatus":"open",…},{"name":"sgsm-655759aa-52a9d1","connectionStatus":"connecting",…}]
```

**WA-T08 — APROVADO.**
- ADM-AB (admin das duas clínicas) trocou São Lucas → Strix → São Lucas.
- O DOM foi amostrado a cada 30 ms. Em nenhuma amostra o QR da clínica anterior aparece com a outra clínica selecionada: a sequência é QR → spinner → "Nenhum" → spinner → QR.
```
amostras: [{"ms":0,"sel":"655759aa","est":"QR(…)"},{"ms":123,"sel":"36a7eb52","est":"CARREGANDO"},{"ms":153,"sel":"36a7eb52","est":"NENHUM"},{"ms":2893,"sel":"655759aa","est":"CARREGANDO"},{"ms":2923,"sel":"655759aa","est":"QR(…)"}]
trocou para Clinica Teste Strix -> GET 404 | Nenhum=1 QR={"presente":false} Desconectar=0
trocou para Clinica São Lucas -> GET 200 | Nenhum=0 QR={"presente":true,…} Desconectar=1
```

**WA-T09 — APROVADO.**
- FUNC-A vê "Aguardando a leitura do QR code" e "O administrador do estabelecimento precisa concluir a conexão."
- Não vê os botões Conectar nem Desconectar.
```
[NOTA] FUNC-A: status visivel=["Aguardando a leitura do QR code"] | aviso=[…] | botao Conectar: 0 | botao Desconectar: 0
```

**WA-T10 — APROVADO.**
- ADM-B (só Strix) fez GET, POST e DELETE na API da São Lucas pela própria app; as três chamadas deram 403.
- Nada mudou no banco nem na Evolution.
```
GET /estabelecimentos/655759aa-…/whatsapp -> 403 {"detail":"Acesso negado ao estabelecimento: 655759aa-…","status":403,…}
POST … -> 403 …   DELETE … -> 403 …
```

**WA-T11 — REPROVADO (só o texto do toast).** Ver "Reprovados" abaixo.
- sgsm reiniciado com `--sgsm.whatsapp.evolution.base-url=http://localhost:8097` (nada escuta nessa porta).
- O POST devolveu 503, a tela não quebrou e o botão continuou habilitado.
- O toast mostrou "Não foi possível falar com o serviço de WhatsApp agora. Tente novamente.", e não o texto do plano.
```
<< 503 POST …/655759aa-…/whatsapp BODY={"detail":"Não foi possível falar com o serviço de WhatsApp agora. Tente novamente.",…,"status":503,"title":"Serviço indisponível",…}
<< 503 GET …/36a7eb52-…/whatsapp BODY={"detail":"Não foi possível consultar o WhatsApp agora. Tente novamente.",…}   (ADM-B: card de erro + "Tentar de novo")
```

**WA-T12 — REPROVADO (parcial).** Ver "Reprovados".
- Com a tela já aberta, o sgsm parado (`taskkill`) e o usuário trocando de clínica, aparece o card "Não foi possível consultar o WhatsApp da clínica" com "Serviço temporariamente indisponível…" e "Tentar de novo".
- Com o sgsm de volta, "Tentar de novo" deu GET 200 e a tela recuperou (QR da Strix).
- **Porém**, abrir a tela com o sgsm já fora mostra só o seletor "Nenhum estabelecimento": sem card, sem "Tentar de novo" e sem forma de recuperar sem recarregar.
```
<< 500 GET …/36a7eb52-…/whatsapp BODY=      (proxy do Vite, sgsm fora)
[NOTA] sgsm fora, trocou para Strix: card de erro=["Não foi possível consultar o WhatsApp da clínica"] | detalhe=["Serviço temporariamente indisponível. Tente novamente em instantes."] | "Tentar de novo"=1
<< 500 GET http://localhost:3001/v1/api/estabelecimentos BODY=     (ADM-A abrindo a tela com o sgsm fora)
[NOTA] ADM-A abriu /whatsapp-clinica com o sgsm fora: seletor=["Nenhum estabelecimento"] | card de erro=0 | "Tentar de novo"=0 | "Nenhum WhatsApp conectado"=0
[NOTA] "Tentar de novo" com o sgsm de volta -> GET 200 | card de erro=0 | QR da Strix=1
```

**WA-T13 — APROVADO.**
- O confirm abriu com o texto do aviso.
- "Cancelar" não enviou nenhum DELETE.
- "OK" deu DELETE 204, o toast "WhatsApp da clínica desconectado" e o card "Nenhum WhatsApp conectado".
- O banco ficou com `REMOVIDO` e a Evolution devolve 404 "instance does not exist".
```
[NOTA] confirm aberto: "Desconectar o WhatsApp desta clínica? …" -> usuario clica CANCELAR
[NOTA] apos cancelar: DELETE enviados=0 | QR ainda na tela=1
<< 204 DELETE …/655759aa-…/whatsapp
[NOTA] confirmou: DELETE -> 204 | toasts=["WhatsApp da clínica desconectado"] | card "Nenhum WhatsApp conectado"=1
[EVOLUTION] GET …/instance/connectionState/sgsm-655759aa-52a9d1 -> 404 … does not exist
```

**WA-T14 — APROVADO.**
- Com o QR pendente na tela, o token de acesso foi trocado por um inválido e o `refresh_token` por um revogado. Foi só isso; não houve nenhuma ação do usuário depois.
- O polling recebeu 401, o refresh também deu 401, e a tela foi sozinha (2,2 s) para `/login?sessao=expirada` com "Sua sessão expirou. Faça login novamente."
```
<< 401 GET …/36a7eb52-…/whatsapp
NAVIGATED: http://localhost:3001/login?sessao=expirada
<< 401 POST …/auth/refresh
```

**WA-T15 — APROVADO.**
- Tráfego pago, Pacientes, Agendamentos e WhatsApp da clínica abriram, sem PAGEERROR.
- Em Tráfego pago, o único 5xx é o 503 tratado do sgsm-ia, "Integração com a Meta não configurada neste ambiente…". É uma configuração do ambiente, anterior à feature, e a tela mostra o aviso.
```
Pacientes: respostas=["200 GET …/v1/api/pacientes",…] | PAGEERROR/5xx=[]
Agendamentos: … 200 GET …/agendamentos … | PAGEERROR/5xx=[]
Tráfego pago: … "503 GET …/marketing/meta/estabelecimentos/655759aa-…/conexao" BODY={"detail":"Integração com a Meta não configurada neste ambiente (…)"}
```

### 2. Conexão real

**WA-C01 — BLOQUEADO.**
- O item exige um celular real lendo o QR. Não há aparelho de teste.
- Não existe forma real de conectar sem celular: o QR do WhatsApp só é aceito pelo app.

**WA-C02 — BLOQUEADO.**
- Mesmo motivo: o item depende de desconectar um aparelho conectado.

### 3. Bot multi-número

- **Canais usados:** São Lucas `sgsm-655759aa-23f525` e Strix `sgsm-36a7eb52-9ea181`, ambos em `PENDENTE_QR`.
- **Números de teste:**
  - N1 `5511973079938`: São Lucas;
  - N2 `5511963079938`: canal geral;
  - N3 `5511953079938`: instância desconhecida;
  - N4 `5511943079938`: Strix.

**WA-B01 — APROVADO.**
- A resposta (termo LGPD) saiu por `/message/sendText/sgsm-655759aa-23f525`.
- A sessão está em `whatsapp:sessao:sgsm-655759aa-23f525:5511973079938` (TTL 1785 s), com `instancia` e `estabelecimentoId` da clínica.
- A chave do canal geral `whatsapp:sessao:5511973079938` não existe.
```
[WA<< jsonl cru] {"rota": "/message/sendText/sgsm-655759aa-23f525", "corpo": {"number": "5511973079938", "text": "Olá! Bem-vindo ao *SGSM* … Digite *ACEITO* para continuar.\n"}}
[REDIS] --scan --pattern whatsapp:sessao:*5511973079938 -> whatsapp:sessao:sgsm-655759aa-23f525:5511973079938
[REDIS] EXISTS whatsapp:sessao:5511973079938 -> 0
```

**WA-B02 — APROVADO.**
- No canal geral (`instance: "sgsm-bot"`), o termo e o menu saíram por `/message/sendText/sgsm-bot`.
- A sessão usa a chave antiga `whatsapp:sessao:5511963079938`, com `instancia: null`.
- Não houve consentimento por clínica nem lead, como era antes.
```
[WA<< jsonl cru] {"rota": "/message/sendText/sgsm-bot", … "text": "Como posso ajudar?\n\n*1.* Agendar consulta …"}
[REDIS] EXISTS whatsapp:sessao:5511963079938 -> 1 ; EXISTS whatsapp:sessao:sgsm-bot:5511963079938 -> 0
consentimentos_do_numero 0 ; leads_do_numero 0
```

**WA-B03 — APROVADO.**
- A instância `sgsm-qa-inexistente-1793080016` deu HTTP 200.
- Nada chegou ao jsonl em 30 s e não foi criada sessão.
- O bot logou WARN.
```
[WA>>] … -> HTTP 200 … [WA<<] (nenhuma resposta no jsonl para 5511953079938 em 30s)
bot-qa.log WARN CanalService "Mensagem recebida por instância de WhatsApp desconhecida ou removida: sgsm-qa-inexistente-1793080016"
```

**WA-B04 — APROVADO.**
- O "aceito" trouxe o menu pelo número da clínica.
- Foi gravado `consentimento_lgpd` (telefone, São Lucas, WHATSAPP, `whatsapp-lgpd-v1`).
- Foi criado o lead `crm.lead` com origem WHATSAPP, NOVO, `estabelecimento_id` da São Lucas, e a marca `whatsapp:lead:{estab}:{numero}` foi gravada.
```
7f6b4802-… |  | 5511973079938 | 655759aa-… | WHATSAPP | whatsapp-lgpd-v1 | 2026-10-27 02:48:07 |
1cb9aec7-… | QA WA Paciente | 5511973079938 | WHATSAPP | NOVO | 655759aa-… | Primeiro contato pelo WhatsApp da clínica
```

**WA-B05 — APROVADO.**
- (a) Mesma sessão: "oi, tudo bem?" teve resposta normal, sem o termo.
- (b) Sessão nova: apaguei `whatsapp:sessao:{inst}:{num}` (`DEL` = 1) para simular o fim do TTL de 30 min. "Olá, voltei" teve resposta normal, sem o termo: o bot consultou `consentimento_lgpd`.
- Continuou com 1 consentimento e 1 lead.
```
[QA] redis-cli DEL whatsapp:sessao:sgsm-655759aa-23f525:5511973079938 -> 1
[WA<<] "*Bom dia!* Como posso ajudar você hoje?"
consentimentos 1 ; leads 1
```

**WA-B06 — REPROVADO.** Ver "Reprovados".
- São Lucas: a resposta está correta (Fabio e QA Registro Seletor, com os serviços dela).
- Strix: o médico está correto, mas a IA **inventou serviços** ("exames de imagem, avaliações laboratoriais e acompanhamento de saúde"). A Strix não tem nenhum serviço cadastrado.

**WA-B07 — APROVADO.**
- Pelo número da São Lucas: "Quero agendar QA Descartavel com o Dr. Fabio … 04/11/2026 às 10:00" → pré-reserva → "Sim" → "Agendamento confirmado com sucesso!"
- O agendamento ficou com `estabelecimento_id` da São Lucas e tipo PRESENCIAL.
```
19b10919-… | a67b7736-… | ff9a2400-… | 0f4d2d1e-… | 655759aa-… | Clinica São Lucas | PRESENCIAL | PENDENTE | 2026-11-04 10:00:00-03
```

**WA-B08 — APROVADO (com ressalva).**
- Paciente cadastrado pelo bot da Strix (o código veio pelo número da Strix) pediu "QA Descartavel com o Dr. Fabio" duas vezes, inclusive insistindo.
- A IA classificou AGENDAR com `servicoMedicoId: null` e respondeu "o Dr. Fabio Monteiro Amorim não atende na Clínica Teste Strix…".
- A conversa seguiu: "Quais médicos atendem aqui?" foi respondida normalmente.
- Com o mesmo corpo que o bot enviaria, o sgsm recusa o pedido: `POST /agendamentos/reservas` e `POST /agendamentos` (Strix + serviço do Fabio) deram 400 "O médico deste serviço não atende neste estabelecimento."
- **Ressalva:** pela conversa real, o pedido nunca chega ao sgsm, porque a IA já filtra antes. O caminho "sgsm devolve 400 → bot avisa" não foi exercitado de ponta a ponta.
```
sgsm-ia LLM: intent AGENDAR servicoMedicoId null medicoId null
POST /v1/api/agendamentos/reservas … -> 400 {"detail":"O médico deste serviço não atende neste estabelecimento.",…}
POST /v1/api/agendamentos … -> 400 {"detail":"O médico deste serviço não atende neste estabelecimento.",…}
```

**WA-B09 — REPROVADO.** Ver "Reprovados".
- O cadastro pelo bot criou o paciente e o vínculo `paciente_estabelecimento` (São Lucas, origem WHATSAPP).
- O consentimento recebeu o `paciente_id`.
- O código saiu pelo número da clínica e a conta foi ativada.
- **O lead não foi convertido:** continua NOVO no banco e no CRM.

**WA-B10 — APROVADO.**
- Com o 10:00 de 04/11 pré-reservado pelo bot, a secretaria FUNC-A abriu o wizard e o 10:00 não aparece na grade dela.
- Depois de confirmado o B07, o paciente pediu o mesmo horário e recebeu: "Esse horário acabou de ser ocupado. Tenho estas opções próximas: 09:30, 10:30, 09:00". A resposta saiu pelo número da clínica.
```
[NOTA] grade de 04/11 vista pela FUNC-A: ["08:00","08:30","09:00","09:30","10:30",…] | 10:00 na grade? false
[WA<< jsonl cru] {"rota": "/message/sendText/sgsm-655759aa-23f525", … "text": "Esse horário acabou de ser ocupado. Tenho estas opções próximas:\n\n*1.* 04/11 às 09:30\n*2.* 04/11 às 10:30\n*3.* 04/11 às 09:00 …"}
```

### 4. Equipe e LGPD

**WA-E01 — APROVADO.**
- FUNC-A e ADM-A da São Lucas encontram "QA WA Paciente Bot 23094" em `/pacientes` (1 card), com 0 agendamentos nesse momento.
- O vínculo é de origem WHATSAPP.

**WA-E02 — REPROVADO.** Ver "Reprovados".
- Na lista, a ADM-B da Strix não vê o paciente (0 cards).
- Mas `GET /v1/api/pacientes/{id}` pela ADM-B devolve **200 com CPF, e-mail e telefone**.

**WA-E03 — APROVADO.**
- DEV → Pacientes → detalhe → "Exportar dados": GET 200, arquivo baixado e toast "Dados exportados com sucesso."
- O JSON traz `clinicas` e `consentimentos`. Cópia em `WA-E03-exportacao.json`.
```
chaves=["paciente","agendamentos","clinicas","consentimentos"] | clinicas=[{"origem":"WHATSAPP","estabelecimentoId":"655759aa-…",…}] | consentimentos=[{"estabelecimentoId":"655759aa-…","canal":"WHATSAPP","versaoTexto":"whatsapp-lgpd-v1",…,"revogadoEm":null}]
```

**WA-E04 — APROVADO.**
- FUNC-A cadastrou "QA WA Paciente Secretaria 79753" (POST 201).
- O vínculo nasceu na São Lucas com origem CLINICA e 0 agendamentos.
- Observação, sem relação com a feature: não apareceu toast de sucesso no cadastro.
```
b5d59955-… | 655759aa-… | CLINICA | 2026-10-27 02:54:41 | Clinica São Lucas
```

### 5. Operação

**WA-O01 — BLOQUEADO.**
- A forma real de disparo existe: no perfil dev, o bot de QA expõe `POST /internal/notificacoes/agenda-diaria/executar`. Disparei de verdade e recebi 202.
- As mensagens foram para o receptor `:8099`, todas por `/message/sendText/sgsm-bot`.
- O bot logou "Agenda diária: enviando para 9 médico(s) ativo(s) referente a 2026-10-27 (0 clínica(s) com WhatsApp)".
- O ramo por clínica só usa canais `CONECTADO` (`GET /interno/whatsapp/canais`). Sem celular para ler o QR, nenhum canal fica `CONECTADO`.
- Também não há consulta hoje: a agenda é diária e só considera o dia corrente.
- Forçar o status no banco seria simular o estado, por isso não foi feito.

**WA-O02 — APROVADO.**
- Sem token: GET `/v1/api/interno/whatsapp/canais` e `/canais/sgsm-bot`, e POST `/vinculos`, deram 401.
- Com token de ADMIN_ESTABELECIMENTO (3 rotas) e de PACIENTE: 403.
```
ANONIMO GET /v1/api/interno/whatsapp/canais (sem Authorization) -> HTTP 401
ADM-B GET /v1/api/interno/whatsapp/canais -> 403 {"status":403,"error":"Forbidden",…}
PACIENTE GET /v1/api/interno/whatsapp/canais -> 403
```

## Reprovados — como reproduzir

### WA-T11 — o texto do toast não é o do plano
1. Suba o sgsm com `--sgsm.whatsapp.evolution.base-url=http://localhost:8097` (porta sem serviço).
2. Logado como ADMIN_ESTABELECIMENTO de uma clínica sem número, abra `/whatsapp-clinica` e clique em "Conectar WhatsApp".

- **Esperado:** toast "Serviço temporariamente indisponível" (503).
- **Obtido:**
  - POST 503 com `detail` "Não foi possível falar com o serviço de WhatsApp agora. Tente novamente.";
  - o toast mostra esse `detail`: o `api.ts` prefere a mensagem do backend ao texto genérico;
  - a tela não quebra e o botão continua habilitado.
- **Por que reprovado:** o comportamento (503, toast, sem quebra) está correto; só o texto diverge. A divergência fica registrada para decidir entre ajustar o plano ou a mensagem.

### WA-T12 — abrir a tela com o sgsm fora não mostra o card de erro
1. Pare o sgsm `:8080`.
2. Com o auth no ar, faça login como ADMIN_ESTABELECIMENTO e abra `/whatsapp-clinica`.

- **Esperado:** card de erro com "Tentar de novo" e recuperação ao clicar depois que o sgsm voltar.
- **Obtido:**
  - `GET /v1/api/estabelecimentos` devolve 500 (proxy do Vite);
  - o seletor fica "Nenhum estabelecimento" e a área de conteúdo fica vazia, sem card, sem "Tentar de novo" e sem "Nenhum WhatsApp conectado" (`WA-T12-c-abriu-com-sgsm-fora.png`);
  - quando o sgsm volta, a tela só se recupera recarregando a página (`WA-T12-e-adm-a-recarregou.png`);
  - o `catch` do `estabelecimentoService.listar()` só dispara `toast.error('Erro ao carregar estabelecimentos')`, que já não estava visível 5 s depois, e deixa `clinicaId` vazio, por isso o card nunca é montado.
- **O que funciona:** com a tela já carregada, o caminho do card + "Tentar de novo" (trocar de clínica com o sgsm fora → card → sgsm volta → "Tentar de novo" → 200).

### WA-B06 — a IA inventa serviços para a clínica do número
1. Com um canal da Clinica Teste Strix (que não tem nenhum serviço ativo), mande "Olá" e depois "ACEITO" de um número novo.
2. Mande "Quais médicos atendem aí e quais serviços vocês oferecem?"

- **Esperado:** citar só médicos e serviços da Strix. Ela não tem serviços, então dizer que não há serviços disponíveis.
- **Obtido:**
  - "*Médicos da Clínica Teste Strix:* QA Medico Rseis Admin Ebbhdc. *Serviços oferecidos:* consultas, exames de imagem, avaliações laboratoriais e acompanhamento de saúde."
  - Insistindo: "*Serviços disponíveis:* consultas de rotina, exames de imagem, avaliações laboratoriais e acompanhamento de saúde."
  - A resposta bruta do LLM está no `sgsm-ia.log` (parte 5 do `WA-B06.log`).
- **O que está correto:** não vazou nenhum médico nem serviço da São Lucas. No número da São Lucas a resposta está certa.

### WA-B09 — o lead não é convertido no cadastro pelo bot
1. No número de uma clínica, mande: "Quero me cadastrar" → "ACEITO" → dados → "Sim" → código → "Conta ativada com sucesso!"
2. Abra o CRM da clínica, ou consulte `crm.lead`.

- **Esperado:** lead CONVERTIDO.
- **Obtido:** o lead continua **NOVO** (`WA-B09-crm-lead-adm-a.png`). O `bot-qa.log` mostra, duas vezes (no cadastro e na ativação):
  ```
  WARN BotOrquestradorService "Falha ao converter o lead 1cb9aec7-…: I/O error on PATCH request for "http://localhost:8082/crm/leads/1cb9aec7-…/status": Invalid HTTP method: PATCH"
  ```
- **Causa provável (só leitura de código):** o `sgsmIaRestClient` do bot usa `SimpleClientHttpRequestFactory` (`HttpURLConnection`, `RestClientConfig.java`), que não aceita o método PATCH.
- **O que está correto:** o vínculo `paciente_estabelecimento` (WHATSAPP), o `paciente_id` no consentimento e o código pela instância da clínica.

### WA-E02 — a equipe de outra clínica lê o paciente pela API
1. Paciente vindo do WhatsApp da São Lucas, só com o vínculo da São Lucas: "QA WA Paciente Bot 23094", id `a67b7736-5605-4ac5-87ee-610b060c9988`.
2. Logado como ADMIN_ESTABELECIMENTO só da Clinica Teste Strix, chame `GET /v1/api/pacientes/a67b7736-…`. Foi feito pela própria app, com o mesmo axios e token da tela.

- **Esperado:** 403/404, como na lista.
- **Obtido:** **200** com nome, CPF `693.531.155-15`, nascimento, e-mail e telefone. A lista (`/pacientes`) não mostra o paciente, e `/exportar` dá 403.
- **Causa provável (só leitura):** `PacienteService.consultar` restringe PACIENTE e MEDICO, mas não restringe FUNCIONARIO nem ADMIN_ESTABELECIMENTO por clínica. Essa lacuna é anterior a esta feature, mas quebra o escopo por clínica que ela promete.

## Observações de execução
- **Prints do bot:** os itens WA-B* não têm tela no SGSM. O print é do visualizador local `qa-scratch/conversa.mjs`, aberto no Chromium. O conteúdo vem 100% de `wa-enviadas.jsonl` (o que foi enviado ao webhook) e de `evolution-captura.jsonl` (resposta crua com a `rota`).
- **Correção na conversa do WA-B01:** a hora da mensagem enviada tinha sido gravada no fim da espera (05:45:44), e não no POST. Corrigi `wa-enviadas.jsonl` para 05:45:39.4, que é a hora do POST registrada em `_wa-WA-B01.log`, e o `wa.mjs` passou a gravar a hora do envio.
- **Leituras fora da UI** (só leitura, para diagnóstico e prova):
  - `sql` e `redis-cli` (`GET`/`EXISTS`/`TTL`/`--scan`);
  - um `DEL` da sessão do bot no WA-B05, para simular o TTL;
  - o token do convite do médico de QA, no setup (mascarado);
  - logs `bot-qa.log`, `sgsm.log` e `sgsm-ia.log`.
- **Reinícios do sgsm:**
  - 05:40:19 parado (PID 20096) → subido com Evolution em `:8097` (PID 8752);
  - 05:42:00 parado → subido normal com `subir.sh sgsm`;
  - 05:43 parado pelo script do WA-T12 → subido de novo com `subir.sh sgsm`.
  - Nenhum JWT/crypto foi exportado; só as 4 variáveis do `subir.sh`.

## Limpeza (`evidence/LIMPEZA.log`, LIMPEZA-ADM-A.png, LIMPEZA-ADM-B.png)
- **Agendamento de teste do WA-B07** (`19b10919-…`, 04/11 10:00, agenda do Dr. Fabio): cancelado pela app da FUNC-A, `PATCH /cancelar` 204.
- **Canais de QA desconectados pela tela:**
  - ADM-A, `sgsm-655759aa-23f525`: DELETE 204;
  - ADM-B, `sgsm-36a7eb52-9ea181`: DELETE 204;
  - `sgsm-655759aa-52a9d1` já tinha sido removido no WA-T13.
  - Os três estão `REMOVIDO` em `sgsm.whatsapp_canal`.
- **Evolution depois da limpeza:**
  - `fetchInstances` = `[{"name":"sgsm-bot","connectionStatus":"open","ownerJid":"556198854016@s.whatsapp.net",…}]`;
  - `connectionState/sgsm-bot` = `{"instance":{"instanceName":"sgsm-bot","state":"open"}}`;
  - as três instâncias de QA → 404 "does not exist".
- **sgsm final:** `:8080` no ar, `/actuator/health` 401, PID 5556, cmdline `SgsmApplication --spring.profiles.active=dev` (configuração normal, subido por `subir.sh sgsm`).
- **Depois da entrega da rodada 1:** por volta de 06:11 UTC, o sgsm PID 5556 saiu do ar. Às 06:11:59 UTC, um processo fora deste QA já subia um sgsm novo (java 17480, `--spring.profiles.active=dev`) e um bot de QA novo. Às 06:13 UTC conferi: sgsm 401, bot :8093 200 e `sgsm-bot` `open`.
- **Contas de teste** (não apagadas; senhas em `qa-scratch/contas.json`, que está no gitignore):

| Perfil | Nome | E-mail |
|---|---|---|
| ADMIN_ESTABELECIMENTO (São Lucas) | QA WA Admin A 99759 | qa.wa.adma.1793044999759@teste.com |
| ADMIN_ESTABELECIMENTO (Strix) | QA WA Admin B 99759 | qa.wa.admb.1793044999759@teste.com |
| ADMIN_ESTABELECIMENTO (as duas) | QA WA Admin Duas 99759 | qa.wa.admab.1793044999759@teste.com |
| FUNCIONARIO (São Lucas) | QA WA Secretaria A 99759 | qa.wa.func.a.1793044999759@teste.com |
| MEDICO (sem clínica) | QA WA Medico Bjaaij (id 728c981c-…) | qa.wa.medico.1793079190089@teste.com |
| PACIENTE (existente, rodada 11) | QA Paciente R11 Conta 23181 | qa.conflito.pac.r11.conta.1792353623181@teste.com |
| PACIENTE (cadastrado pelo bot, São Lucas) | QA WA Paciente Bot 23094 (a67b7736-…) | qa.wa.pac.bot.1793080223094@teste.com |
| PACIENTE (cadastrado pelo bot, Strix) | QA WA Paciente Strix 04817 | qa.wa.pac.strix.1793080704817@teste.com |
| PACIENTE (cadastrado pela FUNC-A) | QA WA Paciente Secretaria 79753 (b5d59955-…) | qa.wa.pac.sec.1793080479753@teste.com |

- **Ficaram no Redis:**
  - as sessões do bot dos números de teste (expiram pelo TTL de 30 min);
  - as marcas `whatsapp:lead:*` dos números N1 e N4.
- **Ficaram no banco:**
  - os 2 consentimentos (N1 São Lucas, N4 Strix);
  - os 2 leads WHATSAPP, ambos **NOVO** mesmo depois do cadastro pelo bot. O de N4 é a segunda ocorrência do defeito do WA-B09;
  - os vínculos dos pacientes de teste.

## Scripts (`qa-scratch/`)
- `lib.mjs`: cópia adaptada da lib5, com BASE `:3001`, EVID novo e máscara reforçada.
- `wa.mjs`, `checar.mjs`, `conversa.mjs`: ferramentas do bot.
- `s0-setup.mjs`, `s0b-medico.mjs`: preparação das contas.
- `s1a-menu.mjs`, `s1b-conectar.mjs`, `s1c-escopo.mjs`, `s1e-t15.mjs`: itens de tela.
- `s2-t11.mjs`, `s3-t12.mjs`, `subir-sgsm-evolution-fora.sh`: itens com sgsm/Evolution fora.
- `s4-reconectar.mjs`, `s6-equipe.mjs`, `s7-b10-secretaria.mjs`, `s8-b08-sgsm.mjs`: bot, equipe e LGPD.
- `s9-limpeza.mjs`: limpeza.
