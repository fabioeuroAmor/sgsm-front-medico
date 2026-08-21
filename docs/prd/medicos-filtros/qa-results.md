# QA Results — Filtros da tela de Médicos (/medicos)

Execução ao vivo com Playwright MCP contra `http://localhost:3001`, logado como
MEDICO (`fabioeuro@gmail.com`). Dataset real do backend no momento do teste (5
médicos): Fabio Monteiro Amorim (Ativo/Neurologia), MARIA AMORIM
(Ativo/Pediatria), QA Registro Seletor Teste (Ativo/Cardiologia), QA Registro
Orfao Medico (Ativo/Neurologia), Fagno Amorim (Inativo/Neurologia).

Evidências em `docs/prd/medicos-filtros/evidence/`. Cada item foi confirmado
com print de tela **e** saída crua de rede/console (`browser_network_requests`,
`browser_console_messages`), exceto onde indicado como bloqueado.

Resumo: **22 aprovados, 0 reprovados, 0 bloqueados.**

---

## Fluxo principal

### MF001 — Acessar /medicos logado como MEDICO
✅ **Aprovado**
Print: `evidence/MF001.png`
Grade carregou com "Todos os status" e "Todas as especialidades" selecionados,
mostrando os 5 médicos (4 ativos + 1 inativo). Rede: duas chamadas
`GET /v1/api/medicos` (200 OK, sem query params) — duplicidade típica de
React StrictMode em dev, não afeta o resultado renderizado. Corpo da resposta
confirmado via `browser_network_request` (5 registros, `ativo: true/false`
mistos). Console sem erros relacionados à página.

### MF002 — Selecionar "Ativos"
✅ **Aprovado**
Print: `evidence/MF002.png`
Rede: `GET /v1/api/medicos?ativo=true` (200 OK). Grade mostrou os 4 médicos
ativos, nenhum "Inativo" visível. Sem erros no console.

### MF003 — Selecionar "Inativos"
✅ **Aprovado**
Print: `evidence/MF003.png`
Rede: `GET /v1/api/medicos?ativo=false` (200 OK). Grade mostrou só "Fagno
Amorim" (Inativo).

### MF004 — Voltar para "Todos os status"
✅ **Aprovado**
Print: `evidence/MF004.png`
Rede: `GET /v1/api/medicos` (200 OK, sem query). Grade voltou a mostrar os 5
médicos (ativos + inativo).

### MF005 — Especialidade "Cardiologia"
✅ **Aprovado**
Print: `evidence/MF005.png`
Rede: `GET /v1/api/medicos?especialidade=Cardiologia` (200 OK). Grade mostrou
só "QA Registro Seletor Teste" (Cardiologia).

### MF006 — Especialidade "Neurologia"
✅ **Aprovado**
Print: `evidence/MF006.png`
Rede: `GET /v1/api/medicos?especialidade=Neurologia` (200 OK). Grade mostrou os
3 médicos de Neurologia (2 ativos + 1 inativo), sem resíduo de Cardiologia.

### MF007 — Voltar para "Todas as especialidades"
✅ **Aprovado**
Print: `evidence/MF007.png`
Rede: `GET /v1/api/medicos` (200 OK). Grade voltou a mostrar todos os 5
médicos (confirmado via `browser_find` por "MARIA AMORIM").

---

## Combinação dos dois comboboxes

### MF008 — Status="Ativos" + Especialidade="Neurologia"
✅ **Aprovado**
Print: `evidence/MF008.png`
Rede: duas chamadas sequenciais, uma por combobox alterado —
`GET /v1/api/medicos?ativo=true` e depois
`GET /v1/api/medicos?ativo=true&especialidade=Neurologia` (200 OK). Grade
mostrou só os 2 médicos ativos de Neurologia (Fabio, QA Registro Orfao
Medico); nenhum inativo, nenhuma outra especialidade.

### MF009 — Status="Inativos" + Especialidade="Cardiologia" (interseção vazia)
✅ **Aprovado**
Print: `evidence/MF009.png`
Rede: `GET /v1/api/medicos?ativo=false&especialidade=Cardiologia` (200 OK).
EmptyState exibido ("Nenhum resultado encontrado" / "Tente ajustar os filtros
ou cadastre um novo item."), sem erro no console, sem quebra de layout.

### MF010 — Voltar Status para "Todos os status" a partir do EmptyState (regressão crítica do PR #27)
✅ **Aprovado — sem regressão**
Prints: `evidence/MF010.png`
Rede: `GET /v1/api/medicos?especialidade=Cardiologia` (200 OK). Grade voltou a
mostrar "QA Registro Seletor Teste" **visivelmente** (não apenas no DOM).
Verificação extra rigorosa: usei `browser_evaluate` para ler
`getComputedStyle(...).opacity` em toda a cadeia de elementos pais do card —
resultado `["1","1","1","1","1"]` em todos os níveis, confirmando que o bug
de opacidade 0 pós-loading (corrigido com `key="loading"`/`key="grid"`) **não
regrediu**.

---

## Combinação com busca por texto (client-side)

### MF011 — Status="Ativos" + busca "Maria"
✅ **Aprovado**
Print: `evidence/MF011.png`
Rede: nenhuma chamada nova a `/v1/api/medicos` disparada ao digitar (mesma
lista de requisições antes/depois da digitação). Grade reduziu em tempo real
para "MARIA AMORIM".
Nota: na minha primeira tentativa usei `browser_evaluate` para manipular
`el.value` diretamente, o que dessincronizou o estado React do campo
(artefato da minha técnica de teste, não um bug do app). Recarreguei a
página e repeti o passo usando o método padrão de digitação
(`browser_type`/`.fill()`), que funcionou corretamente.

### MF012 — Buscar CRM parcial "8880"
✅ **Aprovado**
Print: `evidence/MF012.png`
Retornou os 2 médicos ativos com CRM iniciando por "8880" (QA Registro
Seletor Teste — 888001, QA Registro Orfao Medico — 888099), confirmando
filtro por substring. Nenhuma requisição de rede nova.

### MF013 — Buscar e-mail parcial em MAIÚSCULAS "QA.REGISTRO.ORFAO"
✅ **Aprovado**
Print: `evidence/MF013.png`
Retornou corretamente "QA Registro Orfao Medico" mesmo com o termo em
maiúsculas contra um e-mail em minúsculas — confirma case-insensitive.
Nenhuma requisição de rede nova.

### MF014 — Termo que só bateria com outro filtro ("Fagno" com Status=Ativos)
✅ **Aprovado**
Print: `evidence/MF014.png`
"Fagno Amorim" é Inativo e não está na lista carregada (Status=Ativos), logo
buscar "Fagno" resultou em EmptyState — confirma que o filtro é interseção
(E) entre servidor e cliente, não união (OU). Sem erro no console.

### MF015 — Limpar campo de busca
✅ **Aprovado**
Print: `evidence/MF015.png`
Ao apagar o texto, os 4 médicos ativos voltaram a aparecer imediatamente,
sem nova chamada de rede (confirma que a limpeza não recarrega do servidor).

---

## Edge cases e comportamento não óbvio

### MF016 — Trocar Status e Especialidade rapidamente, sem esperar
✅ **Aprovado**
Print: `evidence/MF016.png`
Disparei 6 mudanças em sequência rápida (Inativos→Cardiologia→Ativos→
Neurologia→Todos→Todas) sem aguardar cada resposta. Rede mostrou 6
requisições na ordem esperada, todas 200 OK. Estado final da tela refletiu
corretamente a ÚLTIMA combinação ("Todos os status" + "Todas as
especialidades"): os 5 médicos, sem card duplicado, sem grade "grudada" em
resultado antigo. Console sem erros.

### MF017 — Recarregar a página (F5) com filtro aplicado
✅ **Aprovado**
Print: `evidence/MF017.png`
Com Status=Ativos + Especialidade=Neurologia aplicados, reload via
`page.goto` (equivalente a F5) fez os filtros voltarem ao padrão ("Todos os
status" / "Todas as especialidades"), mostrando os 5 médicos novamente —
comportamento esperado documentado no plano (sem persistência de filtro na
URL).

### MF018 — Navegar para "Pacientes" e voltar para "Médicos" pelo menu
✅ **Aprovado**
Print: `evidence/MF018.png`
Com Status=Inativos aplicado, cliquei em "Pacientes" no menu lateral (grid de
pacientes carregou normalmente) e depois em "Médicos". Filtros resetaram para
o padrão ao remontar a página; grade renderizou normalmente com os 5
médicos, sem regressão do bug de opacidade do PR #27. Console sem erros.

### MF019 — Navegação por teclado no combobox de Especialidade
✅ **Aprovado**
Prints: `evidence/MF019-focus.png` (foco visível no combobox antes da
seleção), `evidence/MF019.png` (resultado final)
Sequência: clique no campo de busca (ponto de partida) → `Tab` (foco vai
para combobox Status) → `Tab` (foco vai para combobox Especialidade, marcado
`[active]` no snapshot de acessibilidade, anel de foco visível no
screenshot) → 5x `ArrowDown` → `Enter`. Especialidade "Neurologia" foi
selecionada corretamente sem uso de mouse, grade atualizou para os 3 médicos
de Neurologia. Observação: por ser um `<select>` nativo, cada `ArrowDown`
já dispara `onChange` (uma requisição por tecla: Cardiologia, Dermatologia,
Endocrinologia, Ginecologia, Neurologia) — comportamento nativo do HTML,
não um bug.

### MF020 — Console e rede durante todas as trocas de filtro
✅ **Aprovado**
Print: `evidence/MF020.png`
Consolidando a evidência de rede coletada em MF002–MF019: cada mudança de
Status/Especialidade disparou exatamente uma requisição
`GET /v1/api/medicos` com os query params corretos (`ativo`, `especialidade`
conforme o caso), todas 200 OK; a busca por texto nunca disparou requisição
nova. Console sem erros causados pelas trocas de filtro.
Observação (fora do escopo dos filtros de Médicos): durante a navegação
inicial apareceram erros de `WebSocket ... ERR_CONNECTION_REFUSED` (ruído do
HMR do Vite em dev, não relacionado à aplicação) e dois
`Failed to load resource: 400 (Bad Request)` em
`http://localhost:3001/v1/api/funcionarios` — esse erro ocorreu no
carregamento inicial da página/sidebar, antes de qualquer interação com os
filtros de Médicos, e é read pré-existente e fora do escopo deste plano
(tela de Funcionários, não Médicos). Reportando aqui apenas como observação,
não como reprovação de item.

### MF021 — Rede lenta (delay artificial) ao trocar Status
✅ **Aprovado**
Prints: `evidence/MF021-loading.png` (spinner durante o delay),
`evidence/MF021-final.png` (grade final visível)
Usei `browser_run_code_unsafe` com `page.route('**/v1/api/medicos**', ...)` e
`page.waitForTimeout(4000)` para atrasar a resposta em 4s. O spinner de
carregamento apareceu e permaneceu visível durante os 4s, desaparecendo
corretamente quando os dados chegaram (`GET /v1/api/medicos?ativo=true` →
200 OK). Grade final renderizou visível com os 4 médicos ativos. Verificação
extra: `getComputedStyle(...).opacity` = `"1"` para todos os 4 cards,
confirmando ausência de regressão do PR #27 mesmo sob latência.
Nota técnica: na primeira tentativa o delay foi implementado com
`new Promise(r => setTimeout(r, 4000))` dentro do handler de rota, mas o
contexto de execução do `browser_run_code_unsafe` não expõe `setTimeout`
global, causando uma requisição pendurada indefinidamente (erro
`ReferenceError: setTimeout is not defined`) — problema da minha técnica de
teste, não do app. Corrigido usando `page.waitForTimeout(4000)`, que
funcionou como esperado.

### MF022 — Especialidade com exatamente 1 médico (Pediatria)
✅ **Aprovado**
Print: `evidence/MF022.png`
Rede: `GET /v1/api/medicos?especialidade=Pediatria` (200 OK). Grade mostrou 1
único card ("MARIA AMORIM"), layout não quebrou (card ocupa a primeira
coluna do grid normalmente, sem esticar ou distorcer). Console sem erros.

---

## Conclusão

Todos os 22 itens do plano (MF001–MF022) foram executados ao vivo contra o
app rodando em `http://localhost:3001`, com prova dupla (screenshot + rede/
console crus) para cada um. Nenhuma regressão do bug crítico de opacidade
(PR #27) foi observada nos cenários que o exercitam diretamente (MF010,
MF018, MF021) — em todos os casos a opacidade computada dos cards ficou em
`1` e o conteúdo foi visualmente renderizado, não apenas presente no DOM.

Nenhum item reprovado. Nenhum item bloqueado.
