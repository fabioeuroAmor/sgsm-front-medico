# QA Results — Tela de Funcionários (`/funcionarios`)

Execução ao vivo via Playwright MCP contra o app real em `http://localhost:3001`, backends reais `sgsm` (`:8080`) e `sgsm-auth` (`:8081`), sem mocks. Login de teste principal: `fabioeuro@gmail.com` / `famor966` (perfil `MEDICO`, vinculado ao estabelecimento "Clinica São Lucas" — pré-requisito do select de Estabelecimento já satisfeito, nenhuma associação extra foi necessária).

Evidências em `docs/prd/funcionarios/evidence/<id>.png` (print) e `docs/prd/funcionarios/evidence/<id>.log` (console/rede), salvas por item. Quando um único print/log cobre mais de um item do plano (ex.: campos `disabled` de CPF e Estabelecimento visíveis na mesma tela de edição), o nome do arquivo combina os IDs (ex.: `FN051-FN052-FN053.png`), seguindo o padrão já usado no QA de Médicos.

Dados de teste: todos os funcionários criados usam o prefixo "QA" no nome ou no cargo (exceto os testes de campo isolado, que reaproveitam registros "QA" já criados). Nenhum dos 4 funcionários pré-existentes antes do início do QA (Lucas Ruela, Zenilda, Teste QA, Dr. Regressão TC20) foi apagado — dois deles (Lucas Ruela, Zenilda) foram usados para os testes de edição (FN051–FN057) e tiveram nome/e-mail alterados de volta ao original ao final dos testes correspondentes, exceto o nome de Lucas Ruela que ficou como "Lucas Ruela Editado" (evidência intencional de FN054).

## Rodada 2 — reteste pós-correções

Após a rodada 1 (60 aprovados / 5 reprovados / 1 parcial / 4 bloqueados), correções foram aplicadas (fora deste QA) para os 5 itens reprovados — 1 no backend (`sgsm`) e 4 no front-end (`sgsm-front-medico`). Cada um foi re-executado ao vivo contra a aplicação real (`http://localhost:3001`) e os backends reais `sgsm` (`:8080`) e `sgsm-auth` (`:8081`), sem mocks, com novas evidências (sufixo `-retest` nos arquivos em `evidence/`):

- **FN034** (e-mail duplicado no cadastro) — confirmado corrigido no backend: `FuncionarioService.cadastrar()` (`C:\AmbienteDev\sgsm\src\main\java\br\com\sgsm\service\FuncionarioService.java`, linhas 53–55) agora chama `repository.existsByEmail(request.email())`. Repetindo a mesma reprodução (novo CPF, e-mail já usado por outro funcionário), `POST` retornou `400 Bad Request` ("E-mail já cadastrado: qafn022@test.com"), não mais `201`. Evidência: `evidence/FN034-retest.png`, `evidence/FN034-retest.log`.
  - **Nota metodológica importante**: a primeira tentativa de reteste (antes de qualquer restart) ainda retornou `201 Created` indevidamente. Investigação mostrou que o processo Java do backend `sgsm` (porta 8080) estava rodando desde antes da correção ter sido compilada — o bytecode em `target/classes` já refletia o fix (compilado às 22:49:44), mas o processo em execução (iniciado às 22:04) tinha carregado as classes antigas na JVM e não havia hot-reload configurado. O processo foi reiniciado (`mvn spring-boot:run`) às 22:55:08 para carregar o bytecode corrigido, e o reteste foi refeito do zero com sucesso. Isso não é uma falha do fix em si, mas um lembrete de que qualquer reteste de backend precisa confirmar que o processo em execução foi reiniciado após a recompilação.
- **FN047** (duplo submit sem guard síncrono) — confirmado corrigido no front-end: `salvar()` (`FuncionariosPage.tsx`) agora usa `salvandoRef` (`useRef(false)`) como guard síncrono. Repetindo a mesma reprodução (duas chamadas de `.click()` no botão Salvar na mesma tick via `browser_run_code_unsafe`, sem aguardar re-render), apenas **1** `POST /v1/api/funcionarios` foi disparado (201 Created), não mais 2. Evidência: `evidence/FN047-retest.png`, `evidence/FN047-retest.log`.
- **FN023** (nome só com espaços aceito) — confirmado corrigido no front-end: validação em `salvar()` agora usa `form.nome.trim()` / `form.cargo.trim()`. Nome `"   "` (só espaços) foi bloqueado com "Preencha todos os campos obrigatórios.", nenhum `POST` disparado. Evidência: `evidence/FN023-retest.png`, `evidence/FN023-retest.log`.
- **FN008** (busca por CPF não normalizava pontuação) — confirmado corrigido no front-end: o filtro de busca agora remove não-dígitos de ambos os lados (`busca.replace(/\D/g, '')` vs. `f.cpf.replace(/\D/g, '')`) antes de comparar. Testado nos dois sentidos: busca sem pontuação (`"37216498003"`) encontrou registro salvo com pontuação (`"372.164.980-03"`), e busca com pontuação (`"478.125.496-23"`) encontrou registro salvo sem pontuação (`"47812549623"`). Evidência: `evidence/FN008-retest.png`, `evidence/FN008-retest.log`.
- **FN040** (telefone fixo de 10 dígitos aceitava prefixo implausível) — confirmado corrigido no front-end: `validarTelefone()` agora exige `/^[2-5]/.test(numero)` para números de 10 dígitos (fixos). `(11) 8765-4321` (prefixo `8`) passou a ser rejeitado com "Use o formato (11) 99999-0000". Regressão verificada: o fixo válido `(11) 3333-4444` (já aprovado em FN037) continua sendo aceito sem erro. Evidência: `evidence/FN040-retest.png`, `evidence/FN040-retest-regressao-fn037.png`, `evidence/FN040-retest.log`.

Os detalhes de cada reteste estão também na tabela abaixo, na linha do item correspondente (vereditos atualizados para ✅, com link para as novas evidências, mantendo também as evidências originais da rodada 1 para rastreabilidade).

## Achados críticos (resumo executivo)

1. **Cadastro aceita e-mail duplicado (bug confirmado, backend).** `POST /v1/api/funcionarios` foi aceito duas vezes com o mesmo e-mail (`qafn022@test.com`), criando dois funcionários diferentes com e-mails idênticos (`3c42637b-...` e `b474d539-...`). Causa raiz: `FuncionarioService.cadastrar()` (`C:\AmbienteDev\sgsm\src\main\java\br\com\sgsm\service\FuncionarioService.java`, linhas 43–56) só valida unicidade de CPF (linha 50, `repository.existsByCpf`), nunca chama nada equivalente a `existsByEmail`. Em contraste, `atualizar()` (linhas 107–117) bloqueia e-mail duplicado via `existsByEmailAndIdNot` (linha 112). A coluna `email` na entidade `Funcionario` (`domain/Funcionario.java`, linha 21–22) também não tem `unique = true`, diferente de `cpf` (linha 18, `unique = true`). Ver FN034.

2. **Nome com apenas espaços em branco é aceito no cadastro (bug confirmado, front-end).** O formulário aceitou e persistiu um funcionário com `nome: "   "`. Causa raiz: `FuncionariosPage.tsx` linha 159, `if (!form.nome || !form.cargo || !form.estabelecimentoId)` não usa `.trim()`, então uma string de só espaços é truthy e passa na validação. O backend também não valida (nenhuma checagem de nome vazio/branco em `FuncionarioService.cadastrar`). Ver FN023.

3. **Duplo submit sem guard síncrono (bug confirmado sob condição de corrida, front-end).** A função `salvar()` (`FuncionariosPage.tsx`, linha 155) não tem nenhum guard síncrono (tipo `useRef`) contra chamadas concorrentes — só existe o guard assíncrono via estado `salvando`/`disabled={salvando}`. Um `dblclick` real do Playwright (evento de mouse nativo) **não** reproduziu o bug, porque o intervalo natural entre os dois cliques foi suficiente para o React desabilitar o botão a tempo. Mas duas chamadas síncronas de `button.click()` na mesma tick (sem esperar o React re-renderizar) dispararam **dois** `POST /v1/api/funcionarios` — o primeiro com sucesso (201), o segundo só foi rejeitado (400) porque por coincidência colidiu com a constraint de unicidade de CPF do backend. Como o e-mail não tem essa proteção (achado #1), um duplo-clique rápido o suficiente em um formulário válido pode criar dois funcionários duplicados de fato. Ver FN047.

4. **Busca por CPF não normaliza pontuação (front-end).** `FuncionariosPage.tsx` linha 123, `f.cpf.includes(busca)`, faz comparação direta sem remover pontos/traços de nenhum dos dois lados. Como os funcionários já existentes no banco têm CPF armazenado em formatos inconsistentes (alguns só dígitos, ex. `47812549623`; outros já formatados, ex. `529.982.247-25`), buscar por CPF só funciona quando o formato digitado bate exatamente com o formato armazenado — o que contradiz a expectativa de "com ou sem pontuação" do enunciado do teste. Ver FN008.

5. **Telefone fixo de 10 dígitos não valida prefixo plausível (front-end, achado menor).** `validarTelefone()` (`FuncionariosPage.tsx`, linhas 73–82) só rejeita números sem o `9` inicial quando `d.length === 11` (linha 80); para 10 dígitos, qualquer sequência de 8 dígitos não-repetidos após um DDD válido é aceita como "fixo" válido, mesmo com prefixos que nenhuma operadora usa (ex. `(11) 8765-4321`). Não é uma falha de dados (o telefone é opcional e o formato salvo é consistente), mas o teste esperava um erro de formato que não ocorre. Ver FN040.

6. **Restrição de perfil MEDICO (FN063–FN066) ficou bloqueada por falta de credencial.** `paulo@gmail.com` não tinha senha conhecida (conforme instrução, nenhuma senha foi inventada) e `eduardasilva@gmail.com` / `joaozinh7` retornou `401 Unauthorized` duas vezes seguidas contra o backend real (`POST /v1/api/auth/login`). Sem uma segunda conta MEDICO válida vinculada a um estabelecimento diferente, não foi possível provar ao vivo o escopo de acesso por médico. Ver evidência em `FN063-FN066-blocked.log/png`.

## Observação metodológica: comportamento do harness de screenshot

Em vários pontos, `browser_take_screenshot` capturou a página em branco (só o header/hero visível, grade de cards ausente) imediatamente após uma mutação de estado do React (ex.: logo após um `POST`/`PUT` bem-sucedido fechar o modal). Investigação via `browser_evaluate` confirmou que o DOM estava correto nesse momento (`opacity: 1`, `display: grid`, conteúdo de texto presente e clicável via `elementFromPoint`), e um novo snapshot de acessibilidade sempre mostrava os dados certos. Ou seja, é uma falha de sincronização de captura da ferramenta com a animação `stagger-children`/`animate-fade-in-up` do React, não um bug do app. Nesses casos, a evidência definitiva usada foi o snapshot de acessibilidade (JSON) mais o log de rede; quando um print visual limpo era necessário, foi obtido via um reload leve da página (dados reais confirmados persistentes no backend) ou uma nova tentativa de screenshot após um wait curto.

---

## Tabela de resultados

| ID | Veredito | Evidência | Resumo |
|----|----------|-----------|--------|
| FN001 | ✅ Aprovado | `FN001.png`, `FN001.log`, `FN001-loading2.png/3.png` | Grade carrega após `GET /v1/api/funcionarios` (200 OK). Spinner é muito rápido para capturar em tela estática (conexão local); confirmado via inspeção do código (`FuncionariosPage.tsx` linha ~291, ternário `loading ? spinner : ...`) e via interceptação de rede com atraso artificial. |
| FN002 | ✅ Aprovado | `FN001.png` | Cards mostram nome, cargo, badge Ativo/Inativo, CPF, e-mail e nome do estabelecimento resolvido ("Clinica São Lucas", não o UUID). |
| FN003 | ✅ Aprovado | `FN001.png` | "Teste QA" (sem telefone) não mostra a linha "Tel:"; "Lucas Ruela" (com telefone) mostra. Nenhuma quebra de layout. |
| FN004 | ✅ Aprovado | `FN004.png` (reaproveita `FN006.png`) | Busca/filtro sem resultado mostra `EmptyState` ("Nenhum resultado encontrado"), não a grade. |
| FN005 | 🟡 Parcial | — | Variante MEDICO ("Gerencie os funcionários dos seus estabelecimentos.") confirmada ao vivo em todas as capturas. Variante não-MEDICO não pôde ser testada ao vivo (nenhuma credencial não-MEDICO disponível/funcional nesta execução) — confirmada apenas por leitura do código (`FuncionariosPage.tsx` linha 227, ternário simples `isMedico ? ... : 'Funcionários vinculados aos estabelecimentos.'`). |
| FN006 | ✅ Aprovado | `FN006.png`, `FN006.log` | Erro 500 simulado via interceptação de rota mostra banner vermelho "Erro interno do servidor" no topo; tela não fica em loading infinito (mostra `EmptyState` abaixo do banner). |
| FN007 | ✅ Aprovado | `FN007.png` | Busca "ruela" filtra para "Lucas Ruela" em tempo real, client-side. |
| FN008 | ✅ Aprovado (corrigido, retestado) | `FN008-formatted-vs-unformatted-fail.png` (rodada 1, bug), `evidence/FN008-retest.png`, `evidence/FN008-retest.log` (rodada 2) | **Rodada 1 (reprovado):** buscar `"478.125"` (formatado) contra CPF armazenado sem pontuação → não encontrava; só funcionava quando o formato batia exatamente. Causa raiz: `FuncionariosPage.tsx` linha 123, `f.cpf.includes(busca)` sem normalização. **Rodada 2 (corrigido):** filtro agora normaliza dígitos dos dois lados; busca sem pontuação (`"37216498003"`) encontrou registro salvo com pontuação, e busca com pontuação (`"478.125.496-23"`) encontrou registro salvo sem pontuação (`"47812549623"`, Lucas Ruela). |
| FN009 | ✅ Aprovado | `FN009.png` | Busca "telefon" filtra para "Zenilda" (cargo "Telefonista"), client-side. |
| FN010 | ✅ Aprovado | `FN010.png` | Busca "qa@test" filtra para "Teste QA" (e-mail "qa@test.com"), client-side. |
| FN011 | ✅ Aprovado | `FN007.png` | Busca em minúsculas ("ruela") encontra "Lucas Ruela" (armazenado com maiúscula inicial) — case-insensitive confirmado. |
| FN012 | ✅ Aprovado | `FN008-formatted-vs-unformatted-fail.png` | Busca sem correspondência mostra `EmptyState`, sem erro. |
| FN013 | ✅ Aprovado | `FN013.png` | Limpar o campo de busca volta a mostrar todos os 4 funcionários carregados. |
| FN014 | ✅ Aprovado | `FN014-FN015.png` | Select de estabelecimento lista "Todos os estabelecimentos" + "Clinica São Lucas" (único estabelecimento ativo vinculado ao médico logado). |
| FN015 | ✅ Aprovado | `FN014-FN015.log` | Selecionar "Clinica São Lucas" dispara `GET /v1/api/funcionarios?estabelecimentoId=655759aa-...` (200 OK), mostra só os funcionários daquele estabelecimento (todos, nesse caso). |
| FN016 | ✅ Aprovado | `FN016.log` | Voltar para "Todos os estabelecimentos" dispara `GET /v1/api/funcionarios` sem o parâmetro `estabelecimentoId`. |
| FN017 | ✅ Aprovado | `FN017.png` | Filtro "Ativos" dispara `GET /v1/api/funcionarios?ativo=true` (200 OK). |
| FN018 | ✅ Aprovado | `FN018.png` | Filtro "Inativos" dispara `GET /v1/api/funcionarios?ativo=false` (200 OK); corretamente retorna vazio nesse momento (nenhum funcionário inativo ainda existia). Reconfirmado indiretamente depois: após FN059/FN069 criarem registros inativos, eles aparecem corretamente marcados "Inativo" na listagem padrão. |
| FN019 | ✅ Aprovado | `FN019.log` | Selecionar "Todos os status" volta a disparar `GET /v1/api/funcionarios` sem o parâmetro `ativo`. |
| FN020 | ✅ Aprovado | `FN020.log` | Combinar estabelecimento + status dispara `GET /v1/api/funcionarios?estabelecimentoId=...&ativo=true` — os dois parâmetros juntos na mesma requisição. |
| FN021 | ✅ Aprovado | `FN021.png`, `FN021.log` | Com os filtros de servidor ativos (estabelecimento + Ativos), digitar "ruela" na busca filtra para 1 card sem nenhuma nova requisição de rede — confirmado client-side sobre o resultado já filtrado. |
| FN022 | ✅ Aprovado | `FN022.png`, `FN022.log` | Salvar com Nome vazio (demais campos válidos) → "Preencha todos os campos obrigatórios."; nenhum `POST` disparado. |
| FN023 | ✅ Aprovado (corrigido, retestado) | `FN023.png` (rodada 1, bug), `evidence/FN023-retest.png`, `evidence/FN023-retest.log` (rodada 2) | **Rodada 1 (reprovado):** nome `"   "` (só espaços) foi aceito, `POST` → `201 Created` com `nome: "   "`. Causa raiz: `FuncionariosPage.tsx` linha 159 (sem `.trim()`). **Rodada 2 (corrigido):** validação agora usa `form.nome.trim()` / `form.cargo.trim()`; repetindo a mesma reprodução, nome `"   "` foi bloqueado com "Preencha todos os campos obrigatórios.", nenhum `POST` disparado. |
| FN024 | ✅ Aprovado | `FN046.png`, `FN046.log` | Nome válido ("QA Fulano Teste" / "QA Duplo Clique FN047" etc.) é aceito e enviado corretamente no payload do `POST`. |
| FN025 | ✅ Aprovado | `FN022.png` (campo CPF já mostra `123.456.789-09`) | Máscara de CPF confirmada: digitar `12345678909` exibe `123.456.789-09`. |
| FN026 | ✅ Aprovado | `FN026.png` | CPF vazio + Salvar → "CPF obrigatório" (campo destacado em vermelho); nenhum novo `POST` disparado. |
| FN027 | ✅ Aprovado | `FN027.png` | CPF `111.111.111-11` (dígitos repetidos) → "CPF inválido". |
| FN028 | ✅ Aprovado | `FN028.png` | CPF `123.456.789-00` (dígito verificador incorreto) → "CPF inválido". |
| FN029 | ✅ Aprovado | `FN029.png` | CPF `987.654.321-00` (válido) → nenhum erro exibido. |
| FN030 | ✅ Aprovado | `FN030.png`, `FN030.log` | CPF duplicado (`987.654.321-00`, já usado por "QA Fulano Teste") → `POST` retorna 400 com "CPF já cadastrado: 987.654.321-00", exibido no modal (`formError`), modal permanece aberto com os dados preenchidos preservados. |
| FN031 | ✅ Aprovado | `FN031.png` | E-mail vazio (blur) → "E-mail obrigatório". |
| FN032 | ✅ Aprovado | `FN032.png` | E-mail `abc123` (formato inválido) → "E-mail inválido". |
| FN033 | ✅ Aprovado | `FN033.png` | E-mail válido digitado após um inválido remove o erro imediatamente (no `onChange`, não só no blur). |
| FN034 | ✅ Aprovado (corrigido, retestado) | `FN034.png` (rodada 1, bug), `evidence/FN034-retest.png`, `evidence/FN034-retest.log` (rodada 2) | **Rodada 1 (reprovado):** cadastro com e-mail já usado por outro funcionário → `POST` retornava `201 Created` indevidamente. Causa raiz: `FuncionarioService.cadastrar()` não validava unicidade de e-mail. **Rodada 2 (corrigido):** `cadastrar()` agora chama `repository.existsByEmail(request.email())`; repetindo a mesma reprodução (CPF novo, e-mail duplicado `qafn022@test.com`), `POST` retornou `400 Bad Request` ("E-mail já cadastrado: qafn022@test.com"), exibido no modal. Backend precisou ser reiniciado durante o reteste para carregar o bytecode recompilado (ver nota metodológica na seção "Rodada 2" acima). |
| FN035 | ✅ Aprovado | `FN034.log` (request #83, `"telefone":""`) | Telefone vazio é aceito sem erro; `POST` disparado com `telefone: ""` no payload (campo opcional). |
| FN036 | ✅ Aprovado | `FN046-full.png` (card "QA Fulano Teste" mostra `Tel: (11) 98765-4321`) | Máscara de celular confirmada: digitar `11987654321` exibe `(11) 98765-4321`. |
| FN037 | ✅ Aprovado | `FN037.png` | `1133334444` → `(11) 3333-4444`, máscara de fixo confirmada. |
| FN038 | ✅ Aprovado | `FN038.png` | DDD `00` → "Use o formato (11) 99999-0000". |
| FN039 | ✅ Aprovado | `FN039.png` | `(11) 99999-9999` (dígitos repetidos) → "Use o formato (11) 99999-0000". |
| FN040 | ✅ Aprovado (corrigido, retestado) | `FN040.png` (rodada 1, bug), `evidence/FN040-retest.png`, `evidence/FN040-retest-regressao-fn037.png`, `evidence/FN040-retest.log` (rodada 2) | **Rodada 1 (reprovado):** `(11) 8765-4321` (10 dígitos, prefixo implausível) → nenhum erro exibido. Causa raiz: `validarTelefone()` só validava prefixo para 11 dígitos. **Rodada 2 (corrigido):** para 10 dígitos agora exige `/^[2-5]/` no número local; `(11) 8765-4321` passou a exibir "Use o formato (11) 99999-0000". Regressão verificada: `(11) 3333-4444` (fixo válido, FN037) continua aceito sem erro. |
| FN041 | ✅ Aprovado | `FN046.png`, `FN046.log` | Telefone válido (`(11) 98765-4321`) aceito, sem erro, enviado corretamente no payload. |
| FN042 | ✅ Aprovado | `FN042.png` | Cargo vazio + Salvar → "Preencha todos os campos obrigatórios." (junto com erro de CPF inválido, já que o CPF de teste usado também era inválido nesse cenário). |
| FN043 | ✅ Aprovado | `FN043-FN045.log` (request final `POST` → 201) | Cargo válido ("Auxiliar QA4") é aceito e enviado corretamente no payload. |
| FN044 | ✅ Aprovado | `FN044.png` | Estabelecimento em "Selecione…" + Salvar → "Preencha todos os campos obrigatórios."; nenhum `POST` disparado. |
| FN045 | ✅ Aprovado | `FN045.png` e todas as demais capturas do modal | Select de Estabelecimento sempre mostra só "Clinica São Lucas" (único vínculo do médico logado) — mesma lista do filtro de listagem (FN014), confirmando o escopo por médico também no cadastro. |
| FN046 | ✅ Aprovado | `FN046.png`, `FN046.log`, `FN046-full.png` (após reload, confirmando persistência real) | Cadastro completo válido → `POST` → `201 Created`, modal fecha, novo funcionário aparece no topo da lista sem reload (confirmado via snapshot de acessibilidade imediatamente após o fechamento, e novamente após reload de página). |
| FN047 | ✅ Aprovado (corrigido, retestado) | `FN047.png` (rodada 1, bug), `evidence/FN047-retest.png`, `evidence/FN047-retest.log` (rodada 2) | **Rodada 1 (reprovado):** duas chamadas `click()` síncronas na mesma tick → 2 `POST`s. Causa raiz: `salvar()` sem guard síncrono tipo `useRef`. **Rodada 2 (corrigido):** `salvar()` agora usa `salvandoRef` (`useRef(false)`) como guard síncrono; repetindo a mesma reprodução, apenas 1 `POST` foi disparado (201 Created), nenhum duplicado criado. |
| FN048 | ✅ Aprovado | `FN048.png`, `FN048.log` | "Cancelar" com dados preenchidos não altera a listagem; nenhum `POST` disparado. |
| FN049 | ✅ Aprovado | `FN049.png` | Fechar e reabrir "Novo Funcionário" mostra formulário vazio (sem dados do preenchimento anterior). |
| FN050 | ✅ Aprovado | `FN050.png` | Erro 500 simulado via interceptação de rota no `POST` → "Erro interno do servidor" exibido dentro do modal (`formError`), modal não fecha, dados preenchidos preservados. |
| FN051 | ✅ Aprovado | `FN051-FN052-FN053.png` | "Editar" em Lucas Ruela pré-preenche Nome, CPF mascarado (`478.125.496-23`), E-mail, Telefone mascarado (`(61) 99104-2458`) e Estabelecimento corretos. |
| FN052 | ✅ Aprovado | `FN051-FN052-FN053.png` | Campo CPF aparece `disabled` no modo edição (confirmado no snapshot de acessibilidade: `textbox "CPF *" [disabled]`). |
| FN053 | ✅ Aprovado | `FN051-FN052-FN053.png` | Campo Estabelecimento aparece `disabled` no modo edição (`combobox "Estabelecimento *" [disabled]`). |
| FN054 | ✅ Aprovado | `FN054.png`, `FN054.log` | Renomear "Lucas Ruela" → "Lucas Ruela Editado" e salvar → `PUT /v1/api/funcionarios/{id}` → 200 OK; card atualiza imediatamente na listagem sem reload. |
| FN055 | ✅ Aprovado | `FN055.png`, `FN055.log` | Editar Zenilda e trocar e-mail para `lucas@gmail.com` (já usado por Lucas Ruela) → `PUT` → **400 Bad Request**, "E-mail já cadastrado: lucas@gmail.com" exibido no modal, modal não fecha. Confirma que o backend bloqueia duplicidade de e-mail **só** no `atualizar()`, nunca no `cadastrar()` (ver FN034). |
| FN056 | ✅ Aprovado (comportamento documentado, não é bug novo) | `FN056.png`, `FN056.log` | Apagar o campo Telefone de Zenilda e salvar → `PUT` body omite `"telefone"` (por causa de `telefone: form.telefone || undefined` virar `undefined` e ser removido pelo `JSON.stringify`); resposta confirma que o telefone antigo (`61991042778`) foi mantido, não apagado. Comportamento já conhecido/documentado em outras telas do sistema (Serviços/Estabelecimento). |
| FN057 | ✅ Aprovado | `FN057.png`, `FN057.log` | Apagar o Nome de Zenilda em edição + Salvar → "Preencha todos os campos obrigatórios."; nenhum novo `PUT` disparado. |
| FN058 | ✅ Aprovado | `FN058.png` | Ícone de lixeira de funcionário ativo abre modal "Inativar Funcionário" com o texto "O funcionário será inativado e não aparecerá nas listagens padrão." |
| FN059 | ✅ Aprovado | `FN059.png`, `FN059.log` | Confirmar "Inativar" → `DELETE /v1/api/funcionarios/{id}` → `204 No Content`; card passa a badge "Inativo" imediatamente, sem reload. |
| FN060 | ✅ Aprovado | `FN060-FN062.png` | Botão de lixeira do funcionário recém-inativado ("QA Duplo Clique Sync") aparece `disabled` no snapshot de acessibilidade. |
| FN061 | ✅ Aprovado | `FN061.log` | "Cancelar" no modal de inativação não altera o status; nenhum `DELETE` disparado. |
| FN062 | ✅ Aprovado | `FN060-FN062.png` | Nenhuma ação de "reativar" visível no card do funcionário inativo — só "Editar" (habilitado) e lixeira (desabilitada). |
| FN063 | ⚠️ Bloqueado | `FN063-FN066-blocked.png/log` | Sem credencial secundária MEDICO válida (ver achado crítico #6). Não testável sem inventar senha. |
| FN064 | ⚠️ Bloqueado | `FN063-FN066-blocked.png/log` | Idem FN063. |
| FN065 | ⚠️ Bloqueado | `FN063-FN066-blocked.png/log` | Idem FN063. |
| FN066 | ⚠️ Bloqueado | `FN063-FN066-blocked.png/log` | Idem FN063. |
| FN067 | ✅ Aprovado | `FN067.png` | 401 simulado via interceptação de rota em `GET /v1/api/funcionarios` e `POST /v1/api/auth/refresh` → redireciona para `/login`, sem tela em branco. |
| FN068 | ✅ Aprovado | `FN068-during.png`, `FN068.png`, `FN068.log` | `POST /v1/api/funcionarios` atrasado artificialmente em 5s via interceptação de rota → botão mostra "Salvando…" e fica `disabled` durante toda a espera; UI não trava; ao resolver, `201 Created`, modal fecha normalmente. |
| FN069 | ✅ Aprovado | `FN069.png`, `FN069.log` | Fluxo completo: cadastrar "QA Regressao FN069" → editar (renomear para "QA Regressao FN069 Renomeado") → inativar → estado final mostra badge "Inativo" com nome, cargo, CPF, e-mail e estabelecimento preservados corretamente. |
| FN070 | ✅ Aprovado | `FN070.png`, `FN070.log` | Navegar para "Médicos" e voltar para "Funcionários" via menu → nova `GET /v1/api/funcionarios` disparada, listagem mostra dados atualizados (incluindo os dois registros recém-inativados corretamente marcados "Inativo"), sem dados obsoletos. |

---

## Itens não testáveis

Nenhum item ficou definitivamente impossível de testar por limitação técnica das ferramentas — mesmo os cenários de rede lenta (FN068), erro 500 (FN006, FN050) e sessão expirada (FN067) foram simulados com sucesso via interceptação de rota do Playwright (`browser_run_code_unsafe` + `page.route`), sem depender de mock de XHR no navegador nem de alterar o backend real.

Os únicos itens não concluídos (FN063–FN066) foram bloqueados exclusivamente pela ausência de uma credencial MEDICO secundária válida e vinculada a um estabelecimento diferente do principal — não por limitação de ferramenta. `paulo@gmail.com` não tinha senha fornecida (nenhuma foi inventada, conforme instrução) e `eduardasilva@gmail.com` / `joaozinh7` retornou `401 Unauthorized` do backend real duas vezes.

## Notas metodológicas

- Todos os CPFs de teste usados são matematicamente válidos (dígitos verificadores calculados manualmente conforme o mesmo algoritmo de `validarCPF()` do front-end) e nunca reaproveitam um CPF de funcionário pré-existente, exceto nos testes intencionais de duplicidade (FN030, FN034).
- A cada ação de mutação (`POST`/`PUT`/`DELETE`), a prova de rede foi capturada via `browser_network_requests`/`browser_network_request` (request e response completos, incluindo status code e corpo), nunca apenas inferida pela UI.
- Onde a captura de tela imediatamente após uma mutação saiu em branco por um artefato de timing do harness (ver observação metodológica acima), a prova primária usada foi o snapshot de acessibilidade (árvore DOM real) mais o log de rede — nunca uma alegação sem evidência.
- Os funcionários de teste com prefixo "QA" foram deixados no sistema ao final da execução (inclusive os dois inativados) como rastro de evidência; nenhum foi excluído fisicamente (a tela não oferece exclusão física, só inativação).

---

## Resumo final — Rodada 1 (antes das correções)

- **Total de itens:** 70 (FN001–FN070)
- **✅ Aprovados:** 60
- **❌ Reprovados (bugs confirmados ou comportamento divergente do esperado):** 5 — FN008, FN023, FN034, FN040, FN047
- **🟡 Parcial:** 1 — FN005 (variante MEDICO confirmada; variante não-MEDICO só por código)
- **⚠️ Bloqueados (falta de credencial, não por limitação de ferramenta):** 4 — FN063, FN064, FN065, FN066

### Bugs reais encontrados (por severidade)

1. **[Alta] Cadastro aceita e-mail duplicado** (FN034) — `FuncionarioService.cadastrar()` não valida unicidade de e-mail, ao contrário de `atualizar()`. Permite dois funcionários ativos com o mesmo e-mail, o que pode quebrar fluxos que dependem de e-mail como identificador único (ex.: convites, notificações, login futuro de funcionário). Backend: `FuncionarioService.java` linhas 43–56 (cadastrar) vs. 107–117 (atualizar); `Funcionario.java` linha 21–22 (coluna sem `unique`).
2. **[Média] Duplo submit sem guard síncrono** (FN047) — confirmado sob condição de corrida (duas chamadas síncronas de `click()`); não reproduzido com um `dblclick` real por sorte de timing, mas o código não tem proteção estrutural. Combinado com o bug #1 (e-mail sem unicidade), um duplo-clique rápido o suficiente cria dois funcionários duplicados de verdade. Front-end: `FuncionariosPage.tsx` linha 155 (`salvar()`), falta `useRef` guard (padrão já usado em outras telas do sistema, ex. Médicos/M24).
3. **[Média] Nome só com espaços é aceito no cadastro** (FN023) — `FuncionariosPage.tsx` linha 159, falta `.trim()` na validação de campos obrigatórios; backend também não valida. Permite registros com nome efetivamente vazio.
4. **[Baixa] Busca por CPF não normaliza pontuação** (FN008) — `FuncionariosPage.tsx` linha 123, comparação direta sem remover não-dígitos; como o banco tem CPFs em formatos inconsistentes, a busca "com ou sem pontuação" só funciona por coincidência de formato.
5. **[Baixa] Telefone fixo de 10 dígitos não valida prefixo plausível** (FN040) — `validarTelefone()` linha 80, checagem do dígito `9` inicial só se aplica a números de 11 dígitos; um número de 10 dígitos com prefixo implausível (ex. começando em 7 ou 8) é aceito sem erro.

## Resumo final — Rodada 2 (após correções)

Todos os 5 itens reprovados na rodada 1 foram corrigidos e reconfirmados ao vivo (1 no backend `sgsm`, 4 no front-end `sgsm-front-medico`). Nenhuma regressão foi identificada nos itens já aprovados que foram tocados pelas correções (verificado explicitamente para FN037/telefone fixo válido, que continua funcionando após a correção de FN040).

- **Total de itens:** 70 (FN001–FN070)
- **✅ Aprovados:** 65 — todos os 60 originais + FN008, FN023, FN034, FN040, FN047
- **🟡 Parcial:** 1 — FN005 (variante MEDICO confirmada; variante não-MEDICO só por código; não fazia parte do escopo deste reteste)
- **⚠️ Bloqueados (falta de credencial, não por limitação de ferramenta):** 4 — FN063, FN064, FN065, FN066 (não fazia parte do escopo deste reteste)

### Bugs corrigidos e reconfirmados (Rodada 2)

1. **[Alta] Cadastro aceita e-mail duplicado** (FN034) — corrigido em `FuncionarioService.cadastrar()` (`repository.existsByEmail(...)`); `POST` com e-mail duplicado agora retorna `400`. Ver `evidence/FN034-retest.png/.log`.
2. **[Média] Duplo submit sem guard síncrono** (FN047) — corrigido em `FuncionariosPage.tsx` (`salvandoRef` como guard síncrono); duas chamadas `click()` na mesma tick agora disparam só 1 `POST`. Ver `evidence/FN047-retest.png/.log`.
3. **[Média] Nome só com espaços é aceito no cadastro** (FN023) — corrigido em `FuncionariosPage.tsx` (`form.nome.trim()` / `form.cargo.trim()`); nome em branco agora é bloqueado. Ver `evidence/FN023-retest.png/.log`.
4. **[Baixa] Busca por CPF não normaliza pontuação** (FN008) — corrigido em `FuncionariosPage.tsx` (normalização de dígitos dos dois lados na busca); confirmado nos dois sentidos de formato. Ver `evidence/FN008-retest.png/.log`.
5. **[Baixa] Telefone fixo de 10 dígitos não valida prefixo plausível** (FN040) — corrigido em `validarTelefone()` (exige prefixo 2–5 para fixos de 10 dígitos); sem regressão no fixo válido de FN037. Ver `evidence/FN040-retest.png/-retest-regressao-fn037.png/.log`.

### Confirmação dos dois pontos suspeitos citados na tarefa

- **FN034 (e-mail duplicado no cadastro): CONFIRMADO COMO BUG.** Reproduzido ao vivo com evidência de rede completa (`FN034.log`): dois funcionários com o mesmo e-mail, ambos com `201 Created`.
- **FN047 (duplo clique sem guard): CONFIRMADO COMO BUG**, mas com uma nuance importante não antecipada na tarefa: um duplo-clique real do usuário (simulado com o `dblclick` nativo do Playwright, que dispara dois eventos de clique reais com o intervalo natural entre eles) **não** reproduziu o problema — o React consegue desabilitar o botão a tempo entre os dois cliques físicos. O bug só se manifesta sob uma condição de corrida mais agressiva (duas invocações síncronas de `salvar()` na mesma tick de JavaScript, sem esperar o React re-renderizar), que é tecnicamente possível (ex. script malicioso, teclado+mouse simultâneo, ambiente com latência de input diferente) mas não em todo duplo-clique manual comum. A causa raiz (ausência de guard síncrono) é real e deveria ser corrigida por precaução, especialmente porque combinada com o bug de e-mail duplicado (#1) o risco de dados duplicados é concreto.
