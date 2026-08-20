# Test Plan — Tela de Funcionários (`/funcionarios`)

> URL: `http://localhost:3001/funcionarios`
> Backends reais: `sgsm` core `:8080`, `sgsm-auth` `:8081` — sem mocks.
> Credenciais principais: `fabioeuro@gmail.com` / `famor966` (acesso amplo, para CRUD/filtros/validação).
> Credencial secundária (perfil `MEDICO`, para os casos de escopo por estabelecimento): `paulo@gmail.com` — se não tiver senha conhecida, usar `eduardasilva@gmail.com` / `joaozinh7`.
> Pré-requisito: usuário de teste deve ter pelo menos 1 estabelecimento vinculado/ativo (senão o select "Estabelecimento" do cadastro fica sem opções); confirmar antes de começar. Se a credencial principal for perfil MEDICO sem estabelecimento vinculado, associar um antes (via `/estabelecimentos`) ou trocar de usuário.
> Executado em: (preencher na execução)

---

## Listagem — Carregamento inicial

- [ ] **FN001** — Ao abrir `/funcionarios`, exibe spinner de carregamento e depois a grade de cards
- [ ] **FN002** — Cada card mostra: nome, cargo, badge Ativo/Inativo, CPF, e-mail e nome do estabelecimento (resolvido pelo id, não o UUID cru)
- [ ] **FN003** — Card de funcionário com telefone preenchido mostra a linha "Tel:"; funcionário sem telefone não mostra a linha (não quebra o layout)
- [ ] **FN004** — Lista vazia (nenhum funcionário cadastrado ou filtro sem resultado) exibe `EmptyState` ("Nenhum resultado encontrado"), não a grade
- [ ] **FN005** — Hero exibe "Novo Funcionário" e texto diferente conforme perfil (`Gerencie os funcionários dos seus estabelecimentos.` para MEDICO vs `Funcionários vinculados aos estabelecimentos.` para os demais)
- [ ] **FN006** — Erro de rede/API ao listar exibe banner de erro vermelho no topo, sem travar a tela em loading infinito

## Listagem — Busca (client-side)

- [ ] **FN007** — Buscar por nome parcial filtra a grade em tempo real
- [ ] **FN008** — Buscar por CPF (com ou sem pontuação) encontra o funcionário
- [ ] **FN009** — Buscar por cargo filtra corretamente
- [ ] **FN010** — Buscar por e-mail (parcial) filtra corretamente
- [ ] **FN011** — Busca é case-insensitive
- [ ] **FN012** — Busca sem resultado exibe `EmptyState`
- [ ] **FN013** — Limpar o campo de busca volta a exibir todos os funcionários carregados

## Listagem — Filtro por Estabelecimento

- [ ] **FN014** — Select "Todos os estabelecimentos" lista só estabelecimentos ativos, com nomes corretos
- [ ] **FN015** — Selecionar um estabelecimento dispara `GET /v1/api/funcionarios?estabelecimentoId=...` e mostra só os funcionários daquele estabelecimento
- [ ] **FN016** — Voltar para "Todos os estabelecimentos" remove o parâmetro da requisição e recarrega a lista completa

## Listagem — Filtro por Status

- [ ] **FN017** — Filtro "Ativos" mostra só funcionários com badge Ativo, dispara `GET ...?ativo=true`
- [ ] **FN018** — Filtro "Inativos" mostra só funcionários com badge Inativo, dispara `GET ...?ativo=false`
- [ ] **FN019** — Filtro "Todos os status" volta a mostrar ambos, sem o parâmetro `ativo`

## Listagem — Combinação de filtros + busca

- [ ] **FN020** — Combinar filtro de estabelecimento + status simultaneamente restringe corretamente (verificar query string da requisição)
- [ ] **FN021** — Busca por texto atua sobre o resultado já filtrado por estabelecimento/status (client-side, não reseta os filtros de servidor)

## Cadastro — Campo Nome

- [ ] **FN022** — Salvar com Nome vazio (e demais campos preenchidos) → "Preencha todos os campos obrigatórios.", nenhum `POST` disparado
- [ ] **FN023** — Nome só com espaços em branco → mesmo comportamento de vazio, ou é aceito? (checar se há `.trim()`; documentar o comportamento real encontrado)
- [ ] **FN024** — Nome válido é aceito e enviado corretamente no payload do `POST`

## Cadastro — Campo CPF

- [ ] **FN025** — Máscara CPF: digitar `12345678909` → exibe `123.456.789-09`
- [ ] **FN026** — CPF vazio (blur) + Salvar → "CPF obrigatório", `POST` não disparado
- [ ] **FN027** — CPF com todos os dígitos iguais (ex.: `111.111.111-11`) → "CPF inválido"
- [ ] **FN028** — CPF com dígito verificador inválido → "CPF inválido"
- [ ] **FN029** — CPF válido (dígito verificador correto) → erro removido, aceito
- [ ] **FN030** — CPF duplicado (já cadastrado em outro funcionário) → erro do backend "CPF já cadastrado" exibido no modal (`formError`), modal não fecha sozinho

## Cadastro — Campo E-mail

- [ ] **FN031** — E-mail vazio (blur) + Salvar → "E-mail obrigatório", `POST` não disparado
- [ ] **FN032** — E-mail em formato inválido (ex.: `abc123`) → "E-mail inválido"
- [ ] **FN033** — E-mail válido é aceito, erro removido ao digitar novamente
- [ ] **FN034** — **Edge case suspeito de bug**: cadastrar um funcionário com e-mail já usado por outro funcionário existente. O backend (`FuncionarioService.cadastrar`) não tem checagem de unicidade de e-mail (só CPF) e a coluna `email` no banco não tem constraint `unique`, ao contrário do padrão usado em Médico/Estabelecimento/Paciente. **Verificar se o cadastro é aceito com 201 mesmo com e-mail duplicado** — se sim, documentar como bug real de backend (inconsistência com `atualizar()`, que bloqueia e-mail duplicado via `existsByEmailAndIdNot`)

## Cadastro — Campo Telefone (opcional)

- [ ] **FN035** — Telefone vazio → aceito (campo opcional), sem erro, `POST` disparado sem telefone ou com telefone omitido
- [ ] **FN036** — Máscara telefone celular: digitar `11987654321` → exibe `(11) 98765-4321`
- [ ] **FN037** — Máscara telefone fixo: digitar `1133334444` → exibe `(11) 3333-4444`
- [ ] **FN038** — DDD inválido (ex.: `00` ou `20`) → "Use o formato (11) 99999-0000"
- [ ] **FN039** — Número com todos os dígitos repetidos (ex.: `(11) 99999-9999`) → erro de formato
- [ ] **FN040** — Celular sem o `9` inicial (10 dígitos com DDD válido mas não é fixo nem celular válido) → erro de formato, conforme regra de `validarTelefone`
- [ ] **FN041** — Telefone válido é aceito, erro removido

## Cadastro — Campo Cargo

- [ ] **FN042** — Cargo vazio + Salvar → "Preencha todos os campos obrigatórios."
- [ ] **FN043** — Cargo válido é aceito e enviado corretamente no payload

## Cadastro — Campo Estabelecimento

- [ ] **FN044** — Estabelecimento vazio ("Selecione…") + Salvar → "Preencha todos os campos obrigatórios."
- [ ] **FN045** — Select lista só os estabelecimentos que o usuário logado pode gerenciar (se perfil MEDICO, só os vinculados a ele — mesma lista do filtro FN014)

## Cadastro — Submissão

- [ ] **FN046** — Cadastro completo e válido → `POST /v1/api/funcionarios` com `201 Created`, modal fecha, novo funcionário aparece no topo da lista sem precisar recarregar a página
- [ ] **FN047** — Clique duplo em Salvar com formulário válido — verificar se dispara 1 ou mais de 1 `POST` na rede (a função `salvar()` não tem guard visível contra duplo submit como em outras telas; documentar se reproduzir o bug)
- [ ] **FN048** — Cancelar o modal de cadastro sem salvar não altera a listagem nem dispara requisição
- [ ] **FN049** — Fechar o modal (X ou clique fora) e reabrir "Novo Funcionário" reseta o formulário para vazio (não mantém dados do preenchimento anterior)
- [ ] **FN050** — Erro genérico do backend ao salvar (ex.: 500) exibe a mensagem dentro do modal, sem fechar sozinho, dados preservados

## Edição de funcionário

- [ ] **FN051** — Abrir "Editar" em um card pré-preenche nome, CPF (mascarado), e-mail, telefone (mascarado) e estabelecimento com os valores atuais
- [ ] **FN052** — Campo CPF fica `disabled` em modo edição (não pode trocar)
- [ ] **FN053** — Campo Estabelecimento fica `disabled` em modo edição (não pode trocar)
- [ ] **FN054** — Alterar só o nome e salvar → `PUT /v1/api/funcionarios/{id}` com o novo nome; card atualiza imediatamente sem precisar recarregar
- [ ] **FN055** — Alterar e-mail para um já usado por outro funcionário + Salvar → erro do backend "E-mail já cadastrado" exibido no modal, `PUT` bloqueado/rejeitado (esse caso o backend bloqueia, ao contrário do cadastro em FN034)
- [ ] **FN056** — Limpar o campo Telefone em edição (apagar um valor existente) e salvar → **comportamento conhecido do backend**: como o payload usa `telefone: form.telefone || undefined`, o campo some do corpo do `PUT` e o backend (`ModelMapper Conditions.isNotNull()`) mantém o valor antigo. Confirmar se reproduz (mesmo padrão já documentado em Serviços/Estabelecimento) — não é bug novo, é registrar a evidência
- [ ] **FN057** — Deixar Nome vazio em edição + Salvar → bloqueado com "Preencha todos os campos obrigatórios.", nenhum `PUT` disparado

## Inativação (soft delete)

- [ ] **FN058** — Clicar no ícone de lixeira de um funcionário ativo abre modal "Inativar Funcionário" com o texto de confirmação
- [ ] **FN059** — Confirmar inativação dispara `DELETE /v1/api/funcionarios/{id}` → `204 No Content`; card passa a exibir badge "Inativo" sem precisar recarregar
- [ ] **FN060** — Botão de lixeira de um funcionário já inativo aparece `disabled`
- [ ] **FN061** — Cancelar o modal de inativação não altera o status nem dispara requisição
- [ ] **FN062** — Não existe ação de "reativar" visível na UI para um funcionário inativo

## Restrição de acesso por perfil MEDICO (escopo por estabelecimento)

- [ ] **FN063** — Logado como MEDICO, o select de Estabelecimento (cadastro) e o filtro de Estabelecimento (listagem) mostram só os estabelecimentos vinculados a esse médico, nunca de outros médicos
- [ ] **FN064** — Logado como MEDICO, a listagem de funcionários (`GET /v1/api/funcionarios` sem filtro) retorna só funcionários dos estabelecimentos vinculados a esse médico
- [ ] **FN065** — Tentar cadastrar um funcionário informando (via manipulação direta da requisição, já que a UI não oferece a opção) um `estabelecimentoId` de um estabelecimento não vinculado ao médico logado → `403 Forbidden` ("Estabelecimento não vinculado ao médico")
- [ ] **FN066** — Tentar editar/inativar (via PUT/DELETE direto) um funcionário de um estabelecimento não vinculado ao médico logado → `403 Forbidden`

## Sessão / rede

- [ ] **FN067** — Sessão expirada (401 numa chamada de `/funcionarios`) redireciona para `/login`, sem tela em branco
- [ ] **FN068** — Rede lenta/timeout ao salvar não trava a UI indefinidamente; botão Salvar reflete o estado "Salvando…" até resolver

## Regressão / fluxo completo

- [ ] **FN069** — Fluxo completo: cadastrar um funcionário novo → editar (renomear) → inativar → estado final "Inativo" com os demais campos preservados
- [ ] **FN070** — Navegar para outra tela (ex.: "Médicos") e voltar para "Funcionários" via menu recarrega a listagem sem dados obsoletos
