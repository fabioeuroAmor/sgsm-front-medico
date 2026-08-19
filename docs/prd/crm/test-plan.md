# Test Plan — Tela de CRM (`/crm`)

Ambiente: front-end em `http://localhost:3001`, backend real (`8080` API principal, `8081` auth, `8082` IA/CRM) já em execução. Sem mocks — todas as chamadas batem no backend real. Simulação de rede lenta/erro é feita por interceptação real de rota (Playwright `page.route`/`browser_run_code_unsafe`), nunca por mock de dados da aplicação.

Login de teste: `eduardasilva@gmail.com` / `joaozinh7` (perfil `MEDICO`).

Convenções: cada item tem checkbox + id curto (`Cxx`). Um item só é marcado quando o subagente de QA anexar **print da tela** + **saída crua de console/rede** comprovando o resultado. Item que o próprio implementador rodou não conta como aprovado.

Dados de teste: usar prefixo "QA CRM" em nomes de leads/tags/notas/contatos criados neste QA, para não confundir com dados pré-existentes. Se não houver nenhum paciente ativo cadastrado no ambiente para testar a aba "Paciente 360", cadastrar um paciente de teste via `/pacientes` antes de iniciar a seção 5 (fora do escopo do CRM, mas pré-requisito).

**Execução completa em** `docs/prd/crm/qa-results.md` **— ver lá o detalhamento de cada item, achados críticos e evidências.**

## 0. Acesso e RBAC

- [x] C01 — Login com `eduardasilva@gmail.com` / `joaozinh7` em `/login` redireciona autenticado.
- [x] C02 — Navegar para `/crm` pelo menu lateral (item "CRM") carrega a tela sem erro no console, com a aba "Leads" ativa por padrão.
- [x] C03 — ✅ Aprovado (rodada 2). Bug crítico de roteamento corrigido (`vite.config.ts` prefixo de proxy alterado para `/crm/`). Reteste: navegação direta a `/crm` sem sessão redireciona corretamente para `/login`, sem erro bruto de navegador. Ver qa-results.md e `evidence/C03-retest.png`/`.log`.
- [x] C04 — ✅ Aprovado (rodada 2). Mesma correção de C03. Reteste: F5 com sessão ativa em `/crm` recarrega normalmente. Ver `evidence/C04-retest.png`/`.log`.
- [x] C05 — Aprovado (parcial): confirmado visualmente que o link "CRM" aparece para perfil MEDICO; código-fonte confirma a lista de roles (`Sidebar.tsx`). Não havia conta de teste de outro perfil disponível para verificação cruzada ao vivo.
- [ ] C06 — Não testável ao vivo (ver motivo em qa-results.md / evidence/C06.log) — achado de código citado, mas sem verificação por execução real com outro perfil.

## 1. Leads — Listagem inicial

- [x] C07 — Ao entrar na aba "Leads", tabela carrega a partir de `GET /crm/leads`.
- [x] C08 — Filtro sem leads mostra "Nenhum lead encontrado", não um erro.
- [x] C09 — Confirmado: erro de API não mostra nada na tela além do toast `Erro ao carregar leads`, que desaparece em poucos segundos.
- [x] C10 — Confirmado: nome, e-mail, telefone, interesse, origem, chip de status, data `dd/mm/aaaa`.
- [x] C11 — Confirmado: truncamento com "..." em interesse longo, layout não quebra.

## 2. Leads — Filtro por status

- [x] C12 — Confirmado: cada pílula dispara `GET /crm/leads?status=X` correto (incluindo "Todos" sem parâmetro).
- [x] C13 — Confirmado: status sem leads mostra "Nenhum lead encontrado".
- [x] C14 — Confirmado: pílula ativa com destaque visual diferente.
- [x] C15 — ✅ Aprovado (rodada 2). Condição de corrida corrigida com contador de requisição. Reteste: cliques rápidos NOVO→CONTATADO→QUALIFICADO→Todos resultam em pílula ativa e dados da tabela sempre consistentes com o último clique. Ver `evidence/C15-retest.png`/`.log`.

## 3. Leads — Criar lead / validações

- [x] C16 — Confirmado: modal em branco, Origem = OUTRO.
- [x] C17 — Confirmado: toast "Nome é obrigatório", nenhum POST.
- [x] C18 — Confirmado: criação só com nome, POST 201, lead aparece na lista.
- [x] C19 — Confirmado: toast "E-mail inválido", nenhum POST.
- [x] C20 — Confirmado: toast "Telefone inválido", nenhum POST.
- [x] C21 — Confirmado: telefone com 11 dígitos aceito e persistido (POST 201).
- [x] C22 — Confirmado: telefone formatado `(11) 98888-7777` aceito (regex conta só dígitos).
- [x] C23 — Confirmado: toast "Interesse deve ter pelo menos 3 caracteres", nenhum POST.
- [x] C24 — Confirmado: interesse vazio salva normalmente (POST 201, coluna mostra "—").
- [x] C25 — Confirmado (comportamento correto, melhor que o esperado pelo test-plan): nome só de espaços é bloqueado pela mesma validação de "Nome é obrigatório" — nenhum POST disparado.
- [x] C26 — ✅ Aprovado (rodada 2). Guard `useRef` de clique duplo implementado. Reteste: 2 cliques síncronos em "Salvar" disparam apenas 1 `POST /crm/leads` (201), sem lead duplicado. Ver `evidence/C26-retest.png`/`.log`.
- [x] C27 — ✅ Aprovado (rodada 2). Reset do estado do formulário ao cancelar implementado. Reteste: preencher Nome, cancelar e reabrir "Novo Lead" mostra o campo Nome vazio. Ver `evidence/C27-retest.png`/`.log`.

## 4. Leads — Mover status do lead

- [x] C28 — Confirmado: modal com status atual pré-selecionado (anel de destaque).
- [x] C29 — Confirmado: PATCH 204, chip atualiza, toast de sucesso.
- [x] C30 — Confirmado: botão "Confirmar" permanece habilitado sem mudança real de status; ao clicar, dispara PATCH mesmo assim (achado adicional: backend rejeitou com 403 por ser transição para o mesmo status — ver qa-results.md).
- [x] C31 — Confirmado: "Cancelar" não altera status, nenhum PATCH.
- [x] C32 — Documentado: erro de API (403) é comunicado só via toast com a mensagem crua do axios ("Request failed with status code 403"), sem tradução. Ver qa-results.md.

## 5. Paciente 360 — Busca de paciente

- [x] C33 — Confirmado: campo de busca + mensagem "Selecione um paciente...".
- [x] C34 — Confirmado: busca por nome abre dropdown filtrado.
- [x] C35 — Confirmado: busca por CPF parcial filtra corretamente.
- [x] C36 — Confirmado: "Nenhum paciente encontrado" no dropdown.
- [ ] C37 — Testado parcialmente ao vivo (ambiente tinha exatamente 10 pacientes ativos, não mais) + confirmado por leitura de código que não há indicador de truncamento quando `filtrados.length > 10`. Ver qa-results.md / evidence/C37-detail.log.
- [x] C38 — Confirmado: card do paciente + 3 chamadas paralelas (tags/contatos/notas) no network.
- [x] C39 — Confirmado: apagar busca volta ao estado "Selecione um paciente".

## 6. Paciente 360 — Tags

- [x] C40 — Confirmado: contagem "(0)" e mensagem "Nenhuma tag. Adicione abaixo.".
- [x] C41 — Confirmado: tag adicionada via botão, POST 201, chip aparece, campo limpa (nota: texto salvo em minúsculas).
- [x] C42 — Confirmado: Enter também adiciona a tag.
- [x] C43 — Confirmado: botão "Adicionar" desabilitado com campo vazio.
- [x] C44 — Documentado: tentativa de tag duplicada retorna POST 201 mas o backend deduplica silenciosamente (lista final não tem duplicata). Ver qa-results.md.
- [x] C45 — Confirmado: "X" remove a tag imediatamente sem modal de confirmação, DELETE 204.

## 7. Paciente 360 — Contatos

- [x] C46 — Confirmado: "Nenhum contato registrado" sem contatos.
- [x] C47 — Confirmado: modal com Tipo=LIGACAO, Direção=SAIDA, campos vazios.
- [x] C48 — ✅ Aprovado (rodada 2). Validação de "Descrição" agora usa `.trim()`. Reteste: descrição só de espaços é bloqueada, nenhum `POST /crm/paciente/{id}/contatos` disparado. Ver `evidence/C48-retest.png`/`.log`.
- [x] C49 — Confirmado: contato salvo sem duração, ícone e chip corretos.
- [x] C50 — ✅ Aprovado (rodada 2). Validação client-side de duração não-negativa implementada. Reteste: duração -30 é bloqueada com toast "Duração não pode ser negativa", nenhum POST disparado. Ver `evidence/C50-retest.png`/`.log`.
- [x] C51 — Confirmado: os 5 tipos (LIGACAO, EMAIL, WHATSAPP, SMS, PRESENCIAL) e as 2 direções (SAIDA, ENTRADA) salvos e exibidos com ícone/chip corretos.

## 8. Paciente 360 — Notas clínicas

- [x] C52 — Confirmado: "Nenhuma nota clínica" sem notas.
- [x] C53 — Confirmado: modal com Tipo=OBSERVACAO, Conteúdo vazio.
- [x] C54 — ✅ Aprovado (rodada 2). Validação de "Conteúdo" agora usa `.trim()`. Reteste: conteúdo só de espaços é bloqueado, nenhum `POST /crm/paciente/{id}/notas` disparado. Ver `evidence/C54-retest.png`/`.log`.
- [ ] C55 — **BLOQUEADO (bug de backend).** POST `/crm/paciente/{id}/notas` retornou 500 Internal Server Error em TODAS as tentativas, inclusive com payload completamente válido — funcionalidade de criar nota clínica está quebrada no backend deste ambiente. Ver qa-results.md.
- [ ] C56 — **BLOQUEADO** pela mesma causa de C55 — não foi possível testar os 5 tipos nem conteúdo multi-linha porque nenhuma nota pôde ser criada.

## 9. Risco de Churn

- [x] C57 — Confirmado: "Nenhum paciente em risco de churn — ótimo sinal!" (lista vazia no ambiente).
- [ ] C58 — Não testável ao vivo — nenhum paciente em risco de churn no ambiente de teste (lista sempre vazia), impossibilitando verificar o card com dados reais.
- [x] C59 — Documentado: erro simulado (500) na listagem mantém a mesma mensagem positiva "ótimo sinal", sem diferenciar erro de lista genuinamente vazia. Ver qa-results.md.

## 10. Analytics

- [x] C60 — Confirmado: 6 cards do Resumo Executivo com dados reais de `GET /ia/kpis`.
- [x] C61 — Confirmado: erro simulado mostra "Erro ao carregar analytics. Verifique se o sgsm-ia está online." sem stack trace.
- [x] C62 — Confirmado com payload real: `faturamentoMensal`, `pacientesAltoValor` e `cancelamentos` vieram vazios e as seções correspondentes não apareceram; `funilMedico` e `ocupacaoAgenda` tinham dados e apareceram.
- [x] C63 — Confirmado (indiretamente): como `funilMedico` tinha dados, a mensagem "Sem dados analíticos ainda" corretamente NÃO apareceu.
- [x] C64 — Confirmado: todas as linhas com conversão 0.0% aparecem em vermelho (<40%), consistente com a regra de cor.
- [x] C65 — Confirmado: Dr. Carlos Mendes com 100% de ocupação em barra verde (1/1 slots); demais médicos sem slots mostram "—".
- [ ] C66 — Não testável ao vivo — `faturamentoMensal` veio vazio no ambiente, a seção nunca foi renderizada.

## 11. Navegação, teclado e resiliência

- [x] C67 — Confirmado via Tab real: Nome → E-mail → Telefone → Interesse, ordem lógica.
- [x] C68 — Confirmado: Esc fecha modal "Novo Lead" e modal "Mover Status".
- [x] C69 — Confirmado: clique no overlay (fora do painel) fecha "Novo Lead" e "Mover Status".
- [x] C70 — Documentado: trocar de aba principal e voltar PERDE o estado da aba anterior (paciente selecionado em Paciente 360 é perdido; Risco de Churn dispara novo GET) — cada `*Tab` é remontada. Ver qa-results.md.
- [x] C71 — ✅ Aprovado (rodada 2). Mesma correção de C03/C04. Reteste: F5 com modal "Novo Lead" aberto e preenchido recarrega normalmente, apenas fechando o modal (sem quebrar a aplicação). Ver `evidence/C71-retest.png`/`.log`.
- [x] C72 — Confirmado: lead recém-criado permanece consistente (sem duplicar, sem sumir) após Voltar → Avançar → Voltar via navegação SPA (`page.goBack`/`goForward`, sem full reload).
- [x] C73 — Confirmado: delay real de 6s via `page.route`, spinner permanece visível durante toda a espera.
- [x] C74 — Confirmado: erro 500 simulado não expõe informação técnica crua (mas colapsa para o mesmo texto "Nenhum lead encontrado" de lista vazia — achado adicional, ver qa-results.md).
