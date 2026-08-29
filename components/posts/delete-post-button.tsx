'use client'

import { Loader2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

interface DeletePostButtonProps {
  id: string
  title: string
  variant?: 'button' | 'icon'
  onDeleted?: () => void
  onDeleteStart?: () => void
  onDeleteEnd?: () => void
}

export function DeletePostButton({ id, title, variant = 'button', onDeleted, onDeleteStart, onDeleteEnd }: DeletePostButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!window.confirm(`确定要删除「${title}」吗？此操作不可撤销。`)) return
    setLoading(true)
    onDeleteStart?.()
    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('删除失败')
      }

      toast.success('文章已删除')
      if (onDeleted) {
        onDeleted()
      } else {
        router.refresh()
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('删除失败')
    } finally {
      setLoading(false)
      // 确保 onDeleteEnd 总是被调用
      onDeleteEnd?.()
    }
  }

  return (
    variant === 'icon' ? (
      <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" title="删除文章" disabled={loading} onClick={() => void handleDelete()}>
        {loading ? <Loader2 className="animate-spin" /> : <Trash2 />}<span className="sr-only">删除文章</span>
      </Button>
    ) : (
      <Button variant="destructive" disabled={loading} onClick={() => void handleDelete()}>
        {loading ? <Loader2 className="animate-spin" /> : <Trash2 />}删除
      </Button>
    )
  )
}
