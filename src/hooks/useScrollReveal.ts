import { useEffect } from 'react'

const FALLBACK_MS = 1000

export function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -48px 0px' },
    )

    const selector = '.reveal, .reveal-scale, .reveal-left, .reveal-right, .stagger-children'
    const tracked = new WeakSet<Element>()
    const timers: ReturnType<typeof setTimeout>[] = []

    const observe = () => {
      document.querySelectorAll(selector).forEach((el) => {
        if (tracked.has(el)) return
        tracked.add(el)
        observer.observe(el)

        // Rede de segurança: se o IntersectionObserver não confirmar a
        // visibilidade a tempo (ex. recálculo de viewport em mobile),
        // revela mesmo assim — mas só se o elemento já estiver próximo da
        // tela, para não anular o efeito de revelar ao rolar em itens
        // genuinamente fora dela.
        timers.push(
          setTimeout(() => {
            if (el.classList.contains('visible')) return
            const rect = el.getBoundingClientRect()
            const proximo = rect.top < window.innerHeight && rect.bottom > 0
            if (proximo) el.classList.add('visible')
          }, FALLBACK_MS),
        )
      })
    }

    observe()

    // Re-observe quando o DOM mudar (navegação entre páginas SPA)
    const mutationObserver = new MutationObserver(observe)
    mutationObserver.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      mutationObserver.disconnect()
      timers.forEach(clearTimeout)
    }
  }, [])
}
