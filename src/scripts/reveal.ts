let listenersBound = false
let revealObserver: IntersectionObserver | null = null
let mutationObserver: MutationObserver | null = null
let pageController: AbortController | null = null

const revealSelector = [
  '.slide-enter',
  '.slide-enter-content > *:not(#desktop-aside):not(#mobile-control)',
  '.home-shell > *',
  '.reader-content > :is(h2, h3, h4, p, ul, ol, blockquote, pre, figure, table)',
  '.agent-wiki-article > :is(h2, h3, h4, p, ul, ol, blockquote, pre, figure, table)',
].join(',')

let registeredTargets = new WeakSet<HTMLElement>()

function reveal(element: HTMLElement, order = 0) {
  element.style.setProperty('--reveal-delay', `${Math.min(order * 46, 138)}ms`)
  element.classList.add('is-revealed')
  revealObserver?.unobserve(element)
}

function collectTargets(root: ParentNode = document) {
  const targets: HTMLElement[] = []

  if (root instanceof HTMLElement && root.matches(revealSelector)) {
    targets.push(root)
  }

  targets.push(...root.querySelectorAll<HTMLElement>(revealSelector))
  return targets
}

function revealBatch(targets: HTMLElement[]) {
  targets
    .sort(
      (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top
    )
    .forEach((target, index) => reveal(target, index))
}

function registerTargets(targets: HTMLElement[], initial = false) {
  const viewportLimit = window.innerHeight * 0.88
  const visible: HTMLElement[] = []

  targets.forEach((target) => {
    if (registeredTargets.has(target)) return
    registeredTargets.add(target)
    target.toggleAttribute('data-scroll-reveal', true)

    const rect = target.getBoundingClientRect()
    if (rect.bottom >= 0 && rect.top <= viewportLimit) visible.push(target)
    else revealObserver?.observe(target)
  })

  if (visible.length === 0) return

  // Initial content gets one painted hidden frame. Content injected later can
  // reveal on the next frame without flashing while its layout settles.
  if (initial) {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => revealBatch(visible))
    )
  } else {
    requestAnimationFrame(() => revealBatch(visible))
  }
}

function clearPageBindings() {
  revealObserver?.disconnect()
  revealObserver = null
  mutationObserver?.disconnect()
  mutationObserver = null
  pageController?.abort()
  pageController = null
}

function mountSlideReveal() {
  clearPageBindings()
  registeredTargets = new WeakSet<HTMLElement>()

  const body = document.body
  if (!body) return

  pageController = new AbortController()

  const targets = collectTargets()
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches
  const disabled =
    body.hasAttribute('data-no-sliding') || body.dataset.pageKind === 'music'

  if (reduceMotion || disabled || !('IntersectionObserver' in window)) {
    targets.forEach((target) => reveal(target))
    return
  }

  body.toggleAttribute('data-reveal-ready', true)
  revealObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .map((entry) => entry.target as HTMLElement)

      if (visible.length > 0) requestAnimationFrame(() => revealBatch(visible))
    },
    {
      rootMargin: '0px 0px -9% 0px',
      threshold: [0, 0.08, 0.2],
    }
  )

  registerTargets(targets, true)

  const main = document.getElementById('main')
  if (!main) return

  mutationObserver = new MutationObserver((mutations) => {
    const addedTargets = mutations.flatMap((mutation) =>
      [...mutation.addedNodes].flatMap((node) =>
        node instanceof HTMLElement ? collectTargets(node) : []
      )
    )

    if (addedTargets.length > 0) registerTargets(addedTargets)
  })
  mutationObserver.observe(main, { childList: true, subtree: true })
}

export function bindSlideReveal() {
  mountSlideReveal()
  if (listenersBound) return
  listenersBound = true
  document.addEventListener('astro:page-load', mountSlideReveal)
  document.addEventListener('astro:before-swap', clearPageBindings)
}
