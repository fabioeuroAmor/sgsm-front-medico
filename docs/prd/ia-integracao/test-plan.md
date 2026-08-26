# Test Plan — IaPage (`/ia`) — Integração com sgsm-ia

Rota: `http://localhost:3001/ia`. Rota **privada** (dentro de `PrivateRoute` + `Layout`,
`App.tsx`), exige login. Duas abas: **Chat** (RAG via `/ia/chat`, proxy Vite para
`sgsm-ia:8082`) e **KPIs** (`/ia/kpis`). Integração real, sem mock — backend `sgsm-ia`
(8082), `ms-sboot-auth` (8081) e `sgsm` core (8080) precisam estar de pé; RAG depende de
Milvus (19530) e Ollama (11434).

Credenciais de teste atuais (fornecidas em 2026-08-21, usuário `MEDICO` ativo — `paulo souza`):
`paulo@gmail.com` / `qwertyui`.

> **Execução em 2026-08-20 — bloqueada.** Apenas `IA-01` pôde ser executado (reprovou — ver
> evidência). A partir daí a execução foi bloqueada: login com as credenciais antigas
> (`fabioeuro@gmail.com`) retornava `401 Credenciais inválidas.` no backend real
> (`ms-sboot-auth`), confirmado por 3 caminhos independentes. Evidência completa em
> `evidencias-2026-08-20.docx`.
>
> **Concluída em 2026-08-20/21.** Execução completa via Playwright MCP (subagente de QA)
> contra `http://localhost:3001` com backend real, credenciais `paulo@gmail.com`/`qwertyui`.
> Primeira rodada (2026-08-20): 26 aprovados, 2 reprovados (`IA-16`, `IA-19`), causa raiz
> identificada para ambos. `IA-01` foi reexecutado após a correção do proxy do Vite
> (`vite.config.ts`, restringindo `/ia/(chat|busca|paciente|kpis|etl)`).
>
> **Correção + reteste em 2026-08-21:** `IA-16` — refresh token rotacionado agora é persistido
> (`sgsm-front-medico` commit `317fc608`, já em `develop`). `IA-19` — `sgsm-ia` corrigido para
> responder `401` (não `403`) a token inválido/expirado/revogado, replicando o padrão já usado
> no `sgsm` core (`JwtAuthFilter.java` + `SecurityConfig.java`, testes unitários atualizados,
> 6/6 passando). Ambos reexecutados ao vivo e **APROVADOS**.
>
> **Resultado final: 28/28 aprovados, 0 reprovados.** Evidência bruta completa (35 screenshots
> + rede/console) consolidada em `evidencias-2026-08-20.docx`.

## Login e acesso à rota

- [x] `IA-01` Acessar `/ia` diretamente pela URL sem estar logado → redireciona para `/login` (PrivateRoute).
- [x] `IA-02` Fazer login com credenciais válidas e navegar até `/ia` pelo menu/sidebar → carrega a página com a aba **Chat** ativa por padrão, mensagem de boas-vindas do assistente já presente.
- [x] `IA-03` Estando logado, recarregar a página (F5) em `/ia` → continua autenticado (token persistido), página recarrega normalmente sem voltar para `/login`.

## Chat — fluxo principal

- [x] `IA-04` Digitar uma pergunta simples (ex.: "Quantos pacientes estão cadastrados?") e enviar com o botão de enviar → mensagem do usuário aparece à direita, estado de "Consultando..." com spinner aparece, e uma resposta real do assistente (`sgsm-ia`) aparece à esquerda.
- [x] `IA-05` Repetir o envio usando a tecla Enter (sem Shift) → mesmo comportamento do `IA-04`, mensagem enviada sem quebrar linha.
- [x] `IA-06` Usar Shift+Enter no campo de texto → insere quebra de linha no textarea, NÃO envia a mensagem.
- [x] `IA-07` Botão de enviar fica desabilitado quando o campo está vazio ou só com espaços.
- [x] `IA-08` Botão de enviar (e o campo, na prática) ficam bloqueados/desabilitados durante o carregamento de uma resposta (`loading`), evitando envio duplicado.
- [x] `IA-09` Após receber a resposta, a lista de mensagens rola automaticamente até o final (auto-scroll).
- [x] `IA-10` Enviar uma segunda pergunta após a primeira responder → histórico da conversa é mantido na tela (mensagens anteriores continuam visíveis).
- [x] `IA-11` Enviar uma pergunta relacionada a CRM/KPIs (ex.: "Como está o churn este mês?") → resposta do assistente é renderizada corretamente, inclusive se vier com múltiplas linhas (`whitespace-pre-wrap`).

## KPIs — fluxo principal

- [x] `IA-12` Clicar na aba **KPIs** → carrega automaticamente (spinner de loading) e exibe os indicadores retornados por `/ia/kpis` em cards.
- [x] `IA-13` Alternar de volta para a aba **Chat** e depois voltar para **KPIs** → NÃO recarrega os dados de novo automaticamente (já tem `kpis` em estado), cards continuam exibidos sem novo loading.
- [x] `IA-14` Clicar em "Atualizar" na aba KPIs → dispara novo carregamento (spinner no ícone), atualiza os cards com os dados mais recentes.
- [x] `IA-15` Conferir visualmente os valores exibidos nos cards — números simples aparecem formatados, valores que são objeto/array aparecem via `JSON.stringify` legível (não `[object Object]`).

## Não óbvio / estado / navegação

- [x] `IA-16` Recarregar a página (F5) no meio de uma conversa com várias mensagens trocadas → o histórico do chat é perdido (não há persistência) e a página volta ao estado inicial (mensagem de boas-vindas); confirmar que isso acontece sem erro/tela quebrada — é o comportamento esperado, não uma falha, mas precisa ser confirmado.
- [x] `IA-17` Navegar para outra página (ex. `/pacientes`) e voltar para `/ia` pelo menu → mesmo comportamento do `IA-16` (estado resetado), sem erro.
- [x] `IA-18` Clique duplo rápido no botão de enviar (ou pressionar Enter várias vezes rapidamente) com uma pergunta digitada → apenas uma requisição é disparada (bloqueio por `loading` funciona), sem mensagens duplicadas na tela.
- [x] `IA-19` Deixar a sessão expirar (ou forçar remoção do token via devtools) e tentar enviar uma pergunta → é redirecionado para `/login` (interceptor 401 do `api.ts`), sem tela travada ou erro não tratado no console.
- [x] `IA-20` Verificar se o `ChatbotWidget` global (o widget flutuante de atendimento a pacientes, presente em todas as páginas) aparece sobreposto/conflitando visualmente com a interface do Assistente IA em `/ia` — devem coexistir sem sobreposição que bloqueie os elementos principais da página.
- [x] `IA-21` Navegação por teclado: usar Tab a partir do topo da página → foco percorre em ordem lógica os controles (abas Chat/KPIs, campo de texto, botão enviar / botão atualizar conforme a aba), com indicador de foco visível em cada um.

## Edge cases

- [x] `IA-22` Enviar uma mensagem muito longa (várias linhas, centenas de caracteres) → interface não quebra, textarea expande até `maxHeight: 120px` e depois rola internamente, mensagem enviada e exibida corretamente na bolha.
- [x] `IA-23` Enviar texto com caracteres especiais / HTML-like (ex.: `<script>alert(1)</script>`, emojis, acentos) → conteúdo é exibido como texto puro na bolha (sem execução/quebra de layout), já que é renderizado como texto React.
- [x] `IA-24` Simular resposta de erro do backend `sgsm-ia` (parar o serviço na porta 8082 momentaneamente, ou usar DevTools para bloquear a requisição `/ia/chat`) e enviar uma pergunta → mensagem de erro amigável aparece na bolha do assistente ("Não consegui processar sua pergunta...") e toast de erro é exibido; interface não trava.
- [x] `IA-25` Rede lenta (throttling no DevTools) ao enviar uma pergunta → estado de loading/spinner permanece visível até a resposta (ou erro) chegar, sem duplicar requisição nem travar a UI.
- [x] `IA-26` Clicar na aba KPIs com o backend indisponível (mesmo cenário do `IA-24` aplicado a `/ia/kpis`) → estado de erro tratado com `toast.error('Erro ao carregar KPIs')`, sem cards quebrados nem loading infinito.
- [x] `IA-27` Verificar console do navegador durante todo o fluxo (login → chat com pergunta real → KPIs → erro simulado) → nenhum erro/warning inesperado (aceitável: mensagens de erro esperadas do próprio fluxo de teste, ex. request 5xx simulado no IA-24, não contam como falha de item).
- [x] `IA-28` Verificar aba de rede durante o fluxo — confirmar que `/ia/chat` e `/ia/kpis` são chamados com o header `Authorization: Bearer <token>` presente (via interceptor do `api.ts`).
