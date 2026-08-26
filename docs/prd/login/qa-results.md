# QA Results — Tela de Login (`/login`)

Execução ao vivo via Playwright MCP contra o app real em `http://localhost:3001`, backend real (portas 8080/8081/8082/8083), sem mocks. Login de teste: `eduardasilva@gmail.com` / `joaozinh7` (perfil MEDICO). Simulação de rede lenta/erro feita exclusivamente via `page.route`/`route.fulfill`/`route.continue` (Playwright real), nunca por mock de dados da aplicação em JS solto.

Evidências em `docs/prd/login/evidence/<id>.png` (print) e `docs/prd/login/evidence/<id>.log` (console/rede + análise), salvas por item.

---

## Rodada 2 — reteste pós-correções de front-end

Após a rodada 1 (37 aprovados / 1 parcialmente documentado / 5 reprovados), duas correções de
front-end foram aplicadas (fora deste QA) para os 5 itens reprovados. Cada um foi re-executado ao
vivo via Playwright MCP, com novas evidências (sufixo `-retest` nos arquivos):

- **L14, L15, L43** (401 real de login com credenciais erradas falhava silenciosamente) — confirmado
  corrigido: `src/services/api.ts` ganhou uma lista `PUBLIC_AUTH_PATHS` (`/auth/login`,
  `/auth/registrar`, `/auth/esqueci-senha`, `/auth/resetar-senha`); o interceptor de resposta agora
  pula o branch de refresh/redirect quando a requisição que falhou é para um desses endpoints
  públicos, deixando o 401 fluir normalmente até o `catch` de `LoginPage.tsx`. Testado com senha
  incorreta em conta cadastrada (L14) e e-mail não cadastrado (L15): toast "Credenciais invalidas."
  aparece visivelmente em ambos os casos, sem reload de página (provado com `window.__qaMarker`
  sobrevivendo ao submit) e com o formulário preenchido e utilizável depois do erro. A comparação
  401 real vs 403 simulado vs 500 simulado (L43) confirma que os três status agora produzem toast
  com mensagem específica, sem nenhum colapsar em "nada aparece":
  `evidence/L14-retest.png`, `evidence/L15-retest.png`, `evidence/L43-retest.png` (+
  `L43-retest-403.png`, `L43-retest-500.png`).
- **L21, L23** (duplo clique/múltiplos submits disparavam múltiplas requisições de login) —
  confirmado corrigido com guard síncrono `submitRef` (`useRef`) em `LoginPage.tsx`, mesmo padrão já
  usado em Médicos (M24) e CRM (C26). Testado com 2 cliques nativos síncronos no mesmo tick de JS
  (L21) e 4 `form.requestSubmit()` em rajada durante a requisição em voo (L23): em ambos os casos
  apenas **1** `POST /v1/api/auth/login` é disparado, contra 2 e 4 respectivamente na rodada 1, e a
  navegação para `/pacientes` acontece normalmente: `evidence/L21-retest.png`,
  `evidence/L23-retest.png`.

**Todos os 5 itens reprovados na rodada 1 foram confirmados corrigidos nesta rodada** (100% de taxa
de correção para os itens no escopo deste repositório front-end). Nenhum bug de front-end resta em
aberto na tela de Login.

Os detalhes de cada reteste estão na tabela abaixo, na linha do item correspondente (vereditos
atualizados para ✅, com link para as novas evidências mantendo também as evidências originais da
rodada 1 para rastreabilidade).

---

## Achados críticos (resumo executivo)

**Um bug crítico de front-end domina os resultados deste QA** — ele não é um problema isolado de um único item, mas a causa raiz de 5 dos 43 itens ficarem reprovados (L14, L15, L21, L23, L43):

1. **BUG CRÍTICO — Login com credenciais erradas falha silenciosamente, sem nenhum feedback ao usuário (L14, L15, L43).** Ao tentar logar com senha incorreta ou e-mail não cadastrado (ambos retornam `401 Unauthorized` do backend, com corpo de erro claro: `{"detail":"Credenciais invalidas.",...}`), **nenhum toast de erro aparece na tela**. Causa raiz identificada em `src/services/api.ts` (interceptor de resposta do axios, linhas 43-67): o interceptor trata **qualquer** resposta 401 — inclusive a do próprio endpoint de login — como "sessão expirada", tenta um refresh de token (que falha, pois não existe `refresh_token` numa tentativa de login), e então executa `window.location.href = '/login'` — um **reload completo da página**, mesmo o usuário já estando em `/login`. Esse reload destrói o componente antes que o `toast.error(...)` do `catch` em `LoginPage.tsx` consiga aparecer, e limpa os campos do formulário. Provado experimentalmente com um marcador `window.__qaMarker` que some após o 401 (mas permanece intacto após 403/500 simulados, confirmando que o bug é específico do status 401). Ver detalhes técnicos completos em `evidence/L14.log`.
   **Impacto:** este é o cenário de erro MAIS COMUM de qualquer tela de login (senha digitada errada) — e é justamente o único que falha silenciosamente. O usuário não recebe absolutamente nenhuma indicação de que o login falhou; a tela apenas "pisca" e os campos ficam vazios, como se nada tivesse acontecido.
   **Contraste (L17, L19, L43):** para status 500, erro de rede/timeout e 403 (todos simulados via interceptação real), o toast funciona perfeitamente e mostra a mensagem correta — confirmando que o bug é isolado ao branch de tratamento de 401 em `api.ts`.

2. **BUG — Duplo clique / múltiplos Enter durante o submit disparam múltiplas requisições de login (L21, L23).** O botão "Entrar" só fica `disabled` depois que `setLoading(true)` é processado por um re-render assíncrono do React — nesse intervalo, um segundo clique ou Enter (real ou automatizado, simulando um usuário impaciente) dispara uma segunda chamada `POST /v1/api/auth/login` completa, sem nenhum guard (`useRef`) bloqueando. Confirmado com 2 cliques síncronos (2 requisições) e 4 submits rápidos (4 requisições). Mesma classe de bug já identificada e corrigida em outras telas deste projeto (Médicos M24, CRM C26, ambos com guard `useRef`) — aqui ainda não foi corrigida.

Nenhum outro bug de front-end foi encontrado nos demais 38 itens. Alguns comportamentos do **backend** foram documentados (fora do escopo de correção deste repositório) por completude:
- E-mail é tratado como **case-sensitive** no login (L10) — `EduardaSilva@Gmail.com` é rejeitado mesmo sendo a mesma conta de `eduardasilva@gmail.com`.
- Não há rate limit/bloqueio temporário após múltiplas tentativas de login com credenciais erradas (L16) — nota de segurança para a equipe de backend, não bloqueante para este QA.

---

## Tabela de resultados

| ID | Veredito | Print | Evidência (resumo) |
|----|----------|-------|---------------------|
| L01 | ✅ Aprovado | `evidence/L01.png` | Formulário renderiza título, campos vazios, botão Entrar, links — tudo conforme esperado (`L01.log`). |
| L02 | ✅ Aprovado | `evidence/L02.png` | 0 erros no console ao carregar (`L02.log`). |
| L03 | ✅ Aprovado/documentado | `evidence/L03.png` | `document.activeElement` = `<body>`, confirma ausência de autoFocus (`L03.log`). |
| L04 | ✅ Aprovado | `evidence/L04.png` | Campo Senha é `type="password"`, caracteres mascarados (`L04.log`). |
| L05 | ✅ Aprovado/documentado | `evidence/L05.png` | Autenticado, `/login` aparece normalmente sem redirecionar; achado: dispara refresh de token em background (`L05.log`). |
| L06 | ✅ Aprovado | `evidence/L06.png` | `required` nativo bloqueia submit com campos vazios, sem chamada de rede (`L06.log`). |
| L07 | ✅ Aprovado | `evidence/L07.png` | `required` nativo bloqueia submit com Senha vazia (`L07.log`). |
| L08 | ✅ Aprovado | `evidence/L08.png` | `type="email"` nativo bloqueia "abc123" antes da API (`L08.log`). |
| L09 | ✅ Aprovado/documentado | `evidence/L09.png` | Navegador sanitiza espaços do `type="email"` automaticamente; login funciona (`L09.log`). |
| L10 | ✅ Aprovado/documentado | `evidence/L10.png` | Backend é case-sensitive para e-mail — `EduardaSilva@Gmail.com` retorna 401 (`L10.log`). |
| L11 | ✅ Aprovado | `evidence/L11.png` | `POST /auth/login` → 200, `GET /auth/me` → 200, navega para `/pacientes` (`L11.log`). |
| L12 | ✅ Aprovado | (reaproveita `L11.png`) | accessToken só em memória; `refresh_token` em localStorage; senha nunca persistida (`L12.log`). |
| L13 | ✅ Aprovado | `evidence/L13.png` | Voltar após login retorna a `/login` vazio (navegação usa push, não replace) (`L13.log`). |
| L14 | ✅ **Aprovado (rodada 2)** | `evidence/L14-retest.png` | Rodada 1: `evidence/L14.png` (reprovado, nenhum toast). Rodada 2: toast "Credenciais invalidas." visível, sem reload (`L14-retest.log`). |
| L15 | ✅ **Aprovado (rodada 2)** | `evidence/L15-retest.png` | Rodada 1: `evidence/L15.png` (reprovado, mesmo bug de L14). Rodada 2: toast visível, sem reload, sem vazamento de info sensível (`L15-retest.log`). |
| L16 | ✅ Aprovado/documentado | `evidence/L16.png` | 4 tentativas seguidas, todas 401, sem rate limit (nota de segurança de backend) (`L16.log`). |
| L17 | ✅ Aprovado | `evidence/L17.png` | Erro 500 simulado → toast "Erro interno do servidor" exibido corretamente (`L17.log`). |
| L18 | ✅ Aprovado | `evidence/L18.png` | Delay real de 5s → botão "Entrando..." desabilitado durante toda a espera (`L18.log`). |
| L19 | ✅ Aprovado | `evidence/L19.png` | Conexão recusada simulada → toast "Network Error", app não trava (`L19.log`). |
| L20 | ✅ Aprovado | `evidence/L20a.png`, `L20b.png` | Payloads de SQLi/XSS bloqueados pela validação nativa `type="email"` (`L20.log`). |
| L21 | ✅ **Aprovado (rodada 2)** | `evidence/L21-retest.png` | Rodada 1: `evidence/L21.png` (reprovado, 2 requisições). Rodada 2: guard `useRef` bloqueia o 2º clique — apenas 1 `POST /auth/login` (`L21-retest.log`). |
| L22 | ✅ Aprovado | `evidence/L22.png` | Enter no campo Senha submete o formulário normalmente (`L22.log`). |
| L23 | ✅ **Aprovado (rodada 2)** | `evidence/L23-retest.png` | Rodada 1: `evidence/L23.png` (reprovado, 4 requisições). Rodada 2: apenas 1 `POST /auth/login` em 4 submits rápidos (`L23-retest.log`). |
| L24 | ✅ Aprovado/documentado | `evidence/L24.png` | Inputs continuam editáveis durante "Entrando..." (só o botão fica disabled) (`L24.log`). |
| L25 | ✅ Aprovado | `evidence/L25.png` | "Esqueci minha senha" navega para `/esqueci-senha` sem erro (`L25.log`). |
| L26 | ✅ Aprovado | `evidence/L26.png` | "Criar conta" navega para `/registrar` sem erro (`L26.log`). |
| L27 | ✅ Aprovado | `evidence/L27.png` | Voltar de `/registrar` retorna a `/login` vazio (`L27.log`). |
| L28 | ✅ Aprovado | `evidence/L28.png` | Dados digitados não persistem após navegar e voltar (`L28.log`). |
| L29 | ✅ Aprovado | `evidence/L29.png` | Tab: E-mail → Senha → Entrar → Esqueci senha → Criar conta, ordem correta (`L29.log`). |
| L30 | ✅ Aprovado | `evidence/L30.png` | Labels associados via `for`/`id`; clique no texto foca o input (`L30.log`). |
| L31 | ✅ Aprovado | `evidence/L31.png` | Shift+Tab do botão Entrar retorna para Senha (`L31.log`). |
| L32 | ✅ Aprovado | `evidence/L32.png` | Login 100% via teclado (preencher, Tab, preencher, Enter) funciona (`L32.log`). |
| L33 | ✅ Aprovado | `evidence/L33.png` | F5 com formulário parcial → campos voltam vazios, sem erro (`L33.log`). |
| L34 | ✅ Aprovado/documentado | `evidence/L34.png` | Navegação manual para `/login` autenticado não redireciona (`L34.log`). |
| L35 | ✅ Aprovado | `evidence/L35.png` | `refresh_token` corrompido + rota privada → redireciona para `/login` sem tela em branco (`L35.log`). |
| L36 | ✅ Aprovado | `evidence/L36.png` | Login→logout→Voltar/Avançar não expõe tela autenticada (redirect usa `replace`) (`L36.log`). |
| L37 | ✅ Aprovado | `evidence/L37.png` | F5 no meio do login não deixa estado inconsistente (`L37.log`). |
| L38 | ✅ Aprovado | `evidence/L38.png` | Strings de 319/520 caracteres aceitas, submit não trava, API responde (`L38.log`). |
| L39 | ✅ Aprovado/documentado | `evidence/L39.png` | Paste funciona; senha colada com espaços é preservada literalmente e rejeitada (`L39.log`). |
| L40 | ✅ Aprovado/documentado | `evidence/L40.png` | Confirmado: não existe toggle de mostrar/ocultar senha (`L40.log`). |
| L41 | ⚠️ Parcialmente documentado | `evidence/L41.png` | Atributos `autoComplete` corretos confirmados; UI nativa de autofill não testável no ambiente de automação (`L41.log`). |
| L42 | ✅ Aprovado | `evidence/L42-mobile.png`, `L42-zoom200.png` | Mobile (375px) e zoom 200% sem overflow/sobreposição (`L42.log`). |
| L43 | ✅ **Aprovado (rodada 2)** | `evidence/L43-retest.png` | Rodada 1: `evidence/L43-403.png` (reprovado, 401 não mostrava nada). Rodada 2: 401 real, 403 e 500 (simulados) mostram mensagens corretas e específicas, sem reload em nenhum caso (`L43-retest.log`). |

---

## Itens não totalmente testáveis

- **L41** — a demonstração visual do autofill do gerenciador de senhas do navegador não é testável no ambiente de automação usado (perfil do Chrome sem credenciais salvas; a UI de sugestão de autofill é um overlay nativo do navegador, fora da árvore DOM acessível pelas ferramentas do Playwright MCP disponíveis). O pré-requisito técnico (atributos `autoComplete` corretos) foi confirmado via DOM.

Nenhum item foi "inventado" ou marcado como aprovado sem evidência — o item acima está documentado com o motivo real da limitação.

---

## Notas metodológicas

- **Instabilidade recorrente de clique/tecla nesta sessão:** `browser_click` (locator nativo do Playwright) sofreu timeouts de "elemento estável" de forma recorrente e imprevisível ao longo de todo o QA (mesma classe de instabilidade já relatada nos QAs de Médicos e CRM deste projeto, atribuída a animações/overlays como o botão flutuante "Assistente virtual"). Nenhum padrão único resolveu 100% dos casos; foi necessário alternar entre múltiplas estratégias ao longo da execução: `page.mouse.click(x, y)` com coordenadas reais de `boundingBox()`, `element.dispatchEvent(new MouseEvent('click', ...))` via DOM, e a ferramenta oficial `browser_press_key`/`browser_click` do MCP quando disponível. Em pelo menos duas ocasiões um clique "falhou silenciosamente" (sem erro reportado, mas sem nenhum efeito no app) — cada suspeita de bug envolvendo um clique falho foi sempre reconfirmada com uma segunda tentativa bem-sucedida antes de ser registrada como achado real (ver nota específica em `L36.log`, onde uma falsa suspeita de bug foi descartada dessa forma).
- **Simulação de rede lenta/erro** feita exclusivamente via `page.route`/`route.fulfill`/`route.continue` (Playwright real) dentro de `browser_run_code_unsafe`, nunca por mock de dados da aplicação em JS solto. Para delays, `page.waitForTimeout()` foi usado dentro do handler de rota em vez de `setTimeout` global, que não está disponível no sandbox de execução do `browser_run_code_unsafe` deste ambiente (`ReferenceError: setTimeout is not defined` — mesmo achado de ambiente de teste já relatado no QA de CRM).
- **Simulação de paste (L39)** feita via evento DOM real `ClipboardEvent('paste', ...)` + aplicação do valor por setter nativo, pois a permissão de clipboard do sistema operacional não estava disponível (`browserContext.grantPermissions` retornou `Protocol error: 'Browser.grantPermissions' wasn't found`).
- **Aba isolada para L36:** o teste de logout + Voltar/Avançar foi refeito numa aba nova (`browser_tabs new`) para obter um histórico de navegação limpo, já que a aba principal acumulou dezenas de entradas de navegação ao longo de todo o QA, o que distorceria a interpretação do teste.
- **Interrupção pontual de infraestrutura (L42):** durante a rolagem da página em zoom 200%, a aba controlada foi momentaneamente redirecionada para a página de conexão da própria extensão MCP (`chrome-extension://.../connect.html`) — evento de infraestrutura da ferramenta, sem relação com a aplicação testada; a navegação foi refeita normalmente sem qualquer efeito colateral.
- Dados de teste usados nas simulações de e-mail inexistente usaram domínios claramente fictícios (`@naoexiste.com`, `@exemplo-inexistente.com`) para não colidir com contas reais. Nenhuma conta nova foi criada durante este QA (não fazia parte do escopo do test-plan de Login).
- A conta de teste real (`eduardasilva@gmail.com`) e seus dados (10 pacientes cadastrados vistos incidentalmente em `/pacientes` durante os testes de sessão) não foram alterados nem apagados.

---

## Resumo final — Rodada 1 (antes das correções)

- **Total de itens:** 43 (L01–L43)
- **✅ Aprovados (incluindo "aprovado/documentado"):** 37 — L01–L13, L16–L20, L22, L24–L42 (exceto L41 parcial)
- **⚠️ Parcialmente documentado (limitação de ambiente):** 1 — L41
- **❌ Reprovados (bugs de front-end confirmados):** 5 — L14, L15, L21, L23, L43
- **⚠️ Não testáveis:** 0 (L41 foi parcialmente documentado, não totalmente bloqueado — o pré-requisito técnico foi verificável)

**Bloqueadores identificados antes de considerar a tela de Login pronta para produção:**
1. **`src/services/api.ts` (linhas 43-67)** — o interceptor de resposta do axios trata qualquer 401 (inclusive o do próprio `/auth/login`) como sessão expirada e força `window.location.href = '/login'`, impedindo QUALQUER mensagem de erro de aparecer para o caso mais comum de falha de login (senha incorreta / e-mail não cadastrado). Afeta L14, L15, L43. **Este é o achado mais crítico deste QA** — recomenda-se fortemente que o interceptor diferencie "401 de uma chamada autenticada com token expirado" de "401 da própria tentativa de login", por exemplo não aplicando o branch de refresh/reload quando `originalRequest.url` for `/auth/login` (ou `/auth/registrar`).
2. **`src/pages/LoginPage.tsx` (linhas 16-27)** — ausência de guard contra duplo clique/múltiplos submits (o mesmo padrão de correção com `useRef` já aplicado em Médicos e CRM deveria ser replicado aqui). Afeta L21, L23.

Nenhum bug de **backend** bloqueante foi encontrado nesta tela — os dois comportamentos de backend documentados (case-sensitivity de e-mail em L10, ausência de rate limit em L16) são observações de segurança/design, não bugs funcionais, e estão fora do escopo de correção deste repositório front-end.

## Resumo final — Rodada 2 (após correções de front-end)

- **Total de itens:** 43 (L01–L43)
- **✅ Aprovados (incluindo "aprovado/documentado"):** 42 — todos os itens exceto L41 (inclui L14, L15,
  L21, L23, L43, reconfirmados corrigidos nesta rodada)
- **⚠️ Parcialmente documentado (limitação de ambiente):** 1 — L41 (inalterado, não depende de código —
  UI nativa de autofill do navegador, fora da árvore DOM acessível pelas ferramentas do Playwright MCP)
- **❌ Reprovados:** 0 (todos os 5 reprovados da rodada 1 foram corrigidos e reconfirmados)
- **⚠️ Não testáveis:** 0

Das 5 reprovações originais (L14, L15, L21, L23, L43), **todas as 5 foram corrigidas no front-end e
reconfirmadas** — 100% de taxa de correção para os itens no escopo deste repositório. Nenhuma
reprovação de front-end resta em aberto na tela de Login.

**Bloqueadores da rodada 1, agora eliminados:**
1. ~~`src/services/api.ts` — interceptor tratava qualquer 401 (inclusive o de `/auth/login`) como
   sessão expirada e forçava reload.~~ Corrigido com a lista `PUBLIC_AUTH_PATHS`, que exclui os
   endpoints públicos de autenticação do branch de refresh/redirect. Confirmado nos retestes de L14,
   L15 e L43.
2. ~~`src/pages/LoginPage.tsx` — ausência de guard contra duplo clique/múltiplos submits.~~ Corrigido
   com guard síncrono `submitRef` (`useRef`), mesmo padrão já usado em Médicos e CRM. Confirmado nos
   retestes de L21 e L23.

Nenhum bug de **backend** bloqueante foi encontrado nesta tela em nenhuma das duas rodadas — os
comportamentos de backend documentados (case-sensitivity de e-mail em L10, ausência de rate limit em
L16) seguem sendo observações de segurança/design, fora do escopo de correção deste repositório
front-end. A tela de Login está, do ponto de vista de front-end, pronta para produção.
