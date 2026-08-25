# QA Results — Recuperação de Senha (`/esqueci-senha` → `/resetar-senha`)

## Rodada 2 — reteste pós-correções (2026-08-20)

Reteste pontual, ao vivo (Playwright MCP, sem mocks), dos 2 achados reais confirmados na Rodada 1
(RS013/RS021 — severidade ALTA — e RS017 — severidade MÉDIA), contra o app real em
`http://localhost:3001` e o backend real `ms-sboot-auth` (`:8081`), **já reiniciado com as
correções**. Conta de teste: `fabioeuro@gmail.com` / `famor966`.

Correções verificadas no código antes do reteste:
- `ResetSenhaService.resetarSenha()` (`ms-sboot-auth/src/main/java/br/com/sgsm/auth/service/ResetSenhaService.java`,
  linhas 62-88) agora lança `TokenResetInvalidoException` para link inválido/já usado/expirado,
  mapeada em `GlobalExceptionHandler.java` (linha 26-29) para `400 Bad Request` (antes: `401`
  genérico, confundido pelo interceptor axios do frontend com sessão expirada).
- O mesmo método valida `novaSenha.length() < 8` e lança `IllegalArgumentException` → `400`
  (linhas 63-64), **antes** de buscar/validar o token — ou seja, uma senha curta nunca consome um
  token válido.
- `ResetarSenhaPage.tsx` (linha 26-27) bloqueia no cliente qualquer senha com menos de 8
  caracteres, com toast "A senha deve ter no mínimo 8 caracteres.", antes de qualquer chamada à
  API.

### Item 1 — RS013/RS021: redirecionamento silencioso para usuário anônimo com token inválido

Testado com `localStorage.clear()` confirmado (usuário genuinamente anônimo/deslogado) em todas as
tentativas — o cenário real que reproduzia o bug.

1. **Token inventado** (`umTokenInventadoQualquer`), senha válida e coincidente, submetido
   deslogado: `POST /v1/api/auth/resetar-senha` → **400** (`{"detail":"Link inválido."}`). Toast
   vermelho "Link inválido." exibido na tela. URL permaneceu em `/resetar-senha` — **sem**
   redirecionamento para `/login`. Evidência: `evidencias/RS013-retest2.png`,
   `evidencias/RS013-retest2-toast.png`, `evidencias/RS013-retest2-network-console.txt`.
2. **Token real obtido via `/esqueci-senha`** (lido do banco via `psql`, somente `SELECT`), usado
   com sucesso uma vez (`POST /resetar-senha` → `204`, toast de sucesso, navega para `/login` —
   comportamento esperado em caso de SUCESSO) e depois reutilizado, deslogado: `POST
   /v1/api/auth/resetar-senha` → **400** (`{"detail":"Este link já foi utilizado."}`). Toast
   vermelho correspondente exibido, URL permaneceu em `/resetar-senha` — **sem** redirecionamento.
   Banco confirma `usado=t` sem segunda gravação. Evidência:
   `evidencias/RS021-retest2-primeiro-uso-sucesso.png`, `evidencias/RS021-retest2-reuso-token.png`,
   `evidencias/RS021-retest2-network-console.txt`.

**Veredito: correção CONFIRMADA.** O backend não usa mais `401` para esse erro de negócio, o
interceptor axios (`src/services/api.ts`) não intercepta mais essas respostas como sessão expirada,
e o usuário anônimo real vê o toast de erro correto sem ser silenciosamente expulso para `/login`.

### Item 2 — RS017: nenhuma política de senha mínima

1. **UI normal**: em `/resetar-senha`, preencher "1" em ambos os campos de senha e submeter →
   bloqueado no cliente com toast "A senha deve ter no mínimo 8 caracteres.", **nenhum `POST`
   disparado** (confirmado pela lista de requisições de rede, sem nova entrada após o clique).
   Evidência: `evidencias/RS017-retest2-bloqueio-cliente.png`,
   `evidencias/RS017-retest2-bloqueio-cliente.txt`.
2. **Bypass da UI via `fetch()` real** no console, com token real e válido (obtido via
   `/esqueci-senha` + `psql`) e `novaSenha: "abc"`: `POST /v1/api/auth/resetar-senha` → **400**
   (`{"detail":"A senha deve ter no mínimo 8 caracteres."}`). Confirmado via banco que o token não
   foi consumido pela rejeição (`usado=f`). Evidência: `evidencias/RS017-retest2-fetch-console.png`,
   `evidencias/RS017-retest2-fetch-console.txt`.

**Veredito: correção CONFIRMADA nas duas camadas** (frontend bloqueia antes de chamar a API;
backend rejeita de forma independente, mesmo contornando a UI).

### Restauração de senha (Rodada 2)

O item 1 (reuso de token) exigiu usar um token real com sucesso uma vez, o que alterou de fato a
senha real da conta `fabioeuro@gmail.com` para `TesteQA2026Reteste!`. Ao final desta rodada, a
senha foi restaurada para o valor original `famor966` usando o próprio fluxo real de reset (novo
token via `/esqueci-senha` + leitura via `psql`), e a restauração foi confirmada com login real
bem-sucedido (`POST /v1/api/auth/login` → `200 OK`, navegação para dentro do sistema). Evidência:
`evidencias/RS_restauracao_senha-retest2-login-sucesso.png`,
`evidencias/RS_restauracao_senha-retest2.txt`. O token usado no item 2 (bypass via `fetch()`) nunca
foi consumido com sucesso e não exigiu nenhuma ação de limpeza. Nenhum `INSERT`/`UPDATE`/`DELETE`
foi executado no banco em nenhum momento — apenas `SELECT`.

### Resumo da Rodada 2

| ID | Veredito (reteste) | Evidência |
|----|---------------------|-----------|
| RS013 | ✅ Corrigido e confirmado — deixa de ser reprovado | `RS013-retest2*.png`, `RS013-retest2-network-console.txt` |
| RS021 | ✅ Corrigido e confirmado (nota já existia, comportamento agora correto) | `RS021-retest2*.png`, `RS021-retest2-network-console.txt` |
| RS017 | ✅ Corrigido e confirmado nas duas camadas (frontend + backend) | `RS017-retest2*.png`, `RS017-retest2*.txt` |

---

Execução ao vivo via Playwright MCP contra o app real em `http://localhost:3001`, backend real
`ms-sboot-auth` (`:8081`, via proxy `/v1/api/auth`), Postgres real local, **sem mocks**. Conta de
teste: `fabioeuro@gmail.com` / `famor966` (perfil MEDICO). Executado em 2026-08-20, worktree
`C:\AmbienteDev\sgsm-front-medico-resetar-senha` (branch `qa/resetar-senha`).

Evidências em `docs/prd/resetar-senha/evidencias/<ID>*.png` (prints) e `evidencias/<ID>*.txt`
(rede/console/análise de causa raiz), uma ou mais por item.

**Limitação de ambiente conhecida e documentada no topo do test-plan.md**: o envio de e-mail real
(SMTP `mailersend.net`) falha por falta de `SMTP_PASSWORD` nesta sessão. Isso é assíncrono
(`@Async`) e não bloqueia a resposta da API. Para obter tokens reais sem inventar nada, cada token
usado nesta QA foi lido diretamente da tabela `auth.reset_senha_token` via `psql`, imediatamente
após uma chamada real (via UI) a `POST /esqueci-senha` — nunca fabricado.

---

## Achados críticos (resumo executivo)

> **Nota (Rodada 2, 2026-08-20): os dois achados abaixo foram corrigidos e a correção foi
> reconfirmada ao vivo — ver seção "Rodada 2" no topo deste documento.**

1. **BUG (severidade ALTA, CORRIGIDO na Rodada 2) — token de reset inválido/expirado/reutilizado
   redirecionava silenciosamente usuários anônimos para `/login`, sem exibir a mensagem de erro
   real (RS013, RS021).** O interceptor de resposta do axios em `src/services/api.ts` (linhas 43-67) trata
   **qualquer** HTTP 401 vindo de **qualquer** endpoint como "sessão expirada": tenta renovar o
   access token e, se não houver `refresh_token` no `localStorage` (sempre o caso para um usuário
   deslogado, que é exatamente o público-alvo de "esqueci minha senha"), executa
   `window.location.href = '/login'` e descarta o toast de erro antes que ele seja visível. O
   problema é que o backend (`GlobalExceptionHandler.java` linhas 21-24) usa o mesmo HTTP 401 tanto
   para "sessão/access-token expirado" quanto para o erro de **negócio** "token de redefinição de
   senha inválido/expirado/já usado" (`TokenInvalidoException`). Resultado: qualquer pessoa que
   clique num link de redefinição de senha inválido, expirado ou já usado é silenciosamente
   "chutada" para a tela de login, sem nenhuma explicação — parece que o site simplesmente voltou
   para o login sem motivo. Comprovado com dois cenários lado a lado (sessão residual vs. usuário
   genuinamente anônimo com `localStorage` limpo) demonstrando que o comportamento correto (toast
   "Link inválido.", sem navegação) só ocorre "por acidente" quando há uma sessão de login válida
   sobrando no navegador — o que não é o caso do usuário real que esqueceu a senha. Root cause
   completo, incluindo trechos de código de frontend e backend, em
   `evidencias/RS013_BUG_root_cause.txt`. Recomendação (não implementada nesta QA): usar um status
   HTTP diferente de 401 para erros de token de reset (ex. 400/410), ou excluir as rotas de
   `esqueci-senha`/`resetar-senha` do fluxo automático de refresh-and-redirect do interceptor.

2. **Achado de segurança (severidade MÉDIA, CORRIGIDO na Rodada 2) — nenhuma política de senha
   mínima, nem no frontend nem no backend (RS017).** O backend aceitou e persistiu com sucesso (`204 No Content`) uma senha
   de um único caractere (`"1"`) via `POST /resetar-senha`. Não há `minLength`/regex no campo do
   frontend, e `ResetSenhaService.resetarSenha()` chama `passwordEncoder.encode(novaSenha)`
   diretamente, sem qualquer validação de tamanho/complexidade antes. Ver
   `evidencias/RS017_achado_sem_politica_senha.txt`.

3. **Não é um bug, mas vale registrar: `POST /esqueci-senha` é genuinamente seguro contra
   enumeração de e-mail (RS006).** E-mail existente e inexistente recebem exatamente a mesma
   resposta (200, corpo vazio) e a mesma UI; confirmado também que nenhum registro é criado no
   banco para e-mail inexistente. Bom sinal de segurança, comprovado com evidência de rede real
   (não apenas a UI, que sempre mostra a mesma tela independentemente da resposta).

---

## Tabela de resultados

| ID | Veredito | Evidência (resumo) |
|----|----------|---------------------|
| RS001 | ✅ Aprovado | `/esqueci-senha` renderiza ícone, título, campo E-mail, botão. `RS001_esqueci_senha_formulario.png`. |
| RS002 | ✅ Aprovado | `type="email" required`; submit vazio bloqueado nativamente (`validationMessage: "Preencha este campo."`), 0 chamadas de rede. `RS002_validacao_nativa_email_vazio.png`. |
| RS003 | ✅ Aprovado | `abc` dispara `typeMismatch` nativo, 0 chamadas de rede. `RS003_validacao_nativa_email_invalido.png`. |
| RS004 | ✅ Aprovado | Link navega para `/login` sem submeter. `RS004_voltar_para_login.png`. |
| RS005 | ✅ Aprovado | `POST /v1/api/auth/esqueci-senha` → 200 (corpo vazio, 12ms), UI "E-mail enviado!" com aviso de 2h. `RS005_email_enviado_sucesso.png`, `RS005_network_esqueci_senha_email_existente.txt`. |
| RS006 | ✅ Aprovado (sem falha de segurança) | E-mail inexistente → resposta idêntica (200, corpo vazio, 7ms) e mesma UI; banco confirma 0 usuários e 0 tokens novos para o e-mail inexistente. `RS006_email_inexistente_mesma_resposta.png`, `RS006_network_esqueci_senha_email_inexistente.txt`. |
| RS007 | ⚠️ Bloqueado / não reproduzido | 5 tentativas reais de payload malformado (vazio, JSON quebrado, e-mail numérico, e-mail 5000 chars, e-mail null) → sempre 200 ou 400, nunca 500. Impossível forçar 5xx real sem mockar rede ou derrubar backend/Postgres compartilhado com outros QAs em paralelo (evidenciado tráfego real de outra sessão em `localhost:3010`). `RS007_tentativas_5xx_real.txt`. |
| RS008 | ✅ Aprovado | Duplo clique → apenas 1 `POST` disparado (confirmado por rede E por contagem de tokens novos no banco = 1), sem guard explícito no código mas sem duplicata na prática. `RS008_duplo_clique_reenviar.png`. |
| RS009 | ✅ Aprovado | F5 após "E-mail enviado!" volta ao formulário vazio. `RS009_reload_volta_formulario_vazio.png`. |
| RS010 | ✅ Aprovado | Sem `token` → tela "Link inválido" + link "Solicitar novo link". `RS010_link_invalido_sem_token.png`. |
| RS011 | ✅ Aprovado | `?token=` vazio → mesmo comportamento de RS010. `RS011_token_vazio_explicito.png`. |
| RS012 | ✅ Aprovado | Token inventado → formulário de redefinição exibido normalmente. `RS012_formulario_com_token_invalido.png`. |
| RS013 | ✅ Aprovado — reprovação original CORRIGIDA (reteste Rodada 2) | Rodada 1: reprovado (severidade ALTA), ver achado crítico #1 e `RS013_BUG_redirect_login_anonimo.png`/`RS013_BUG_root_cause.txt`. Rodada 2 (2026-08-20): reteste ao vivo com usuário anônimo real confirma correção — `POST /resetar-senha` agora retorna `400` (não mais `401`), toast "Link inválido." exibido, sem navegar para `/login`. `RS013-retest2*.png`, `RS013-retest2-network-console.txt`. |
| RS014 | ✅ Aprovado | Campos `Nova senha`/`Confirmar nova senha`, ambos `type="password" required` (confirmado via DOM). `RS014_campos_senha_mascarados.png`. |
| RS015 | ✅ Aprovado | Campo vazio bloqueado nativamente, 0 chamadas de rede. `RS015_validacao_nativa_senha_vazia.png`. |
| RS016 | ✅ Aprovado | Senhas diferentes → toast "As senhas não coincidem.", 0 chamadas de rede. `RS016_toast_senhas_diferentes.png`. |
| RS017 | ✅ Aprovado (achado de segurança, CORRIGIDO na Rodada 2) | Ver achado crítico #2. Senha "1" aceita com 204, token marcado usado no banco. `RS017_senha_trivial_aceita.png`, `RS017_achado_sem_politica_senha.txt`. Reteste Rodada 2: bloqueio confirmado no cliente (`RS017-retest2-bloqueio-cliente*`) e no backend via `fetch()` direto com token real (`RS017-retest2-fetch-console*`), ambos rejeitando com 400. |
| RS018 | 🟡 Aprovado (parcial) | Submissão válida funciona fim-a-fim (204 real, banco confirma token usado). Texto "Salvando..."/disabled não capturável visualmente (round-trip real de 10-260ms, mais rápido que a latência da ferramenta de automação mesmo com 2 tentativas de atraso client-side); confirmado apenas por leitura de código (`ResetarSenhaPage.tsx` linhas 92-93). `RS018_nota_estado_loading.txt`. |
| RS019 | ✅ Aprovado | Toast verde "Senha redefinida com sucesso!" + redirecionamento automático para `/login`. `RS019_toast_sucesso_redirect_login.png`. |
| RS020 | ✅ Aprovado | Login com senha antiga (`famor966`) → 401; login com nova senha (`NovaSenhaQA2026!`) → 200 + acesso ao sistema. `RS020_login_senha_antiga_falha.png`, `RS020_login_senha_nova_sucesso.png`. |
| RS021 | ✅ Aprovado (com nota, CORRIGIDO na Rodada 2) | Token reutilizado → 401 rejeitado, senha NÃO alterada (confirmado tentando logar com a senha da tentativa de reuso, que falhou). Mesmo bug de UX do RS013 se manifesta aqui (redirect silencioso), mesma causa raiz — não contado como reprovação adicional isolada. `RS021_token_reutilizado_rejeitado.png`, `RS021_confirma_senha_nao_alterada.png`. Reteste Rodada 2: reuso do token agora retorna 400 ("Este link já foi utilizado."), sem redirecionamento silencioso. `RS021-retest2*.png`, `RS021-retest2-network-console.txt`. |
| RS022 | ✅ Aprovado | Duplo clique → apenas 1 `POST` disparado, sem duplicata na prática. `RS022_duplo_clique_redefinir.png`. |
| RS023 | ✅ Aprovado | F5 no meio do preenchimento mantém `?token=` na URL, campos de senha voltam vazios. `RS023_reload_mantem_token_limpa_campos.png`. |
| RS024 | ✅ Aprovado | Fluxo ponta a ponta completo `/login` → `/esqueci-senha` → token real via banco → `/resetar-senha` → sucesso → login com nova senha. Fonte do token documentada (limitação de SMTP). `RS024_01..04*.png`, `RS024_fonte_do_link_e_restauracao_senha.txt`. |
| RS025 | ✅ Aprovado | Link "Esqueci minha senha" em `/login` navega para `/esqueci-senha`. `RS025_link_esqueci_senha_login.png`. |
| RS026 | ⚠️ Não testável (fora do escopo de tempo) | Expiração real de 2h não simulada/mockada, conforme instruído. Nenhuma evidência gerada — item legitimamente fora de alcance desta execução. |

---

## Cuidado especial: restauração de senha da conta compartilhada

A conta `fabioeuro@gmail.com` é compartilhada entre agentes de QA. Durante RS017/RS018/RS019/RS020
a senha real foi alterada várias vezes como parte necessária dos testes reais de troca de senha
(sem mock, a única forma de provar que a troca teve efeito é realmente trocando e fazendo login):
`"1"` (RS017) → `NovaSenhaQA2026!` (RS018/RS019, reconfirmado em RS020). **Ao final da execução de
RS024, a senha foi propositalmente redefinida de volta para o valor original `famor966`** usando o
próprio fluxo real de reset (novo token obtido via `/esqueci-senha` + banco), e essa restauração
foi confirmada com prova real: login com `fabioeuro@gmail.com` / `famor966` retornou `200 OK` e
navegou para dentro do sistema (`evidencias/RS024_04_login_senha_restaurada_sucesso.png`). A conta
foi deixada no mesmo estado de senha em que estava antes do início desta QA.

---

## Notas metodológicas

- Todos os tokens de reset usados (5 no total, um por rodada de teste que exigia um token não
  usado) foram obtidos consultando `auth.reset_senha_token` via `psql` **imediatamente após** uma
  chamada real (via UI) a `POST /esqueci-senha` — nunca fabricados ou inseridos manualmente no
  banco (só `SELECT`, nunca `INSERT`/`UPDATE`/`DELETE`, conforme instruído).
- RS013 e RS021 foram testados em dois cenários (sessão com tokens de login residuais no
  `localStorage`, herdados de outra sessão de QA compartilhando o mesmo navegador/servidor
  Playwright MCP, vs. usuário genuinamente anônimo com `localStorage.clear()`) porque o
  comportamento observado mudava drasticamente entre os dois — o cenário anônimo é o único
  realista para o público-alvo real de "esqueci minha senha".
- O servidor Playwright MCP usado nesta sessão está configurado com raiz de escrita de arquivos em
  `C:\AmbienteDev\sgsm-front-medico\` (o checkout principal, não este worktree) — confirmado por
  tentativa direta de escrever fora dessa raiz (`File access denied`) e por localizar os arquivos
  `.playwright-mcp/*` gerados lá. Todos os screenshots foram salvos com nome relativo (raiz
  permitida) e depois movidos via `Bash`/`mv` para `docs/prd/resetar-senha/evidencias/` neste
  worktree. Tráfego real de outra sessão em `localhost:3010` (outro worktree/QA) foi observado nos
  logs de console durante a execução, confirmando que o ambiente é compartilhado entre múltiplos
  agentes de QA rodando em paralelo — por isso ações destrutivas no backend/Postgres compartilhado
  (para tentar reproduzir RS007) foram deliberadamente evitadas.
- Para RS018, foram feitas duas tentativas reais (não mockadas) de atrasar artificialmente a
  resolução da chamada de rede do lado do cliente (hook em `window.fetch` e depois em
  `XMLHttpRequest.prototype.onreadystatechange`/`addEventListener('load')`) para tentar capturar
  visualmente o estado "Salvando...". Ambas as tentativas mostraram que a navegação para `/login`
  já havia ocorrido no momento em que a ferramenta de screenshot retornava, mesmo com atraso
  artificial de 2500ms configurado — o requisito não pôde ser comprovado com print ao vivo, apenas
  por leitura de código (documentado explicitamente no item, sem marcar como prova visual).
- Nenhum arquivo em `src/` (frontend) nem em `ms-sboot-auth/src` (backend) foi editado.

---

## Resumo final

> **Atualizado na Rodada 2 (2026-08-20):** RS013 deixa de ser reprovado — a correção foi
> reconfirmada ao vivo (ver seção "Rodada 2" no topo do documento). RS017 e RS021, que já estavam
> aprovados na Rodada 1 (achado/nota, não reprovação formal), também tiveram sua correção
> reconfirmada na Rodada 2.

- **Total de itens:** 26 (RS001–RS026)
- **✅ Aprovados:** 23 — RS001–RS006, RS008–RS013, RS014–RS020, RS022–RS025 (RS013 migrou de reprovado para aprovado na Rodada 2)
- **🟡 Aprovado parcial:** 1 — RS018 (funcionalidade comprovada; sub-item visual "Salvando..." não capturável no ambiente)
- **❌ Reprovado (bug confirmado):** 0 (RS013 corrigido e reconfirmado na Rodada 2 — ver seção "Rodada 2")
- **⚠️ Bloqueado / não reproduzido:** 1 — RS007 (impossível provocar 5xx real sem mock ou sem derrubar ambiente compartilhado)
- **⚠️ Não testável (fora de escopo de tempo, documentado):** 1 — RS026

**Bugs/achados reais confirmados, por severidade (status pós-Rodada 2):**

1. **ALTA — RS013/RS021 — CORRIGIDO E RECONFIRMADO (Rodada 2)**: interceptor axios global
   (`src/services/api.ts`) tratava qualquer 401 como sessão expirada e redirecionava
   silenciosamente para `/login`, mascarando o erro real de "link de reset inválido/expirado/já
   usado" para o usuário anônimo real (o público-alvo do fluxo). Causa raiz cruzava frontend
   (`api.ts`) e backend (`GlobalExceptionHandler.java` usando 401 para erro de negócio). Corrigido
   com `TokenResetInvalidoException` mapeada para `400 Bad Request`; reconfirmado ao vivo na
   Rodada 2 com usuário genuinamente anônimo, nos dois cenários (token inválido e token
   reutilizado).
2. **MÉDIA — RS017 — CORRIGIDO E RECONFIRMADO (Rodada 2)**: nenhuma política de senha mínima
   (frontend nem backend), qualquer senha de 1 caractere era aceita. Corrigido com bloqueio
   client-side (`ResetarSenhaPage.tsx`) e validação server-side (`ResetSenhaService.resetarSenha()`,
   `400` para senha < 8 caracteres); reconfirmado ao vivo na Rodada 2 nas duas camadas, inclusive
   contornando a UI via `fetch()` direto com token real.
3. **Informativo — RS007**: não foi possível confirmar/negar o comportamento de erro 5xx real por
   impossibilidade de reprodução dentro das regras desta QA (sem mock, sem derrubar ambiente
   compartilhado). Recomenda-se um teste de integração de backend dedicado (fora do escopo de QA de
   UI) para cobrir esse caminho. Não coberto pela Rodada 2 (fora do escopo do reteste solicitado).

**Conta de teste (`fabioeuro@gmail.com`) restaurada com sucesso para a senha original `famor966` ao
final da execução da Rodada 1, confirmado com login real (200 OK). Na Rodada 2, o reteste do reuso
de token (item RS021) alterou a senha novamente durante o teste; ela foi restaurada mais uma vez
para `famor966` ao final da Rodada 2, também confirmado com login real (200 OK) — ver
`evidencias/RS_restauracao_senha-retest2.txt`.**
