import { useEffect } from 'react'

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

    const observe = () => {
      document.querySelectorAll(selector).forEach((el) => observer.observe(el))
    }

    observe()

    // Re-observe quando o DOM mudar (navegação entre páginas SPA)
    const mutationObserver = new MutationObserver(observe)
    mutationObserver.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      mutationObserver.disconnect()
    }
  }, [])
}
