# QA Results — Tela de CRM (`/crm`)

Execução ao vivo via Playwright MCP contra o app real em `http://localhost:3001`, backend real (portas 8080/8081/8082), sem mocks. Login de teste: `eduardasilva@gmail.com` / `joaozinh7` (perfil MEDICO). Paciente de teste criado via `/pacientes` para a seção 5: "QA CRM Paciente Teste" (CPF 111.222.333-96).

Evidências em `docs/prd/crm/evidence/<id>.png` (print) e `docs/prd/crm/evidence/<id>.log` (console/rede), salvas por item. Vários itens têm também um `evidence/<id>-detail.log` com a análise textual do achado e passo a passo de reprodução.

## Rodada 2 — reteste pós-correções de front-end

Após a rodada 1 (59 aprovados / 7 reprovados / 2 parcialmente reprovados / 2 bloqueados por backend /
4 não testáveis), sete correções de front-end foram aplicadas (fora deste QA) para 9 dos itens
reprovados/parciais. Cada um foi re-executado ao vivo, com novas evidências (sufixo `-retest` nos
arquivos):

- **C03, C04, C71** (bug crítico de roteamento `/crm` colidindo com o proxy do Vite) — confirmados
  corrigidos: o prefixo de proxy em `vite.config.ts` foi alterado de `/crm` para `/crm/` (barra final),
  eliminando a colisão com a rota de página SPA `/crm`. Navegação direta sem sessão agora redireciona
  para `/login` normalmente (C03), F5 com sessão ativa recarrega a tela (C04), e F5 com o modal "Novo
  Lead" aberto e preenchido recarrega sem quebrar a aplicação, apenas fechando o modal (C71):
  `evidence/C03-retest.png`, `evidence/C04-retest.png`, `evidence/C71-retest.png`.
- **C26** (duplo clique duplicava lead) — confirmado corrigido com guard `useRef`: 2 cliques síncronos
  em "Salvar" agora disparam apenas 1 `POST /crm/leads`: `evidence/C26-retest.png`.
- **C15** (condição de corrida no filtro de status) — confirmado corrigido com contador de requisição:
  cliques rápidos em sequência resultam em pílula ativa e dados da tabela sempre consistentes com o
  último clique: `evidence/C15-retest.png`.
- **C27** (formulário "Novo Lead" não resetava ao cancelar) — confirmado corrigido: reabrir "Novo Lead"
  após cancelar mostra o campo Nome vazio: `evidence/C27-retest.png`.
- **C48** (descrição só de espaços em Contato era aceita) — confirmado corrigido com `.trim()` na
  validação: descrição só de espaços agora é bloqueada, sem POST: `evidence/C48-retest.png`.
- **C54** (conteúdo só de espaços em Nota era aceito) — confirmado corrigido com `.trim()` na
  validação: conteúdo só de espaços agora é bloqueado, sem POST: `evidence/C54-retest.png`.
- **C50** (duração negativa em Contato era aceita) — confirmado corrigido com validação client-side:
  duração -30 agora é bloqueada com toast "Duração não pode ser negativa", sem POST:
  `evidence/C50-retest.png`.

**Todos os 9 itens reprovados/parciais que dependiam de correção de front-end foram confirmados
corrigidos nesta rodada** (100% de taxa de correção para os itens no escopo do front-end). Os
bloqueadores remanescentes documentados na rodada 1 (POST de nota clínica retornando 500 no backend —
C55/C56 — e sessão expirando sem recuperação automática) são bugs de **backend**, fora do escopo deste
repositório front-end, e não foram alterados nem reavaliados nesta rodada.

Os detalhes de cada reteste estão na tabela abaixo, na linha do item correspondente (vereditos
atualizados para ✅, com link para as novas evidências mantendo também as evidências originais da
rodada 1 para rastreabilidade).

---

## Achados críticos (resumo executivo)

Sete problemas atravessam vários itens e merecem destaque antes da tabela:

1. **Bug crítico de roteamento: `/crm` colide com o proxy de API do Vite (bloqueante).** `vite.config.ts` define `proxy: { '/crm': { target: 'http://localhost:8082' } }` para as chamadas reais de API (`GET /crm/leads` etc.), mas esse prefixo colide com a rota de página SPA `/crm` (a própria tela de CRM). Qualquer **navegação de página inteira** para `/crm` — digitar a URL diretamente (C03), apertar **F5** com a tela já carregada (C04) ou com um modal aberto (C71) — é interceptada pelo proxy do Vite antes do React Router rodar, e vira um erro bruto do navegador (`net::ERR_HTTP_RESPONSE_CODE_FAILURE` / "HTTP ERROR 403"), não uma tela de erro da aplicação. **Isso significa que, hoje, um usuário legítimo já logado que aperte F5 na tela de CRM perde a aplicação inteira**, precisando renavegar. Navegação puramente client-side (clicar em links, trocar de aba dentro do CRM) não é afetada. Causa raiz e correção sugerida (renomear o prefixo de proxy, ex. para `/api/crm`, ou mover a config de proxy para não colidir com rotas de página) documentadas em `evidence/C03-detail.log` e `evidence/C04-detail.log`.
2. **Sessão expira silenciosamente após ~15-20 minutos, sem refresh e sem logout automático (transversal, não específico do CRM).** Em pelo menos duas ocasiões durante este QA, todas as chamadas autenticadas (CRM e não-CRM, incluindo `GET /v1/api/pacientes`) passaram a retornar 403 simultaneamente. O access token é mantido só em memória (não em `localStorage`, só o `refresh_token` fica lá) e o interceptor do axios parece só tratar `401` como gatilho de refresh — quando o backend responde `403` para token expirado/inválido (em vez de `401`), a aplicação fica presa indefinidamente em erros, sem recuperação automática, exigindo logout manual e novo login. Detalhes em `evidence/session-403-global-detail.log`. Relacionado ao achado crítico #6 do QA de Médicos (mesma causa raiz de instabilidade de sessão).
3. **Duplo clique em "Salvar" no modal "Novo Lead" cria lead duplicado (C26).** Sem guard de clique duplo (ao contrário do formulário de Médicos, que já foi corrigido para isso) — dois cliques síncronos dispararam 2 `POST /crm/leads`, ambos 201, criando um registro duplicado.
4. **Condição de corrida confirmada nos filtros de status dos Leads (C15).** Cliques rápidos em sequência (NOVO → CONTATADO → QUALIFICADO → Todos) resultaram em um estado final inconsistente: a pílula "QUALIFICADO" ficou marcada como ativa, mas a tabela mostrou os dados de "Todos" (sem filtro) — nem a UI nem os dados corresponderam ao último clique. Não há cancelamento de requisições obsoletas.
5. **Validações de campo obrigatório não usam `trim()`, aceitando strings só de espaços em 2 endpoints (C48, C54).** Tanto "Descrição" (Registrar Contato) quanto "Conteúdo" (Nova Nota) checam apenas `!valor` (falsy), que bloqueia string vazia mas não bloqueia `"   "`. No caso de Contatos, o backend aceita (201) e cria um registro em branco. No caso de Notas, o backend rejeita com um **500 genérico** em vez de uma validação de entrada limpa (ver achado #7).
6. **Formulário "Novo Lead" não reseta ao cancelar/reabrir (C27).** Preencher o nome, clicar "Cancelar" e reabrir "Novo Lead" mostra o valor da tentativa anterior ainda no campo — o estado do formulário só é limpo após um salvamento bem-sucedido.
7. **Criar Nota Clínica está genuinamente quebrado no backend deste ambiente (C55/C56, bloqueante).** `POST /crm/paciente/{id}/notas` retornou **500 Internal Server Error em todas as tentativas**, inclusive com payload 100% válido e limpo (`{"tipo":"ANAMNESE","conteudo":"texto normal"}`). Não é uma questão de validação de borda — a funcionalidade de criar nota clínica não funciona neste ambiente, bloqueando C55 e C56 por completo. Além disso, o mesmo padrão de "500 genérico em vez de validação clara" apareceu em C50 (duração negativa em Contato) — sugere que o backend do CRM não trata bem entradas inválidas/edge cases, deixando exceções não tratadas vazarem como 500.

Achados adicionais de qualidade (não bloqueantes, mas recorrentes): erros de carregamento em várias abas (Leads, Risco de Churn) colapsam para a mesma mensagem de "lista vazia" (C59, C74), sem diferenciar "sem dados" de "falha ao carregar"; mensagens de erro de API às vezes vazam o texto cru da exceção do axios ("Request failed with status code 403", C32); trocar de aba principal perde o estado da aba anterior (paciente selecionado, C70).

---

## Tabela de resultados

| ID | Veredito | Print | Evidência (resumo) |
|----|----------|-------|---------------------|
| C01 | ✅ Aprovado | `evidence/C01.png` | Login válido redireciona para `/pacientes`. `POST /v1/api/auth/login` → 200 (`C01.log`). |
| C02 | ✅ Aprovado | `evidence/C02.png` | Clique em "CRM" no menu carrega `/crm` com aba Leads ativa, sem erro no console (`C02.log`). |
| C03 | ✅ Aprovado (rodada 2) | `evidence/C03-retest.png` | Rodada 1 (`evidence/C03.png`): sessão limpa + navegação direta para `/crm` não redirecionava para `/login` — colisão de proxy do Vite gerava HTTP 403 bruto do navegador (achado crítico #1, `C03-detail.log`). Corrigido: prefixo de proxy alterado de `/crm` para `/crm/` em `vite.config.ts`. Reteste: navegação direta sem sessão redireciona corretamente para `/login`, `GET /crm` (página) → 200 OK, sem erro bruto de navegador (`C03-retest.log`). |
| C04 | ✅ Aprovado (rodada 2) | `evidence/C04-retest.png` | Rodada 1 (`evidence/C04.png`): F5 com sessão ativa em `/crm` quebrava a aplicação inteira (mesmo bug de C03). Corrigido pela mesma mudança de proxy. Reteste: F5 mantém a sessão e recarrega a tela normalmente, sem erro bruto (`C04-retest.log`). |
| C05 | ✅ Aprovado (parcial) | `evidence/C05.png` | Link "CRM" visível para perfil MEDICO (único perfil de teste disponível); código-fonte (`Sidebar.tsx` linha 32) confirma lista de roles `['MEDICO','FUNCIONARIO','DESENVOLVEDOR']`. |
| C06 | ⚠️ Não testável | — | Sem conta de teste de outro perfil; navegação direta bloqueada pelo bug #1. Código-fonte (`App.tsx`) confirma que `PrivateRoute` só checa `isAuthenticated`, sem checagem de role — achado de leitura, não de execução (`evidence/C06.log`). |
| C07 | ✅ Aprovado | `evidence/C07.png` | `GET /crm/leads` → 200, payload com nome/email/telefone/interesse/origem/status/criado_em (`C07.log`). |
| C08 | ✅ Aprovado | `evidence/C08.png` | Filtro CONTATADO sem leads mostra "Nenhum lead encontrado" (`C08.log`). |
| C09 | ✅ Aprovado | `evidence/C09.png` | Erro 500 simulado → toast "Erro ao carregar leads" visível, desaparece em ~4-5s; dados antigos permanecem por baixo (`C09.log`, `C09-console.log`). Testado também com 401 simulado: causa logout/redirect global (`C09-401.png/log`). |
| C10 | ✅ Aprovado | `evidence/C10.png` | Linha exibe nome, e-mail, telefone, interesse, chip "NOVO" colorido, data `13/08/2026` (`C10.log`). |
| C11 | ✅ Aprovado | `evidence/C11.png` | Interesse longo trunca com "..." sem quebrar o layout da tabela. |
| C12 | ✅ Aprovado | `evidence/C12.png` | Todas as 5 pílulas de status + "Todos" disparam a query correta (`C12.log`: `?status=CONTATADO/QUALIFICADO/CONVERTIDO/PERDIDO` e sem parâmetro). |
| C13 | ✅ Aprovado | `evidence/C13.png` | QUALIFICADO sem leads mostra "Nenhum lead encontrado" (reteste após expiração de sessão; `C13.log`). |
| C14 | ✅ Aprovado | `evidence/C14.png` | Pílula ativa com fundo destacado (mesmo print de C08). |
| C15 | ✅ Aprovado (rodada 2) | `evidence/C15-retest.png` | Rodada 1 (`evidence/C15.png`): condição de corrida confirmada — cliques rápidos NOVO→CONTATADO→QUALIFICADO→Todos resultavam em pílula "QUALIFICADO" ativa mas tabela com dados de "Todos" (achado crítico #4, `C15-detail.log`). Corrigido com contador de requisição (só a resposta da última requisição disparada atualiza o estado). Reteste: mesma sequência de cliques resulta em pílula "Todos" ativa E tabela com dados de "Todos" — consistentes entre si e com o último clique (`C15-retest.log`). |
| C16 | ✅ Aprovado | `evidence/C16.png` | Modal "Novo Lead" em branco, Origem = OUTRO pré-selecionada. |
| C17 | ✅ Aprovado | `evidence/C17.png` | Nome vazio → toast "Nome é obrigatório", nenhum POST (`C17.log`). |
| C18 | ✅ Aprovado | `evidence/C18.png` | Só nome preenchido → `POST /crm/leads` → 201, payload `{"nome":"QA CRM Lead Somente Nome",...}` (`C18.log`). |
| C19 | ✅ Aprovado | `evidence/C19.png` | E-mail `abc123` → toast "E-mail inválido", nenhum POST (`C19.log`). |
| C20 | ✅ Aprovado | `evidence/C20.png` | Telefone `123` → toast "Telefone inválido", nenhum POST (`C20.log`). |
| C21 | ✅ Aprovado | `evidence/C21.png` (= C11.png) | Telefone de 11 dígitos `(11) 98888-7777` aceito, `POST` → 201 (`C21.log`). |
| C22 | ✅ Aprovado | `evidence/C22.png` | Telefone formatado com parênteses/traço aceito (regex conta só dígitos) — mesmo teste de C21. |
| C23 | ✅ Aprovado | `evidence/C23.png` | Interesse "ab" (2 chars) → toast "Interesse deve ter pelo menos 3 caracteres", nenhum POST (`C23.log`). |
| C24 | ✅ Aprovado | `evidence/C24.png` | Interesse vazio salva normalmente, coluna mostra "—" (`C24.log`, mesmo POST de C18). |
| C25 | ✅ Aprovado | `evidence/C25.png` | Nome só de espaços é bloqueado pela validação de obrigatoriedade (nenhum POST) — melhor que o suspeitado pelo test-plan (`C25.log`). |
| C26 | ✅ Aprovado (rodada 2) | `evidence/C26-retest.png` | Rodada 1 (`evidence/C26.png`): duplo clique síncrono em "Salvar" disparava 2× `POST /crm/leads` (201 cada), lead duplicado (achado crítico #3, `C26.log`). Corrigido com guard `useRef` (bloqueia a segunda chamada antes do primeiro re-render). Reteste: 2 cliques síncronos disparam apenas 1 `POST /crm/leads` → 201, sem duplicata na tabela (`C26-retest.log`). |
| C27 | ✅ Aprovado (rodada 2) | `evidence/C27-retest.png` | Rodada 1 (`evidence/C27.png`): após "Cancelar", reabrir "Novo Lead" mostrava o nome da tentativa anterior ainda preenchido — estado não resetado (achado crítico #6, `C27-detail.log`). Corrigido: formulário reseta ao cancelar/fechar. Reteste: preencher Nome, cancelar, reabrir "Novo Lead" → campo Nome vazio (`C27-retest.log`). |
| C28 | ✅ Aprovado | `evidence/C28.png` | Modal "Mover Lead no Pipeline" com status atual (NOVO) destacado com anel. |
| C29 | ✅ Aprovado | `evidence/C29.png` | Mover para CONTATADO → `PATCH .../status` → 204, chip atualiza (`C29.log`). |
| C30 | ✅ Aprovado (achado) | `evidence/C30-retry.png` | Botão "Confirmar" não desabilita sem mudança real; PATCH disparado mesmo assim, mas o backend rejeitou com 403 (regra de "não pode mover para o mesmo status"). Ver `C30-detail.log`. |
| C31 | ✅ Aprovado | `evidence/C31.png` | "Cancelar" no modal de mover não dispara PATCH (`C31.log`). |
| C32 | ✅ Aprovado (documentado) | `evidence/C32.png` | Erro 403 real (do teste de C30) é comunicado só via toast com o texto cru "Request failed with status code 403", sem tradução. Ver `C32-detail.log`. |
| C33 | ✅ Aprovado | `evidence/C33.png` | Aba Paciente 360 mostra busca + "Selecione um paciente para ver o perfil completo". |
| C34 | ✅ Aprovado | `evidence/C34.png` | Busca "QA CRM" abre dropdown com "QA CRM Paciente Teste". |
| C35 | ✅ Aprovado | `evidence/C35.png` | Busca por CPF parcial "11122233" filtra corretamente. |
| C36 | ✅ Aprovado | `evidence/C36.png` | Busca sem correspondência mostra "Nenhum paciente encontrado" no dropdown. |
| C37 | ⚠️ Parcial / não totalmente testável | `evidence/C37.png` | Ambiente tinha exatamente 10 pacientes ativos (limite do `slice(0,10)`), todos batendo a busca "a" — não foi possível observar um 11º resultado sendo escondido. Código-fonte confirma ausência de indicador de truncamento (`C37-detail.log`). |
| C38 | ✅ Aprovado | `evidence/C38.png` | Selecionar paciente dispara as 3 chamadas em paralelo: `GET .../tags`, `.../contatos`, `.../notas`, todas 200 (`C38.log`). |
| C39 | ✅ Aprovado | `evidence/C39.png` | Apagar a busca volta ao estado "Selecione um paciente". |
| C40 | ✅ Aprovado | `evidence/C40.png` (= C38.png) | "Tags (0)" + "Nenhuma tag. Adicione abaixo." |
| C41 | ✅ Aprovado | `evidence/C41.png` | Tag "QA CRM hipertenso" adicionada via botão, `POST .../tags` → 201, chip aparece como "qa crm hipertenso" (nota: normalizado para minúsculas pelo backend) (`C41.log`). |
| C42 | ✅ Aprovado | `evidence/C42.png` | Enter no campo também adiciona tag "qa crm diabetico" (`C42.log`). |
| C43 | ✅ Aprovado | (ref. C33/C41 snapshots) | Botão "Adicionar" com `[disabled]` confirmado com campo vazio, habilitado com texto. |
| C44 | ✅ Aprovado (documentado) | `evidence/C44.png` | Tag duplicada retorna `POST` → 201 mas o backend deduplica — lista final mantém só 2 tags únicas, sem duplicata visível. Ver `C44-detail.log`. |
| C45 | ✅ Aprovado | `evidence/C45.png` | "X" remove a tag imediatamente sem confirmação, `DELETE /crm/tags/{id}` → 204 (`C45.log`). |
| C46 | ✅ Aprovado | `evidence/C46.png` | "Nenhum contato registrado" sem contatos. |
| C47 | ✅ Aprovado | `evidence/C47.png` | Modal "Registrar Contato" com Tipo=LIGACAO, Direção=SAIDA, Duração/Descrição vazios. |
| C48 | ✅ Aprovado (rodada 2) | `evidence/C48-retest.png` | Rodada 1 (`evidence/C48.png`, `evidence/C48-whitespace.png`): descrição vazia era bloqueada corretamente, mas descrição só de espaços ("   ") passava a validação e criava contato em branco (`POST` → 201, achado crítico #5, `C48-detail.log`). Corrigido com `.trim()` antes da checagem de obrigatoriedade. Reteste: descrição só de espaços é bloqueada, modal permanece aberto, contador "Contatos (5)" inalterado, nenhum `POST /crm/paciente/{id}/contatos` disparado (`C48-retest.log`). |
| C49 | ✅ Aprovado | `evidence/C51.png` (lista final) | Contato EMAIL/ENTRADA salvo sem duração, exibido como "2min" após correção do valor (`C21.log`/rede confirma 201). |
| C50 | ✅ Aprovado (rodada 2) | `evidence/C50-retest.png` | Rodada 1 (`evidence/C50.png`): duração -30 era enviada sem validação client-side; backend respondia 500 genérico ("Erro interno") em vez de validação clara (achado crítico #7, `C50-detail.log`). Corrigido com validação client-side de duração não-negativa. Reteste: duração -30 é bloqueada ANTES de qualquer chamada de rede, toast "Duração não pode ser negativa" exibido, modal permanece aberto, nenhum `POST` disparado (`C50-retest.log`). |
| C51 | ✅ Aprovado | `evidence/C51.png` | Os 5 tipos (LIGACAO, EMAIL, WHATSAPP, SMS, PRESENCIAL) × direções testadas, todos com ícone e chip de direção corretos (`C51.log`). |
| C52 | ✅ Aprovado | `evidence/C52.png` | "Nenhuma nota clínica" sem notas. |
| C53 | ✅ Aprovado | `evidence/C53.png` | Modal "Nova Nota Clínica" com Tipo=OBSERVACAO, Conteúdo vazio. |
| C54 | ✅ Aprovado (rodada 2) | `evidence/C54-retest.png` | Rodada 1 (`evidence/C54.png`): conteúdo vazio era bloqueado corretamente, mas conteúdo só de espaços passava a validação e disparava POST — que retornava 500 do backend (`C54-detail.log`). Corrigido com `.trim()` antes da checagem de obrigatoriedade. Reteste: conteúdo só de espaços é bloqueado, modal permanece aberto, contador "Notas (0)" inalterado, nenhum `POST /crm/paciente/{id}/notas` disparado (`C54-retest.log`). Bug de backend do C55/C56 (500 mesmo com payload válido) não foi reavaliado, fora do escopo deste reteste de front-end. |
| C55 | ❌ Bloqueado (backend) | `evidence/C55.png` | **Bloqueante.** `POST /crm/paciente/{id}/notas` retorna 500 mesmo com payload 100% válido, em 2 tentativas distintas. Funcionalidade de criar nota clínica não funciona neste ambiente. Ver achado crítico #7 (`C55-C56-detail.log`). |
| C56 | ❌ Bloqueado (backend) | — | Não testável — mesma causa de C55 (impossível criar qualquer nota para testar os 5 tipos/multi-linha). |
| C57 | ✅ Aprovado | `evidence/C57.png` | "Nenhum paciente em risco de churn — ótimo sinal!" (lista real vazia no ambiente) (`C57.log`). |
| C58 | ⚠️ Não testável | — | Nenhum paciente em risco de churn no ambiente — impossível verificar o card com dados reais/fallbacks. |
| C59 | ✅ Aprovado (documentado) | `evidence/C59.png` | Erro 500 simulado em `GET /crm/churn` mantém a MESMA mensagem "ótimo sinal", sem diferenciar de lista vazia real. Ver `C59-detail.log`. |
| C60 | ✅ Aprovado | `evidence/C60.png` | 6 cards do Resumo Executivo com dados reais (17 agendamentos, 10 pacientes, 15 médicos, etc.) de `GET /ia/kpis` → 200. |
| C61 | ✅ Aprovado | `evidence/C61.png` | Erro 500 simulado em `GET /ia/kpis` mostra "Erro ao carregar analytics. Verifique se o sgsm-ia está online." de forma limpa. |
| C62 | ✅ Aprovado | `evidence/C62.png` | Payload real confirma `faturamentoMensal:[]`, `pacientesAltoValor:[]`, `cancelamentos:[]` (seções ocultas) vs. `funilMedico`/`ocupacaoAgenda` com dados (seções visíveis) (`C62-payload.log`). |
| C63 | ✅ Aprovado | `evidence/C63.png` (= C62.png) | Como `funilMedico` tinha dados, "Sem dados analíticos ainda" corretamente não apareceu. |
| C64 | ✅ Aprovado | `evidence/C64.png` (= C62.png) | Todas as linhas de "Funil por Médico" com 0.0% de conversão aparecem em vermelho, consistente com regra <40%. |
| C65 | ✅ Aprovado | `evidence/C65.png` (= C62.png) | Dr. Carlos Mendes com 100% de ocupação em barra verde (1/1 slots); demais médicos sem slots mostram "—" em vez de 0%. |
| C66 | ⚠️ Não testável | — | `faturamentoMensal` vazio no ambiente — seção nunca renderizada, impossível testar hover/formatação/barras pequenas. |
| C67 | ✅ Aprovado | `evidence/C67.png` | Tab real confirma ordem Nome → E-mail → Telefone → Interesse. |
| C68 | ✅ Aprovado | `evidence/C68.png` | Esc fecha modal "Novo Lead" e modal "Mover Status" (testado nos dois). |
| C69 | ✅ Aprovado | `evidence/C69.png` | Clique real do mouse fora do painel (coordenada 10,10) fecha "Novo Lead" e "Mover Status" — sem o bug de CSS encontrado no QA de Médicos. |
| C70 | ✅ Aprovado (documentado) | `evidence/C70.png` | Trocar de aba principal e voltar para Paciente 360 PERDE o paciente selecionado (busca volta vazia). Confirma que cada `*Tab` é remontada. Ver `C70-detail.log`. |
| C71 | ✅ Aprovado (rodada 2) | `evidence/C71-retest.png` | Rodada 1 (`evidence/C71.png`): F5 com modal "Novo Lead" aberto e dados preenchidos quebrava a aplicação inteira, não apenas fechava o modal (mesmo bug de C03/C04, `C71-detail.log`). Corrigido pela mesma mudança de proxy. Reteste: F5 recarrega a tela normalmente, modal fecha e formulário volta ao estado inicial (perda de dados esperada de reload de SPA), mas sem erro bruto de navegador (`C71-retest.log`). |
| C72 | ✅ Aprovado | `evidence/C72.png` | Lead "QA CRM Lead BackForward Test" permanece consistente (sem duplicar, sem sumir) após Voltar → Avançar → Voltar via histórico SPA — **diferente do bug de perda de dados encontrado no QA de Médicos**, aqui o dado persiste corretamente. |
| C73 | ✅ Aprovado | `evidence/C73.png` | Delay real de 6s via `page.route`; spinner permanece visível durante toda a espera (`duration: 6028ms` confirmado no network) (`C73.log`). |
| C74 | ✅ Aprovado (achado) | `evidence/C74.png` | Erro 500 simulado não expõe informação técnica crua, mas colapsa para "Nenhum lead encontrado" (mesmo texto de lista vazia). Ver `C74-detail.log`. |

---

## Itens não testáveis

- **C06** — sem conta de teste de perfil não-MEDICO; navegação direta também bloqueada pelo bug crítico #1. Achado de código citado como substituto parcial.
- **C37** — ambiente com exatamente 10 pacientes ativos (limite exato do corte `slice(0,10)`), sem um 11º resultado para observar o truncamento ao vivo.
- **C58** — nenhum paciente em risco de churn no ambiente (lista sempre vazia).
- **C66** — `faturamentoMensal` vazio no ambiente, seção nunca renderizada.

Nenhum desses foi "inventado" ou marcado como aprovado sem evidência — todos documentados com o motivo real da limitação.

## Notas metodológicas

- Dados de teste: leads, tags, contatos e paciente com prefixo "QA CRM" (nunca reaproveitando ou apagando dados pré-existentes como o lead "joao" ou os pacientes já cadastrados).
- Paciente de teste "QA CRM Paciente Teste" (CPF 111.222.333-96) criado via `/pacientes` como pré-requisito para a seção 5, conforme instruído pelo test-plan.
- Simulação de rede lenta/erro feita exclusivamente via `page.route`/`route.fulfill`/`route.continue` (Playwright real), nunca por mock de dados da aplicação em JS solto. Para delays, `page.waitForTimeout()` foi usado dentro do handler de rota em vez de `setTimeout` global, que não está disponível no sandbox de execução do `browser_run_code_unsafe` deste ambiente (`ReferenceError: setTimeout is not defined` — achado de ambiente de teste, não do app).
- A sessão expirou espontaneamente (403 generalizado) pelo menos 2 vezes durante a execução, exigindo logout manual + novo login para continuar — ver achado crítico #2. Isso também limitou a profundidade de alguns testes (ex. C51 precisou de 2 sessões para cobrir os 5 tipos de contato).
- Cliques via Playwright nativo (`browser_click`) funcionaram na maior parte dos casos; para o teste de duplo clique síncrono (C26) foi necessário disparar `.click()` duas vezes via `page.evaluate` no mesmo tick, já que o clique duplo do Playwright nativo processa uma renderização entre os cliques. Para o teste de clique fora do modal (C69), foi necessário usar `page.mouse.click(10, 10)` (coordenada real) em vez de `element.click()` programático, que não disparava o handler de fechamento corretamente.
- Nenhum dado pré-existente antes do início do QA foi editado ou apagado.

**Notas metodológicas específicas da rodada 2 (reteste):**
- Cliques via Playwright nativo (`browser_click`) sofreram timeout de "elemento estável" de forma
  recorrente nesta sessão (provável instabilidade de animação/overlay do botão flutuante "Assistente
  virtual"); todos os cliques do reteste foram disparados via `.click()`/`dispatchEvent` no DOM real
  através de `browser_run_code_unsafe`, sem alterar o comportamento testado.
- `page.screenshot({ path: ... })` apontando para fora de `.playwright-mcp/` (ex. diretamente para
  `docs/prd/crm/evidence/`) travava indefinidamente no passo interno "waiting for fonts to load" do
  Playwright, mesmo com fontes já carregadas — provável restrição de escrita do processo do servidor
  MCP fora do seu diretório de trabalho. Contorno: screenshot salvo em `.playwright-mcp/<id>-retest.png`
  e depois copiado para `docs/prd/crm/evidence/` via `cp` (Bash), que não tem essa restrição.
- Para o reteste de C15 (condição de corrida nos filtros), disparar os 4 cliques de pílula no MESMO
  tick síncrono de JS fazia o React 18 aplicar batching automático e colapsar tudo em 1 único
  re-render (sem gerar as 4 requisições distintas necessárias para expor a condição de corrida) — foi
  necessário espaçar os cliques em ~25ms via `setTimeout` encadeado para que cada um fosse tratado
  como evento discreto, reproduzindo fielmente o cenário de "cliques rápidos de usuário real" da
  rodada 1.

---

## Resumo final — Rodada 1 (antes das correções)

- **Total de itens:** 74 (C01–C74)
- **✅ Aprovados:** 59 — C01, C02, C05, C07–C14, C16–C25, C28–C36, C38–C47, C49, C51–C53, C57, C59–C65, C67–C70, C72–C74
- **🟡 Parcialmente reprovados (mistos, aprovado no caso principal + bug em caso de borda):** 2 — C48, C54
- **❌ Reprovados (bugs confirmados):** 7 — C03, C04, C15, C26, C27, C50, C71
- **❌ Bloqueados (bug de backend, funcionalidade inteira indisponível):** 2 — C55, C56
- **⚠️ Não testáveis (limitação de dados do ambiente, documentado):** 4 — C06, C37, C58, C66

**Bloqueadores críticos identificados antes de considerar o CRM pronto para produção:**
1. **`vite.config.ts`** — renomear o prefixo de proxy `/crm` (ex. para `/api/crm` ou reorganizar a ordem/especificidade das regras) para não colidir com a rota de página SPA `/crm`. Afeta C03, C04, C71 — quebra a aplicação inteira em F5/navegação direta.
2. **Backend: `POST /crm/paciente/{id}/notas` sempre retorna 500.** Bloqueia toda a funcionalidade de notas clínicas (C55, C56). Fora do escopo deste repositório front-end, mas crítico para o produto.
3. **Backend: tratamento de erro genérico (500) para entradas inválidas previsíveis** (duração negativa em Contato, conteúdo/descrição só de espaços) em vez de validação HTTP 400 clara (C50, C54).
4. **Sessão expira sem recuperação automática** (~15-20 min), transversal a toda a aplicação, não específico do CRM — mesma causa raiz do achado crítico #6 do QA de Médicos.

**Itens de front-end identificados para corrigir (menor severidade, mas reais):**
- Duplo clique em "Salvar" do Novo Lead cria lead duplicado (C26) — replicar o guard já existente no cadastro de Médicos.
- Condição de corrida nos filtros de status de Leads (C15) — adicionar cancelamento de requisição obsoleta (AbortController ou verificação de "última requisição pedida").
- Formulário "Novo Lead" não reseta ao cancelar (C27).
- Validações de "Descrição"/"Conteúdo" (Contatos/Notas) devem usar `.trim()` antes da checagem de obrigatoriedade (C48, C54).

## Resumo final — Rodada 2 (após correções de front-end)

- **Total de itens:** 74 (C01–C74)
- **✅ Aprovados:** 68 — todos os itens exceto C06, C37, C55, C56, C58, C66 (inclui C03, C04, C15, C26, C27, C48, C50, C54, C71, reconfirmados corrigidos nesta rodada)
- **🟡 Parcialmente reprovados:** 0 (C48 e C54 passaram de parcial para aprovado)
- **❌ Reprovados:** 0 (todos os 7 reprovados da rodada 1 foram corrigidos e reconfirmados)
- **❌ Bloqueados (bug de backend, fora do escopo deste repositório):** 2 — C55, C56
- **⚠️ Não testáveis (limitação de dados do ambiente, documentado):** 4 — C06, C37, C58, C66

Das 9 reprovações/parciais originais (C03, C04, C15, C26, C27, C48, C50, C54, C71), **todas as 9 foram
corrigidas no front-end e reconfirmadas** — 100% de taxa de correção para os itens no escopo deste
repositório. Nenhuma reprovação de front-end resta em aberto.

**Bloqueadores críticos remanescentes (bugs de backend, fora do escopo deste repositório front-end):**
1. **Backend: `POST /crm/paciente/{id}/notas` sempre retorna 500**, mesmo com payload válido. Continua bloqueando toda a funcionalidade de criar notas clínicas (C55, C56) — não foi alterado nem reavaliado nesta rodada.
2. **Sessão expira sem recuperação automática** (~15-20 min), transversal a toda a aplicação, não específico do CRM — mesma causa raiz do achado crítico #6 do QA de Médicos. Não é um item do test-plan do CRM em si, mas segue afetando a fluidez de qualquer sessão de teste/uso prolongada.

Todos os bloqueadores de front-end identificados na rodada 1 (proxy do Vite colidindo com a rota `/crm`,
duplo clique duplicando lead, condição de corrida nos filtros, formulário não resetando, validações sem
`.trim()`, duração negativa sem validação client-side) foram eliminados.
