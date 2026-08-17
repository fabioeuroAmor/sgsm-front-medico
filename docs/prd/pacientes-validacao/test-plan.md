# Test Plan — Validações CPF, E-mail, Telefone, CEP, Número e UF (PacientesPage)

> URL: `http://localhost:3001/pacientes`
> Credenciais: fabioeuro@gmail.com / famor966
> Executado em: 2026-08-14

---

## Cadastro — Campo CPF

- [x] **TC-P001** — Máscara CPF: digitar `12345678909` → exibe `123.456.789-09`
- [x] **TC-P002** — CPF com todos dígitos iguais (blur): digitar `111.111.111-11` → "CPF inválido"
- [x] **TC-P003** — CPF com menos de 11 dígitos (blur): digitar `123.456` → "CPF deve ter 11 dígitos"
- [x] **TC-P004** — CPF válido aceito (blur): digitar `529.982.247-25` → sem erro
- [x] **TC-P005** — CPF obrigatório (Salvar): deixar CPF vazio → "CPF deve ter 11 dígitos"
- [x] **TC-P006** — CPF desabilitado em edição: abrir Editar → campo CPF não editável

## Cadastro — Campo E-mail

- [x] **TC-P007** — E-mail sem arroba (blur): digitar `usuarioemail.com` → "E-mail inválido"
- [x] **TC-P008** — E-mail sem domínio (blur): digitar `usuario@` → "E-mail inválido"
- [x] **TC-P009** — E-mail sem TLD (blur): digitar `usuario@dominio` → "E-mail inválido"
- [x] **TC-P010** — E-mail válido aceito (blur): digitar `maria@clinica.com` → sem erro
- [x] **TC-P011** — E-mail obrigatório (Salvar): deixar vazio → "E-mail é obrigatório"

## Cadastro — Campo Telefone

- [x] **TC-P012** — Máscara telefone: digitar `11987654321` → exibe `(11) 98765-4321`
- [x] **TC-P013** — Telefone com menos de 10 dígitos (blur): digitar `(11) 9876` → "Telefone deve ter DDD + 8 ou 9 dígitos"
- [x] **TC-P014** — Celular sem 9 após DDD (blur): digitar `(11) 85555-5555` → "Celular deve começar com 9 após o DDD"
- [x] **TC-P015** — Telefone fixo válido (blur): digitar `(11) 3333-4444` → sem erro
- [x] **TC-P016** — Telefone opcional: deixar vazio, preencher restante corretamente → salva sem erro de telefone

## Cadastro — Campo CEP

- [x] **TC-P017** — Máscara CEP: digitar `01310100` → exibe `01310-100`
- [x] **TC-P018** — CEP incompleto (blur): digitar `0131` → "CEP deve ter 8 dígitos"
- [x] **TC-P019** — CEP válido preenche endereço: digitar `01310-100` e sair do campo → campos preenchidos via ViaCEP
- [x] **TC-P020** — CEP inexistente (blur): digitar `00000-000` → "CEP não encontrado"
- [x] **TC-P021** — CEP opcional: deixar vazio → salva sem erro de CEP

## Cadastro — Campo UF

- [x] **TC-P022** — UF inválida (blur): digitar `XX` → "UF inválida"
- [x] **TC-P023** — UF convertida para maiúsculas: digitar `sp` → exibe `SP`
- [x] **TC-P024** — UF válida aceita (blur): digitar `SP` → sem erro
- [x] **TC-P025** — UF opcional: deixar vazio → salva sem erro de UF

## Comportamento geral no Salvar

- [x] **TC-P026** — Erros simultâneos: deixar campos obrigatórios vazios, clicar Salvar → erros de nome, data nasc, CPF e e-mail simultâneos
- [x] **TC-P027** — Erro some ao corrigir: após e-mail inválido, corrigir → erro desaparece ao digitar
- [x] **TC-P028** — Clique duplo em Salvar: clicar Salvar duas vezes → não duplica o cadastro

## Edição de paciente

- [x] **TC-P029** — CPF formatado e desabilitado em edição: campo CPF não editável e formatado
- [x] **TC-P030** — Telefone formatado em edição: telefone exibe `(xx) xxxxx-xxxx`
- [x] **TC-P031** — E-mail inválido bloqueado em edição: digitar `invalido`, Salvar → "E-mail inválido"

## Regressão

- [x] **TC-P032** — Fluxo completo válido: cadastrar com todos os campos → paciente aparece na lista
- [x] **TC-P033** — Busca na listagem: buscar por nome → lista filtra corretamente *(bug corrigido: filtro CPF com busca vazia retornava true para todos)*
- [x] **TC-P034** — Inativar paciente sem permissão (MEDICO): confirmar inativação → modal permanece aberto com mensagem de erro 403 *(bug corrigido: ausência de try/catch causava falha silenciosa)*

---

## Bugs encontrados e corrigidos

### BUG-1 — Busca por nome/e-mail não filtrava (TC-P033)
**Causa**: `p.cpf.includes(busca.replace(/\D/g,''))` retornava `true` para toda busca sem dígitos (ex: "QA"), pois `"".includes("")` é sempre `true`.
**Correção**: Condição CPF só é avaliada quando `busca` contém dígitos.

```js
// antes
p.cpf.replace(/\D/g, '').includes(busca.replace(/\D/g, ''))

// depois
const cpfDigits = busca.replace(/\D/g, '')
cpfDigits.length > 0 && p.cpf.replace(/\D/g, '').includes(cpfDigits)
```

### BUG-2 — Inativação com 403 fechava o modal silenciosamente (TC-P034)
**Causa**: Sem `try/catch` no botão de confirmação. Se o backend retornava 403 (MEDICO não tem permissão para DELETE), a exception propagava sem tratamento e o modal fechava sem feedback.
**Correção**: Adicionado `try/catch` + estado `erroInativacao` que exibe a mensagem de erro dentro do modal.

---

## Resultados de execução

| TC | Status | Resultado |
|----|--------|-----------|
| TC-P001 | ✅ | `12345678909` → `123.456.789-09` |
| TC-P002 | ✅ | "CPF inválido" em `111.111.111-11` |
| TC-P003 | ✅ | "CPF deve ter 11 dígitos" em CPF incompleto |
| TC-P004 | ✅ | `529.982.247-25` aceito sem erro |
| TC-P005 | ✅ | "CPF deve ter 11 dígitos" ao Salvar com campo vazio |
| TC-P006 | ✅ | Campo CPF desabilitado no modo edição |
| TC-P007 | ✅ | "E-mail inválido" em `usuarioemail.com` |
| TC-P008 | ✅ | "E-mail inválido" em `usuario@` |
| TC-P009 | ✅ | "E-mail inválido" em `usuario@dominio` |
| TC-P010 | ✅ | `maria@clinica.com` aceito sem erro |
| TC-P011 | ✅ | "E-mail é obrigatório" ao Salvar com campo vazio |
| TC-P012 | ✅ | `11987654321` → `(11) 98765-4321` |
| TC-P013 | ✅ | "Telefone deve ter DDD + 8 ou 9 dígitos" |
| TC-P014 | ✅ | "Celular deve começar com 9 após o DDD" |
| TC-P015 | ✅ | `(11) 3333-4444` aceito sem erro |
| TC-P016 | ✅ | Telefone vazio aceito — campo opcional |
| TC-P017 | ✅ | `01310100` → `01310-100` |
| TC-P018 | ✅ | "CEP deve ter 8 dígitos" em CEP incompleto |
| TC-P019 | ✅ | ViaCEP preenche logradouro, bairro, cidade e UF |
| TC-P020 | ✅ | "CEP não encontrado" em `00000-000` |
| TC-P021 | ✅ | CEP vazio aceito — campo opcional |
| TC-P022 | ✅ | "UF inválida" em `XX` |
| TC-P023 | ✅ | `sp` → `SP` automaticamente |
| TC-P024 | ✅ | `SP` aceito sem erro |
| TC-P025 | ✅ | UF vazia aceita — campo opcional |
| TC-P026 | ✅ | Erros simultâneos ao Salvar com campos obrigatórios vazios |
| TC-P027 | ✅ | Erro some ao corrigir o campo |
| TC-P028 | ✅ | Clique duplo não duplica cadastro |
| TC-P029 | ✅ | CPF formatado e desabilitado em edição |
| TC-P030 | ✅ | Telefone formatado em edição |
| TC-P031 | ✅ | "E-mail inválido" bloqueia Salvar em edição |
| TC-P032 | ✅ | Fluxo completo: paciente salvo e listado |
| TC-P033 | ✅ | Busca por nome filtra corretamente após correção de bug |
| TC-P034 | ✅ | Erro 403 exibido no modal ao tentar inativar sem permissão |

**Resultado final: 34/34 ✅ APROVADO** (2 bugs corrigidos durante a execução)
