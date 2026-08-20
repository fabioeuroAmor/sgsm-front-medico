# Test Plan — Tela de Agendamentos (`/agendamentos`)

> URL: `http://localhost:3001/agendamentos`
> Backends reais: `sgsm` core `:8080`, `sgsm-auth` `:8081` — sem mocks.
> Credenciais: `fabioeuro@gmail.com` / `famor966` (acesso amplo). Para os casos de escopo por perfil (seção "Escopo por perfil"), usar também uma conta MEDICO (`paulo@gmail.com`, ou `eduardasilva@gmail.com` / `joaozinh7`) e, se existir, uma conta PACIENTE.
> Pré-requisito: precisa existir pelo menos 1 médico ativo com agenda cadastrada (`AgendaMedico`, dias/horários configurados) vinculada a um estabelecimento, e pelo menos 1 serviço médico ativo desse médico, e pelo menos 1 paciente ativo — senão o wizard não avança do passo 2/3/4 por falta de dados. Confirmar isso antes de começar; se faltar, cadastrar via as próprias telas do sistema (`/medicos`, `/servicos`, `/pacientes`, `/estabelecimentos`), nunca via SQL direto.
> Executado em: 2026-08-19/20, sessão de QA ao vivo (`fabioeuro@gmail.com`), app real em `:3001`, backends reais `sgsm` `:8080` / `sgsm-auth` `:8081`. Ver `qa-results.md` para detalhes, causas-raiz e evidências (`evidence/`).
> **Rodada 2 (reteste, 2026-08-20):** os 6 bugs reais encontrados na rodada 1 (AG003, AG014, AG023, AG035, AG039, AG050) foram corrigidos e reconfirmados ao vivo — ver seção "Rodada 2" no topo de `qa-results.md` para detalhes, incluindo uma nota importante sobre o dev server em `:3001` não refletir a correção de front-end (foi necessário rodar um segundo dev server em `:3010` a partir do worktree com o fix).

---

## Listagem — Carregamento inicial

- [x] **AG001** — Ao abrir `/agendamentos`, exibe spinner e depois a grade de cards
- [x] **AG002** — Cada card mostra: nome do paciente, nome do serviço, badge de status, nome do médico, local (estabelecimento com link do Maps, ou "Domiciliar" com endereço do paciente), data/hora formatada
- [x] **AG003** — Agendamento tipo TELEMEDICINA exibe o rótulo correto no lugar do endereço (não deveria mostrar link de mapa nem endereço físico — confirmar o que aparece de fato) — **RODADA 1: BUG CONFIRMADO** (mostrava endereço físico do estabelecimento com link de mapa, igual a Presencial). **RODADA 2 (reteste, 2026-08-20): CORRIGIDO** — card do agendamento Telemedicina real (Zilma Ruela, `tipo:"TELEMEDICINA"` confirmado via rede) agora mostra o rótulo "Telemedicina", sem link de mapa nem endereço físico. Evidência: `evidence/AG003-retest.png`, `evidence/AG003-retest.log`
- [x] **AG004** — Agendamento com status `A_CAMINHO` e `localizacaoMedico` preenchido exibe o link "Acompanhar médico"
- [x] **AG005** — Lista vazia (nenhum agendamento ou filtro sem resultado) exibe `EmptyState` com o texto customizado ("Nenhum agendamento encontrado")
- [ ] **AG006** — Erro de rede/API ao listar exibe banner de erro vermelho no topo, sem travar em loading infinito — **BLOQUEADO**: nenhum método permitido (sem mock, sem derrubar backend compartilhado) para forçar um erro de rede/API real na listagem; verificado apenas via leitura de código (`useAgendamentos.ts`, bloco `catch`/`finally`)

## Listagem — Filtro por médico

- [x] **AG007** — Digitar parte do nome de um médico no campo de busca mostra sugestões (nome + CRM/UF + especialidade)
- [x] **AG008** — Digitar dígitos do CRM (2+ caracteres) também encontra o médico nas sugestões
- [x] **AG009** — Selecionar um médico nas sugestões dispara `GET /v1/api/agendamentos?medicoId=...`, mostra chip com nome do médico e um botão de limpar (X)
- [x] **AG010** — Limpar a seleção do médico (X) volta a listar todos, remove o parâmetro da requisição
- [x] **AG011** — Com um médico selecionado, o campo de busca de paciente fica `disabled` (mutuamente exclusivo) — e vice-versa (AG017)

## Listagem — Filtro por paciente

- [x] **AG012** — Digitar parte do nome de um paciente mostra sugestões
- [x] **AG013** — Digitar dígitos do CPF (3+) também encontra o paciente nas sugestões
- [x] **AG014** — Selecionar um paciente dispara `GET /v1/api/agendamentos?pacienteId=...`, mostra chip com nome + CPF mascarado — **RODADA 1: BUG CONFIRMADO** (a chip e a URL apareciam certas, mas o backend, logado como MEDICO, ignorava o `pacienteId` e retornava a lista completa do médico). **RODADA 2 (reteste, 2026-08-20): CORRIGIDO** — filtrar por "Zilma Ruela" retornou só os 2 agendamentos dela (`pacienteId` confirmado em ambos os itens da resposta), nenhum agendamento de Tereza Rossi/Zildinha Ruela apareceu. Evidência: `evidence/AG014-retest.png`, `evidence/AG014-retest.log`
- [x] **AG015** — Limpar a seleção do paciente (X) volta a listar todos
- [x] **AG016** — Buscar paciente sem nenhuma sugestão correspondente não quebra a tela (lista de sugestões vazia, sem erro)
- [x] **AG017** — Com um paciente selecionado, o campo de busca de médico fica `disabled`

## Listagem — Filtro por status

- [x] **AG018** — Pills de status: "Todos", Pendente, Confirmado, Em Andamento, Concluído, Cancelado — clicar em cada uma filtra e dispara `GET ...?status=X`
- [x] **AG019** — Voltar para "Todos" remove o parâmetro `status`
- [x] **AG020** — Filtro de status combinado com médico ou paciente selecionado gera a query string combinada corretamente (`?medicoId=...&status=...`)
- [x] **AG021** — **Observação de cobertura**: os status `AGUARDANDO_PAGAMENTO`, `A_CAMINHO`, `CHEGOU` e `NO_SHOW` não têm pill de filtro dedicado — confirmado, documentado como limitação de UX esperada (não bloqueia)

## Wizard — Passo 1 (Paciente)

- [x] **AG022** — "Novo Agendamento" abre o wizard no passo 1/5, título "Passo 1 / 5 — Paciente", botão "Próximo" desabilitado sem seleção
- [x] **AG023** — Buscar por nome ou CPF filtra a lista de pacientes em tempo real — **RODADA 1: BUG CONFIRMADO** (busca por nome, texto sem dígitos, não filtrava nada, lista completa continuava aparecendo). **RODADA 2 (reteste, 2026-08-20): CORRIGIDO** — digitar "zzznomeinexistente" agora mostra corretamente "Nenhum paciente encontrado" em vez da lista completa de 21 pacientes. Evidência: `evidence/AG023-retest.png`, `evidence/AG023-retest.log`
- [x] **AG024** — Busca sem resultado mostra "Nenhum paciente encontrado", não quebra (confirmado com busca numérica sem correspondência — busca textual não atinge esse estado devido ao bug de AG023)
- [x] **AG025** — Selecionar um paciente destaca a linha (`SelectRow` selecionado) e habilita "Próximo"

## Wizard — Passo 2 (Serviço Médico)

- [x] **AG026** — Passo 2 lista os serviços médicos ativos com nome, preço formatado em R$, nome do médico e duração (quando houver)
- [x] **AG027** — Buscar por nome do serviço ou nome do médico filtra a lista
- [x] **AG028** — Selecionar um serviço habilita "Próximo"; "Anterior" volta ao passo 1 mantendo o paciente selecionado

## Wizard — Passo 3 (Tipo e Local)

- [x] **AG029** — Os 3 tipos (Presencial, Domiciliar, Telemedicina) são selecionáveis; Presencial vem selecionado por padrão
- [x] **AG030** — Selecionar "Domiciliar" mostra o endereço cadastrado do paciente (ou aviso "Endereço não cadastrado" se o paciente não tiver); não exige estabelecimento para avançar
- [x] **AG031** — Selecionar "Presencial" ou "Telemedicina" carrega a lista de estabelecimentos do médico escolhido (`GET /agendamentos/medico/{id}/estabelecimentos`), com loading state
- [ ] **AG032** — Médico sem estabelecimento vinculado algum → mensagem "Nenhum estabelecimento encontrado para este médico", "Próximo" fica bloqueado (não é possível avançar sem selecionar) — **BLOQUEADO**: só existia 1 médico ativo com serviço ativo no ambiente (Fabio Monteiro Amorim, com estabelecimento vinculado); criar um segundo médico + serviço só para este caso de borda foi deprioritizado; comportamento confirmado apenas por leitura de código (`AgendamentosPage.tsx`, `estabelecimentos.length === 0`)
- [x] **AG033** — Trocar de tipo (ex.: Presencial → Domiciliar → Presencial) reseta a seleção de estabelecimento (`setSelectedEstabelecimento(null)` no clique do tipo)
- [x] **AG034** — Selecionar um estabelecimento habilita "Próximo"

## Wizard — Passo 4 (Data e Horário)

- [x] **AG035** — Campo de data tem `min` = hoje (não permite selecionar data passada pelo seletor nativo) — **RODADA 1: BUG CONFIRMADO** (`min` calculado com `new Date().toISOString()`, UTC, causando off-by-one de um dia à noite em fuso `America/Sao_Paulo`). **RODADA 2 (reteste, 2026-08-20): CORRIGIDO** — `min` agora usa `hojeLocal()` (getters locais `getFullYear`/`getMonth`/`getDate`, nunca UTC), confirmado ao vivo (`min="2026-08-20"` = data local real) e por leitura de código (a correção elimina estruturalmente a dependência de UTC, válida para qualquer horário, não só o testado). Evidência: `evidence/AG035-retest.png`, `evidence/AG035-retest.log`
- [x] **AG036** — Selecionar uma data dispara `GET /agendamentos/slots?medicoId=...&estabelecimentoId=...&data=...` (ou sem `estabelecimentoId` se Domiciliar)
- [x] **AG037** — Data sem nenhum horário disponível (ex.: médico não atende nesse dia da semana) mostra "Sem horários disponíveis nesta data"
- [x] **AG038** — Selecionar um horário destaca o botão e habilita "Próximo"
- [x] **AG039** — **Edge case suspeito de bug**: selecionar a data de HOJE, quando o médico tem agenda configurada para o dia atual — **RODADA 1: BUG CONFIRMADO** (às 23:44, agenda 08:00–18:00, todos os 20 slots do dia, já no passado, foram retornados como disponíveis). **RODADA 2 (reteste, 2026-08-20): CORRIGIDO** — com horário real 01:17 e uma agenda de teste 00:00–07:00 cadastrada para hoje, a API retornou só os slots a partir de 01:30 (`01:30, 02:00, ..., 06:30`), excluindo corretamente `00:00`, `00:30` e `01:00` (já passados). Evidência: `evidence/AG039-retest.png`, `evidence/AG039-retest.log`
- [x] **AG040** — Trocar a data recarrega os horários e limpa a seleção anterior (`setSelectedSlot(null)` a cada nova busca)

## Wizard — Passo 5 (Confirmação)

- [x] **AG041** — Resumo mostra paciente, serviço + médico, tipo/local, data/hora formatada, duração e valor corretos
- [x] **AG042** — Agendamento Domiciliar com taxa de deslocamento mostra "serviço + deslocamento" discriminado no valor; sem taxa mostra só o valor do serviço
- [x] **AG043** — Campo Observações é opcional; texto digitado é enviado no payload do `POST`
- [ ] **AG044** — Botão "Confirmar" mostra "Salvando…" e fica desabilitado durante a requisição — **BLOQUEADO para captura ao vivo**: requisição local resolve rápido demais para capturar o estado intermediário em tela estática; comportamento confirmado por leitura de código (`disabled={salvando}`, texto `'Salvando…'`)

## Wizard — Navegação e fechamento

- [x] **AG045** — "Anterior" em qualquer passo > 1 volta ao passo anterior preservando as seleções já feitas
- [x] **AG046** — Fechar o modal (X ou clique fora) no meio do wizard e reabrir "Novo Agendamento" reseta tudo para o passo 1, sem dados residuais
- [x] **AG047** — Recarregar a página (F5) com o wizard aberto e passos preenchidos → modal fecha, dados perdidos, sem crash (comportamento esperado)

## Cadastro — Submissão

- [x] **AG048** — Fluxo completo válido (paciente → serviço → presencial com estabelecimento → data/horário → confirmar) → `POST /v1/api/agendamentos` com `201 Created`, modal fecha, agendamento aparece no topo da lista com status "Pendente" sem precisar recarregar — **BUG CONFIRMADO (parcial)**: `201`/modal fecha/status "Pendente" corretos, mas o novo agendamento NÃO aparece no topo da lista — a chamada `listar()` após o `POST` sobrescreve a inserção otimista no início do array com a ordem "natural" do backend
- [x] **AG049** — Fluxo completo Domiciliar válido → `POST` com `estabelecimentoId` omitido/nulo, `tipo: "DOMICILIAR"`, card exibe o endereço do paciente
- [x] **AG050** — **Edge case suspeito de bug — double-booking**: **RODADA 1: BUG CONFIRMADO** (dois `POST` concorrentes via `Promise.all`, mesmo médico/estabelecimento/horário, retornaram `201 Created` em ambos, criando dois agendamentos sobrepostos). **RODADA 2 (reteste, 2026-08-20): CORRIGIDO** — mesmo teste (2 `POST`s concorrentes, mesmo médico/estabelecimento/horário `2026-08-27T12:00:00Z`, pacientes diferentes): só 1 retornou `201 Created`, o outro retornou `400` com "Horário indisponível: já existe agendamento para este médico neste período." Evidência: `evidence/AG050-retest.png`, `evidence/AG050-retest.log`
- [x] **AG051** — Erro do backend ao confirmar (ex.: serviço foi inativado entre a seleção e a confirmação) exibe a mensagem dentro do wizard (`wizardError`), sem fechar o modal, sem perder os dados já preenchidos

## Ações de status — fluxo de transição

- [x] **AG052** — Agendamento `PENDENTE`: botão de ação mostra "Confirmar"; clicar dispara `PATCH /{id}/status` com `status: CONFIRMADO`, card atualiza para "Confirmado" sem reload
- [x] **AG053** — Agendamento `CONFIRMADO` tipo Presencial/Telemedicina: botão mostra "Iniciar" → vai direto para `EM_ANDAMENTO`
- [x] **AG054** — Agendamento `CONFIRMADO` tipo Domiciliar: botão mostra "A Caminho" → abre o modal "Compartilhar Localização" (não dispara PATCH direto)
- [x] **AG055** — Modal "A Caminho": botão "Confirmar partida" fica desabilitado sem um link preenchido; preencher e confirmar dispara `PATCH .../status` com `status: A_CAMINHO` e `localizacaoMedico`, card passa a mostrar "Acompanhar médico"
- [x] **AG056** — Cancelar o modal "A Caminho" sem preencher não altera o status
- [x] **AG057** — Agendamento `A_CAMINHO`: botão mostra "Chegou" → vai para `CHEGOU`
- [x] **AG058** — Agendamento `CHEGOU`: botão mostra "Iniciar" → vai para `EM_ANDAMENTO`
- [x] **AG059** — Agendamento `EM_ANDAMENTO`: botão mostra "Concluir" → vai para `CONCLUIDO`
- [x] **AG060** — Agendamento `CONCLUIDO`: nenhum botão de próxima ação aparece (fluxo terminal)
- [x] **AG061** — Clique duplo/rápido no botão de próxima ação — testado via duas chamadas `PATCH` concorrentes para a mesma transição: ambas retornaram `200` (idempotente, sem efeito colateral negativo já que o estado final é o mesmo); guard de UI (`disabled={atualizandoId === a.id}`) não avaliado sob race condition real de clique, apenas por leitura de código

## Ações de status — transições inválidas / bloqueadas

- [x] **AG062** — Tentar (via requisição direta) uma transição inválida, ex. `PENDENTE → CONCLUIDO` diretamente → backend respondeu `400 Bad Request` ("Transição inválida: PENDENTE → CONCLUIDO")
- [x] **AG063** — Agendamento `CANCELADO` ou `CONCLUIDO`: nenhum botão de "Cancelar" aparece no card (`podeCancel` retorna `false`)

## Cancelamento

- [x] **AG064** — Clicar em "Cancelar" num agendamento cancelável abre o modal com Origem (select) e Motivo (obrigatório)
- [x] **AG065** — Botão "Confirmar Cancelamento" fica desabilitado com motivo vazio
- [x] **AG066** — Confirmar com motivo preenchido dispara `PATCH .../cancelar` com origem e motivo, card atualiza para "Cancelado" sem reload
- [x] **AG067** — "Voltar" no modal de cancelamento não altera o status, nenhuma requisição disparada
- [x] **AG068** — Tentar cancelar (via requisição direta) um agendamento já `CANCELADO` ou `CONCLUIDO` → backend rejeitou com `400 Bad Request` e mensagem clara

## Escopo por perfil

- [x] **AG069** — Logado como MEDICO, a listagem (`GET /agendamentos` sem filtro) retorna só os agendamentos desse médico, mesmo que o filtro de busca por médico não seja usado (o backend força `medicoId` ao próprio médico)
- [ ] **AG070** — Logado como MEDICO, tentar consultar/atualizar status/cancelar (via requisição direta) um agendamento de OUTRO médico → `403 Forbidden` — **BLOQUEADO**: sem credencial secundária válida (ver notas em `qa-results.md`)
- [ ] **AG071** — Se existir conta PACIENTE disponível: listagem escopada + `403 Forbidden` ao tentar agendar para outro `pacienteId` — **BLOQUEADO**: nenhuma conta PACIENTE disponível nesta execução

## Sessão / rede

- [x] **AG072** — Sessão expirada (401 numa chamada de `/agendamentos`) redireciona para `/login`, sem tela em branco
- [ ] **AG073** — Rede lenta/erro ao carregar slots ou estabelecimentos no wizard não trava a UI indefinidamente (loading state resolve, mesmo em erro) — **PARCIAL/BLOQUEADO**: nenhum método permitido para simular rede lenta real; um erro `403` transitório e não-provocado durante a sessão mostrou que o loading resolve (não trava) mas mascara o erro real como "Sem horários disponíveis nesta data" — ver nota em `qa-results.md`

## Regressão / fluxo completo

- [x] **AG074** — Fluxo completo: cadastrar agendamento → confirmar → avançar status até concluir → verificar que o card final reflete `CONCLUIDO` e nenhuma ação extra é oferecida
- [x] **AG075** — Navegar para outra tela (ex.: "Pacientes") e voltar para "Agendamentos" via menu recarrega a listagem sem dados obsoletos
