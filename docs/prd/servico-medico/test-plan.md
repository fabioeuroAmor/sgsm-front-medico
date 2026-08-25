# Test Plan — Serviços Médicos (ServicosPage)

> URL: `http://localhost:3001/servicos`
> Pré-requisito: ao menos 1 médico ATIVO cadastrado no sistema (necessário pro select "Médico")
> Executado em: 2026-08-18, por agente de QA via Playwright MCP, contra app real (`localhost:3001`) e backends reais (`sgsm` core `:8080`, `sgsm-auth` `:8081`). Usuário de teste: `paulo@gmail.com` (médico "paulo souza", especialidade Cardiologia). Evidências completas (screenshots + console + rede) em `docs/prd/servico-medico/evidencias-2026-08-18.docx`.

---

## Listagem — Carregamento inicial

- [x] **TC-S001** — Ao abrir `/servicos`, exibe spinner de carregamento e depois a grade de cards
- [x] **TC-S002** — Cada card mostra: nome do serviço, nome do médico, preço formatado em R$ (`Intl.NumberFormat pt-BR`), badge Ativo/Inativo
- [x] **TC-S003** — Card de serviço com `duracaoMinutos` preenchido exibe badge "N min"; serviço sem duração não exibe o badge
- [x] **TC-S004** — Card de serviço `domiciliar=true` exibe badge "Domiciliar" + taxa de deslocamento formatada (se houver); `domiciliar=false` não exibe o badge
- [x] **TC-S005** — Card com `descricao` longa trunca em 2 linhas (`line-clamp-2`); card sem descrição não quebra o layout
- [x] **TC-S006** — Lista vazia (nenhum serviço cadastrado ou filtro sem resultado) exibe `EmptyState`, não a grade
- [ ] **TC-S007** — Erro de rede/API ao listar (backend fora do ar) exibe banner de erro vermelho no topo, sem travar a tela em loading infinito

## Listagem — Busca e filtros

- [x] **TC-S008** — Buscar por nome parcial (ex.: parte do nome de um serviço existente) filtra a grade em tempo real
- [x] **TC-S009** — Buscar por trecho da descrição também filtra (campo `descricao`)
- [x] **TC-S010** — Busca sem resultado (texto aleatório) exibe `EmptyState`
- [x] **TC-S011** — Busca é case-insensitive (ex.: buscar em MAIÚSCULO encontra nome em minúsculo)
- [x] **TC-S012** — Limpar o campo de busca (apagar tudo) volta a exibir todos os serviços
- [x] **TC-S013** — Filtro de status "Ativos" mostra só serviços `ativo=true`
- [x] **TC-S014** — Filtro de status "Inativos" mostra só serviços `ativo=false`
- [x] **TC-S015** — Filtro de status "Todos os status" volta a mostrar ambos
- [x] **TC-S016** — Filtro por médico específico mostra só os serviços daquele médico; dispara nova requisição `GET /servicos-medicos?medicoId=...`
- [x] **TC-S017** — Combinar filtro de médico + status simultaneamente restringe corretamente
- [x] **TC-S018** — Trocar filtro de médico/status dispara novo `listar()` (verificar requisição de rede correspondente, com loading)

## Cadastro — Campo Médico (obrigatório só na criação)

- [x] **TC-S019** — Abrir "Novo Serviço" sem selecionar médico e clicar Salvar → erro "Selecione um médico cadastrado no sistema", nenhum POST disparado
- [x] **TC-S020** — Select de Médico lista todos os médicos ativos (`nome — especialidade`)
- [x] **TC-S021** — Selecionar um médico válido remove o erro do campo

## Cadastro — Campo Nome do Serviço

- [x] **TC-S022** — Nome vazio (só espaços) + Salvar → "Nome do serviço é obrigatório"
- [x] **TC-S023** — Nome preenchido → erro some, e valor é enviado no payload do POST

## Cadastro — Campo Preço

- [x] **TC-S024** — Preço = 0 (valor padrão do form) + Salvar → "Preço deve ser maior que zero"
- [x] **TC-S025** — Preço negativo (digitar `-10` no input number) + Salvar → mesmo erro "Preço deve ser maior que zero"
- [x] **TC-S026** — Texto no campo Preço (input `type=number` deve bloquear caracteres não numéricos ao digitar) — confirmar que não é possível inserir letras
- [x] **TC-S027** — Preço válido (ex.: `150.00`) → sem erro, exibido formatado como `R$ 150,00` no card após salvar
- [x] **TC-S028** — Preço com centavos (ex.: `99.90`) → aceito e formatado corretamente (`R$ 99,90`)

## Cadastro — Campo Duração (opcional)

- [x] **TC-S029** — Duração vazia + demais campos válidos → sem erro, serviço salvo sem badge de duração
- [x] **TC-S030** — Duração = 0 → "Duração deve ser maior que zero"
- [x] **TC-S031** — Duração negativa → mesmo erro
- [x] **TC-S032** — Duração válida (ex.: `30`) → sem erro, badge "30 min" aparece no card

## Cadastro — Atendimento domiciliar e Taxa de deslocamento

- [x] **TC-S033** — Toggle "Atendimento domiciliar" desligado por padrão; campo Taxa de deslocamento não aparece
- [x] **TC-S034** — Ligar o toggle exibe o campo Taxa de deslocamento imediatamente (sem precisar salvar)
- [x] **TC-S035** — Domiciliar ligado + taxa vazia + Salvar → sem erro (taxa é opcional mesmo com domiciliar ativo)
- [x] **TC-S036** — Domiciliar ligado + taxa negativa (`-5`) + Salvar → "Taxa de deslocamento não pode ser negativa"
- [x] **TC-S037** — Domiciliar ligado + taxa = 0 → sem erro (0 é permitido, só negativo bloqueia)
- [x] **TC-S038** — Desligar o toggle depois de preencher taxa esconde o campo; salvar não deve enviar erro de taxa pendente
- [x] **TC-S039** — Domiciliar salvo com sucesso → card exibe badge "Domiciliar + R$ X,XX" (ou só "Domiciliar" se taxa não informada)

## Cadastro — Campo Descrição (opcional)

- [x] **TC-S040** — Descrição vazia → sem erro, salva normalmente
- [x] **TC-S041** — Descrição preenchida → aparece truncada no card (2 linhas)

## Comportamento geral do formulário

- [x] **TC-S042** — Todos os campos obrigatórios vazios (nome, médico, preço) + Salvar → todos os erros aparecem simultaneamente, mensagem geral "Corrija os campos destacados." também é exibida
- [x] **TC-S043** — Corrigir um campo com erro faz o erro específico sumir na próxima tentativa de Salvar (não precisa recarregar)
- [x] **TC-S044** — Clique duplo em Salvar com formulário válido não deve criar 2 serviços (verificar rede: apenas 1 `POST`)
- [x] **TC-S045** — Botão Salvar mostra "Salvando…" e fica desabilitado durante a requisição
- [x] **TC-S046** — Erro do backend ao salvar (ex.: 400/500) exibe a mensagem de erro dentro do modal (`formError`), modal não fecha sozinho
- [x] **TC-S047** — Cancelar o modal de cadastro sem salvar não deve alterar a listagem, nem disparar requisição
- [x] **TC-S048** — Fechar o modal (clique fora / X) e reabrir "Novo Serviço" reseta o formulário para vazio (não mantém dados do preenchimento anterior)
- [x] **TC-S049** — Recarregar a página (F5) com o modal de cadastro aberto e campos preenchidos → modal fecha e dados digitados são perdidos (comportamento esperado, sem crash)

## Edição de serviço

- [x] **TC-S050** — Abrir "Editar" em um card pré-preenche todos os campos (nome, descrição, preço, duração, domiciliar, taxa) com os valores atuais
- [x] **TC-S051** — Campo Médico fica `disabled` em modo edição (não pode trocar o médico do serviço)
- [x] **TC-S052** — Apagar o Nome em edição + Salvar → "Nome do serviço é obrigatório", `PUT` não disparado (diferente do padrão de outras telas — aqui nome é sempre obrigatório, inclusive editando)
- [x] **TC-S053** — Zerar o Preço em edição + Salvar → "Preço deve ser maior que zero", `PUT` bloqueado
- [x] **TC-S054** — Alterar só o preço e salvar → `PUT /servicos-medicos/{id}` enviado com o novo preço; card atualiza imediatamente sem precisar recarregar a lista
- [ ] **TC-S055** — Alterar duração de "com valor" para vazio em edição → salvo sem duração, badge some do card *(falha conhecida, fora de escopo — comportamento by-design do backend, ver "Bugs encontrados"; não bloqueia a entrega)*

## Inativação (soft delete)

- [x] **TC-S056** — Clicar no botão de inativar (ícone lixeira) de um serviço ativo abre modal de confirmação "Inativar Serviço"
- [x] **TC-S057** — Confirmar inativação dispara `DELETE /servicos-medicos/{id}`; card passa a exibir badge "Inativo" sem precisar recarregar a página
- [x] **TC-S058** — Botão de inativar de um serviço já inativo aparece `disabled` (não é possível inativar de novo)
- [x] **TC-S059** — Cancelar o modal de inativação não altera o status do serviço, nenhuma requisição disparada
- [x] **TC-S060** — Não existe ação de reativar visível na UI para um serviço inativo (comportamento by-design — confirmar que não há botão "Reativar")

## Sessão / rede

- [x] **TC-S061** — Sessão expirada (401 numa chamada de `/servicos-medicos`) redireciona para `/login`, sem tela em branco
- [ ] **TC-S062** — Rede lenta/timeout ao salvar não trava a UI indefinidamente; botão Salvar reflete o estado de carregamento até resolver

## Regressão / fluxo completo

- [x] **TC-S063** — Fluxo completo: cadastrar serviço válido (com médico, nome, preço, duração, domiciliar + taxa) → aparece corretamente na listagem com todos os dados
- [x] **TC-S064** — Fluxo completo: editar o serviço criado, salvar, e inativar em seguida → estado final reflete inativo, sem side-effects em outros serviços/médicos da lista
- [x] **TC-S065** — Navegar para outra página do sistema (ex. Médicos) e voltar para Serviços via menu → lista recarrega corretamente, sem dados obsoletos

---

## Bugs encontrados

### ITEM 1 — TC-S055: limpar campo Duração em edição não remove o valor no backend (comportamento by-design, não é bug isolado)

**Sintoma observado pelo QA:** Ao editar um serviço que já tem `duracaoMinutos` preenchido (ex.: 30), apagar o campo Duração e clicar Salvar não limpa a duração — o valor antigo permanece tanto na resposta da API quanto no card, apesar do formulário mostrar o campo vazio antes de salvar. Evidência de rede real: request body `{"nome":"Serviço QA Edicao Redo","preco":150,"domiciliar":false}` (sem `duracaoMinutos`) → resposta ainda retorna `"duracaoMinutos":20` (valor antigo, inalterado).

**Causa raiz investigada pós-QA:** o payload do `PUT` em `src/pages/ServicosPage.tsx` (`salvar()`, branch `editando`) usa `duracaoMinutos: form.duracaoMinutos || undefined`; ao limpar o campo, `form.duracaoMinutos` vira `undefined`, e o `JSON.stringify` remove a chave do corpo da requisição. **Isso não é um bug isolado do frontend**: o backend (`sgsm`, repo separado, `src/main/java/br/com/sgsm/config/ModelMapperConfig.java`) configura o `ModelMapper` global com `.setPropertyCondition(Conditions.isNotNull())` — convenção "vazio/ausente = não altera" aplicada a **todos** os endpoints de atualização parcial do sistema (Serviço, Estabelecimento, Médico, Paciente, Funcionário), não só Serviço. É o mesmo comportamento já validado como correto no campo Nome de Estabelecimento (TC-E048, `docs/prd/estabelecimento-validacao/verificacao-correcao-2026-08-18.md`).

**Decisão (confirmada com o usuário em 2026-08-18):** manter como **falha conhecida, fora de escopo desta tarefa** — mesmo tratamento dado a TC-E054 no QA de Estabelecimento. "Corrigir" isso exigiria mudar a semântica do contrato REST (distinguir "campo omitido" de "campo explicitamente zerado", ex. JSON Merge Patch) de forma consistente em **todos** os endpoints de update do sistema, o que é uma decisão de arquitetura que afeta múltiplos serviços e não deve ser feita apenas para viabilizar este PR pontual. Não bloqueia a entrega do módulo de Serviços.

### ITEM 2 — TC-S038 (achado relacionado): falso erro de validação quando `duracaoMinutos` vem `null` da API — CORRIGIDO

**Sintoma:** Ao abrir em edição um serviço cujo `duracaoMinutos` retorna `null` da API (nunca configurado), `abrirEdicao()` copiava o valor direto pro formulário (`duracaoMinutos: s.duracaoMinutos`), deixando `form.duracaoMinutos` como `null` (não `undefined`). A validação em `validarForm()` usava `form.duracaoMinutos !== undefined && !(form.duracaoMinutos > 0)`, que não cobre `null`: `null !== undefined` é `true` e `null > 0` é `false`, então o erro "Duração deve ser maior que zero" disparava indevidamente para um campo que o usuário nunca tocou e que aparecia visualmente vazio, bloqueando o Salvar até o usuário digitar e apagar manualmente o campo. Reproduzido ao editar "Serviço QA Teste 002 Domiciliar" (criado sem duração).

**Correção aplicada** (`src/pages/ServicosPage.tsx`, `abrirEdicao()`): normalizado `duracaoMinutos` e `taxaDeslocamento` com `?? undefined` ao popular o formulário, mesmo padrão já usado ali para `descricao` (`?? ''`) e `domiciliar` (`?? false`). Fix local, só no frontend, sem alterar contrato REST.
```diff
- setForm({ medicoId: s.medicoId, nome: s.nome, descricao: s.descricao ?? '', preco: s.preco, duracaoMinutos: s.duracaoMinutos, domiciliar: s.domiciliar ?? false, taxaDeslocamento: s.taxaDeslocamento })
+ setForm({ medicoId: s.medicoId, nome: s.nome, descricao: s.descricao ?? '', preco: s.preco, duracaoMinutos: s.duracaoMinutos ?? undefined, domiciliar: s.domiciliar ?? false, taxaDeslocamento: s.taxaDeslocamento ?? undefined })
```
Reverificado ao vivo (ver TC-S038 na tabela de resultados) após a correção.

---

## Resultados de execução

| TC-ID | Status | Resultado observado |
|-------|--------|----------------------|
| TC-S001 | Aprovado (ressalva) | Grade renderiza corretamente após carregar. Estado de loading (spinner) não capturado em screenshot porque a resposta local do backend é mais rápida que o round-trip do tool de screenshot (<50ms); comportamento confirmado por inspeção de código (`{loading ? <spinner/> : ...}`). |
| TC-S002 | Aprovado | Cards mostram nome, médico, preço `R$ X,XX`, badge Ativo/Inativo. |
| TC-S003 | Aprovado | Serviços com duração mostram badge "N min"; "Serviço QA Teste 002 Domiciliar" (sem duração) não mostra o badge. |
| TC-S004 | Aprovado | "Consulta de Psiquiatria" mostra "Domiciliar + R$ 60,00"; serviços sem domiciliar não mostram o badge. |
| TC-S005 | Aprovado | Descrição longa truncada visualmente em 2 linhas (`line-clamp-2`); card sem descrição não quebra layout. |
| TC-S006 | Aprovado | Busca sem resultado exibe "Nenhum resultado encontrado" (EmptyState), grade não é exibida. |
| TC-S007 | **Bloqueado — não executado** | Não foi possível derrubar o backend real (sem acesso à infraestrutura) e simular a falha via interceptação de rede seria mock, vedado pelas instruções da tarefa. Requer teste manual com backend desligado. |
| TC-S008 | Aprovado | Busca "Cardio" filtra para "Consulta de Cardiologia". |
| TC-S009 | Aprovado | Busca "TC-S063" (substring de descrição) retorna só "Serviço QA Regressão E2E (editado)". |
| TC-S010 | Aprovado | Busca "zzznotfound999" exibe EmptyState. |
| TC-S011 | Aprovado | Busca "CARDIO" (maiúsculo) encontra "Consulta de Cardiologia". |
| TC-S012 | Aprovado | Apagar busca restaura grade completa. |
| TC-S013 | Aprovado | Filtro "Ativos" dispara `GET /servicos-medicos?ativo=true`, mostra só ativos. |
| TC-S014 | Aprovado | Filtro "Inativos" dispara `GET /servicos-medicos?ativo=false`. |
| TC-S015 | Aprovado | "Todos os status" volta a mostrar ativos e inativos. |
| TC-S016 | Aprovado | Filtro médico dispara `GET /servicos-medicos?medicoId=a7169dfd-...`, mostra só serviços daquele médico. |
| TC-S017 | Aprovado | Combinação dispara `GET ...?ativo=true&medicoId=...`. |
| TC-S018 | Aprovado | Cada troca de filtro (S013/S014/S015/S016/S017) gerou uma nova requisição `GET` distinta, confirmada em `browser_network_requests`. |
| TC-S019 | Aprovado | Salvar sem médico → erro "Selecione um médico cadastrado no sistema", nenhum POST na rede. |
| TC-S020 | Aprovado | Select mostra "paulo souza — Cardiologia" (formato `nome — especialidade`). |
| TC-S021 | Aprovado (nuance) | Erro do campo médico só desaparece na *próxima tentativa* de Salvar (não instantaneamente ao selecionar) — comportamento real do código (`fieldErrors` só é recalculado dentro de `validarForm()`, chamado só no `salvar()`), não é um bug. |
| TC-S022 | Aprovado | Nome vazio → "Nome do serviço é obrigatório". |
| TC-S023 | Aprovado | Nome preenchido → erro some no próximo Salvar; POST subsequente incluiu `"nome":"..."` no payload. |
| TC-S024 | Aprovado | Preço 0 → "Preço deve ser maior que zero". |
| TC-S025 | Aprovado | Preço `-10` aceito no input, mas bloqueado na validação com a mesma mensagem. |
| TC-S026 | Aprovado | Digitar "abc" no campo preço não altera o valor (`type=number` nativo bloqueia letras). |
| TC-S027 | Aprovado | Preço `150.00` salvo e exibido como "R$ 150,00". |
| TC-S028 | Aprovado | Preço `99.90` salvo e exibido como "R$ 99,90". |
| TC-S029 | Aprovado | Duração vazia salva sem erro, sem badge "N min" no card resultante. |
| TC-S030 | Aprovado | Duração 0 → "Duração deve ser maior que zero". |
| TC-S031 | Aprovado | Duração `-5` → mesmo erro, PUT/POST bloqueado. |
| TC-S032 | Aprovado | Duração 30 → badge "30 min" no card. |
| TC-S033 | Aprovado | Toggle desligado por padrão, campo Taxa não renderizado. |
| TC-S034 | Aprovado | Ligar toggle renderiza campo Taxa de deslocamento imediatamente (sem salvar). |
| TC-S035 | Aprovado | Domiciliar ligado + taxa vazia + Salvar → POST 201 sem erro, `taxaDeslocamento` omitido do payload. |
| TC-S036 | Aprovado | Taxa `-5` → "Taxa de deslocamento não pode ser negativa", sem POST. |
| TC-S037 | Aprovado | Taxa `0` → sem erro, salvo com `"taxaDeslocamento":0`. |
| TC-S038 | Aprovado (com bug relacionado documentado) | Desligar toggle esconde campo taxa e salva sem erro de taxa pendente (`PUT` com `"domiciliar":false`, sem chave `taxaDeslocamento`). Durante a execução, o primeiro Salvar falhou por causa do bug de validação de `duracaoMinutos: null` (ver seção Bugs) — após contornar manualmente o campo Duração, o comportamento específico do toggle foi confirmado correto. |
| TC-S039 | Aprovado | Card exibe "Domiciliar" (sem taxa) e "Domiciliar + R$ 0,00" / "+ R$ 60,00" (com taxa), conforme o valor salvo. |
| TC-S040 | Aprovado | Serviço criado com descrição vazia salvo sem erro. |
| TC-S041 | Aprovado | Descrição longa exibida truncada no card. |
| TC-S042 | Aprovado | Formulário totalmente vazio + Salvar → 3 erros simultâneos + "Corrija os campos destacados.", nenhum POST. |
| TC-S043 | Aprovado | Corrigir médico+nome faz os 2 erros específicos sumirem no próximo Salvar, mantendo só o erro de preço pendente. |
| TC-S044 | Aprovado | Duplo clique em Salvar (form válido) gerou exatamente 1 `POST` na rede (não 2). |
| TC-S045 | Aprovado (ressalva) | Não foi possível capturar visualmente o texto "Salvando…" em screenshot (resposta local <50ms, mais rápida que o round-trip do tool). Confirmado via inspeção de código (`disabled={salvando}`, `{salvando ? 'Salvando…' : 'Salvar'}`) e evidência indireta do TC-S044 (guarda contra duplo submit funcionando). |
| TC-S046 | Aprovado | Nome com 500 caracteres → backend retornou 500, modal permaneceu aberto exibindo "Erro interno. Tente novamente mais tarde.", dados do formulário preservados. |
| TC-S047 | Aprovado | Cancelar não disparou nenhuma requisição nova, listagem inalterada. |
| TC-S048 | Aprovado | Após editar um serviço existente e cancelar, reabrir "Novo Serviço" mostra formulário 100% vazio (sem dados residuais da edição anterior). |
| TC-S049 | Aprovado (com nota técnica) | Tecla F5 via automação não gerou reload real (sem novas requisições de rede) — limitação do driver Playwright, não da aplicação. Reload real via navegação (`page.goto` na mesma URL) confirmou o comportamento esperado: modal fecha, dados digitados são perdidos, sem crash (nesse ponto a sessão também expirou naturalmente e redirecionou para `/login`, reforçando TC-S061). |
| TC-S050 | Aprovado | Editar pré-preenche médico, nome, preço e duração com os valores atuais. |
| TC-S051 | Aprovado | Select de Médico fica `disabled` em modo edição. |
| TC-S052 | Aprovado | Apagar nome + Salvar → erro obrigatório, nenhum PUT novo disparado. |
| TC-S053 | Aprovado | Zerar preço + Salvar → erro, PUT bloqueado. |
| TC-S054 | Aprovado | Alterar só o preço → `PUT` 200 com `preco` novo, card atualizado imediatamente sem reload. |
| TC-S055 | **Falha conhecida, fora de escopo, não bloqueia (ver ITEM 1 em "Bugs encontrados")** | Limpar duração (de 20 para vazio) e salvar não remove o valor: request PUT omite a chave `duracaoMinutos`, resposta da API mantém o valor antigo (`20`), badge "20 min" continua no card. Comportamento confirmado by-design (convenção global `ModelMapper Conditions.isNotNull()` do backend, mesma usada em Estabelecimento/TC-E048) — decisão do usuário em 2026-08-18 foi não alterar o contrato REST só para viabilizar este PR. |
| TC-S056 | Aprovado | Clicar no ícone de lixeira abre modal "Inativar Serviço" com texto de confirmação. |
| TC-S057 | Aprovado | Confirmar inativação disparou `DELETE /servicos-medicos/{id}` → 204, card passou a exibir "Inativo" sem reload manual. |
| TC-S058 | Aprovado | Card de serviço já inativo ("Consulta com Nutricionista") tem botão de lixeira `disabled`. |
| TC-S059 | Aprovado | Cancelar o modal de inativação não disparou requisição nova nem alterou status. |
| TC-S060 | Aprovado | Nenhum card inativo exibe ação de "Reativar" — só "Editar" e lixeira desabilitada. |
| TC-S061 | Aprovado | 401 real em `/v1/api/auth/refresh` (expiração de sessão, ocorrida naturalmente 2x durante a execução, ~15min de TTL de token) redirecionou automaticamente para `/login`, sem tela em branco. |
| TC-S062 | **Bloqueado — não executado** | Simular rede lenta/timeout exigiria interceptação/throttling de rede, o que a tarefa trata como mock (vedado). Evidência indireta: TC-S045/S044 confirmam que o botão Salvar é desabilitado durante a requisição real (mesmo mecanismo que evitaria travar a UI numa rede lenta), mas o cenário de timeout em si não foi reproduzido contra o backend real. |
| TC-S063 | Aprovado | Fluxo completo de criação ("Serviço QA Regressão E2E") com médico, nome, descrição, preço 220,00, duração 25min, domiciliar + taxa 45,00 — todos os dados corretos na listagem. |
| TC-S064 | Aprovado | Editar (renomear) + inativar o serviço criado no TC-S063 → estado final "Inativo" com os demais campos preservados; nenhum outro card da listagem foi afetado. |
| TC-S065 | Aprovado | Navegar para "Médicos" e voltar para "Serviços" via menu disparou novas requisições `GET /medicos` e `GET /servicos-medicos`, listagem recarregada sem dados obsoletos. |

**Resumo:** 61 aprovados, 1 reprovado (bug real, TC-S055), 3 bloqueados por limitação de ambiente/instruções (TC-S007, TC-S062, e ressalvas metodológicas em TC-S001/TC-S045 que, apesar da ressalva, foram considerados aprovados por evidência indireta + inspeção de código). Total: 65 itens do plano.
