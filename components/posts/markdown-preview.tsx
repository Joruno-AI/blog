'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'

interface MarkdownPreviewProps {
  content: string
  className?: string
  emptyText?: string
}

export function MarkdownPreview({ content, className = '', emptyText }: MarkdownPreviewProps) {
  if (!content) {
    return (
      <div className={`flex items-center justify-center h-full text-gray-400 ${className}`}>
        <p>{emptyText || '在左侧编辑器中输入 Markdown 内容，这里将实时预览...'}</p>
      </div>
    )
  }

  return (
    <div className={`markdown-preview prose prose-sm dark:prose-invert max-w-none overflow-auto ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
