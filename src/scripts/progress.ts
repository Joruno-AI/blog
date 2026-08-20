interface ProgressController {
  activeTasks: Set<string>
  navigationBound: boolean
  progress: number
  visible: boolean
  trickleTimer?: number
  hideTimer?: number
}

type ProgressWindow = Window & {
  __siteProgressController?: ProgressController
}

const getController = () => {
  const progressWindow = window as ProgressWindow

  if (!progressWindow.__siteProgressController) {
    progressWindow.__siteProgressController = {
      activeTasks: new Set<string>(),
      navigationBound: false,
      progress: 0,
      visible: false,
    }
  }

  return progressWindow.__siteProgressController
}

const renderProgress = (controller: ProgressController) => {
  const progressBar = document.getElementById('site-progress')
  if (!progressBar) return

  progressBar.style.setProperty(
    '--site-progress-value',
    String(controller.progress)
  )
  progressBar.toggleAttribute('data-active', controller.visible)
  progressBar.setAttribute('aria-hidden', String(!controller.visible))
  progressBar.setAttribute(
    'aria-valuenow',
    String(Math.round(controller.progress * 100))
  )
}

const stopTrickle = (controller: ProgressController) => {
  if (controller.trickleTimer === undefined) return
  window.clearInterval(controller.trickleTimer)
  controller.trickleTimer = undefined
}

const beginTrickle = (controller: ProgressController) => {
  if (controller.trickleTimer !== undefined) return

  controller.trickleTimer = window.setInterval(() => {
    if (controller.activeTasks.size === 0) return
    controller.progress = Math.min(
      0.92,
      controller.progress + (0.92 - controller.progress) * 0.08
    )
    renderProgress(controller)
  }, 320)
}

export function startProgress(task: string) {
  const controller = getController()
  if (controller.activeTasks.has(task)) return

  const wasIdle = controller.activeTasks.size === 0
  controller.activeTasks.add(task)
  if (!wasIdle) return

  if (controller.hideTimer !== undefined) {
    window.clearTimeout(controller.hideTimer)
    controller.hideTimer = undefined
  }

  controller.progress = controller.visible ? controller.progress : 0.08
  if (controller.progress >= 1) controller.progress = 0.08
  controller.visible = true
  renderProgress(controller)
  beginTrickle(controller)
}

export function finishProgress(task: string) {
  const controller = getController()
  if (!controller.activeTasks.delete(task)) return
  if (controller.activeTasks.size > 0) return

  stopTrickle(controller)
  controller.progress = 1
  renderProgress(controller)

  controller.hideTimer = window.setTimeout(() => {
    if (controller.activeTasks.size > 0) return

    controller.visible = false
    renderProgress(controller)
    controller.progress = 0
    controller.hideTimer = undefined
  }, 180)
}

export function bindNavigationProgress() {
  const controller = getController()
  if (controller.navigationBound) return

  controller.navigationBound = true

  document.addEventListener('astro:before-preparation', () => {
    startProgress('navigation')
  })

  document.addEventListener('astro:page-load', () => {
    finishProgress('navigation')
  })

  document.addEventListener('astro:after-swap', () => {
    renderProgress(controller)
  })
}
