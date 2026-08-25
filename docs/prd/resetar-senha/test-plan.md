# Test Plan — Recuperação de Senha (`/esqueci-senha` → `/resetar-senha`)

> URLs: `http://localhost:3001/esqueci-senha` e `http://localhost:3001/resetar-senha?token=...`
> Backend real: `ms-sboot-auth` `:8081` (via proxy `/v1/api/auth`) — este é o serviço de autenticação de verdade (não confundir com o repositório `sgsm-auth`, que é outro projeto não utilizado). Sem mocks.
> Conta de teste com e-mail conhecido: `fabioeuro@gmail.com` / `famor966`.

> **ATUALIZAÇÃO (resolvida)**: a feature de recuperação de senha EXISTE de verdade em `ms-sboot-auth` (`AuthController.java` → `ResetSenhaService.java`, rotas `/esqueci-senha`, `/resetar-senha`, `/alterar-senha`). O 500 inicial era causado por uma migration nunca aplicada (`db/V4__reset_senha_token.sql`, tabela `auth.reset_senha_token` não existia no Postgres) — já aplicada manualmente, confirmado que `POST /esqueci-senha` agora responde `200` e persiste um token real na tabela.
> **Limitação real que PERMANECE**: o envio de e-mail em si (`EmailService`, via SMTP `mailersend.net`) falha com `AuthenticationFailedException` porque a variável `SMTP_PASSWORD` não está configurada nesta sessão — isso é assíncrono (`@Async`) e não bloqueia a resposta da API, só o e-mail nunca chega de verdade. Para obter um token real sem inventar nada: consulte diretamente a tabela `auth.reset_senha_token` no Postgres local (usuário `postgres`/`postgres`, `psql -h localhost -U postgres -d postgres -c "SELECT token FROM auth.reset_senha_token ORDER BY criado_em DESC LIMIT 1;"`, executável de `C:\Program Files\PostgreSQL\18\bin\psql.exe`) logo após chamar `/esqueci-senha` — isso é inspecionar estado real persistido pela própria chamada de API real, não é mock. Documente essa limitação de SMTP como bloqueio real (não simule o envio nem invente confirmação de recebimento de e-mail).
> Executado em: 2026-08-20, ao vivo via Playwright MCP contra `http://localhost:3001` e backend real `ms-sboot-auth` (:8081). Ver `qa-results.md` para achados detalhados, evidências em `evidencias/`.
> **Rodada 2 (reteste, 2026-08-20)**: reteste pontual, ao vivo, dos 2 achados reais desta QA (RS013/RS021 e RS017) após correção no backend/frontend, com o backend real reiniciado. Anotações inline abaixo (bloco `> RETESTE...`) em cada item afetado; ver `qa-results.md` para a seção "Rodada 2".

---

## `/esqueci-senha` — Carregamento e formulário

- [x] **RS001** — Confirmado: `/esqueci-senha` renderiza ícone, título "Esqueci minha senha", campo E-mail e botão. `evidencias/RS001_esqueci_senha_formulario.png`.
- [x] **RS002** — Confirmado: input `type="email" required`, submit vazio dispara validação nativa ("Preencha este campo."), nenhuma chamada à API. `evidencias/RS002_validacao_nativa_email_vazio.png`.
- [x] **RS003** — Confirmado: `abc` dispara `typeMismatch` nativo ("Inclua um \"@\"..."), nenhuma chamada à API. `evidencias/RS003_validacao_nativa_email_invalido.png`.
- [x] **RS004** — Confirmado: link navega para `/login` sem disparar submit. `evidencias/RS004_voltar_para_login.png`.

## `/esqueci-senha` — Submissão

- [x] **RS005** — Confirmado: `POST /v1/api/auth/esqueci-senha` → 200, tela muda para "E-mail enviado!" com aviso de expiração em 2 horas. `evidencias/RS005_email_enviado_sucesso.png` + `RS005_network_esqueci_senha_email_existente.txt`. (Texto "Enviando..." não capturado visualmente — ver nota metodológica sobre velocidade do ambiente local.)
- [x] **RS006** — Confirmado, SEM falha de segurança: e-mail inexistente retorna a MESMA resposta (200, corpo vazio) e a MESMA UI "E-mail enviado!"; confirmado via banco que nenhum usuário/token foi criado. `evidencias/RS006_email_inexistente_mesma_resposta.png` + `RS006_network_esqueci_senha_email_inexistente.txt`.
- [ ] **RS007** — **BLOQUEADO/não reproduzido.** Não foi possível provocar um 5xx real em `/esqueci-senha` com nenhuma entrada malformada testada (body vazio, JSON malformado, e-mail numérico, e-mail de 5000 chars, e-mail null — todos resultaram em 200 ou 400, nunca 500). Forçar um 5xx exigiria mockar a rede ou derrubar o backend/Postgres compartilhado com outros agentes de QA, ambos fora do escopo permitido. Ver `evidencias/RS007_tentativas_5xx_real.txt`.
- [x] **RS008** — Confirmado: duplo clique disparou apenas 1 `POST /v1/api/auth/esqueci-senha` (confirmado também por apenas 1 novo token no banco), sem guard explícito no código mas sem duplicata observada na prática. `evidencias/RS008_duplo_clique_reenviar.png`.
- [x] **RS009** — Confirmado: reload (F5) volta ao formulário vazio, estado "enviado" não persiste. `evidencias/RS009_reload_volta_formulario_vazio.png`.

## `/resetar-senha` — Sem token

- [x] **RS010** — Confirmado: tela "Link inválido" com texto e link "Solicitar novo link" → `/esqueci-senha`. `evidencias/RS010_link_invalido_sem_token.png`.
- [x] **RS011** — Confirmado: `?token=` vazio tem o mesmo comportamento de RS010. `evidencias/RS011_token_vazio_explicito.png`.

## `/resetar-senha` — Com token inválido/expirado

- [x] **RS012** — Confirmado: formulário de redefinição é exibido mesmo com token inventado (checagem é só de presença, não de validade). `evidencias/RS012_formulario_com_token_invalido.png`.
- [x] **RS013** — **REPROVADO originalmente — BUG confirmado (severidade ALTA).** Com sessão de login residual no navegador, o toast "Link inválido." aparece corretamente sem navegar (`evidencias/RS013_toast_token_invalido.png`). Porém, para um usuário REALMENTE anônimo/deslogado (o cenário real de "esqueci minha senha"), o mesmo submit com token inválido causava **redirecionamento silencioso para `/login` sem exibir nenhum erro** — o interceptor axios global (`src/services/api.ts` linhas 43-67) tratava qualquer HTTP 401 como sessão expirada e forçava `window.location.href = '/login'`, mas o backend usava 401 também para o erro de negócio "token de reset inválido" (`GlobalExceptionHandler.java` linhas 21-24). Ver `evidencias/RS013_BUG_redirect_login_anonimo.png` e `RS013_BUG_root_cause.txt`.
  > **RETESTE (Rodada 2, 2026-08-20) — CORREÇÃO CONFIRMADA.** Backend agora lança `TokenResetInvalidoException` mapeada para `400 Bad Request` (não mais `401`), e o interceptor axios não intercepta mais essa resposta como sessão expirada. Testado ao vivo com `localStorage.clear()` (usuário genuinamente anônimo): `/resetar-senha?token=umTokenInventadoQualquer` com senha válida → `POST /v1/api/auth/resetar-senha` retornou `400` (`{"detail":"Link inválido."}`), toast vermelho "Link inválido." exibido na tela, **sem navegar para `/login`**. Evidência: `evidencias/RS013-retest2.png`, `evidencias/RS013-retest2-toast.png`, `evidencias/RS013-retest2-network-console.txt`.

## `/resetar-senha` — Com token válido (obtido via fluxo real `/esqueci-senha`, sem mock)

- [x] **RS014** — Confirmado via DOM: ambos os campos `type="password" required`. `evidencias/RS014_campos_senha_mascarados.png`.
- [x] **RS015** — Confirmado: campo vazio bloqueado pela validação nativa `required`, nenhuma chamada à API. `evidencias/RS015_validacao_nativa_senha_vazia.png`.
- [x] **RS016** — Confirmado: senhas diferentes disparam toast "As senhas não coincidem.", nenhuma chamada à API. `evidencias/RS016_toast_senhas_diferentes.png`.
- [x] **RS017** — Confirmado — **achado de segurança (severidade MÉDIA)**: backend aceitou a senha trivial "1" sem nenhuma validação de tamanho/força (`POST /resetar-senha` → 204, confirmado via banco que o token foi marcado usado). Nem frontend nem backend têm política mínima de senha. `evidencias/RS017_senha_trivial_aceita.png` + `RS017_achado_sem_politica_senha.txt`.
  > **RETESTE (Rodada 2, 2026-08-20) — CORREÇÃO CONFIRMADA nas duas camadas.** (a) Frontend: senha "1" em `/resetar-senha` (via UI normal) foi bloqueada no cliente com toast "A senha deve ter no mínimo 8 caracteres.", **nenhum `POST` disparado**. Evidência: `evidencias/RS017-retest2-bloqueio-cliente.png`, `evidencias/RS017-retest2-bloqueio-cliente.txt`. (b) Backend: chamada real via `fetch()` direto no console (bypassando a UI), com token real válido e `novaSenha: "abc"`, retornou `400 Bad Request` (`{"detail":"A senha deve ter no mínimo 8 caracteres."}`) — confirmado também que o token não foi consumido pela rejeição (`usado=f` no banco, pois a validação de senha roda antes da checagem do token). Evidência: `evidencias/RS017-retest2-fetch-console.png`, `evidencias/RS017-retest2-fetch-console.txt`.
- [x] **RS018** — Confirmado (parcial): submissão com senhas válidas e coincidentes funciona fim-a-fim (rede real 204, banco confirma token usado). O texto "Salvando..."/disabled não foi capturável visualmente neste ambiente local (round-trip real de ~10-260ms, mais rápido que a latência da própria ferramenta de automação, mesmo com duas tentativas de atraso artificial client-side) — confirmado apenas por leitura de código. Ver `evidencias/RS018_nota_estado_loading.txt`.
- [x] **RS019** — Confirmado: toast verde "Senha redefinida com sucesso!" e redirecionamento automático para `/login`. `evidencias/RS019_toast_sucesso_redirect_login.png`.
- [x] **RS020** — Confirmado: login com senha antiga (`famor966`) → 401; login com a nova senha (`NovaSenhaQA2026!`) → 200 e acesso ao sistema. `evidencias/RS020_login_senha_antiga_falha.png` + `RS020_login_senha_nova_sucesso.png`.
- [x] **RS021** — Confirmado: reutilizar o token já usado retorna 401 (rejeitado) e a senha NÃO foi alterada (confirmado tentando logar com a senha "nova" da tentativa de reuso, que falhou). Mesmo bug de UX do RS013 se repete aqui (redirect silencioso para usuário anônimo) — mesma causa raiz, não é uma reprovação adicional isolada. `evidencias/RS021_token_reutilizado_rejeitado.png` + `RS021_confirma_senha_nao_alterada.png`.
  > **RETESTE (Rodada 2, 2026-08-20) — CORREÇÃO CONFIRMADA.** Fluxo completo ao vivo, deslogado (`localStorage.clear()`) em ambas as tentativas, com token real obtido via `/esqueci-senha`: 1º uso do token com senha válida → `POST /resetar-senha` → `204`, toast de sucesso, redireciona para `/login` (comportamento esperado em caso de SUCESSO). 2º uso (reuso) do MESMO token → `POST /resetar-senha` → `400` (`{"detail":"Este link já foi utilizado."}`), toast vermelho "Este link já foi utilizado." exibido, **sem navegar para `/login`**; banco confirma `usado=t` sem segunda gravação. Evidência: `evidencias/RS021-retest2-primeiro-uso-sucesso.png`, `evidencias/RS021-retest2-reuso-token.png`, `evidencias/RS021-retest2-network-console.txt`. (Este teste alterou de fato a senha real da conta; restaurada ao final — ver `evidencias/RS_restauracao_senha-retest2.txt`.)
- [x] **RS022** — Confirmado: duplo clique disparou apenas 1 `POST /v1/api/auth/resetar-senha`, sem duplicata observada na prática. `evidencias/RS022_duplo_clique_redefinir.png`.
- [x] **RS023** — Confirmado: F5 no meio do preenchimento mantém o token na URL e limpa os campos de senha. `evidencias/RS023_reload_mantem_token_limpa_campos.png`.

## Fluxo completo / regressão

- [x] **RS024** — Confirmado ponta a ponta: `/login` → "Esqueci minha senha" → e-mail cadastrado → token obtido via consulta real ao Postgres (`auth.reset_senha_token`, fonte documentada devido à limitação real de SMTP) → reset → login com a nova senha → sucesso. Este mesmo fluxo foi usado para restaurar a senha original da conta (`famor966`) ao final da QA. `evidencias/RS024_01..04*.png` + `RS024_fonte_do_link_e_restauracao_senha.txt`.
- [x] **RS025** — Confirmado: link "Esqueci minha senha" em `/login` navega para `/esqueci-senha`. `evidencias/RS025_link_esqueci_senha_login.png`.

## Observação de escopo

- [ ] **RS026** — Não testável dentro do prazo da QA: expiração real do link após as "2 horas" anunciadas na UI. Não simulado/mockado, conforme instruído.
