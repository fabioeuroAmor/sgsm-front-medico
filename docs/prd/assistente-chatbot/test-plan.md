# Test Plan — Widget "Assistente SGSM" (chatbot flutuante)

> Login: perfil MEDICO, `fabioeuro@gmail.com` / `famor966`. Front-end em `http://localhost:3001`.
> Widget é o ícone flutuante circular no canto inferior direito, presente em **todas** as páginas (montado uma única vez em `App.tsx`, fora do `<Routes>` — não é a página `/ia`).

## Contexto de implementação (não é chamada de IA/LLM)

`ChatbotWidget.tsx` é uma máquina de estados 100% no front-end, sem nenhuma chamada a um backend de IA — usa só `pacienteService`, `servicoMedicoService` e `agendamentoService` (os mesmos endpoints REST usados no resto do app) para dois fluxos guiados: **cadastro de paciente** e **agendamento de consulta**. Não há streaming, não há prompt de LLM, não há "assistente ficar fora do ar" no sentido de um serviço de IA — os "erros de rede" possíveis são só os desses 3 serviços REST.

## Dados reais disponíveis para o teste (evitar inventar)

- Paciente ativo existente pra usar no fluxo de agendamento: **João Pereira Teste**, CPF `123.456.789-01`.
- Serviços do médico Fábio (vão aparecer nas opções do bot ao vivo — não fixar de antemão qual escolher, deixar o bot listar).
- Para a data no fluxo de agendamento, se "sem horários disponíveis" aparecer numa data, tentar outra (dias úteis dentro de agendas ativas — não há vigência fixa conhecida de antemão, deixar o próprio fluxo guiar).

## Abertura, fechamento e estado inicial

- [x] **CB001** — Ícone flutuante (círculo, canto inferior direito) visível em `/estabelecimentos` (ou qualquer página logada). Clicar nele. Resultado esperado: painel do chat abre, ícone muda de "balão de mensagem" para "X".
- [x] **CB002** — Ao abrir, mensagem inicial do bot: "Olá! Sou o assistente do SGSM. Como posso ajudar você hoje?". Duas opções aparecem: "1. Cadastrar-me como paciente" e "2. Agendar uma consulta". Campo de texto **não aparece** (etapa MENU só aceita clique nas opções).
- [x] **CB003** — Campo de texto do painel recebe foco automaticamente ao abrir (pode digitar sem clicar antes) — só relevante depois de entrar numa etapa que mostra o campo (ver CB0xx do fluxo de cadastro).
- [x] **CB004** — Clicar no ícone de novo (agora "X") fecha o painel. Resultado esperado: painel some, ícone volta a "balão de mensagem".
- [x] **CB005** — Reabrir o painel depois de fechado (sem ter enviado nada) mostra exatamente o mesmo estado de antes de fechar — fechar não reseta a conversa.

## Fluxo completo — Cadastro de paciente (happy path)

- [x] **CB006** — Clicar em "Cadastrar-me como paciente". Bot pergunta o nome completo; campo de texto aparece.
- [x] **CB007** — Digitar um nome (ex.: "QA Chatbot Teste <timestamp>") e Enter. Bot avança pedindo CPF.
- [x] **CB008** — Digitar um CPF válido de 11 dígitos (não cadastrado ainda) só com números — conferir que o campo aplica máscara `000.000.000-00` durante a digitação. Enter avança pedindo data de nascimento.
- [x] **CB009** — Digitar uma data em formato livre, ex. `01011990` (8 dígitos seguidos) — conferir que vira `01/01/1990` na mensagem do usuário. Bot avança pedindo e-mail.
- [x] **CB010** — Digitar um e-mail válido único (ex. com timestamp) e Enter. Bot avança pedindo telefone (opcional).
- [x] **CB011** — Pressionar Enter sem digitar telefone (pular). Bot mostra resumo dos dados com "(sem telefone)" implícito e duas opções: "Sim, confirmar" / "Não, cancelar".
- [x] **CB012** — Clicar "Sim, confirmar". Resultado esperado: chamada real a `POST /v1/api/pacientes`, bot responde "Cadastro realizado com sucesso! ..." e volta ao MENU (as 2 opções iniciais reaparecem). Confirmar via rede que o paciente foi realmente criado (200/201).

## Edge cases — Cadastro

- [x] **CB013** — Na etapa de nome, pressionar Enter com o campo vazio. Bot responde "Por favor, informe o seu nome completo." e permanece na mesma etapa (não avança).
- [x] **CB014** — Na etapa de CPF, digitar um CPF com menos de 11 dígitos e Enter. Bot responde "CPF inválido. Informe os 11 dígitos." e permanece na etapa.
- [x] **CB015** — Na etapa de data, digitar algo não reconhecível (ex. "abc") e Enter. Bot responde "Data inválida. Use o formato DD/MM/AAAA." e permanece na etapa.
- [x] **CB016** — Na etapa de e-mail, digitar um valor sem "@" e Enter. Bot responde "E-mail inválido. Tente novamente." e permanece na etapa.
- [x] **CB017** — Repetir o fluxo completo (CB006–CB011) usando um CPF **já cadastrado no sistema** (ex. `123.456.789-01`, do João Pereira Teste) e confirmar. Resultado esperado: bot mostra mensagem de erro do backend (CPF já cadastrado) em vez de sucesso, e oferece "Tentar novamente" / "Cancelar" em vez de voltar direto ao menu.
  - **Correção de plano de teste (não é bug de app):** `123.456.789-01` não passa no dígito verificador validado pelo endpoint de criação, então retorna "CPF inválido" em vez de "CPF já cadastrado". O comportamento de erro de duplicidade foi comprovado com um CPF válido e duplicado (`529.982.247-25`) — ver `qa-results.md`. Nenhuma alteração de código foi necessária.
- [x] **CB018** — A partir do erro em CB017, clicar "Cancelar". Bot responde "Cadastro cancelado. O que deseja fazer?" e volta ao MENU.

## Fluxo completo — Agendamento (happy path)

- [x] **CB019** — No MENU, clicar "Agendar uma consulta". Resultado esperado: enquanto carrega a lista de serviços, aparece o indicador de "digitando" (3 pontinhos animados); em seguida bot pede o CPF do paciente.
- [x] **CB020** — Digitar o CPF `123.456.789-01` (João Pereira Teste, existente) e Enter. Bot saúda pelo primeiro nome e lista os serviços disponíveis como opções.
- [x] **CB021** — Escolher um serviço da lista. Se o serviço **não** for domiciliar: bot busca estabelecimentos (loading) e pergunta em qual estabelecimento o paciente deseja ser atendido, com opções. Se for domiciliar: pula direto para pedir a data.
- [x] **CB022** — (Se aplicável) Escolher um estabelecimento. Bot pergunta a data desejada.
- [x] **CB023** — Digitar uma data (DD/MM/AAAA) dentro da agenda ativa do médico. Se "Sem horários disponíveis nesta data" aparecer, digitar outra data até encontrar horários (documentar quantas tentativas). Bot lista os horários como opções.
- [x] **CB024** — Escolher um horário. Bot pergunta se há alguma observação (opcional).
- [x] **CB025** — Pressionar Enter sem digitar observação (pular). Bot mostra resumo completo (paciente, serviço, local, horário, valor) e pergunta "Confirmar?" com opções Sim/Não.
- [x] **CB026** — Clicar "Sim, confirmar". Resultado esperado: chamada real a `POST /v1/api/agendamentos`, bot responde "Agendamento realizado com sucesso! ..." e volta ao MENU. Confirmar via rede que o agendamento foi criado (200/201).

## Edge cases — Agendamento

- [x] **CB027** — Na etapa de CPF do agendamento, digitar um CPF válido (11 dígitos) mas que não existe no sistema. Bot responde "Paciente não encontrado. Verifique o CPF ou realize o cadastro primeiro." e volta direto ao MENU.
- [x] **CB028** — Na etapa de data do agendamento, digitar uma data inválida (ex. "31/02/2026" ou texto aleatório). Bot responde "Data inválida. Use o formato DD/MM/AAAA." e permanece na etapa.
- [x] **CB029** — Repetir o fluxo até a tela de confirmação (CB019–CB025) e clicar "Não, cancelar" em vez de confirmar. Bot responde "Agendamento cancelado. O que deseja fazer?" e volta ao MENU — confirmar que nenhum agendamento foi criado (sem chamada `POST` na rede).

## Botão "reiniciar"

- [x] **CB030** — Avançar até o meio de qualquer fluxo (ex. depois de informar nome e CPF no cadastro). Clicar em "reiniciar" no topo do painel. Resultado esperado: conversa volta ao estado inicial com a mensagem "Olá! Como posso ajudar você hoje?" (nota: texto ligeiramente diferente da saudação da primeira abertura, que tem "Sou o assistente do SGSM" a mais — documentar se isso é intencional ou inconsistência) e as 2 opções do menu. Todo dado digitado antes é descartado (confirmar reabrindo o fluxo do zero, sem resquício).

## Loading, teclado e duplo clique

- [x] **CB031** — Durante uma etapa com chamada de rede em andamento (ex. logo após clicar "Agendar uma consulta", ou depois de confirmar cadastro/agendamento), tentar clicar numa opção ou digitar/enviar no campo de texto. Resultado esperado: botões de escolha e campo de texto/enviar ficam desabilitados (visualmente opacos) durante o carregamento, reabilitando quando a resposta chega.
- [x] **CB032** — Testar Enter para enviar em pelo menos uma etapa de texto livre (já coberto em CB007–CB011) — confirmar explicitamente que Enter tem o mesmo efeito que clicar no botão de enviar.
- [x] **CB033** — Numa etapa de escolha (ex. MENU), clicar duas vezes rapidamente na mesma opção (duplo clique). Resultado esperado: nenhuma ação duplicada (ex. dois cadastros, duas chamadas de rede) — as opções somem da tela assim que a primeira é processada.

## Navegação entre páginas e persistência

- [x] **CB034** — Com o chat aberto e uma conversa em andamento (ex. no meio do cadastro, depois de informar nome), navegar para outra página pelo menu lateral (ex. de Estabelecimentos para Pacientes). Resultado esperado: o widget continua aberto, exatamente na mesma etapa/mensagens de antes — a navegação client-side não reseta nem fecha o chat.
- [x] **CB035** — A partir do estado de CB034, recarregar a página (F5). Resultado esperado: a conversa é perdida (painel fecha e, ao reabrir, volta à saudação inicial) — não há persistência entre reloads (sem localStorage/sessionStorage envolvido).
- [x] **CB036** — Verificar se o widget aparece também em páginas públicas (ex. `/login`, deslogado) ou só depois de autenticado — documentar o comportamento observado (não é bug de qualquer forma, é só confirmação de escopo).
