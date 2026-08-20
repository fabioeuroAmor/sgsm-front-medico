## Rodada 2 — reteste pós-correções

Reteste pontual, ao vivo via Playwright MCP contra `http://localhost:3001` + backends reais `sgsm` core (`:8080`) e `ms-sboot-auth` (`:8081`), sem mocks. Executado em 2026-08-20, após o commit `ceaec95` (`fix(registrar): corrige 4 bugs achados em QA funcional`) ter corrigido os 4 bugs confirmados na Rodada 1 (REG002, REG014, REG016, REG028). Escopo: **apenas esses 4 itens**, não o plano completo (os demais 31 itens não foram reexecutados nesta rodada).

Contas de teste usadas: prefixo "QA Registro Retest" no nome, e-mails únicos `qa.retest.*@teste.com`, CPFs matematicamente válidos gerados e conferidos via o mesmo algoritmo de dígito verificador do `PacienteService`/`RegisterPage.tsx`, nunca reaproveitados entre casos. A conta `fabioeuro@gmail.com` não foi usada em nenhum cadastro.

**Nota de ambiente (relevante para reprodutibilidade):** no início da execução, a porta 3001 estava servindo o projeto **errado** — `C:\AmbienteDev\sgsm-front-medico` (repositório base, branch `qa/funcionarios`, sem nenhuma das 4 correções) — em vez de `C:\AmbienteDev\sgsm-front-medico-registrar` (onde vive o commit `ceaec95` com as correções). Isso inicialmente mascarou os resultados: `GET /auth/email-disponivel` nunca era chamado, e `POST /pacientes` retornava um 500 cru fabricado por uma interceptação de rede (`page.route`/`route.fulfill`) residual de uma sessão de QA anterior (usada originalmente para simular o cenário de REG027) ainda ativa na mesma aba/contexto persistente do navegador do Playwright MCP. Corrigido o ambiente: processo `vite` errado (servindo o diretório base) encerrado, dev server correto iniciado a partir de `sgsm-front-medico-registrar`, e uma aba nova aberta para descartar a interceptação residual — confirmado por `fetch()` direto retornando o 400 real do `GlobalExceptionHandler` (não mais o 500 fabricado). Após isso, os 4 itens foram retestados normalmente contra código e backends reais.

### Resultado por item

| ID | Veredito Rodada 2 | Evidência |
|----|---|---|
| REG002 | ✅ Corrigido e confirmado — cadastro de Médico com e-mail já usado por Paciente é bloqueado por `GET /auth/email-disponivel` ANTES de qualquer `POST /medicos`; nenhum médico órfão criado. | `evidence/REG002-step1-paciente-sucesso-retest.png`, `evidence/REG002-step2-medico-bloqueado-retest.png`, `evidence/REG002-retest.log` |
| REG014 | ✅ Corrigido e confirmado nas duas camadas — client bloqueia CPF `111.111.111-11` com toast "CPF inválido." (zero requisições); backend (`PacienteService`) rejeita o mesmo CPF via `fetch()` direto com 400 "CPF inválido: ...". | `evidence/REG014-client-cpf-invalido-retest.png`, `evidence/REG014-retest.log` |
| REG016 | ✅ Corrigido e confirmado — data de nascimento `2027-06-15` bloqueada no client com toast "Data de nascimento não pode ser no futuro." (zero requisições). | `evidence/REG016-data-futura-bloqueada-retest.png`, `evidence/REG016-retest.log` |
| REG028 | ✅ Corrigido e confirmado nas duas camadas — duplo `.click()` síncrono na mesma tick dispara só 1 `POST /pacientes` (guard `enviandoRef` funcionando; confirmado também por checagem de duplicidade no banco). Teste complementar de concorrência real no backend confirma que a requisição perdedora recebe 400 limpo, não mais 500 cru. | `evidence/REG028-duplo-clique-guard-retest.png`, `evidence/REG028-retest.log` |

### Resumo da Rodada 2

- **4 de 4 correções confirmadas.** Nenhuma regressão encontrada nos 4 itens retestados.
- Nenhum bug novo foi introduzido pelas correções nos fluxos exercitados (cadastro de Paciente e de Médico completos, com e sem duplicidade de e-mail, com e sem duplo clique).
- Ver anotações "RETESTE (Rodada 2)" inline em cada item correspondente no `test-plan.md` (REG002, REG014, REG016, REG028) para o detalhe completo por item.

---

# QA Results — Tela de Registro (`/registrar`)

Execução ao vivo via Playwright MCP contra o app real em `http://localhost:3001`, backends reais `sgsm` core (`:8080`, `POST /v1/api/medicos` e `/v1/api/pacientes`, ambos públicos) e `ms-sboot-auth` (`:8081`, `POST /v1/api/auth/registrar`), sem mocks. Executado em 2026-08-20.

Contas de teste usadas: prefixo "QA Registro" no nome, e-mails únicos `qa.registro.*@teste.com`, CPFs e CRMs matematicamente válidos e nunca reaproveitados entre casos (exceto quando o próprio teste exigia duplicidade intencional, ex. REG024–REG026). A conta compartilhada `fabioeuro@gmail.com` **não foi usada para nenhum cadastro** — apenas apareceu de forma incidental como sessão pré-existente no navegador (ver Notas metodológicas), usada somente para o teste de rota pública (REG030), nunca para criar registros.

Evidências em `docs/prd/registrar/evidence/<id>.png` (prints de tela) — os payloads de rede (request/response bodies) usados como prova estão citados inline no `test-plan.md` e nesta tabela, coletados via `mcp__playwright__browser_network_request` durante a execução.

---

## Achados críticos (resumo executivo)

### 1. REG002 — CONFIRMADO: cadastro de Médico/Paciente pode criar registro de domínio órfão (sem conta de login)

**Causa raiz:** `RegisterPage.tsx` (linhas 65–78) faz duas chamadas HTTP sequenciais sem transação nem compensação:

```ts
if (tipo === 'MEDICO') {
  const medico = await medicoService.cadastrar({ nome, crm, crmUf, especialidade, email })
  referenciaId = medico.id
} else if (tipo === 'PACIENTE') {
  const paciente = await pacienteService.cadastrar({ nome, cpf, dataNascimento, email })
  referenciaId = paciente.id
}
await authService.registrar({ email, senha, tipoPerfil: tipo, referenciaId })
```

Se a primeira chamada (`/medicos` ou `/pacientes`) tiver sucesso mas a segunda (`/auth/registrar`) falhar, o registro de domínio já foi persistido no banco do `sgsm` e não há nenhum rollback — nem no front (que só mostra um toast de erro) nem no backend (as duas APIs são serviços/bancos separados, sem transação distribuída).

**Repro real, com evidência de rede lado a lado:**

1. Registrado Paciente "QA Registro Orfao Paciente" com e-mail `qa.registro.orfao@teste.com`:
   `POST /v1/api/pacientes` → **201 Created** (id `4dc88cd8-89c8-457e-8e88-d59126b86c08`)
   `POST /v1/api/auth/registrar` → **201 Created** (conta PACIENTE, id `398de6c7-0dc0-44ee-ac7d-534a0771dee4`)
   Login confirmado funcionando com essa conta. (`evidence/REG002-step1-paciente-sucesso.png`)

2. Em seguida, registrado Médico "QA Registro Orfao Medico" (CRM 888099/SP, novo) usando o **mesmo e-mail**:
   `POST /v1/api/medicos` → **201 Created** (médico persistido, id `7fade4fe-d704-40e1-8570-6a510500755d`) — aceito porque a unicidade de e-mail em `/medicos` é isolada por tipo de perfil.
   `POST /v1/api/auth/registrar` → **409 Conflict** — `{"detail":"Email ja cadastrado: qa.registro.orfao@teste.com", ...}` (o `ms-sboot-auth` já tem um usuário com esse e-mail, do passo 1).
   (`evidence/REG002-step2-medico-orfao.png`)

**Resultado:** o médico "QA Registro Orfao Medico" (CRM 888099/SP) existe permanentemente na tabela de médicos do `sgsm`, ativo, sem qualquer conta de login vinculada. O usuário só vê um toast de erro genérico e acredita que nada foi criado — não há como ele mesmo perceber ou corrigir o registro órfão pela UI.

**Severidade:** Crítica. Gera lixo de dados de produção silencioso a cada tentativa de recadastro com e-mail já usado por outro perfil (cenário plausível: um paciente que também é médico, ou reuso comum de e-mail corporativo).

### 2. REG001 — hipótese original REFUTADA por leitura + prova real; comportamento real documentado (não é um bug crítico, mas tem lacuna de UX)

A suspeita original era que `AuthService.registrar()` exigisse `referenciaId != null` para qualquer perfil ≠ DESENVOLVEDOR, inclusive FUNCIONARIO, e lançasse `IllegalArgumentException`. **Isso não corresponde ao código real.** Lendo `AuthService.java` (método `registrar`, linhas 92–105):

```java
EntidadeAuth entidade;
if ("FUNCIONARIO".equals(request.tipoPerfil()) && request.referenciaId() == null) {
    entidade = entidadeAuthRepository
            .findByEmailAndTipo(request.email(), "FUNCIONARIO")
            .orElseThrow(() -> new EntidadeNaoEncontradaException(
                    "Nenhum funcionario encontrado com email: " + request.email()));
} else {
    entidade = entidadeAuthRepository
            .findByReferenciaIdAndTipo(request.referenciaId(), request.tipoPerfil())
            .orElseThrow(...);
}
```

Existe um caminho dedicado para FUNCIONARIO sem `referenciaId`: busca a `EntidadeAuth` (o registro de funcionário) pelo e-mail. Isso só funciona se um médico já tiver cadastrado esse funcionário antes, via `/funcionarios` (`POST /v1/api/funcionarios`).

**Testado ao vivo em dois cenários:**

- **Sem pré-cadastro:** e-mail nunca usado em `/funcionarios` → `POST /auth/registrar` retorna **404** com `"Nenhum funcionario encontrado com email: qa.registro.funcionario.semcadastro@teste.com"`. O cadastro é bloqueado, mas com uma mensagem tecnicamente correta (não o `IllegalArgumentException` hipotetizado). (`evidence/REG001-func-sem-cadastro.png`)
- **Com pré-cadastro:** um médico de teste ("QA Registro Seletor Teste") cadastrou um funcionário ("QA Registro Funcionario Valido", e-mail `qa.registro.func.valido@teste.com`) via `/funcionarios`. Em seguida, o auto-registro em `/registrar` com tipo Funcionário e esse mesmo e-mail **funcionou normalmente**: `POST /auth/registrar` → 201, sem `referenciaId` no payload enviado pelo front (`{"email":"...","senha":"...","tipoPerfil":"FUNCIONARIO"}`), resolvido automaticamente pelo backend. Login subsequente confirma `perfil: "FUNCIONARIO"` e `referenciaId` batendo com o funcionário pré-cadastrado. (`evidence/REG001-REG035-func-sucesso.png`, `evidence/REG033-035-func-login.png`)

**Conclusão:** o fluxo de Funcionário **não está quebrado** — funciona exatamente como o comentário no front-end descreve ("resolvido automaticamente pelo backend via e-mail"), desde que o pré-requisito (médico cadastra o funcionário primeiro) seja cumprido. O único problema real aqui é de UX/comunicação: a tela `/registrar` mostra o aviso "Seu acesso foi criado pelo médico responsável..." (o que já indica esse pré-requisito), mas se o usuário tentar mesmo assim sem esse cadastro prévio, a mensagem de erro resultante ("Nenhum funcionario encontrado com email: ...") é apenas razoável, não é enganosa nem crítica. **Rebaixado de "crítico" para "não é bug" — a hipótese foi refutada pela evidência real.**

### 3. Achados adicionais não hipotetizados originalmente, encontrados durante a execução dos edge cases já previstos no plano

- **REG014 (CPF sem validação de dígito verificador, front e backend).** CPF matematicamente inválido (`111.111.111-11`, todos os dígitos iguais) foi aceito tanto pelo client (sem validação, já esperado pelo plano) quanto pelo backend (`PacienteService`), persistido com `POST /pacientes` → 201. Diferente de outras telas do sistema (ex. `FuncionariosPage.tsx`, que tem `validarCPF()` completo). Severidade: média — permite poluir a base com CPFs inválidos.
- **REG016 (data de nascimento futura aceita).** Data `2027-06-15` foi aceita sem bloqueio client-side e o backend também aceitou e persistiu (`POST /pacientes` → 201). Severidade: baixa/média — dado de integridade duvidosa, mas não bloqueia nenhum fluxo.
- **REG028 (duplo clique gera 2 requisições, uma delas quebra com 500 cru).** Sem nenhum guard de front-end contra duplo submit, dois cliques rápidos no botão "Criar conta" dispararam duas chamadas `POST /pacientes` simultâneas. Uma completou com sucesso (201 + conta criada), a outra retornou **500 Internal Server Error** não tratado graciosamente (`"Erro interno. Tente novamente mais tarde."`) — pior do que o 400 limpo que a mesma duplicidade recebe quando feita em cadastros sequenciais (REG024). O usuário não percebe o erro de fundo porque o toast de sucesso da segunda tentativa "mascara" a falha da primeira. Severidade: média — não impede o cadastro, mas expõe uma race condition não tratada no backend e gera ruído de erro 500 nos logs de produção a cada duplo clique acidental.

---

## Tabela de resultados

| ID | Veredito | Evidência |
|----|----------|-----------|
| REG001 | 🟡 Hipótese refutada, comportamento real documentado | `evidence/REG001-func-sem-cadastro.png`, `evidence/REG001-REG035-func-sucesso.png` — funciona quando funcionário pré-cadastrado por médico; 404 claro quando não |
| REG002 | ❌ Confirmado — crítico | `evidence/REG002-step1-paciente-sucesso.png`, `evidence/REG002-step2-medico-orfao.png` — médico órfão criado (201 em `/medicos`, 409 em `/auth/registrar`) |
| REG003 | ✅ Aprovado | `evidence/REG003.png` |
| REG004 | ✅ Aprovado | `evidence/REG004.png` |
| REG005 | ✅ Aprovado | `evidence/REG005.png` |
| REG006 | ✅ Aprovado | `evidence/REG006.png` — payload de `/medicos` sem `cpf` fantasma |
| REG007 | ✅ Aprovado | `evidence/REG007.png` |
| REG008 | ✅ Aprovado | `evidence/REG008.png` |
| REG009 | ✅ Aprovado | `evidence/REG009.png` |
| REG010 | ✅ Aprovado | `evidence/REG010.png` |
| REG011 | ✅ Aprovado | `evidence/REG011-REG020.png` |
| REG012 | ✅ Aprovado | `evidence/REG011-REG012-before-submit.png` |
| REG013 | ✅ Aprovado | `evidence/REG013.png` |
| REG014 | ❌ Bug confirmado (médio) | `evidence/REG014.png` — CPF `11111111111` aceito e persistido |
| REG015 | ✅ Aprovado | `evidence/REG015.png` |
| REG016 | ❌ Bug confirmado (baixo/médio) | `evidence/REG016.png` — data de nascimento futura aceita e persistida |
| REG017 | ✅ Aprovado (comportamento esperado) | `evidence/REG017.png` |
| REG018 | ✅ Aprovado | `evidence/REG004.png` |
| REG019 | ✅ Aprovado | `evidence/REG019.png` |
| REG020 | ✅ Aprovado | `evidence/REG011-REG020.png` |
| REG021 | ✅ Aprovado | `evidence/REG006.png` |
| REG022 | ✅ Aprovado | `evidence/REG022-final-state.png` |
| REG023 | ✅ Aprovado | `evidence/REG023.png` |
| REG024 | ✅ Aprovado | `evidence/REG024.png` |
| REG025 | ✅ Aprovado | `evidence/REG025.png` |
| REG026 | ✅ Aprovado | `evidence/REG026.png` |
| REG027 | ✅ Aprovado | `evidence/REG027.png` |
| REG028 | ❌ Bug confirmado (médio) | `evidence/REG028-duplo-clique.png` — 2 POSTs, um 500 cru |
| REG029 | ✅ Aprovado | `evidence/REG029-apos-reload.png` |
| REG030 | ✅ Aprovado | `evidence/REG030.png` |
| REG031 | ✅ Aprovado | `evidence/REG031.png` |
| REG032 | ✅ Aprovado | `evidence/REG032.png` |
| REG033 | ✅ Aprovado | `evidence/REG033-medico-login.png` |
| REG034 | ✅ Aprovado | `evidence/REG023.png` |
| REG035 | ✅ Aprovado (refuta REG001 como crítico) | `evidence/REG033-035-func-login.png` |

---

## Notas metodológicas

- Todos os cadastros de teste usaram e-mails com o domínio `@teste.com` e nomes prefixados com "QA Registro", nunca reaproveitando CPF/CRM/e-mail entre casos (exceto onde o próprio teste exigia duplicidade proposital: REG002, REG024, REG025, REG026, REG028).
- A conta compartilhada `fabioeuro@gmail.com` apareceu de forma incidental: o navegador/perfil do Playwright MCP já tinha uma sessão JWT ativa dessa conta salva em `localStorage` antes do início da execução (não foi feito login manual com ela). Essa sessão pré-existente foi aproveitada apenas para a prova de REG030 (rota pública acessível mesmo autenticado) e depois descartada (`localStorage.clear()`); em nenhum momento essa conta foi usada para criar um cadastro de teste.
- Para REG022 (estado de carregamento) e REG027 (erro 5xx genérico) foi usada interceptação de rede real via Playwright (`page.route`/`route.fulfill`/`route.continue` com delay), não mock de XHR do navegador — a requisição de rede é real, apenas atrasada ou com resposta injetada no nível de transporte, técnica equivalente à usada em QAs anteriores do repositório (ex. `docs/prd/medicos/qa-results.md`, M56/M57).
- Para REG035/REG001 (fluxo de Funcionário), foi necessário primeiro: (1) logar como o médico de teste "QA Registro Seletor Teste" (criado em REG021), (2) vincular esse médico a um estabelecimento existente ("Clinica São Lucas", via "Gerenciar médicos"), (3) cadastrar um funcionário de teste em `/funcionarios` com e-mail próprio, e só então (4) testar o auto-registro em `/registrar`. Sem esses passos prévios (que não são o objeto direto deste QA, mas pré-requisito de dados), o cenário de sucesso do REG001/REG035 não seria alcançável.
- Toasts (`sonner`) somem automaticamente após alguns segundos; em vários casos foi necessário capturar o texto do toast via `browser_find`/snapshot de acessibilidade imediatamente após o clique (em vez de depender só do screenshot, que por vezes chegou tarde demais e capturou a tela já sem o toast). Nesses casos o texto do toast foi confirmado via snapshot de acessibilidade e citado no `test-plan.md`, com o screenshot preservado como evidência visual complementar.
- Todos os payloads de request/response citados (JSON de `POST /medicos`, `/pacientes`, `/auth/registrar`, `/auth/me`) foram capturados ao vivo via `mcp__playwright__browser_network_request`, direto do tráfego real entre o front (`localhost:3001`) e os backends (`localhost:8080`/`localhost:8081`).

---

## Resumo final

- **Total de itens do plano:** 35 (REG001–REG035) + 2 achados suspeitos de bug crítico apontados previamente por leitura de código (tratados como REG001/REG002 na tabela).
- **✅ Aprovados:** 30 — REG003–REG013, REG015, REG017–REG027, REG029–REG035 (exceto os bugs listados abaixo).
- **❌ Bugs confirmados:** 4
  - **REG002** (crítico) — registro de domínio órfão sem conta de login, quando `/auth/registrar` falha após `/medicos` ou `/pacientes` já ter tido sucesso (falta de transação/compensação entre as duas chamadas).
  - **REG014** (médio) — CPF sem validação de dígito verificador, aceito e persistido tanto no client quanto no backend (`PacienteService`).
  - **REG016** (baixo/médio) — data de nascimento futura aceita e persistida sem nenhuma validação, client ou backend.
  - **REG028** (médio) — duplo clique no botão "Criar conta" dispara 2 requisições `POST` simultâneas; uma delas falha com 500 cru não tratado (race condition no backend), mascarada pelo sucesso da outra.
- **🟡 Hipótese refutada:** 1 — REG001. A suspeita original (registro de Funcionário "totalmente quebrado" por `referenciaId` obrigatório) não corresponde ao código real do `AuthService.registrar()`, que já tem um caminho de resolução por e-mail para o perfil FUNCIONARIO. Testado e confirmado funcionando de ponta a ponta (REG035) quando o pré-requisito de negócio é cumprido (funcionário pré-cadastrado por um médico via `/funcionarios`).
- **⚠️ Bloqueados/não testáveis:** 0 — todos os 35 itens + os 2 achados suspeitos foram executados ao vivo com prova real coletada.

**Itens que exigem correção (fora do escopo desta rodada de QA, que é só de verificação):**
- REG002 — introduzir compensação (ex.: excluir o médico/paciente recém-criado se `/auth/registrar` falhar) ou migrar para um fluxo transacional único no backend.
- REG014 — adicionar validação de dígito verificador de CPF no `PacienteService` (backend) e, idealmente, também no client (`RegisterPage.tsx`), replicando a lógica já existente em `FuncionariosPage.tsx`.
- REG016 — adicionar validação de data de nascimento não-futura, client e/ou backend.
- REG028 — adicionar guard de duplo-submit no front (`useRef` ou desabilitar o botão de forma síncrona antes do primeiro re-render, como já foi feito em outras telas do sistema — ver `docs/prd/medicos/qa-results.md`, correção de M24) e, no backend, tratar a condição de corrida com uma resposta de erro limpa (400) em vez de 500 cru.
- REG001 (não é bug, é melhoria de UX) — considerar uma mensagem mais orientativa quando um Funcionário tenta se autocadastrar sem ter sido pré-cadastrado por um médico, reforçando o aviso já existente na tela.

**Status pós-correção:** as 4 correções acima (REG002, REG014, REG016, REG028) foram implementadas no commit `ceaec95` e retestadas ao vivo na Rodada 2 (ver seção no topo deste documento) — **as 4 confirmadas corrigidas**, sem regressão nos fluxos exercitados.
