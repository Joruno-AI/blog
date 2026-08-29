'use client'

import { AlertDialog, Button, Spinner } from '@heroui/react'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

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
  const [open, setOpen] = useState(false)

  const handleDelete = async () => {
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
      setOpen(false)
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

  return <>
    {variant === 'icon' ? <Button aria-label="删除文章" isDisabled={loading} isIconOnly onPress={() => setOpen(true)} size="sm" variant="ghost"><Trash2 className="text-danger size-4" /></Button> : <Button isDisabled={loading} onPress={() => setOpen(true)} variant="danger"><Trash2 className="size-4" />删除</Button>}
    <AlertDialog.Backdrop isOpen={open} onOpenChange={(next) => { if (!loading) setOpen(next) }}><AlertDialog.Container><AlertDialog.Dialog className="sm:max-w-[420px]"><AlertDialog.CloseTrigger /><AlertDialog.Header><AlertDialog.Icon status="danger" /><AlertDialog.Heading>删除文章</AlertDialog.Heading></AlertDialog.Header><AlertDialog.Body><p>确定删除“{title}”吗？此操作不可撤销。</p></AlertDialog.Body><AlertDialog.Footer><Button isDisabled={loading} onPress={() => setOpen(false)} variant="tertiary">取消</Button><Button isDisabled={loading} onPress={() => void handleDelete()} variant="danger">{loading ? <Spinner color="current" size="sm" /> : null}确认删除</Button></AlertDialog.Footer></AlertDialog.Dialog></AlertDialog.Container></AlertDialog.Backdrop>
  </>
}
