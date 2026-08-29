'use client'

import { Loader2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

interface DeleteCategoryButtonProps {
  id: string
  name: string
  onDeleted?: () => void
}

export function DeleteCategoryButton({ id, name, onDeleted }: DeleteCategoryButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!window.confirm(`确定要删除分类「${name}」吗？`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete category')
      toast.success('分类已删除')
      onDeleted?.()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('删除失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="ghost" size="icon" title="删除分类" className="size-8 text-destructive hover:text-destructive" disabled={loading} onClick={() => void handleDelete()}>
      {loading ? <Loader2 className="animate-spin" /> : <Trash2 />}
      <span className="sr-only">删除分类</span>
    </Button>
  )
}
