'use client'

import { Download, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

interface ExportPostButtonProps {
  id: string
  slug: string
}

export function ExportPostButton({ id, slug }: ExportPostButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleExport = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/posts/${id}/export`)

      if (!res.ok) {
        throw new Error('Export failed')
      }

      const content = await res.text()
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `${slug}.mdx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('导出成功')
    } catch (error) {
      console.error('Error exporting:', error)
      toast.error('导出失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={() => void handleExport()} disabled={isLoading}>
      {isLoading ? <Loader2 className="animate-spin" /> : <Download />}导出 MDX
    </Button>
  )
}
