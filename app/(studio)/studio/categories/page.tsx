'use client'

import { Button, Card, Spinner } from '@heroui/react'
import { FolderTree, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { CategoryModal } from '@/components/categories/category-modal'
import { CategoryTree, TreeCategory } from '@/components/categories/category-tree'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<TreeCategory[]>([])
  const [flatCategories, setFlatCategories] = useState<TreeCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<TreeCategory>()
  const [defaultParentId, setDefaultParentId] = useState<string>()

  async function fetchCategories() {
    try {
      const response = await fetch('/api/categories/tree')
      if (!response.ok) throw new Error('分类加载失败')
      const data = await response.json() as TreeCategory[]
      setCategories(data)
      const flatten = (nodes: TreeCategory[], result: TreeCategory[] = []): TreeCategory[] => {
        for (const node of nodes) { result.push(node); if (node.children.length) flatten(node.children, result) }
        return result
      }
      setFlatCategories(flatten(data))
    } catch (error) { toast.error(error instanceof Error ? error.message : '分类加载失败') }
    finally { setIsLoading(false) }
  }

  useEffect(() => { void fetchCategories() }, [])
  function openCreate() { setEditingCategory(undefined); setDefaultParentId(undefined); setModalOpen(true) }
  function openEdit(category: TreeCategory) { setEditingCategory(category); setDefaultParentId(undefined); setModalOpen(true) }
  function addChild(parentId: string) { setEditingCategory(undefined); setDefaultParentId(parentId); setModalOpen(true) }
  function closeModal() { setModalOpen(false); setEditingCategory(undefined); setDefaultParentId(undefined); void fetchCategories() }
  async function reorder(updates: Array<{ id: string; parentId: string | null; order: number }>) {
    const response = await fetch('/api/categories/reorder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates }) })
    if (!response.ok) throw new Error('分类排序失败')
    await fetchCategories()
  }
  const count = (nodes: TreeCategory[]): number => nodes.reduce((total, node) => total + 1 + count(node.children), 0)

  return (
    <main className="studio-dashboard studio-management-page">
      <section className="studio-page-heading">
        <div><p className="studio-eyebrow">Taxonomy</p><h1>分类管理</h1><p>共 {count(categories)} 个分类，拖拽可调整顺序和层级。</p></div>
        <Button onPress={openCreate}><Plus className="size-4" />新建分类</Button>
      </section>
      <Card className="studio-panel">
        <Card.Header className="studio-panel-heading"><span><Card.Title className="flex items-center gap-2 text-sm"><FolderTree className="size-4" />分类目录</Card.Title><Card.Description className="mt-1 text-xs">展开节点查看子分类，拖动手柄调整同级顺序。</Card.Description></span></Card.Header>
        <Card.Content className="studio-taxonomy-content">
          {isLoading ? <div className="studio-empty-state"><Spinner size="sm" />加载分类</div> : categories.length ? <CategoryTree categories={categories} onEdit={openEdit} onAddChild={addChild} onDeleted={fetchCategories} onReorder={reorder} /> : <div className="studio-empty-state">暂无分类，点击“新建分类”添加</div>}
        </Card.Content>
      </Card>
      <CategoryModal open={modalOpen} onClose={closeModal} category={editingCategory} categories={flatCategories} defaultParentId={defaultParentId} />
    </main>
  )
}
