'use client'

import { AlertDialog, Button, Spinner } from '@heroui/react'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface DeleteTagButtonProps { id: string; name: string; onDeleted?: () => void }

export function DeleteTagButton({ id, name, onDeleted }: DeleteTagButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      const response = await fetch(`/api/tags/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('标签删除失败')
      toast.success('标签已删除')
      setOpen(false)
      onDeleted?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败')
    } finally { setLoading(false) }
  }

  return <>
    <Button aria-label={`删除标签 ${name}`} isIconOnly onPress={() => setOpen(true)} size="sm" variant="ghost"><Trash2 className="size-3.5" /></Button>
    <AlertDialog.Backdrop isOpen={open} onOpenChange={(next) => { if (!loading) setOpen(next) }}>
      <AlertDialog.Container>
        <AlertDialog.Dialog className="sm:max-w-[400px]">
          <AlertDialog.CloseTrigger />
          <AlertDialog.Header><AlertDialog.Icon status="danger" /><AlertDialog.Heading>删除标签</AlertDialog.Heading></AlertDialog.Header>
          <AlertDialog.Body><p>确定删除“{name}”吗？文章内容不会被删除，但会失去这个标签关联。</p></AlertDialog.Body>
          <AlertDialog.Footer>
            <Button isDisabled={loading} onPress={() => setOpen(false)} variant="tertiary">取消</Button>
            <Button isDisabled={loading} onPress={() => void handleDelete()} variant="danger">{loading ? <Spinner color="current" size="sm" /> : null}确认删除</Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  </>
}
