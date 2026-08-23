# QA Results — Página "Assistente IA" (`/ia`)

> Execução AO VIVO com Playwright MCP contra `http://localhost:3001`, login `fabioeuro@gmail.com` / `famor966` (perfil MEDICO).
> Testa a página `/ia` ("Assistente IA", com abas Chat/KPIs), diferente do widget de chat flutuante "Assistente SGSM" já testado em `docs/prd/assistente-chatbot/`.
> Todas as evidências estão em `docs/prd/assistente-ia/evidence/` (caminho do checkout principal, onde o navegador Playwright MCP grava os arquivos). Para cada item: print de tela + saída crua de console/rede (via `browser_console_messages` / `browser_network_requests` / `browser_network_request` ou `browser_evaluate`).

## Resumo

- **Aprovados: 29** (IA001–IA029 — todos os itens, após reteste pós-correção de IA001, IA024 e IA029)
- **Reprovados/divergentes do esperado: 0** (IA024 e IA029 foram reprovados na rodada original; ambos confirmados corrigidos no reteste — ver subseções "Reteste (pós-correção)" abaixo)
- **Bloqueados: 0**
- **Não executados: 0**

> **Atualização (reteste pós-correção):** os 3 problemas identificados na rodada original (bug de proxy do Vite causando 403 em IA024/IA029, e o contraste branco-sobre-branco do título em IA001) foram corrigidos e reconfirmados com prova nova — ver as subseções "**Reteste (pós-correção):**" nas seções de IA001, IA024 e IA029, e a entrada correspondente em "Achados extras". Um terceiro bug (não numerado), descoberto durante a própria correção — `lg:h-screen` combinado com o padding do `<main>` causando overflow vertical de ~64px e rolagem automática da janela inteira ao carregar — também foi corrigido e reconfirmado. O texto original abaixo (achados da rodada inicial) foi mantido intacto para histórico.

Todos os 29 itens (IA001–IA029) foram executados ao vivo na rodada original. O item mais importante desta rodada foi um **bug crítico de infraestrutura de desenvolvimento**: o proxy do Vite (`vite.config.ts`) interceptava o path `/ia` (usado tanto pela rota SPA `/ia` quanto pelo prefixo de API `/ia/chat` e `/ia/kpis`), fazendo com que **qualquer navegação de página inteira (F5, digitar a URL, abrir em nova aba) para `/ia` fosse encaminhada para o backend `sgsm-ia` em vez de servir o `index.html` da SPA**, resultando em erro HTTP 403 em vez de carregar a página. Isso afetava diretamente IA024 (reload) e IA029 (acesso direto por URL). Ver detalhes na seção do IA024 e nos "Achados extras" — **corrigido e reconfirmado no reteste**.

Também foi descoberto um **bug de contraste crítico**: o título `<h1>Assistente IA</h1>` do cabeçalho usava `text-white` mas estava posicionado sobre fundo branco (`bg-background: rgb(255,255,255)`), tornando o texto do título completamente invisível (tanto desktop quanto mobile) — ver IA001 e "Achados extras" — **corrigido e reconfirmado no reteste**.

O restart do backend `sgsm-ia` (necessário para IA019/IA022) **funcionou com sucesso** — ver seção final.

---

## Abertura, estado inicial e navegação entre abas

### IA001 — Acessar `/ia` pelo menu lateral
**Aprovado, com achado crítico de contraste documentado.** Clicar em "Assistente IA" no menu lateral navega para `/ia`; a aba "Chat" fica ativa por padrão (confirmado via accessibility snapshot: `button "Chat" [active]`); os elementos exigidos pelo item (heading "Assistente IA", subtítulo "Powered by RAG + Milvus", abas Chat/KPIs) **existem no DOM** e estão semanticamente corretos.
- **Porém**, investigação visual (ver "Achados extras" #1) revelou que o `<h1>Assistente IA</h1>` é renderizado com `text-white` (`rgb(255,255,255)`) sobre um fundo que resolve para `rgb(255,255,255)` (branco) — ou seja, **o título "Assistente IA" é completamente invisível a olho nu**, tanto em desktop quanto mobile, apesar de estar presente e corretamente estruturado na árvore de acessibilidade. Confirmado via `document.elementFromPoint()` + `getComputedStyle` em cadeia de ancestrais, todos com `background-color: rgba(0,0,0,0)` até chegar ao `body` (`rgb(255,255,255)`).
- Prints: `evidence/IA001-IA002-abertura.png`, `evidence/EXTRA-desktop-header-recheck.png` (título ausente visualmente, apesar de presente no DOM)
- Console: 0 erros/warnings.

**Reteste (pós-correção):** **Confirmado corrigido.** `IaPage.tsx` (linha 140) ganhou `bg-[hsl(190,100%,10%)]` no container raiz. Refeito o teste com navegação de documento completo limpa (nova aba, `http://localhost:3001/ia`), sem rolar manualmente:
- Desktop (1280×800, mesma aba usada para IA029): `browser_evaluate` confirmou `window.scrollY: 0`, `getComputedStyle(h1).color: "rgb(255, 255, 255)"`, e o ancestral raiz da página (`div.flex.flex-col...bg-[hsl(190,100%,10%)]`) com `background-color: "rgb(0, 43, 51)"` (equivalente a `hsl(190,100%,10%)`) — não mais transparente/branco. O título "Assistente IA" aparece nitidamente visível no print, sem necessidade de scroll.
- Mobile (390×844, ver também IA026 abaixo): mesma verificação repetida — `h1Color: "rgb(255, 255, 255)"`, ancestral com `background-color: "rgb(0, 43, 51)"`, e `getBoundingClientRect()` do `<h1>` confirmou `top: 57, bottom: 73` (dentro da viewport de 1688 — lembrando que este ambiente reporta valores em dobro por causa do `devicePixelRatio: 0.5`, então em termos reais o título fica bem no topo visível, por volta de ~28-36px do topo). Nenhuma rolagem manual foi feita.
- Prints: `evidence/RETEST-IA029-acesso-direto-nova-aba.png` (desktop, mesma prova compartilhada com IA029 — carregamento limpo, título visível sem scroll), `evidence/RETEST-IA001-mobile-390x844-v2.png` (mobile).
- Nota: durante a correção, um bug relacionado de rolagem automática (container tinha `lg:h-screen`, mas o `<main>` que o envolve tem padding, gerando overflow vertical que empurrava a janela inteira para baixo via `scrollIntoView()`) também foi corrigido — ver "Achados extras" para detalhes e prova específica desse ponto.

### IA002 — Mensagem inicial do assistente
**Aprovado.** Ao carregar, a mensagem "Olá! Sou o assistente inteligente do SGSM. Posso responder perguntas sobre pacientes, médicos, agendamentos, serviços e também sobre o CRM Analítico — faturamento, churn, funil de conversão, ocupação de agenda e outros indicadores. Como posso ajudar?" aparece imediatamente, com timestamp.
- Print: `evidence/IA001-IA002-abertura.png` (accessibility snapshot confirma o texto exato)

### IA003 — Clicar na aba KPIs dispara `GET /ia/kpis`
**Aprovado.** Ao clicar em "KPIs" pela primeira vez, dispara `GET /ia/kpis` (request #84, 200 OK, 115ms), e os 7 cards de indicadores aparecem (`ocupacaoAgenda`, `churnRisco`, `pacientesAltoValor`, `resumo`, `faturamentoMensal`, `cancelamentos`, `funilMedico`).
- Print: `evidence/IA003-kpis-carregados.png`
- Rede: `browser_network_request` #84 — `[GET] /ia/kpis => [200] OK`, `content-type: application/json`, `authorization: Bearer ...`.

### IA004 — Voltar para Chat e reabrir KPIs não dispara nova chamada
**Aprovado.** Após clicar em "Chat" e depois "KPIs" novamente, `browser_network_requests` filtrado por `/ia/kpis` mostra apenas o request #84 (nenhum novo request), confirmando que o código só recarrega se `kpis` ainda for `null`.
- Print: `evidence/IA004-sem-nova-chamada.png`
- Rede: lista de requests idêntica antes/depois (só #84).

### IA005 — Botão "Atualizar" dispara nova chamada
**Aprovado.** Clicar em "Atualizar" disparou o request #85 (`GET /ia/kpis => [200] OK`), distinto do #84 anterior.
- Print: `evidence/IA005-atualizar-clicado.png`
- Rede: `browser_network_requests` mostrando #84 e #85.
- Nota: o ícone de refresh girando não foi capturado visualmente no print por a resposta local ser rápida demais (mesma limitação documentada no CB019 da rodada do chatbot) — a chamada de rede em si confirma o comportamento.

---

## Fluxo completo — Chat (happy path)

### IA006 — Digitar pergunta e pressionar Enter
**Aprovado.** "Quantos pacientes ativos existem?" + Enter: bolha do usuário aparece à direita, campo de texto limpa, resposta chega (não deu tempo de capturar "Consultando..." isoladamente pois a resposta chegou rápido, mas o fluxo consultando→resposta foi confirmado via rede).
- Print: `evidence/IA006-consultando.png`

### IA007 — Resposta chega como bolha à esquerda, request real
**Aprovado.** Resposta com timestamp confirmada. Rede: `POST /ia/chat` (request #86, 200 OK, 2260ms — tempo compatível com chamada real ao LLM, não mock), corpo da requisição `{"pergunta":"Quantos pacientes ativos existem?"}`, corpo da resposta `{"resposta":"De acordo com o resumo analítico do sistema de gestão médica, o total de pacientes cadastrados — que corresponde ao número de pacientes ativos no momento — é **42**."}`.
- Print: `evidence/IA007-resposta-recebida.png`
- Rede: `browser_network_request` #86 (request-body e response-body coletados).

### IA008 — Botão de enviar (em vez de Enter)
**Aprovado.** Pergunta "Qual médico tem mais agendamentos?" enviada via clique no botão (ícone de seta). Resposta real: "O médico com maior número de agendamentos é **Fabio Monteiro Amorim** (Neurologia)." Rede: request #87, `POST /ia/chat => [200] OK`.
- Print: `evidence/IA008-IA011-historico-duas-perguntas.png`

### IA009 — Shift+Enter cria nova linha
**Aprovado.** Usando digitação caractere-a-caractere (`slowly: true`) para simular teclado real (o preenchimento direto via `.fill()` substitui o valor inteiro e não serve para testar isso), confirmei via `browser_evaluate` que o valor do campo ficou `"Linha 1\nLinha 2"` após digitar "Linha 1", pressionar Shift+Enter, e digitar "Linha 2" — sem nenhuma bolha nova nem chamada de rede disparada.
- Print: `evidence/IA009-shift-enter-nova-linha.png`
- Rede: `browser_network_requests` confirmando que nenhum novo `POST /ia/chat` ocorreu (ainda só #86 e #87 até este ponto).

### IA010 — Foco permanece no campo após resposta
**Aprovado.** Após a resposta do IA006/IA007 chegar, `browser_evaluate` confirmou `document.activeElement` = `TEXTAREA` com o placeholder correto, sem nenhum clique manual no campo.

### IA011 — Histórico de duas perguntas visível na ordem correta
**Aprovado.** Após IA006/IA007 (pergunta 1 + resposta 1) e IA008 (pergunta 2 + resposta 2), o accessibility snapshot confirma as 4 mensagens (+ saudação inicial) na ordem cronológica correta.
- Print: `evidence/IA008-IA011-historico-duas-perguntas.png`

---

## Edge cases — Chat

### IA012 — Campo vazio
**Aprovado.** Botão de enviar aparece `[disabled]` no snapshot com campo vazio. Pressionar Enter não disparou nova chamada de rede (`browser_network_requests` permaneceu em #86/#87, sem novo request) nem bolha nova.
- Print: `evidence/IA012-campo-vazio.png`

### IA013 — Campo só com espaços em branco
**Aprovado.** Campo preenchido com `"   "` (3 espaços, confirmado via `browser_evaluate`/`JSON.stringify`) manteve o botão `[disabled]`; Enter não disparou requisição nem bolha nova.
- Print: `evidence/IA013-espacos-brancos.png`

### IA014 — Enter/clique repetido durante carregamento não duplica requisição
**Aprovado.** Com a pergunta "Quais serviços o Fabio Monteiro Amorim oferece?" enviada, pressionei Enter mais 2 vezes em sequência rápida enquanto a resposta ainda carregava. `browser_network_requests` confirmou **apenas um** novo request (#88) e o accessibility snapshot confirmou apenas uma bolha de pergunta + uma bolha de resposta novas.
- Print: `evidence/IA014-loading-multiplo-enter.png`

### IA015 — Duplo clique no botão de enviar não duplica
**Aprovado.** Duplo clique rápido (`doubleClick: true`) no botão de enviar com "teste duplo clique" digitado resultou em **apenas uma** bolha nova e **apenas um** novo request (#89, resposta: "Só respondo perguntas relacionadas a pacientes, médicos, agendamentos e dados clínicos do sistema SGSM.").
- Print: `evidence/IA015-duplo-clique-enviar.png`

### IA016 — Pergunta longa (1-2 parágrafos)
**Aprovado.** Pergunta de ~500 caracteres enviada; a bolha de resposta cresceu e quebrou linha corretamente, sem cortar texto nem estourar o layout do painel (largura da bolha respeitada, texto multilinha completo visível). Request #90 confirmado.
- Prints: `evidence/IA016-pergunta-longa-digitada.png`, `evidence/IA016-bolha-longa.png`

### IA017 — Caracteres especiais/HTML (`<script>alert(1)</script>` + `<b>teste</b>`)
**Aprovado.** O texto apareceu **literalmente** como texto na bolha do usuário (accessibility snapshot mostra o texto cru, incluindo as tags como caracteres, não como elementos HTML renderizados). Nenhum `alert()` disparou (nenhum dialog interceptado), nenhum erro no console (`browser_console_messages` nível error: 0 mensagens).
- Print: `evidence/IA017-xss-texto-literal.png`
- Console: 0 erros.

### IA018 — Pergunta fora do escopo do sistema
**Aprovado/documentado.** "Qual a capital da França?" → o assistente recusou educadamente de forma consistente: "Só respondo perguntas relacionadas a pacientes, médicos, agendamentos e dados clínicos do sistema SGSM." (mesma resposta observada em outras tentativas de pergunta fora de escopo, ex. IA015). Não é bug — comportamento documentado conforme esperado pelo item.
- Print: `evidence/IA018-pergunta-fora-escopo.png`
- Rede: `POST /ia/chat => [200] OK` (request #92).

### IA019 — Backend de IA fora do ar (chat)
**Aprovado.** Ver seção "Backend de IA fora do ar" abaixo (executado por último, conforme instruído).

---

## Fluxo — KPIs

### IA020 — 7 indicadores como cards com rótulo formatado
**Aprovado.** Os 7 cards aparecem com rótulos formatados a partir do nome do campo: "ocupacao Agenda", "churn Risco", "pacientes Alto Valor", "resumo", "faturamento Mensal", "cancelamentos", "funil Medico" — confirmando a transformação camelCase → palavras separadas (`faturamentoMensal` → "faturamento Mensal", conforme especificado no item).
- Print: `evidence/IA020-IA021-kpis-cards.png` (full page)

### IA021 — JSON formatado dentro do card sem estourar layout
**Aprovado.** Os cards `ocupacaoAgenda` e `funilMedico` (os com JSON mais extenso, arrays com múltiplos médicos) mostram o JSON quebrando linha corretamente dentro dos limites do card, sem overflow horizontal nem vertical estourando o grid.
- Print: `evidence/IA020-IA021-kpis-cards.png`

### IA022 — Backend de IA fora do ar (KPIs)
**Aprovado.** Ver seção "Backend de IA fora do ar" abaixo.

---

## Navegação, reload e estado

### IA023 — Navegação client-side reinicia a conversa
**Aprovado/documentado.** Com uma conversa em andamento (múltiplas perguntas/respostas), naveguei para "Pacientes" via menu lateral e voltei para "Assistente IA" (ambos client-side, via React Router). O componente foi desmontado/remontado: a conversa voltou a mostrar **apenas** a saudação inicial (novo timestamp), confirmando que o estado não é preservado entre navegações — comportamento esperado tecnicamente (componente dentro do `<Outlet>`), confirmado ao vivo.
- Print: `evidence/IA023-navegacao-reinicia-chat.png`

### IA024 — Reload (F5) no meio de uma conversa
**Reprovado — o comportamento real é pior do que o esperado pelo item.** O item espera "conversa perdida, volta à saudação inicial". **Na prática, o reload nem chega a mostrar a saudação inicial: a página inteira falha ao carregar, retornando HTTP 403 Forbidden.**
- **Causa raiz confirmada:** o proxy do Vite dev server (`vite.config.ts`, linhas 25-28) tem a regra `'/ia': { target: 'http://localhost:8082' }`. Essa regra usa **prefixo de path**, então intercepta não só `/ia/chat` e `/ia/kpis` (uso pretendido, chamadas de API via XHR) mas também **o próprio path da rota SPA `/ia`**. Qualquer navegação de página inteira (reload/F5, digitar a URL, abrir link em nova aba) para `/ia` é encaminhada para o backend `sgsm-ia` na porta 8082 em vez de servir o `index.html` da aplicação React. O backend não tem uma rota mapeada para `GET /ia` (sem sufixo) e retorna **403 Forbidden** (corpo vazio, headers típicos do Spring Security), confirmado tanto via `curl -i http://localhost:3001/ia` (`HTTP/1.1 403 Forbidden`) quanto via `browser_navigate` no Playwright (`net::ERR_HTTP_RESPONSE_CODE_FAILURE`, página de erro `chrome-error://chromewebdata/` com "HTTP ERROR 403").
- **Confirmação de que é específico do path `/ia`:** o mesmo teste com `browser_navigate` para `/pacientes` funcionou normalmente (recarregou a SPA sem problema), isolando o bug ao prefixo `/ia`.
- **Impacto:** qualquer usuário que dê F5, abra a página em nova aba, ou clique em "voltar"/"avançar" do navegador de um jeito que force uma navegação de documento completo (não client-side) na URL `/ia` verá uma tela de erro 403 em branco, sem nenhuma UI da aplicação, precisando navegar manualmente de volta pela URL base.
- **Nota:** o `localStorage`/`sessionStorage` foram checados antes do reload (`browser_evaluate`) e continham apenas `refresh_token` (chave de autenticação) — nenhuma chave relacionada ao chat, confirmando que, se o reload funcionasse, a conversa realmente não seria persistida (a parte comportamental que o item queria testar está correta, mas o bug do proxy impede que esse fluxo sequer aconteça).
- Print: `evidence/IA024-IA029-BUG-403-navegacao-direta.png`
- Console: `[ERROR] Failed to load resource: the server responded with a status of 403 () @ chrome-error://chromewebdata/:0`
- **Este mesmo bug também é a causa da divergência no IA029 (ver abaixo).**

**Reteste (pós-correção):** **Confirmado corrigido.** `vite.config.ts` (linha 25) mudou a regra do proxy de `'/ia'` para `'/ia/'` (com barra final), deixando de casar com o path exato `/ia`. Refeito o teste com uma navegação de documento completo estando já em `/ia` (equivalente a F5): `browser_navigate('http://localhost:3001/ia')` a partir de uma aba já carregada em `/ia`.
- `browser_network_requests` confirmou o primeiro request como `[GET] http://localhost:3001/ia => [200] OK` (não mais 403) — lista completa de 76 requests, todos 200 OK, incluindo os módulos Vite/React e a chamada final `GET /v1/api/auth/me => [200] OK` (sessão restaurada via refresh token).
- `browser_console_messages` nível error: 0 mensagens (antes era `[ERROR] ... 403 ... chrome-error://chromewebdata`).
- A página carregou normalmente, com a saudação inicial do chat visível e o cabeçalho "Assistente IA" legível (fundo escuro, corrigido — ver IA001).
- Print: `evidence/RETEST-IA024-reload-f5-sucesso.png`.

### IA025 — Botão "Voltar" do navegador
**Aprovado.** Estando em `/ia` (chegado via navegação client-side), cliquei em "Voltar" do navegador (`browser_navigate_back`) e a navegação para `/pacientes` ocorreu normalmente, sem erro no console (`browser_console_messages` nível error: 0 mensagens) — porque o "voltar" do navegador aciona o histórico do React Router via `popstate` (client-side), não uma navegação de documento completo, então **não** é afetado pelo bug do proxy descrito no IA024.
- Print: `evidence/IA025-voltar-navegador.png`

---

## Mobile e responsividade

### IA026 — Viewport mobile (390×844)
**Aprovado, com nota sobre `devicePixelRatio` do ambiente.** `browser_evaluate` confirmou `devicePixelRatio: 0.5` neste ambiente (valor atípico, gerando `window.innerWidth` reportado como 780 em vez de 390 — um artefato conhecido do ambiente, já mencionado no próprio texto do item do plano). Independentemente disso, testado com o viewport físico configurado em 390×844: o cabeçalho mobile ("SGSM" + botão hambúrguer "Toggle menu"), as abas Chat/KPIs, a mensagem inicial e o campo de texto ficam todos utilizáveis e visíveis, sem cortar conteúdo nem sobrepor o cabeçalho mobile.
- Print: `evidence/IA026-mobile-390x844.png`
- (Nota: o mesmo problema de contraste branco-sobre-branco do IA001 também afeta o título "Assistente IA" no mobile — texto presente no DOM mas visualmente invisível.)

### IA027 — Enviar mensagem no mobile, scroll da área de mensagens
**Aprovado.** No viewport 390×844, enviei "Quantos pacientes ativos existem?"; a resposta chegou (`POST /ia/chat => 200 OK`, request #82) e a área de mensagens mostrou tanto a saudação inicial quanto a pergunta e a resposta, com o campo de texto permanecendo visível e utilizável na parte inferior, sem sobreposição.
- Print: `evidence/IA027-mobile-mensagem-scroll.png`

---

## Acesso e permissão

### IA028 — Link "Assistente IA" só aparece para MEDICO/FUNCIONARIO/DESENVOLVEDOR
**Aprovado — verificado por código** (sem conta de teste PACIENTE disponível, conforme permitido pelo próprio item). Em `src/components/layout/Sidebar.tsx`, linha 31:
```ts
{ to: '/ia', label: 'Assistente IA', icon: Sparkles, roles: ['MEDICO', 'FUNCIONARIO', 'DESENVOLVEDOR'] },
```
E linha 137: `const visibleItems = navItems.filter(item => item.roles.includes(perfil))`. O array `roles` do item `/ia` **não inclui `'PACIENTE'`** (diferente de outros itens como `/`, `/pacientes` e `/agendamentos`, que incluem `'PACIENTE'` explicitamente) — confirmando que o link fica oculto para o perfil PACIENTE.

### IA029 — Acesso direto à URL `/ia` estando autenticado como MEDICO
**Reprovado — resultado real diverge do esperado pelo próprio texto do plano, pela mesma causa raiz do IA024.** O item esperava "deve carregar normalmente (sem guard de perfil no front)". Confirmei via código (`src/App.tsx`, linha 55: `<Route path="/ia" element={<IaPage />} />` dentro do `<PrivateRoute />`) que **de fato não há guard de perfil** no nível de rota — isso está correto. **Porém, na prática, a tentativa de acessar `/ia` diretamente (navegação de página inteira, ex. digitar a URL e dar Enter, ou abrir em nova aba) não chega nem a testar o guard de perfil, porque falha antes disso** com o mesmo erro 403 do IA024 (o proxy do Vite intercepta o path `/ia` e o encaminha para o backend `sgsm-ia`, que não tem essa rota mapeada). Reproduzido com `browser_navigate('http://localhost:3001/ia')` a partir de uma aba já autenticada como MEDICO em `/pacientes` — mesmo assim, resultado foi 403, não a página carregada.
- Print: `evidence/IA024-IA029-BUG-403-navegacao-direta.png` (evidência compartilhada com IA024, mesma causa raiz)
- **Distinção importante:** a navegação *client-side* para `/ia` (clicando no link do menu lateral estando já em qualquer outra página da SPA) **funciona perfeitamente** — foi usada em praticamente todos os outros itens deste relatório. O problema é exclusivo de navegações de **documento completo** (full page load) para esse path específico.

**Reteste (pós-correção):** **Confirmado corrigido.** Com a regra do proxy corrigida (`'/ia/'` em vez de `'/ia'`), refeito o teste de acesso direto por URL simulando "digitar a URL e dar Enter" de forma ainda mais estrita que o reteste do IA024: abri uma **nova aba do zero** (`browser_tabs` → `new`, sem reaproveitar sessão/estado de navegação anterior na mesma aba) e naveguei diretamente para `http://localhost:3001/ia`.
- `browser_network_requests` confirmou `[GET] http://localhost:3001/ia => [200] OK` como primeiro request.
- `browser_console_messages` nível error: 0 mensagens.
- A página carregou a SPA normalmente (título da aba "SGSM — Médico", não uma página de erro `chrome-error://`), confirmando que o guard de perfil (ou ausência dele) do `<PrivateRoute />`/`<Route path="/ia">` agora é de fato exercitado em acesso direto — comportamento esperado pelo item original (carrega normalmente, sem guard de perfil no front) finalmente pôde ser validado.
- Print: `evidence/RETEST-IA029-acesso-direto-nova-aba.png`.

---

## Backend de IA fora do ar (IA019 e IA022)

Executado por último, conforme instruído, com o cuidado de restaurar o backend ao final independentemente do resultado.

**Procedimento:**
1. `netstat -ano | grep ":8082" | grep LISTENING` → PID 18700 identificado.
2. `taskkill //F //PID 18700` → processo finalizado com sucesso.
3. `curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:8082/ia/kpis` → `FAILED: curl 000` (connection refused, exit code 7) — backend confirmado fora do ar.

### IA019 — Backend fora do ar, enviar pergunta no Chat
**Aprovado.** Com o backend derrubado, enviei "Quantos pacientes ativos existem?" pelo Chat (já em `/ia`, chegado via navegação client-side, então a página em si carregou normalmente — só a chamada de API falhou). Resultado:
- Uma bolha de erro do assistente apareceu: **"Não consegui processar sua pergunta. Request failed with status code 500"** (o proxy do Vite converte a falha de conexão para 500 ao tentar encaminhar para o backend derrubado).
- Um **toast de erro "Erro ao consultar o assistente"** foi disparado (confirmado via `toast.error('Erro ao consultar o assistente')` no código-fonte `src/pages/IaPage.tsx` linha 115, e capturado ao vivo via polling programático de 150ms sobre a região `[aria-label="Notifications alt+T"]`, que mostrou o texto exato do toast nos primeiros ~300ms antes de desaparecer — o toast tem duração muito curta, por isso não aparecia nos screenshots com delay normal).
- A tela não travou; testei 4 envios consecutivos (incluindo cliques rápidos) e cada um gerou exatamente uma bolha de erro nova, sem duplicar o indicador de carregamento nem travar o campo de texto permanentemente.
- Prints: `evidence/IA019-backend-down-erro-chat.png`, `evidence/IA019-toast-screenshot-imediato.png` (toast capturado como retângulo vermelho no canto superior direito, parcialmente cortado pela velocidade da captura)
- Rede: `browser_network_requests` confirmou 4 requests `POST /ia/chat => [500] Internal Server Error` (#81-84).
- Console: `[ERROR] Failed to load resource: the server responded with a status of 500 (Internal Server Error) @ http://localhost:3001/ia/chat:0`.
- Captura programática do toast (via `browser_run_code_unsafe`, polling a cada 150ms): `{"t":0,"text":"Erro ao consultar o assistente"}`, `{"t":150,"text":"Erro ao consultar o assistente"}`, `{"t":300,"text":""}` (já desaparecido).

### IA022 — Backend fora do ar, clicar em "Atualizar" na aba KPIs
**Aprovado.** Com o backend ainda derrubado, cliquei na aba "KPIs" (primeira carga automática) e depois explicitamente em "Atualizar":
- Toast de erro **"Erro ao carregar KPIs"** capturado no accessibility snapshot (`region "Notifications alt+T"` continha o item de lista com esse texto exato).
- A tela mostrou "Nenhum dado carregado" em vez de travar ou quebrar o layout.
- Rede: `GET /ia/kpis => [500] Internal Server Error` nos requests #85 (carga automática da aba) e #86 (clique explícito em "Atualizar").
- Prints: `evidence/IA022-backend-down-erro-kpis.png`, `evidence/IA022-atualizar-clicado-backend-down.png`

### Restart do backend
5. `cd /c/AmbienteDev/sgsm-ia && mvn spring-boot:run > /tmp/sgsm-ia-restart.log 2>&1 &` — processo iniciado em background.
6. Polling de `curl` a cada 3s: **backend voltou a responder em ~8 segundos** (novo PID 31588), com HTTP 403 no endpoint `/ia/kpis` sem autenticação (esperado — confirma que o Spring Security do backend está de pé, não uma falha).
7. **Confirmação de que é o serviço real (não um processo zumbi):** o log `/tmp/sgsm-ia-restart.log` mostra o ciclo de boot completo do Spring Boot — `"Started SgsmIaApplication in 6.266 seconds"`, `"Tomcat started on port 8082"`, seguido pela reindexação automática de todos os 7 documentos analíticos no Milvus (`resumo-analitico`, `faturamento-mensal`, `ocupacao-agenda`, `alto-valor`, `churn-risco`, `funil-medico`, `cancelamentos`) e `"CRM Analítico re-indexado com sucesso"`.
8. **Confirmação funcional final via front-end:** cliquei em "Atualizar" na aba KPIs (já autenticado) e o request #87 retornou `GET /ia/kpis => [200] OK` — o ambiente foi restaurado ao estado funcional.
- Print: `evidence/RESTART-backend-recuperado-200.png`

**O restart funcionou integralmente — não houve necessidade de intervenção manual pelo usuário.**

---

## Achados extras (fora da numeração IAxxx, mas relevantes)

1. **[CRÍTICO] Bug de proxy do Vite intercepta a própria rota SPA `/ia`.** A regra `'/ia': { target: 'http://localhost:8082' }` em `vite.config.ts` (linhas 25-28) usa correspondência de prefixo, então qualquer navegação de documento completo (F5, digitar URL, nova aba, links `target="_blank"`) para exatamente `/ia` é interceptada pelo proxy e encaminhada ao backend `sgsm-ia`, que não tem rota mapeada para esse path exato e retorna 403. Isso quebra IA024 (reload) e IA029 (acesso direto por URL) — ambos os itens esperavam comportamentos que nunca chegam a ocorrer porque a página falha ao carregar antes. Recomendação: ajustar a regra do proxy para não capturar o path bare `/ia` (ex. usar `'/ia/'` com barra final, ou regex mais específico tipo `^/ia/(chat|kpis)`), preservando o roteamento client-side da SPA.
2. **[CRÍTICO] Texto branco sobre fundo branco no título "Assistente IA".** O `<h1>` do cabeçalho da página usa a classe `text-white`, mas o container ancestral não define nenhum `background-color` sólido até chegar ao `<body>` (branco). O resultado é que o título fica completamente invisível para o usuário, tanto em desktop quanto mobile, embora esteja presente e correto na árvore de acessibilidade/DOM. Confirmado via inspeção de `getComputedStyle` em cadeia e `document.elementFromPoint()`. Comparação: o subtítulo "Powered by RAG + Milvus", logo abaixo, usa uma cor teal (`rgb(73,197,208)`) e é perfeitamente visível — sugerindo que o `<h1>` deveria usar uma cor com contraste adequado (ou o container deveria ter um fundo escuro que parece ter sido perdido/removido). Prints: `evidence/EXTRA-desktop-header-recheck.png`, `evidence/EXTRA-desktop-header-fresh.png`.
3. **Highlight incorreto do menu lateral após "Voltar" do navegador.** Ao usar o botão "Voltar" do navegador para sair de `/ia` e retornar para `/pacientes` (cenário testado no IA025), o link "Assistente IA" no menu lateral permaneceu marcado como `[active]` mesmo com o conteúdo da página já mostrando "Pacientes" — uma dessincronização momentânea entre o estado visual do menu e a rota real. Não testado exaustivamente se persiste ou se autocorrige com nova interação; registrado por transparência. Print: `evidence/EXTRA-sidebar-active-incorreto-pos-voltar.png`.
4. **[CORRIGIDO] Rolagem automática da janela inteira ao carregar `/ia`, causada por overflow vertical de ~64px.** Descoberto durante a própria correção dos bugs #1 e #2 (não fazia parte do relatório original, sem número IAxxx). Causa: o container raiz de `IaPage.tsx` tinha `lg:h-screen` (altura = 100vh em telas ≥1024px), mas a página é renderizada dentro de um `<main>` com `lg:p-8` (padding de 2rem em cima e embaixo = 4rem/64px total), ou seja, a altura real disponível para o conteúdo é `100vh - 64px`, não `100vh`. Isso fazia a página ficar ~64px mais alta que o espaço disponível, gerando overflow vertical no documento inteiro. O `useEffect` que chama `bottomRef.current?.scrollIntoView({ behavior: 'smooth' })` ao carregar (para rolar até a última mensagem do chat) então rolava a **janela inteira** para baixo (não só a área de mensagens), empurrando o cabeçalho ("Assistente IA" + abas Chat/KPIs) para fora da viewport — de forma que, mesmo depois de corrigido o contraste do IA001, o título continuava efetivamente invisível ao carregar a página (agora por estar fora da tela, não mais por cor).
   - **Correção:** trocado `lg:h-screen` por remover essa regra, mantendo apenas `h-[calc(100vh-4rem)]` (que já existia como padrão para mobile) aplicado em todos os breakpoints — `IaPage.tsx` linha 140: `className="flex flex-col h-[calc(100vh-4rem)] max-h-screen overflow-hidden bg-[hsl(190,100%,10%)]"`.
   - **Reteste:** em desktop (1280×800), `window.scrollY` confirmado em `0` imediatamente após navegação limpa (nova aba, sem scroll manual) — ver prova em `evidence/RETEST-IA029-acesso-direto-nova-aba.png` e o `browser_evaluate` correspondente (`scrollY: 0`). Em mobile (390×844), restou um resíduo de rolagem bem menor (`scrollY` reportado ~41 nas unidades duplicadas deste ambiente — equivalente a ~20px reais), provavelmente porque no mobile o `<main>` usa `p-6` (48px totais) mais o cabeçalho mobile sticky (`~29px` reais) somando pouco mais que os `4rem`/64px assumidos pelo cálculo `h-[calc(100vh-4rem)]`. **Esse resíduo não reproduz o bug original**: o cabeçalho mobile ("SGSM" + hambúrguer) usa `position: sticky; top: 0`, então permanece fixo no topo da viewport independentemente do scroll do documento (confirmado via `getBoundingClientRect()`: `top: 0`), e o `<h1>Assistente IA</h1>` da página, medido diretamente, ficou com `top: 57` (dentro da viewport de `1688`, ou seja bem no topo visível em termos reais) — nenhum conteúdo relevante fica fora da tela. Registrado por transparência, não bloqueia a aprovação.
   - Print mobile: `evidence/RETEST-IA001-mobile-390x844-v2.png`.
5. **Toast de erro tem duração muito curta (~150-300ms observados).** Tanto o toast do IA019 ("Erro ao consultar o assistente") quanto o do IA022 ("Erro ao carregar KPIs") desaparecem muito rapidamente — em capturas de tela com delay normal (mesmo de ~1 segundo), o toast já havia sumido na maioria das tentativas. Só foi possível capturar de forma confiável usando polling programático de 150ms via `browser_run_code_unsafe`. Isso pode ser uma configuração de duração muito baixa da biblioteca `sonner` (ou um efeito colateral da resposta de erro ser muito rápida, já que é uma falha de conexão local, sem lag de rede real). Não necessariamente um bug, mas pode prejudicar a percepção do usuário em cenários reais.

---

## Observações finais

- Nenhum dado de teste persistente foi criado nesta rodada (perguntas ao chat não alteram dados; KPIs são somente leitura).
- O ambiente de testes usa `devicePixelRatio: 0.5`, uma característica já documentada no próprio test-plan como atenção necessária ao interpretar screenshots — não é um bug da aplicação.
