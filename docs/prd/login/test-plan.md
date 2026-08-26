# Test Plan — Tela de Login (`/login`)

Ambiente: front-end em `http://localhost:3001`, backend real (`8080` API principal, `8081` auth, `8082` IA/CRM, `8083`) já em execução. Sem mocks — todas as chamadas batem no backend real. Simulação de rede lenta/erro é feita por interceptação real de rota (Playwright `page.route`/`browser_run_code_unsafe`), nunca por mock de dados da aplicação.

Login de teste válido: `eduardasilva@gmail.com` / `joaozinh7` (perfil `MEDICO`). Para os casos de erro, usar credenciais inexistentes/erradas de propósito.

Convenções: cada item tem checkbox + id curto (`Lxx`). Um item só é marcado quando o subagente de QA anexar **print da tela** + **saída crua de console/rede** comprovando o resultado. Item que o próprio implementador rodou não conta como aprovado.

Escopo: a tela `/login` (`LoginPage.tsx`) é a porta de entrada do sistema — nunca testada antes. O escopo cobre o formulário de login em si (campos, validação, submit, erros, loading, teclado, resiliência) e a navegação de saída para as páginas vizinhas diretamente linkadas (`/esqueci-senha`, `/registrar`) — sem testar a fundo o conteúdo interno dessas páginas vizinhas, que não fazem parte desta tarefa.

## 0. Renderização inicial

- [x] L01 — Acessar `/login` sem sessão ativa (localStorage limpo) renderiza o formulário com título "Bem-vindo ao SGSM", campos "E-mail" e "Senha" vazios, botão "Entrar", link "Esqueci minha senha" e botão "Criar conta". PASS (`evidence/L01.png`, `L01.log`).
- [x] L02 — Nenhum erro aparece no console do navegador ao carregar a tela pela primeira vez. PASS (`evidence/L02.png`, `L02.log`).
- [x] L03 — O campo "E-mail" não recebe foco automático ao carregar a página (documentar o comportamento real — não há `autoFocus` no código). Confirmado: `document.activeElement` é `<body>` (`evidence/L03.png`, `L03.log`).
- [x] L04 — O campo "Senha" é do tipo `password` (caracteres mascarados/ocultos ao digitar). PASS (`evidence/L04.png`, `L04.log`).
- [x] L05 — Acessar `/login` já autenticado — documentado: formulário aparece normalmente, SEM redirecionamento (LoginPage não checa isAuthenticated); achado adicional: a montagem de /login autenticado dispara silenciosamente um refresh de token em background (`evidence/L05.png`, `L05.log`).

## 1. Validação de campos

- [x] L06 — Tentar submeter o formulário com "E-mail" e "Senha" vazios — o atributo HTML `required` deve impedir o submit e mostrar a validação nativa do navegador no campo "E-mail" (nenhuma chamada de rede disparada). PASS (`evidence/L06.png`, `L06.log`).
- [x] L07 — Preencher só "E-mail" e deixar "Senha" vazia, tentar submeter — validação nativa `required` no campo "Senha" impede o submit. PASS (`evidence/L07.png`, `L07.log`).
- [x] L08 — Preencher "E-mail" com um valor sem `@` (ex. `abc123`) — o campo é `type="email"`, então a validação nativa do navegador deve bloquear o submit antes de qualquer chamada à API. PASS (`evidence/L08.png`, `L08.log`).
- [x] L09 — Preencher "E-mail" com espaços em branco no início/fim (ex. `" eduardasilva@gmail.com "`) e senha correta — documentado: o navegador sanitiza (remove) os espaços automaticamente em `input type="email"` antes do valor chegar ao React; login funciona normalmente (`evidence/L09.png`, `L09.log`).
- [x] L10 — Testar "E-mail" com maiúsculas/minúsculas misturadas de um e-mail cadastrado (ex. `EduardaSilva@Gmail.com`) — documentado: backend é CASE-SENSITIVE para e-mail, retorna 401 (`evidence/L10.png`, `L10.log`).

## 2. Submit — sucesso

- [x] L11 — Login com `eduardasilva@gmail.com` / `joaozinh7` (credenciais válidas): botão muda para "Entrando...", fica desabilitado durante a requisição, `POST /v1/api/auth/login` → 200, seguido de `GET /v1/api/auth/me` → 200, e a navegação para `/pacientes` acontece automaticamente. PASS (`evidence/L11.png`, `L11.log`; estado "Entrando..." confirmado visualmente em L18).
- [x] L12 — Após o login bem-sucedido, o token de acesso é mantido em memória e o `refresh_token` é persistido em `localStorage` — confirmado; senha nunca persistida em localStorage/sessionStorage. PASS (`L12.log`, reaproveita `evidence/L11.png`).
- [x] L13 — Após login bem-sucedido e redirecionamento para `/pacientes`, apertar "Voltar" do navegador — confirmado: volta para `/login` com formulário vazio (navegação usa push, não replace). PASS (`evidence/L13.png`, `L13.log`).

## 3. Submit — erro

- [x] L14 — ✅ Aprovado (rodada 2). Login com e-mail cadastrado e senha incorreta — toast de erro "Credenciais invalidas." agora aparece visivelmente, sem reload de página (`window.__qaMarker` sobrevive ao submit) e com o formulário preenchido e utilizável após o erro. Correção: `PUBLIC_AUTH_PATHS` em `src/services/api.ts` faz o interceptor pular o branch de refresh/redirect para 401 de `/auth/login`. Rodada 1 (reprovado): `evidence/L14.png`, `L14.log`. Reteste: `evidence/L14-retest.png`, `L14-retest.log`.
- [x] L15 — ✅ Aprovado (rodada 2). Login com e-mail não cadastrado — mesmo comportamento corrigido de L14: toast "Credenciais invalidas." visível, sem reload, sem vazamento de informação sensível (mensagem genérica idêntica à de senha errada). Rodada 1 (reprovado): `evidence/L15.png`, `L15.log`. Reteste: `evidence/L15-retest.png`, `L15-retest.log`.
- [x] L16 — Login repetido 4x com e-mail formato válido mas conta inexistente — documentado: backend aceita tentativas ilimitadas, sem rate limit/429/bloqueio observado (nota de segurança para o backend, fora do escopo deste repo). PASS/documentado (`evidence/L16.png`, `L16.log`).
- [x] L17 — Simular erro 500 do backend (interceptação real via `page.route`) — toast de erro amigável aparece corretamente ("Erro interno do servidor"), sem stack trace/JSON bruto. Contraste importante com L14/L15: para status != 401 o interceptor funciona corretamente. PASS (`evidence/L17.png`, `L17.log`).
- [x] L18 — Simular rede lenta (delay real de 5s via `page.route` + `route.continue()`) — botão permanece "Entrando..." desabilitado durante toda a espera (confirmado), inputs de e-mail/senha continuam habilitados. PASS (`evidence/L18.png`, `L18.log`).
- [x] L19 — Simular API fora do ar (`route.abort('connectionrefused')`) — toast "Network Error" visível, aplicação não trava, formulário utilizável. PASS (`evidence/L19.png`, `L19.log`).
- [x] L20 — Testado com `' OR 1=1--@x.com` e `<script>alert(1)</script>@x.com` — ambos bloqueados pela validação nativa `type="email"` do navegador antes de qualquer submit; nenhum script executado, nenhuma requisição disparada. PASS (`evidence/L20a.png`, `L20b.png`, `L20.log`).

## 4. Estado de carregamento / duplo submit

- [x] L21 — ✅ Aprovado (rodada 2). Duplo clique síncrono em "Entrar" com credenciais válidas — 2 `.click()` nativos disparados no mesmo tick via JS agora resultam em apenas 1 `POST /v1/api/auth/login` (200), não 2, graças ao guard `submitRef` (useRef) adicionado em `LoginPage.tsx`. Rodada 1 (reprovado): `evidence/L21.png`, `L21.log`. Reteste: `evidence/L21-retest.png`, `L21-retest.log`.
- [x] L22 — Apertar Enter dentro do campo "Senha" (sem clicar no botão) submete o formulário normalmente. PASS (`evidence/L22.png`, `L22.log`).
- [x] L23 — ✅ Aprovado (rodada 2). 4 submits rápidos (`form.requestSubmit()` em rajada, mesmo tick) durante requisição em andamento agora disparam apenas 1 `POST /v1/api/auth/login`, não 4 — mesmo guard `submitRef` de L21. Rodada 1 (reprovado): `evidence/L23.png`, `L23.log`. Reteste: `evidence/L23-retest.png`, `L23-retest.log`.
- [x] L24 — Durante "Entrando..." os inputs de E-mail/Senha continuam editáveis (documentado, não há `disabled` nos inputs, só no botão) — comportamento confirmado e fotografado. PASS/documentado (`evidence/L24.png`, `L24.log`).

## 5. Navegação para páginas vizinhas

- [x] L25 — Clicar em "Esqueci minha senha" navega para `/esqueci-senha` sem erro no console. PASS (`evidence/L25.png`, `L25.log`).
- [x] L26 — Clicar em "Criar conta" navega para `/registrar` sem erro no console. PASS (`evidence/L26.png`, `L26.log`).
- [x] L27 — Usar o botão "Voltar" do navegador a partir de `/esqueci-senha` ou `/registrar` retorna para `/login` com o formulário vazio (estado limpo, sem dados de tentativas anteriores). PASS (`evidence/L27.png`, `L27.log`).
- [x] L28 — Digitar dados no formulário de login, navegar para "Esqueci minha senha" e voltar — confirmado que os dados digitados anteriormente não aparecem mais (SPA sem persistência local do formulário). PASS (`evidence/L28.png`, `L28.log`).

## 6. Teclado e acessibilidade

- [x] L29 — Usar Tab a partir do campo "E-mail" percorre: E-mail → Senha → Entrar → Esqueci minha senha → Criar conta, em ordem lógica e com foco visível em cada elemento. PASS (`evidence/L29.png`, `L29.log`).
- [x] L30 — Cada campo tem `label` associado corretamente (via `htmlFor`/`id`) — confirmado clicando no texto do label e verificando que o foco vai para o input correspondente. PASS (`evidence/L30.png`, `L30.log`).
- [x] L31 — Usar Shift+Tab a partir do botão "Entrar" retorna o foco para o campo "Senha" (ordem reversa consistente). PASS (`evidence/L31.png`, `L31.log`).
- [x] L32 — Testar navegação e submit do formulário 100% via teclado (sem mouse): preencher e-mail, Tab, preencher senha, Enter — login funciona normalmente. PASS (`evidence/L32.png`, `L32.log`).

## 7. Navegação, reload e resiliência

- [x] L33 — Preencher parcialmente o formulário (e-mail e/ou senha) e apertar F5 — a página recarrega, campos voltam vazios (comportamento esperado de SPA sem persistência local), nenhum erro no console. PASS (`evidence/L33.png`, `L33.log`).
- [x] L34 — Estando autenticado, navegar manualmente para `/login` digitando a URL — documentado: formulário aparece normalmente sem redirecionar (`LoginPage` não checa `isAuthenticated`). PASS/documentado (`evidence/L34.png`, `L34.log`).
- [x] L35 — Com `refresh_token` corrompido em `localStorage`, acessar `/pacientes` — sistema redireciona corretamente para `/login`, sem tela em branco ou erro não tratado. PASS (`evidence/L35.png`, `L35.log`).
- [x] L36 — Login, logout (botão "Sair" na sidebar), Voltar e Avançar do navegador — nenhuma tela autenticada é exposta; o redirecionamento pós-logout usa `replace` no histórico, removendo a rota privada do histórico de navegação. PASS (`evidence/L36.png`, `L36.log`).
- [x] L37 — F5 durante requisição de login em andamento (antes da resposta) — não fica em estado inconsistente; localStorage limpo, formulário funcional após o reload. PASS (`evidence/L37.png`, `L37.log`).

## 8. Edge cases adicionais

- [x] L38 — Preencher "E-mail"/"Senha" com uma string extremamente longa (319/520 caracteres) — o campo aceita digitar, o submit não trava a UI, e a API responde (401) sem crashar a página. PASS (`evidence/L38.png`, `L38.log`).
- [x] L39 — Colar (paste) e-mail e senha nos respectivos campos — funciona normalmente; senha colada com espaços à frente/atrás é preservada literalmente e corretamente rejeitada (sem trim client ou server-side). PASS/documentado (`evidence/L39.png`, `L39.log`).
- [x] L40 — Toggle de mostrar/ocultar senha — confirmado que NÃO existe no DOM (apenas `<input type="password">` puro, sem ícone). Documentado (`evidence/L40.png`, `L40.log`).
- [x] L41 — Atributos `autoComplete="email"`/`autoComplete="current-password"` confirmados no DOM (habilitam o autofill nativo) — demonstração visual do autofill em si não testável neste ambiente de automação (sem credenciais salvas, UI nativa fora do DOM). Documentado (`evidence/L41.png`, `L41.log`).
- [x] L42 — Zoom 200% e viewport mobile (375x667) — formulário permanece usável, sem overflow horizontal nem sobreposição de elementos (confirmado por medição de bounding boxes). PASS (`evidence/L42-mobile.png`, `L42-zoom200.png`, `L42.log`).
- [x] L43 — ✅ Aprovado (rodada 2). Comparação 401 (real) vs 403 (simulado) vs 500 (simulado): os três status agora mostram toast com mensagem específica e clara, sem reload de página em nenhum caso (`window.__qaMarker401/403/500` sobrevivem aos três). O 401 real deixou de ser o único caso silencioso. Rodada 1 (reprovado): `evidence/L43-403.png`, `L43.log`. Reteste: `evidence/L43-retest.png` (401), `evidence/L43-retest-403.png`, `evidence/L43-retest-500.png`, `L43-retest.log`.
