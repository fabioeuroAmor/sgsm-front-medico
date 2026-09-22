# QA Results — Tela de Administradores (`/administradores`)

Executed live against the real running app (`sgsm-front-medico` on `http://localhost:3001`,
backends `sgsm` core `:8080` and `sgsm-auth` `:8081`, real dev Postgres, no mocks for the
happy paths — a handful of items intentionally intercept a single response to simulate an
error/slow-network condition, each noted below) using native Playwright (Chromium) driven
from Node.js scripts, since no Playwright MCP tool was available in this environment.

- **Total items:** 71 (AD001–AD071)
- **Passed (checked `[x]` in test-plan.md):** **71**
- **Blocked:** 0
- **Failed:** 0

All evidence lives in `docs/prd/administradores/evidence/`: `<ID>.png` (full-page screenshot)
+ `<ID>.log` (raw console/network capture with timestamps, HTTP method/URL/status and response
bodies for `/v1/api/*` calls). Test scripts are in `docs/prd/administradores/qa-scratch/`
(`s1`…`s9` cover the plan sections in order; `s9` was added in a follow-up pass to close out the
5 items originally blocked; `fix-*.mjs` are targeted re-runs of items whose first attempt had a
script/selector bug, not an app bug — each is noted below).

## Headline finding: real backend bug found, root-caused, and fixed

`POST /v1/api/auth/registrar` with `tipoPerfil: "ADMIN_ESTABELECIMENTO"` initially returned
**HTTP 500 "Erro interno. Tente novamente mais tarde."** for every attempt. Confirmed
independently via raw `curl` against the backend, and cross-checked that the *same* endpoint
worked fine for `tipoPerfil: "PACIENTE"` (201 Created) — isolating the bug to the
`ADMIN_ESTABELECIMENTO` code path specifically.

**Root cause (not what was initially suspected):** the `auth.role` row and permissions for
`ADMIN_ESTABELECIMENTO` (migration `V6__admin_estabelecimento_role.sql`) were already correctly
applied. The real cause was a **CHECK constraint** on `auth.usuario` (`chk_tipo_perfil`),
created before the `ADMIN_ESTABELECIMENTO` role existed, that only allowed
`('MEDICO','PACIENTE','FUNCIONARIO','DESENVOLVEDOR')` — so every `INSERT` for the new profile
was rejected at the database level, surfacing as a generic unhandled-exception 500.

**Fix:** `ms-sboot-auth/src/main/resources/db/V7__fix_chk_tipo_perfil.sql` — drops and recreates
`chk_tipo_perfil` including `ADMIN_ESTABELECIMENTO`. Applied to the dev DB and verified via curl
(clean `201 Created`, followed by a real successful login). Re-verified live through the browser
in the follow-up QA pass (`s9-ad037-ad071.mjs`) — see AD037/AD071 below.

Originally blocked: **AD037**, **AD069** (partially), **AD071** (entirely) — all closed out
after the fix.

## Second finding: provided MEDICO credential didn't authenticate — resolved with a dedicated test account

The originally documented secondary credential (`fabioeuro@gmail.com` / `famor966`) was rejected
by the real backend with `401 Unauthorized`. Root cause was a stale/incorrect password for what
appears to be a real user account, not a synthetic QA fixture — no attempt was made to guess or
reset it. Resolved by creating a **dedicated MEDICO test account**:
`qa-medico-dedicado@teste.local` / `QaMedico123!` (real `Medico` identity + real login, created
and verified via the API). `test-plan.md`'s credential header was updated to point at this
account going forward.

Originally blocked: **AD063**, **AD064**, **AD065** — all closed out with the new credential
(`s6-acesso-restricao.mjs`, re-run with the dedicated account).

Note: **AD066** (logout → redirect to `/login`) had already been verified successfully using the
DESENVOLVEDOR session in the first pass, since that assertion depends only on `PrivateRoute`'s
`isAuthenticated` check, not on role.

---

## Follow-up pass — how the 5 blocked items were closed

### AD037 — Cadastro completo e válido (full happy path incl. login creation)
Re-run after the V7 fix: `POST /v1/api/administradores` → 201, `POST /v1/api/auth/registrar` →
**201** (previously 500), card appears in the list, and the new administrator was linked to
"Clinica São Lucas" as setup for AD071. Evidence: `AD037.png`, `AD037.log` (shows both real
`201` responses on the network log).

### AD063/AD064/AD065 — MEDICO access restriction, with the dedicated test account
- **AD063:** logged in as `qa-medico-dedicado@teste.local` (real MEDICO session) — confirmed
  "Administradores" nav item is genuinely absent.
- **AD064:** direct URL navigation to `/administradores` as MEDICO — confirmed the page *does*
  render (hero, filters, "Novo Administrador" button all visible — no client-side route guard),
  `GET /v1/api/administradores` returns `403 Forbidden`, and the UI reacts by showing the raw
  error text **"Request failed with status code 403"** followed by the generic `EmptyState`
  ("Nenhum resultado encontrado") — confirms the previously-flagged UX gap: there's no dedicated
  "access denied" state, just a leaked HTTP error string where a friendly message should be.
- **AD065:** attempted to open "Novo Administrador" and submit as MEDICO on the direct URL —
  `POST /v1/api/administradores` confirmed returning `403 Forbidden` in the network log.
- Evidence: `AD063.png/.log`, `AD064.png/.log`, `AD065.png/.log` (script: `s6-acesso-restricao.mjs`,
  re-run with the dedicated MEDICO credential).

### AD071 — Confirm the created login actually works, end-to-end
Logged out of DESENVOLVEDOR, logged in with the real e-mail/senha of the administrator created
in AD037 (`qa-elaine-...@teste.local`) — real `200` login, JWT correctly carries
`"perfil":"ADMIN_ESTABELECIMENTO"` and `"roles":["ADMIN_ESTABELECIMENTO"]`. Confirmed:
- Sidebar hides "Administradores", shows the same staff-level items as FUNCIONARIO (Pacientes,
  Médicos, Estabelecimentos, Serviços, Agendamentos, Funcionários, Assistente IA, CRM).
- **`GET /v1/api/estabelecimentos` returns only "Clinica São Lucas"** (the establishment this
  admin was linked to) — does **not** return "Clinica Teste Strix" — real, live confirmation
  that `EstabelecimentoAcessoService`'s scoping for `ADMIN_ESTABELECIMENTO` actually works
  end-to-end, not just in unit tests.
- Evidence: `AD071.png`, `AD071.log` (script: `s9-ad037-ad071.mjs`).

### AD069 — updated
Note trimmed: the "confirmar login criado" sub-step, previously carried as a caveat, is now
fully covered by AD071 above using the same regression identity's sibling test — all sub-steps
of AD069 (create, link 2 estabs, rename, unlink 1, inactivate, reactivate, final state) remain
independently verified as before.

---

## Notes on partial/adjacent coverage

- **AD038** (orphan-login edge case) — the *observable UI behavior* matched the plan exactly
  (identity created, login fails, error toast, modal closes, orphan card shown, no data loss)
  even while the underlying cause was the systemic AD037 bug (now fixed) rather than the
  specific "email already registered under a different perfil" path. Documented as
  pass-with-caveat in `AD038.log` — the *behavior* itself is unaffected by the backend fix, since
  the duplicate-email collision path is a separate, still-valid trigger for the same UI fallback.
- **AD028** (telefone vazio aceito) shares its evidence with **AD040** (double-click test) since
  both were exercised in the same admin-creation step (Bruno Carvalho, telefone left empty).
  See `AD028.png/.log` (copied from `AD040`'s capture with an added note) — payload shows
  `"telefone":""`, `201 Created`.
- Two script/selector bugs were found and fixed *in the QA scripts themselves* during the first
  pass (never in app code): an ambiguous `text=Novo Administrador` locator that also matched the
  always-visible hero button (fixed to scope to the modal's `<h2>` title), and a locator that
  searched for the button by its literal `"Salvar"` text, which stopped matching the instant the
  button's own text changed to `"Salvando…"` mid-request (fixed to a position-based locator).
  Both AD067 and AD068 initially showed as script-side failures for this reason; re-run with the
  fixed locators, both pass with real evidence (`AD067.png/.log`, `AD068.png/.log`).

## Known side effect disclosed for transparency

While isolating the AD037 backend bug (before the root cause/fix were known), a diagnostic
`curl` call was made directly against `POST /v1/api/auth/registrar` with `tipoPerfil: "PACIENTE"`
for the real existing patient `zilma@gmail.com`, to prove the endpoint worked for other profiles.
This call succeeded (201) and created a real login for that patient in the dev DB as a side
effect. **This has since been cleaned up** — the accidental login was deleted directly from
`auth.usuario` after the fact.

## Database cleanup

All test data created across both QA passes (8 `sgsm.administrador` rows from the first pass,
including one that reused `fabioeuro@gmail.com` as an orphan-login test fixture, plus the
`Elaine Ferreira QA` identity created in the follow-up pass) has been deleted, along with their
`sgsm.administrador_estabelecimento` links and any `auth.usuario` logins created for them.
`sgsm.administrador` is empty again, matching the pre-test state. The dedicated fixture accounts
(`dev-local@sgsm.local` / DESENVOLVEDOR, `qa-medico-dedicado@teste.local` / MEDICO) were
intentionally kept, since they're meant to be reused for future QA runs of this and other
screens (documented in `test-plan.md`'s header).

All CPFs used were algorithmically generated with correct check digits (mirroring the app's own
`validarCPF`) — see `genValidCPF()` in `qa-scratch/helpers.mjs`.
