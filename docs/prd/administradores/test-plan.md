# Test Plan — Tela de Administradores (`/administradores`)

> URL: `http://localhost:3001/administradores`
> Backends reais: `sgsm` core `:8080`, `sgsm-auth` `:8081` — sem mocks.
> Credencial principal (perfil `DESENVOLVEDOR`, único perfil com acesso a esta tela): `dev-local@sgsm.local` / `Dev088c00c5ba89!Aa`.
> Credencial secundária (perfil `MEDICO`, para os casos de restrição de acesso): `qa-medico-dedicado@teste.local` / `QaMedico123!` (conta dedicada de teste — a credencial antiga documentada aqui, `fabioeuro@gmail.com` / `famor966`, está com a senha desatualizada e retorna 401; não usar).
> Pré-requisito: banco de dev precisa ter as migrations `sgsm/V010__administrador.sql`, `ms-sboot-auth/V6__admin_estabelecimento_role.sql` **e `ms-sboot-auth/V7__fix_chk_tipo_perfil.sql`** aplicadas (schema `sgsm.administrador`/`sgsm.administrador_estabelecimento`, role `ADMIN_ESTABELECIMENTO` em `auth.role`, e a CHECK constraint `chk_tipo_perfil` incluindo `ADMIN_ESTABELECIMENTO`) — sem a V7, `POST /auth/registrar` com esse perfil quebra com 500 (bug real encontrado e corrigido nesta rodada de QA). Pré-requisito 2: pelo menos 2 estabelecimentos ativos cadastrados (para testar o modal de vínculo N:N com múltipla seleção) — hoje existem "Clinica São Lucas" e "Clinica Teste Strix".
> `sgsm.administrador` deve estar vazia antes de começar (estado atual confirmado) — os testes populam e limpam os próprios dados.

---

## Listagem — Carregamento inicial

- [x] **AD001** — Ao abrir `/administradores`, exibe spinner de carregamento e depois a grade de cards (ou `EmptyState`, se vazio)
- [x] **AD002** — Tabela/lista vazia (nenhum administrador cadastrado) exibe `EmptyState` ("Nenhum resultado encontrado"), não uma grade quebrada
- [x] **AD003** — Cada card mostra: nome, badge Ativo/Inativo, CPF, e-mail; telefone só aparece se preenchido (não quebra layout quando ausente)
- [x] **AD004** — Erro de rede/API ao listar (ex.: backend fora do ar) exibe banner de erro vermelho no topo, sem travar a tela em loading infinito
- [x] **AD005** — Hero exibe título "Administradores" e botão "Novo Administrador"

## Listagem — Busca (client-side)

- [x] **AD006** — Buscar por nome parcial filtra a grade em tempo real
- [x] **AD007** — Buscar por CPF (com ou sem pontuação) encontra o administrador (busca normaliza dígitos, mesmo padrão de Funcionários)
- [x] **AD008** — Buscar por e-mail (parcial) filtra corretamente
- [x] **AD009** — Busca é case-insensitive
- [x] **AD010** — Busca sem resultado exibe `EmptyState`
- [x] **AD011** — Limpar o campo de busca volta a exibir todos os administradores carregados

## Listagem — Filtro por Status

- [x] **AD012** — Filtro "Ativos" mostra só administradores com badge Ativo, dispara `GET /v1/api/administradores?ativo=true`
- [x] **AD013** — Filtro "Inativos" mostra só administradores com badge Inativo, dispara `GET ...?ativo=false`
- [x] **AD014** — Filtro "Todos os status" volta a mostrar ambos, sem o parâmetro `ativo`

## Cadastro — Campo Nome

- [x] **AD015** — Salvar com Nome vazio (demais campos válidos) → "Preencha todos os campos obrigatórios.", nenhum `POST` disparado
- [x] **AD016** — Nome só com espaços em branco → bloqueado como vazio (`form.nome.trim()`)
- [x] **AD017** — Nome válido é aceito e enviado corretamente (já `trim()`ado) no payload do `POST`

## Cadastro — Campo CPF

- [x] **AD018** — Máscara CPF: digitar `12345678909` → exibe `123.456.789-09`
- [x] **AD019** — CPF vazio (blur) + Salvar → "CPF obrigatório", `POST` não disparado
- [x] **AD020** — CPF com todos os dígitos iguais (ex.: `111.111.111-11`) → "CPF inválido"
- [x] **AD021** — CPF com dígito verificador inválido → "CPF inválido"
- [x] **AD022** — CPF válido (dígito verificador correto) → erro removido, aceito
- [x] **AD023** — CPF duplicado (já cadastrado em outro administrador) → erro do backend "CPF já cadastrado: ..." exibido no modal (`formError`), modal não fecha sozinho

## Cadastro — Campo E-mail

- [x] **AD024** — E-mail vazio (blur) + Salvar → "E-mail obrigatório", `POST` não disparado
- [x] **AD025** — E-mail em formato inválido (ex.: `abc123`) → "E-mail inválido"
- [x] **AD026** — E-mail válido é aceito, erro removido ao digitar novamente
- [x] **AD027** — E-mail duplicado (já cadastrado em outro administrador) → erro do backend "E-mail já cadastrado: ..." exibido no modal, `POST` de identidade não cria duplicata

## Cadastro — Campo Telefone (opcional)

- [x] **AD028** — Telefone vazio → aceito (campo opcional), sem erro, `POST` disparado sem telefone
- [x] **AD029** — Máscara telefone celular: digitar `11987654321` → exibe `(11) 98765-4321`
- [x] **AD030** — Máscara telefone fixo: digitar `1133334444` → exibe `(11) 3333-4444`
- [x] **AD031** — DDD inválido (ex.: `00` ou `20`) → "Use o formato (11) 99999-0000"
- [x] **AD032** — Telefone válido é aceito, erro removido

## Cadastro — Campo Senha (login de acesso) — fluxo composto, não óbvio

> Este campo só existe na criação (não aparece editando). Ao salvar, a tela dispara **duas** chamadas de API em sequência: `POST /v1/api/administradores` (identidade, backend `sgsm`) e, se bem-sucedida, `POST /v1/api/auth/registrar` (login, backend `sgsm-auth`) com `tipoPerfil: ADMIN_ESTABELECIMENTO` e `referenciaId` = id retornado no passo 1.

- [x] **AD033** — Campo "Senha de acesso" não aparece no modal de edição, só no de criação
- [x] **AD034** — Senha vazia (blur) + Salvar → "Senha obrigatória (mínimo 8 caracteres)", nenhum `POST` disparado
- [x] **AD035** — Senha com 7 caracteres → mesmo erro de mínimo, bloqueado
- [x] **AD036** — Senha com 8+ caracteres → aceita, erro removido
- [x] **AD037** — Cadastro completo e válido → `POST /v1/api/administradores` (201) seguido de `POST /v1/api/auth/registrar` (201) na aba Rede; modal fecha; card aparece na listagem — confirmado após a correção da V7 (CHECK constraint)
- [x] **AD038** — **Edge case crítico**: cadastrar administrador com e-mail que já existe como login em OUTRO perfil (ex.: um e-mail que já é `PACIENTE`) → passo 1 (`POST /v1/api/administradores`) tem sucesso (email só precisa ser único dentro de `sgsm.administrador`, não entre perfis), mas passo 2 (`POST /v1/api/auth/registrar`) falha com "usuário já existe" → toast de erro "Administrador criado, mas o login não pôde ser gerado: ...", modal fecha mesmo assim, e o registro `Administrador` **fica órfão** (existe em `sgsm.administrador` mas sem login algum) — confirmar visualmente que o card aparece na listagem normalmente, sem indicação nenhuma de que o login falhou (a não ser o toast que já sumiu)
- [x] **AD039** — Após o cenário AD038 (login órfão), tentar cadastrar novamente um administrador com o mesmo CPF → bloqueado em AD023 (CPF duplicado), confirmando que não há como "tentar de novo" pela mesma tela sem trocar CPF/e-mail — documentar se existe algum caminho de recuperação na UI (não deveria haver; é limitação conhecida)

## Cadastro — Submissão

- [x] **AD040** — Clique duplo em Salvar com formulário válido — verificar se dispara 1 ou mais de 1 par de `POST`s na rede (`salvandoRef` deveria bloquear o segundo clique)
- [x] **AD041** — Cancelar o modal de cadastro sem salvar não altera a listagem nem dispara requisição
- [x] **AD042** — Fechar o modal (X ou clique fora) e reabrir "Novo Administrador" reseta o formulário para vazio, incluindo o campo Senha
- [x] **AD043** — Erro genérico do backend ao salvar (ex.: 500) exibe a mensagem dentro do modal, sem fechar sozinho, dados preenchidos preservados

## Edição de administrador

- [x] **AD044** — Abrir "Editar" em um card pré-preenche nome, CPF (mascarado, `disabled`), e-mail, telefone (mascarado) — sem campo Senha
- [x] **AD045** — Campo CPF fica `disabled` em modo edição (não pode trocar)
- [x] **AD046** — Alterar só o nome e salvar → `PUT /v1/api/administradores/{id}` com o novo nome; card atualiza imediatamente sem precisar recarregar
- [x] **AD047** — Alterar e-mail para um já usado por outro administrador + Salvar → erro do backend "E-mail já cadastrado" exibido no modal, `PUT` rejeitado
- [x] **AD048** — Deixar Nome vazio em edição + Salvar → bloqueado com "Preencha todos os campos obrigatórios.", nenhum `PUT` disparado

## Inativação (soft delete) e Reativação

- [x] **AD049** — Clicar no ícone de lixeira de um administrador ativo abre modal "Inativar Administrador" com o texto de confirmação
- [x] **AD050** — Confirmar inativação dispara `DELETE /v1/api/administradores/{id}` → `204 No Content`; card passa a exibir badge "Inativo" e botão "Reativar" no lugar da lixeira, sem precisar recarregar
- [x] **AD051** — Cancelar o modal de inativação não altera o status nem dispara requisição
- [x] **AD052** — Clicar em "Reativar" num administrador inativo dispara `PATCH /v1/api/administradores/{id}/reativar` → card volta a badge "Ativo" e botão lixeira, sem recarregar
- [x] **AD053** — Botão "Reativar" mostra estado de carregando (ícone girando) e fica `disabled` durante a chamada, evitando duplo clique

## Modal — Estabelecimentos administrados (vínculo N:N)

- [x] **AD054** — Clicar no ícone de prédio de um card abre o modal "Estabelecimentos — {nome}", com spinner de carregamento inicial
- [x] **AD055** — Modal lista todos os estabelecimentos ativos, com checkbox marcado nos já vinculados (`GET /v1/api/administradores/{id}/estabelecimentos`) e desmarcado nos demais
- [x] **AD056** — Marcar um checkbox não-vinculado e desmarcar um vinculado, depois Salvar → `PUT /v1/api/administradores/{id}/estabelecimentos` com a lista completa atualizada (`estabelecimentoIds`); modal fecha
- [x] **AD057** — Reabrir o modal do mesmo administrador após salvar reflete o novo estado dos vínculos (persistência confirmada, não é só otimismo local)
- [x] **AD058** — Administrador sem nenhum estabelecimento vinculado ainda: abrir modal mostra todos os checkboxes desmarcados, sem erro
- [x] **AD059** — Desmarcar TODOS os checkboxes e salvar → `PUT` com `estabelecimentoIds: []`, remove todos os vínculos sem erro
- [x] **AD060** — Cancelar o modal sem salvar não altera os vínculos nem dispara requisição
- [x] **AD061** — Se não houver nenhum estabelecimento ativo no sistema, modal exibe "Nenhum estabelecimento ativo cadastrado." em vez de lista vazia quebrada
- [x] **AD062** — Erro de rede ao salvar vínculos exibe mensagem de erro dentro do modal, modal não fecha sozinho

## Restrição de acesso por perfil (DESENVOLVEDOR-only) — não óbvio, crítico

> Diferente das outras telas do sistema (escopadas por estabelecimento), `/administradores/**` é bloqueada no backend para **qualquer perfil que não seja DESENVOLVEDOR**, sem exceção — nem `ADMIN_ESTABELECIMENTO` tem acesso a esta rota (só pode gerenciar a própria identidade, não criar outras).

- [x] **AD063** — Logado como `MEDICO` (`qa-medico-dedicado@teste.local`), o item "Administradores" **não aparece** no menu lateral — confirmado, `nav a:has-text("Administradores")` não visível
- [x] **AD064** — Logado como `MEDICO`, navegar manualmente para `http://localhost:3001/administradores` pela URL — **confirmado o bug de UX documentado**: a página carrega normalmente (hero, filtros, botão "Novo Administrador"), a chamada `GET /v1/api/administradores` retorna `403 Forbidden`, e a tela reage mostrando "Request failed with status code 403" seguido de `EmptyState` ("Nenhum resultado encontrado") — mensagem de erro crua da API, não uma mensagem amigável de "acesso negado"
- [x] **AD065** — Ainda como `MEDICO` na URL direta, abrir o modal "Novo Administrador" e salvar → `POST /v1/api/administradores` retorna `403 Forbidden`, confirmado no log de rede
- [x] **AD066** — Deslogar e tentar acessar `/administradores` sem sessão → redireciona para `/login` (mesmo comportamento de qualquer rota protegida)

## Sessão / rede

- [x] **AD067** — Sessão expirada (401 numa chamada de `/administradores`) aciona o refresh automático (`refreshAccessToken`) e repete a requisição; se o refresh também falhar, redireciona para `/login`, sem tela em branco
- [x] **AD068** — Rede lenta/timeout ao salvar não trava a UI indefinidamente; botão Salvar reflete o estado "Salvando…" até resolver

## Regressão / fluxo completo

- [x] **AD069** — Fluxo completo: cadastrar um administrador novo (com senha) → vincular a 2 estabelecimentos → editar (renomear) → desvincular 1 estabelecimento → inativar → reativar → estado final "Ativo" com nome novo e só 1 estabelecimento vinculado — confirmado (a sub-etapa de login real está coberta separadamente em AD071, após a correção da V7)
- [x] **AD070** — Navegar para outra tela (ex.: "Estabelecimentos") e voltar para "Administradores" via menu recarrega a listagem sem dados obsoletos
- [x] **AD071** — Confirmado end-to-end: logout do DESENVOLVEDOR → login real com e-mail/senha de um administrador recém-criado (JWT emitido com `perfil: ADMIN_ESTABELECIMENTO`) → sidebar esconde "Administradores" e mostra os mesmos itens de FUNCIONARIO (Pacientes, Médicos, Estabelecimentos, Serviços, Agendamentos, Funcionários, Assistente IA, CRM) → `GET /v1/api/estabelecimentos` retorna **só** o estabelecimento vinculado a ele ("Clinica São Lucas"), não retorna "Clinica Teste Strix" — prova real do escopo por estabelecimento funcionando ponta-a-ponta
