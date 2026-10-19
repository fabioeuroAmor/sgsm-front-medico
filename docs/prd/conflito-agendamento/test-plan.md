# Test Plan — Conflito de agendamento (secretária x secretária x WhatsApp)

> Origem: `sgsm/Plano_Desenvolvimento_Conflito_Agendamento_SGSM.docx` (decisões recomendadas DA1–DA5).
> Commits sob teste: sgsm `52d230b`, ms-whatsapp-bot `bee6a21`, sgsm-front-medico `aedc1a5` (develop).
> **Observação de processo:** a implementação (Fase 2) foi feita e commitada antes deste plano. O plano foi
> escrito depois, sem olhar o resultado do QA de API, e é a referência única de aceite a partir daqui.

## Ambiente

| Componente | Endereço | Observação |
|---|---|---|
| Front de QA | `http://localhost:3010` | Vite com `qa-scratch/vite.qa.config.ts` (proxy `/v1` → `:8095`) |
| sgsm de QA | `http://localhost:8095` | jar do commit `52d230b`, profile `dev` |
| ms-sboot-auth | `http://localhost:8081` | instância já em execução |
| PostgreSQL / Redis | locais (dev) | V013 aplicada; Redis `redis-sgsm` |

Contas:
- **DEV** — `dev-local@sgsm.local` (DESENVOLVEDOR), usada só para criar as secretárias de QA (QA000).
- **SEC-A** e **SEC-B** — duas secretárias (FUNCIONARIO) da **Clinica São Lucas**, criadas pela tela `/funcionarios` no QA000.
- **MED** — `fabioeuro@gmail.com` (MEDICO, Fabio Monteiro Amorim — o médico da agenda de teste).

Dados de teste:
- Médico **Fabio Monteiro Amorim**, Clinica São Lucas, agenda **quarta 08:00–18:00** (slots de 30 min) e agenda **domiciliar quinta 08:00–18:00**.
- Serviço presencial **QA Descartavel** (15 min); serviço domiciliar **Consulta de Rotina**.
- Paciente **Zilma Ruela**.
- Data alvo: **quarta 21/10/2026** (domiciliar: quinta 22/10/2026).

Fora do escopo do browser (coberto só por testes automatizados de backend, e assim declarado):
- Fail-open com Redis fora do ar: não há como derrubar o Redis compartilhado sem afetar o JWT/blacklist de todos os serviços.
- Fluxo do WhatsApp (ms-whatsapp-bot): não há interface web; coberto por `ExecutorAcaoServiceTest` e `BotOrquestradorReservaTest`.

Provas exigidas por item: **print da tela** + **saída crua do console e da rede** (requisições `/v1/api/agendamentos*` com método, status e corpo relevante).

---

## 0. Preparação

- [x] **QA000** *(aprovado pelo QA — rodada 1; provas em `evidence/QA000*`)* — Logado como DEV, em `/funcionarios`, cadastrar "QA Secretaria A" e "QA Secretaria B" na Clinica São Lucas, com e-mail e senha (≥ 8 caracteres) digitados no formulário. Esperado: toast "Funcionário cadastrado…" para as duas; `POST /v1/api/funcionarios` 201 e `POST /v1/api/auth/registrar-staff` 201.
- [x] **QA001** *(aprovado pelo QA — rodada 2; provas em `evidence/QA001*`)* — Login de SEC-A em uma janela e de SEC-B em **outro contexto de navegador** (sessões independentes). Esperado: as duas chegam ao painel; nenhuma 401/403 no console.

## 1. Fluxo principal — secretária agenda com pré-reserva

- [x] **QA010** *(aprovado pelo QA — rodada 1; provas em `evidence/QA010*`)* — SEC-A abre `/agendamentos` → "Novo Agendamento" → passo 1 seleciona Zilma → passo 2 seleciona "QA Descartavel" → passo 3 Presencial + Clinica São Lucas → passo 4 seleciona 21/10/2026. Esperado: grade de horários carrega com "Carregando horários…" antes; `GET /agendamentos/slots` 200.
- [x] **QA011** *(aprovado pelo QA — rodada 2; provas em `evidence/QA011*`)* — SEC-A clica no horário **10:00**. Esperado: `POST /agendamentos/reservas` **201** com `reservado:true`; botão 10:00 destacado; faixa "Horário reservado para você — expira em 0X:XX" aparece; enquanto a requisição está em curso os botões ficam desabilitados.
- [x] **QA012** *(aprovado pelo QA — rodada 1; provas em `evidence/QA012*`)* — A contagem regressiva diminui 1 segundo por segundo (dois prints com ~5 s de diferença mostram mm:ss diferentes e coerentes).
- [x] **QA013** *(aprovado pelo QA — rodada 1; provas em `evidence/QA013*`)* — Avançar ao passo 5 (Confirmação). Esperado: resumo com Data e hora 21/10/2026 10:00 e a faixa de reserva continua visível.
- [x] **QA014** *(aprovado pelo QA — rodada 1; provas em `evidence/QA014*`)* — Confirmar. Esperado: `POST /agendamentos` **201** com `reservaToken` no corpo da requisição; modal fecha; o card novo aparece na lista; nenhum `DELETE /reservas/...` é disparado depois do sucesso.
- [x] **QA015** *(aprovado pelo QA — rodada 1; provas em `evidence/QA015*`)* — Após QA014, reabrir o wizard até o passo 4 em 21/10. Esperado: 10:00 **não** aparece mais na grade (ocupado no banco).

## 2. Disputa entre duas secretárias

- [x] **QA020** *(aprovado pelo QA — rodada 1; provas em `evidence/QA020*`)* — SEC-A, no passo 4 de 21/10, reserva **11:00** (faixa de reserva visível). SEC-B, no outro contexto, abre o passo 4 da mesma data e serviço. Esperado: para SEC-B, **11:00 não aparece** na grade.
- [x] **QA021** *(aprovado pelo QA — rodada 2; provas em `evidence/QA021*`)* — SEC-B com a grade aberta **antes** de SEC-A reservar 11:00 (grade desatualizada): SEC-B clica em 11:00 depois que SEC-A reservou. Esperado: `POST /reservas` **409**; mensagem vermelha "Este horário acabou de ser ocupado ou está reservado por outra pessoa…"; bloco "Horários próximos disponíveis" com até 3 opções; nenhum horário fica selecionado; a grade é recarregada (`GET /slots`) e 11:00 some.
- [x] **QA022** *(aprovado pelo QA — rodada 1; provas em `evidence/QA022*`)* — SEC-B clica numa das alternativas. Esperado: `POST /reservas` 201 para o horário da alternativa; ele fica selecionado; faixa de reserva aparece; bloco de alternativas some; a mensagem de erro some.
- [x] **QA023** *(aprovado pelo QA — rodada 1; provas em `evidence/QA023*`)* — Atualização automática: SEC-B fica parada no passo 4 enquanto SEC-A reserva outro horário (ex.: 14:00). Esperado: em até ~30 s, sem ação de SEC-B, 14:00 desaparece da grade de SEC-B (`GET /slots` periódico visível na rede).
- [x] **QA024** *(aprovado pelo QA — rodada 1; provas em `evidence/QA024*`)* — Atualização ao focar a aba: SEC-B troca para outra aba/janela e volta. Esperado: `GET /slots` disparado no evento de foco.
- [x] **QA025** *(aprovado pelo QA — rodada 1; provas em `evidence/QA025*`)* — SEC-A cancela o wizard (fecha o modal) com 11:00 reservado. Esperado: `DELETE /reservas/{token}` 204; em SEC-B, após atualização (30 s ou foco), **11:00 volta** a aparecer.

## 3. Ciclo de vida da reserva

- [x] **QA030** *(aprovado pelo QA — rodada 1; provas em `evidence/QA030*`)* — Trocar de horário: SEC-A reserva 15:00 e depois clica em 15:30. Esperado: `DELETE` da reserva de 15:00 (204) e `POST /reservas` 201 para 15:30; só 15:30 fica destacado.
- [x] **QA031** *(aprovado pelo QA — rodada 1; provas em `evidence/QA031*`)* — Clicar de novo no mesmo horário já reservado. Esperado: nenhuma nova requisição `POST /reservas` (o horário continua reservado, sem duplicar).
- [x] **QA032** *(aprovado pelo QA — rodada 1; provas em `evidence/QA032*`)* — Clique duplo rápido num horário livre. Esperado: no máximo **uma** reserva efetiva para o usuário naquele horário; nenhum 409 mostrado ao próprio usuário; nenhuma reserva "órfã" (contar `POST /reservas` e `DELETE` na rede).
- [x] **QA033** *(aprovado pelo QA — rodada 1; provas em `evidence/QA033*`)* — Botão "Anterior" no passo 4 com reserva ativa. Esperado: `DELETE /reservas/{token}` 204; ao voltar ao passo 4 nenhum horário está selecionado e a faixa sumiu.
- [x] **QA034** *(aprovado pelo QA — rodada 1; provas em `evidence/QA034*`)* — Trocar o dia no calendário com reserva ativa. Esperado: `DELETE` da reserva; a grade do novo dia carrega sem horário selecionado.
- [x] **QA035** *(aprovado pelo QA — rodada 1; provas em `evidence/QA035*`)* — "Mais tempo": com a reserva ativa, clicar no botão. Esperado: `POST /reservas/{token}/renovar` 200; o contador volta para ~10:00.
- [x] **QA036** *(aprovado pelo QA — rodada 1; provas em `evidence/QA036*`)* — Expiração: reservar um horário e esperar o contador chegar a 00:00 (≈10 min) sem renovar. Esperado: a faixa some; mensagem "A reserva do horário expirou…" visível; nenhum erro no console.
- [x] **QA037** *(aprovado pelo QA — rodada 1; provas em `evidence/QA037*`)* — Confirmar depois da expiração (QA036 seguido de avançar e confirmar). Esperado: o agendamento é enviado **sem** `reservaToken` e é criado (201) se o horário ainda estiver livre; nenhum 404 exibido ao usuário.
- [x] **QA038** *(aprovado pelo QA — rodada 1; provas em `evidence/QA038*`)* — Limite de reserva: com o contador renovado várias vezes, o botão "Mais tempo" deixa de aparecer quando a próxima renovação passaria de 30 min desde a criação. Esperado: botão some; `renovar` não é mais chamado.
- [x] **QA039** *(aprovado pelo QA — rodada 2; provas em `evidence/QA039*`)* — Limite de 3 reservas por usuário: SEC-A mantém reservas ativas em 3 abas (3 horários diferentes) e tenta reservar o 4º em uma quarta aba. Esperado: `POST /reservas` **400**; mensagem de erro legível no wizard (sem stack/JSON cru); nenhum horário selecionado.

## 4. Recarregar, voltar, sessão

- [x] **QA040** *(aprovado pelo QA — rodada 1; provas em `evidence/QA040*`)* — Recarregar a página (F5) com reserva ativa no passo 4. Esperado: a página recarrega sem erro; o horário reservado **por ela** volta a aparecer na grade quando refaz o wizard (dentro do prazo); para SEC-B ele continua oculto até expirar.
- [x] **QA041** *(aprovado pelo QA — rodada 1; provas em `evidence/QA041*`)* — Botão voltar do navegador com o wizard aberto e reserva ativa (sair de `/agendamentos`). Esperado: navegação ocorre sem erro; `DELETE /reservas/{token}` disparado ao desmontar a tela.
- [x] **QA042** *(aprovado pelo QA — rodada 5; provas em `evidence/QA042*`)* — Sessão expirada: remover o access token e o refresh token (localStorage) com o wizard no passo 4 e clicar num horário. Esperado: redirecionamento para `/login` com mensagem de sessão expirada; nenhum horário fica "preso" visualmente como reservado.

## 5. Erros de API e rede

- [x] **QA050** *(aprovado pelo QA — rodada 2; provas em `evidence/QA050*`)* — Backend fora do ar: com o wizard no passo 4, parar o sgsm de QA (:8095) e clicar num horário. Esperado: mensagem de erro legível no wizard; botões voltam a ficar habilitados; a tela não trava em loading.
- [x] **QA051** *(aprovado pelo QA — rodada 2; provas em `evidence/QA051*`)* — Backend volta: subir o sgsm de QA de novo e clicar no horário. Esperado: reserva 201 normalmente, sem recarregar a página.
- [x] **QA052** *(aprovado pelo QA — rodada 2; provas em `evidence/QA052*`)* — Conflito no momento da confirmação: SEC-A chega ao passo 5 **sem reserva** (ex.: reserva expirada em QA036) e, antes de confirmar, SEC-B agenda o mesmo horário. SEC-A confirma. Esperado: `POST /agendamentos` **409**; o wizard volta ao passo 4; mensagem de horário ocupado com alternativas; nenhum card duplicado na lista.

- [x] **QA053** *(aprovado pelo QA — rodada 2; provas em `evidence/QA053*`)* — *(adicionado na rodada 2, achado fora do plano)* Após o 409 da QA052, sem recarregar a página, a lista de agendamentos ao fundo do wizard passa a mostrar o agendamento de quem ocupou o horário (`GET /agendamentos` disparado logo após o 409).

## 6. Escopo por perfil (DA2)

- [x] **QA060** *(aprovado pelo QA — rodada 1; provas em `evidence/QA060*`)* — SEC-A no passo 3 escolhe a Clinica São Lucas: grade carrega (200).
- [x] **QA061** *(aprovado pelo QA — rodada 2; provas em `evidence/QA061*`)* — SEC-A tenta a grade de outra clínica (Clinica Teste Strix) — se a clínica aparecer no passo 3, selecioná-la; se não aparecer, chamar a URL `/v1/api/agendamentos/slots?medicoId=<Medico Teste Strix>&estabelecimentoId=<Clinica Teste Strix>&data=2026-10-21` na mesma sessão. Esperado: **404** (nunca 200 com dados).
- [x] **QA062** *(aprovado pelo QA — rodada 2; provas em `evidence/QA062*`)* — MED (`fabioeuro@gmail.com`) abre a grade da própria agenda: 200. Ao tentar a grade de outro médico (mesma técnica de QA061 com `medicoId` de outro médico) → **404**.
- [x] **QA063** *(aprovado pelo QA — rodada 2; provas em `evidence/QA063*`)* — Agendamento domiciliar por SEC-A para Fabio (Consulta de Rotina, quinta 22/10): passo 3 Domiciliar → passo 4 grade carrega → reservar e confirmar. Esperado: `POST /reservas` 201 e `POST /agendamentos` 201.

- [x] **QA064** *(aprovado pelo QA — rodada 2; provas em `evidence/QA064*`)* — *(adicionado na rodada 2, achado fora do plano)* Depois de QA063, o agendamento domiciliar criado por SEC-A aparece na lista de `/agendamentos` da própria SEC-A e pode ser cancelado por ela pelo card (`PATCH /cancelar` 2xx). Um domiciliar de médico **sem** vínculo com a Clinica São Lucas não aparece na lista dela.

## 7. Chatbot (ChatbotWidget)

- [x] **QA070** *(aprovado pelo QA — rodada 1; provas em `evidence/QA070*`)* — SEC-A abre o chatbot → Agendar → CPF da Zilma → QA Descartavel → Clinica São Lucas → data 21/10/2026 → escolhe um horário. Esperado: `POST /reservas` 201; mensagem "Horário reservado para você por alguns minutos…".
- [x] **QA071** *(aprovado pelo QA — rodada 1; provas em `evidence/QA071*`)* — Confirmar no chatbot. Esperado: `POST /agendamentos` 201 com `reservaToken`; mensagem de sucesso.
- [x] **QA072** *(aprovado pelo QA — rodada 1; provas em `evidence/QA072*`)* — Chatbot com horário tomado: SEC-B reserva um horário; SEC-A, com a lista do chatbot desatualizada, escolhe o mesmo horário. Esperado: 409; o bot responde "Esse horário acabou de ser ocupado…" e oferece as alternativas como botões; escolher uma alternativa reserva com 201.
- [x] **QA073** *(aprovado pelo QA — rodada 1; provas em `evidence/QA073*`)* — Cancelar no chatbot ("Não, cancelar") após reservar. Esperado: `DELETE /reservas/{token}` 204.
- [x] **QA074** *(aprovado pelo QA — rodada 1; provas em `evidence/QA074*`)* — Data inválida no chatbot ("32/13/2026", "abc", vazio). Esperado: "Data inválida. Use o formato DD/MM/AAAA." sem chamada à API.

## 8. Edge cases de entrada

- [x] **QA080** *(aprovado pelo QA — rodada 1; provas em `evidence/QA080*`)* — Dia sem agenda (ex.: domingo 25/10/2026). Esperado: "Sem horários disponíveis nesta data"; nenhuma reserva tentada.
- [x] **QA081** *(aprovado pelo QA — rodada 1; provas em `evidence/QA081*`)* — Datas passadas não são selecionáveis no calendário (antes de hoje).
- [x] **QA082** *(aprovado pelo QA — rodada 2; provas em `evidence/QA082*`)* — Lista de alternativas vazia: provocar 409 num dia sem outros horários livres próximos (ou quando o backend não devolver alternativas). Esperado: mensagem "…Escolha outro horário." e nenhum bloco de alternativas vazio na tela.
- [x] **QA083** *(aprovado pelo QA — rodada 1; provas em `evidence/QA083*`)* — Acessibilidade de teclado no passo 4: navegar com Tab até um horário e pressionar Enter/Espaço. Esperado: reserva disparada como no clique; foco visível no botão.

## 9. Regressão (o que já existia e não pode quebrar)

- [x] **QA090** *(aprovado pelo QA — rodada 1; provas em `evidence/QA090*`)* — Listagem de agendamentos carrega e filtra por status/médico/paciente como antes.
- [x] **QA091** *(aprovado pelo QA — rodada 1; provas em `evidence/QA091*`)* — Cancelar um agendamento pelo card (origem + motivo) continua funcionando (`PATCH /cancelar` 2xx) e libera o horário na grade.
- [x] **QA092** *(aprovado pelo QA — rodada 1; provas em `evidence/QA092*`)* — Avançar status de um agendamento (ex.: Confirmar) continua funcionando.
- [x] **QA093** *(aprovado pelo QA — rodada 1; provas em `evidence/QA093*`)* — Cadastro de paciente pelo chatbot continua funcionando até a etapa de consentimento (sem concluir).
- [x] **QA094** *(aprovado pelo QA — rodada 7; provas em `evidence/QA094*`)* — Mensagens de erro de outras telas continuam legíveis (ex.: login com senha errada mostra a mensagem de credencial inválida) — garante que a troca para `ApiError` não quebrou o texto das mensagens.

- [x] **QA095** *(aprovado pelo QA — rodada 5; provas em `evidence/QA095*`)* — *(adicionado na rodada 3; expectativa revista na rodada 5 por decisão do usuário: o `/registrar` público passa a ser só de paciente e o médico entra pelo convite da clínica — seção 12)* Sem estar logado, em `/registrar`: **não** existe seletor Paciente/Médico nem campos de CRM/especialidade; aparece o aviso "É médico? Seu acesso é criado pela clínica…". O cadastro de paciente conclui e leva à etapa "Ative sua conta". Pela API, `POST /v1/api/auth/registrar` com `tipoPerfil: "MEDICO"` responde 400 (o auto-cadastro público não aceita médico).

## 11. Auto-cadastro público de paciente com ativação por e-mail *(adicionada na rodada 4)*

Contexto: decisão do usuário (opção 2) de reabrir o cadastro público de paciente, fechado desde `f071188`, com proteção.
Ambiente adicional: **auth de QA em `:8091`** (código novo; o front de QA aponta `/v1/api/auth` para ele) e sgsm de QA com
`sgsm.autocadastro.limite-por-ip=10` (o padrão de produção é 5). O e-mail de dev sai por conta de teste da MailerSend, que não
entrega para domínios de teste: o código de ativação é obtido no Redis (`auth:ativacao:codigo:<email>`), no papel do usuário
lendo o próprio e-mail. A entrega real do e-mail **não** é verificada por este plano.

- [x] **QA100** *(aprovado pelo QA — rodada 7; provas em `evidence/QA100*`)* — Sem login, `/registrar` → Paciente → dados válidos (CPF válido inédito, e-mail inédito, senha ≥ 8, LGPD marcado) → "Criar conta". Esperado: **um** `POST /v1/api/publico/pacientes` **201** cujo corpo de resposta tem só `email` e `ativacaoPendente:true` (sem id do paciente); a tela mostra "Ative sua conta" com o e-mail digitado; a URL passa a `/registrar?ativar=<email>`.
- [x] **QA101** *(aprovado pelo QA — rodada 7; provas em `evidence/QA101*`)* — Antes de ativar, `/login` com o e-mail e a senha **certa**. Esperado: 401 com toast "Conta ainda não ativada…" e ação "Digitar código", que leva a `/registrar?ativar=<email>` já na etapa do código.
- [x] **QA102** *(aprovado pelo QA — rodada 5; provas em `evidence/QA102*`)* — Antes de ativar, `/login` com senha **errada**. Esperado: "Credenciais invalidas." (não revela que a conta existe/está pendente).
- [x] **QA103** *(aprovado pelo QA — rodada 5; provas em `evidence/QA103*`)* — Na etapa do código: campo só aceita números e no máximo 6; "Ativar conta" com menos de 6 dígitos mostra "Digite os 6 números do código." **sem** chamada à API.
- [x] **QA104** *(aprovado pelo QA — rodada 5; provas em `evidence/QA104*`)* — Código errado (6 dígitos) → `POST /auth/ativar-conta` 400 "Código incorreto."; após 5 erros, mensagem "Muitas tentativas com código incorreto. Solicite um novo código." mesmo com o código certo.
- [x] **QA105** *(aprovado pelo QA — rodada 5; provas em `evidence/QA105*`)* — "Reenviar código" → `POST /auth/ativar-conta/reenviar` 204 e toast genérico; o código antigo deixa de valer e o novo (Redis) vale.
- [x] **QA106** *(aprovado pelo QA — rodada 7; provas em `evidence/QA106*`)* — Código certo → 204, toast "Conta ativada!…", vai para `/login`; o login com a mesma senha entra na área logada como PACIENTE.
- [x] **QA107** *(aprovado pelo QA — rodada 6; provas em `evidence/QA107*`)* — Duplicidade: repetir o cadastro com o **mesmo CPF** (e-mail novo) e depois com o **mesmo e-mail** (CPF novo). Esperado: as duas tentativas recebem **a mesma** resposta 409 e a mesma mensagem "Não foi possível concluir o cadastro com estes dados…".
- [x] **QA108** *(aprovado pelo QA — rodada 5; provas em `evidence/QA108*`)* — Validações na tela: CPF inválido, senha < 8, senhas diferentes, data de nascimento futura, LGPD desmarcado → mensagem específica e **nenhuma** chamada a `/publico/pacientes`.
- [x] **QA109** *(aprovado pelo QA — rodada 5; provas em `evidence/QA109*`)* — Limite por IP: repetir cadastros até passar do limite da janela (10 na instância de QA). Esperado: a partir da 11ª tentativa, 429 com "Muitas tentativas de cadastro a partir desta rede…" legível na tela.
- [x] **QA110** *(aprovado pelo QA — rodada 5; provas em `evidence/QA110*`)* — F5 na etapa "Ative sua conta" mantém a etapa do código (mesmo e-mail na tela); "Voltar ao cadastro" volta ao formulário e limpa o `?ativar` da URL.
- [x] **QA111** *(aprovado pelo QA — rodada 5; provas em `evidence/QA111*`)* — Clique duplo rápido em "Criar conta" → um único `POST /publico/pacientes`.
- [x] **QA112** *(aprovado pelo QA — rodada 7; provas em `evidence/QA112*`)* — Auth fora do ar: parar o auth de QA (:8091), tentar o cadastro → mensagem legível de indisponibilidade (503), sem ir para a etapa do código. Subir o auth de novo e repetir **com os mesmos CPF e e-mail** → 201 (prova de que a tentativa anterior não deixou paciente órfão).

- [x] **QA113** *(aprovado pelo QA — rodada 7; provas em `evidence/QA113*`)* — *(adicionado na rodada 7, achado da rodada 6)* `GET /v1/api/auth/email-disponivel?email=<e-mail com conta>` sem login não revela mais se o e-mail existe: o endpoint foi removido (resposta 404/405 — nunca `{"disponivel":false}`). O cadastro de paciente pela tela continua funcionando sem ele.

Coberto só por testes automatizados (sem caminho pela UI): conta inativada pela clínica não pode ser reativada pelo código (`AtivacaoContaServiceTest`); o cadastro pelo WhatsApp continua criando conta ativa (`AuthServiceTest`, `confirmarEmail` ausente).

## 12. Convite de acesso do médico cadastrado pela clínica *(adicionada na rodada 5)*

Contexto: decisão do usuário — o médico cadastrado por alguém recebe no e-mail do cadastro um link (48 h, uso único) para
criar a própria senha; ninguém da clínica conhece ou define essa senha. Como o e-mail de dev não entrega para domínios de
teste, o QA obtém o token do link na tabela `auth.reset_senha_token` (somente leitura do token mais recente do médico, no
papel do médico lendo o próprio e-mail — única leitura de banco permitida nesta seção). A entrega real do e-mail não é verificada aqui.

- [x] **QA120** *(aprovado pelo QA — rodada 6; provas em `evidence/QA120*`)* — SEC-A (FUNCIONARIO) cadastra um médico novo em `/medicos`. Esperado: `POST /medicos` 201 seguido de `POST /medicos/{id}/convite-acesso` 200 (`loginCriado:true`) e toast "Médico cadastrado. Enviamos para <email> o convite…". O formulário **não** tem campo de senha.
- [x] **QA121** *(aprovado pelo QA — rodada 5; provas em `evidence/QA121*`)* — O médico abre o link do convite (`/resetar-senha?token=…&convite=1`). Esperado: título "Criar sua senha", botão "Criar senha"; ao salvar, toast "Senha criada!…", vai para `/login`; o login com a senha criada entra como MEDICO e vê só a própria agenda.
- [x] **QA122** *(aprovado pelo QA — rodada 5; provas em `evidence/QA122*`)* — Antes de usar o link, tentar logar como esse médico com qualquer senha → "Credenciais invalidas." (não existe senha conhecida).
- [x] **QA123** *(aprovado pelo QA — rodada 5; provas em `evidence/QA123*`)* — Link já usado → mensagem "Este link já foi utilizado."; token inválido → "Link inválido.".
- [x] **QA124** *(aprovado pelo QA — rodada 6; provas em `evidence/QA124*`)* — Botão "Enviar convite" (ícone de envelope) no card de um médico **ativo** da clínica da SEC-A → 200 (`loginCriado:false` para quem já tem login) e toast "Convite de acesso enviado para <email>."; o novo link permite definir uma nova senha.
- [x] **QA125** *(aprovado pelo QA — rodada 6; provas em `evidence/QA125*`)* — Escopo: SEC-A tenta o convite de um médico de **outra** clínica (chamada à API na sessão dela, pois o card não aparece na lista) → 404. Médico logado não vê o botão de convite. Médico inativo não tem o botão.
- [x] **QA126** *(aprovado pelo QA — rodada 5; provas em `evidence/QA126*`)* — Clique repetido no envelope: botão fica desabilitado durante o envio; mais de 3 convites para o mesmo médico em 15 min → mensagem "Muitos convites enviados para este médico…".
- [x] **QA128** *(aprovado pelo QA — rodada 6; provas em `evidence/QA128*`)* — *(adicionado na rodada 6, achado da rodada 5)* Médico cadastrado pela SEC-A **continua na lista dela depois de recarregar** (nasce vinculado à Clinica São Lucas) e o envelope do card dele funciona. Admin com mais de uma clínica vê o campo "Estabelecimento" no cadastro e precisa escolher; secretária não vê esse campo.
- [x] **QA129** *(aprovado pelo QA — rodada 6; provas em `evidence/QA129*`)* — *(adicionado na rodada 6, achado da rodada 5)* Médico logado sempre vê o próprio card em `/medicos`, mesmo sem clínica vinculada.
- [x] **QA127** *(aprovado pelo QA — rodada 6; provas em `evidence/QA127*`)* — Regressão: editar, inativar e reativar médico em `/medicos` continuam funcionando; "Esqueci minha senha" (fluxo normal, sem `convite=1`) mostra os textos de redefinição de sempre.

## 13. Ponta a ponta: secretária x WhatsApp *(adicionada na rodada 8, por decisão do usuário)*

Ambiente adicional: **ms-whatsapp-bot de QA em `:8093`** (código da develop) apontando para o sgsm de QA (:8095), o auth de QA
(:8091) e o sgsm-ia (classificação real por IA). *A partir da rodada 10: sgsm-ia de QA em `:8092` com o código novo (contexto com tipo/referencia_id), isolado num stream de vetorização próprio para não consumir os eventos da instância de dev (:8082).* As mensagens do paciente entram pelo webhook real do bot
(`POST /webhook/evolution` com o header `X-Webhook-Secret`, no formato da Evolution API). As **respostas** do bot vão para um
receptor local (`qa-scratch/evolution-captura.py`, :8099) no lugar da Evolution — nenhuma mensagem sai para um WhatsApp real;
o arquivo `qa-scratch/evolution-captura.jsonl` é o "celular" do paciente de teste (inclusive o código OTP).
Número de teste: um número fictício único por rodada (ex.: `5511900009xxx`), paciente de QA autenticado pelo fluxo de OTP do próprio bot.

- [x] **QA140** *(aprovado pelo QA — rodada 10; provas em `evidence/QA140*`)* — Secretária segura o horário: SEC-A, no navegador, reserva **21/10/2026 10:00** (Fabio, QA Descartavel, Clinica São Lucas). O paciente, pelo WhatsApp, pede exatamente esse horário. Esperado: a resposta capturada do bot diz que o horário "acabou de ser ocupado" e oferece alternativas; o bot **não** pede confirmação desse horário; nenhum agendamento é criado para o paciente às 10:00; a SEC-A confirma o agendamento das 10:00 com 201.
- [x] **QA141** *(aprovado pelo QA — rodada 10; provas em `evidence/QA141*`)* — WhatsApp segura o horário: o paciente pede **21/10/2026 11:00** e o bot responde pedindo confirmação (pré-reserva feita). Esperado: na grade da SEC-A as 11:00 **não aparecem**; com a grade desatualizada, clicar nas 11:00 dá 409 com alternativas. Em seguida o paciente responde que **não** quer; esperado: a reserva é liberada e as 11:00 voltam a aparecer para a SEC-A (após atualizar a grade).
- [x] **QA142** *(aprovado pelo QA — rodada 10; provas em `evidence/QA142*`)* — Confirmação pelo WhatsApp com a reserva própria: o paciente pede **21/10/2026 14:00**, responde "sim"; esperado: resposta "Agendamento confirmado com sucesso!" e o agendamento das 14:00 existe (aparece na lista da SEC-A) — a pré-reserva do bot não bloqueia o próprio paciente.

- [ ] **QA143** *(PENDENTE: aprovado pelo QA na rodada 9 só com log — sem print; a rodada 11 gerou `evidence/QA143-r11-*.png` mas foi interrompida antes do relatório, então o item continua aberto até o QA concluir)* — *(adicionado na rodada 9, achado da rodada 8; decisão do usuário: código no e-mail da conta)* Paciente que **já tem conta** (criada pelo `/registrar` e ativada) manda pelo WhatsApp só o e-mail da conta. Esperado: o bot responde "Se houver uma conta com o e-mail …, enviei para ele um código…" e **nenhum código aparece no WhatsApp** (evolution-captura); o código chega ao e-mail da conta (no QA, lido em `auth:otp:<email>` no Redis, no papel do paciente lendo o próprio e-mail); digitando o código no WhatsApp, o bot responde "Conta ativada com sucesso!…" e o paciente consegue pedir agendamento. Um e-mail **sem conta** recebe a mesma resposta e nenhum código é gerado.

## 10. Limpeza (após o QA)

- [x] **QA099** *(aprovado pelo QA — rodada 2; provas em `evidence/QA099*`)* — Agendamentos criados pelo QA cancelados ou removidos; secretárias de QA inativadas pela tela `/funcionarios`; nenhuma chave `sgsm:reserva*` remanescente no Redis.
