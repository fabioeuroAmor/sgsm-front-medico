# Test Plan — Filtros da tela de Médicos (/medicos)

Escopo: os dois comboboxes de filtro no topo da listagem de Médicos —
**Status** (`Todos os status` / `Ativos` / `Inativos`) e **Especialidade**
(`Todas as especialidades` + 10 opções) — isolados, combinados entre si, e
combinados com a busca por texto (nome/CRM/e-mail). Login: perfil MEDICO
(`fabioeuro@gmail.com` / `famor966`). Front-end em `http://localhost:3001`.

Contexto de implementação (para orientar os edge cases): Status e
Especialidade disparam uma nova consulta ao backend
(`GET /v1/api/medicos?ativo=&especialidade=`, com estado de `loading`); a
busca por texto é filtrada só no cliente, em cima do resultado já carregado.

## Fluxo principal

- [x] **MF001** — Acessar `/medicos` logado como MEDICO. Resultado esperado: grade carrega com "Todos os status" e "Todas as especialidades" selecionados por padrão, mostrando todos os médicos (ativos e inativos).
- [x] **MF002** — Selecionar "Ativos" no combobox de Status. Resultado esperado: grade recarrega (spinner breve) e mostra só médicos com badge "Ativo"; nenhum "Inativo" aparece.
- [x] **MF003** — Selecionar "Inativos" no combobox de Status. Resultado esperado: grade recarrega e mostra só médicos com badge "Inativo".
- [x] **MF004** — Voltar para "Todos os status". Resultado esperado: volta a mostrar ativos e inativos juntos.
- [x] **MF005** — Selecionar uma especialidade com resultado conhecido (ex.: "Cardiologia"). Resultado esperado: grade recarrega e mostra só médicos dessa especialidade (label exibido no card bate com a especialidade escolhida).
- [x] **MF006** — Selecionar outra especialidade (ex.: "Neurologia"). Resultado esperado: grade atualiza para a nova especialidade, sem misturar com a anterior.
- [x] **MF007** — Voltar para "Todas as especialidades". Resultado esperado: volta a mostrar todas.

## Combinação dos dois comboboxes

- [x] **MF008** — Status="Ativos" + Especialidade="Neurologia" (ou outra combinação com resultado esperado > 0). Resultado esperado: grade mostra só médicos ativos **e** dessa especialidade — nenhum inativo, nenhuma outra especialidade.
- [x] **MF009** — Status="Inativos" + Especialidade que só tenha médicos ativos cadastrados (ex.: "Cardiologia", se nenhum inativo for cardiologista). Resultado esperado: **EmptyState** ("Nenhum resultado encontrado" / texto padrão), sem erro no console, sem quebra de layout.
- [x] **MF010** — A partir do estado de MF009 (grade vazia), voltar Status para "Todos os status" mantendo a especialidade. Resultado esperado: grade volta a mostrar resultados (valida que o bug de "grid nunca mais pinta depois de um ciclo de loading" — corrigido no PR #27 — não regrediu).

## Combinação com busca por texto (client-side)

- [x] **MF011** — Com Status="Ativos", digitar no campo de busca um nome que exista entre os ativos. Resultado esperado: lista reduz em tempo real (sem novo loading do servidor) para só quem bate nome+filtro de status.
- [x] **MF012** — Digitar um CRM parcial de um médico visível. Resultado esperado: filtra corretamente por CRM (busca é case-insensitive e por substring).
- [x] **MF013** — Digitar um e-mail parcial de um médico visível. Resultado esperado: filtra corretamente por e-mail.
- [x] **MF014** — Digitar um termo de busca que não bate com nenhum médico do filtro atual (Status/Especialidade) mas bateria se o filtro fosse outro. Resultado esperado: EmptyState (interseção correta entre filtro de servidor e busca de cliente — não é "OU", é "E").
- [x] **MF015** — Limpar o campo de busca (apagar tudo). Resultado esperado: volta a mostrar todos os resultados do filtro de servidor atual, sem precisar recarregar.

## Edge cases e comportamento não óbvio

- [x] **MF016** — Trocar Status e Especialidade rapidamente, várias vezes seguidas (ex.: Ativos→Inativos→Ativos→Todos, Cardiologia→Neurologia→Todas), sem esperar cada requisição terminar. Resultado esperado: nenhuma condição de corrida visível — o estado final da tela reflete a ÚLTIMA combinação escolhida, sem grade "grudada" em resultado antigo nem card duplicado.
- [x] **MF017** — Com algum filtro aplicado (Status ou Especialidade ≠ padrão), recarregar a página (F5 / reload do navegador). Resultado esperado: os filtros voltam ao padrão ("Todos os status" / "Todas as especialidades") — comportamento esperado já que não há persistência de filtro na URL; documentar se for diferente do observado.
- [x] **MF018** — Com um filtro aplicado, clicar em outro item do menu lateral (ex. "Pacientes") e voltar para "Médicos" pelo menu. Resultado esperado: filtros resetam para o padrão ao remontar a página (mesmo raciocínio de MF017); grade renderiza normalmente (sem regressão do bug de opacidade do PR #27).
- [x] **MF019** — Abrir o combobox de Especialidade e navegar pelas opções só com teclado (Tab até focar, setas para cima/baixo, Enter para confirmar). Resultado esperado: filtro aplica corretamente sem precisar de mouse; foco visível no combobox.
- [x] **MF020** — Verificar o console do navegador e a aba de rede durante todas as trocas de filtro acima. Resultado esperado: nenhum erro no console; cada troca de Status/Especialidade dispara exatamente uma requisição `GET /v1/api/medicos` com os query params corretos (`ativo`, `especialidade`); busca por texto não dispara nenhuma requisição nova.
- [x] **MF021** — Simular rede lenta (Playwright: throttling ou delay) e trocar o filtro de Status. Resultado esperado: spinner de carregamento aparece durante o tempo de espera e desaparece corretamente quando os dados chegam; grade final renderiza visível (sem regressão do PR #27).
- [x] **MF022** — Selecionar um filtro de Especialidade que resulte em exatamente 1 médico. Resultado esperado: grade mostra 1 card, layout não quebra com um único item (grid de 1 coluna efetiva).
