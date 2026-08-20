# Test Plan — Tela de Registro (`/registrar`)

> URL: `http://localhost:3001/registrar`
> Backends reais: `sgsm` core `:8080` (`POST /v1/api/medicos` e `/v1/api/pacientes`, ambos públicos), `sgsm-auth` `:8081` (`POST /v1/api/auth/registrar`) — sem mocks.
> Fluxo: para tipo MEDICO/PACIENTE, o front primeiro cria o registro de domínio (`medicoService.cadastrar`/`pacienteService.cadastrar`, chamadas públicas) e só depois cria a conta de login (`authService.registrar`), em duas chamadas HTTP separadas sem transação entre elas.
> Executado em: (preencher na execução)

---

## Achados suspeitos de bug crítico — verificar com prioridade

- [ ] **REG001 — CRÍTICO, muito provável**: registrar tipo **Funcionário** provavelmente está totalmente quebrado. O front-end não envia `referenciaId` para esse tipo (comentário no código diz "resolvido automaticamente pelo backend via e-mail"), mas `AuthService.registrar()` no `sgsm-auth` exige `referenciaId != null` para qualquer perfil que não seja DESENVOLVEDOR, incluindo FUNCIONARIO, e lança `IllegalArgumentException("referenciaId é obrigatório para o perfil FUNCIONARIO")` antes de qualquer lookup por e-mail. Testar: preencher email + senha com tipo Funcionário e submeter → confirmar se aparece esse erro (ou algum outro) e se é IMPOSSÍVEL concluir o cadastro por esse caminho
- [ ] **REG002 — CRÍTICO, muito provável**: registro de **Médico** ou **Paciente** faz duas chamadas HTTP sequenciais sem rollback: 1) cria o registro em `/medicos` ou `/pacientes` (sucesso, 201), 2) cria a conta de login em `/auth/registrar`. Se a segunda falhar (ex.: e-mail já usado por OUTRO perfil no sgsm-auth), o registro de domínio da etapa 1 já foi persistido e fica órfão — cadastrado no sistema mas sem login para acessá-lo. **Repro sugerido**: registrar como Paciente com e-mail X com sucesso completo; depois tentar registrar como Médico usando o MESMO e-mail X (com CRM novo/diferente) → verificar se o `POST /v1/api/medicos` é aceito (já que unicidade de e-mail lá é só entre médicos) e SÓ DEPOIS o `POST /v1/api/auth/registrar` falha com "Email já cadastrado" — se isso acontecer, o médico órfão criado é um bug real, documentar com as duas evidências de rede (o 201 do primeiro POST e o erro do segundo)

## Seletor de tipo

- [ ] **REG003** — Tela abre com "Paciente" selecionado por padrão, campos de Paciente visíveis (CPF, Data de nascimento)
- [ ] **REG004** — Clicar em "Médico" troca os campos visíveis para CRM, UF do CRM, Especialidade (some CPF/Data nascimento)
- [ ] **REG005** — Clicar em "Funcionário" esconde todos os campos específicos (CPF, CRM etc.) E também o campo "Nome" (só some quando `tipo === 'FUNCIONARIO'`), mostra o aviso "Seu acesso foi criado pelo médico responsável..."
- [ ] **REG006** — Trocar de tipo várias vezes preserva os valores já digitados em Email/Senha (não reseta o formulário inteiro), mas não deve manter, por exemplo, CPF preenchido "fantasma" sendo enviado se trocar para Médico depois de preencher como Paciente — confirmar que os campos não usados pelo tipo atual não vazam no payload

## Campos comuns — validação

- [ ] **REG007** — Submeter com Nome vazio (tipo Paciente ou Médico) → bloqueado pela validação nativa `required`, nenhuma chamada à API
- [ ] **REG008** — Submeter com E-mail vazio ou em formato inválido → bloqueado por `required`/`type="email"` nativo
- [ ] **REG009** — Senha e Confirmar senha diferentes → toast "As senhas não conferem.", nenhuma chamada à API
- [ ] **REG010** — Senha com menos de 8 caracteres (ex.: `abc123`) → toast "A senha deve ter no mínimo 8 caracteres.", nenhuma chamada à API (validação é só de tamanho, sem checar complexidade)
- [ ] **REG011** — Senha com exatamente 8 caracteres é aceita pela validação client-side (limite exato, off-by-one)
- [ ] **REG012** — Campos de senha são `type="password"` (mascarados) com `autocomplete="new-password"`

## Campos específicos — Paciente

- [ ] **REG013** — Máscara de CPF formata progressivamente enquanto digita (`000.000.000-00`)
- [ ] **REG014** — **Edge case**: o formulário de registro NÃO valida o dígito verificador do CPF no client-side (só aplica máscara) — diferente de outras telas do sistema que têm validação completa de CPF. Testar submeter um CPF com todos os dígitos iguais (ex.: `111.111.111-11`) ou dígito verificador inválido e ver se o backend rejeita (essa validação existe em `PacienteService`?) ou se aceita um CPF matematicamente inválido
- [ ] **REG015** — Campo Data de nascimento é obrigatório (`required`, `type="date"`)
- [ ] **REG016** — Selecionar uma data de nascimento futura (ex.: ano que vem) — não há bloqueio client-side visível; verificar se o backend rejeita ou aceita uma data de nascimento no futuro

## Campos específicos — Médico

- [ ] **REG017** — CRM é texto livre, sem máscara nem validação de formato client-side
- [ ] **REG018** — UF do CRM vem pré-selecionada como "SP"; select lista todas as 27 UFs
- [ ] **REG019** — Especialidade é obrigatória (`required` no `SelectField`), lista fixa de 10 especialidades, opção "Selecione…" não é uma especialidade válida

## Submissão — sucesso

- [ ] **REG020** — Cadastro completo e válido como Paciente → `POST /v1/api/pacientes` (201) seguido de `POST /v1/api/auth/registrar` (201), toast "Cadastro realizado! Faça login para acessar o sistema.", redireciona para `/login`
- [ ] **REG021** — Cadastro completo e válido como Médico → mesma sequência com `POST /v1/api/medicos`
- [ ] **REG022** — Botão mostra "Cadastrando..." e fica desabilitado durante toda a submissão (as duas chamadas)
- [ ] **REG023** — Após o registro bem-sucedido, fazer login com o e-mail e senha recém-criados funciona e leva à tela correspondente ao perfil escolhido

## Submissão — duplicados e erros do backend

- [ ] **REG024** — Registrar Paciente com CPF já cadastrado em outro paciente → erro do backend exibido em toast, cadastro bloqueado, nenhuma conta de login criada
- [ ] **REG025** — Registrar Médico com CRM+UF já cadastrado → erro do backend exibido em toast
- [ ] **REG026** — Registrar com e-mail já usado por uma conta de login existente (mesmo tipo de perfil, ex. tentar recriar um Paciente já registrado) → erro claro exibido, sem criar duplicata
- [ ] **REG027** — Erro genérico do backend (5xx real) em qualquer uma das duas chamadas → toast de erro exibido, formulário permanece preenchido para nova tentativa (dados não se perdem)

## Submissão — edge cases de robustez

- [ ] **REG028** — Duplo clique no botão "Criar conta" com formulário válido — verificar quantas requisições são disparadas (sem guard visível no código contra duplo submit; pior ainda aqui por serem DUAS chamadas em sequência — um duplo clique poderia gerar até 2 médicos/pacientes duplicados antes do primeiro completar)
- [ ] **REG029** — Recarregar a página (F5) no meio do preenchimento → formulário reseta para o estado inicial (Paciente, campos vazios), sem crash
- [ ] **REG030** — Navegar para `/registrar` já autenticado (sessão ativa) — verificar se a rota é acessível mesmo logado ou se redireciona (rota pública, não está dentro do `PrivateRoute`)

## Navegação

- [ ] **REG031** — Botão "Já tem conta? Entrar" navega para `/login` sem submeter nada
- [ ] **REG032** — A partir de `/login`, existe (e funciona) um caminho de volta para `/registrar`, se houver

## Regressão / fluxo completo

- [ ] **REG033** — Fluxo ponta a ponta: registrar um Médico novo → fazer login com a conta criada → confirmar que o perfil/permissões correspondem a MEDICO (`GET /auth/me` retorna `tipoPerfil: MEDICO` e `referenciaId` apontando pro médico recém-criado)
- [ ] **REG034** — Mesmo fluxo para Paciente
- [ ] **REG035** — Mesmo fluxo para Funcionário — este é o caso que valida (ou refuta definitivamente) o REG001
