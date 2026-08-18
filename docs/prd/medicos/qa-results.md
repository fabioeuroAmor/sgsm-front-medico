# QA Results — Tela de Médicos (`/medicos`)

Execução ao vivo via Playwright MCP contra o app real em `http://localhost:3001`, backend real (portas 8080/8081/8082), sem mocks. Login de teste: `eduardasilva@gmail.com` / `joaozinh7` (perfil MEDICO).

Evidências em `docs/prd/medicos/evidence/<id>.png` (print) e `docs/prd/medicos/evidence/<id>.log` (console/rede), salvas por item.

## Rodada 2 — reteste pós-correções de front-end

Após a rodada 1 (44 aprovados / 13 reprovados), correções de front-end foram aplicadas (fora deste QA) para 8 dos itens reprovados, mais uma melhoria de UX em outro. Cada um foi re-executado ao vivo, com novas evidências (sufixo `-retest` nos arquivos):

- **M20, M22, M27** (validação de campos obrigatórios/e-mail/nome em branco) — confirmados corrigidos: `evidence/M20-retest.png`, `evidence/M22-retest.png`, `evidence/M27-retest.png`.
- **M24** (duplo clique) — confirmado corrigido: `evidence/M24-retest.png`.
- **M46** (raio negativo) — confirmado corrigido: `evidence/M46-retest.png`.
- **M53** (clique fora do modal) — confirmado corrigido em 3 pontos diferentes da tela, incluindo o topo (onde estava o bug de CSS): `evidence/M53-retest-top.png`, `evidence/M53-retest.png`.
- **M30/M32** (UX de edição restrita) — confirmada a melhoria: botão "Editar" agora fica desabilitado com tooltip para médicos de terceiros: `evidence/M30-M32-retest.png`.
- **M54** (sessão no F5) — confirmado que a causa de chamadas de refresh duplicadas foi eliminada, mas identificado que a causa raiz remanescente é do backend (ver detalhes na linha M54 da tabela e nos achados críticos).

Os detalhes de cada reteste estão na tabela abaixo, na linha do item correspondente (vereditos atualizados para ✅, com link para as novas evidências mantendo também as evidências originais da rodada 1 para rastreabilidade).

## Achados críticos (resumo executivo)

Antes da tabela item a item, seis problemas atravessam vários itens e merecem destaque:

1. **Perda de dados recém-criados (crítico).** Médicos criados via `POST /v1/api/medicos` retornam `201 Created` com o payload correto, mas desaparecem de `GET /v1/api/medicos` pouco depois — às vezes em segundos, apenas com navegação Voltar/Avançar do navegador (sem reload). Reproduzido de forma independente e repetida em M21/M27/M30/M55 (ver M55 para a reprodução mais limpa). Isso sugere um problema de persistência/consistência no backend (possível store não-durável ou rollback silencioso), não um bug de UI.
2. **Filtros de servidor `especialidade` e `ativo` são ignorados pelo backend.** `GET /v1/api/medicos?especialidade=X` e `?ativo=true|false` sempre retornam a mesma lista de `GET /v1/api/medicos` sem filtrar (M15, M16, M18).
3. **Cadastro sem validação nenhuma.** O modal "Novo Médico" permite salvar com todos os campos vazios (criou um médico com `nome:"", crm:"", especialidade:"", email:""`), com e-mail em formato claramente inválido (`abc123`), e com nome contendo apenas espaços (M20, M22, M27). Nem o front nem o backend rejeitam.
4. **Duplo clique em "Salvar" dispara múltiplas requisições.** Não há debounce/disable no botão durante o POST; um clique duplo gerou 2–3 requisições ao backend (M24).
5. **PUT (editar) bloqueado por regra de autorização não refletida na UI.** O backend rejeita com 403 e mensagem "Médico não pode editar dados de outro médico" qualquer tentativa de editar um médico que não seja o do próprio usuário logado — mas o front mostra o botão "Editar" habilitado para todos os cards igualmente, sem indicar essa restrição (M30, M32).
6. **Sessão/token instável.** O refresh de token dispara em duplicidade (efeito de montagem duplo) e o backend por vezes rejeita ambas as tentativas com 401, deslogando o usuário sem aviso ao simplesmente recarregar a página (observado repetidamente em M04, M54, M56, M57 e nas idas-e-vindas do teste).

---

## Tabela de resultados

| ID | Veredito | Print | Evidência (resumo) |
|----|----------|-------|---------------------|
| M01 | ✅ Aprovado | `evidence/M01.png` | Login com credenciais válidas redireciona para `/pacientes`. `POST /v1/api/auth/login` → 200, `GET /v1/api/auth/me` → 200. Sem erros no console (`M01.log`). |
| M02 | ✅ Aprovado | `evidence/M02.png` | Clique em "Médicos" no menu carrega `/medicos` sem erro. `GET /v1/api/medicos` → 200 (`M02.log`). |
| M03 | ✅ Aprovado | `evidence/M03.png` | Com `localStorage` limpo, navegação direta a `/medicos` redireciona para `/login` (rota privada funciona) (`M03.log`). |
| M04 | ✅ Aprovado* | `evidence/M04.png` | F5 com sessão ativa mantém login e recarrega a lista. `M04.log` mostra `POST /v1/api/auth/refresh` disparado **em duplicidade** (efeito de montagem duplo) — ambas tiveram sucesso desta vez, mas essa duplicidade é a causa raiz da falha intermitente de sessão observada depois (ver nota de M54). |
| M05 | ✅ Aprovado | `evidence/M05.png` | Spinner seguido dos cards; payload de `GET /v1/api/medicos` inspecionado em `M05.log` (JSON com nome/crm/especialidade/email/ativo). |
| M06 | ✅ Aprovado | `evidence/M06.png` | Busca por texto sem correspondência mostra `EmptyState` ("Nenhum resultado encontrado"), sem erro (`M06.log`). |
| M07 | ✅ Aprovado | `evidence/M07.png` | Simulado erro de API (token corrompido via patch de `Authorization`) — banner vermelho "Request failed with status code 403" aparece visível na tela, não só no console (`M07.log`, `M07-console.log`). Observação: a mensagem exibida é o texto bruto da exceção do axios ("Request failed with status code 403"), não uma mensagem traduzida/amigável — ver M57 para o mesmo padrão. |
| M08 | ✅ Aprovado | `evidence/M08.png` | Card exibe nome, especialidade, CRM/UF, e-mail e badge "Ativo" condizentes com os dados da API; telefone `null` corretamente omitido (`M08.log`). |
| M09 | ✅ Aprovado | `evidence/M09.png` | Busca por nome parcial ("Edicao") filtra para 1 card; nenhuma nova chamada de rede disparada — filtro é client-side (`M09.log`). |
| M10 | ✅ Aprovado | `evidence/M10.png` | Busca por CRM parcial ("9990") filtra corretamente, client-side (`M10.log`). |
| M11 | ✅ Aprovado | `evidence/M11.png` | Busca por e-mail parcial filtra corretamente, client-side (`M11.log`). |
| M12 | ✅ Aprovado | `evidence/M12.png` | Busca sem correspondência ("xyznonexistent999") mostra `EmptyState` (`M12.log`). |
| M13 | ✅ Aprovado | `evidence/M13.png` | Busca em maiúsculas ("EDUARDA SILVA") encontra registro armazenado em minúsculas — case-insensitive confirmado (`M13.log`). |
| M14 | ✅ Aprovado | `evidence/M14.png` | Filtro "Ativos" dispara `GET /v1/api/medicos?ativo=true` (200 OK) (`M14.log`). |
| M15 | ❌ Reprovado | `evidence/M15.png` | Filtro "Inativos" dispara `GET /v1/api/medicos?ativo=false`, mas a API **ignora o parâmetro** e retorna o médico com `"ativo":true` de qualquer forma (`M15.log`). **Repro:** logar, ir a `/medicos`, selecionar "Inativos" no filtro de status → card com badge "Ativo" continua aparecendo. |
| M16 | ❌ Reprovado | `evidence/M16.png` | Filtro de especialidade "Cardiologia" dispara `GET /v1/api/medicos?especialidade=Cardiologia`, mas a API ignora o parâmetro e devolve o médico de Psiquiatria mesmo assim (`M16.log`). **Repro:** selecionar qualquer especialidade diferente da do único médico cadastrado → o card errado continua na lista. |
| M17 | ✅ Aprovado | `evidence/M17.png` | Voltar para "Todas as especialidades" remove o parâmetro da URL da API e recarrega a lista completa (`M17.log`). |
| M18 | ❌ Reprovado | `evidence/M18.png` | Combinação texto + especialidade + status: como `especialidade`/`ativo` são ignorados pelo backend (mesma causa de M15/M16), a interseção fica incorreta — no teste, o filtro por "Neurologia"+"Ativos" retornou apenas "eduarda silva" (Psiquiatria) da API, e o texto "Combo18" então filtrou tudo para vazio, escondendo o médico que deveria aparecer (`M18.log`). **Repro:** cadastrar um médico X com especialidade Y; filtrar por especialidade Y + status Ativos + texto do nome de X → nenhum resultado, mesmo X existindo e sendo compatível. |
| M19 | ✅ Aprovado | `evidence/M19.png` | "Novo Médico" abre modal vazio com UF padrão "SP" (`M19.log`). |
| M20 | ✅ Aprovado (rodada 2) | `evidence/M20-retest.png` | Rodada 1 (`evidence/M20.png`): salvar com todos os campos vazios criava um médico em branco (`POST` → 201). Corrigido no front-end com validação de campos obrigatórios antes do submit. Reteste: clicar "Salvar" sem preencher nada agora mostra "Preencha todos os campos obrigatórios." e **nenhum** `POST /v1/api/medicos` é disparado (`M20-retest.log`, `M20-retest-console.log`). |
| M21 | ✅ Aprovado | `evidence/M21.png` | Cadastro com dados válidos: modal fecha, novo médico aparece no topo da lista, `POST /v1/api/medicos` com payload correto (`M21.log`). |
| M22 | ✅ Aprovado (rodada 2) | `evidence/M22-retest.png` | Rodada 1 (`evidence/M22.png`): e-mail inválido `abc123` era aceito e persistido (`POST` → 201). Corrigido no front-end com validação de formato de e-mail (regex) antes do submit. Reteste: preencher e-mail `abc123` e salvar agora mostra "Informe um e-mail em formato válido." e **nenhum** `POST` é disparado (`M22-retest.log`). |
| M23 | ✅ Aprovado | `evidence/M23.png` | CRM duplicado (999001, já usado por outro médico QA) é recusado pela API com mensagem "CRM 999001/SP já cadastrado." exibida no modal, que permanece aberto (`M23.log`). |
| M24 | ✅ Aprovado (rodada 2) | `evidence/M24-retest.png` | Rodada 1 (`evidence/M24.png`): duplo clique disparava 3 requisições `POST /v1/api/medicos`. Corrigido no front-end com guard síncrono via `useRef` (bloqueia a segunda chamada antes mesmo do primeiro re-render). Reteste: dois cliques rápidos disparados via DOM disparam **apenas 1** `POST /v1/api/medicos` → 201 Created (`M24-retest.log`). |
| M25 | ✅ Aprovado | `evidence/M25.png` | "Cancelar" descarta os dados digitados; reabrir "Novo Médico" mostra formulário limpo (`M25.log`). |
| M26 | ✅ Aprovado | `evidence/M26.png` | Telefone é opcional: cadastro sem telefone funciona (M21); cadastro com telefone salva e exibe "Tel: ..." no card (`M26.log`). |
| M27 | ✅ Aprovado (rodada 2) | `evidence/M27-retest.png` | Rodada 1 (`evidence/M27.png`): nome só de espaços era aceito literalmente (`POST` → 201). Corrigido no front-end: nome é `trim()`ado antes da validação de obrigatoriedade, então nome só de espaços cai na mesma validação de M20 ("Preencha todos os campos obrigatórios."). Reteste confirma bloqueio, sem `POST` disparado (`M27-retest.log`). |
| M28 | ✅ Aprovado | `evidence/M28.png` | "Editar" abre modal preenchido com nome, especialidade, e-mail e UF corretos do médico (`M28.log`). |
| M29 | ✅ Aprovado | `evidence/M29.png` (reaproveita M28.png) | No mesmo modal de edição, campos CRM e UF do CRM aparecem `disabled`. |
| M30 | ✅ Aprovado (rodada 2, UX) | `evidence/M30-M32-retest.png` | Rodada 1 (`evidence/M30.png`): 403 Forbidden ao editar médico de terceiro, sem sinalização na UI (achado era especificamente a falta de comunicação da restrição, não o 403 em si — a regra de backend "médico só edita o próprio cadastro" é legítima e continua ativa, não foi alterada). Corrigido no front-end: botão "Editar" agora fica `disabled` com `title="Você só pode editar o seu próprio cadastro"` para qualquer médico cujo id não bata com `usuario.referenciaId` do usuário logado (quando `perfil === 'MEDICO'`). Reteste confirma botão desabilitado no card de um médico de terceiro e habilitado no card do próprio usuário (`M30-M32-retest.log`). |
| M31 | ✅ Aprovado | `evidence/M31.png` | Editar nome e depois "Cancelar" não persiste; reabrir o card mostra o nome original (`M31.log`, nenhum `PUT` disparado). |
| M32 | ✅ Aprovado (rodada 2, UX) | `evidence/M30-M32-retest.png` | Mesma correção de M30: como o botão "Editar" de médicos de terceiros agora fica desabilitado, o usuário não consegue mais chegar ao formulário de edição alheia para de lá tentar um e-mail inválido — o cenário problemático (403 mascarando a validação) não é mais alcançável pela UI. Validação de e-mail inválido em edição do **próprio** cadastro segue as mesmas regras de M22 (compartilha a validação em `salvar()`). |
| M33 | ✅ Aprovado | `evidence/M33.png` | Botão de lixeira abre modal de confirmação com texto "O médico será inativado e não aparecerá nas listagens padrão." (`M33.log`). |
| M34 | ✅ Aprovado | `evidence/M34.png` | Confirmar inativação: `DELETE /v1/api/medicos/{id}` → 204 No Content; card passa a badge "Inativo"; botão de lixeira fica desabilitado (`M34.log`). |
| M35 | ✅ Aprovado | `evidence/M35.png` | "Cancelar" no modal de confirmação não altera o status; nenhum `DELETE` disparado (`M35.log`). |
| M36 | ✅ Aprovado | `evidence/M36.png` | Médico já inativo mostra botão de lixeira `disabled`, impedindo nova tentativa de inativação (`M36.log`). |
| M37 | ✅ Aprovado | `evidence/M37.png` | Ícone de calendário abre modal "Agenda — {nome}" com spinner inicial seguido do conteúdo (`M37.log`). |
| M38 | ✅ Aprovado | `evidence/M38.png` | Médico sem horários mostra "Nenhum horário cadastrado." (`M38.log`). |
| M39 | ✅ Aprovado | `evidence/M39.png` | Simulado erro (token corrompido) nas chamadas de agenda/estabelecimentos — erro "Request failed with status code 403" aparece visível no modal (`M39.log`). |
| M40 | ✅ Aprovado | `evidence/M40.png` | "Adicionar Horário" mostra formulário com estabelecimento, dia (Segunda-feira), duração (30 min), horários (08:00–18:00) e vigência início (hoje) pré-preenchidos (`M40.log`). |
| M41 | ✅ Aprovado | `evidence/M41.png` | Horário vinculado a estabelecimento salvo com sucesso; `POST /v1/api/agenda-medico` → 201 Created; nova linha aparece na lista (`M41.log`). |
| M42 | ✅ Aprovado | `evidence/M42.png` | Sem estabelecimento selecionado (modo não-domiciliar), botão "Salvar Horário" fica `disabled` (`M42.log`). |
| M43 | ✅ Aprovado | `evidence/M43.png` | Ativar "Atendimento domiciliar" substitui o campo de estabelecimento por Cidade, UF, Raio (km) e Intervalo (min) (`M43.log`). Observação: clicar apenas no texto/label não ativa o toggle de forma confiável — é preciso clicar exatamente na "trilha" visual do switch (achado menor de acessibilidade, não bloqueante). |
| M44 | ✅ Aprovado | `evidence/M44.png` | Horário domiciliar com cidade "Rio de Janeiro", UF "RJ", raio 10 km salva corretamente; linha exibe "Domiciliar · Rio de Janeiro/RJ · raio 10 km · desde 2026-08-18" (`M44.log`). |
| M45 | ✅ Aprovado | `evidence/M45.png` | Campo UF domiciliar força maiúsculas e limita a 2 caracteres: digitar "spabc" resultou em "SP" no campo (`M45.log`). |
| M46 | ✅ Aprovado (rodada 2) | `evidence/M46-retest.png` | Rodada 1 (`evidence/M46.png`): raio negativo (-15) era aceito e persistido apesar do `min="0"` no HTML (`POST` → 201). Corrigido no front-end com validação explícita de `raioKm >= 0` e `intervaloDeslocamentoMinutos >= 0` antes do submit. Reteste: preencher raio "-15" e salvar mostra "Raio e intervalo de deslocamento não podem ser negativos." e **nenhum** `POST /v1/api/agenda-medico` é disparado (`M46-retest.log`). |
| M47 | ✅ Aprovado | `evidence/M47.png` | Hora fim (08:00) menor que hora início (18:00): API rejeita com 400 e mensagem "Hora fim deve ser posterior à hora início" exibida no modal (`M47.log`). |
| M48 | ✅ Aprovado | `evidence/M48.png` | Botão "X" remove horário existente; `DELETE /v1/api/agenda-medico/{id}` → 204 No Content; linha some da lista (`M48.log`). |
| M49 | ✅ Aprovado | `evidence/M49.png` | "Cancelar" no formulário de novo horário volta à lista sem criar nada e sem perder os horários existentes; nenhum `POST` disparado (`M49.log`). |
| M50 | ✅ Aprovado | `evidence/M50.png` | Fechar modal de agenda e reabrir em outro médico mostra o título e os dados corretos do novo médico (estado `agendas`/`estabsDoMedico` reseta corretamente) (`M50.log`). |
| M51 | ✅ Aprovado | `evidence/M51.png` | Tab percorre os campos em ordem lógica (Nome → CRM → UF → Especialidade → E-mail → Telefone → Cancelar → Salvar) com foco visível em cada um. |
| M52 | ✅ Aprovado | `evidence/M52.png` | Esc com modal de cadastro aberto **fecha** o modal, descartando os dados digitados (comportamento real documentado). |
| M53 | ✅ Aprovado (rodada 2) | `evidence/M53-retest.png`, `evidence/M53-retest-top.png` | Rodada 1 (`evidence/M53.png`): clicar fora do modal não fechava. Causa raiz identificada por investigação de CSS: o overlay `fixed inset-0` do `Modal.tsx` herdava `margin-top: 24px` da regra `space-y-6` do container pai (já que o Modal é renderizado como filho/irmão normal dentro desse container), deixando uma faixa de 24px no topo inteiro da viewport onde o clique caía em elementos por trás (ex.: a sidebar) em vez do overlay. Corrigido com `!m-0` no elemento raiz do `Modal.tsx`. Reteste confirma `margin-top: 0px`, overlay cobrindo 100% da viewport, e clique em múltiplos pontos (incluindo o topo, onde estava o bug) fechando o modal corretamente (`M53-retest.log`). |
| M54 | 🟡 Parcialmente corrigido (bloqueado por backend) | `evidence/M54-retest-f5-1.png`, `evidence/M54-retest-f5-2.png` | Rodada 1 (`evidence/M54.png`): F5 disparava DUAS chamadas de refresh **concorrentes** (uma do efeito de mount do `useAuth`, outra independente do interceptor 401 do axios), ambas usando o mesmo refresh token, resultando em 401 duplo e logout. Corrigido no front-end: criado um coordenador único (`refreshAccessToken()` em `api.ts`) que compartilha uma única Promise em voo entre `useAuth` e o interceptor, eliminando a concorrência; também adicionado guard via `useRef` para o StrictMode não disparar o efeito de mount duas vezes. Reteste: 1º F5 após login mantém a sessão com **1 única** chamada de refresh (`M54-retest-f5-1.png`, `POST /v1/api/auth/refresh` → 200). Porém um 2º F5 em seguida ainda desloga (`M54-retest-f5-2.log`: `POST /v1/api/auth/refresh` → 401) — causa raiz remanescente é do **backend**: o refresh token parece ser de uso único, e o endpoint `/auth/refresh` não retorna um novo refresh token na resposta (`RefreshResponse` só tem `accessToken`/`expiresIn`/`tipo`, sem `refreshToken`), então o front-end não tem como persistir uma rotação que a API nunca fornece. Não é mais um bug de front-end; é uma limitação/lacuna de contrato do backend. |
| M55 | ❌ Reprovado | `evidence/M55.png` | Após cadastrar um médico ("QA Teste Voltar Avancar 2", `POST` → 201, id confirmado na resposta), usar Voltar (para `/pacientes`) e depois Avançar (para `/medicos`, sem reload de página) faz a lista recarregar via `GET /v1/api/medicos`, mas o médico recém-criado **não aparece mais** — resposta da API contém apenas o médico pré-existente "eduarda silva" (`M55.log`). Este é o mesmo padrão de perda de dados observado em M21/M27/M30 (ver "Achados críticos" no topo). **Repro:** cadastrar um médico novo, navegar para outra tela e voltar (ou usar Voltar/Avançar do navegador) → o médico criado segundos antes desaparece da listagem. |
| M56 | ✅ Aprovado | `evidence/M56.png` (+ `M56-loading.png` da primeira tentativa) | Simulado atraso de rede real via interceptação de rota do Playwright (`page.route` + `route.continue()` após 6s de delay) na chamada `GET /v1/api/medicos`. Spinner de carregamento permanece visível durante os 6s (nenhuma tela em branco, nenhum erro falso); dados carregam normalmente assim que a resposta chega (`M56.log`, `M56-detail.log` confirma `duration: 6037ms`). |
| M57 | ✅ Aprovado | `evidence/M57.png` | Simulado erro 500 via `page.route` + `route.fulfill({status:500, body:{detail:"Erro interno do servidor"}})` na listagem. A tela exibe a mensagem "Erro interno do servidor" (extraída do campo `detail` da resposta) de forma visível, sem stack trace cru ou JSON bruto exposto ao usuário (`M57.log`, `M57-console.log`). Observação: os dados antigos da lista permanecem visíveis abaixo do banner de erro (não são limpos), o que é um detalhe de UX mas não expõe informação técnica sensível. |

---

## Itens não testáveis

Nenhum item ficou definitivamente marcado como "⚠️ não testável" — mesmo M56 e M57, que dependiam de simulação de rede não suportada nativamente pelas ferramentas do Playwright MCP disponibilizadas (sem uma ferramenta dedicada de throttling), puderam ser validados de forma equivalente usando interceptação de rota via `browser_run_code_unsafe` (acesso direto à API do Playwright/`page.route`), o que permitiu atraso de resposta real e injeção de erro HTTP real — mais fiel do que um mock de XHR no navegador.

## Notas metodológicas

- Dados de teste usados: médicos com prefixo "QA Teste" e CRMs na faixa 999001–999030 (nunca reaproveitando CRM de médico pré-existente, exceto para o teste intencional de duplicidade em M23, que usou um CRM da própria QA).
- Nenhum médico pré-existente antes do início do QA ("eduarda silva", CRM 882151) foi editado ou inativado.
- Em vários pontos a sessão caiu por expiração/instabilidade de token (ver achado crítico #6); nesses casos foi feito login novamente com as mesmas credenciais de teste antes de prosseguir. Isso também explica por que médicos QA criados em uma "leva" de testes não estavam mais visíveis em levas posteriores — tanto pela instabilidade de sessão quanto pelo achado crítico #1 (perda de registros recém-criados).
- Cliques via Playwright nativo (`browser_click`) apresentaram timeouts intermitentes de "elemento estável" em alguns modais neste ambiente; nesses casos foi usado `browser_evaluate` para disparar o clique via DOM diretamente, sem alterar o comportamento testado.

---

## Resumo final — Rodada 1 (antes das correções)

- **Total de itens:** 57 (M01–M57)
- **✅ Aprovados:** 44 — M01–M14, M17, M19, M21, M23, M25, M26, M28, M29, M31, M33–M45, M47–M52, M56, M57
- **❌ Reprovados:** 13 — M15, M16, M18, M20, M22, M24, M27, M30, M32, M46, M53, M54, M55
- **⚠️ Não testáveis:** 0

## Resumo final — Rodada 2 (após correções de front-end)

Das 13 reprovações originais, **8 itens foram corrigidos no front-end e reconfirmados** (M20, M22, M24, M27, M30, M32, M46, M53). **1 item foi parcialmente corrigido**, com a causa remanescente atribuída ao backend (M54). **4 itens continuam bloqueados por bugs de backend** fora do escopo deste repositório (M15, M16, M18, M55 — filtros de servidor ignorados e perda de dados recém-criados).

- **Total de itens:** 57 (M01–M57)
- **✅ Aprovados:** 52 — todos os 44 originais + M20, M22, M24, M27, M30, M32, M46, M53
- **🟡 Parcialmente corrigido (bloqueado por backend):** 1 — M54
- **❌ Reprovados (bloqueados por backend, fora do escopo deste repo):** 4 — M15, M16, M18, M55
- **⚠️ Não testáveis:** 0

**Itens que exigem uma correção no backend (não neste repositório front-end) antes de fechar 100%:**
- M15, M16 — `GET /v1/api/medicos` ignora os parâmetros de query `ativo` e `especialidade`.
- M18 — consequência direta de M15/M16.
- M55 (e o padrão relacionado visto em M21/M27/M30 na rodada 1) — médicos recém-criados desaparecem de `GET /v1/api/medicos` pouco depois de criados; possível problema de persistência/consistência no backend.
- M54 — `/auth/refresh` não retorna um novo `refreshToken` na resposta, então a sessão não sobrevive a mais de um F5 seguido (token de uso único sem rotação exposta ao cliente).
