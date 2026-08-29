'use client'

import { FolderTree, Loader2, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'

import { CategoryModal } from '@/components/categories/category-modal'
import { CategoryTree, TreeCategory } from '@/components/categories/category-tree'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<TreeCategory[]>([])
  const [flatCategories, setFlatCategories] = useState<TreeCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<TreeCategory | undefined>()
  const [defaultParentId, setDefaultParentId] = useState<string | undefined>()

  const fetchCategories = async () => {
    try {
      // Use the internal API that returns tree structure
      const res = await fetch('/api/categories/tree')
      if (!res.ok) throw new Error('分类加载失败')
      const data = await res.json()
      setCategories(data)

      // Flatten for the modal's parent selector
      const flatten = (nodes: TreeCategory[], result: TreeCategory[] = []): TreeCategory[] => {
        for (const node of nodes) {
          result.push(node)
          if (node.children.length > 0) {
            flatten(node.children, result)
          }
        }
        return result
      }
      setFlatCategories(flatten(data))
    } catch (error) {
      console.error('Error fetching categories:', error)
      toast.error(error instanceof Error ? error.message : '分类加载失败')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleOpenCreate = () => {
    setEditingCategory(undefined)
    setDefaultParentId(undefined)
    setModalOpen(true)
  }

  const handleOpenEdit = (category: TreeCategory) => {
    setEditingCategory(category)
    setDefaultParentId(undefined)
    setModalOpen(true)
  }

  const handleAddChild = (parentId: string) => {
    setEditingCategory(undefined)
    setDefaultParentId(parentId)
    setModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setEditingCategory(undefined)
    setDefaultParentId(undefined)
    fetchCategories()
  }

  const handleReorder = async (updates: Array<{ id: string; parentId: string | null; order: number }>) => {
    const res = await fetch('/api/categories/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    })

    if (!res.ok) {
      throw new Error('分类排序失败')
    }

    await fetchCategories()
  }

  // Count total categories
  const countCategories = (nodes: TreeCategory[]): number => {
    let count = 0
    for (const node of nodes) {
      count += 1
      count += countCategories(node.children)
    }
    return count
  }

  const totalCount = countCategories(categories)

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 p-4 md:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Taxonomy</p>
          <h1 className="text-2xl font-semibold tracking-tight">分类管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">共 {totalCount} 个分类 · 拖拽可调整顺序和层级</p>
        </div>
        <Button onClick={handleOpenCreate}><Plus />新建分类</Button>
      </div>

      <Card className="gap-0 py-0 shadow-none">
        <CardHeader className="border-b px-5 py-4">
          <CardTitle className="flex items-center gap-2 text-sm"><FolderTree className="size-4" />分类列表</CardTitle>
          <CardDescription>展开节点查看子分类，拖动左侧手柄调整同级顺序。</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-5">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />加载分类</div>
          ) : categories.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">暂无分类，点击“新建分类”添加</div>
          ) : (
            <CategoryTree categories={categories} onEdit={handleOpenEdit} onAddChild={handleAddChild} onDeleted={fetchCategories} onReorder={handleReorder} />
          )}
        </CardContent>
      </Card>

      <CategoryModal
        open={modalOpen}
        onClose={handleModalClose}
        category={editingCategory}
        categories={flatCategories}
        defaultParentId={defaultParentId}
      />
    </main>
  )
}
