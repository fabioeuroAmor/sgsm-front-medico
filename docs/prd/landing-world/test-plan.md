# Test Plan — WorldPage (`/world`) — Landing/Apresentação

Rota: `http://localhost:3001/world`. Página pública (fora de `PrivateRoute`), sem
autenticação. Scroll-driven: 7 cenas (`hero`, `pacientes`, `medicos`, `servicos`,
`agendamentos`, `ia-rag`, `cta`) empilhadas num container de `N*110vh` com viewport
`sticky`. Acessível a partir de um link em `HomePage.tsx` (`to="/world"`) e diretamente
por URL.

## Fluxo principal

- [x] `WORLD-01` Acessar `/` (HomePage) e clicar no link/CTA que leva a `/world` → navega para `/world`, cena `hero` visível, título "SGSM Médico".
- [x] `WORLD-02` Acessar `/world` diretamente pela URL (sem passar por `/`) → carrega normalmente, cena `hero` no topo, scroll no início (progresso 0).
- [x] `WORLD-03` `document.title` muda para "SGSM Médico — O Mundo do Sistema" enquanto a página está montada.
- [x] `WORLD-04` Rolar a página do topo até o fim → as 7 cenas aparecem na ordem (hero → pacientes → medicos → servicos → agendamentos → ia-rag → cta), cada uma com eyebrow/título/corpo/tags corretos, sem cenas puladas ou sobrepostas de forma ilegível.
- [x] `WORLD-05` Os pontos de progresso laterais (side dots) refletem a cena atual conforme o scroll avança (dot ativo cresce/ilumina na cena correspondente).
- [x] `WORLD-06` "Scroll hint" ("role para voar") visível no topo da página e desaparece (fade out) após os primeiros ~8% de scroll.
- [x] `WORLD-07` Nav superior fixo: logo/"SGSM Médico" (link para `/`) e botão "Acessar Sistema" (link para `/login`) permanecem visíveis e clicáveis durante todo o scroll.
- [x] `WORLD-08` Clicar no logo do nav → navega para `/` (HomePage).
- [x] `WORLD-09` Clicar em "Acessar Sistema" (nav) → navega para `/login`.
- [x] `WORLD-10` Ao chegar na última cena (`cta`), botão "Acessar Sistema" (CTA final) → navega para `/login`.
- [x] `WORLD-11` Ao chegar na última cena (`cta`), link "← Voltar ao início" → navega para `/`.
- [x] `WORLD-12` Footer com copyright ("© {ano atual} SGSM Médico — Sistema de Gestão em Saúde Médica") visível ao final da página, abaixo da última cena.
- [x] `WORLD-13` Imagem de fundo da cena `hero` (`/medico-3d.jpg`) carrega sem erro 404 e sem quebrar o layout.

## Não óbvio / estado / navegação

- [x] `WORLD-14` Recarregar a página (F5) no meio do scroll (ex.: na cena `medicos`) → a página recarrega sem erro no console; o navegador volta ao topo (comportamento padrão, scroll não é restaurado automaticamente) — confirmar que isso não gera tela quebrada/branca. **(ver observação nas evidências: o navegador manteve o scroll em vez de voltar ao topo; nenhum erro/tela quebrada ocorreu)**
- [x] `WORLD-15` Navegar `/world` → `/login` (via CTA) → clicar "Voltar" do navegador → retorna para `/world`; verificar se o scroll volta ao ponto anterior ou ao topo, e que a página renderiza corretamente em ambos os casos.
- [x] `WORLD-16` Navegar `/` → `/world` → "Voltar" do navegador → retorna para `/` corretamente.
- [x] `WORLD-17` Sair de `/world` (navegar para outra rota) e voltar → `document.title` da página anterior é restaurado ao desmontar (cleanup do `useEffect`), sem título "grudado".
- [x] `WORLD-18` Duplo clique rápido no botão "Acessar Sistema" (CTA ou nav) → navega uma única vez para `/login`, sem erro de navegação duplicada ou tela quebrada.
- [x] `WORLD-19` Navegação por teclado: usar Tab a partir do topo da página → foco visita logo, "Acessar Sistema" (nav) e, ao alcançar a última cena, os links do CTA, em ordem lógica, com indicador de foco visível. **(RETESTE 2 — 2026-08-20 — APROVADO: com o CTA trocado de `style={{ boxShadow: ... }}` inline para `style={{ filter: 'drop-shadow(...)' }}`, o link "Acessar Sistema" do CTA final agora mostra o anel de foco do Tailwind normalmente. `getComputedStyle(document.activeElement).boxShadow` no elemento focado retornou `"rgb(255, 255, 255) 0px 0px 0px 0px, rgb(13, 108, 115) 0px 0px 0px 2px, rgba(0, 0, 0, 0.1) 0px 20px 25px -5px, rgba(0, 0, 0, 0.1) 0px 8px 10px -6px"` — o segundo componente (`rgb(13, 108, 115) 0px 0px 0px 2px`) é o anel `focus-visible:ring-2 focus-visible:ring-ring`, confirmado também visualmente no screenshot. Ordem de tab confirmada correta: widget de chat → logo do nav → "Acessar Sistema" do nav → "Acessar Sistema" do CTA. Ver evidências em `evidencias-retest2-2026-08-20.docx`.)**
- [x] `WORLD-20` Rolar com teclado (Page Down / barra de espaço / setas) a partir de um link focado → a página rola e as cenas transicionam normalmente (não fica travada por causa do `position: sticky`).
- [x] `WORLD-21` Scroll muito rápido (arrastar a barra de rolagem direto para o fim) → chega na cena `cta` sem erro no console, sem cenas "presas" com opacity intermediária incorreta.

## Edge cases

- [x] `WORLD-22` Viewport mobile estreito (ex.: 375px) → textos, tags e botões do CTA continuam legíveis e clicáveis, sem overflow horizontal.
- [x] `WORLD-23` Viewport muito largo (ex.: 2560px) → cenas continuam centralizadas, sem elementos esticados de forma quebrada.
- [x] `WORLD-24` Zoom do navegador em 150%/200% → layout não quebra, textos não cortam de forma ilegível, nav continua utilizável. **(observação: leve sobreposição do título com o widget de chat em 200%)**
- [x] `WORLD-25` Rede lenta (throttling no DevTools) durante o carregamento inicial → página não trava nem lança erro enquanto `/medico-3d.jpg` ainda está carregando; nav e texto da cena `hero` aparecem mesmo antes da imagem terminar de carregar.
- [x] `WORLD-26` Verificar console do navegador durante todo o fluxo (carregar + scroll completo + navegação) → nenhum erro ou warning (React key, framer-motion, 404 de asset). **(RETESTE 2 — 2026-08-20 — APROVADO: com `position: relative;` movido para a regra estática `html { ... }` em `src/index.css` (removido o `useEffect` que setava isso tarde demais), o warning "Please ensure that the container has a non-static position..." não apareceu em nenhum momento — testado com hard reload (about:blank → /world), scroll incremental completo até a cena `cta`, clique no CTA para `/login` e volta via `browser_navigate_back` para `/world`. Console final: 3 mensagens (vite connecting/connected + aviso informativo do React DevTools), 0 erros, 0 warnings. `getComputedStyle(document.documentElement).position` confirmado como `"relative"` antes do teste. Ver evidências em `evidencias-retest2-2026-08-20.docx`.)**
- [x] `WORLD-27` Verificar aba de rede durante o carregamento → nenhuma requisição com status de erro (4xx/5xx) para assets da página (`/medico-3d.jpg`, fontes, etc.).
- [x] `WORLD-28` `prefers-reduced-motion` ativado no SO/navegador → página continua funcional (animações podem continuar rodando, já que não há tratamento explícito no código — registrar como observação, não bloquear aprovação por esse item isoladamente).
