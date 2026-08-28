import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { python } from '@codemirror/lang-python'
import { sql } from '@codemirror/lang-sql'
import { xml } from '@codemirror/lang-xml'
import { yaml } from '@codemirror/lang-yaml'
import {
  HighlightStyle,
  StreamLanguage,
  syntaxHighlighting,
} from '@codemirror/language'
import {
  c,
  cpp,
  csharp,
  java,
  kotlin,
} from '@codemirror/legacy-modes/mode/clike'
import { dockerFile } from '@codemirror/legacy-modes/mode/dockerfile'
import { go } from '@codemirror/legacy-modes/mode/go'
import { ruby } from '@codemirror/legacy-modes/mode/ruby'
import { rust } from '@codemirror/legacy-modes/mode/rust'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import { swift } from '@codemirror/legacy-modes/mode/swift'
import { toml } from '@codemirror/legacy-modes/mode/toml'
import { Compartment, EditorState, type Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { basicSetup } from 'codemirror'

export interface AgentCodeViewer {
  destroy: () => void
  revealLine: (line: number, column?: number) => void
  setTheme: (dark: boolean) => void
  showFile: (
    stateKey: string,
    source: string,
    language: string,
    syntaxPath?: string
  ) => void
}

// Vitesse-inspired semantic palette, expanded for the legacy stream parsers
// used by Rust, Go, Java and friends. Those parsers emit many generic name and
// punctuation tags, so styling only keywords and strings leaves most source
// code visually white. The broader mapping keeps the quiet Vitesse character
// while making structure readable in both blog themes.
const lightHighlight = HighlightStyle.define([
  {
    tag: [tags.comment, tags.docComment],
    color: '#6a7a70',
    fontStyle: 'italic',
  },
  {
    tag: [
      tags.keyword,
      tags.controlKeyword,
      tags.definitionKeyword,
      tags.moduleKeyword,
      tags.modifier,
      tags.operatorKeyword,
    ],
    color: '#a84a58',
  },
  { tag: [tags.self, tags.atom, tags.bool, tags.null], color: '#8656a7' },
  {
    tag: [tags.string, tags.character, tags.docString, tags.attributeValue],
    color: '#9b5545',
  },
  { tag: [tags.regexp, tags.escape], color: '#b24b80' },
  { tag: [tags.number, tags.integer, tags.float], color: '#287184' },
  {
    tag: [
      tags.definition(tags.variableName),
      tags.constant(tags.variableName),
      tags.labelName,
    ],
    color: '#8a642a',
  },
  {
    tag: [tags.function(tags.variableName), tags.macroName],
    color: '#4c732f',
  },
  { tag: tags.variableName, color: '#46566b' },
  { tag: [tags.typeName, tags.className], color: '#26766f' },
  { tag: tags.namespace, color: '#4f6d9b' },
  { tag: [tags.propertyName, tags.attributeName], color: '#7b6a22' },
  { tag: [tags.tagName, tags.annotation], color: '#a84a58' },
  {
    tag: [tags.operator, tags.definitionOperator, tags.typeOperator],
    color: '#86752d',
  },
  { tag: [tags.punctuation, tags.bracket, tags.separator], color: '#77736b' },
  { tag: [tags.meta, tags.processingInstruction], color: '#596f9c' },
  { tag: [tags.heading, tags.strong], color: '#393a34', fontWeight: '700' },
  { tag: tags.link, color: '#2f798a', textDecoration: 'underline' },
  { tag: tags.invalid, color: '#c23b3b', textDecoration: 'underline' },
])

const darkHighlight = HighlightStyle.define([
  {
    tag: [tags.comment, tags.docComment],
    color: '#758575',
    fontStyle: 'italic',
  },
  {
    tag: [
      tags.keyword,
      tags.controlKeyword,
      tags.definitionKeyword,
      tags.moduleKeyword,
      tags.modifier,
      tags.operatorKeyword,
    ],
    color: '#cb7676',
  },
  { tag: [tags.self, tags.atom, tags.bool, tags.null], color: '#d9739f' },
  {
    tag: [tags.string, tags.character, tags.docString, tags.attributeValue],
    color: '#c98a7d',
  },
  { tag: [tags.regexp, tags.escape], color: '#d9739f' },
  { tag: [tags.number, tags.integer, tags.float], color: '#4c9a91' },
  {
    tag: [
      tags.definition(tags.variableName),
      tags.constant(tags.variableName),
      tags.labelName,
    ],
    color: '#bd976a',
  },
  {
    tag: [tags.function(tags.variableName), tags.macroName],
    color: '#80a665',
  },
  { tag: tags.variableName, color: '#a8b4c6' },
  { tag: [tags.typeName, tags.className], color: '#5da994' },
  { tag: tags.namespace, color: '#6394bf' },
  { tag: [tags.propertyName, tags.attributeName], color: '#b8a965' },
  { tag: [tags.tagName, tags.annotation], color: '#cb7676' },
  {
    tag: [tags.operator, tags.definitionOperator, tags.typeOperator],
    color: '#b8a965',
  },
  { tag: [tags.punctuation, tags.bracket, tags.separator], color: '#8f8b82' },
  { tag: [tags.meta, tags.processingInstruction], color: '#6394bf' },
  { tag: [tags.heading, tags.strong], color: '#dbd7ca', fontWeight: '700' },
  { tag: tags.link, color: '#5da994', textDecoration: 'underline' },
  { tag: tags.invalid, color: '#e45b5b', textDecoration: 'underline' },
])

const editorTheme = (dark: boolean) => [
  EditorView.theme(
    {
      '&': {
        height: '100%',
        minHeight: '0',
        backgroundColor: 'var(--c-bg)',
        color: 'var(--c-text)',
        fontSize: '13px',
      },
      '.cm-scroller': {
        height: '100%',
        overflow: 'auto',
        overscrollBehavior: 'contain',
        fontFamily:
          'var(--font-mono), DM Mono, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        lineHeight: '1.72',
      },
      '.cm-content': { padding: '1rem 0 4rem' },
      '.cm-line': { padding: '0 1.25rem 0 .35rem' },
      '.cm-gutters': {
        minWidth: '2rem',
        paddingLeft: '.2rem',
        border: '0',
        backgroundColor: 'var(--c-bg)',
        color: 'var(--agent-muted)',
      },
      '.cm-lineNumbers .cm-gutterElement': { padding: '0 .3rem 0 .15rem' },
      '.cm-activeLine, .cm-activeLineGutter': {
        backgroundColor: 'transparent',
      },
      '&.cm-focused .cm-activeLine, &.cm-focused .cm-activeLineGutter': {
        backgroundColor: 'color-mix(in srgb, var(--c-text) 6%, var(--c-bg))',
      },
      '&.cm-focused .cm-activeLineGutter': { color: 'var(--c-text)' },
      '.cm-foldGutter': { width: '.65rem' },
      '.cm-foldGutter .cm-gutterElement': {
        width: '.65rem',
        padding: '0',
        color: 'var(--agent-muted)',
      },
      '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--c-text)' },
      '&.cm-focused': { outline: 'none' },
      '&.cm-focused .cm-selectionBackground, ::selection': {
        backgroundColor:
          'color-mix(in srgb, var(--c-text) 17%, transparent) !important',
      },
      '.cm-searchMatch': {
        backgroundColor: 'color-mix(in srgb, var(--c-text) 13%, var(--c-bg))',
        outline: '1px solid color-mix(in srgb, var(--c-text) 22%, transparent)',
      },
      '.cm-panels': {
        borderColor: 'var(--agent-line)',
        backgroundColor: 'var(--c-bg)',
        color: 'var(--c-text)',
      },
      '.cm-tooltip': {
        borderColor: 'var(--agent-line)',
        backgroundColor: 'var(--c-bg)',
        color: 'var(--c-text)',
      },
    },
    { dark }
  ),
  syntaxHighlighting(dark ? darkHighlight : lightHighlight),
]

function languageExtension(path: string, language: string): Extension {
  if (/\.tsx$/i.test(path)) return javascript({ typescript: true, jsx: true })
  if (/\.ts$/i.test(path)) return javascript({ typescript: true })
  if (/\.jsx$/i.test(path)) return javascript({ jsx: true })
  if (/\.(js|mjs|cjs)$/i.test(path)) return javascript()
  if (/\.(vue|svelte|astro|html?|handlebars)$/i.test(path)) return html()
  if (/\.(json|jsonc)$/i.test(path)) return json()
  if (/\.(css|scss|less)$/i.test(path)) return css()
  if (/\.(md|mdx)$/i.test(path)) return markdown()
  if (/\.py$/i.test(path)) return python()
  if (/\.ya?ml$/i.test(path)) return yaml()
  if (/\.(xml|svg)$/i.test(path)) return xml()
  if (/\.(sql)$/i.test(path)) return sql()
  if (/\.go$/i.test(path)) return StreamLanguage.define(go)
  if (/\.rs$/i.test(path)) return StreamLanguage.define(rust)
  if (/\.rb$/i.test(path)) return StreamLanguage.define(ruby)
  if (/\.(sh|bash|zsh)$/i.test(path)) return StreamLanguage.define(shell)
  if (/\.swift$/i.test(path)) return StreamLanguage.define(swift)
  if (/\.toml$/i.test(path)) return StreamLanguage.define(toml)
  if (/(^|\/)dockerfile$/i.test(path)) return StreamLanguage.define(dockerFile)
  if (/\.java$/i.test(path)) return StreamLanguage.define(java)
  if (/\.kts?$/i.test(path)) return StreamLanguage.define(kotlin)
  if (/\.cs$/i.test(path)) return StreamLanguage.define(csharp)
  if (/\.(cpp|hpp)$/i.test(path)) return StreamLanguage.define(cpp)
  if (/\.(c|h)$/i.test(path)) return StreamLanguage.define(c)
  if (language === 'javascript') return javascript()
  return []
}

export function mountAgentCodeViewer(
  container: HTMLElement,
  dark: boolean
): AgentCodeViewer {
  const theme = new Compartment()
  const states = new Map<string, EditorState>()
  const scrollPositions = new Map<string, { left: number; top: number }>()
  let currentPath = ''
  let currentDark = dark

  const createState = (path: string, source: string, language: string) =>
    EditorState.create({
      doc: source,
      extensions: [
        basicSetup,
        EditorState.readOnly.of(true),
        EditorView.contentAttributes.of({
          'aria-label': '只读代码查看器',
          'aria-readonly': 'true',
          'spellcheck': 'false',
        }),
        theme.of(editorTheme(currentDark)),
        languageExtension(path, language),
      ],
    })

  const editor = new EditorView({
    state: createState('', '', 'text'),
    parent: container,
  })
  editor.scrollDOM.tabIndex = 0
  editor.scrollDOM.setAttribute('role', 'region')
  editor.scrollDOM.setAttribute('aria-label', '只读代码查看器，可滚动')

  return {
    destroy() {
      editor.destroy()
      states.clear()
      scrollPositions.clear()
    },
    revealLine(line, column = 1) {
      if (!Number.isFinite(line) || line < 1 || line > editor.state.doc.lines)
        return
      const targetLine = editor.state.doc.line(line)
      const safeColumn = Number.isFinite(column) ? Math.max(1, column) : 1
      const position = Math.min(targetLine.to, targetLine.from + safeColumn - 1)
      container.dataset.activeLine = String(line)
      container.dataset.activeColumn = String(safeColumn)
      editor.scrollDOM.setAttribute(
        'aria-label',
        `只读代码查看器，已定位到第 ${line} 行第 ${safeColumn} 列`
      )
      editor.dispatch({
        selection: { anchor: position },
        effects: EditorView.scrollIntoView(position, { y: 'center' }),
      })
    },
    setTheme(isDark) {
      currentDark = isDark
      editor.dispatch({ effects: theme.reconfigure(editorTheme(currentDark)) })
      if (currentPath) states.set(currentPath, editor.state)
    },
    showFile(stateKey, source, language, syntaxPath = stateKey) {
      if (currentPath) {
        states.set(currentPath, editor.state)
        scrollPositions.set(currentPath, {
          left: editor.scrollDOM.scrollLeft,
          top: editor.scrollDOM.scrollTop,
        })
      }
      let state = states.get(stateKey)
      if (!state || state.doc.toString() !== source) {
        state = createState(syntaxPath, source, language)
        states.set(stateKey, state)
      }
      currentPath = stateKey
      delete container.dataset.activeLine
      delete container.dataset.activeColumn
      editor.setState(state)
      editor.dispatch({ effects: theme.reconfigure(editorTheme(currentDark)) })
      const savedScroll = scrollPositions.get(stateKey)
      editor.scrollDOM.scrollTo({
        top: savedScroll?.top ?? 0,
        left: savedScroll?.left ?? 0,
      })

      if (states.size > 20) {
        const oldest = states.keys().next().value as string | undefined
        if (oldest && oldest !== currentPath) states.delete(oldest)
      }
    },
  }
}
