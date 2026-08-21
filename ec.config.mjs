import { defineEcConfig, setAlpha } from 'astro-expressive-code'
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers'
import { pluginCollapsibleSections } from '@expressive-code/plugin-collapsible-sections'

// https://expressive-code.com/reference/configuration/
export default defineEcConfig({
  /* Basics */
  defaultLocale: 'en-US',
  defaultProps: {
    wrap: false,
    preserveIndent: true,
    showLineNumbers: false,
    collapseStyle: 'collapsible-auto',
  },
  minSyntaxHighlightingColorContrast: 0,

  /* Plugins */
  plugins: [pluginLineNumbers(), pluginCollapsibleSections()],

  /* Styles */
  styleOverrides: {
    borderRadius: '0.4rem',
    borderWidth: '1px',
    borderColor: 'var(--c-border-soft)',
    uiFontFamily: 'var(--font-mono)',
    uiFontSize: '1em',
    codeBackground: (context) =>
      context.theme.name === 'vitesse-dark' ? '#121212' : '#ffffff',
    codeFontFamily: 'var(--font-mono)',
    codeFontSize: '0.875rem',
    codeLineHeight: '1.55',
    codePaddingBlock: '0.85rem',
    codePaddingInline: '1rem',

    /* Editor & Terminal Frames */
    frames: {
      frameBoxShadowCssValue: '0 1px 2px rgb(15 23 42 / 0.05)',
      inlineButtonBackground: 'var(--c-text)',
      inlineButtonBackgroundIdleOpacity: '0',
      inlineButtonBackgroundActiveOpacity: '0.08',
      inlineButtonBackgroundHoverOrFocusOpacity: '0.055',
      inlineButtonForeground: 'var(--c-text-muted)',
      terminalTitlebarBackground: ({ theme }) =>
        theme.name === 'vitesse-dark' ? '#121212' : '#ffffff',
      terminalTitlebarBorderBottomColor: 'var(--c-border-soft)',
      terminalBackground: ({ theme }) =>
        theme.name === 'vitesse-dark' ? '#121212' : '#ffffff',
      tooltipSuccessBackground: 'var(--c-text)',
      tooltipSuccessForeground: 'var(--c-bg)',
    },

    /* Text & Line Markers */
    textMarkers: {
      backgroundOpacity: '0.25',
      borderOpacity: '0.5',
    },

    /* Collapsible Sections */
    collapsibleSections: {
      closedBackgroundColor: ({ theme }) =>
        setAlpha(theme.colors['editor.foldBackground'], 0.06) ||
        'rgb(84 174 255 / 20%)',
    },
  },

  /* Theme */
  themes: ['vitesse-dark', 'vitesse-light'],
  themeCssRoot: ':root',
  themeCssSelector: (theme) =>
    theme.name === 'vitesse-dark' ? ':root.dark' : ':root:not(.dark)',
  useDarkModeMediaQuery: false,
  useStyleReset: false,
})
