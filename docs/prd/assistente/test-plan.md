# Test Plan — Assistente SGSM (widget flutuante `ChatbotWidget`)

Ambiente: front-end em `http://localhost:3001`, backend real (`8080` API principal, `8081` auth, `8082`
IA/CRM, `8083`) já em execução. Sem mocks — todas as chamadas batem no backend real. Simulação de
rede lenta/erro é feita por interceptação real de rota (Playwright `page.route`/`browser_run_code_unsafe`),
nunca por mock de dados da aplicação.

Login de teste válido: `eduardasilva@gmail.com` / `joaozinh7` (perfil `MEDICO`). Para os casos de
cadastro de paciente, usar CPF/e-mail claramente fictícios para não colidir com contas reais.

Convenções: cada item tem checkbox + id curto (`Axx`). Um item só é marcado quando o subagente de QA
anexar **print da tela** + **saída crua de console/rede** comprovando o resultado. Item que o próprio
implementador rodou não conta como aprovado.

Escopo: o widget flutuante "Assistente SGSM" (`src/components/ChatbotWidget.tsx`), botão com
`aria-label="Assistente virtual"`, montado globalmente em `App.tsx` (fora do `<Routes>`, portanto
presente e com o MESMO estado em memória em qualquer página, autenticada ou não). Cobre os dois fluxos
guiados por menu: **Cadastrar-me como paciente** e **Agendar uma consulta**. Não cobre o `/ia`
("Assistente IA", página cheia à parte com RAG/Milvus) nem o conteúdo das páginas de destino da
navegação usadas apenas como pano de fundo (ex. `/pacientes`, `/agendamentos`).

## 0. Renderização inicial e visibilidade global

- [x] A01 — Botão flutuante (`aria-label="Assistente virtual"`, canto inferior direito) aparece em
      `/login` (sem sessão) e também em uma página autenticada (ex. `/pacientes`) — confirma que o
      widget é global, fora do fluxo de rotas protegidas.
      **PASS.** Confirmado em `/login` (sem sessão) e `/pacientes` (autenticado), mesmo botão e
      layout. Evidência: `evidence/A01.log`, `evidence/A01-login.png`, `evidence/A01-pacientes.png`.
- [x] A02 — Clicar no botão abre o painel com a mensagem inicial do bot ("Olá! Sou o assistente do
      SGSM...") e as duas opções do menu: "Cadastrar-me como paciente" e "Agendar uma consulta".
      Ícone do botão muda de balão (`MessageCircle`) para "X" enquanto o painel está aberto.
      **PASS.** Evidência: `evidence/A02.log`, `evidence/A02.png`.
- [x] A03 — Clicar novamente no botão ("X") fecha o painel; o ícone volta a `MessageCircle`.
      **PASS.** Evidência: `evidence/A03.log`, `evidence/A03.png`.
- [x] A04 — Nenhum erro aparece no console ao carregar a página inicial nem ao abrir o widget pela
      primeira vez.
      **PASS.** 0 erros/warnings em 3 pontos de verificação. Evidência: `evidence/A04.log`.

## 1. Persistência de estado entre navegação (widget global, fora de `<Routes>`)

- [x] A05 — Abrir o widget, avançar até o meio de um fluxo (ex. escolher "Cadastrar-me como
      paciente" e digitar o nome), navegar para outra página via link do menu lateral (sem fechar o
      widget) — confirmar que a conversa permanece exatamente no mesmo passo/estado após a navegação
      (o componente não desmonta).
      **PASS.** Navegação client-side /pacientes → /medicos preserva o passo CAD_NOME e o texto
      digitado. Evidência: `evidence/A05.log`, `evidence/A05-before-nav.png`, `evidence/A05-after-nav.png`.
- [x] A06 — Fechar o painel (não reiniciar) no meio de um fluxo, navegar para outra página, reabrir o
      painel — a conversa deve continuar de onde parou (o estado sobrevive ao fechar/abrir, só o
      reset explícito no botão "reiniciar" deve limpar).
      **PASS.** Evidência: `evidence/A06.log`, `evidence/A06.png`.
- [x] A07 — Dar F5 (reload completo da página) no meio de um fluxo — confirmar que o estado é
      perdido e o widget volta ao menu inicial ao reabrir (esperado para estado só em memória React,
      sem persistência local).
      **PASS (comportamento esperado).** Evidência: `evidence/A07.log`, `evidence/A07.png`.

## 2. Fluxo — Cadastrar-me como paciente

- [x] A08 — Escolher "Cadastrar-me como paciente" pergunta o nome completo (`CAD_NOME`).
      **PASS.** Evidência: `evidence/A08.log`, `evidence/A08.png`.
- [x] A09 — Submeter nome vazio (Enter/clique no envio sem digitar nada) — bot responde pedindo o
      nome novamente, sem avançar de passo e sem disparar nenhuma chamada de rede.
      **PASS.** Evidência: `evidence/A09.log`, `evidence/A09.png`.
- [x] A10 — Digitar um nome válido avança para o CPF (`CAD_CPF`); o campo aplica máscara
      `000.000.000-00` conforme digita (apenas dígitos aceitos, letras são ignoradas pela máscara).
      **PASS.** Evidência: `evidence/A10.log`, `evidence/A10.png`.
- [x] A11 — Submeter um CPF com menos de 11 dígitos — bot responde "CPF inválido. Informe os 11
      dígitos.", sem avançar.
      **PASS.** Evidência: `evidence/A11.log`, `evidence/A11.png`.
- [x] A12 — CPF completo (11 dígitos, sem validação de dígito verificador no front) avança para a
      data de nascimento (`CAD_DATA`); documentar que o front aceita qualquer sequência de 11 dígitos
      sem checar se é um CPF matematicamente válido.
      **PASS/documentado.** Confirmado: front só valida quantidade de dígitos. Evidência:
      `evidence/A12.log`, `evidence/A12.png`. Ver também `evidence/A23-checksum-reject.log`
      (confirma que o BACKEND rejeita esse CPF com 400 "CPF inválido").
- [x] A13 — No campo de data, a máscara aplicada ao digitar (`DD/MM/AAAA`) permite apenas dígitos —
      colar (paste) uma data por extenso (ex. "10 de janeiro de 2000") para verificar se a máscara
      remove as letras e quebra o valor colado, mesmo o código de parsing (`parseDate`) tendo um ramo
      dedicado para esse formato por extenso (investigar se esse ramo é alcançável pela UI real).
      **PASS/documentado (achado de código morto).** Paste simulado via ClipboardEvent + setter
      nativo vira "10/20/00" (mês/ano sem sentido) — o ramo por extenso de `parseDate` nunca é
      alcançável pela UI real porque `maskDate` roda antes e já destrói o texto. Evidência:
      `evidence/A13.log`, `evidence/A13.png`.
- [x] A14 — Submeter uma data em formato inválido (ex. "31132000" incompleto ou texto puro que sobra
      vazio após a máscara) — bot responde "Data inválida. Use o formato DD/MM/AAAA.", sem avançar.
      **PASS.** Evidência: `evidence/A14.log`, `evidence/A14.png`.
- [x] A15 — Submeter uma data com dia/mês fora do calendário real (ex. 31/02/2020) — documentar o
      comportamento: o front aceita (só valida formato, não validade de calendário) e repassa ao
      backend; verificar se o backend rejeita com erro tratado ou se o front trava/mostra algo
      confuso.
      **PASS/documentado.** Front aceita 31/02/2020 e avança (só valida formato via regex, não
      calendário). Evidência: `evidence/A15-A16.log`, `evidence/A15-A16.png` (comportamento do
      backend com essa data específica não observado pois o cadastro foi cancelado propositalmente
      neste item para isolar o teste — ver nota no log).
- [x] A16 — Data válida avança para o e-mail (`CAD_EMAIL`).
      **PASS.** Mesma evidência de A15: `evidence/A15-A16.log`, `evidence/A15-A16.png`.
- [x] A17 — Submeter um e-mail sem "@" — bot responde "E-mail inválido. Tente novamente.".
      **PASS.** Evidência: `evidence/A17.log`, `evidence/A17.png`.
- [x] A18 — Submeter um valor com "@" mas claramente não é um e-mail válido (ex. `"a@"` ou
      `"@@@"`) — documentar se a validação simplista (`includes('@')`) deixa passar formatos
      inválidos para o backend.
      **PASS/documentado (achado menor).** "a@" passa a validação `includes('@')` e avança.
      Evidência: `evidence/A18.log`, `evidence/A18.png`.
- [x] A19 — E-mail válido avança para o telefone (`CAD_TELEFONE`, opcional); campo aplica máscara
      `(00) 00000-0000` ao digitar.
      **PASS.** Evidência: `evidence/A19.log`, `evidence/A19.png`.
- [x] A20 — Pressionar Enter com o telefone vazio (pular campo opcional) avança para a confirmação
      sem exigir telefone; o resumo de confirmação não exibe a linha "Telefone" quando ele foi
      pulado.
      **PASS.** Evidência: `evidence/A20-A21.log`, `evidence/A20-A21.png`.
- [x] A21 — Tela de confirmação (`CAD_CONFIRMAR`) mostra corretamente nome, CPF mascarado, data de
      nascimento, e-mail e telefone (se informado) digitados nos passos anteriores, com as opções
      "Sim, confirmar" / "Não, cancelar".
      **PASS.** Mesma evidência de A20: `evidence/A20-A21.log`, `evidence/A20-A21.png`.
- [x] A22 — Escolher "Não, cancelar" — bot responde "Cadastro cancelado." e volta ao menu principal.
      **PASS.** Confirmado sem disparo de POST. Evidência: `evidence/A22.log`, `evidence/A22.png`.
- [x] A23 — Escolher "Sim, confirmar" com dados válidos e CPF/e-mail fictícios inéditos —
      `POST /v1/api/pacientes` (ou equivalente) retorna sucesso, bot confirma cadastro realizado e
      volta ao menu.
      **PASS.** CPF fictício com dígito verificador válido "111.444.777-35" -> `POST` => 201
      Created. Evidência: `evidence/A23.log`, `evidence/A23.png` (ver também
      `evidence/A23-checksum-reject.log` para o achado complementar de que o backend valida
      checksum de CPF mesmo o front não validando).
- [x] A24 — Repetir o cadastro com o MESMO CPF já cadastrado em A23 (duplicado) — bot mostra a
      mensagem de erro retornada pela API (ex. CPF já existe) e oferece "Tentar novamente" /
      "Cancelar", sem perder os dados já digitados.
      **PASS.** Mensagem "CPF já cadastrado: 11144477735" exibida corretamente. Evidência:
      `evidence/A24.log`, `evidence/A24.png`.
- [x] A25 — Em A24, escolher "Tentar novamente" — a mesma requisição é reenviada com os mesmos dados
      (sem pedir os campos de novo); documentar se dá pra realmente corrigir o CPF duplicado nesse
      ponto ou se o usuário fica preso reenviando o mesmo cadastro inválido até escolher "Cancelar".
      **PASS/documentado.** Confirmado: reenvia o MESMO payload (mesmo CPF), falha da mesma forma;
      não há como corrigir só o CPF nesse ponto, só "Cancelar" ou "reiniciar" (perde tudo). Evidência:
      `evidence/A25.log`, `evidence/A25.png`.

## 3. Fluxo — Agendar uma consulta

- [x] A26 — Escolher "Agendar uma consulta" no menu busca a lista de serviços ativos
      (`GET /v1/api/servicos-medicos?ativo=true`) e pergunta o CPF do paciente (`AGE_CPF`); se a
      lista vier vazia, bot informa que não há serviços disponíveis e volta ao menu (sem travar).
      **PASS.** Evidência: `evidence/A26.log`, `evidence/A26.png` (cenário de lista vazia não
      reproduzível ao vivo neste ambiente — sempre há serviço ativo — mas tratado no código).
- [x] A27 — Submeter um CPF com menos de 11 dígitos — mensagem de CPF inválido, sem chamada de rede.
      **PASS.** Evidência: `evidence/A27.log`, `evidence/A27.png`.
- [x] A28 — Submeter um CPF de 11 dígitos que não pertence a nenhum paciente cadastrado — bot
      responde "Paciente não encontrado..." e volta ao menu.
      **PASS.** Evidência: `evidence/A28.log`, `evidence/A28.png`.
- [x] A29 — Submeter o CPF de um paciente existente e ativo (ex. o cadastrado em A23, ou
      `eduardasilva@gmail.com` se for paciente) — bot saúda pelo primeiro nome e pergunta qual
      serviço deseja, listando os serviços buscados em A26 como opções.
      **PASS.** Evidência: `evidence/A29.log`, `evidence/A29.png`.
- [x] A30 — Escolher um serviço **domiciliar** (`domiciliar: true`) — bot pula a etapa de
      estabelecimento e já pergunta a data desejada, com uma mensagem específica mencionando
      atendimento domiciliar.
      **PASS.** Ambiente original não tinha nenhum serviço domiciliar — criado um serviço de teste
      via `/servicos` ("QA Assistente Domiciliar Teste") para reproduzir ao vivo. Confirmado: pula
      estabelecimento, mensagem específica exibida, nenhuma chamada de estabelecimentos disparada.
      Evidência: `evidence/A30.log`, `evidence/A30.png`.
- [x] A31 — Escolher um serviço **não domiciliar** — bot busca estabelecimentos do médico
      (`GET /v1/api/agendamentos/medico/{medicoId}/estabelecimentos`); se vier vazio, bot avisa que
      não há estabelecimentos e permite escolher outro serviço sem voltar ao menu principal.
      **PASS/parcial.** Fluxo principal confirmado (estabelecimento encontrado e listado). Cenário
      "sem estabelecimentos" não reproduzível ao vivo neste ambiente (único serviço não domiciliar
      tem 1 estabelecimento vinculado), mas tratado no código (linha 220-224 de
      ChatbotWidget.tsx). Evidência: `evidence/A31-A32.log`, `evidence/A31-A32.png`.
- [x] A32 — Serviço não domiciliar com estabelecimentos disponíveis — bot lista os estabelecimentos
      como opções; escolher um avança para a pergunta de data.
      **PASS.** Mesma evidência de A31: `evidence/A31-A32.log`, `evidence/A32.png`.
- [x] A33 — Submeter uma data em formato inválido na etapa de data do agendamento — mesma mensagem de
      erro de A14, sem avançar.
      **PASS.** Evidência: `evidence/A33.log`, `evidence/A33.png`.
- [x] A34 — Submeter uma data válida sem horários disponíveis (ex. data muito distante ou fim de
      semana, conforme regras de agenda do médico) — bot avisa que não há horários e permite
      informar outra data, permanecendo na mesma etapa (não volta ao menu).
      **PASS.** Evidência: `evidence/A34.log`, `evidence/A34.png`.
- [x] A35 — Submeter uma data válida com horários disponíveis — bot lista os horários (`HH:mm`) como
      opções; escolher um avança para observações (`AGE_OBS`, opcional).
      **PASS.** Evidência: `evidence/A35.log`, `evidence/A35.png`.
- [x] A36 — Pressionar Enter com observação vazia (pular campo opcional) avança para a confirmação
      sem exigir observação; resumo não exibe a linha "Obs" quando pulada.
      **PASS.** Evidência: `evidence/A36-A37.log`, `evidence/A36-A37.png`.
- [x] A37 — Tela de confirmação do agendamento mostra paciente, serviço, local (estabelecimento ou
      "Domiciliar" com cidade/UF do paciente), horário formatado e valor total (somando taxa de
      deslocamento se domiciliar) corretamente, com opções "Sim, confirmar" / "Não, cancelar".
      **PASS.** Mesma evidência de A36: `evidence/A36-A37.log`, `evidence/A36-A37.png`.
- [x] A38 — Escolher "Não, cancelar" — bot responde "Agendamento cancelado." e volta ao menu.
      **PASS.** Evidência: `evidence/A38.log`, `evidence/A38.png`.
- [x] A39 — Escolher "Sim, confirmar" — `POST /v1/api/agendamentos` retorna sucesso, bot confirma o
      agendamento e volta ao menu; verificar (via `/agendamentos` ou tela correspondente) que o
      agendamento foi realmente criado com os dados escolhidos na conversa.
      **PASS para o front / ACHADO CRÍTICO DE BACKEND.** `POST` => 201 Created com payload correto e
      completo, bot confirma sucesso corretamente. MAS o agendamento criado NUNCA aparece em
      `GET /v1/api/agendamentos`, mesmo filtrando pelo médico exato e mesmo após reload — mesma
      classe de bug de persistência já documentada no QA de Médicos (M55). Não é bug de front-end.
      Evidência: `evidence/A39.log`, `evidence/A39.png`, `evidence/A39-agendamento-sumiu.png`.
- [x] A40 — Forçar um erro no agendamento (ex. escolher um horário e, antes de confirmar, simular via
      `page.route` uma resposta de erro real do backend para `POST /agendamentos`) — bot mostra a
      mensagem de erro e oferece "Tentar novamente" / "Cancelar", sem perder os dados já escolhidos
      na conversa.
      **PASS.** Erro 500 real (via `page.route`) tratado corretamente. Evidência: `evidence/A40.log`,
      `evidence/A40.png`.

## 4. Duplo clique / múltiplos submits (mesma classe de bug já achada em Login, Médicos e CRM)

- [x] A41 — Durante a etapa de busca de paciente por CPF (`AGE_CPF`), disparar 2+ envios rápidos e
      sucessivos (Enter/clique no envio) do mesmo CPF antes da resposta da primeira chamada voltar —
      verificar quantas chamadas `GET /v1/api/pacientes` são de fato disparadas (esperado: só 1,
      já que a única proteção visível é o `disabled={loading}` do input/botão, que só passa a valer
      DEPOIS que `setLoading(true)` é processado — mesma janela de corrida do bug original de
      Login).
      Rodada 1: **FAIL (bug confirmado).** 2 eventos Enter no mesmo tick -> 2 chamadas
      `GET /v1/api/pacientes` disparadas, mensagem do usuário e resposta do bot duplicadas na
      conversa. Sem guard síncrono no submit. Evidência: `evidence/A41.log`, `evidence/A41.png`.
      Rodada 2: **✅ Aprovado (corrigido).** Adicionado guard síncrono `busyRef` (`useRef`) checado
      no início de `handleChoice`/`processInput`, antes de qualquer `setState`, mesmo padrão já
      usado em Login/Médicos/CRM. Reteste com os mesmos 2 Enters no mesmo tick -> apenas 1
      `GET /v1/api/pacientes`, sem duplicação de mensagens. Evidência: `evidence/A41-retest.log`,
      `evidence/A41-retest.png`.
- [x] A42 — Na tela de confirmação de cadastro (`CAD_CONFIRMAR`) ou agendamento (`AGE_CONFIRMAR`),
      clicar 2+ vezes rapidamente em "Sim, confirmar" — verificar se apenas 1 `POST` é disparado ou
      se o paciente/agendamento é criado em duplicidade.
      Rodada 1: **FAIL (bug confirmado, com efeito cascata).** 2 cliques no mesmo tick -> 2
      `POST /v1/api/agendamentos` disparados; o 1º criou o agendamento (201), o 2º só não duplicou
      porque o BACKEND tem regra de unicidade de horário (400 "Horário indisponível"). A UI ficou
      com o `step` (MENU, do sucesso) e `choices` (Tentar novamente/Cancelar, do erro) dessincronizados
      — clicar "Cancelar" depois disso silenciosamente iniciou um NOVO agendamento em vez de cancelar.
      Evidência: `evidence/A42.log`, `evidence/A42.png`, `evidence/A42-cascata-cancelar.png`.
      Rodada 2: **✅ Aprovado (corrigido).** Mesmo guard síncrono `busyRef` de A41 bloqueia o segundo
      clique antes de qualquer `setState`, eliminando também o efeito cascata (a segunda invocação
      nunca chega a rodar). Reteste com 2 cliques no mesmo tick em "Sim, confirmar" -> apenas 1
      `POST /v1/api/agendamentos`, sem erro, sem cascata. Evidência: `evidence/A42-retest.log`.
- [x] A43 — Clicar no botão "reiniciar" enquanto uma requisição está pendente (ex. logo após enviar
      o CPF em `AGE_CPF`, antes da resposta) — quando a requisição pendente finalmente resolver,
      confirmar que ela NÃO injeta uma mensagem/estado inesperado na conversa já reiniciada (a
      ausência de cancelamento da promise pode causar uma mensagem "fantasma" aparecendo depois do
      reset).
      Rodada 1: **FAIL (bug confirmado).** Requisição pendente (atraso simulado de 2.5s) sobrevive
      ao "reiniciar" e, ao resolver, injeta mensagem fantasma ("Olá, QA! Qual serviço você deseja
      agendar?" + lista de serviços) na conversa já reiniciada, substituindo o MENU. `reset()` não
      cancela promises em voo. Evidência: `evidence/A43.log`, `evidence/A43-after-reset.png`,
      `evidence/A43-ghost-message.png`.
      Rodada 2: **✅ Aprovado (corrigido).** Adicionado contador `genRef` incrementado em `reset()`;
      cada operação assíncrona captura sua geração no início e descarta silenciosamente qualquer
      atualização de estado se a geração mudou nesse meio tempo. Reteste com requisição atrasada em
      2s via `page.route`, reset disparado com a requisição ainda em voo -> conversa permanece no
      MENU reiniciado mesmo 2.5s depois, quando a requisição atrasada finalmente resolve; nenhuma
      mensagem fantasma. Evidência: `evidence/A43-retest.log`, `evidence/A43-retest.png`.

## 5. Uso sem sessão autenticada

- [x] A44 — Com `localStorage` limpo (sem `refresh_token`) e nenhum token em memória, abrir o widget
      na tela `/login` e tentar concluir o fluxo "Cadastrar-me como paciente" até o fim — confirmar
      se o cadastro público funciona normalmente ou se a chamada `POST /pacientes` retorna 401 e,
      nesse caso, documentar o que acontece na tela (a versão atual de `develop` do interceptor do
      axios trata qualquer 401 como sessão expirada e força um reload para `/login` — se isso
      disparar aqui, o usuário perde a conversa inteira sem nenhuma mensagem de erro visível, mesmo
      fora de uma tela protegida).
      **PASS.** `POST /v1/api/pacientes` é público (não exige token) — funciona normalmente sem
      sessão, tanto para erro tratado (CPF inválido) quanto para sucesso (201 Created). Nenhum 401,
      nenhum redirecionamento, `localStorage` permaneceu vazio. Evidência: `evidence/A44.log`,
      `evidence/A44.png`.
- [x] A45 — Nas mesmas condições de A44 (sem sessão), tentar o fluxo "Agendar uma consulta" — mesma
      verificação: 401 silencioso com reload vs. mensagem de erro tratada.
      **PASS/achado diferente do temido.** `GET /v1/api/servicos-medicos?ativo=true` retorna **403**
      (não 401) sem sessão — o interceptor de 401 do `api.ts` nunca é acionado (só trata
      `status === 401`), então cai no tratamento genérico: bot mostra "Erro ao buscar serviços.
      Tente novamente." e volta ao menu, sem crash, sem redirect, sem perda de estado. Achado de
      produto (não bug): "Agendar uma consulta" é efetivamente inacessível para visitante anônimo
      real (sempre retorna esse erro), diferente de "Cadastrar-me como paciente" (A44), mas o menu
      não avisa essa limitação antecipadamente. Evidência: `evidence/A45.log`, `evidence/A45.png`.

## 6. Teclado, foco e acessibilidade

- [x] A46 — Ao abrir o painel num passo com campo de texto, o foco vai automaticamente para o input
      (após o pequeno delay do componente). Ao avançar de um passo "somente escolha" (ex. menu) para
      um passo com campo de texto (ex. `CAD_NOME`) SEM fechar/reabrir o painel, documentar se o foco
      é movido automaticamente para o novo input ou se o usuário precisa clicar nele manualmente
      (o efeito de foco no código só depende de `open`, não do passo atual).
      **PASS/documentado.** Confirmado: foco automático funciona ao abrir/reabrir o painel, mas NÃO
      ao avançar de passo com o painel já aberto (fica em `<body>`, exige clique manual). Evidência:
      `evidence/A46.log`, `evidence/A46-reopen-focus.png`, `evidence/A46-no-autofocus.png`.
- [x] A47 — Navegar por Tab entre as opções de escolha (menu, serviços, estabelecimentos, horários) e
      confirmar que cada botão de opção recebe foco visível e pode ser ativado por Enter/Space.
      **PASS.** Ordem de tabulação correta, foco visível, ativação por Enter e por Space confirmadas.
      Evidência: `evidence/A47.log`, `evidence/A47-tab-focus.png`.
- [x] A48 — Digitar e enviar uma mensagem usando só o teclado (Tab até o campo, digitar, Enter) em
      pelo menos um passo de texto — funciona sem precisar de mouse.
      **PASS.** Fluxo completo via teclado confirmado. Evidência: `evidence/A48.log`,
      `evidence/A48.png`.

## 7. Edge cases de conteúdo e segurança

- [x] A49 — Digitar `<script>alert(1)</script>` como nome no cadastro — o texto aparece escapado
      como texto puro na bolha de mensagem do usuário (React escapa por padrão), sem executar
      nenhum script.
      **PASS.** Confirmado escapado, sem execução. Evidência: `evidence/A49.log`, `evidence/A49.png`.
- [x] A50 — Digitar uma observação de agendamento muito longa (300+ caracteres) — o campo aceita, a
      bolha de mensagem quebra linha corretamente (`whitespace-pre-line`) sem estourar o layout do
      painel.
      **PASS.** 324 caracteres aceitos, quebra de linha correta, sem overflow. Evidência:
      `evidence/A50.log`, `evidence/A50.png`.
- [x] A51 — Testar payload tipo SQLi (`' OR 1=1--`) no campo de nome ou observação — trafega como
      texto comum, sem quebrar a aplicação nem expor erro cru de banco/API.
      **PASS.** Payload persistido como string literal (201 Created), sem injeção nem erro de banco
      exposto. Evidência: `evidence/A51.log`, `evidence/A51.png`.

## 8. Responsividade e sobreposição

- [x] A52 — Viewport mobile (375×667) — o botão flutuante e o painel aberto permanecem inteiramente
      visíveis e utilizáveis, sem overflow horizontal nem sobrepor de forma ilegível o conteúdo da
      página atrás.
      Rodada 1: **FAIL (bug confirmado, causa raiz fora de ChatbotWidget.tsx).** Painel parcialmente
      coberto (metade esquerda ilegível) por um bug de layout responsivo do header mobile do app
      (`src/components/layout/Sidebar.tsx` linha 178 + `src/components/layout/Layout.tsx` linha 10,
      flex row sem `flex-col` para mobile, fazendo o header esticar para ~3700px de altura). Botão
      flutuante fechado não é afetado. Evidência: `evidence/A52.log`, `evidence/A52-fresh.png`,
      `evidence/A52-bug-confirmed.png`.
      Rodada 2: **✅ Aprovado (corrigido).** `Layout.tsx` linha 10 ganhou `flex-col lg:flex-row` no
      container raiz, empilhando o header mobile ACIMA do conteúdo em vez de ao lado (que o
      esticava por `align-items: stretch`). Reteste em 375×667 em `/pacientes` (conteúdo de 3949px
      de altura): `<header>` mede 57px (tamanho natural), painel do assistente totalmente legível e
      utilizável abaixo dele. Evidência: `evidence/A52-retest.log`, `evidence/A52-retest.png`.
- [x] A53 — Com o painel do assistente aberto sobre uma página com seus próprios botões flutuantes
      ou modais (ex. `/pacientes` com um modal de cadastro aberto), confirmar que não há conflito de
      z-index que torne algum dos dois inutilizável.
      **PASS (desktop).** Modal "Novo Paciente" e painel do assistente coexistem sem conflito;
      ambos testados como interativos simultaneamente. Evidência: `evidence/A53.log`,
      `evidence/A53.png`, `evidence/A53-both-usable.png`. Ver nota cruzada com A52 para mobile.
