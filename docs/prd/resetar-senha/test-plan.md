# Test Plan — Recuperação de Senha (`/esqueci-senha` → `/resetar-senha`)

> URLs: `http://localhost:3001/esqueci-senha` e `http://localhost:3001/resetar-senha?token=...`
> Backend real: `ms-sboot-auth` `:8081` (via proxy `/v1/api/auth`) — este é o serviço de autenticação de verdade (não confundir com o repositório `sgsm-auth`, que é outro projeto não utilizado). Sem mocks.
> Conta de teste com e-mail conhecido: `fabioeuro@gmail.com` / `famor966`.

> **ATUALIZAÇÃO (resolvida)**: a feature de recuperação de senha EXISTE de verdade em `ms-sboot-auth` (`AuthController.java` → `ResetSenhaService.java`, rotas `/esqueci-senha`, `/resetar-senha`, `/alterar-senha`). O 500 inicial era causado por uma migration nunca aplicada (`db/V4__reset_senha_token.sql`, tabela `auth.reset_senha_token` não existia no Postgres) — já aplicada manualmente, confirmado que `POST /esqueci-senha` agora responde `200` e persiste um token real na tabela.
> **Limitação real que PERMANECE**: o envio de e-mail em si (`EmailService`, via SMTP `mailersend.net`) falha com `AuthenticationFailedException` porque a variável `SMTP_PASSWORD` não está configurada nesta sessão — isso é assíncrono (`@Async`) e não bloqueia a resposta da API, só o e-mail nunca chega de verdade. Para obter um token real sem inventar nada: consulte diretamente a tabela `auth.reset_senha_token` no Postgres local (usuário `postgres`/`postgres`, `psql -h localhost -U postgres -d postgres -c "SELECT token FROM auth.reset_senha_token ORDER BY criado_em DESC LIMIT 1;"`, executável de `C:\Program Files\PostgreSQL\18\bin\psql.exe`) logo após chamar `/esqueci-senha` — isso é inspecionar estado real persistido pela própria chamada de API real, não é mock. Documente essa limitação de SMTP como bloqueio real (não simule o envio nem invente confirmação de recebimento de e-mail).
> Executado em: (preencher na execução)

---

## `/esqueci-senha` — Carregamento e formulário

- [ ] **RS001** — Acessar `/esqueci-senha` sem estar logado renderiza o formulário (ícone, título "Esqueci minha senha", campo E-mail, botão)
- [ ] **RS002** — Campo E-mail é `required` e `type="email"` — tentar submeter vazio dispara validação nativa do navegador, sem chamar a API
- [ ] **RS003** — Digitar um e-mail em formato inválido (ex.: `abc`) e tentar submeter também é bloqueado pela validação nativa do input `type="email"`
- [ ] **RS004** — Link "Voltar para o login" navega para `/login` sem submeter nada

## `/esqueci-senha` — Submissão

- [ ] **RS005** — Submeter com um e-mail que EXISTE no sistema (`fabioeuro@gmail.com`) → botão mostra "Enviando…", depois tela muda para o estado "E-mail enviado!" com aviso "o link expira em 2 horas"
- [ ] **RS006** — **Edge case de segurança**: submeter com um e-mail que NÃO existe no sistema (ex.: `naoexisteusuario999@teste.com`) — verificar se a resposta/UX é IDÊNTICA ao caso de e-mail existente (mesma tela "E-mail enviado!"). Se o backend responder diferente (erro, ou-mensagem distinta) para e-mail inexistente, isso é uma falha de segurança (permite enumerar quais e-mails estão cadastrados) — documentar como bug se reproduzir
- [ ] **RS007** — Erro de rede/API (5xx real, não simulado) ao submeter exibe toast de erro genérico ("Erro ao processar solicitação..."), formulário permanece visível para nova tentativa
- [ ] **RS008** — Reenviar a solicitação duas vezes seguidas rapidamente (duplo clique) — verificar quantas requisições `POST /v1/api/auth/esqueci-senha` são disparadas (sem guard visível no código contra duplo submit)
- [ ] **RS009** — Após ver a tela "E-mail enviado!", recarregar a página (F5) volta ao formulário vazio (estado não persiste, comportamento esperado já que é só estado local em memória)

## `/resetar-senha` — Sem token

- [ ] **RS010** — Acessar `/resetar-senha` diretamente, sem query param `token` → exibe a tela "Link inválido" com o texto "Este link de redefinição é inválido ou já expirou" e link "Solicitar novo link" apontando para `/esqueci-senha`
- [ ] **RS011** — Acessar `/resetar-senha?token=` (token vazio explícito) → mesmo comportamento de RS010 (tratado como ausente)

## `/resetar-senha` — Com token inválido/expirado

- [ ] **RS012** — Acessar `/resetar-senha?token=umTokenQualquerInventado123` → formulário de redefinição É exibido (a página só checa se o param existe, não se é válido)
- [ ] **RS013** — Preencher senhas válidas e coincidentes e submeter com token inválido → chamada real à API retorna erro; toast exibe a mensagem de erro do backend (ou "Link inválido ou expirado." como fallback), sem navegar para `/login`

## `/resetar-senha` — Com token válido (obtido via fluxo real `/esqueci-senha`, sem mock)

- [ ] **RS014** — Com um token real e válido, o formulário mostra os campos "Nova senha" e "Confirmar nova senha", ambos `type="password"` (mascarados) e `required`
- [ ] **RS015** — Deixar "Nova senha" vazia e tentar submeter → bloqueado pela validação nativa `required`
- [ ] **RS016** — Preencher senhas DIFERENTES entre si → toast "As senhas não coincidem.", nenhuma chamada à API disparada
- [ ] **RS017** — **Edge case**: não há nenhuma validação client-side de força/tamanho mínimo de senha (sem `minLength`, sem regex). Testar submeter uma senha trivial (ex.: `1`, repetida em ambos os campos) — documentar se o backend aceita (sem política de senha forte) ou rejeita com mensagem clara
- [ ] **RS018** — Preencher senhas iguais e válidas, submeter → botão mostra "Salvando...", desabilitado durante a chamada
- [ ] **RS019** — Sucesso: toast "Senha redefinida com sucesso!" e redirecionamento automático para `/login`
- [ ] **RS020** — Após redefinir a senha com sucesso, tentar fazer login com a SENHA ANTIGA deve falhar; login com a NOVA senha deve funcionar (valida que a troca realmente teve efeito, não só a resposta 200)
- [ ] **RS021** — Reutilizar o MESMO token (já usado com sucesso em RS019/RS020) numa segunda tentativa de redefinição → deve ser rejeitado (token de uso único), não deve permitir trocar a senha de novo com o token antigo
- [ ] **RS022** — Duplo clique no botão "Redefinir senha" com formulário válido — verificar se dispara mais de um `POST /v1/api/auth/resetar-senha` (sem guard visível no código)
- [ ] **RS023** — Recarregar a página (F5) no meio do preenchimento do formulário de reset → volta ao formulário vazio com o mesmo token da URL (token não se perde, pois vem da query string), campos de senha limpos

## Fluxo completo / regressão

- [ ] **RS024** — Fluxo ponta a ponta sem interrupção: `/login` → "Esqueci minha senha" → informar e-mail cadastrado → obter link real (verificar onde o link é entregue no ambiente de teste: e-mail real, log do backend, ou outro mecanismo — documentar a fonte usada) → abrir o link → redefinir → login com a nova senha → sucesso
- [ ] **RS025** — Link "Esqueci minha senha" a partir da tela de `/login` navega corretamente para `/esqueci-senha` (confirmar que o link existe e funciona a partir do ponto de entrada real do usuário)

## Observação de escopo

- [ ] **RS026** — Não testável dentro do prazo da QA: expiração real do link após as "2 horas" anunciadas na UI — documentar como não-testável por limitação de tempo, não simular/mockar a passagem do tempo
