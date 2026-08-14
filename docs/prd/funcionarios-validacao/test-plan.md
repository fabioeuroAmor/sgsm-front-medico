# Test Plan — Validações CPF, E-mail e Telefone (FuncionariosPage)

> URL: `http://localhost:3001/funcionarios`  
> Credenciais de teste: fabioeuro@gmail.com (MEDICO)
> Executado em: 2026-08-14

---

## Cadastro — Campo CPF

- [x] **TC-001** — Máscara CPF: digitar `12345678909` → exibe `123.456.789-09`
- [x] **TC-002** — CPF inválido (blur): digitar `888.888.888-88`, clicar fora → borda vermelha + "CPF inválido"
- [x] **TC-003** — CPF válido (blur): digitar `529.982.247-25`, clicar fora → sem erro
- [x] **TC-004** — CPF obrigatório (Salvar): deixar CPF vazio, clicar Salvar → "CPF obrigatório"

## Cadastro — Campo E-mail

- [x] **TC-005** — E-mail inválido (blur): digitar `DDDD#DDDD`, clicar fora → "E-mail inválido"
- [x] **TC-006** — E-mail sem domínio (blur): digitar `usuario@`, clicar fora → "E-mail inválido"
- [x] **TC-007** — E-mail válido (blur): digitar `maria@clinica.com`, clicar fora → sem erro
- [x] **TC-008** — E-mail obrigatório (Salvar): deixar vazio, clicar Salvar → "E-mail obrigatório"

## Cadastro — Campo Telefone

- [x] **TC-009** — Máscara telefone: digitar `11987654321` → exibe `(11) 98765-4321`
- [x] **TC-010** — DDD inválido (blur): digitar `(00) 98765-4321`, clicar fora → "Use o formato (11) 99999-0000"
- [x] **TC-011** — Dígitos repetidos (blur): digitar `(55) 55555-5555`, clicar fora → erro
- [x] **TC-012** — Celular sem 9 (blur): digitar `(11) 85555-5555`, clicar fora → erro
- [x] **TC-013** — Fixo válido (blur): digitar `(11) 3333-4444`, clicar fora → sem erro
- [x] **TC-014** — Telefone opcional: deixar vazio, preencher restante correto, Salvar → salva sem erro

## Comportamento geral no Salvar

- [x] **TC-015** — Erros simultâneos: CPF inválido + e-mail inválido + clicar Salvar → todos os erros aparecem ao mesmo tempo
- [x] **TC-016** — Erro some ao corrigir: após TC-005, corrigir e-mail → erro some ao digitar

## Edição de funcionário

- [x] **TC-017** — CPF formatado e desabilitado: abrir Editar → CPF exibe `478.125.496-27`, campo não editável
- [x] **TC-018** — Telefone formatado: abrir Editar (Zenilda) → telefone exibe `(61) 99104-2778`
- [x] **TC-019** — E-mail inválido bloqueado: em edição, trocar e-mail por `invalido`, Salvar → bloqueia com "E-mail inválido"

## Regressão

- [x] **TC-020** — Fluxo completo válido: preencher todos os campos corretos (CPF gerado, e-mail, telefone, estabelecimento), Salvar → "Dr. Regressão TC20" aparece na lista

---

## Resultados de execução

| TC | Status | Resultado |
|----|--------|-----------|
| TC-001 | ✅ | `12345678909` → `123.456.789-09` |
| TC-002 | ✅ | "CPF inválido" ao blur em `888.888.888-88` |
| TC-003 | ✅ | `529.982.247-25` aceito sem erro |
| TC-004 | ✅ | "CPF obrigatório" ao Salvar com CPF vazio |
| TC-005 | ✅ | "E-mail inválido" ao blur em `DDDD#DDDD` |
| TC-006 | ✅ | "E-mail inválido" ao blur em `usuario@` |
| TC-007 | ✅ | `maria@clinica.com` aceito sem erro |
| TC-008 | ✅ | "E-mail obrigatório" ao Salvar com campo vazio |
| TC-009 | ✅ | `11987654321` → `(11) 98765-4321` |
| TC-010 | ✅ | "Use o formato (11) 99999-0000" com DDD `00` |
| TC-011 | ✅ | "Use o formato (11) 99999-0000" em `(55) 55555-5555` |
| TC-012 | ✅ | "Use o formato (11) 99999-0000" em `(11) 85555-5555` |
| TC-013 | ✅ | `(11) 3333-4444` aceito sem erro (fixo válido) |
| TC-014 | ✅ | Telefone vazio aceito — campo opcional confirmado |
| TC-015 | ✅ | "CPF inválido" + "E-mail inválido" simultâneos ao Salvar |
| TC-016 | ✅ | "E-mail inválido" sumiu imediatamente ao corrigir |
| TC-017 | ✅ | CPF `478.125.496-27` formatado e desabilitado na edição |
| TC-018 | ✅ | Telefone `(61) 99104-2778` formatado ao abrir edição |
| TC-019 | ✅ | "E-mail inválido" bloqueia Salvar no modo edição |
| TC-020 | ✅ | Fluxo completo: "Dr. Regressão TC20" salvo e listado |

**Resultado final: 20/20 ✅ APROVADO**
