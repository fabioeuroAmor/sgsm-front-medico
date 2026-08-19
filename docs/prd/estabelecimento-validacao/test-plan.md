# Test Plan — Validações Nome, CNPJ, Telefone, E-mail, Endereço e UF (EstabelecimentosPage)

> URL: `http://localhost:3001/estabelecimentos`
> Fonte: `src/pages/EstabelecimentosPage.tsx`, `src/utils/validateEstabelecimento.ts`, `src/utils/masks.ts`, `src/services/estabelecimentoService.ts`
> Criado em: 2026-08-17 (ainda não executado)

---

## Cadastro — Campo Nome

- [ ] **TC-E001** — Nome vazio (Salvar, criação) → erro de obrigatoriedade, POST não disparado
- [ ] **TC-E002** — Nome com 2 caracteres → erro de tamanho mínimo (regra: 3-100 chars)
- [ ] **TC-E003** — Nome com 101 caracteres → erro de tamanho máximo
- [ ] **TC-E004** — Nome válido (ex: `Clínica São Lucas`) → sem erro

## Cadastro — Campo CNPJ

- [ ] **TC-E005** — Máscara CNPJ: digitar `11222333000181` → exibe `11.222.333/0001-81`
- [ ] **TC-E006** — CNPJ com dígito verificador inválido (ex: `11.222.333/0001-00`) → erro de validação
- [ ] **TC-E007** — CNPJ válido (com DV correto) → sem erro
- [ ] **TC-E008** — CNPJ vazio (Salvar, criação) → erro de obrigatoriedade
- [ ] **TC-E009** — CNPJ incompleto (menos de 14 dígitos, blur) → erro de formato
- [ ] **TC-E010** — Campo CNPJ desabilitado em modo edição: abrir Editar → campo não editável, valor formatado

## Cadastro — Campo Telefone (opcional)

- [ ] **TC-E011** — Telefone vazio → sem erro, salva normalmente
- [ ] **TC-E012** — Máscara telefone: digitar `11987654321` → exibe `(11) 98765-4321`
- [ ] **TC-E013** — Telefone fixo válido (8 dígitos, ex: `(11) 3333-4444`) → sem erro
- [ ] **TC-E014** — Telefone com formato inválido (poucos dígitos) → erro exibido

## Cadastro — Campo E-mail (obrigatório inclusive na edição)

- [ ] **TC-E015** — E-mail vazio na criação (Salvar) → erro de obrigatoriedade
- [ ] **TC-E016** — E-mail sem `@` → erro de formato inválido
- [ ] **TC-E017** — E-mail sem domínio (`usuario@`) → erro de formato inválido
- [ ] **TC-E018** — E-mail válido (ex: `contato@clinica.com`) → sem erro
- [ ] **TC-E019** — **[particularidade]** E-mail vazio na edição (diferente dos demais campos, que tratam vazio como "não alterar") → deve continuar bloqueando com erro de obrigatoriedade

## Cadastro — Endereço: Logradouro

- [ ] **TC-E020** — Logradouro vazio (criação) → erro de obrigatoriedade
- [ ] **TC-E021** — Logradouro com 2 caracteres → erro de tamanho mínimo (regra: 3-200 chars)
- [ ] **TC-E022** — Logradouro com caractere não permitido pela regex (ex: `@`, `#`) → erro de formato
- [ ] **TC-E023** — Logradouro válido (ex: `Av. Paulista`) → sem erro

## Cadastro — Endereço: Número

- [ ] **TC-E024** — Número vazio (criação) → erro de obrigatoriedade
- [ ] **TC-E025** — Tentar digitar letras no campo Número → confirmar se o input já filtra (só dígitos) ou se chega a exibir erro de regex `^\d+$` (mesmo tipo de inconsistência máscara-vs-regex encontrada em Pacientes)
- [ ] **TC-E026** — Número válido (ex: `1578`) → sem erro

## Cadastro — Endereço: Complemento (opcional)

- [ ] **TC-E027** — Complemento vazio → sem erro
- [ ] **TC-E028** — Complemento com 101 caracteres → erro de tamanho máximo (regra: até 100 chars)
- [ ] **TC-E029** — Complemento válido (ex: `Sala 12`) → sem erro

## Cadastro — Endereço: Bairro

- [ ] **TC-E030** — Bairro vazio (criação) → erro de obrigatoriedade
- [ ] **TC-E031** — Bairro com 1 caractere → erro de tamanho mínimo (regra: 2-100 chars)
- [ ] **TC-E032** — Bairro com número/símbolo não permitido → erro de formato
- [ ] **TC-E033** — Bairro válido (ex: `Jardins`) → sem erro

## Cadastro — Endereço: CEP (sem integração ViaCEP — diferente de Pacientes)

- [ ] **TC-E034** — CEP vazio (criação) → erro de obrigatoriedade
- [ ] **TC-E035** — Máscara CEP: digitar `01310100` → exibe `01310-100`
- [ ] **TC-E036** — CEP incompleto (blur) → erro de formato
- [ ] **TC-E037** — CEP válido (8 dígitos) → sem erro, e **confirmar que NÃO dispara chamada a viacep.com.br** nem preenche automaticamente logradouro/bairro/cidade/UF (diferente do comportamento em Pacientes)

## Cadastro — Endereço: Cidade

- [ ] **TC-E038** — Cidade vazia (criação) → erro de obrigatoriedade
- [ ] **TC-E039** — Cidade com 1 caractere → erro de tamanho mínimo
- [ ] **TC-E040** — Cidade com número → erro de formato
- [ ] **TC-E041** — Cidade válida (ex: `São Paulo`) → sem erro

## Cadastro — Campo UF (dropdown fixo, não texto livre — diferente de Pacientes)

- [ ] **TC-E042** — UF não selecionada (criação) → erro de obrigatoriedade
- [ ] **TC-E043** — Selecionar uma UF válida no dropdown → sem erro, sem possibilidade de digitar valor livre/inválido

## Comportamento geral no Salvar

- [ ] **TC-E044** — Erros simultâneos: deixar todos os campos obrigatórios vazios, clicar Salvar → todos os erros aparecem juntos
- [ ] **TC-E045** — Erro some ao corrigir o campo (ex: corrigir e-mail inválido → erro desaparece ao digitar)
- [ ] **TC-E046** — Clique duplo em Salvar → não duplica o cadastro (confirmar apenas 1 `POST` real via rede)

## Edição de estabelecimento

- [ ] **TC-E047** — CNPJ formatado e desabilitado em edição
- [ ] **TC-E048** — Deixar um campo normalmente obrigatório (ex: Nome) vazio na edição → tratado como "não alterar", salva sem bloquear
- [ ] **TC-E049** — Deixar e-mail vazio na edição → bloqueado com erro (reforça TC-E019)
- [ ] **TC-E050** — Alterar um campo (ex: telefone) e salvar → `PUT /estabelecimentos/{id}` chamado com o payload correto

## Inativação (soft delete, sem reativação no front)

- [ ] **TC-E051** — Inativar um estabelecimento ativo → modal de confirmação "Inativar Estabelecimento", `DELETE /estabelecimentos/{id}` disparado, item passa a `ativo: false`
- [ ] **TC-E052** — Botão de inativar fica desabilitado para estabelecimento já inativo, e não há ação de reativar visível na UI

## Regressão / fluxo completo

- [ ] **TC-E053** — Fluxo completo válido: cadastrar estabelecimento com todos os campos corretos → aparece na listagem com os dados salvos
- [ ] **TC-E054** — Filtros da listagem (ativo/uf/cidade, se existirem na UI) → filtram corretamente

---

## Observações para quem for executar

1. Todos os campos de endereço/nome/CNPJ/logradouro/bairro/cidade/UF são obrigatórios **apenas na criação** — na edição, campo vazio significa "não alterar" (comentário explícito em `validateEstabelecimento.ts`), **exceto e-mail**, que é sempre obrigatório.
2. Não existe integração ViaCEP nesta tela — isso é intencional/atual, não é bug a reportar, apenas um comportamento a confirmar que continua ausente.
3. Não há controle de permissão por perfil (MEDICO) dentro da tela de Estabelecimento — perfil MEDICO tem acesso total ao menu e não há bloqueio de ações no front (diferente do que se poderia esperar por analogia com Pacientes, onde o bloqueio de inativação é feito pelo backend via 403, não pelo front). Se algum teste de restrição de perfil for necessário, ele precisa ser validado no backend, não nesta tela.
4. Formulário abre como modal na própria página de listagem (`/estabelecimentos`), não há rota separada de criação/edição.
