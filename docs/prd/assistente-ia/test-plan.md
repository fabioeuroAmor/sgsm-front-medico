# Test Plan — Página "Assistente IA" (`/ia`)

> Login: perfil MEDICO, `fabioeuro@gmail.com` / `famor966`. Front-end em `http://localhost:3001`.
> Página acessada pelo item "Assistente IA" do menu lateral (`/ia`) — **diferente** do widget de chat flutuante "Assistente SGSM" (esse é outro componente, já testado em `docs/prd/assistente-chatbot/`).

## Contexto de implementação

`IaPage.tsx` é uma página com duas abas: **Chat** (conversa livre com o assistente, via `POST /ia/chat` no `sgsm-ia`, que usa RAG + Milvus + LLM de verdade — diferente do chatbot widget, que é só uma máquina de estados) e **KPIs** (indicadores do CRM analítico, via `GET /ia/kpis`, consolidado de 7 métricas: resumo executivo, faturamento mensal, ocupação de agenda, pacientes de alto valor, risco de churn, funil por médico, cancelamentos). A rota `/ia` só exige autenticação genérica (`PrivateRoute`) — não há checagem de perfil no front, mesmo o link do menu lateral só aparecer para MEDICO/FUNCIONARIO/DESENVOLVEDOR.

## Dados reais disponíveis para o teste

- Perguntas que fazem sentido pro RAG responder com dado real: "Quantos pacientes ativos existem?", "Qual médico tem mais agendamentos?", "Quais serviços o Fabio Monteiro Amorim oferece?".
- Não fixar de antemão o texto exato da resposta do LLM — é não determinístico. Validar que a resposta é coerente/plausível, não um match literal.

---

## Abertura, estado inicial e navegação entre abas

- [x] **IA001** — Acessar `/ia` pelo menu lateral. Header mostra "Assistente IA" com subtítulo "Powered by RAG + Milvus", aba "Chat" ativa por padrão. *(Aprovado com achado crítico: elementos corretos no DOM, mas o título "Assistente IA" é invisível — texto branco sobre fundo branco. Ver qa-results.md.)*
- [x] **IA002** — Mensagem inicial do assistente já aparece ao carregar: "Olá! Sou o assistente inteligente do SGSM. Posso responder perguntas sobre pacientes, médicos, agendamentos, serviços e também sobre o CRM Analítico...".
- [x] **IA003** — Clicar na aba "KPIs". Dispara `GET /ia/kpis` automaticamente (só na primeira vez que a aba é aberta), mostra spinner de carregamento, depois os cards com os 7 indicadores.
- [x] **IA004** — Voltar pra aba "Chat" e clicar em "KPIs" de novo. **Não** deve disparar uma nova chamada de rede (o código só recarrega se `kpis` ainda for `null`) — confirmar via `browser_network_requests` que não houve uma segunda chamada a `/ia/kpis`.
- [x] **IA005** — Na aba KPIs, clicar em "Atualizar". Dispara uma nova chamada a `GET /ia/kpis`, mostra o ícone de refresh girando durante o carregamento.

## Fluxo completo — Chat (happy path)

- [x] **IA006** — Digitar uma pergunta real (ex. "Quantos pacientes ativos existem?") e pressionar Enter. A pergunta aparece como bolha do usuário (alinhada à direita), campo de texto limpa, indicador "Consultando..." com spinner aparece.
- [x] **IA007** — Resposta do assistente chega e aparece como bolha à esquerda, com timestamp. Confirmar via rede que foi `POST /ia/chat` com `{"pergunta": "..."}` e resposta 200 com `{"resposta": "..."}` real (não mock).
- [x] **IA008** — Testar o botão de enviar (ícone de seta) em vez de Enter, com outra pergunta — mesmo comportamento do IA006/IA007.
- [x] **IA009** — Shift+Enter no campo de texto cria uma nova linha em vez de enviar a mensagem.
- [x] **IA010** — Depois de uma resposta, o campo de texto permanece com foco (dá pra digitar a próxima pergunta sem clicar de novo no campo).
- [x] **IA011** — Fazer duas perguntas seguidas na mesma conversa — confirmar que o histórico completo (as duas perguntas e as duas respostas) permanece visível na tela, na ordem correta.

## Edge cases — Chat

- [x] **IA012** — Campo vazio: botão de enviar fica desabilitado (visualmente opaco). Pressionar Enter com o campo vazio não deve fazer nada (nem chamada de rede, nem bolha nova).
- [x] **IA013** — Campo só com espaços em branco (" "): mesmo comportamento do IA012 (o código faz `.trim()` antes de checar se está vazio).
- [x] **IA014** — Durante o carregamento de uma resposta (indicador "Consultando..." visível), pressionar Enter de novo ou clicar no botão de enviar. Não deve disparar uma segunda chamada de rede simultânea (o código verifica `loading` antes de enviar) — confirmar via `browser_network_requests` que só existe uma requisição em andamento.
- [x] **IA015** — Clique duplo rápido no botão de enviar (com pergunta já digitada). Resultado esperado: só uma bolha de pergunta nova e uma chamada de rede — não duas.
- [x] **IA016** — Pergunta bem longa (várias frases, 1-2 parágrafos). Confirmar que a bolha cresce e quebra linha corretamente, sem cortar texto nem estourar o layout.
- [x] **IA017** — Pergunta com caracteres especiais/HTML (ex. `<script>alert(1)</script>` ou `<b>teste</b>`). O texto deve aparecer literalmente na tela (como texto, não ser interpretado como HTML/executado) — confirmar que não há execução de script nem tag renderizada, e que não aparece nenhum erro no console.
- [x] **IA018** — Pergunta sem nenhuma relação com o sistema (ex. "qual a capital da França?"). Documentar a resposta do assistente — não é bug se ele recusar educadamente, mas registrar o comportamento observado.
- [x] **IA019** — **Backend de IA fora do ar**: com o `sgsm-ia` (porta 8082) desligado, enviar uma pergunta. Resultado esperado: aparece uma bolha de erro do assistente ("Não consegui processar sua pergunta. ...") e um toast de erro "Erro ao consultar o assistente" — sem travar a tela nem duplicar o indicador de carregamento. Religar o backend depois do teste.

## Fluxo — KPIs

- [x] **IA020** — Cada um dos 7 indicadores (`resumo`, `faturamentoMensal`, `ocupacaoAgenda`, `pacientesAltoValor`, `churnRisco`, `funilMedico`, `cancelamentos`) aparece como um card, com o rótulo formatado a partir do nome do campo (ex. `faturamentoMensal` → "faturamento Mensal").
- [x] **IA021** — Indicadores cujo valor é uma lista/objeto (a maioria) mostram o JSON formatado dentro do card — confirmar que não estoura o layout do card mesmo com JSON grande.
- [x] **IA022** — **Backend de IA fora do ar**: com o `sgsm-ia` desligado, clicar em "Atualizar" na aba KPIs. Resultado esperado: toast de erro "Erro ao carregar KPIs", sem travar a tela. Religar o backend depois do teste.

## Navegação, reload e estado

- [x] **IA023** — Com uma conversa em andamento na aba Chat, navegar para outra página pelo menu lateral (ex. Pacientes) e voltar pra "Assistente IA". Documentar se a conversa é preservada ou reiniciada (a página é desmontada ao navegar, dentro do `<Layout>`/`<Outlet>` — esperado tecnicamente é reiniciar, mas confirmar o comportamento real).
- [x] **IA024** — Recarregar a página (F5) no meio de uma conversa. Resultado esperado: conversa perdida, volta à saudação inicial (sem persistência em localStorage/sessionStorage) — confirmar via `browser_evaluate`. *(Reprovado originalmente: a página falhava com HTTP 403 ao invés de recarregar, causado pelo proxy do Vite interceptando o path bare `/ia`. **Corrigido e reconfirmado no reteste** — regra do proxy ajustada para `'/ia/'`; reload agora retorna 200 OK. Ver qa-results.md.)*
- [x] **IA025** — Clicar em "Voltar" do navegador depois de estar em `/ia`. Deve navegar pra página anterior normalmente, sem erro no console.

## Mobile e responsividade

- [x] **IA026** — Testar a página `/ia` em viewport mobile (390×844 — atenção ao `devicePixelRatio` do ambiente, confirmar `window.innerWidth` real via `browser_evaluate` antes de tirar prints). Header, abas Chat/KPIs e campo de texto devem ficar utilizáveis, sem cortar conteúdo nem sobrepor o cabeçalho mobile (`SGSM` + hambúrguer) que já foi corrigido nesta sessão.
- [x] **IA027** — No mobile, enviar uma mensagem e confirmar que o teclado virtual (ou o foco do campo) não quebra o layout — a área de mensagens deve rolar corretamente até a resposta mais recente.

## Acesso e permissão

- [x] **IA028** — Confirmar que o link "Assistente IA" no menu lateral só aparece para os perfis MEDICO/FUNCIONARIO/DESENVOLVEDOR (não deve aparecer pra PACIENTE) — checar a lista de `roles` já usada no `Sidebar.tsx`, sem precisar logar como paciente se não houver conta de teste disponível; documentar como verificado por código se não for possível testar ao vivo. *(Verificado por código, sem conta PACIENTE disponível.)*
- [x] **IA029** — Acessar a URL `/ia` diretamente (digitando no navegador) estando autenticado como MEDICO. Deve carregar normalmente (sem guard de perfil no front) — documentar esse comportamento (não é necessariamente bug, é uma observação de escopo, já que o back pode ou não restringir por perfil). *(Reprovado originalmente: a navegação de página inteira para `/ia` falhava com HTTP 403 pelo mesmo bug de proxy do IA024, então o comportamento nunca chegava a ser exercitado. **Corrigido e reconfirmado no reteste** — acesso direto por URL (nova aba) agora carrega a SPA normalmente, 200 OK, sem guard de perfil no front, como esperado. Ver qa-results.md.)*
