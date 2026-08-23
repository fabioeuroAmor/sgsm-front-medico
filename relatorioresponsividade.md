# Relatório de Responsividade — SGSM Médico

**Site testado:** `zus-ties-monsters-advantages.trycloudflare.com`
**Data:** 22/08/2026
**Páginas cobertas:** landing (`/`) e login (`/login` — a app redireciona `/` para `/login` para visitantes não autenticados de forma inconsistente entre requisições; ver nota em Metodologia)

## Metodologia e limitações

O redimensionamento nativo da janela do navegador não teve efeito neste ambiente de teste (`window.innerWidth`/`screen.width` permaneceram fixos independente do valor solicitado). Para contornar isso, os breakpoints foram simulados injetando um `<iframe>` de largura/altura controladas apontando para a mesma origem — isso aciona as media queries reais do CSS (não é emulação forçada), então os resultados abaixo refletem o motor de layout real do Chromium.

Breakpoints testados: 320×568, 375×667, 390×844 (mobile), 768×1024 (tablet), e os breakpoints Tailwind detectados no CSS do site (640 / 768 / 1024 / 1280 / 1400px) mais uma media query custom em `max-width:600px`.

**Não coberto por este teste** — recomenda-se validar antes de fechar o assunto: comportamento em dispositivo físico real (iOS Safari em particular, por causa do teclado virtual e do zoom automático em inputs), fluxos internos autenticados do sistema (agenda, cadastro de paciente, wizard de agendamento), e performance em rede móvel real.

---

## Achados — por severidade

### 1. [Bloqueante] Navegação principal inacessível em mobile — página `/`

Em qualquer viewport abaixo do breakpoint `md` (768px), o `<nav>` do header recebe `display: none` e **não existe nenhum elemento substituto** (botão hambúrguer, ícone de menu, drawer) no HTML renderizado. Confirmado via inspeção do DOM, não apenas visualmente: os links "Início", "Funcionalidades" e "Sobre o Sistema" existem no markup mas ficam com `width:0, height:0` porque o pai está oculto.

**Impacto:** usuário em celular real não tem como navegar para nenhuma seção do site fora a home. Compromete diretamente a usabilidade do ponto de entrada público.

**Correção sugerida:** adicionar um menu mobile (botão de toggle + drawer/dropdown) no mesmo componente de header, replicando os links da nav desktop. Se o header for Tailwind, algo como:

```jsx
<button className="md:hidden" aria-label="Abrir menu" onClick={() => setOpen(!open)}>
  <MenuIcon />
</button>
{open && (
  <div className="md:hidden absolute top-full left-0 w-full bg-white shadow-lg flex flex-col">
    {/* mesmos links do <nav> desktop */}
  </div>
)}
```

### 2. [Médio] Font-size de 14px nos campos de login dispara zoom automático no iOS

Na página `/login`, os inputs de e-mail e senha estão com `font-size: 14px` (confirmado via `getComputedStyle`). O Safari no iOS aplica zoom automático ao focar em qualquer input com `font-size` menor que 16px — o usuário toca no campo e a tela "pula" de zoom, uma fricção conhecida e evitável.

**Correção sugerida:** subir o `font-size` desses inputs para `16px` (ou `1rem`) no breakpoint mobile — em Tailwind, `text-base` em vez de `text-sm` nos campos de formulário, ao menos abaixo do breakpoint `sm`.

### 3. [Baixo] Alvos de toque abaixo do mínimo recomendado (44×44px)

Medido em 390×844 e 320×568:

| Elemento | Página | Tamanho medido | Mínimo recomendado |
|---|---|---|---|
| Botão "Acessar Sistema" (header) | `/` | 165×40px | 44×44px |
| Link "✦ Explorar o mundo do sistema" | `/` | 213×20px | 44×44px |
| Link "Acessar Sistema →" (rodapé) | `/` | 128×20px | 44×44px |
| Botão "Entrar" (submit) | `/login` | 203×40px | 44×44px |
| Link "Esqueci minha senha" | `/login` | 138×18px | 44×44px |

Nenhum é crítico isoladamente, mas o padrão se repete — sugere que o design system não tem uma altura mínima de toque garantida para variantes de botão "small"/links de texto.

**Correção sugerida:** garantir `min-height: 44px` (ou padding vertical equivalente) em todo elemento clicável em breakpoints mobile, inclusive links de texto usados como CTA secundário — aumentar a área de toque via padding, não necessariamente o texto visível.

---

## O que já está em conformidade (não precisa mexer)

Verificado e correto, sem necessidade de ajuste:

- Sem overflow horizontal em nenhum breakpoint testado (320px até 1024px) — `scrollWidth` igual a `clientWidth` em todos os casos.
- `<meta name="viewport" content="width=device-width, initial-scale=1.0">` presente e correto.
- Grid de cards da landing (`Gestão de Pacientes / Médicos / Estabelecimentos`) empilha corretamente em coluna única no mobile, sem quebra de layout.
- Header com `position: sticky`/`fixed` funciona bem durante o scroll, inclusive com o botão de chat flutuante permanecendo acessível.
- Card de login mantém largura máxima confortável e centralizada no breakpoint tablet (768px), sem esticar para as bordas.
- Nenhum erro de console relacionado a layout/render foi disparado durante os testes.

---

## Checklist de conformidade para manter daqui pra frente

Use isto como critério de aceite antes de mergear qualquer mudança de UI:

- [ ] Todo elemento de navegação principal tem uma versão funcional abaixo de 768px (menu hambúrguer, drawer, ou nav sempre visível — nunca `display:none` sem substituto)
- [ ] Nenhum input de formulário com `font-size` menor que 16px em viewport mobile
- [ ] Todo elemento clicável (botão, link usado como CTA) com no mínimo 44×44px de área de toque em mobile
- [ ] `scrollWidth` do `body` nunca excede `clientWidth` do `documentElement` em 320px, 375px, 768px e 1024px (checar com DevTools ou script automatizado)
- [ ] Testar sempre nos breakpoints já usados pelo projeto: 640 / 768 / 1024 / 1280 / 1400px, mais o breakpoint custom de 600px
- [ ] Validar em dispositivo físico (ou emulador fiel, tipo BrowserStack) antes de cada release — este relatório usou um workaround de iframe, que reproduz o motor de layout mas não o comportamento real de touch/teclado do iOS/Android

---

## Prioridade sugerida de correção

1. Menu mobile ausente (bloqueante — sem isso, mobile não navega)
2. Font-size dos inputs de login (baixo esforço, evita fricção conhecida no iOS)
3. Alvos de toque pequenos (ajuste incremental de CSS, sem risco)
