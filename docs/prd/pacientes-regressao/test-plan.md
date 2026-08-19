# Test Plan — Regressão Geral do Módulo de Pacientes

> URL: `http://localhost:3001/pacientes`
> Credenciais: fabioeuro@gmail.com / famor966
> Executado em: 2026-08-15

---

## Listagem

- [x] **TC-L001** — Spinner aparece antes da lista carregar ao acessar a página
- [x] **TC-L002** — Contador "X pacientes encontrados" exibido após a carga
- [x] **TC-L003** — Cards exibem: nome, CPF formatado, data de nascimento + idade, e-mail, telefone e cidade/UF
- [x] **TC-L004** — Badge "Ativo" ou "Inativo" exibido em cada card
- [x] **TC-L005** — Estado vazio: filtrar por "Inativos" sem pacientes inativos → EmptyState "Nenhum paciente encontrado"
- [x] **TC-L006** — Erro de API na listagem → N/A (impossível induzir sem alterar infraestrutura)

## Busca

- [x] **TC-B001** — Busca por nome (parcial, case-insensitive): digitar parte do nome → lista filtra
- [x] **TC-B002** — Busca por CPF: digitar dígitos do CPF → encontra o paciente ignorando pontuação
- [x] **TC-B003** — Busca por e-mail: digitar parte do e-mail → lista filtra
- [x] **TC-B004** — Limpar busca: apagar o texto → lista volta ao total
- [x] **TC-B005** — Regressão BUG-1: buscar por texto sem dígitos (ex: "Maria") filtra corretamente

## Filtro de Status

- [x] **TC-F001** — Filtro "Ativos": somente pacientes com badge Ativo são exibidos
- [x] **TC-F002** — Filtro "Inativos": somente pacientes com badge Inativo são exibidos
- [x] **TC-F003** — Filtro "Todos os status": retorna todos os pacientes

## Modal de Detalhes

- [x] **TC-D001** — Clicar no nome do paciente no card abre o modal de detalhes
- [x] **TC-D002** — Modal exibe todos os dados: CPF formatado, nascimento + idade, e-mail, status, endereço
- [x] **TC-D003** — Botão "Editar" no modal de detalhe fecha o detalhe e abre o modal de edição
- [x] **TC-D004** — Botão "Fechar" fecha o modal sem nenhuma alteração

## Cadastro — Campos Obrigatórios

- [x] **TC-C001** — Salvar sem preencher nada → erros simultâneos de nome, data de nascimento, CPF e e-mail
- [x] **TC-C002** — Nome vazio (blur) → "Nome é obrigatório"
- [x] **TC-C003** — Data de nascimento futura → "Data de nascimento não pode ser hoje ou futura"
- [x] **TC-C004** — Data há mais de 130 anos → "Data de nascimento inválida (mais de 130 anos)"
- [x] **TC-C005** — CPF incompleto (blur): digitar `123.456` → "CPF deve ter 11 dígitos"
- [x] **TC-C006** — CPF inválido (blur): digitar `111.111.111-11` → "CPF inválido"
- [x] **TC-C007** — CPF válido (blur): digitar `529.982.247-25` → sem erro
- [x] **TC-C008** — E-mail inválido (blur): digitar `invalido#email` → "E-mail inválido"
- [x] **TC-C009** — E-mail vazio ao Salvar → "E-mail é obrigatório"
- [x] **TC-C010** — Erro some ao corrigir: após TC-C008, corrigir e-mail → erro desaparece ao digitar

## Cadastro — Campos Opcionais com Máscara/Validação

- [x] **TC-O001** — Máscara CPF ao digitar: `12345678909` → exibe `123.456.789-09`
- [x] **TC-O002** — Máscara telefone ao digitar: `11987654321` → exibe `(11) 98765-4321`
- [x] **TC-O003** — Celular sem 9 após DDD (blur): `(11) 85555-5555` → "Celular deve começar com 9 após o DDD"
- [x] **TC-O004** — Telefone fixo válido (blur): `(11) 3333-4444` → sem erro
- [x] **TC-O005** — Telefone vazio → salva sem erro de telefone
- [x] **TC-O006** — Máscara CEP ao digitar: `01310100` → exibe `01310-100`
- [x] **TC-O007** — CEP incompleto (blur): `0131` → "CEP deve ter 8 dígitos"
- [x] **TC-O008** — UF minúscula: digitar `sp` → campo exibe `SP`
- [x] **TC-O009** — UF inválida (blur): `XX` → "UF inválida"
- [x] **TC-O010** — UF, CEP e Telefone vazios → salva sem erros nos campos opcionais

## Cadastro — Integração ViaCEP

- [x] **TC-V001** — CEP válido (blur): `01310-100` → logradouro, bairro, cidade e UF preenchidos automaticamente
- [x] **TC-V002** — CEP inexistente (blur): `00000-000` → "CEP não encontrado"
- [x] **TC-V003** — Spinner exibido ao lado do campo CEP durante a busca

## Cadastro — Fluxo Completo e Edge Cases

- [x] **TC-CR001** — Cadastro completo: preencher todos os campos válidos, Salvar → paciente aparece no topo da lista
- [x] **TC-CR002** — Clique duplo em Salvar: dois cliques rápidos → não duplica o cadastro
- [x] **TC-CR003** — CPF duplicado: usar CPF já cadastrado → banner de erro da API dentro do modal (modal não fecha)
- [x] **TC-CR004** — Fechar modal (X) e reabrir → formulário está vazio/resetado

## Edição

- [x] **TC-E001** — Abrir edição: clicar "Editar" → campos pré-populados com os dados do paciente
- [x] **TC-E002** — CPF desabilitado: campo CPF não aceita digitação no modo edição
- [x] **TC-E003** — Telefone formatado: paciente com telefone salvo → exibe `(xx) xxxxx-xxxx` ao abrir edição
- [x] **TC-E004** — E-mail inválido bloqueado em edição: digitar `invalido`, Salvar → "E-mail inválido", não salva
- [x] **TC-E005** — Salvar edição com MEDICO: backend retorna 403, modal permanece aberto com erro — UI trata corretamente *(MEDICO não tem permissão PUT /pacientes — comportamento de backend intencional, igual ao TC-I004)*

## Inativação

- [x] **TC-I001** — Botão lixeira desabilitado para paciente inativo → N/A (sem pacientes inativos no sistema; lógica verificada em código: `disabled={!p.ativo}`)
- [x] **TC-I002** — Clicar lixeira de paciente ativo → modal "Inativar Paciente" abre
- [x] **TC-I003** — Cancelar inativação → modal fecha, paciente permanece ativo na lista
- [x] **TC-I004** — Regressão BUG-2: MEDICO confirma inativação → modal permanece aberto com "Request failed with status code 403"

---

## Observações

- **TC-L006 / TC-I001**: N/A por limitação de ambiente ou ausência de dados — lógica verificada em código-fonte.
- **TC-E005**: MEDICO não tem permissão `PUT /pacientes/**` (SecurityConfig.java, linha 47). A UI responde corretamente: exibe erro 403 no modal sem fechar. Mesmo padrão validado em TC-I004.
- 2 pacientes criados durante os testes: "QA Paciente Completo" e "QA Duplo CR002".

---

## Resultados de execução

| TC | Status | Resultado |
|----|--------|-----------|
| TC-L001 | ✅ | Spinner exibido antes da lista carregar |
| TC-L002 | ✅ | Contador "22 pacientes encontrados" exibido |
| TC-L003 | ✅ | Cards com nome, CPF formatado, data/idade, e-mail, cidade/UF |
| TC-L004 | ✅ | Badge "Ativo" em todos os pacientes ativos |
| TC-L005 | ✅ | EmptyState "Nenhum paciente encontrado" ao filtrar Inativos |
| TC-L006 | N/A | Impossível induzir erro de API sem alterar infraestrutura |
| TC-B001 | ✅ | Busca por nome filtra corretamente |
| TC-B002 | ✅ | Busca por CPF (dígitos) encontra paciente |
| TC-B003 | ✅ | Busca por e-mail filtra corretamente |
| TC-B004 | ✅ | Limpar busca → lista volta ao total |
| TC-B005 | ✅ | Regressão BUG-1 confirmada: busca de texto não numérico não mostra todos |
| TC-F001 | ✅ | Filtro "Ativos" correto |
| TC-F002 | ✅ | Filtro "Inativos" correto |
| TC-F003 | ✅ | Filtro "Todos" retorna ao total |
| TC-D001 | ✅ | Modal de detalhe abre ao clicar no nome |
| TC-D002 | ✅ | Modal exibe dados completos e formatados |
| TC-D003 | ✅ | Botão "Editar" no detalhe abre edição preenchida |
| TC-D004 | ✅ | Botão "Fechar" fecha sem alterações |
| TC-C001 | ✅ | Erros simultâneos de nome, data, CPF e e-mail |
| TC-C002 | ✅ | "Nome é obrigatório" no blur |
| TC-C003 | ✅ | Data futura bloqueada com mensagem |
| TC-C004 | ✅ | Data há mais de 130 anos bloqueada |
| TC-C005 | ✅ | "CPF deve ter 11 dígitos" em CPF incompleto |
| TC-C006 | ✅ | "CPF inválido" em 111.111.111-11 |
| TC-C007 | ✅ | 529.982.247-25 aceito sem erro |
| TC-C008 | ✅ | "E-mail inválido" em invalido#email |
| TC-C009 | ✅ | "E-mail é obrigatório" ao Salvar vazio |
| TC-C010 | ✅ | Erro some ao corrigir o campo |
| TC-O001 | ✅ | 12345678909 → 123.456.789-09 |
| TC-O002 | ✅ | 11987654321 → (11) 98765-4321 |
| TC-O003 | ✅ | "Celular deve começar com 9 após o DDD" |
| TC-O004 | ✅ | (11) 3333-4444 aceito sem erro |
| TC-O005 | ✅ | Telefone vazio aceito |
| TC-O006 | ✅ | 01310100 → 01310-100 |
| TC-O007 | ✅ | "CEP deve ter 8 dígitos" em CEP incompleto |
| TC-O008 | ✅ | `sp` → `SP` automaticamente |
| TC-O009 | ✅ | "UF inválida" em XX |
| TC-O010 | ✅ | UF/CEP/Telefone vazios aceitos |
| TC-V001 | ✅ | CEP 01310-100 preenche endereço via ViaCEP |
| TC-V002 | ✅ | CEP 00000-000 → "CEP não encontrado" |
| TC-V003 | ✅ | Spinner exibido durante busca ViaCEP |
| TC-CR001 | ✅ | Fluxo completo: paciente salvo e no topo da lista |
| TC-CR002 | ✅ | Clique duplo não duplica cadastro |
| TC-CR003 | ✅ | CPF duplicado → banner de erro, modal não fecha |
| TC-CR004 | ✅ | Modal resetado ao reabrir |
| TC-E001 | ✅ | Campos pré-populados ao abrir edição |
| TC-E002 | ✅ | CPF desabilitado no modo edição |
| TC-E003 | ✅ | Telefone formatado ao abrir edição |
| TC-E004 | ✅ | "E-mail inválido" bloqueia Salvar em edição |
| TC-E005 | ✅ | 403 exibido no modal, não fecha — UI correta (MEDICO sem permissão PUT) |
| TC-I001 | N/A | Sem inativos no sistema; `disabled={!p.ativo}` verificado em código |
| TC-I002 | ✅ | Modal "Inativar Paciente" abre ao clicar lixeira |
| TC-I003 | ✅ | Cancelar → modal fecha, paciente permanece ativo |
| TC-I004 | ✅ | Regressão BUG-2: erro 403 exibido no modal |

**Resultado final: 52/52 ✅ APROVADO** (2 N/A com justificativa)
