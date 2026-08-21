# QA Results — Assistente SGSM (widget flutuante `ChatbotWidget`)

Execução ao vivo via Playwright MCP contra o app real em `http://localhost:3001`, backend real
(portas 8080/8081/8082/8083), sem mocks. Login de teste: `eduardasilva@gmail.com` / `joaozinh7`
(perfil `MEDICO`). Pacientes de teste criados via o próprio widget durante a execução: "QA
Assistente Cadastro OK" (CPF 111.444.777-35, usado nos fluxos de agendamento), "QA Assistente
Cadastro Dup" (tentativa de duplicidade proposital), "QA Assistente SemSessao 2" (CPF
222.555.888-46, criado sem sessão), e um paciente com nome literal `' OR 1=1--` (teste de SQLi,
CPF 987.654.321-00). Serviço de teste criado via `/servicos`: "QA Assistente Domiciliar Teste"
(médico "eduarda silva", domiciliar, R$150 + R$20 de deslocamento), necessário porque o ambiente só
tinha originalmente 1 serviço ativo não domiciliar ("Consulta Cardiológica", Dr. Carlos Mendes).

Evidências em `docs/prd/assistente/evidence/<id>.png` (print) e `docs/prd/assistente/evidence/<id>.log`
(console/rede/análise), salvas por item. Vários itens compartilham evidência com o item vizinho
quando testados no mesmo estado da conversa (ex. `A15-A16`, `A20-A21`, `A31-A32`, `A36-A37`).

---

## Rodada 2 — reteste pós-correções de front-end

Após a rodada 1 (48 aprovados / 4 reprovados / 1 achado crítico de backend fora de escopo), quatro
correções de front-end foram aplicadas para os 4 itens reprovados. Cada um foi re-executado ao vivo
via Playwright MCP, com novas evidências (sufixo `-retest`):

- **A41, A42** (duplo Enter/duplo clique disparando requisições duplicadas em `AGE_CPF` e
  `CAD_CONFIRMAR`/`AGE_CONFIRMAR`) — confirmado corrigido: `src/components/ChatbotWidget.tsx` ganhou
  um guard síncrono `busyRef` (`useRef`), checado no início de `handleChoice` e `processInput` antes
  de qualquer `addUser`/`setState`, mesmo padrão já usado em Login/Médicos/CRM. Testado com 2 eventos
  Enter disparados no mesmo tick de JS em `AGE_CPF` (A41) e 2 cliques no mesmo tick em "Sim,
  confirmar" (A42): em ambos os casos apenas **1** requisição de rede é disparada (contra 2
  anteriormente), sem mensagens duplicadas. Esse mesmo guard elimina de raiz o efeito cascata de A42
  (a segunda invocação nunca chega a rodar, então não há mais uma resposta concorrente para
  dessincronizar `step`/`choices`). `evidence/A41-retest.log`, `evidence/A41-retest.png`,
  `evidence/A42-retest.log`.
- **A43** (`reset()` não cancelava promises em voo, causando mensagem "fantasma" após reiniciar) —
  confirmado corrigido: adicionado um contador `genRef` (`useRef<number>`) incrementado a cada
  `reset()`; cada operação assíncrona de `handleChoice`/`processInput` captura sua geração no início
  e descarta silenciosamente qualquer atualização de estado (`addBot`, `setStep`, `setLoading` etc.)
  se a geração mudou nesse meio tempo. Testado com uma requisição de `AGE_CPF` atrasada
  propositalmente em 2s via `page.route` (Playwright real), reset disparado com a requisição ainda
  em voo: a conversa permanece no menu reiniciado mesmo 2.5s depois, quando a requisição atrasada
  finalmente resolve — nenhuma mensagem fantasma. `evidence/A43-retest.log`,
  `evidence/A43-retest.png`.
- **A52** (header mobile do app esticava e cobria o painel do assistente) — confirmado corrigido em
  `src/components/layout/Layout.tsx` (linha 10): o container raiz passou de `className="flex
  min-h-screen ..."` para `className="flex flex-col lg:flex-row min-h-screen ..."`, empilhando o
  header mobile (`lg:hidden`, definido em `Sidebar.tsx`) ACIMA do conteúdo principal em telas
  pequenas em vez de ao lado dele como item de um flex row (que o esticava verticalmente via
  `align-items: stretch` padrão). Testado em viewport 375×667 na página `/pacientes` (conteúdo de
  3949px de altura, a mesma condição que expunha o bug): `<header>` agora mede 57px (altura natural),
  painel do assistente totalmente legível e utilizável logo abaixo. `evidence/A52-retest.log`,
  `evidence/A52-retest.png`.

**Todos os 4 itens reprovados na rodada 1 foram confirmados corrigidos nesta rodada** (100% de taxa
de correção para os itens no escopo deste repositório front-end). Nenhum bug de front-end resta em
aberto no widget Assistente SGSM. O achado crítico de A39 (agendamentos que somem de
`GET /v1/api/agendamentos`) permanece em aberto por ser um problema de **backend**, fora do escopo
de correção deste repositório.

Os detalhes de cada reteste estão na tabela abaixo, na linha do item correspondente (vereditos
atualizados para ✅, mantendo também os detalhes da rodada 1 para rastreabilidade).

---

## Achados críticos (resumo executivo)

Seis problemas confirmados merecem destaque antes da tabela item a item:

1. **Duplo clique / múltiplos submits sem nenhum guard síncrono (A41, A42) — mesma classe de bug já
   corrigida em Médicos (M24) e CRM (C26), mas presente aqui.** Tanto o submit de CPF em `AGE_CPF`
   quanto o botão "Sim, confirmar" em `CAD_CONFIRMAR`/`AGE_CONFIRMAR` disparam 2 requisições quando
   acionados 2x no mesmo tick (Enter duplo ou duplo clique), porque `setLoading(true)` só desabilita
   o input/botão DEPOIS que o React re-renderiza — não há guard `useRef` síncrono. No agendamento,
   isso quase criou um agendamento duplicado (só não duplicou porque o backend tem uma regra de
   unicidade de horário).
2. **Efeito cascata do #1: clicar "Cancelar" após o erro de duplo clique inicia um NOVO agendamento
   silenciosamente, sem nenhuma mensagem de cancelamento (A42).** Como a resposta do 1º clique
   (sucesso) já chama `goMenu()` (`step = 'MENU'`) antes da resposta do 2º clique (erro) chegar, e o
   `catch` do 2º clique só atualiza `choices` sem realinhar `step`, o app fica com `step === 'MENU'`
   mostrando os textos "Tentar novamente"/"Cancelar" de um erro que não corresponde mais ao step
   real. Clicar "Cancelar" nesse estado dessincronizado cai no ramo de `step === 'MENU'` com
   `choice.value !== 'CADASTRO'`, que silenciosamente dispara um NOVO fluxo de "Agendar uma
   consulta" em vez de mostrar "Agendamento cancelado.".
3. **`reset()` (botão "reiniciar") não cancela promises em voo — mensagens "fantasma" aparecem na
   conversa já reiniciada (A43).** Reiniciar a conversa enquanto uma requisição está pendente não
   impede essa requisição de, ao resolver, injetar uma mensagem e mudar os `choices` da conversa já
   reiniciada, sobrescrevendo o MENU esperado.
4. **Agendamentos criados pelo widget desaparecem de `GET /v1/api/agendamentos` — mesma classe de
   bug de persistência de backend já documentada no QA de Médicos (M55) (A39).** `POST
   /v1/api/agendamentos` retorna 201 com um payload coerente e completo, mas o registro nunca
   aparece na listagem, nem filtrando pelo médico exato, nem após reload completo da página. NÃO é
   bug de front-end — o widget faz a chamada certa e mostra a mensagem de sucesso correta.
5. **Bug de layout responsivo (fora de `ChatbotWidget.tsx`) cobre o painel do assistente em mobile
   (A52).** Em viewports abaixo do breakpoint `lg` (ex. 375px), o header mobile do app
   (`src/components/layout/Sidebar.tsx` linha 178, dentro do container `flex` sem `flex-col` de
   `src/components/layout/Layout.tsx` linha 10) estica para ~3700px de altura e cobre ilegivelmente
   a metade esquerda do painel do assistente. Root cause fora do escopo do widget, mas
   impede diretamente a usabilidade do item testado.
6. **Front-end não valida dígito verificador de CPF nem formato real de e-mail — mas o BACKEND
   valida (A12, A18, A23-checksum-reject).** Achado, não bug bloqueante: o front aceita qualquer
   sequência de 11 dígitos como CPF e qualquer string com "@" como e-mail, repassando ao backend, que
   rejeita com mensagens claras quando o CPF não tem checksum válido. Não chegou a ser observado
   nenhum caso de e-mail claramente inválido (ex. "a@") sendo rejeitado pelo backend nesta execução,
   pois o cadastro correspondente foi cancelado propositalmente antes do envio para isolar o teste
   de A18 — recomenda-se um reteste dedicado desse combo específico.

Achados adicionais (não bloqueantes): a mensagem "Erro ao buscar serviços. Tente novamente."
(A45) é a única resposta possível para "Agendar uma consulta" sem sessão — o menu não avisa essa
limitação antecipadamente; o efeito de auto-foco do input só dispara ao abrir/fechar o painel, não
ao avançar de passo com o painel já aberto (A46); o ramo de parsing de data por extenso em
`parseDate` é código morto, inalcançável pela UI real porque a máscara já destrói o texto antes
(A13); "Tentar novamente" após CPF duplicado apenas reenvia o mesmo payload fadado a falhar de novo,
sem permitir corrigir só o CPF (A25).

---

## Tabela de resultados

| ID | Veredito | Evidência (resumo) |
|----|----------|---------------------|
| A01 | PASS | Botão "Assistente virtual" presente em `/login` (sem sessão) e `/pacientes` (autenticado), mesmo estado/layout. `evidence/A01.log`, `A01-login.png`, `A01-pacientes.png`. |
| A02 | PASS | Painel abre com mensagem inicial + 2 opções de menu. `evidence/A02.log`, `A02.png`. |
| A03 | PASS | Painel fecha ao clicar novamente. `evidence/A03.log`, `A03.png`. |
| A04 | PASS | 0 erros/warnings de console em 3 pontos de verificação. `evidence/A04.log`. |
| A05 | PASS | Estado sobrevive à navegação SPA (client-side) entre páginas. `evidence/A05.log`, `A05-before-nav.png`, `A05-after-nav.png`. |
| A06 | PASS | Estado sobrevive a fechar/navegar/reabrir o painel. `evidence/A06.log`, `A06.png`. |
| A07 | PASS (esperado) | F5 (reload completo) reseta o estado ao menu inicial. `evidence/A07.log`, `A07.png`. |
| A08 | PASS | "Cadastrar-me" pergunta o nome. `evidence/A08.log`, `A08.png`. |
| A09 | PASS | Nome vazio pede novamente, sem chamada de rede. `evidence/A09.log`, `A09.png`. |
| A10 | PASS | Nome válido avança para CPF; máscara `000.000.000-00` funciona (ignora letras). `evidence/A10.log`, `A10.png`. |
| A11 | PASS | CPF incompleto rejeitado, sem avançar. `evidence/A11.log`, `A11.png`. |
| A12 | PASS/documentado | CPF de 11 dígitos sem checksum válido é aceito pelo FRONT (avança); o BACKEND rejeita depois (ver A23-checksum-reject). `evidence/A12.log`, `A12.png`. |
| A13 | PASS/documentado (achado) | Paste de data por extenso vira lixo ("10/20/00") pela máscara antes do `parseDate` rodar — ramo por extenso é código morto na UI real. `evidence/A13.log`, `A13.png`. |
| A14 | PASS | Data incompleta/inválida rejeitada. `evidence/A14.log`, `A14.png`. |
| A15 | PASS/documentado | Data calendarialmente inválida (31/02/2020) é aceita pelo front (só valida formato). `evidence/A15-A16.log`, `A15-A16.png`. |
| A16 | PASS | Data válida avança para e-mail. Mesma evidência de A15. |
| A17 | PASS | E-mail sem "@" rejeitado. `evidence/A17.log`, `A17.png`. |
| A18 | PASS/documentado (achado) | "a@" passa na validação simplista `includes('@')` e avança. `evidence/A18.log`, `A18.png`. |
| A19 | PASS | E-mail válido avança para telefone; máscara de telefone funciona. `evidence/A19.log`, `A19.png`. |
| A20 | PASS | Telefone vazio pulado corretamente (Enter). `evidence/A20-A21.log`, `A20-A21.png`. |
| A21 | PASS | Tela de confirmação mostra dados corretos, sem linha de Telefone quando pulado. Mesma evidência de A20. |
| A22 | PASS | "Não, cancelar" cancela sem POST. `evidence/A22.log`, `A22.png`. |
| A23 | PASS | Cadastro com CPF fictício válido (checksum correto) -> 201 Created. `evidence/A23.log`, `A23.png` (+ `A23-checksum-reject.log` para o achado de validação de backend). |
| A24 | PASS | CPF duplicado rejeitado com mensagem clara, dados preservados. `evidence/A24.log`, `A24.png`. |
| A25 | PASS/documentado | "Tentar novamente" reenvia o mesmo payload (mesmo CPF), sem permitir corrigir só o campo. `evidence/A25.log`, `A25.png`. |
| A26 | PASS | "Agendar uma consulta" busca serviços e pergunta CPF. `evidence/A26.log`, `A26.png`. |
| A27 | PASS | CPF incompleto rejeitado, sem chamada de rede. `evidence/A27.log`, `A27.png`. |
| A28 | PASS | CPF não cadastrado -> "Paciente não encontrado", volta ao menu. `evidence/A28.log`, `A28.png`. |
| A29 | PASS | CPF existente -> saudação + lista de serviços. `evidence/A29.log`, `A29.png`. |
| A30 | PASS | Serviço domiciliar (criado para o teste) pula estabelecimento, mensagem específica exibida. `evidence/A30.log`, `A30.png`. |
| A31 | PASS/parcial | Estabelecimentos buscados e listados; cenário "sem estabelecimentos" não reproduzível no ambiente (só 1 disponível). `evidence/A31-A32.log`, `A31-A32.png`. |
| A32 | PASS | Escolher estabelecimento avança para data. Mesma evidência de A31, + `A32.png`. |
| A33 | PASS | Data inválida rejeitada no agendamento. `evidence/A33.log`, `A33.png`. |
| A34 | PASS | Data sem horários avisa e permite nova tentativa, sem voltar ao menu. `evidence/A34.log`, `A34.png`. |
| A35 | PASS | Data com horários lista slots corretamente formatados. `evidence/A35.log`, `A35.png`. |
| A36 | PASS | Observação vazia pulada corretamente. `evidence/A36-A37.log`, `A36-A37.png`. |
| A37 | PASS | Confirmação do agendamento mostra todos os dados corretos. Mesma evidência de A36. |
| A38 | PASS | Cancelar agendamento funciona sem POST. `evidence/A38.log`, `A38.png`. |
| A39 | PASS (widget) / ACHADO CRÍTICO (backend) | `POST` -> 201, mensagem de sucesso correta, MAS o registro nunca aparece em `GET /v1/api/agendamentos` (nem filtrado pelo médico exato, nem após reload). `evidence/A39.log`, `A39.png`, `A39-agendamento-sumiu.png`. |
| A40 | PASS | Erro 500 real (via `page.route`) tratado com mensagem clara e retry/cancelar. `evidence/A40.log`, `A40.png`. |
| A41 | ✅ **Aprovado (rodada 2)** | Rodada 1: `evidence/A41.png` (reprovado, 2 requisições). Rodada 2: guard `busyRef` bloqueia o 2º Enter — apenas 1 `GET /pacientes`. `evidence/A41-retest.log`, `A41-retest.png`. |
| A42 | ✅ **Aprovado (rodada 2)** | Rodada 1: `evidence/A42.png` (reprovado, 2 requisições + cascata). Rodada 2: mesmo guard `busyRef` bloqueia o 2º clique — apenas 1 `POST /agendamentos`, sem cascata. `evidence/A42-retest.log`. |
| A43 | ✅ **Aprovado (rodada 2)** | Rodada 1: `evidence/A43-ghost-message.png` (reprovado, mensagem fantasma). Rodada 2: contador `genRef` descarta atualização de geração antiga — menu reiniciado permanece intacto. `evidence/A43-retest.log`, `A43-retest.png`. |
| A44 | PASS | Cadastro público funciona sem sessão (401 nunca ocorre; endpoint é público). `evidence/A44.log`, `A44.png`. |
| A45 | PASS/achado | `GET /servicos-medicos` sem sessão retorna 403 (não 401) — interceptor 401 nunca aciona; erro tratado corretamente, mas "Agendar" é inacessível para anônimo real. `evidence/A45.log`, `A45.png`. |
| A46 | PASS/documentado | Auto-foco só funciona ao abrir/fechar painel, não ao avançar de step com painel já aberto. `evidence/A46.log`, `A46-reopen-focus.png`, `A46-no-autofocus.png`. |
| A47 | PASS | Tab/Enter/Space funcionam em todas as escolhas. `evidence/A47.log`, `A47-tab-focus.png`. |
| A48 | PASS | Fluxo 100% via teclado funciona. `evidence/A48.log`, `A48.png`. |
| A49 | PASS | `<script>` escapado como texto, sem execução. `evidence/A49.log`, `A49.png`. |
| A50 | PASS | Observação de 324 caracteres aceita, sem quebrar layout. `evidence/A50.log`, `A50.png`. |
| A51 | PASS | Payload SQLi tratado como texto comum, sem erro de banco exposto. `evidence/A51.log`, `A51.png`. |
| A52 | ✅ **Aprovado (rodada 2)** | Rodada 1: `evidence/A52-bug-confirmed.png` (reprovado, header esticado cobrindo o painel). Rodada 2: `Layout.tsx` ganhou `flex-col lg:flex-row` — header mede 57px, painel totalmente legível. `evidence/A52-retest.log`, `A52-retest.png`. |
| A53 | PASS (desktop) | Modal "Novo Paciente" e painel do assistente coexistem sem conflito de z-index; ambos usáveis simultaneamente. `evidence/A53.log`, `A53.png`, `A53-both-usable.png`. |

---

## Notas metodológicas

- Dados de teste usados: pacientes com prefixo/sufixo "QA Assistente..." e CPFs fictícios gerados
  com dígito verificador matematicamente válido quando necessário para testar o caminho de sucesso
  (ex. 111.444.777-35), e propositalmente inválidos quando o teste exigia (ex. 222.333.444-55 para
  o achado de A23-checksum-reject). Nenhum dado pré-existente antes do início do QA foi editado ou
  apagado.
- Serviço médico de teste "QA Assistente Domiciliar Teste" foi criado via `/servicos` (não editando
  código) especificamente porque o ambiente originalmente só tinha 1 serviço ativo, não domiciliar —
  necessário para testar A30 de forma real, sem mock.
- Cliques via Playwright nativo (`browser_click`) sofreram o mesmo timeout de "elemento estável" já
  relatado em QAs anteriores deste projeto (o próprio botão flutuante do assistente foi citado como
  fonte de instabilidade em outras telas); a maior parte das interações foi feita via
  `browser_run_code_unsafe` com `page.evaluate`/`dispatchEvent`/`.click()` direto no DOM, sem alterar
  o comportamento testado. Toda suspeita de bug de clique falho foi reconfirmada com uma segunda
  tentativa antes de ser registrada como achado real — nenhuma ocorreu neste QA (todos os "clique
  falho" observados eram, na real, o app respondendo corretamente a um clique que HAVIA funcionado).
- Simulação de rede lenta/erro (A40, e os testes de corrida A41/A42/A43) feita exclusivamente via
  `page.route`/`route.fulfill`/`route.continue` (Playwright real), nunca por mock de dados da
  aplicação em JS solto. Delays implementados com `page.waitForTimeout()` dentro do handler de rota,
  já que `setTimeout` global não está disponível no sandbox de `browser_run_code_unsafe` deste
  ambiente (mesmo achado de ambiente relatado no QA de CRM).
- Simulação de "paste" (A13) feita via `ClipboardEvent` + setter nativo de `value` + evento `input`
  real no DOM, já que permissão de clipboard do SO (`browserContext.grantPermissions`) não funciona
  neste ambiente.
- Para os testes de duplo clique/duplo Enter (A41, A42), foi necessário disparar os dois eventos no
  MESMO tick de JavaScript via `dispatchEvent` dentro de um único `page.evaluate` — chamadas
  sequenciais de `browser_click`/`page.keyboard.press()` com `await` entre elas (mesmo sem delay
  explícito) permitem que o React processe um ciclo completo de render entre os dois eventos,
  mascarando a condição de corrida.
- `page.screenshot({ path: ... })` funcionou tanto para o diretório de trabalho quanto,
  posteriormente, movido via `Bash`/`mv` para `docs/prd/assistente/evidence/` sem problema de
  travamento neste ambiente (diferente do relatado em QAs anteriores para escrita direta em
  subdiretórios de `docs/`).

---

## Resumo final — Rodada 1 (antes das correções)

- **Total de itens:** 53 (A01–A53)
- **PASS:** 48 — A01–A40 (exceto os 3 abaixo), A44–A51, A53
- **FAIL (bugs de front-end confirmados):** 4 — A41, A42, A43, A52
- **Achados críticos de BACKEND (fora do escopo deste repositório front-end):** A39 (agendamentos
  recém-criados não aparecem em `GET /v1/api/agendamentos` — mesma classe de bug já documentada em
  Médicos M55)
- **Não testáveis:** 0 (A30 e A31 exigiram criação de dado de teste adicional para serem
  reproduzidos ao vivo, mas foram totalmente testados; nenhum item ficou sem evidência real)

**Bloqueadores identificados antes de considerar o widget pronto para produção:**
1. **A41/A42 — ausência de guard síncrono contra duplo clique/duplo Enter** em `AGE_CPF` (busca de
   paciente) e em `CAD_CONFIRMAR`/`AGE_CONFIRMAR` (confirmar cadastro/agendamento). Recomendação:
   replicar o padrão já usado em Médicos (M24) e CRM (C26) — guard via `useRef` que bloqueia
   sincronamente a segunda chamada antes mesmo do primeiro re-render do React.
2. **A42 (efeito cascata) — o `catch` de `AGE_CONFIRMAR`/`CAD_CONFIRMAR` não realinha `step` ao
   estado de erro**, deixando `choices` de erro associadas a um `step` que já foi alterado por uma
   resposta concorrente mais rápida. Recomendação: usar um identificador de "última operação" (ex.
   `useRef` com um id incrementado a cada chamada) para descartar respostas obsoletas, e/ou definir
   um `step` específico de erro em vez de reaproveitar o `step` de confirmação.
3. **A43 — `reset()` não cancela promises em voo.** Recomendação: `AbortController` por requisição,
   ou um `useRef` de "geração da conversa" incrementado a cada `reset()`, verificado antes de aplicar
   qualquer resultado assíncrono à conversa.
4. **A52 — bug de layout responsivo em `src/components/layout/Layout.tsx` (linha 10) e
   `src/components/layout/Sidebar.tsx` (linha 178)**, fora de `ChatbotWidget.tsx`, mas que impede a
   usabilidade do widget em mobile. Recomendação: o container `<div className="flex min-h-screen ...">`
   de `Layout.tsx` precisa de `flex-col lg:flex-row` (ou equivalente) para que o `<header>` mobile
   fique empilhado ACIMA do conteúdo principal em vez de ao lado dele, eliminando o esticamento de
   altura.

Nenhum bug de **backend** bloqueante foi encontrado além do achado crítico A39 (já fora do escopo de
correção deste repositório front-end).

## Resumo final — Rodada 2 (após correções de front-end)

- **Total de itens:** 53 (A01–A53)
- **PASS:** 52 — todos os itens exceto A39 (achado crítico de backend, não é reprovação de
  front-end; o widget faz a chamada certa e mostra a mensagem de sucesso correta)
- **FAIL:** 0 (todos os 4 reprovados da rodada 1 foram corrigidos e reconfirmados)
- **Achados críticos de BACKEND (fora do escopo deste repositório front-end, inalterado):** A39

Das 4 reprovações originais (A41, A42, A43, A52), **todas as 4 foram corrigidas no front-end e
reconfirmadas ao vivo** — 100% de taxa de correção para os itens no escopo deste repositório.
Nenhuma reprovação de front-end resta em aberto no widget Assistente SGSM.

**Bloqueadores da rodada 1, agora eliminados:**
1. ~~A41/A42 — ausência de guard síncrono contra duplo clique/duplo Enter.~~ Corrigido com um guard
   síncrono `busyRef` (`useRef`) em `src/components/ChatbotWidget.tsx`, checado no início de
   `handleChoice`/`processInput`, mesmo padrão já usado em Médicos e CRM. Confirmado nos retestes de
   A41 e A42.
2. ~~A42 (efeito cascata).~~ Eliminado pelo mesmo guard `busyRef` — a segunda invocação concorrente
   nunca chega a rodar, então não há mais resposta obsoleta para dessincronizar `step`/`choices`.
3. ~~A43 — `reset()` não cancelava promises em voo.~~ Corrigido com um contador `genRef` (`useRef`)
   incrementado em `reset()`; operações assíncronas descartam silenciosamente qualquer atualização
   de estado se a geração mudou. Confirmado no reteste de A43 com requisição atrasada de propósito.
4. ~~A52 — bug de layout responsivo em `Layout.tsx`.~~ Corrigido adicionando `flex-col lg:flex-row`
   ao container raiz, empilhando o header mobile acima do conteúdo em vez de ao lado. Confirmado no
   reteste de A52 em viewport 375×667.

**Achado crítico de backend, ainda em aberto (não corrigível neste repositório):**
- A39 — agendamentos criados via `POST /v1/api/agendamentos` (retorna 201 com payload correto) nunca
  aparecem em `GET /v1/api/agendamentos`, mesma classe de problema já documentada no QA de Médicos
  (`docs/prd/medicos/qa-results.md`, achado crítico #1).

**Achado crítico de backend (não corrigível neste repositório):**
- A39 — agendamentos criados via `POST /v1/api/agendamentos` (retorna 201 com payload correto) nunca
  aparecem em `GET /v1/api/agendamentos`, mesmo filtrando pelo médico exato dono do registro e mesmo
  após reload completo da página. Mesma classe de problema já documentada no QA de Médicos
  (`docs/prd/medicos/qa-results.md`, achado crítico #1, para `/v1/api/medicos`).

**Achados de produto/UX documentados, não bloqueantes:**
- A12/A18 — front não valida checksum de CPF nem formato real de e-mail (backend cobre parte disso).
- A13 — ramo de parsing de data por extenso em `parseDate` é código morto (inalcançável pela UI real).
- A25 — "Tentar novamente" após erro de validação (CPF duplicado) não permite corrigir só o campo problemático.
- A45 — "Agendar uma consulta" é, na prática, inacessível para visitante anônimo (backend exige auth), sem aviso prévio no menu.
- A46 — auto-foco só dispara ao abrir/fechar o painel, não ao avançar de step com o painel já aberto.
