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
  revealLine: (line: number) => void
  setTheme: (dark: boolean) => void
  showFile: (path: string, source: string, language: string) => void
}

const lightHighlight = HighlightStyle.define([
  { tag: tags.comment, color: '#8a817a', fontStyle: 'italic' },
  { tag: [tags.keyword, tags.operatorKeyword], color: '#9b3d55' },
  { tag: [tags.string, tags.special(tags.string)], color: '#507d45' },
  { tag: [tags.number, tags.bool, tags.null], color: '#8c5f16' },
  { tag: [tags.function(tags.variableName), tags.labelName], color: '#2d6794' },
  { tag: [tags.typeName, tags.className, tags.namespace], color: '#6f4f9b' },
  { tag: [tags.propertyName, tags.attributeName], color: '#2b7774' },
  { tag: [tags.heading, tags.strong], color: '#292524', fontWeight: '700' },
  { tag: tags.link, color: '#2d6794', textDecoration: 'underline' },
])

const darkHighlight = HighlightStyle.define([
  { tag: tags.comment, color: '#78716c', fontStyle: 'italic' },
  { tag: [tags.keyword, tags.operatorKeyword], color: '#e48aa0' },
  { tag: [tags.string, tags.special(tags.string)], color: '#9fca8b' },
  { tag: [tags.number, tags.bool, tags.null], color: '#ddb56f' },
  { tag: [tags.function(tags.variableName), tags.labelName], color: '#83b7df' },
  { tag: [tags.typeName, tags.className, tags.namespace], color: '#c4a7e7' },
  { tag: [tags.propertyName, tags.attributeName], color: '#79c5c0' },
  { tag: [tags.heading, tags.strong], color: '#f5f5f4', fontWeight: '700' },
  { tag: tags.link, color: '#83b7df', textDecoration: 'underline' },
])

const editorTheme = (dark: boolean) => [
  EditorView.theme(
    {
      '&': {
        height: '100%',
        backgroundColor: 'var(--c-bg)',
        color: 'var(--c-text)',
        fontSize: '13px',
      },
      '.cm-scroller': {
        fontFamily:
          'var(--font-mono), DM Mono, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        lineHeight: '1.72',
      },
      '.cm-content': { padding: '1rem 0 4rem' },
      '.cm-line': { padding: '0 1.25rem 0 .75rem' },
      '.cm-gutters': {
        minWidth: '3.6rem',
        paddingLeft: '.35rem',
        border: '0',
        backgroundColor: 'var(--c-bg)',
        color: 'var(--c-text-faint)',
      },
      '.cm-lineNumbers .cm-gutterElement': { padding: '0 .8rem 0 .25rem' },
      '.cm-activeLine, .cm-activeLineGutter': {
        backgroundColor: 'var(--agent-soft)',
      },
      '.cm-foldGutter .cm-gutterElement': { color: 'var(--agent-muted)' },
      '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--c-text)' },
      '&.cm-focused': { outline: 'none' },
      '&.cm-focused .cm-selectionBackground, ::selection': {
        backgroundColor: dark ? '#33485b !important' : '#d6e4f0 !important',
      },
      '.cm-searchMatch': {
        backgroundColor: dark ? '#6b5128' : '#f3d994',
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
  let currentPath = ''
  let currentDark = dark

  const createState = (path: string, source: string, language: string) =>
    EditorState.create({
      doc: source,
      extensions: [
        basicSetup,
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        theme.of(editorTheme(currentDark)),
        languageExtension(path, language),
      ],
    })

  const editor = new EditorView({
    state: createState('', '', 'text'),
    parent: container,
  })

  return {
    destroy() {
      editor.destroy()
      states.clear()
    },
    revealLine(line) {
      if (!Number.isFinite(line) || line < 1 || line > editor.state.doc.lines)
        return
      const position = editor.state.doc.line(line).from
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
    showFile(path, source, language) {
      if (currentPath) states.set(currentPath, editor.state)
      let state = states.get(path)
      if (!state || state.doc.toString() !== source) {
        state = createState(path, source, language)
        states.set(path, state)
      }
      currentPath = path
      editor.setState(state)
      editor.dispatch({ effects: theme.reconfigure(editorTheme(currentDark)) })
      editor.scrollDOM.scrollTo({ top: 0, left: 0 })

      if (states.size > 20) {
        const oldest = states.keys().next().value as string | undefined
        if (oldest && oldest !== currentPath) states.delete(oldest)
      }
    },
  }
}
