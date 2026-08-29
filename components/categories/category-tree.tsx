'use client'

import { useMemo, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  GripVertical,
  Pencil,
  Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button, Chip } from '@heroui/react'

import { cn } from '@/lib/utils'

import { DeleteCategoryButton } from './delete-category-button'

export interface TreeCategory {
  id: string
  name: string
  slug: string
  description?: string | null
  parentId: string | null
  order: number
  level: number
  path: string
  postCount: number
  totalPostCount: number
  children: TreeCategory[]
}

interface CategoryTreeProps {
  categories: TreeCategory[]
  onEdit: (category: TreeCategory) => void
  onAddChild: (parentId: string) => void
  onDeleted: () => void
  onReorder: (updates: Array<{ id: string; parentId: string | null; order: number }>) => Promise<void>
}

interface SortableItemProps {
  category: TreeCategory
  depth: number
  isExpanded: boolean
  onToggle: () => void
  onEdit: (category: TreeCategory) => void
  onAddChild: (parentId: string) => void
  onDeleted: () => void
  isDragging?: boolean
}

function SortableItem({
  category,
  depth,
  isExpanded,
  onToggle,
  onEdit,
  onAddChild,
  onDeleted,
  isDragging,
}: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({
    id: category.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  }

  const hasChildren = category.children.length > 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'mb-1 flex min-w-[620px] items-center gap-2 rounded-lg border bg-card px-3 py-2 transition-colors hover:bg-muted/40',
        isDragging && 'border-primary/40 bg-muted shadow-lg',
      )}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </div>

      {/* Indent based on depth */}
      <div style={{ width: depth * 24 }} />

      {/* Expand/Collapse toggle */}
      <div className="flex w-5 items-center justify-center">
        {hasChildren ? (
          <button type="button" onClick={onToggle} className="rounded text-muted-foreground hover:text-foreground" aria-label={isExpanded ? '收起子分类' : '展开子分类'}>
            {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        ) : null}
      </div>

      {/* Folder icon */}
      {hasChildren && isExpanded ? (
        <FolderOpen className="size-4 text-amber-500" />
      ) : (
        <Folder className="size-4 text-muted-foreground" />
      )}

      {/* Category name and path */}
      <div className="flex-1 min-w-0">
        <span className="font-medium">{category.name}</span>
        {depth > 0 && (
          <span className="ml-2 font-mono text-xs text-muted-foreground">
            /{category.path}
          </span>
        )}
      </div>

      {/* Post count */}
      <Chip variant="secondary" className="shrink-0 font-normal">
        {category.totalPostCount} 篇
      </Chip>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="sm" isIconOnly className="size-8" aria-label="添加子分类" onPress={() => onAddChild(category.id)}><Plus /></Button>
        <Button variant="ghost" size="sm" isIconOnly className="size-8" aria-label="编辑分类" onPress={() => onEdit(category)}><Pencil /></Button>
        <DeleteCategoryButton id={category.id} name={category.name} onDeleted={onDeleted} />
      </div>
    </div>
  )
}

function CategoryItem(props: SortableItemProps) {
  return <SortableItem {...props} />
}

export function CategoryTree({ categories, onEdit, onAddChild, onDeleted, onReorder }: CategoryTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Flatten tree for sortable context while preserving structure
  const flattenedItems = useMemo(() => {
    const items: Array<{ category: TreeCategory; depth: number }> = []

    const flatten = (nodes: TreeCategory[], depth: number) => {
      for (const node of nodes) {
        items.push({ category: node, depth })
        if (expandedIds.has(node.id) && node.children.length > 0) {
          flatten(node.children, depth + 1)
        }
      }
    }

    flatten(categories, 0)
    return items
  }, [categories, expandedIds])

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    // Find source and destination
    const activeIndex = flattenedItems.findIndex((item) => item.category.id === active.id)
    const overIndex = flattenedItems.findIndex((item) => item.category.id === over.id)

    if (activeIndex === -1 || overIndex === -1) return

    const activeItem = flattenedItems[activeIndex]
    const overItem = flattenedItems[overIndex]

    // Determine new parent: if dropping on item at same or deeper level, use same parent
    // If dropping on item at shallower level, use that item's parent
    let newParentId: string | null = overItem.category.parentId
    if (overItem.depth < activeItem.depth) {
      // Moving to a shallower level
      newParentId = overItem.category.parentId
    } else if (overItem.depth === activeItem.depth) {
      // Same level - keep same parent as target
      newParentId = overItem.category.parentId
    }

    // Calculate new order based on position
    const siblingItems = flattenedItems.filter(
      (item) => item.category.parentId === newParentId && item.category.id !== active.id
    )

    // Build updates for all siblings at the target level
    const updates: Array<{ id: string; parentId: string | null; order: number }> = []

    // Insert moved item at the correct position
    let newOrder = 0
    let inserted = false

    for (const sibling of siblingItems) {
      if (sibling.category.id === over.id && !inserted) {
        // Insert before this item
        updates.push({ id: active.id as string, parentId: newParentId, order: newOrder })
        newOrder++
        inserted = true
      }
      updates.push({ id: sibling.category.id, parentId: newParentId, order: newOrder })
      newOrder++
    }

    if (!inserted) {
      // Insert at the end
      updates.push({ id: active.id as string, parentId: newParentId, order: newOrder })
    }

    try {
      await onReorder(updates)
      toast.success('排序已更新')
    } catch (error) {
      console.error('Failed to reorder:', error)
      toast.error('排序失败')
    }
  }

  const activeCategory = activeId ? flattenedItems.find((item) => item.category.id === activeId)?.category : null

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <SortableContext items={flattenedItems.map((item) => item.category.id)} strategy={verticalListSortingStrategy}>
        <div className="overflow-x-auto">
          {flattenedItems.map(({ category, depth }) => (
            <CategoryItem
              key={category.id}
              category={category}
              depth={depth}
              isExpanded={expandedIds.has(category.id)}
              onToggle={() => toggleExpand(category.id)}
              onEdit={onEdit}
              onAddChild={onAddChild}
              onDeleted={onDeleted}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeCategory ? (
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-lg">
            <GripVertical className="size-4 text-muted-foreground" />
            <Folder className="size-4 text-muted-foreground" />
            <span className="font-medium">{activeCategory.name}</span>
            <Chip variant="secondary">{activeCategory.totalPostCount} 篇</Chip>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
