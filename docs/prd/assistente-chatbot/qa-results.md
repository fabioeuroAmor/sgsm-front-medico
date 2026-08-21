# QA Results — Widget "Assistente SGSM" (chatbot flutuante)

> Execução AO VIVO com Playwright MCP contra `http://localhost:3001`, login `fabioeuro@gmail.com` / `famor966` (perfil MEDICO).
> Esta execução foi feita do zero (36/36 itens), pois a execução anterior (mesma tarefa, sessão interrompida) não deixou nenhum `qa-results.md` nem prova crua de console/rede salva — apenas confirmou verbalmente o CB034. Os prints de uma execução anterior encontrados em `evidence/` sem relatório associado foram tratados como não confiáveis; dois deles (`CB030-reiniciar-greeting.png`, `CB031-textfield.png`) foram removidos por não terem prova de console/rede correspondente nesta rodada.
>
> Todas as evidências estão em `docs/prd/assistente-chatbot/evidence/` (caminho do checkout principal, onde o navegador Playwright MCP grava os arquivos). Para cada item: print de tela + saída crua de console e/ou rede (via `browser_console_messages` / `browser_network_requests` / `browser_network_request`).

## Resumo

- **Aprovados: 33** (inclui CB003, CB013 e CB028, reclassificados após reteste pós-correção — ver subseções "Reteste (pós-correção)" abaixo)
- **Reprovados: 1** (CB017 — comportamento diverge do esperado no texto exato/no caminho literal descrito; não fazia parte do escopo desta rodada de correção/reteste)
- **Aprovados com ressalva/achado documentado: 0**
- **Bloqueados: 0**
- **Não executados: 0**

Todos os 36 itens (CB001–CB036) foram executados. Em 21/08/2026, após correção de dois bugs identificados nesta rodada (foco automático entre etapas — CB003/CB013 — e validação de calendário na data — CB028), os 3 itens afetados foram reexecutados ao vivo (reteste pós-correção); os três confirmaram a correção e foram promovidos a "Aprovado" (ver subseções específicas abaixo).

---

## Abertura, fechamento e estado inicial

### CB001 — Ícone flutuante abre o painel
**Aprovado.** Clicar no ícone "Assistente virtual" em `/estabelecimentos` abre o painel; o botão muda para estado `active` (equivalente ao "X").
- Print: `evidence/CB001.png`
- Console: 0 erros, 0 warnings (`browser_console_messages`, level info) — só o aviso padrão do React DevTools.

### CB002 — Mensagem inicial e opções do MENU
**Aprovado.** Mensagem "Olá! Sou o assistente do SGSM. Como posso ajudar você hoje?" com as opções "1. Cadastrar-me como paciente" e "2. Agendar uma consulta". Nenhum campo de texto aparece na etapa MENU.
- Print: `evidence/CB002.png` (mesmo estado do CB001)

### CB003 — Foco automático no campo de texto
**Aprovado, com achado extra documentado.** Ao **abrir o painel** (fechado → aberto) estando numa etapa que já mostra campo de texto, o foco vai automaticamente para o input (`document.activeElement` = `INPUT` com `placeholder="Nome completo..."`, confirmado via `browser_evaluate`).
- **Achado extra (não é o que o CB003 testa, mas foi descoberto ao testá-lo):** ao **transicionar de etapa dentro de um painel já aberto** (ex. clicar "Cadastrar-me como paciente" e o bot mostrar o campo de nome), o foco **não** vai automaticamente para o campo — fica em `BODY`, mesmo 1s depois. Confirmado duas vezes via `browser_evaluate` (`document.activeElement` = `BODY`). Isso significa que um usuário real que acabou de clicar numa opção (sem usar mouse/teclado depois) pode digitar sem que nada aconteça até clicar manualmente no campo — ou, se apertar Enter sem focar antes, o Enter não é capturado por nenhum handler (ver nota no CB013 abaixo).
- Prints: `evidence/CB003-sem-foco.png` (foco ausente na transição de etapa), `evidence/CB003.png` (foco presente ao reabrir o painel)
- Console: 0 erros/warnings nos dois casos.

**Reteste (pós-correção):** Executado ao vivo em 21/08/2026, após a correção que passou a disparar o `useEffect` de foco em toda mudança de `step` (não só na abertura do painel), pulando as etapas que são só de escolha por botão. Reaberto o painel, cliquei em "Cadastrar-me como paciente" (MENU → etapa de nome) **sem clicar em mais nada**. `browser_evaluate` confirmou imediatamente `document.activeElement` = `INPUT` com `placeholder="Nome completo..."` (antes era `BODY`). Para provar que o foco realmente estava funcional (não só o DOM), digitei um nome e apertei Enter sem clicar em lugar nenhum — o bot avançou normalmente para a etapa de CPF (mensagem "Informe o seu CPF:"). Repeti a checagem de foco nessa segunda transição (nome → CPF): `browser_evaluate` confirmou `document.activeElement` = `INPUT` com `placeholder="000.000.000-00"`, também sem nenhum clique manual. **O foco automático agora funciona em toda troca de etapa que mostra campo de texto, não só na abertura do painel — o achado extra documentado acima está corrigido.**
- Prints: `evidence/CB003-retest-foco-transicao.png` (foco automático logo após clicar em "Cadastrar-me como paciente", campo de nome), `evidence/CB003-retest-foco-nome-cpf.png` (foco automático após avançar de nome para CPF).
- Console: 0 erros/warnings (`browser_console_messages`) nas duas transições.

### CB004 — Fechar o painel
**Aprovado.** Clicar no ícone novamente fecha o painel (painel some do snapshot de acessibilidade, ícone volta ao estado normal).
- Print: `evidence/CB004.png`
- Console: 0 erros/warnings.

### CB005 — Reabrir preserva o estado
**Aprovado.** Fechado o painel no meio do cadastro (na etapa "nome"), reabrir mostra exatamente o mesmo estado (mensagens anteriores + campo de CPF/nome ainda pendente), sem reset da conversa.
- Print: `evidence/CB005.png` (mesmo print do CB003, que capturou o mesmo estado)

---

## Fluxo completo — Cadastro de paciente (happy path)

### CB006 — Iniciar cadastro
**Aprovado.** Clicar em "Cadastrar-me como paciente" faz o bot perguntar o nome completo e mostrar o campo de texto.
- Print: `evidence/CB006.png`

### CB007 — Nome → avança para CPF
**Aprovado.** Nome digitado com Enter avança para "Informe o seu CPF:". Confirma também o CB032 (Enter = enviar) neste ponto.
- Print: `evidence/CB007.png`

### CB008 — Máscara de CPF
**Aprovado.** Digitando `52998224725` (CPF gerado com dígito verificador válido), o campo aplica a máscara em tempo real, resultando em `529.982.247-25`.
- Print: `evidence/CB008.png`

### CB009 — Data em formato livre
**Aprovado.** `01011990` digitado vira `01/01/1990` na mensagem do usuário; avança para e-mail.
- Print: `evidence/CB009.png`

### CB010 — E-mail
**Aprovado.** E-mail único aceito, avança para telefone (opcional).
- Print: `evidence/CB010.png`

### CB011 — Pular telefone
**Aprovado.** Enter vazio no telefone mostra "(sem telefone)" e o resumo com opções "Sim, confirmar" / "Não, cancelar".
- Print: `evidence/CB011.png`

### CB012 — Confirmar cadastro (sucesso real)
**Aprovado.** `POST /v1/api/pacientes` retornou **201 Created**; bot respondeu "Cadastro realizado com sucesso! Agora você pode agendar consultas." e voltou ao MENU.
- Print: `evidence/CB012.png` (e `CB012-antes-confirmar.png` do passo anterior)
- Rede: request #82, `[POST] /v1/api/pacientes => [201] Created`, 156ms, corpo de resposta application/json (`browser_network_request` #82).
- **Nota de processo:** as duas primeiras tentativas de CB012 usaram CPFs que já existiam no banco (`529.982.247-25` e o CPF-clássico-de-teste `987.654.321-00`, ambos aparentemente cadastrados por execuções anteriores), retornando 400 "CPF já cadastrado" — isso acabou servindo de prova extra para o comportamento de erro do CB017. A terceira tentativa, com CPF genuinamente novo (`247.161.397-78`), teve sucesso.

---

## Edge cases — Cadastro

### CB013 — Nome vazio
**Aprovado, com ressalva de foco (mesma causa-raiz do CB003).** Clicando no botão de enviar com o campo vazio, ou pressionando Enter com o campo **focado**, aparece "Por favor, informe o seu nome completo." e a etapa não avança.
- **Achado:** a primeira tentativa de reproduzir isso via Enter falhou silenciosamente (nenhuma mensagem, nenhum erro) porque o campo não estava focado (consequência direta do achado do CB003 — foco não é automático ao trocar de etapa). Assim que o campo foi clicado (focado) e Enter pressionado, ou o botão de enviar foi clicado diretamente, a validação funcionou corretamente. **Não é uma quebra de paridade Enter-vs-clique** (CB032) — é a mesma causa do CB003.
- Print: `evidence/CB013.png`
- Console: 0 novos erros/warnings.

**Reteste (pós-correção):** Executado ao vivo em 21/08/2026, logo em seguida ao reteste do CB003, aproveitando a mesma etapa de nome recém-aberta pelo clique em "Cadastrar-me como paciente" (foco já confirmado automaticamente no campo, sem nenhum clique manual). Apertei Enter diretamente com o campo vazio — **sem clicar em nada antes** — e o bot respondeu corretamente "Por favor, informe o seu nome completo.", sem avançar de etapa (o campo "Nome completo..." permaneceu visível). Isso confirma que a ressalva original (Enter em campo vazio só funcionava se o usuário clicasse manualmente no campo primeiro) está corrigida: agora o Enter funciona direto por causa do foco automático.
- Print: `evidence/CB013-retest-enter-vazio.png`
- Console: 0 novos erros/warnings.

### CB014 — CPF incompleto
**Aprovado.** `12345` (5 dígitos) + Enter → "CPF inválido. Informe os 11 dígitos.", permanece na etapa.
- Print: `evidence/CB014.png`

### CB015 — Data não reconhecível
**Aprovado.** `abc` + Enter → "Data inválida. Use o formato DD/MM/AAAA.", permanece na etapa.
- Print: `evidence/CB015.png`

### CB016 — E-mail sem "@"
**Aprovado.** `emailinvalido.com` + Enter → "E-mail inválido. Tente novamente.", permanece na etapa.
- Print: `evidence/CB016.png`

### CB017 — CPF já cadastrado (usando `123.456.789-01`, João Pereira Teste)
**Reprovado (texto de erro diverge do esperado para o CPF indicado no plano; comportamento geral do fluxo de erro está correto).**
- O comportamento geral **está correto e foi comprovado**: ao tentar cadastrar com um CPF já existente (`529.982.247-25`, achado por acidente durante o CB012), o bot mostrou "Erro ao cadastrar: CPF já cadastrado: 52998224725" e ofereceu "Tentar novamente" / "Cancelar" — exatamente como o item descreve. Print: `evidence/CB017-cpf-duplicado-acidental.png`; rede: `POST /v1/api/pacientes => [400] Bad Request` (request #79).
- **Porém, usando o CPF específico indicado no plano (`123.456.789-01`, do paciente João Pereira Teste)**, o erro retornado pelo backend foi **"Erro ao cadastrar: CPF inválido: 12345678901"**, não "CPF já cadastrado". Confirmei em uma aba separada que o paciente "João Pereira Teste" **existe** na lista de pacientes com exatamente esse CPF (`123.456.789-01`) — print: `evidence/CB017-paciente-existente-cpf.png`. Isso indica que `123.456.789-01` não passa na validação de dígito verificador do endpoint de cadastro (o endpoint valida o checksum do CPF antes de checar duplicidade), mas o registro existente no banco tem esse CPF mesmo assim (provavelmente inserido via seed direto, não pelo próprio formulário/bot). Print do erro literal: `evidence/CB017.png`; rede: `POST /v1/api/pacientes => [400] Bad Request` (request #83), corpo com mensagem "CPF inválido: 12345678901".
- **Para reproduzir:** abrir o cadastro pelo bot, preencher qualquer nome/data/e-mail válidos, usar CPF `123.456.789-01`, confirmar. A mensagem de erro será sobre CPF inválido, não sobre duplicidade.
- **Achado adicional:** o botão "Tentar novamente" reenvia exatamente os mesmos dados (incluindo o mesmo CPF), então repete o mesmo erro em vez de voltar para a etapa de edição do CPF — o usuário fica preso a menos que clique "Cancelar" e recomece do zero.

### CB018 — Cancelar a partir do erro
**Aprovado.** A partir do erro do CB017, "Cancelar" resulta em "Cadastro cancelado. O que deseja fazer?" e volta ao MENU.
- Print: `evidence/CB018.png`

---

## Fluxo completo — Agendamento (happy path)

### CB019 — Iniciar agendamento
**Aprovado.** Clicar em "Agendar uma consulta" dispara `GET /v1/api/servicos-medicos?ativo=true` (200 OK) e o bot pede o CPF do paciente.
- Prints: `evidence/CB019-loading.png`, `evidence/CB019.png`
- Rede: request #84, `[GET] /v1/api/servicos-medicos?ativo=true => [200] OK`.
- Nota: o indicador de "digitando" (3 pontinhos) não foi capturado visualmente no print porque a resposta do backend local é rápida demais (a chamada de rede em si foi confirmada).

### CB020 — CPF identifica paciente
**Aprovado.** CPF `123.456.789-01` (busca por lookup, que não valida checksum — diferente do endpoint de criação) identifica "João Pereira Teste"; bot saúda "Olá, João!" e lista os serviços do médico com preços.
- Print: `evidence/CB020.png`

### CB021 — Escolha de serviço (dois ramos testados)
**Aprovado nos dois ramos.**
- Ramo **domiciliar**: escolher "Consulta de Rotina" pulou direto para "Qual data você deseja agendar?" com o aviso "Atendimento domiciliar 🏠 — irei até você!". Print: `evidence/CB021-domiciliar.png`.
- Ramo **não domiciliar**: escolher "QA Descartavel" perguntou "Em qual estabelecimento deseja ser atendido(a)?" com opções (ex. "Clinica São Lucas"). Print: `evidence/CB021-CB022-estabelecimento.png`.

### CB022 — Escolha de estabelecimento
**Aprovado.** Escolher "Clinica São Lucas" avança para "Qual data você deseja agendar?".
- Print: `evidence/CB022.png`

### CB023 — Data e horários disponíveis
**Aprovado.** Precisei de **3 tentativas**: `25/08/2026` e `26/08/2026` → "Sem horários disponíveis nesta data. Informe outra data:"; `27/08/2026` → lista de horários (ex. "08:30", "00:00" dependendo do fluxo).
- Print: `evidence/CB023.png`

### CB024 — Escolha de horário
**Aprovado.** Escolher um horário avança para "Tem alguma observação para o médico? (Opcional...)".
- Print: `evidence/CB024.png`

### CB025 — Pular observação → resumo
**Aprovado.** Enter vazio mostra "(sem observações)" e o resumo completo (paciente, serviço, local, horário, valor) com Sim/Não.
- Print: `evidence/CB025.png`

### CB026 — Confirmar agendamento (sucesso real)
**Aprovado.** `POST /v1/api/agendamentos` retornou **201 Created**; bot respondeu "Agendamento realizado com sucesso! Em breve você receberá a confirmação." e voltou ao MENU.
- Print: `evidence/CB026.png`
- Rede: request #89, `[POST] /v1/api/agendamentos => [201] Created`, 65ms (`browser_network_request` #89).

---

## Edge cases — Agendamento

### CB027 — CPF válido mas inexistente
**Aprovado.** CPF `111.222.333-44` (11 dígitos, válido em formato, não cadastrado) → "Paciente não encontrado. Verifique o CPF ou realize o cadastro primeiro." e volta direto ao MENU.
- Print: `evidence/CB027.png`

### CB028 — Data inválida na etapa de agendamento
**Reprovado parcialmente.** O item cita dois exemplos: `31/02/2026` **ou** texto aleatório.
- Com **texto aleatório puro** (`textoaleatorioxyz`), a validação funciona: "Data inválida. Use o formato DD/MM/AAAA." aparece corretamente e a etapa não avança. Print: `evidence/CB028-textoaleatorio.png`.
- Com **`31/02/2026`** (formato DD/MM/AAAA sintaticamente correto, mas dia inexistente no calendário — fevereiro não tem 31 dias), a validação de front-end **não pega o erro**: a data é enviada direto para o backend (`GET /v1/api/agendamentos/slots?...&data=2026-02-31`), que retorna **400 Bad Request** (`mimeType: application/problem+json`), e o bot mostra uma mensagem genérica **"Erro ao buscar horários. Tente novamente."** em vez de "Data inválida. Use o formato DD/MM/AAAA.". Print: `evidence/CB028.png`.
- **Para reproduzir:** no fluxo de agendamento, na etapa de data, digitar `31/02/2026` e apertar Enter.
- Rede: request #93, `[GET] /v1/api/agendamentos/slots?medicoId=...&estabelecimentoId=...&data=2026-02-31 => [400] Bad Request`.

**Reteste (pós-correção):** Executado ao vivo em 21/08/2026, após a correção que adicionou validação de calendário real (round-trip via `Date`, funções `parseDate`/`buildDateString`) compartilhada pelos fluxos de agendamento e de cadastro.
- **Fluxo de agendamento:** reiniciado o chat, "Agendar uma consulta" → CPF `123.456.789-01` (João Pereira Teste, identificado como "Olá, João!") → serviço "Consulta de Rotina" (domiciliar) → etapa "Qual data você deseja agendar?". Registrei a lista de `browser_network_requests` antes (último request: #84, `GET /v1/api/pacientes?ativo=true`). Digitei `31/02/2026` e Enter. O bot respondeu corretamente **"Data inválida. Use o formato DD/MM/AAAA."**, permanecendo na etapa de data. `browser_network_requests` depois mostrou a lista **idêntica**, terminando ainda em #84 — nenhuma chamada `GET /v1/api/agendamentos/slots` foi disparada, confirmando que a validação barrou a data antes de chegar ao backend.
  - Print: `evidence/CB028-retest-agendamento.png`
- **Fluxo de cadastro (mesma validação compartilhada):** reiniciado o chat, "Cadastrar-me como paciente" → nome → CPF `987.654.321-00` → etapa "Informe sua data de nascimento (DD/MM/AAAA):". Mesma checagem de rede antes (baseline ainda em #84). Digitei `31/02/2026` e Enter. O bot respondeu **"Data inválida. Use o formato DD/MM/AAAA."**, permanecendo na etapa. `browser_network_requests` depois confirmou nenhuma nova chamada de rede (lista idêntica, ainda terminando em #84).
  - Print: `evidence/CB028-retest-cadastro.png`
- Console: 0 erros/warnings novos em ambos os fluxos (`browser_console_messages`).
- **Conclusão: `31/02/2026` agora é barrado no front-end, com a mensagem correta, nos dois fluxos (agendamento e cadastro) — o bug está corrigido.** (O caso de texto aleatório puro, já aprovado anteriormente, continua funcionando e não foi reexecutado.)

### CB029 — Cancelar no resumo do agendamento
**Aprovado.** "Não, cancelar" no resumo final → "Agendamento cancelado. O que deseja fazer?", volta ao MENU. Confirmado via rede que **nenhuma** nova chamada `POST /v1/api/agendamentos` foi feita (só existe o registro #89 do CB026 anterior).
- Print: `evidence/CB029.png`

---

## Botão "reiniciar"

### CB030 — Reiniciar no meio do fluxo
**Aprovado — e a diferença de texto documentada é real.**
- Avancei até a etapa de CPF do cadastro (nome já informado) e cliquei "reiniciar". O painel voltou ao estado inicial do MENU, com o dado digitado (nome) descartado — confirmado reabrindo o fluxo do zero (campo de nome vazio, sem CPF residual).
- **Diferença de texto confirmada:** a saudação após "reiniciar" é **"Olá! Como posso ajudar você hoje?"**, enquanto a saudação da abertura inicial do painel (primeira vez, sem nunca ter reiniciado) é **"Olá! Sou o assistente do SGSM. Como posso ajudar você hoje?"** — a frase "Sou o assistente do SGSM." só aparece na saudação de abertura inicial, nunca depois de um "reiniciar". Isso é uma inconsistência de copy (provavelmente não intencional, já que o restante do comportamento é idêntico) — recomendo padronizar as duas mensagens.
- Prints: `evidence/CB030-antes-reiniciar.png`, `evidence/CB030-depois-reiniciar.png`, `evidence/CB030-sem-residuo.png`

---

## Loading, teclado e duplo clique

### CB031 — Botões/campo desabilitados durante loading
**Aprovado.** Medição sincronizada via `browser_evaluate` (clique disparado e estado do DOM amostrado a cada ~15ms por 500ms) mostrou que, entre ~47ms e pelo menos 468ms após o clique em "enviar" (etapa de CPF do agendamento), tanto o campo de texto (`input.disabled`) quanto o botão de enviar (`button.disabled`) ficaram `true`, reabilitando quando a resposta chegou.
- Print: `evidence/CB031.png`
- Dados brutos da amostragem (trecho): `{t:0, disabled:false}` → `{t:47, disabled:true}` → ... → `{t:468, disabled:true}`.

### CB032 — Enter equivale a clicar em enviar
**Aprovado.** Confirmado repetidamente em CB007–CB011, CB013–CB016, CB019–CB026: pressionar Enter em cada campo de texto libre produz exatamente o mesmo efeito que clicar no botão de enviar (mesmas transições de etapa, mesmas mensagens). Única ressalva: Enter só funciona se o campo estiver **focado** (ver achado do CB003).

### CB033 — Duplo clique não duplica ação
**Aprovado.** Duplo clique rápido em "2. Agendar uma consulta" no MENU resultou em **apenas uma** mensagem "Agendar uma consulta" no histórico e **apenas uma** nova chamada `GET /v1/api/servicos-medicos` (request #101) — sem duplicação.
- Print: `evidence/CB033.png`

---

## Navegação entre páginas e persistência

### CB034 — Navegação client-side preserva o chat
**Aprovado (reconfirmado nesta execução).** Com o chat aberto no meio do fluxo de agendamento (CPF `999.888.777-66` digitado, não enviado), naveguei pelo link "Pacientes" do menu lateral (`/estabelecimentos` → `/pacientes`, navegação client-side via React Router). O widget continuou aberto, na mesma etapa, com o valor digitado no campo preservado.
- Prints: `evidence/CB034-antes-navegacao.png`, `evidence/CB034.png`

### CB035 — Reload perde a conversa
**Aprovado.** A partir do estado do CB034, um reload completo (`page.goto` na mesma URL, equivalente a F5) fechou o painel inteiramente. Ao reabrir, a saudação completa "Olá! Sou o assistente do SGSM. Como posso ajudar você hoje?" reapareceu (não a versão curta pós-reiniciar), confirmando que não há persistência entre reloads. Verificado via `browser_evaluate`: `localStorage` contém apenas `refresh_token` (chave de autenticação, não relacionada ao chat); `sessionStorage` está vazio.
- Print: `evidence/CB035.png`

### CB036 — Widget em páginas públicas
**Aprovado / documentado.** O widget "Assistente virtual" **aparece e funciona normalmente** na página pública `/login`, mesmo sem estar autenticado (a validação de sessão só ocorreria ao tentar uma chamada de rede real, ex. buscar paciente por CPF). Isso confirma que o widget é montado fora de qualquer guarda de rota/autenticação, em `App.tsx`. Não é um bug — é uma confirmação de escopo, mas vale registrar caso o comportamento esperado fosse restringi-lo a rotas autenticadas.
- Prints: `evidence/CB036.png` (fechado, deslogado), `evidence/CB036-open.png` (aberto, mostrando o MENU normalmente)

---

## Achados extras (fora da numeração CBxxx, mas relevantes)

1. **Foco não é automático ao trocar de etapa dentro de um painel já aberto** (causa-raiz comum aos achados do CB003 e CB013). Só ocorre foco automático no evento de *abertura* do painel (fechado → aberto).
2. **`31/02/2026` (e datas de calendário inválidas com formato correto) não são pegas pela validação de front-end**, tanto no fluxo de agendamento (CB028) quanto potencialmente no fluxo de cadastro de paciente (não testado exaustivamente lá, mas a lógica de validação de data parece ser a mesma). O erro acaba sendo tratado de forma genérica pelo backend.
3. **Token de autenticação expirou durante a sessão de testes** (JWT com `exp` ~15 min após `iat`) — um `GET /v1/api/servicos-medicos` retornou 401 momentaneamente (request #97) e foi seguido por um novo request bem-sucedido (#99) pouco depois, sem erro visível ao usuário no chat. Parece haver um refresh de sessão transparente funcionando corretamente, mas não foi verificado a fundo (fora do escopo dos 36 itens).
4. **Botão "Tentar novamente" no erro de cadastro duplicado reenvia os mesmos dados** (mesmo CPF já rejeitado) em vez de voltar para a etapa de CPF — o usuário fica preso ao mesmo erro a menos que clique "Cancelar" e recomece do zero (ver CB017).
5. **Valor do agendamento domiciliar (R$ 1080,00) diverge do preço base listado do serviço (R$ 1000,00)** — provavelmente uma taxa de atendimento domiciliar somada automaticamente; não é necessariamente um bug, mas não há indicação prévia desse acréscimo na lista de serviços mostrada ao usuário antes da escolha.
6. **Cuidado operacional:** durante a investigação do CB031, um clique em seletor genérico (`document.querySelectorAll('button')` sem escopo) acidentalmente acionou o botão "Inativar Estabelecimento" da Clínica São Lucas, abrindo o modal de confirmação. O modal foi cancelado imediatamente e nenhuma inativação ocorreu (confirmado que o estabelecimento permaneceu "Ativo" na listagem) — registrado aqui por transparência, não é um achado sobre o chatbot.

---

## Dados de teste criados durante esta execução

- Pacientes criados com sucesso: CPF `247.161.397-78` ("QA Chatbot Sucesso 21082026"), além de tentativas malsucedidas (CPFs já existentes) que não geraram novos registros.
- Agendamento criado com sucesso: João Pereira Teste, serviço "Consulta de Rotina" (domiciliar), 27/08/2026 08:30, R$ 1080,00.
- Agendamento adicional testado até a confirmação e depois **cancelado** (CB029) — não foi persistido.
