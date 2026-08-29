'use client'

import { AlertDialog, Button, Spinner } from '@heroui/react'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface DeleteCategoryButtonProps { id: string; name: string; onDeleted?: () => void }

export function DeleteCategoryButton({ id, name, onDeleted }: DeleteCategoryButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      const response = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('分类删除失败')
      toast.success('分类已删除')
      setOpen(false)
      onDeleted?.()
    } catch (error) { toast.error(error instanceof Error ? error.message : '删除失败') }
    finally { setLoading(false) }
  }

  return <>
    <Button aria-label={`删除分类 ${name}`} isIconOnly onPress={() => setOpen(true)} size="sm" variant="ghost"><Trash2 className="size-3.5" /></Button>
    <AlertDialog.Backdrop isOpen={open} onOpenChange={(next) => { if (!loading) setOpen(next) }}>
      <AlertDialog.Container><AlertDialog.Dialog className="sm:max-w-[400px]">
        <AlertDialog.CloseTrigger />
        <AlertDialog.Header><AlertDialog.Icon status="danger" /><AlertDialog.Heading>删除分类</AlertDialog.Heading></AlertDialog.Header>
        <AlertDialog.Body><p>确定删除“{name}”吗？请先确认没有文章继续依赖这个分类。</p></AlertDialog.Body>
        <AlertDialog.Footer><Button isDisabled={loading} onPress={() => setOpen(false)} variant="tertiary">取消</Button><Button isDisabled={loading} onPress={() => void handleDelete()} variant="danger">{loading ? <Spinner color="current" size="sm" /> : null}确认删除</Button></AlertDialog.Footer>
      </AlertDialog.Dialog></AlertDialog.Container>
    </AlertDialog.Backdrop>
  </>
}
