# Test Plan — Tela de Médicos (`/medicos`)

Ambiente: front-end em `http://localhost:3001`, backend real (`8080` API principal, `8081` auth, `8082` IA/CRM) já em execução. Sem mocks — todas as chamadas batem no backend real.

Login de teste: `eduardasilva@gmail.com` / `joaozinh7`.

Convenções: cada item tem checkbox + id curto (`Mxx`). Um item só é marcado quando o subagente de QA anexar **print da tela** + **saída crua de console/rede** comprovando o resultado. Item que o próprio implementador rodou não conta como aprovado.

## 0. Acesso

- [x] M01 — Login com `eduardasilva@gmail.com` / `joaozinh7` em `/login` redireciona para `/pacientes` autenticado.
- [x] M02 — Navegar para `/medicos` pelo menu lateral carrega a tela sem erro no console.
- [x] M03 — Acessar `/medicos` diretamente pela URL (sem estar logado, sessão limpa) redireciona para `/login` (rota privada).
- [x] M04 — Recarregar (F5) a tela `/medicos` já logado mantém a sessão e a lista recarrega do zero (loading state visível).

## 1. Listagem inicial

- [x] M05 — Ao entrar em `/medicos`, aparece spinner de carregamento e, em seguida, os cards de médicos vindos da API (checar payload da requisição `GET /v1/api/medicos` no network).
- [x] M06 — Se a lista vier vazia (filtrar por algo que não existe, ex.: especialidade sem cadastro), aparece o `EmptyState` ("Nenhum resultado encontrado") e não um erro.
- [x] M07 — Se a API retornar erro (ex.: derrubar sessão/token inválido durante a chamada), a mensagem de erro aparece visível na tela (banner vermelho), não só no console.
- [x] M08 — Cada card exibe nome, especialidade, CRM/UF, e-mail, telefone (quando houver) e badge de status Ativo/Inativo condizente com o dado retornado.

## 2. Busca e filtros

- [x] M09 — Digitar parte do nome de um médico existente no campo de busca filtra a lista corretamente (client-side, sem nova chamada à API).
- [x] M10 — Buscar por parte do CRM filtra corretamente.
- [x] M11 — Buscar por parte do e-mail filtra corretamente.
- [x] M12 — Busca com texto que não bate com nada exibe o `EmptyState`.
- [x] M13 — Busca é case-insensitive (ex.: buscar em maiúsculas um nome cadastrado em minúsculas).
- [x] M14 — Trocar o filtro de status para "Ativos" dispara nova chamada à API com `ativo=true` e a lista atualiza.
- [ ] M15 — Trocar o filtro de status para "Inativos" dispara nova chamada com `ativo=false` e mostra só inativos (se houver). ⛔ BLOQUEADO POR BACKEND — ver qa-results.md
- [ ] M16 — Selecionar uma especialidade no filtro dispara nova chamada com o parâmetro correto e filtra a lista. ⛔ BLOQUEADO POR BACKEND — ver qa-results.md
- [x] M17 — Voltar filtro de status/especialidade para "Todos"/"Todas" remove o parâmetro e recarrega a lista completa.
- [ ] M18 — Combinar busca por texto + filtro de especialidade + filtro de status ao mesmo tempo produz o resultado esperado (interseção). ⛔ BLOQUEADO POR BACKEND — ver qa-results.md

## 3. Cadastro de médico

- [x] M19 — Clicar em "Novo Médico" abre o modal vazio (campos em branco, UF padrão "SP").
- [x] M20 — Tentar salvar com todos os campos obrigatórios vazios: verificar o que a tela faz (mensagem de erro da API deve aparecer visível no modal, não travar silenciosamente).
- [x] M21 — Preencher nome, CRM, UF, especialidade e e-mail válidos e salvar: modal fecha, novo médico aparece no topo da lista, request `POST /v1/api/medicos` com payload correto visível no network.
- [x] M22 — Cadastrar com e-mail em formato inválido (ex.: `abc123`) — verificar validação do campo `type=email` do navegador e/ou erro retornado pela API.
- [x] M23 — Cadastrar com CRM duplicado de um médico já existente — a API deve recusar e a mensagem de erro deve aparecer no modal (não fechar silenciosamente).
- [x] M24 — Botão "Salvar" fica desabilitado/mostra "Salvando…" durante a requisição, evitando duplo clique disparar duas requisições (clicar duas vezes rápido e conferir no network que só uma chamada de cadastro foi feita, ou que a segunda foi bloqueada).
- [x] M25 — Clicar em "Cancelar" ou fechar o modal (X) sem salvar descarta os dados digitados; reabrir "Novo Médico" depois mostra o formulário limpo de novo.
- [x] M26 — Campo telefone é opcional: cadastrar sem preencher telefone funciona normalmente.
- [x] M27 — Testar campo nome só com espaços em branco — verificar comportamento (API deve rejeitar ou normalizar).

## 4. Edição de médico

- [x] M28 — Clicar em "Editar" em um card abre o modal preenchido com os dados atuais do médico.
- [x] M29 — Nos campos CRM e UF do CRM, os inputs aparecem desabilitados na edição (não editáveis).
- [x] M30 — Alterar nome e/ou especialidade e salvar atualiza o card na lista sem precisar recarregar a página, via `PUT /v1/api/medicos/{id}`.
- [x] M31 — Editar e depois cancelar não persiste a alteração (reabrir o card mostra os dados antigos).
- [x] M32 — Editar o e-mail para um formato inválido e salvar — erro visível, modal permanece aberto.

## 5. Inativação de médico

- [x] M33 — Clicar no botão de lixeira (inativar) abre modal de confirmação com o texto explicando que o médico será inativado.
- [x] M34 — Confirmar a inativação: card passa a exibir badge "Inativo", chamada `DELETE /v1/api/medicos/{id}` confirmada no network, e o botão de inativar do card fica desabilitado (já que `disabled={!m.ativo}`).
- [x] M35 — Cancelar no modal de confirmação não altera o status do médico.
- [x] M36 — Um médico já inativo não permite nova tentativa de inativação pelo card (botão desabilitado).

## 6. Agenda do médico

- [x] M37 — Clicar no ícone de calendário de um médico abre o modal de agenda com o nome do médico no título e spinner de carregamento inicial.
- [x] M38 — Se o médico não tiver horários cadastrados, aparece a mensagem "Nenhum horário cadastrado."
- [x] M39 — Se a chamada de listagem de agenda ou de estabelecimentos vinculados falhar, a mensagem de erro aparece visível no modal.
- [x] M40 — Clicar em "Adicionar Horário" exibe o formulário com estabelecimento (select), dia da semana, duração do slot, hora início/fim e vigência início preenchidos com valores padrão.
- [x] M41 — Cadastrar um horário vinculado a estabelecimento (não domiciliar): selecionar estabelecimento, dia, duração e horários válidos (hora fim > hora início) e salvar — novo horário aparece na lista, `POST /v1/agenda-medico` confirmado no network.
- [x] M42 — Tentar salvar sem selecionar estabelecimento (modo não-domiciliar): botão "Salvar Horário" deve ficar desabilitado.
- [x] M43 — Ativar o toggle "Atendimento domiciliar": campos de estabelecimento somem e aparecem cidade, UF, raio (km) e intervalo entre atendimentos.
- [x] M44 — Cadastrar horário domiciliar preenchendo cidade, UF, raio e intervalo — salva corretamente e a linha da lista mostra "Domiciliar · cidade/UF · raio X km".
- [x] M45 — Campo UF do atendimento domiciliar força maiúsculas e limita a 2 caracteres (digitar mais que 2 letras ou minúsculas).
- [x] M46 — Campo raio (km) e intervalo (min) são numéricos — digitar valor negativo e verificar o que acontece (o `min={0}` do input deve impedir ou a API deve rejeitar).
- [x] M47 — Cadastrar horário com hora fim menor ou igual à hora início — verificar se a API rejeita e o erro aparece visível.
- [x] M48 — Remover um horário existente (botão X) some da lista e `DELETE /v1/agenda-medico/{id}` confirmado no network.
- [x] M49 — Cancelar o formulário de novo horário (botão "Cancelar") volta para a lista sem criar nada e sem perder os horários já existentes.
- [x] M50 — Fechar o modal de agenda e reabrir em outro médico mostra os dados do médico correto (não os do anterior — checar que `agendas`/`estabsDoMedico` resetam).

## 7. Navegação, teclado e resiliência

- [x] M51 — Usar Tab para navegar pelos campos do formulário de cadastro/edição segue uma ordem lógica e visível (foco visível em cada campo).
- [x] M52 — Pressionar Esc com o modal de cadastro aberto — verificar se fecha ou não (documentar comportamento real).
- [x] M53 — Clicar fora do modal (no overlay) — verificar se fecha o modal.
- [ ] M54 — Com o modal de cadastro aberto e dados preenchidos, apertar F5 (recarregar): modal fecha, dados digitados são perdidos, lista de médicos recarrega do zero (comportamento esperado de SPA sem persistência local). 🟡 PARCIAL: front-end corrigido, bloqueado por backend — ver qa-results.md
- [ ] M55 — Após cadastrar um médico, usar o botão "Voltar" do navegador e depois "Avançar" — a tela não duplica cadastro nem quebra o estado da lista. ⛔ BLOQUEADO POR BACKEND — ver qa-results.md
- [x] M56 — Simular rede lenta (Playwright network throttling) ao carregar `/medicos` — o spinner de loading permanece visível até a resposta chegar, sem tela em branco ou erro falso.
- [x] M57 — Simular resposta de erro 500/erro genérico da API na listagem — mensagem de erro amigável aparece, sem stack trace cru exposto ao usuário.
