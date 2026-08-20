# Test Plan — Tela de Agendamentos (`/agendamentos`)

> URL: `http://localhost:3001/agendamentos`
> Backends reais: `sgsm` core `:8080`, `sgsm-auth` `:8081` — sem mocks.
> Credenciais: `fabioeuro@gmail.com` / `famor966` (acesso amplo). Para os casos de escopo por perfil (seção "Escopo por perfil"), usar também uma conta MEDICO (`paulo@gmail.com`, ou `eduardasilva@gmail.com` / `joaozinh7`) e, se existir, uma conta PACIENTE.
> Pré-requisito: precisa existir pelo menos 1 médico ativo com agenda cadastrada (`AgendaMedico`, dias/horários configurados) vinculada a um estabelecimento, e pelo menos 1 serviço médico ativo desse médico, e pelo menos 1 paciente ativo — senão o wizard não avança do passo 2/3/4 por falta de dados. Confirmar isso antes de começar; se faltar, cadastrar via as próprias telas do sistema (`/medicos`, `/servicos`, `/pacientes`, `/estabelecimentos`), nunca via SQL direto.
> Executado em: (preencher na execução)

---

## Listagem — Carregamento inicial

- [ ] **AG001** — Ao abrir `/agendamentos`, exibe spinner e depois a grade de cards
- [ ] **AG002** — Cada card mostra: nome do paciente, nome do serviço, badge de status, nome do médico, local (estabelecimento com link do Maps, ou "Domiciliar" com endereço do paciente), data/hora formatada
- [ ] **AG003** — Agendamento tipo TELEMEDICINA exibe o rótulo correto no lugar do endereço (não deveria mostrar link de mapa nem endereço físico — confirmar o que aparece de fato)
- [ ] **AG004** — Agendamento com status `A_CAMINHO` e `localizacaoMedico` preenchido exibe o link "Acompanhar médico"
- [ ] **AG005** — Lista vazia (nenhum agendamento ou filtro sem resultado) exibe `EmptyState` com o texto customizado ("Nenhum agendamento encontrado")
- [ ] **AG006** — Erro de rede/API ao listar exibe banner de erro vermelho no topo, sem travar em loading infinito

## Listagem — Filtro por médico

- [ ] **AG007** — Digitar parte do nome de um médico no campo de busca mostra sugestões (nome + CRM/UF + especialidade)
- [ ] **AG008** — Digitar dígitos do CRM (2+ caracteres) também encontra o médico nas sugestões
- [ ] **AG009** — Selecionar um médico nas sugestões dispara `GET /v1/api/agendamentos?medicoId=...`, mostra chip com nome do médico e um botão de limpar (X)
- [ ] **AG010** — Limpar a seleção do médico (X) volta a listar todos, remove o parâmetro da requisição
- [ ] **AG011** — Com um médico selecionado, o campo de busca de paciente fica `disabled` (mutuamente exclusivo) — e vice-versa (AG017)

## Listagem — Filtro por paciente

- [ ] **AG012** — Digitar parte do nome de um paciente mostra sugestões
- [ ] **AG013** — Digitar dígitos do CPF (3+) também encontra o paciente nas sugestões
- [ ] **AG014** — Selecionar um paciente dispara `GET /v1/api/agendamentos?pacienteId=...`, mostra chip com nome + CPF mascarado
- [ ] **AG015** — Limpar a seleção do paciente (X) volta a listar todos
- [ ] **AG016** — Buscar paciente sem nenhuma sugestão correspondente não quebra a tela (lista de sugestões vazia, sem erro)
- [ ] **AG017** — Com um paciente selecionado, o campo de busca de médico fica `disabled`

## Listagem — Filtro por status

- [ ] **AG018** — Pills de status: "Todos", Pendente, Confirmado, Em Andamento, Concluído, Cancelado — clicar em cada uma filtra e dispara `GET ...?status=X`
- [ ] **AG019** — Voltar para "Todos" remove o parâmetro `status`
- [ ] **AG020** — Filtro de status combinado com médico ou paciente selecionado gera a query string combinada corretamente (`?medicoId=...&status=...`)
- [ ] **AG021** — **Observação de cobertura**: os status `AGUARDANDO_PAGAMENTO`, `A_CAMINHO`, `CHEGOU` e `NO_SHOW` não têm pill de filtro dedicado — documentar se isso é uma limitação esperada (não bloqueia, mas registrar)

## Wizard — Passo 1 (Paciente)

- [ ] **AG022** — "Novo Agendamento" abre o wizard no passo 1/5, título "Passo 1 / 5 — Paciente", botão "Próximo" desabilitado sem seleção
- [ ] **AG023** — Buscar por nome ou CPF filtra a lista de pacientes em tempo real
- [ ] **AG024** — Busca sem resultado mostra "Nenhum paciente encontrado", não quebra
- [ ] **AG025** — Selecionar um paciente destaca a linha (`SelectRow` selecionado) e habilita "Próximo"

## Wizard — Passo 2 (Serviço Médico)

- [ ] **AG026** — Passo 2 lista os serviços médicos ativos com nome, preço formatado em R$, nome do médico e duração (quando houver)
- [ ] **AG027** — Buscar por nome do serviço ou nome do médico filtra a lista
- [ ] **AG028** — Selecionar um serviço habilita "Próximo"; "Anterior" volta ao passo 1 mantendo o paciente selecionado

## Wizard — Passo 3 (Tipo e Local)

- [ ] **AG029** — Os 3 tipos (Presencial, Domiciliar, Telemedicina) são selecionáveis; Presencial vem selecionado por padrão
- [ ] **AG030** — Selecionar "Domiciliar" mostra o endereço cadastrado do paciente (ou aviso "Endereço não cadastrado" se o paciente não tiver); não exige estabelecimento para avançar
- [ ] **AG031** — Selecionar "Presencial" ou "Telemedicina" carrega a lista de estabelecimentos do médico escolhido (`GET /agendamentos/medico/{id}/estabelecimentos`), com loading state
- [ ] **AG032** — Médico sem estabelecimento vinculado algum → mensagem "Nenhum estabelecimento encontrado para este médico", "Próximo" fica bloqueado (não é possível avançar sem selecionar)
- [ ] **AG033** — Trocar de tipo (ex.: Presencial → Domiciliar → Presencial) reresseta a seleção de estabelecimento (`setSelectedEstabelecimento(null)` no clique do tipo)
- [ ] **AG034** — Selecionar um estabelecimento habilita "Próximo"

## Wizard — Passo 4 (Data e Horário)

- [ ] **AG035** — Campo de data tem `min` = hoje (não permite selecionar data passada pelo seletor nativo)
- [ ] **AG036** — Selecionar uma data dispara `GET /agendamentos/slots?medicoId=...&estabelecimentoId=...&data=...` (ou sem `estabelecimentoId` se Domiciliar) com loading state "Carregando horários…"
- [ ] **AG037** — Data sem nenhum horário disponível (ex.: médico não atende nesse dia da semana) mostra "Sem horários disponíveis nesta data"
- [ ] **AG038** — Selecionar um horário destaca o botão e habilita "Próximo"
- [ ] **AG039** — **Edge case suspeito de bug**: selecionar a data de HOJE, quando o médico tem agenda configurada para o dia atual — verificar se a lista de horários inclui slots que já passaram (ex.: agora são 14h e a agenda começa às 9h). O backend (`AgendamentoService.listarSlotsDisponiveis`) não parece filtrar slots anteriores ao horário atual quando a data é hoje. Se reproduzir, é bug real (permite agendar no passado)
- [ ] **AG040** — Trocar a data recarrega os horários e limpa a seleção anterior (`setSelectedSlot(null)` a cada nova busca)

## Wizard — Passo 5 (Confirmação)

- [ ] **AG041** — Resumo mostra paciente, serviço + médico, tipo/local, data/hora formatada, duração e valor corretos
- [ ] **AG042** — Agendamento Domiciliar com taxa de deslocamento mostra "serviço + deslocamento" discriminado no valor; sem taxa mostra só o valor do serviço
- [ ] **AG043** — Campo Observações é opcional; texto digitado é enviado no payload do `POST`
- [ ] **AG044** — Botão "Confirmar" mostra "Salvando…" e fica desabilitado durante a requisição

## Wizard — Navegação e fechamento

- [ ] **AG045** — "Anterior" em qualquer passo > 1 volta ao passo anterior preservando as seleções já feitas
- [ ] **AG046** — Fechar o modal (X ou clique fora) no meio do wizard e reabrir "Novo Agendamento" reseta tudo para o passo 1, sem dados residuais
- [ ] **AG047** — Recarregar a página (F5) com o wizard aberto e passos preenchidos → modal fecha, dados perdidos, sem crash (comportamento esperado)

## Cadastro — Submissão

- [ ] **AG048** — Fluxo completo válido (paciente → serviço → presencial com estabelecimento → data/horário → confirmar) → `POST /v1/api/agendamentos` com `201 Created`, modal fecha, agendamento aparece no topo da lista com status "Pendente" sem precisar recarregar
- [ ] **AG049** — Fluxo completo Domiciliar válido → `POST` com `estabelecimentoId` omitido/nulo, `tipo: "DOMICILIAR"`, card exibe o endereço do paciente
- [ ] **AG050** — **Edge case suspeito de bug — double-booking**: abrir o wizard em duas abas (ou repetir o fluxo duas vezes seguidas) e tentar agendar o MESMO médico no MESMO horário exato duas vezes. O `AgendamentoService.cadastrar()` não parece revalidar disponibilidade do slot no momento do `POST` (só a listagem de slots filtra ocupados, não o cadastro em si) — verificar se o backend aceita os dois `POST` com `201` para o mesmo médico/horário (conflito/overbooking), o que seria um bug real de concorrência
- [ ] **AG051** — Erro do backend ao confirmar (ex.: serviço foi inativado entre a seleção e a confirmação) exibe a mensagem dentro do wizard (`wizardError`), sem fechar o modal, sem perder os dados já preenchidos

## Ações de status — fluxo de transição

- [ ] **AG052** — Agendamento `PENDENTE`: botão de ação mostra "Confirmar"; clicar dispara `PATCH /{id}/status` com `status: CONFIRMADO`, card atualiza para "Confirmado" sem reload
- [ ] **AG053** — Agendamento `CONFIRMADO` tipo Presencial/Telemedicina: botão mostra "Iniciar" → vai direto para `EM_ANDAMENTO`
- [ ] **AG054** — Agendamento `CONFIRMADO` tipo Domiciliar: botão mostra "A Caminho" → abre o modal "Compartilhar Localização" (não dispara PATCH direto)
- [ ] **AG055** — Modal "A Caminho": botão "Confirmar partida" fica desabilitado sem um link preenchido; preencher e confirmar dispara `PATCH .../status` com `status: A_CAMINHO` e `localizacaoMedico`, card passa a mostrar "Acompanhar médico"
- [ ] **AG056** — Cancelar o modal "A Caminho" sem preencher não altera o status
- [ ] **AG057** — Agendamento `A_CAMINHO`: botão mostra "Chegou" → vai para `CHEGOU`
- [ ] **AG058** — Agendamento `CHEGOU`: botão mostra "Iniciar" → vai para `EM_ANDAMENTO`
- [ ] **AG059** — Agendamento `EM_ANDAMENTO`: botão mostra "Concluir" → vai para `CONCLUIDO`
- [ ] **AG060** — Agendamento `CONCLUIDO`: nenhum botão de próxima ação aparece (fluxo terminal)
- [ ] **AG061** — Clique duplo/rápido no botão de próxima ação — verificar se dispara mais de um `PATCH` (o `atualizandoId` parece servir de guard via `disabled`, mas confirmar na prática, inclusive contra race condition de clique muito rápido)

## Ações de status — transições inválidas / bloqueadas

- [ ] **AG062** — Tentar (via requisição direta, já que a UI não oferece) uma transição inválida, ex. `PENDENTE → CONCLUIDO` diretamente → backend responde erro ("Transição inválida"), não `200`
- [ ] **AG063** — Agendamento `CANCELADO` ou `CONCLUIDO`: nenhum botão de "Cancelar" aparece no card (`podeCancel` retorna `false`)

## Cancelamento

- [ ] **AG064** — Clicar em "Cancelar" num agendamento cancelável abre o modal com Origem (select) e Motivo (obrigatório)
- [ ] **AG065** — Botão "Confirmar Cancelamento" fica desabilitado com motivo vazio
- [ ] **AG066** — Confirmar com motivo preenchido dispara `PATCH .../cancelar` com origem e motivo, card atualiza para "Cancelado" sem reload
- [ ] **AG067** — "Voltar" no modal de cancelamento não altera o status, nenhuma requisição disparada
- [ ] **AG068** — Tentar cancelar (via requisição direta) um agendamento já `CANCELADO` ou `CONCLUIDO` → backend rejeita com erro claro

## Escopo por perfil

- [ ] **AG069** — Logado como MEDICO, a listagem (`GET /agendamentos` sem filtro) retorna só os agendamentos desse médico, mesmo que o filtro de busca por médico não seja usado (o backend força `medicoId` ao próprio médico)
- [ ] **AG070** — Logado como MEDICO, tentar consultar/atualizar status/cancelar (via requisição direta) um agendamento de OUTRO médico → `403 Forbidden`
- [ ] **AG071** — Se existir conta PACIENTE disponível: logado como PACIENTE, a listagem retorna só os agendamentos desse paciente; tentar cadastrar um agendamento para outro `pacienteId` (via requisição direta) → `403 Forbidden` ("Paciente não pode agendar para outro paciente")

## Sessão / rede

- [ ] **AG072** — Sessão expirada (401 numa chamada de `/agendamentos`) redireciona para `/login`, sem tela em branco
- [ ] **AG073** — Rede lenta/erro ao carregar slots ou estabelecimentos no wizard não trava a UI indefinidamente (loading state resolve, mesmo em erro)

## Regressão / fluxo completo

- [ ] **AG074** — Fluxo completo: cadastrar agendamento → confirmar → avançar status até concluir → verificar que o card final reflete `CONCLUIDO` e nenhuma ação extra é oferecida
- [ ] **AG075** — Navegar para outra tela (ex.: "Pacientes") e voltar para "Agendamentos" via menu recarrega a listagem sem dados obsoletos
