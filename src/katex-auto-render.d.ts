declare module 'katex/contrib/auto-render' {
  import type { KatexOptions } from 'katex'

  interface MathDelimiter {
    left: string
    right: string
    display: boolean
  }

  interface AutoRenderOptions extends KatexOptions {
    delimiters?: readonly MathDelimiter[]
    ignoredTags?: readonly (keyof HTMLElementTagNameMap)[]
    ignoredClasses?: string[]
    errorCallback?: (message: string, error: Error) => void
  }

  export default function renderMathInElement(
    element: HTMLElement,
    options?: AutoRenderOptions
  ): void
}
