# sgsm-front-medico

Frontend em **React + TypeScript** (Vite) da plataforma SGSM, voltado ao fluxo do médico: login, agenda, agendamentos, pacientes, estabelecimentos e serviços médicos.

Faz parte da plataforma SGSM, junto com o [`sgsm`](../sgsm) (core médico, porta 8080) e o [`ms-sboot-auth`](../ms-sboot-auth) (autenticação, porta 8081).

---

## Tecnologias

| Tecnologia | Versão |
|---|---|
| React | 18.3 |
| TypeScript | 5.7 |
| Vite | 6.x |
| React Router DOM | 7.x |
| Axios | 1.7 |
| Tailwind CSS | 3.4 |
| Framer Motion | 11.x |
| Lucide React (ícones) | — |
| Sonner (toasts) | — |

---

## Pré-requisitos

- **Node.js** (compatível com Vite 6 / `@types/node` 25.x usado no projeto)
- Os dois backends rodando localmente:
  - `sgsm` em `http://localhost:8080`
  - `ms-sboot-auth` em `http://localhost:8081`

---

## Como executar

```bash
npm install
npm run dev
```

A aplicação fica disponível em `http://localhost:3001` (porta fixada em `vite.config.ts`).

Outros scripts:

```bash
npm run build     # tsc -b && vite build
npm run preview   # serve o build de produção localmente
npm run lint      # eslint
```

---

## Como o frontend fala com o backend

Não há `.env`/variável de API base — as chamadas usam caminhos relativos (`baseURL: '/v1/api'` em `src/services/api.ts`) e o **Vite dev server faz o proxy**, configurado em `vite.config.ts`:

| Caminho | Proxy para |
|---|---|
| `/v1/api/auth/**` | `http://localhost:8081` (`ms-sboot-auth`) |
| `/v1/**` (demais) | `http://localhost:8080` (`sgsm`) |
| `/ia/(chat\|busca\|paciente\|kpis\|etl)/**`, `/crm/**`, `/marketing/**` | `http://localhost:8082` (`sgsm-ia`) |

Ou seja: para rodar o frontend de ponta a ponta, **`sgsm` e `ms-sboot-auth` precisam estar de pé** nas portas acima antes de `npm run dev`. O `sgsm-ia` só é necessário para as telas **Assistente IA** e **CRM**.

### Permissões nas telas de IA e CRM

O `sgsm-ia` autoriza cada rota por perfil e filtra os dados pelos estabelecimentos do usuário. O front só esconde o que o perfil não pode usar (`src/lib/permissoesIa.ts`); a barreira real é o backend, que responde 403/404.

| Recurso | Perfis |
|---|---|
| CRM → Leads | FUNCIONARIO, ADMIN_ESTABELECIMENTO, DESENVOLVEDOR (lead exige estabelecimento, exceto para DESENVOLVEDOR) |
| CRM → Paciente 360 (tags, contatos) | MEDICO, FUNCIONARIO, ADMIN_ESTABELECIMENTO, DESENVOLVEDOR |
| CRM → Notas clínicas | leitura: MEDICO que atendeu o paciente e DESENVOLVEDOR; registro: só MEDICO |
| CRM → Risco de Churn | FUNCIONARIO, ADMIN_ESTABELECIMENTO, DESENVOLVEDOR |
| CRM → Analytics / IA → KPIs | ADMIN_ESTABELECIMENTO, DESENVOLVEDOR |
| IA → Chat | MEDICO, FUNCIONARIO, ADMIN_ESTABELECIMENTO, DESENVOLVEDOR (contexto filtrado pelo escopo do usuário) |
| Tráfego pago (Meta Ads) | ADMIN_ESTABELECIMENTO (só das suas clínicas) e DESENVOLVEDOR. O login da Meta volta por `/marketing/meta/callback`, que passa pelo proxy do Vite até o sgsm-ia |

Em build de produção (`npm run build` + `npm run preview`, ou deploy), esse proxy do dev server não existe — é preciso um proxy reverso equivalente (nginx, API gateway etc.) apontando `/v1/api/auth/**` e o restante de `/v1/**` para os respectivos serviços.

---

## Autenticação

- `src/services/authService.ts` chama `POST /v1/api/auth/login` (via proxy, no `ms-sboot-auth`) e guarda o `accessToken` em `src/services/tokenStore.ts` e o `refreshToken` em `localStorage`.
- O interceptor de request em `src/services/api.ts` injeta `Authorization: Bearer <token>` em toda chamada.
- O interceptor de response trata `401`: tenta renovar automaticamente via `POST /v1/api/auth/refresh`; se falhar, limpa a sessão e redireciona para `/login`.

---

## Estrutura do projeto

```
src/
├── components/
│   ├── layout/     # Shell da aplicação (header, navegação, etc.)
│   └── ui/         # Componentes de UI reutilizáveis
├── hooks/          # Hooks React customizados
├── lib/            # Utilitários
├── pages/          # Telas (uma por rota)
├── services/       # Clientes HTTP por domínio (axios)
└── types/          # Tipos TypeScript compartilhados
```

### Páginas

| Página | Domínio |
|---|---|
| `LoginPage` / `RegisterPage` | Autenticação (via `ms-sboot-auth`) |
| `HomePage` | Home / dashboard |
| `AgendamentosPage` | Agendamentos |
| `MedicosPage` | Médicos |
| `PacientesPage` | Pacientes |
| `EstabelecimentosPage` | Estabelecimentos |
| `ServicosPage` | Serviços médicos |

### Services (clientes HTTP)

`agendaMedicoService`, `agendamentoService`, `authService`, `estabelecimentoService`, `medicoService`, `pacienteService`, `servicoMedicoService` — cada um encapsula as chamadas Axios de um domínio, todos passando pelo `api.ts` central (interceptors de auth acima).

---

## Rodando a stack completa

Ordem recomendada para testar o fluxo ponta a ponta localmente:

```bash
# 1. Banco Postgres já rodando (schemas auth e sgsm)

# 2. ms-sboot-auth (porta 8081)
cd ../ms-sboot-auth && ./mvnw spring-boot:run

# 3. sgsm (porta 8080)
cd ../sgsm && ./mvnw spring-boot:run

# 4. sgsm-ia (porta 8082) — opcional, só para Assistente IA e CRM
#    (depende de Redis e Milvus de pé)
cd ../sgsm-ia && mvn spring-boot:run

# 5. Frontend (porta 3001)
cd ../sgsm-front-medico && npm run dev
```

Acesse `http://localhost:3001`.
