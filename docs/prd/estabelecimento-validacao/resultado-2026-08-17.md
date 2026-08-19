# Resultado da Execução — Test Plan Estabelecimento (Validações)

**Data/hora da execução:** 2026-08-18, ~00:30–00:42 UTC (via ambiente já de pé)
**Executor:** Agente de QA (Playwright MCP, navegador real)
**Ambiente:**
- Frontend: `http://localhost:3001/estabelecimentos`
- Backend sgsm core: `http://localhost:8080` (proxy Vite `/v1/api`)
- Backend auth: `http://localhost:8081` (proxy Vite `/v1/api/auth`)
- Login: `paulo@gmail.com` / `[REDIGIDO]` (sessão já estava autenticada no navegador ao iniciar)
- Dados de partida: 2 estabelecimentos já cadastrados (`Clínica Vida Saudável`, CNPJ `12.345.678/0001-90`; `Clínica São Lucas Final`, CNPJ `11.222.333/0001-81`)
- CNPJ novo usado nos testes (DV válido, calculado): `98.765.432/0001-98`

Todos os 54 casos foram executados ao vivo contra o app real batendo no backend real (sem mocks). Evidências (screenshots, JSON de rede) foram coletadas via Playwright MCP durante a execução; os valores relevantes (payload de requests/responses, mensagens de erro exatas) estão citados em cada linha.

---

## Cadastro — Campo Nome

| TC-ID | Status | Resultado observado |
|---|---|---|
| TC-E001 | PASSOU | Salvar com todos os campos vazios exibiu `"Nome deve ter entre 3 e 100 caracteres"` e nenhum POST foi disparado (rede mostrou só GETs de listagem). |
| TC-E002 | PASSOU | Nome = `AB` → erro `"Nome deve ter entre 3 e 100 caracteres"` mantido. |
| TC-E003 | PASSOU | Nome com 101 caracteres → mesmo erro de tamanho exibido (`len=101` confirmado via DOM). |
| TC-E004 | PASSOU | Nome = `Clínica São Lucas` → erro removido (`err: null`). |

## Cadastro — Campo CNPJ

| TC-ID | Status | Resultado observado |
|---|---|---|
| TC-E005 | PASSOU | Digitar `11222333000181` → campo exibe `11.222.333/0001-81` (máscara aplicada em tempo real). |
| TC-E006 | PASSOU | CNPJ `11.222.333/0001-00` (DV inválido) → erro `"CNPJ contém um número de CNPJ inválido"`. |
| TC-E007 | PASSOU | CNPJ com DV válido → sem erro de validação (front). |
| TC-E008 | PASSOU | CNPJ vazio + Salvar → erro `"CNPJ deve estar no formato 12.345.678/0001-90"`, POST não disparado. |
| TC-E009 | PASSOU | CNPJ incompleto (`11.222.333/0001`, 12 dígitos) → erro de formato exibido. |
| TC-E010 | PASSOU | Abrir Editar em `Clínica São Lucas` → campo CNPJ com `disabled` no DOM, valor formatado `98.765.432/0001-98`. |

## Cadastro — Campo Telefone (opcional)

| TC-ID | Status | Resultado observado |
|---|---|---|
| TC-E011 | **FALHOU** | Ver seção "Bugs encontrados" — Telefone vazio na criação **bloqueia** o Salvar com erro de formato, apesar de ser documentado/rotulado como opcional. |
| TC-E012 | PASSOU | `11987654321` → exibe `(11) 98765-4321`. |
| TC-E013 | PASSOU | `1133334444` → exibe `(11) 3333-4444`, sem erro. |
| TC-E014 | PASSOU | `119999` (poucos dígitos) → exibe `(11) 9999` com erro `"Telefone deve estar no formato..."`. |

## Cadastro — Campo E-mail (obrigatório inclusive na edição)

| TC-ID | Status | Resultado observado |
|---|---|---|
| TC-E015 | PASSOU | E-mail vazio + Salvar (criação) → erro `"E-mail é obrigatório"`. |
| TC-E016 | PASSOU | `contatoclinica.com` (sem `@`) → erro `"E-mail inválido"`. |
| TC-E017 | PASSOU | `usuario@` (sem domínio) → erro `"E-mail inválido"`. |
| TC-E018 | PASSOU | `contato@clinica.com` → sem erro. |
| TC-E019 | **FALHOU** | Ver seção "Bugs encontrados" — E-mail vazio na edição **não bloqueia** o Salvar (nenhum erro exibido, PUT disparado com `"email": null`). |

## Cadastro — Endereço: Logradouro

| TC-ID | Status | Resultado observado |
|---|---|---|
| TC-E020 | PASSOU | Logradouro vazio + Salvar → erro de tamanho/obrigatoriedade exibido. |
| TC-E021 | PASSOU | `Av` (2 chars) → erro `"Logradouro deve ter entre 3 e 200 caracteres..."`. |
| TC-E022 | PASSOU | `Av Paulista @#` → mesmo erro de formato (caracteres `@#` não permitidos pela regex). |
| TC-E023 | PASSOU | `Av. Paulista` → sem erro. |

## Cadastro — Endereço: Número

| TC-ID | Status | Resultado observado |
|---|---|---|
| TC-E024 | PASSOU | Número vazio + Salvar → erro `"Número deve conter apenas dígitos (ex: 123)"`. |
| TC-E025 | PASSOU (comportamento observado) | Digitar `abc` no campo Número → o input já filtra letras no `onChange` (`onlyDigits`), campo permanece vazio (`""`) e o erro exibido é o mesmo de campo vazio — nenhuma letra chega a entrar no campo. Mesmo padrão citado no test-plan (igual a Pacientes). |
| TC-E026 | PASSOU | `1578` → sem erro. |

## Cadastro — Endereço: Complemento (opcional)

| TC-ID | Status | Resultado observado |
|---|---|---|
| TC-E027 | PASSOU | Complemento vazio → sem erro (campo realmente opcional, ao contrário do Telefone — ver bug TC-E011). |
| TC-E028 | PASSOU | 101 caracteres → erro `"Complemento deve ter no máximo 100 caracteres"`. |
| TC-E029 | PASSOU | `Sala 12` → sem erro. |

## Cadastro — Endereço: Bairro

| TC-ID | Status | Resultado observado |
|---|---|---|
| TC-E030 | PASSOU | Bairro vazio + Salvar → erro de obrigatoriedade/tamanho exibido. |
| TC-E031 | PASSOU | `J` (1 char) → erro `"Bairro deve ter entre 2 e 100 caracteres..."`. |
| TC-E032 | PASSOU | `Jardins123` → mesmo erro de formato (números não permitidos; campo Bairro não tem mask de filtro, então o dígito chega a ser validado pela regex). |
| TC-E033 | PASSOU | `Jardins` → sem erro. |

## Cadastro — Endereço: CEP (sem integração ViaCEP)

| TC-ID | Status | Resultado observado |
|---|---|---|
| TC-E034 | PASSOU | CEP vazio + Salvar → erro `"CEP deve estar no formato 12345-678"`. |
| TC-E035 | PASSOU | `01310100` → exibe `01310-100`. |
| TC-E036 | PASSOU | `01310` (incompleto) → erro de formato exibido. |
| TC-E037 | PASSOU | CEP `01310-100` válido → sem erro; `browser_network_requests` filtrado por `viacep` retornou **zero requisições**; logradouro/bairro/cidade/UF preenchidos manualmente antes permaneceram inalterados após digitar o CEP (confirmando ausência de auto-preenchimento). |

## Cadastro — Endereço: Cidade

| TC-ID | Status | Resultado observado |
|---|---|---|
| TC-E038 | PASSOU | Cidade vazia + Salvar → erro de tamanho/obrigatoriedade exibido. |
| TC-E039 | PASSOU | `S` (1 char) → erro `"Cidade deve ter entre 2 e 100 caracteres..."`. |
| TC-E040 | **FALHOU** | Ver seção "Bugs encontrados" — digitar `Sao Paulo1` resulta em `Sao Paulo` (dígito filtrado silenciosamente pela máscara `formatCidade`) e **nenhum erro é exibido**, ao contrário do esperado no plano (`→ erro de formato`). |
| TC-E041 | PASSOU | `São Paulo` → sem erro. |

## Cadastro — Campo UF (dropdown fixo)

| TC-ID | Status | Resultado observado |
|---|---|---|
| TC-E042 | **NÃO-TESTÁVEL** | O `<select>` de UF não tem opção em branco e o formulário inicial (`emptyForm` em `EstabelecimentosPage.tsx`, linha 27) já define `uf: 'SP'` como valor padrão. Não existe caminho de UI para deixar UF "não selecionada" — o primeiro `<option>` da lista é `AC`, sempre um valor válido. Confirmado via snapshot de acessibilidade do modal (`combobox "UF"` sempre com uma opção `[selected]`). |
| TC-E043 | PASSOU | Selecionar `GO` no dropdown → valor aplicado, sem erro; elemento é um `<select>` nativo, não há como digitar valor livre. |

## Comportamento geral no Salvar

| TC-ID | Status | Resultado observado |
|---|---|---|
| TC-E044 | PASSOU | Com todos os campos vazios, Salvar exibiu simultaneamente erros de nome, cnpj, telefone, email, logradouro, número, bairro, cep e cidade (confirmado via snapshot único, todos os `<p>` de erro presentes ao mesmo tempo). |
| TC-E045 | PASSOU | Confirmado repetidamente ao longo da execução (ex.: CNPJ DV inválido → válido, Cidade com número → sem erro, Telefone incompleto → completo): o erro desaparece assim que o valor passa a satisfazer a regra, sem necessidade de novo blur. |
| TC-E046 | PASSOU | Duplo clique em Salvar com formulário válido → apenas **1** requisição `POST /estabelecimentos` (`201 Created`) disparada; modal fechou normalmente, sem cadastro duplicado. |

## Edição de estabelecimento

| TC-ID | Status | Resultado observado |
|---|---|---|
| TC-E047 | PASSOU | Reforça TC-E010: campo CNPJ com `disabled` e valor formatado `98.765.432/0001-98` ao abrir Editar. |
| TC-E048 | PASSOU | Nome apagado + blur, sem erro exibido; Salvar → PUT disparado com sucesso e o campo `nome` **não presente** no corpo da requisição (`JSON.stringify` remove `undefined`), preservando o nome original no banco (confirmado no response: `"nome":"Clínica São Lucas"`). |
| TC-E049 | **FALHOU** | Mesmo bug de TC-E019: e-mail apagado na edição não gera erro nem bloqueia Salvar. PUT disparado com `"email": null` no payload. O **backend** preservou o e-mail original na resposta (`"email":"contato@clinica.com"`), então não houve perda de dado, mas o comportamento esperado no plano (bloqueio no front com erro visível) não ocorre — quem depende dessa proteção é o backend, não o front. |
| TC-E050 | PASSOU | Telefone alterado para `(11) 98765-1234` e Salvar → `PUT /estabelecimentos/{id}` com payload `{"nome":"Clínica São Lucas","telefone":"(11) 98765-1234","email":"contato@clinica.com",...}`; response confirma telefone atualizado, demais campos preservados. |

## Inativação (soft delete)

| TC-ID | Status | Resultado observado |
|---|---|---|
| TC-E051 | PASSOU | Clique no botão de lixeira abriu modal "Inativar Estabelecimento"; confirmar disparou `DELETE /estabelecimentos/{id}` (`204 No Content`); card passou a exibir badge "Inativo". |
| TC-E052 | PASSOU | Após inativação, o botão de inativar do card ficou com atributo `disabled` (confirmado no snapshot de acessibilidade); não há nenhum botão/ação de "reativar" visível na UI. |

## Regressão / fluxo completo

| TC-ID | Status | Resultado observado |
|---|---|---|
| TC-E053 | PASSOU | Cadastro completo e válido (`Clínica São Lucas`, CNPJ `98.765.432/0001-98`, endereço em São Paulo/GO) → `POST 201 Created`, modal fechou, card apareceu na listagem com todos os dados corretos (nome, CNPJ, endereço, telefone). |
| TC-E054 | **FALHOU** (parcial) | Ver seção "Bugs encontrados" — filtro de status (`ativo=true`) e filtro de UF (`uf=GO`) funcionaram corretamente; filtro de cidade (`cidade=Goiânia`) **não filtrou nada** — a resposta da API trouxe os 3 estabelecimentos, incluindo um com `cidade: "São Paulo"`, sem relação com o texto digitado. |

---

## Bugs encontrados

### BUG 1 — Telefone vazio bloqueia o cadastro apesar de ser documentado como opcional (TC-E011)

**Sintoma:** Ao deixar o campo Telefone vazio na criação de um estabelecimento, o formulário exibe o erro `"Telefone deve estar no formato (11) 3333-4444 (fixo) ou (11) 98888-7777 (celular)"` e o botão Salvar fica bloqueado (nenhum `POST` é disparado), mesmo com todos os outros campos válidos.

**Causa raiz identificada em `src/utils/validateEstabelecimento.ts`, linhas 57–62:**
```ts
const telefone = form.telefone?.trim() ?? ''
if (!isEdicao || telefone) {
  if (!TELEFONE_REGEX.test(telefone)) {
    errors.telefone = 'Telefone deve estar no formato (11) 3333-4444 (fixo) ou (11) 98888-7777 (celular)'
  }
}
```
O guard `if (!isEdicao || telefone)` é o mesmo padrão usado para campos **obrigatórios** (nome, cnpj, logradouro, etc.): na criação (`isEdicao === false`), a condição é sempre verdadeira, então a regex é testada mesmo com `telefone === ''`, e uma string vazia nunca casa com `TELEFONE_REGEX`. O campo Complemento, que é de fato opcional, usa um padrão diferente e correto (linha 87-90: `if (complemento && complemento.length > 100)` — só valida se houver valor). O Telefone deveria seguir o mesmo padrão do Complemento, não o padrão dos campos obrigatórios.

**Evidência de rede:** com telefone vazio e demais campos válidos, `browser_network_requests` mostrou apenas os 2 GETs de listagem, sem nenhum `POST /estabelecimentos` após clicar em Salvar (screenshot `tc-e011-telefone-vazio-bug.png`).

**Impacto:** usuários não conseguem cadastrar estabelecimento sem informar telefone, contrariando a intenção documentada no próprio código (seção do form rotulada "Telefone (opcional)" no test-plan) e a modelagem do tipo (`telefone?: string`).

---

### BUG 2 — E-mail vazio na edição não é bloqueado pelo front-end (TC-E019 / TC-E049)

**Sintoma:** Ao abrir a edição de um estabelecimento e apagar o e-mail, nenhum erro é exibido e o Salvar prossegue normalmente, disparando `PUT /estabelecimentos/{id}` com `"email": null` no corpo. O backend, felizmente, preserva o e-mail original na resposta — mas o front-end não protege esse campo como o restante da documentação (test-plan, comentários) afirma que deveria.

**Causa raiz identificada em `src/utils/validateEstabelecimento.ts`, linhas 64–71:**
```ts
const email = form.email?.trim() ?? ''
if (!isEdicao || email) {
  if (!email) {
    errors.email = 'E-mail é obrigatório'
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = 'E-mail inválido'
  }
}
```
O guard `if (!isEdicao || email)` para e-mail é **idêntico** ao guard usado em todos os campos que devem virar opcionais na edição (nome, cnpj, logradouro, número, bairro, cep, cidade, uf). Quando `isEdicao === true` e `email === ''`, a condição inteira é `false`, e o bloco de validação é **pulado** — exatamente o comportamento de "campo vazio = não alterar" que o restante do formulário tem. Não há nenhuma lógica especial que trate e-mail como exceção. Isso contradiz tanto o comentário do topo do arquivo quanto o comportamento descrito no test-plan (`"e-mail continua obrigatório sempre"`), e mostra que a intenção documentada não está implementada no código.

**Evidência de rede (request/response do PUT, e-mail redigido não se aplica pois não é PII sensível, mantido para evidência técnica):**
- Request body: `{"telefone":"...","email":null,"logradouro":"Av. Paulista",...}`
- Response body: `{"id":"e1ab112c-...","email":"contato@clinica.com",...}` (backend manteve o valor antigo, ignorando o `null`)

**Impacto:** o usuário não recebe nenhum feedback visual de que o e-mail é obrigatório ao editar; a única razão do dado não ser perdido é uma proteção do backend (fora do escopo deste repositório), não do formulário. Se o backend algum dia aceitar `null` para esse campo, o e-mail seria apagado silenciosamente.

**Correção sugerida (não aplicada, apenas para quem for corrigir):** remover o guard `if (!isEdicao || email)` para o campo e-mail e validar incondicionalmente, como o comentário already documenta a intenção.

---

### BUG 3 (menor) — Cidade com dígito não gera erro de formato, mensagem do plano diverge do comportamento real (TC-E040)

**Sintoma:** Digitar `Sao Paulo1` no campo Cidade não produz nenhum erro; o dígito é silenciosamente removido pela máscara e o campo fica `Sao Paulo`.

**Causa raiz em `src/pages/EstabelecimentosPage.tsx`, linha 78** (`setField`):
```ts
else if (key === 'cidade') valorTratado = formatCidade(valorTratado)
```
`formatCidade` (em `src/utils/masks.ts`, linha 19-21) remove dígitos do valor **antes** de ele chegar à validação — o mesmo padrão do campo Número (TC-E025). Isso não é necessariamente um bug funcional (o dado final salvo nunca tem números, então a regra de negócio "cidade não tem número" é respeitada), mas o resultado observado diverge do texto do test-plan, que esperava um erro de formato visível. É a mesma classe de inconsistência máscara-vs-regex já sinalizada no plano para o campo Número — vale unificar a expectativa documentada.

---

### BUG 4 — Filtro de Cidade na listagem não filtra (TC-E054)

**Sintoma:** Ao digitar `Goiânia` no campo "Filtrar por cidade…", a lista continuou trazendo os 3 estabelecimentos cadastrados, incluindo um com `cidade: "São Paulo"`, sem nenhuma relação com o texto digitado. Os filtros de status (`ativo`) e UF, testados no mesmo fluxo, funcionaram corretamente (reduziram a lista como esperado).

**Evidência de rede:** requisição `GET /v1/api/estabelecimentos?uf=GO&cidade=Goi%C3%A2nia` retornou (`200 OK`) um array com os 3 registros, incluindo:
```json
{"nome":"Clínica São Lucas","cidade":"São Paulo","uf":"GO", ...}
```

**Causa raiz:** não identificável no código deste repositório. `src/hooks/useEstabelecimentos.ts` apenas repassa o parâmetro `cidade` para a API (`estabelecimentoService.listar(filtros)` → `api.get(BASE, { params: filtros })`) sem nenhum filtro client-side adicional para UF/cidade/status (só existe filtro client-side por texto livre nome/CNPJ/cidade, campo `busca`, que é independente do campo "Filtrar por cidade…"). O filtro de cidade depende inteiramente do backend `sgsm` core (porta 8080), que está fora deste repositório (frontend). Recomenda-se investigar o endpoint `GET /estabelecimentos` do serviço `sgsm` (parâmetro `cidade`) para confirmar se ele está sendo aplicado na query.

---

## Resumo final

- **48/54 aprovados**
- **5 falhas** (TC-E011, TC-E019, TC-E040, TC-E049, TC-E054)
- **1 não-testável** (TC-E042 — UF não pode ficar "não selecionada" via UI, comportamento by-design do `<select>` sem opção em branco e `uf: 'SP'` como default)

Bugs de maior impacto: **BUG 1** (telefone opcional na prática obrigatório, bloqueia cadastro) e **BUG 2** (e-mail deveria ser sempre obrigatório na edição mas não é validado no front, protegido hoje só pelo backend). Ambos têm causa raiz confirmada em `src/utils/validateEstabelecimento.ts` e podem ser corrigidos ajustando o guard de validação dos respectivos campos, seguindo o padrão já usado corretamente no campo Complemento.
