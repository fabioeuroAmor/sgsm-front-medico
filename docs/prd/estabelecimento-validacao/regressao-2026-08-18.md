# Regressão — Test Plan Estabelecimento (Validações) — 2026-08-18

**Data/hora da execução:** 2026-08-18, ~00:52–00:59 UTC
**Executor:** Agente de QA (Playwright MCP, navegador real, sem mocks)
**Motivo:** reexecução de regressão dos 54 casos originalmente rodados em 2026-08-17
(`resultado-2026-08-17.md`, na branch `qa/estabelecimento-validacao`), para confirmar se o
comportamento se mantém — nenhum código foi alterado desde então (confirmado via
`git log`/`git status` na branch `develop`).

**Ambiente:**
- Frontend: `http://localhost:3001/estabelecimentos`
- Backend sgsm core: `http://localhost:8080` (proxy Vite `/v1/api`)
- Backend auth: `http://localhost:8081` (proxy Vite `/v1/api/auth`)
- Login: `paulo@gmail.com` / `[REDIGIDO]`
- Dados de partida: 3 estabelecimentos já cadastrados da execução anterior (`Clínica Vida
  Saudável` ativo, `Clínica São Lucas Final` ativo, `Clínica São Lucas` inativo)
- Dados novos criados nesta regressão (para não colidir com os antigos): nome `Clínica
  Regressão QA 20260818`, CNPJ `55.666.777/0009-39` (DV calculado e validado)

> Nota sobre origem dos arquivos de referência: `test-plan.md` e `resultado-2026-08-17.md`
> não estavam presentes no working tree da branch `develop` no início desta execução —
> ambos existem apenas na branch `qa/estabelecimento-validacao` (commit `22ee029b`). Foram
> lidos via `git show 22ee029b:<path>` para orientar esta regressão, sem alterar a branch
> atual.

Todos os 54 casos foram executados ao vivo contra o app real batendo no backend real (sem
mocks), via Playwright MCP. Evidências (screenshots, payloads de rede) foram coletadas
durante a execução e compiladas em `evidencias-regressao-2026-08-18.docx`.

---

## Cadastro — Campo Nome

| TC-ID | Status | Resultado observado | Divergência vs. 2026-08-17 |
|---|---|---|---|
| TC-E001 | PASSOU | Salvar com todos os campos vazios exibiu `"Nome deve ter entre 3 e 100 caracteres"` e nenhum POST foi disparado. | Nenhuma |
| TC-E002 | PASSOU | Nome = `AB` → erro mantido. | Nenhuma |
| TC-E003 | PASSOU | Nome com 101 caracteres (`len=101` confirmado via DOM) → mesmo erro de tamanho. | Nenhuma |
| TC-E004 | PASSOU | Nome válido → erro removido. | Nenhuma |

## Cadastro — Campo CNPJ

| TC-ID | Status | Resultado observado | Divergência |
|---|---|---|---|
| TC-E005 | PASSOU | `11222333000181` → exibe `11.222.333/0001-81`. | Nenhuma |
| TC-E006 | PASSOU | `11.222.333/0001-00` (DV inválido) → `"CNPJ contém um número de CNPJ inválido"`. | Nenhuma |
| TC-E007 | PASSOU | CNPJ com DV válido → sem erro. | Nenhuma |
| TC-E008 | PASSOU | CNPJ vazio → `"CNPJ deve estar no formato 12.345.678/0001-90"`. | Nenhuma |
| TC-E009 | PASSOU | CNPJ incompleto (12 dígitos) → erro de formato. | Nenhuma |
| TC-E010 | PASSOU | Abrir Editar → campo CNPJ `disabled`, valor formatado `55.666.777/0009-39`. | Nenhuma |

## Cadastro — Campo Telefone (opcional)

| TC-ID | Status | Resultado observado | Divergência |
|---|---|---|---|
| TC-E011 | **FALHOU** | BUG 1 reproduz — telefone vazio + demais campos válidos → erro de formato exibido e Salvar bloqueado (confirmado: apenas 2 GETs de listagem na rede, nenhum POST disparado). | Nenhuma — reproduz idêntico |
| TC-E012 | PASSOU | `11987654321` → `(11) 98765-4321`. | Nenhuma |
| TC-E013 | PASSOU | `1133334444` → `(11) 3333-4444`, sem erro. | Nenhuma |
| TC-E014 | PASSOU | `119999` → erro de formato. | Nenhuma |

## Cadastro — Campo E-mail (obrigatório inclusive na edição)

| TC-ID | Status | Resultado observado | Divergência |
|---|---|---|---|
| TC-E015 | PASSOU | E-mail vazio → `"E-mail é obrigatório"`. | Nenhuma |
| TC-E016 | PASSOU | `contatoclinica.com` (sem `@`) → `"E-mail inválido"`. | Nenhuma |
| TC-E017 | PASSOU | `usuario@` (sem domínio) → `"E-mail inválido"`. | Nenhuma |
| TC-E018 | PASSOU | E-mail válido → sem erro. | Nenhuma |
| TC-E019 | **FALHOU** | BUG 2 reproduz — e-mail apagado em edição não gera erro; PUT disparado com `"email": null`; backend preservou o valor original na resposta. | Nenhuma — reproduz idêntico |

## Cadastro — Endereço: Logradouro

| TC-ID | Status | Resultado observado | Divergência |
|---|---|---|---|
| TC-E020 | PASSOU | Logradouro vazio → erro de tamanho/obrigatoriedade. | Nenhuma |
| TC-E021 | PASSOU | `Av` (2 chars) → erro de tamanho mínimo. | Nenhuma |
| TC-E022 | PASSOU | `Av Paulista @#` → erro de formato (caracteres não permitidos). | Nenhuma |
| TC-E023 | PASSOU | `Av. Paulista` → sem erro. | Nenhuma |

## Cadastro — Endereço: Número

| TC-ID | Status | Resultado observado | Divergência |
|---|---|---|---|
| TC-E024 | PASSOU | Número vazio → `"Número deve conter apenas dígitos (ex: 123)"`. | Nenhuma |
| TC-E025 | PASSOU (comportamento observado) | Digitar `abc` → filtrado no `onChange`, campo permanece vazio, mesmo erro de campo vazio. | Nenhuma |
| TC-E026 | PASSOU | `1578` → sem erro. | Nenhuma |

## Cadastro — Endereço: Complemento (opcional)

| TC-ID | Status | Resultado observado | Divergência |
|---|---|---|---|
| TC-E027 | PASSOU | Complemento vazio → sem erro. | Nenhuma |
| TC-E028 | PASSOU | 101 caracteres (`len=101` confirmado) → `"Complemento deve ter no máximo 100 caracteres"`. | Nenhuma |
| TC-E029 | PASSOU | `Sala 12` → sem erro. | Nenhuma |

## Cadastro — Endereço: Bairro

| TC-ID | Status | Resultado observado | Divergência |
|---|---|---|---|
| TC-E030 | PASSOU | Bairro vazio → erro de obrigatoriedade/tamanho. | Nenhuma |
| TC-E031 | PASSOU | `J` (1 char) → erro de tamanho mínimo. | Nenhuma |
| TC-E032 | PASSOU | `Jardins123` → erro de formato (número não permitido, sem mask de filtro). | Nenhuma |
| TC-E033 | PASSOU | `Jardins` → sem erro. | Nenhuma |

## Cadastro — Endereço: CEP (sem integração ViaCEP)

| TC-ID | Status | Resultado observado | Divergência |
|---|---|---|---|
| TC-E034 | PASSOU | CEP vazio → `"CEP deve estar no formato 12345-678"`. | Nenhuma |
| TC-E035 | PASSOU | `01310100` → `01310-100`. | Nenhuma |
| TC-E036 | PASSOU | `01310` (incompleto) → erro de formato. | Nenhuma |
| TC-E037 | PASSOU | CEP válido → sem erro; `browser_network_requests` (inclusive com `static: true`) confirmou **zero** requisições a `viacep`; logradouro/bairro/cidade permaneceram inalterados. | Nenhuma |

## Cadastro — Endereço: Cidade

| TC-ID | Status | Resultado observado | Divergência |
|---|---|---|---|
| TC-E038 | PASSOU | Cidade vazia → erro de tamanho/obrigatoriedade. | Nenhuma |
| TC-E039 | PASSOU | `S` (1 char) → erro de tamanho mínimo. | Nenhuma |
| TC-E040 | **FALHOU** | BUG 3 reproduz — `Sao Paulo1` resulta em `Sao Paulo` (dígito filtrado silenciosamente por `formatCidade`), nenhum erro exibido. | Nenhuma — reproduz idêntico |
| TC-E041 | PASSOU | `São Paulo` → sem erro. | Nenhuma |

## Cadastro — Campo UF (dropdown fixo)

| TC-ID | Status | Resultado observado | Divergência |
|---|---|---|---|
| TC-E042 | **NÃO-TESTÁVEL** | Confirmado via snapshot: `<select>` de UF não tem opção em branco, `emptyForm` já define `uf: 'SP'` como padrão. Não existe caminho de UI para deixar UF "não selecionada" — comportamento by-design, não é bug. | Nenhuma |
| TC-E043 | PASSOU | Selecionar `GO` → aplicado, sem erro. | Nenhuma |

## Comportamento geral no Salvar

| TC-ID | Status | Resultado observado | Divergência |
|---|---|---|---|
| TC-E044 | PASSOU | Todos os campos vazios + Salvar → todos os erros (nome, cnpj, telefone, email, logradouro, número, bairro, cep, cidade) exibidos simultaneamente. | Nenhuma |
| TC-E045 | PASSOU | Confirmado repetidamente ao longo da execução (CNPJ, Nome, Cidade, Telefone, Logradouro, Bairro, CEP, E-mail): erro some assim que o valor passa a satisfazer a regra. | Nenhuma |
| TC-E046 | PASSOU | Duplo clique em Salvar com formulário válido → apenas 1 `POST /estabelecimentos` (`201 Created`) na rede; sem cadastro duplicado. | Nenhuma |

## Edição de estabelecimento

| TC-ID | Status | Resultado observado | Divergência |
|---|---|---|---|
| TC-E047 | PASSOU | Reforça TC-E010: CNPJ `disabled`, valor formatado ao abrir Editar. | Nenhuma |
| TC-E048 | PASSOU | Nome apagado em edição → nenhum erro exibido; Salvar → PUT disparado sem o campo `nome` no payload (removido pelo `JSON.stringify`), nome original preservado na resposta. | Nenhuma |
| TC-E049 | **FALHOU** | BUG 2 reproduz (mesmo de TC-E019): e-mail apagado em edição não gera erro nem bloqueia Salvar; PUT com `"email": null`; backend preservou `"email":"contato@clinicaregressao.com"` na resposta. | Nenhuma — reproduz idêntico |
| TC-E050 | PASSOU | Telefone alterado para `(11) 98765-1234` → `PUT /estabelecimentos/{id}` (`200 OK`) com payload correto; resposta confirma telefone atualizado e demais campos preservados. | Nenhuma |

## Inativação (soft delete)

| TC-ID | Status | Resultado observado | Divergência |
|---|---|---|---|
| TC-E051 | PASSOU | Clique no botão de inativar abriu modal "Inativar Estabelecimento"; confirmar disparou `DELETE /estabelecimentos/{id}` (`204 No Content`); card passou a exibir badge "Inativo". | Nenhuma |
| TC-E052 | PASSOU | Após inativação, botão de inativar do card ficou `disabled`; nenhuma ação de reativar visível na UI. | Nenhuma |

## Regressão / fluxo completo

| TC-ID | Status | Resultado observado | Divergência |
|---|---|---|---|
| TC-E053 | PASSOU | Cadastro completo e válido (`Clínica Regressão QA 20260818`, CNPJ `55.666.777/0009-39`, endereço em São Paulo/GO) → `POST 201 Created`, modal fechou, card apareceu na listagem com todos os dados corretos. | Nenhuma |
| TC-E054 | **FALHOU** (parcial) | BUG 4 reproduz — filtro de status (`ativo=true`) e filtro de UF (`uf=GO`) funcionaram corretamente (reduziram a lista); filtro de cidade (`cidade=Goiânia`) **não filtrou**: resposta trouxe as 2 estabelecimentos ativos em GO, incluindo `"Clínica São Lucas Final"` cuja cidade cadastrada é `"Goiania"` (grafia diferente da buscada), confirmando que o parâmetro `cidade` não é aplicado como filtro real no backend. | Nenhuma — reproduz idêntico |

---

## Bugs — status na regressão

| Bug | Casos | Status em 2026-08-17 | Status na regressão (2026-08-18) |
|---|---|---|---|
| **BUG 1** — Telefone vazio bloqueia o cadastro apesar de opcional | TC-E011 | FALHOU | **REPRODUZIU IGUAL** — telefone vazio + demais campos válidos continua exibindo erro de formato e bloqueando o Salvar (0 POST disparado). Causa raiz confirmada no código atual: `src/utils/validateEstabelecimento.ts` linhas 57-62 ainda usa o guard `if (!isEdicao \|\| telefone)`, idêntico ao padrão de campo obrigatório, sem seguir o padrão correto do Complemento (linha 88). |
| **BUG 2** — E-mail vazio na edição não é bloqueado pelo front-end | TC-E019 / TC-E049 | FALHOU | **REPRODUZIU IGUAL** — apagar e-mail em edição não exibe erro nem bloqueia Salvar; PUT disparado com `"email": null`; backend preserva o valor antigo. Causa raiz confirmada: linhas 64-71 do mesmo arquivo, guard `if (!isEdicao \|\| email)` idêntico ao dos campos opcionais-na-edição, sem tratar e-mail como exceção. |
| **BUG 3** (menor) — Cidade com dígito não gera erro de formato | TC-E040 | FALHOU | **REPRODUZIU IGUAL** — `Sao Paulo1` vira `Sao Paulo` silenciosamente (dígito removido por `formatCidade` antes da validação), nenhum erro exibido, divergindo da expectativa textual do plano. |
| **BUG 4** — Filtro de Cidade na listagem não filtra | TC-E054 | FALHOU (parcial) | **REPRODUZIU IGUAL** — filtro de UF/status funcionam, filtro de cidade não restringe os resultados; comportamento depende do backend `sgsm` core (fora deste repositório), consistente com a causa raiz já identificada (`useEstabelecimentos.ts` apenas repassa o parâmetro `cidade` para a API, sem lógica adicional no front). |

Nenhum dos 4 bugs mudou de comportamento ou foi corrigido — todos reproduziram de forma
idêntica à execução de 2026-08-17, consistente com a confirmação prévia de que nenhum
código foi alterado entre as duas execuções (branch `develop` sem commits novos em
`src/utils/validateEstabelecimento.ts`, `src/pages/EstabelecimentosPage.tsx`,
`src/utils/masks.ts` ou `src/hooks/useEstabelecimentos.ts` desde 2026-08-17).

---

## Resumo final

- **48/54 aprovados**
- **5 falhas** (TC-E011, TC-E019, TC-E040, TC-E049, TC-E054)
- **1 não-testável** (TC-E042 — comportamento by-design do `<select>` de UF)

Resultado idêntico ao da execução de 2026-08-17: mesma contagem, mesmos casos com falha,
mesmo caso não-testável. Os 4 bugs documentados em `erros-2026-08-17.docx` continuam
presentes e sem correção.
