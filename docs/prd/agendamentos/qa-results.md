# QA Results — Tela de Agendamentos (`/agendamentos`)

Execução ao vivo via Playwright MCP contra o app real em `http://localhost:3001`, backends reais `sgsm` (`:8080`) e `sgsm-auth` (`:8081`), sem mocks. Login de teste principal: `fabioeuro@gmail.com` / `famor966` (perfil `MEDICO`, médico "Fabio Monteiro Amorim", vinculado ao estabelecimento "Clinica São Lucas").

Evidências em `docs/prd/agendamentos/evidence/<id(s)>.png`. Quando um único print cobre mais de um item do plano, o nome do arquivo combina os IDs (ex.: `AG001-AG002-listagem-inicial.png`). Vários achados foram confirmados via requisições de rede (payload/resposta) inspecionadas ao vivo via `browser_network_request`, citadas inline abaixo mesmo quando não há print associado (o print não acrescentaria informação além do já citado no corpo da requisição).

Este QA rodou em um git worktree isolado (`C:\AmbienteDev\sgsm-front-medico-agendamentos`, branch `qa/agendamentos`) para não conflitar com outro QA (`funcionários`) rodando em paralelo no checkout principal — mas ambos compartilham a mesma aplicação (`localhost:3001`) e os mesmos backends reais.

## Rodada 2 — reteste pós-correções (2026-08-20)

Após a rodada 1 (69 aprovados / 6 reprovados-bug-confirmado / 1 parcial / 5 bloqueados), os 6 bugs
reais confirmados foram corrigidos (fora deste QA) e cada um foi re-executado ao vivo, com prova
crua fresca (screenshot + rede/console reais, sufixo `-retest` nos arquivos de evidência),
diretamente contra o backend real `sgsm` `:8080` (já reiniciado com as correções de
`AgendamentoService`) e `sgsm-auth` `:8081`, sem mocks.

**Achado de ambiente relevante (não é um bug de produto, mas quase invalidou o reteste):** o dev
server de front-end que estava respondendo em `http://localhost:3001` é o processo Vite do checkout
principal `C:\AmbienteDev\sgsm-front-medico`, que está na branch `qa/funcionarios` — **sem** o
commit `ab1ca6b` ("fix(agendamentos): corrige 3 bugs achados em QA funcional") que contém as 3
correções de front-end (AG003, AG023, AG035). Esse commit só existe no worktree
`C:\AmbienteDev\sgsm-front-medico-agendamentos` (branch `qa/agendamentos`). Como são diretórios
diferentes em disco, o HMR do Vite nunca veria essas mudanças — testar contra `:3001` teria
reproduzido os 3 bugs de front-end como se não tivessem sido corrigidos (confirmado: a primeira
tentativa de reteste do AG023 contra `:3001`, inclusive após hard-reload, ainda mostrava o bug
antigo). Para destravar o reteste sem editar nenhum código de produção, foi iniciado um segundo
`vite dev` a partir do worktree correto, na porta `:3010` (`npm run dev -- --port 3010
--strictPort`), e o reteste dos 6 itens foi feito contra `http://localhost:3010`, com login real
(`fabioeuro@gmail.com`/`famor966`) e mesmos backends reais `:8080`/`:8081`. Os 3 bugs de backend
(AG014, AG039, AG050) não dependem do front-end e teriam sido testáveis em qualquer uma das duas
portas, já que atacam a API diretamente.

- **AG023** (busca por nome no Passo 1 do wizard não filtrava) — confirmado corrigido: digitar
  "zzznomeinexistente" agora mostra "Nenhum paciente encontrado" em vez da lista completa de 21
  pacientes. Código: `pacientesFiltrados` agora só considera o CPF quando a busca tem dígitos
  (`qDigits.length > 0 && ...`). `evidence/AG023-retest.png`, `evidence/AG023-retest.log`.
- **AG003** (Telemedicina mostrava endereço físico com link de mapa) — confirmado corrigido: um
  agendamento real pré-existente com `tipo:"TELEMEDICINA"` (Zilma Ruela, Cancelado, 26/08/2026
  11:00) agora exibe o rótulo "Telemedicina" em vez do link "Clinica São Lucas" que aparecia no
  build antigo (`:3001`) para o mesmo registro. `evidence/AG003-retest.png`,
  `evidence/AG003-retest.log`.
- **AG035** (`min` do date input calculado em UTC) — confirmado corrigido: `hojeLocal()` agora usa
  só getters de componentes locais do `Date` (`getFullYear`/`getMonth`/`getDate`), nunca
  `toISOString()`/UTC. Verificado ao vivo (`min="2026-08-20"`, batendo com a data local real no
  momento do teste) e por leitura de código — a correção é estrutural e vale para qualquer horário
  do dia, incluindo a janela de risco original (21h-23:59) que não pôde ser reproduzida ao vivo
  neste reteste porque a sessão rodou de madrugada (~01h, fora da janela). `evidence/AG035-retest.png`,
  `evidence/AG035-retest.log`.
- **AG014** (filtro de paciente na listagem ignorado para usuário MEDICO) — confirmado corrigido:
  filtrar por "Zilma Ruela" agora retorna só os 2 agendamentos dela (`pacienteId` confirmado nos 2
  itens da resposta de `GET /v1/api/agendamentos?pacienteId=...`), sem misturar agendamentos de
  outros pacientes do mesmo médico. `evidence/AG014-retest.png`, `evidence/AG014-retest.log`.
- **AG039** (slots do passado exibidos para o dia de hoje) — confirmado corrigido: foi necessário
  cadastrar uma agenda de teste adicional (Quinta-feira 00:00–07:00, `Clinica São Lucas`, vigência
  desde hoje) via `/medicos` → Gerenciar Agenda, já que a hora real de execução (~01h) não
  coincidia com nenhuma agenda pré-existente que tivesse slots já passados. Com o horário real
  01:17 e essa agenda, `GET /agendamentos/slots?...&data=2026-08-20` retornou só os slots a partir
  de `01:30` (`01:30` a `06:30`), excluindo corretamente `00:00`, `00:30` e `01:00` (já no
  passado). `evidence/AG039-retest.png`, `evidence/AG039-retest.log`.
- **AG050** (double-booking) — confirmado corrigido: repetido o mesmo teste da rodada 1 (2
  `POST /v1/api/agendamentos` via `Promise.all`, mesmo médico/estabelecimento/horário exato
  `2026-08-27T12:00:00Z`, pacientes diferentes). Desta vez só 1 retornou `201 Created`; o outro
  retornou `400 Bad Request` com `"Horário indisponível: já existe agendamento para este médico
  neste período."`. Confirmado também na listagem: só 1 card aparece em `27/08/2026, 09:00`.
  `evidence/AG050-retest.png`, `evidence/AG050-retest.log`.

**Resultado da rodada 2: 6/6 bugs confirmados corrigidos.** Nenhum item precisou ser reprovado
novamente. A tabela de resultados abaixo (rodada 1) permanece inalterada para rastreabilidade;
os vereditos atualizados constam no `test-plan.md`.

## Pré-requisitos — setup necessário antes de testar

O ambiente **não** tinha os pré-requisitos completos no início do QA:

- Único médico ativo com serviço ativo: **Fabio Monteiro Amorim**, com 1 agenda cadastrada (Segunda-feira, `Clinica São Lucas`, vigência `2026-07-01` a `2026-07-31` — **já expirada** na data de execução) e 1 agendamento pré-existente (Tereza Rossi, Concluído).
- Cadastros feitos via as próprias telas do sistema (nunca via SQL direto), conforme instruído:
  - Agenda **Quarta-feira**, `Clinica São Lucas`, 08:00–18:00, 30 min, vigência desde `2026-08-01` (sem fim) — cobre o dia de execução (quarta-feira) e datas futuras, necessário para AG039 e para o fluxo normal do wizard.
  - Agenda **Quinta-feira**, Domiciliar, 08:00–18:00, 30 min, vigência desde `2026-08-20` — necessário para o fluxo Domiciliar (AG030, AG049).
  - Taxa de deslocamento de R$ 80,00 habilitada no serviço "Consulta de Rotina" (necessário para AG042).
  - **Achado incidental (não é bug):** o toggle "Atendimento domiciliar" (tanto em `/medicos` → Gerenciar agenda, quanto em `/servicos`) é um `<div>` customizado dentro de um `<label>`, sem `role="switch"`/`aria-*`. Cliques no meio do `<label>` (fora do próprio `<div>` do toggle) não disparam o `onClick`, porque o evento não borbulha a partir do alvo certo quando o clique cai sobre o texto ao lado. É preciso clicar precisamente no elemento do switch. Não bloqueou o QA (usei seletor CSS específico), mas é uma fragilidade de acessibilidade/UX que vale registrar.

## Achados críticos (resumo executivo)

1. **AG050 — Double-booking confirmado (bug real de concorrência, backend).** Dois `POST /v1/api/agendamentos` disparados em paralelo (`Promise.all`, mesmo token, mesmo médico/estabelecimento/horário `2026-08-26T16:00:00Z`, pacientes diferentes) retornaram **`201 Created` nos dois**, criando dois agendamentos (`02c491b4-...` e `d464d5b1-...`) sobrepostos no mesmo horário. Causa raiz: `AgendamentoService.cadastrar()` (`C:\AmbienteDev\sgsm\src\main\java\br\com\sgsm\service\AgendamentoService.java`, linhas 138–182) nunca chama `estaOcupado`/`temBloqueio` (usados só em `listarSlotsDisponiveis`, linhas 126–127) nem usa nenhum lock otimista/pessimista antes do `agendamentoRepository.save(agendamento)` (linha 179). A listagem de slots filtra ocupados corretamente, mas o cadastro em si não revalida no momento da escrita — uma janela de corrida real permite overbooking.

2. **AG039 — Slots do passado exibidos para o dia de hoje (bug real, backend).** Com o horário real da máquina em `23:44` (quarta-feira) e uma agenda `Quarta-feira 08:00–18:00` cadastrada, `GET /v1/api/agendamentos/slots?...&data=2026-08-19` (hoje) retornou os 20 slots do dia inteiros (`08:00` a `17:30`) como disponíveis — nenhum deles filtrado, mesmo estando 100% no passado. Causa raiz: `AgendamentoService.listarSlotsDisponiveis()` (mesmo arquivo, linhas 84–136) gera os slots a partir de `agenda.getHoraInicio()`/`getHoraFim()` e só filtra por bloqueio (`temBloqueio`) e ocupação (`estaOcupado`) — nunca compara `slotInicio` contra `OffsetDateTime.now(ZONA)` quando `data` é hoje. Permite agendar (e o `POST` de fato aceita, ver não há validação equivalente em `cadastrar()`) horários já passados no mesmo dia.

3. **AG023/AG024 — Busca de paciente no Passo 1 do wizard não filtra por nome (bug real, front-end).** Digitar qualquer texto sem dígitos (ex.: `"Zild"`, ou até `"zzzzznonexistente"`) na busca "Buscar por nome ou CPF…" do Passo 1 não filtra nada — a lista completa de 21 pacientes continua aparecendo. Causa raiz: `AgendamentosPage.tsx`, linhas 306–309:
   ```ts
   const pacientesFiltrados = todosOsPacientes.filter((p) => {
     const q = buscaPaciente.toLowerCase()
     return p.nome.toLowerCase().includes(q) || p.cpf.includes(q) || p.cpf.replace(/\D/g, '').includes(q.replace(/\D/g, ''))
   })
   ```
   Quando `q` não tem dígitos, `q.replace(/\D/g, '')` vira `""`, e `"qualquerCoisa".includes("")` é **sempre `true`** em JavaScript — então a condição do CPF sem dígitos sempre casa, e o `||` faz a busca por nome ser ignorada na prática. Isso é diferente do padrão usado corretamente no filtro de paciente da listagem principal (`sugestoesPaciente`, linhas 211–219), que guarda com `if (cpfQ.length >= 3 && ...)` antes de comparar — o Passo 1 do wizard não tem essa guarda. Busca por dígitos (CPF) funciona normalmente e degenera corretamente para "Nenhum paciente encontrado" quando não há correspondência (AG024 confirmado só nesse caminho).

4. **AG014 — Filtro de paciente na listagem principal não tem efeito quando logado como MEDICO (bug real, backend).** Selecionar um paciente no filtro da listagem gera a chip e a URL certos (`GET /v1/api/agendamentos?pacienteId=...`), mas a resposta retorna **todos** os agendamentos do médico, de todos os pacientes — o filtro é silenciosamente ignorado. Causa raiz: `AgendamentoService.listar()` (linhas 191–216):
   ```java
   if (contextoSeguranca.isMedico()) {
       medicoId = contextoSeguranca.getReferenciaId();
   } else if (contextoSeguranca.isPaciente()) {
       pacienteId = contextoSeguranca.getReferenciaId();
   }
   ...
   if (medicoId != null && status != null) { ... }
   else if (pacienteId != null && status != null) { ... }
   else if (medicoId != null) { resultado = agendamentoRepository.findAllByMedicoId(medicoId); }
   else if (pacienteId != null) { ... }
   ```
   Para um usuário MEDICO, `medicoId` é **sempre** forçado (não-nulo), então o primeiro `else if` que bate é sempre o de `medicoId`, e o `pacienteId` vindo da query string do front-end nunca é considerado. Isso faz o filtro "por paciente" da listagem ser funcionalmente morto para qualquer usuário logado como médico — só teria efeito para um perfil sem médico nem paciente associado (não existe esse perfil no sistema, pelo que foi observado).

5. **AG035 — `min` do seletor de data calculado em UTC (bug real, front-end, janela horária específica).** `AgendamentosPage.tsx` linha 612: `min={new Date().toISOString().slice(0, 10)}`. `toISOString()` converte para UTC; em `America/Sao_Paulo` (UTC-3), no horário em que o QA rodou (23:44 local), a data UTC já era o dia seguinte — o seletor nativo mostrou `min=2026-08-20` quando "hoje" local era `2026-08-19`. Isso é o oposto do que AG039 investiga (não permite agendar no passado; na verdade o `min` fica restritivo demais e bloqueia "hoje" via o seletor nativo, embora o valor ainda possa ser setado programaticamente/copiado e colado, e o backend aceite mesmo assim). Afeta usuários entre ~21h e meia-noite (janela de 3h) todos os dias.

6. **AG048 — Novo agendamento não aparece no topo da lista (achado menor, front-end).** `useAgendamentos.cadastrar()` insere o novo item no início do array local (`[novo, ...prev]`), mas `AgendamentosPage.confirmar()` chama `listar(...)` logo em seguida (linha 293), que sobrescreve esse estado otimista com a ordem "natural" retornada pelo backend (aparentemente por data de criação/ID, não necessariamente decrescente) — o item recém-criado nem sempre fica em primeiro. Confirmado visualmente: após cadastrar Zildinha Ruela via wizard, o card apareceu na 2ª posição, atrás do agendamento pré-existente de Tereza Rossi (mais antigo). `201`, fechamento do modal e status "Pendente" corretos — só a posição na lista diverge do enunciado ("aparece no topo").

7. **AG070/AG071 bloqueados por falta de credencial.** `eduardasilva@gmail.com` / `joaozinh7` (sugerida no plano) retornou `401 Unauthorized` real em `POST /v1/api/auth/login` — conforme instruído, nenhuma senha foi inventada. Não existe conta PACIENTE conhecida. AG069 (escopo do médico logado) foi confirmado de forma indireta e consistente ao longo de toda a sessão (a listagem sempre retornou só os agendamentos de Fabio Monteiro Amorim, mesmo sem filtro).

## Notas metodológicas

- **AG050/AG061/AG062/AG068/AG070**: testados via `fetch()` autenticado com o Bearer token real (extraído de uma requisição legítima recém-feita pela própria aplicação, via `browser_network_request`) disparado a partir do console da página já logada — **não é mock**, é uma chamada HTTP real contra o backend real com um token de sessão real, apenas orquestrada via JS em vez de clique de UI (necessário para AG050, que exige verdadeira concorrência de dois `POST`s no mesmo instante, impossível de garantir via dois cliques sequenciais de UI).
- **AG051**: o serviço "Consulta de Rotina" (único serviço ativo do médico) foi inativado via `DELETE /v1/api/servicos-medicos/{id}` (mesma ação que o botão "Inativar" da tela `/servicos` dispara) para reproduzir "serviço inativado entre seleção e confirmação". Não existe endpoint de reativação (`ServicoMedicoController` só tem `POST`/`PUT`/`DELETE`/`GET`) — o serviço original ficou permanentemente inativo. Para não deixar o ambiente compartilhado sem nenhum serviço ativo para o médico, um novo serviço "Consulta de Rotina" (mesmos atributos: R$ 1.000, 30 min, domiciliar + R$ 80 de taxa) foi recriado via a tela `/servicos` ao final do teste.
- **AG072**: simulado corrompendo `refresh_token` no `localStorage` e recarregando a página (em vez de esperar os ~15 min de expiração real do access token em uso). Isso exercita exatamente o mesmo caminho de código (`AuthProvider` → `refreshAccessToken()` falha → limpa tokens) que um 401 em uma chamada autenticada dispararia, com o mesmo resultado observável (redirecionamento para `/login`, sem tela em branco).
- **AG073**: não reproduzido como "rede lenta" real (nenhum throttling disponível sem mock/proxy). Porém, durante a sessão, o access token expirou organicamente enquanto uma chamada de slots estava em voo, gerando um `403` real não-provocado. O loading não travou (resolveu para `loadingSlots=false`), mas o resultado mostrado foi "Sem horários disponíveis nesta data" — indistinguível de um dia realmente sem agenda. Causa: `AgendamentosPage.tsx`, `.catch(() => setSlots([]))` no `useEffect` de slots (e comportamento análogo no de estabelecimentos) não diferencia "sem dados" de "erro real". Não trava a UI (positivo), mas mascara erros reais como resultado vazio válido (achado menor de UX, não um travamento).
- Vários agendamentos de teste foram criados com prefixo/observação "QA" quando aplicável; os registros ficaram no ambiente compartilhado (`Zildinha Ruela`, `Zilma Ruela`, `Tereza Rossi` como pacientes de teste, todos pré-existentes no banco antes deste QA).

---

## Tabela de resultados

| ID | Veredito | Evidência | Resumo |
|----|----------|-----------|--------|
| AG001 | ✅ Aprovado | `AG001-AG002-listagem-inicial.png` | Grade carrega após `GET /v1/api/agendamentos` (200 OK). |
| AG002 | ✅ Aprovado | `AG001-AG002-listagem-inicial.png` | Card mostra paciente, serviço, badge de status, médico, local com link de Maps, data/hora formatada (`27/07/2026, 08:30`). |
| AG003 | 🐛 Reprovado (bug) | `AG003-BUG-telemedicina-mostra-endereco-fisico.png` | Agendamento `TELEMEDICINA` (confirmado via resposta da API, `tipo:"TELEMEDICINA"`) exibe o mesmo link de Maps + endereço físico do estabelecimento que um Presencial — nenhuma distinção visual. Causa raiz: `AgendamentosPage.tsx`, bloco `a.tipo === 'DOMICILIAR' ? (...) : a.estabelecimentoEndereco ? <a href={maps}>...` só trata `DOMICILIAR` como caso especial; `TELEMEDICINA` cai no mesmo ramo de `PRESENCIAL`. |
| AG004 | ✅ Aprovado | (snapshot ao vivo, sem print isolado) | Após `PATCH .../status` com `A_CAMINHO` e `localizacaoMedico`, o card passou a exibir o link "Acompanhar médico" apontando para a URL informada. |
| AG005 | ✅ Aprovado | `AG005-empty-state.png` | Filtro "Em Andamento" sem nenhum resultado mostra `EmptyState` com "Nenhum agendamento encontrado" + descrição. |
| AG006 | 🚫 Bloqueado | — | Sem método permitido para forçar erro de rede/API real na listagem sem mock/derrubar backend compartilhado. Verificado só por leitura de código. |
| AG007 | ✅ Aprovado | (rede) | Digitar "Fabio" mostrou sugestão "Fabio Monteiro Amorim / CRM 1234/DF · Neurologia". |
| AG008 | ✅ Aprovado | (rede) | Digitar "1234" (CRM) mostrou a mesma sugestão do médico. |
| AG009 | ✅ Aprovado | (rede: `GET .../agendamentos?medicoId=ff9a2400-...`) | Selecionar a sugestão disparou a query certa e mostrou chip "Dr(a). Fabio Monteiro Amorim" com botão X. |
| AG010 | ✅ Aprovado | (rede: `GET .../agendamentos` sem params) | Clicar no X da chip do médico voltou a listar todos, sem `medicoId` na query. |
| AG011 | ✅ Aprovado | (snapshot) | Com médico selecionado, campo de busca de paciente ficou `disabled`. |
| AG012 | ✅ Aprovado | (snapshot) | Digitar "Zildinha" mostrou sugestão "Zildinha Ruela — CPF 043.141.421-12". |
| AG013 | ✅ Aprovado | (snapshot) | Digitar "043141421" (dígitos de CPF) mostrou 2 sugestões cujo CPF começa com esse prefixo (Zildinha Ruela e FABIO SERGIO). |
| AG014 | 🐛 Reprovado (bug) | `AG014-BUG-filtro-paciente-ignorado-medico.png` | Selecionar "Zildinha Ruela" gerou `GET .../agendamentos?pacienteId=5c82c873-...`, mas a resposta trouxe agendamentos de Tereza Rossi e Zilma Ruela também — filtro ignorado pelo backend para usuário MEDICO. Ver achado crítico #4. |
| AG015 | ✅ Aprovado | (rede) | Clicar no X da chip de paciente voltou a listar todos. |
| AG016 | ✅ Aprovado | (snapshot) | Digitar "zzznaoexistepaciente" não mostrou nenhuma sugestão, sem erro/crash. |
| AG017 | ✅ Aprovado | (snapshot) | Com paciente selecionado, campo de busca de médico ficou `disabled`. |
| AG018 | ✅ Aprovado | (rede: `GET .../agendamentos?status=PENDENTE`) | Clicar em "Pendente" filtrou corretamente para os cards com badge "Pendente" (Concluído excluído). |
| AG019 | ✅ Aprovado | (rede) | Clicar em "Todos" removeu o parâmetro `status` da query. |
| AG020 | ✅ Aprovado | (rede: `GET .../agendamentos?status=CONFIRMADO&medicoId=...`) | Médico + status combinados geraram a query string combinada correta. |
| AG021 | ✅ Aprovado (observação) | — | Confirmado: não há pills para `AGUARDANDO_PAGAMENTO`, `A_CAMINHO`, `CHEGOU`, `NO_SHOW`. Registrado como limitação de UX esperada, não bloqueante. |
| AG022 | ✅ Aprovado | (snapshot) | "Novo Agendamento" abriu no Passo 1/5, título correto, "Próximo" desabilitado sem seleção. |
| AG023 | 🐛 Reprovado (bug) | `AG023-AG024-BUG-busca-paciente-nao-filtra.png` | Busca por texto (nome) no Passo 1 não filtra nada — todos os 21 pacientes continuam visíveis mesmo com um termo de busca claramente não-correspondente. Ver achado crítico #3. |
| AG024 | ✅ Aprovado (com ressalva) | (snapshot) | Busca puramente numérica sem correspondência (`"99999999999"`) mostrou corretamente "Nenhum paciente encontrado", sem crash. O caminho de busca por nome não alcança esse estado devido ao bug de AG023. |
| AG025 | ✅ Aprovado | (snapshot) | Selecionar "Zildinha Ruela" destacou a linha e habilitou "Próximo". |
| AG026 | ✅ Aprovado | (snapshot) | Passo 2 listou "Consulta de Rotina", R$ 1.000,00, Fabio Monteiro Amorim, 30 min (único serviço ativo). |
| AG027 | ✅ Aprovado | (snapshot) | Busca "Fabio" manteve o resultado; busca "xyznomatch" mostrou "Nenhum serviço encontrado" — filtro funciona corretamente (ao contrário do Passo 1). |
| AG028 | ✅ Aprovado | `AG028-servico-selecionado-retained.png` | Selecionar o serviço habilitou "Próximo"; "Anterior" voltou ao Passo 1 com Zildinha Ruela ainda selecionada/destacada. |
| AG029 | ✅ Aprovado | (snapshot) | Presencial, Domiciliar e Telemedicina selecionáveis; Presencial vem selecionado por padrão (estabelecimento já carregado ao entrar no passo). |
| AG030 | ✅ Aprovado | `AG030-domiciliar-sem-endereco.png` | Com paciente sem endereço (Tereza Rossi), Domiciliar mostrou "Endereço não cadastrado. Confirme antes do atendimento." e "Próximo" ficou habilitado (não exige estabelecimento). |
| AG031 | ✅ Aprovado | (rede: `GET .../agendamentos/medico/{id}/estabelecimentos`) | Presencial e Telemedicina carregaram a mesma lista de estabelecimentos do médico. |
| AG032 | 🚫 Bloqueado | — | Só existia 1 médico com serviço ativo no ambiente (já com estabelecimento vinculado). Não testado ao vivo; comportamento consistente com o código lido. |
| AG033 | ✅ Aprovado | (snapshot) | Trocar Domiciliar → Presencial resetou a seleção de estabelecimento ("Próximo" voltou a ficar desabilitado). |
| AG034 | ✅ Aprovado | (snapshot) | Selecionar "Clinica São Lucas" habilitou "Próximo". |
| AG035 | 🐛 Reprovado (bug) | `AG035-BUG-min-date-off-by-one.png` | `min` do input de data mostrou `2026-08-20` quando "hoje" local era `2026-08-19` (23:44, `America/Sao_Paulo`). Ver achado crítico #5. |
| AG036 | ✅ Aprovado | (rede: `GET .../agendamentos/slots?medicoId=...&estabelecimentoId=...&data=...`) | Selecionar data disparou a requisição de slots com os parâmetros corretos. |
| AG037 | ✅ Aprovado | (snapshot) | Data `2026-08-26` (quarta) para o serviço no ramo Domiciliar (agenda só quinta) mostrou "Sem horários disponíveis nesta data". |
| AG038 | ✅ Aprovado | (snapshot) | Selecionar um slot destacou o botão e habilitou "Próximo". |
| AG039 | 🐛 Reprovado (bug confirmado) | `AG039-BUG-slots-passado-mostrados.png` | Com "hoje" = quarta-feira 23:44 e agenda 08:00–18:00, os 20 slots do dia (100% no passado) foram todos retornados como disponíveis pela API. Ver achado crítico #2. |
| AG040 | ✅ Aprovado | (snapshot) | Trocar de `2026-08-19` para `2026-08-26` recarregou os slots e limpou a seleção anterior (`Próximo` voltou a ficar desabilitado). |
| AG041 | ✅ Aprovado | `AG041-AG043-resumo-confirmacao.png` | Resumo do Passo 5 mostrou paciente, serviço + médico, tipo/local, data/hora (`26/08/2026, 10:00 — 10:30`), duração e valor corretos. |
| AG042 | ✅ Aprovado | `AG042-taxa-deslocamento-discriminada.png` | Domiciliar com taxa mostrou "R$ 1.080,00 (serviço R$ 1.000,00 + deslocamento R$ 80,00)"; Presencial (sem taxa aplicável) mostrou só "R$ 1.000,00". |
| AG043 | ✅ Aprovado | (rede: payload do `POST`) | Texto digitado em Observações (`"QA teste AG041-AG048 fluxo completo presencial"`) apareceu no `observacoes` do payload e na resposta. |
| AG044 | 🚫 Bloqueado (captura) | — | Requisição local resolve rápido demais para capturar "Salvando…" em tela estática. Comportamento confirmado por leitura de código (`disabled={salvando}`). |
| AG045 | ✅ Aprovado | `AG045-anterior-preserva-seletion.png` | "Anterior" do Passo 2 voltou ao Passo 1 com Zildinha Ruela ainda destacada/selecionada. |
| AG046 | ✅ Aprovado | (snapshot) | Fechar o wizard e reabrir "Novo Agendamento" voltou ao Passo 1 limpo, sem dados residuais. |
| AG047 | ✅ Aprovado | (snapshot pós-reload) | Recarregar a página com o wizard aberto (paciente selecionado) fechou o modal, sem crash; listagem recarregou normalmente. |
| AG048 | 🟡 Parcial (bug menor) | `AG048-novo-agendamento-nao-aparece-no-topo.png` | `POST` retornou `201`, modal fechou, status "Pendente" correto — mas o card não apareceu no topo da lista (apareceu depois do agendamento mais antigo de Tereza Rossi). Ver achado crítico #6. |
| AG049 | ✅ Aprovado | (rede: payload sem `estabelecimentoId`, resposta com `pacienteEndereco`) | Fluxo Domiciliar completo: `POST` sem `estabelecimentoId`, `tipo:"DOMICILIAR"`; card exibiu "Domiciliar — Rua Copaíba, 902, 78, ..." com link de Maps. |
| AG050 | 🐛 Reprovado (bug confirmado) | (rede: 2 respostas `201` com IDs distintos, mesmo `dataHoraInicio`/`dataHoraFim`) | Dois `POST` concorrentes para o mesmo médico/estabelecimento/horário retornaram `201` nos dois. Ver achado crítico #1. |
| AG051 | ✅ Aprovado | `AG051-erro-servico-inativo.png` | Com o serviço inativado entre a seleção e a confirmação, `wizardError` mostrou "Serviço médico inativo: 241760a1-..." dentro do modal, sem fechar, com todos os dados do Passo 5 preservados. |
| AG052 | ✅ Aprovado | (rede: `PATCH .../status` `{"status":"CONFIRMADO"}`) | Card `PENDENTE` → clicar "Confirmar" atualizou para "Confirmado" sem reload. |
| AG053 | ✅ Aprovado | (snapshot) | `CONFIRMADO` Presencial → botão "Iniciar" foi direto para "Em Andamento". |
| AG054 | ✅ Aprovado | (snapshot) | `CONFIRMADO` Domiciliar → botão "A Caminho" abriu o modal "Compartilhar Localização" sem PATCH imediato. |
| AG055 | ✅ Aprovado | (rede: `PATCH .../status` `{"status":"A_CAMINHO","localizacaoMedico":"https://maps.app.goo.gl/QAteste123"}`) | "Confirmar partida" ficou desabilitado sem link; preenchido e confirmado, disparou o PATCH certo e o card passou a mostrar "Acompanhar médico". |
| AG056 | ✅ Aprovado | (rede: nenhuma chamada a `/status` disparada) | "Cancelar" do modal "A Caminho" sem preencher fechou o modal sem alterar o status (permaneceu "Confirmado"). |
| AG057 | ✅ Aprovado | (snapshot) | `A_CAMINHO` → botão "Chegou" avançou para "Chegou". |
| AG058 | ✅ Aprovado | (snapshot) | `CHEGOU` → botão "Iniciar" avançou para "Em Andamento". |
| AG059 | ✅ Aprovado | (snapshot) | `EM_ANDAMENTO` → botão "Concluir" avançou para "Concluído". |
| AG060 | ✅ Aprovado | (snapshot) | Card `CONCLUIDO` não mostrou nenhum botão de próxima ação. |
| AG061 | ✅ Aprovado (com ressalva) | (rede: 2x `PATCH` concorrentes, ambos `200`) | Duas chamadas `PATCH` concorrentes para a mesma transição (`EM_ANDAMENTO → CONCLUIDO`) retornaram `200` nas duas, sem efeito colateral negativo (estado final idêntico). Guard de UI (`atualizandoId`) não testado sob duplo-clique real de mouse. |
| AG062 | ✅ Aprovado | (rede: `400 Bad Request`, `"Transição inválida: PENDENTE → CONCLUIDO"`) | Transição inválida via requisição direta foi corretamente rejeitada. |
| AG063 | ✅ Aprovado | (snapshot) | Cards `CONCLUIDO` e `CANCELADO` não mostraram botão "Cancelar". |
| AG064 | ✅ Aprovado | (snapshot) | "Cancelar" abriu o modal com select de Origem e campo de Motivo. |
| AG065 | ✅ Aprovado | (snapshot) | "Confirmar Cancelamento" ficou desabilitado com motivo vazio. |
| AG066 | ✅ Aprovado | (rede: `PATCH .../cancelar` → `204 No Content`) | Confirmar com motivo preenchido cancelou o agendamento; card atualizou para "Cancelado" sem reload. |
| AG067 | ✅ Aprovado | (rede: nenhuma chamada a `/cancelar` disparada) | "Voltar" fechou o modal sem alterar o status nem disparar requisição. |
| AG068 | ✅ Aprovado | (rede: `400 Bad Request`, `"Agendamento já concluído não pode ser cancelado"`) | Tentativa de cancelar um agendamento `CONCLUIDO` via requisição direta foi rejeitada com mensagem clara. |
| AG069 | ✅ Aprovado | (rede, consistente ao longo de toda a sessão) | `GET /agendamentos` sem filtro sempre retornou só agendamentos de "Fabio Monteiro Amorim", mesmo sem usar o filtro de médico. |
| AG070 | 🚫 Bloqueado | — | `eduardasilva@gmail.com`/`joaozinh7` retornou `401 Unauthorized` real no login; nenhuma senha foi inventada, conforme instruído. |
| AG071 | 🚫 Bloqueado | — | Nenhuma conta PACIENTE disponível. |
| AG072 | ✅ Aprovado | (snapshot pós-navegação: `/login` renderizado) | `refresh_token` corrompido + reload → app redirecionou para `/login` (formulário completo), sem tela em branco. |
| AG073 | 🟡 Parcial/Bloqueado | — | Não simulado como rede lenta real. Um `403` transitório orgânico (expiração de token em voo) mostrou que o loading resolve (não trava), mas o erro real é mascarado como "Sem horários disponíveis nesta data" — achado menor de UX. |
| AG074 | ✅ Aprovado | (mesma sequência de AG052–060) | Fluxo completo cadastro → confirmar → avançar até Concluído: card final refletiu `CONCLUIDO`, sem ação extra oferecida. |
| AG075 | ✅ Aprovado | (rede: novo `GET /agendamentos` a cada navegação) | Navegar para "Pacientes" e voltar via menu para "Agendamentos" disparou nova requisição e recarregou a listagem. |

---

## Resumo final

### Rodada 1 (2026-08-19)

- **Total de itens do plano:** 75
- **✅ Aprovados:** 62
- **🐛 Reprovados (bug confirmado):** 6 — AG003, AG014, AG023, AG035, AG039, AG050
- **🟡 Parciais (funciona, com ressalva/achado menor):** 2 — AG048, AG073
- **🚫 Bloqueados (sem prova ao vivo possível nas regras dadas):** 5 — AG006, AG032, AG044, AG070, AG071

### Rodada 2 — reteste pós-correções (2026-08-20)

- **Itens reprovados na rodada 1 corrigidos e reconfirmados:** 6/6 — AG003, AG014, AG023, AG035,
  AG039, AG050 (ver seção "Rodada 2" no topo deste documento para os detalhes de cada um).
- **Total geral atualizado:** 68 aprovados, 0 reprovados, 2 parciais (AG048, AG073 — não fazem
  parte do escopo deste reteste), 5 bloqueados (idem).

### Os dois pontos suspeitos indicados no início do QA

- **AG039 (slots do passado para o dia de hoje): CONFIRMADO como bug real.** `AgendamentoService.listarSlotsDisponiveis()` não filtra horários já passados quando a data selecionada é hoje — reproduzido ao vivo, todos os 20 slots do dia (100% no passado, já eram 23:44) foram retornados como disponíveis pela API real.
- **AG050 (double-booking): CONFIRMADO como bug real.** `AgendamentoService.cadastrar()` não revalida disponibilidade do slot no momento do `POST` — dois `POST`s concorrentes para o mesmo médico/horário retornaram `201 Created` nos dois, criando um overbooking real e reproduzível.

### Bugs adicionais encontrados (não estavam no radar inicial), por severidade

**Alta (afeta dados/funcionalidade core):**
- **AG014** — Filtro de paciente na listagem é ignorado pelo backend para usuários MEDICO (retorna todos os agendamentos do médico, não só do paciente filtrado).
- **AG023** — Busca por nome no Passo 1 do wizard não filtra nada (bug de string vazia em `.includes("")`).

**Média:**
- **AG003** — Agendamentos Telemedicina mostram endereço físico do estabelecimento com link de mapa, indistinguíveis de Presencial na listagem.
- **AG035** — `min` do seletor de data calculado em UTC, causando off-by-one de um dia entre ~21h e meia-noite no fuso de São Paulo.

**Baixa (achados menores):**
- **AG048** — Novo agendamento nem sempre aparece no topo da lista após cadastro (ordem sobrescrita pela recarga do backend).
- **AG073 (relacionado)** — Erros reais (403/rede) ao carregar slots são mascarados como "Sem horários disponíveis nesta data" em vez de um erro distinto.
