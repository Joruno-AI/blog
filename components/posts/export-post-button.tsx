'use client'

import { Button, Spinner } from '@heroui/react'
import { Download } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

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
    <Button variant="outline" onPress={() => void handleExport()} isDisabled={isLoading}>
      {isLoading ? <Spinner color="current" size="sm" /> : <Download className="size-4" />}导出 MDX
    </Button>
  )
}
