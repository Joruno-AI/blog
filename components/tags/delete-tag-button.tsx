'use client'

import { Loader2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

interface DeleteTagButtonProps {
  id: string
  name: string
  onDeleted?: () => void
}

export function DeleteTagButton({ id, name, onDeleted }: DeleteTagButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!window.confirm(`确定要删除标签「${name}」吗？`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete tag')
      toast.success('标签已删除')
      onDeleted?.()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('删除失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" title="删除标签" disabled={loading} onClick={() => void handleDelete()}>
      {loading ? <Loader2 className="animate-spin" /> : <Trash2 />}
      <span className="sr-only">删除标签</span>
    </Button>
  )
}
