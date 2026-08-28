import { useEffect, useRef, type ReactNode } from 'react'

interface SpotlightHeroProps {
  children: ReactNode
}

/**
 * Hero com reveal em "lanterna": uma segunda imagem some por trás de uma
 * máscara em gradiente radial que segue o ponteiro, sobre um grid de linhas
 * que deriva sutilmente em direção a ele. Portado do hero do sgsm-front —
 * mesma mecânica e imagens, escopado aos próprios refs do componente (em vez
 * de consultar `document` direto) para conviver com outras rotas da SPA.
 *
 * Pointer Events unificam mouse e touch: no mouse o reveal segue o cursor em
 * hover contínuo; no toque, só existe "pointermove" enquanto o dedo está em
 * contato, então o reveal acompanha o arrastar do dedo e volta a esconder ao
 * soltar — sem precisar de um caminho de código separado para touch.
 */
export function SpotlightHero({ children }: SpotlightHeroProps) {
  const heroRef = useRef<HTMLDivElement>(null)
  const patternRef = useRef<SVGPatternElement>(null)
  const revealRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const hero = heroRef.current
    const gridPattern = patternRef.current
    const revealLayer = revealRef.current
    const maskCanvas = canvasRef.current
    const context = maskCanvas?.getContext('2d')

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!hero || !gridPattern || !revealLayer || !maskCanvas || !context || prefersReducedMotion) {
      return
    }

    const mouse = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 }
    const smooth = { ...mouse }
    const gridOffset = { x: 0, y: 0 }
    const cursorPos = { ...mouse }
    let raf = 0

    const resizeCanvas = () => {
      const bounds = hero.getBoundingClientRect()
      maskCanvas.width = bounds.width
      maskCanvas.height = bounds.height
    }

    const drawRevealMask = (cursorX: number, cursorY: number) => {
      context.clearRect(0, 0, maskCanvas.width, maskCanvas.height)

      const gradient = context.createRadialGradient(cursorX, cursorY, 0, cursorX, cursorY, 260)
      gradient.addColorStop(0, 'rgba(255,255,255,1)')
      gradient.addColorStop(0.4, 'rgba(255,255,255,1)')
      gradient.addColorStop(0.6, 'rgba(255,255,255,0.75)')
      gradient.addColorStop(0.75, 'rgba(255,255,255,0.4)')
      gradient.addColorStop(0.88, 'rgba(255,255,255,0.12)')
      gradient.addColorStop(1, 'rgba(255,255,255,0)')

      context.beginPath()
      context.arc(cursorX, cursorY, 260, 0, Math.PI * 2)
      context.fillStyle = gradient
      context.fill()

      const dataUrl = maskCanvas.toDataURL()
      revealLayer.style.maskImage = `url("${dataUrl}")`
      revealLayer.style.webkitMaskImage = `url("${dataUrl}")`
    }

    const animate = () => {
      smooth.x += (mouse.x - smooth.x) * 0.1
      smooth.y += (mouse.y - smooth.y) * 0.1

      const bounds = hero.getBoundingClientRect()
      const cx = (smooth.x - bounds.left) / bounds.width - 0.5
      const cy = (smooth.y - bounds.top) / bounds.height - 0.5

      gridOffset.x += (cx * 16 - gridOffset.x) * 0.06
      gridOffset.y += (cy * 16 - gridOffset.y) * 0.06

      cursorPos.x = smooth.x - bounds.left
      cursorPos.y = smooth.y - bounds.top

      gridPattern.setAttribute('x', gridOffset.x.toFixed(2))
      gridPattern.setAttribute('y', gridOffset.y.toFixed(2))

      drawRevealMask(cursorPos.x, cursorPos.y)

      raf = window.requestAnimationFrame(animate)
    }

    const onPointerEnter = () => hero.classList.add('is-interactive')
    const onPointerMove = (event: PointerEvent) => {
      mouse.x = event.clientX
      mouse.y = event.clientY
    }
    const onPointerLeave = () => {
      const bounds = hero.getBoundingClientRect()
      mouse.x = bounds.left + bounds.width * 0.5
      mouse.y = bounds.top + bounds.height * 0.5
      hero.classList.remove('is-interactive')
    }

    hero.addEventListener('pointerenter', onPointerEnter)
    hero.addEventListener('pointermove', onPointerMove)
    hero.addEventListener('pointerleave', onPointerLeave)
    // Reforço para touch: nem todo navegador dispara "pointerleave" ao soltar o
    // dedo (o ponto de contato só deixa de existir, não necessariamente "sai"
    // do elemento) — pointerup/pointercancel garantem que o reveal esconda.
    hero.addEventListener('pointerup', onPointerLeave)
    hero.addEventListener('pointercancel', onPointerLeave)

    resizeCanvas()
    drawRevealMask(cursorPos.x - hero.getBoundingClientRect().left, cursorPos.y - hero.getBoundingClientRect().top)

    window.addEventListener('resize', resizeCanvas)
    raf = window.requestAnimationFrame(animate)

    return () => {
      hero.removeEventListener('pointerenter', onPointerEnter)
      hero.removeEventListener('pointermove', onPointerMove)
      hero.removeEventListener('pointerleave', onPointerLeave)
      hero.removeEventListener('pointerup', onPointerLeave)
      hero.removeEventListener('pointercancel', onPointerLeave)
      window.removeEventListener('resize', resizeCanvas)
      window.cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section ref={heroRef} className="spotlight-hero">
      <svg className="spotlight-hero__grid" aria-hidden="true" width="100%" height="100%">
        <defs>
          <pattern ref={patternRef} id="sgsm-medico-spotlight-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#sgsm-medico-spotlight-grid)" />
      </svg>

      <div
        ref={revealRef}
        className="spotlight-hero__reveal"
        style={{ backgroundImage: 'url(/spotlight-reveal.png)' }}
        aria-hidden="true"
      />
      <canvas ref={canvasRef} className="spotlight-hero__mask-canvas" aria-hidden="true" />

      <div
        className="spotlight-hero__backdrop"
        style={{ backgroundImage: 'url(/spotlight-mask.png)' }}
        aria-hidden="true"
      />

      {children}
    </section>
  )
}
