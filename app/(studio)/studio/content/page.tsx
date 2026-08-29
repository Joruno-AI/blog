"use client";

import { AlertDialog, Button, Card, Checkbox, Chip, Dropdown, Input, Label, ListBox, Select, Spinner, Table, TextField } from "@heroui/react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CategoryModal } from "@/components/categories/category-modal";
import { DeletePostButton } from "@/components/posts/delete-post-button";
import { cn } from "@/lib/utils";

interface Post {
  id: string;
  title: string;
  slug: string;
  pubDate: Date | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  order: number;
  level: number;
  path: string;
  postCount: number;
  totalPostCount: number;
  children: Category[];
  posts: Post[];
}

interface ContentData {
  categories: Category[];
  uncategorizedPosts: Post[];
}

const UNCATEGORIZED_ID = "__uncategorized__";

function flattenCategories(categories: Category[]): Category[] {
  return categories.flatMap((category) => [category, ...flattenCategories(category.children)]);
}

function findCategory(categories: Category[], id: string): Category | null {
  for (const category of categories) {
    if (category.id === id) return category;
    const nested = findCategory(category.children, id);
    if (nested) return nested;
  }
  return null;
}

function filterCategories(categories: Category[], keyword: string): Category[] {
  const query = keyword.trim().toLocaleLowerCase();
  if (!query) return categories;
  return categories.flatMap((category) => {
    const children = filterCategories(category.children, keyword);
    const matches = category.name.toLocaleLowerCase().includes(query) || category.posts.some((post) => post.title.toLocaleLowerCase().includes(query));
    return matches || children.length ? [{ ...category, children }] : [];
  });
}

export default function ContentPage() {
  const router = useRouter();
  const [data, setData] = useState<ContentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>();
  const [parentCategoryId, setParentCategoryId] = useState<string | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<Category | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/content");
      if (!response.ok) throw new Error("内容加载失败");
      const result = await response.json() as ContentData;
      setData(result);
      setSelectedCategoryId((current) => {
        if (current === UNCATEGORIZED_ID && result.uncategorizedPosts.length) return current;
        if (current && findCategory(result.categories, current)) return current;
        return result.categories[0]?.id ?? (result.uncategorizedPosts.length ? UNCATEGORIZED_ID : null);
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "内容加载失败");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const allCategories = useMemo(() => data ? flattenCategories(data.categories) : [], [data]);
  const uncategorized = useMemo<Category | null>(() => data?.uncategorizedPosts.length ? {
    id: UNCATEGORIZED_ID,
    name: "未分类",
    slug: "uncategorized",
    description: "尚未归入分类的文章",
    parentId: null,
    order: -1,
    level: 0,
    path: "",
    postCount: data.uncategorizedPosts.length,
    totalPostCount: data.uncategorizedPosts.length,
    children: [],
    posts: data.uncategorizedPosts,
  } : null, [data]);
  const selectedCategory = selectedCategoryId === UNCATEGORIZED_ID ? uncategorized : selectedCategoryId && data ? findCategory(data.categories, selectedCategoryId) : null;
  const filteredTree = useMemo(() => data ? filterCategories(data.categories, searchKeyword) : [], [data, searchKeyword]);

  useEffect(() => {
    if (!searchKeyword.trim() || !data) return;
    const query = searchKeyword.toLocaleLowerCase();
    const next = new Set<string>();
    const visit = (categories: Category[], parents: string[]) => {
      for (const category of categories) {
        const path = [...parents, category.id];
        if (category.name.toLocaleLowerCase().includes(query) || category.posts.some((post) => post.title.toLocaleLowerCase().includes(query))) path.forEach((id) => next.add(id));
        visit(category.children, path);
      }
    };
    visit(data.categories, []);
    setExpandedIds(next);
  }, [data, searchKeyword]);

  const filteredPosts = useMemo(() => {
    if (!selectedCategory) return [];
    const query = searchKeyword.trim().toLocaleLowerCase();
    return query ? selectedCategory.posts.filter((post) => post.title.toLocaleLowerCase().includes(query)) : selectedCategory.posts;
  }, [searchKeyword, selectedCategory]);
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / pageSize));
  const paginatedPosts = filteredPosts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  function selectCategory(id: string) {
    setSelectedCategoryId(id);
    setCurrentPage(1);
    setSelectedPostIds([]);
  }

  function openCategoryModal(category?: Category, parentId?: string) {
    setEditingCategory(category);
    setParentCategoryId(parentId);
    setCategoryModalOpen(true);
  }

  function closeCategoryModal() {
    setCategoryModalOpen(false);
    setEditingCategory(undefined);
    setParentCategoryId(undefined);
    void fetchData();
  }

  async function deleteCategory(category: Category) {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("删除分类失败");
      toast.success("分类已删除");
      setDeleteCategoryTarget(null);
      if (selectedCategoryId === category.id) setSelectedCategoryId(null);
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除分类失败");
    } finally {
      setIsDeleting(false);
    }
  }

  async function batchDelete() {
    if (!selectedPostIds.length) return;
    setIsDeleting(true);
    try {
      const response = await fetch("/api/posts/batch-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedPostIds }),
      });
      if (!response.ok) throw new Error("批量删除失败");
      toast.success(`已删除 ${selectedPostIds.length} 篇文章`);
      setBatchDeleteOpen(false);
      setSelectedPostIds([]);
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "批量删除失败");
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading && !data) return <div className="studio-empty-state min-h-[60vh]"><Spinner size="sm" />加载内容</div>;
  if (!data) return <div className="studio-empty-state min-h-[60vh]"><p>暂无数据</p><Button onPress={() => void fetchData()} variant="outline">重新加载</Button></div>;

  const totalPosts = allCategories.reduce((sum, category) => sum + category.postCount, 0) + data.uncategorizedPosts.length;
  const currentPageIds = paginatedPosts.map((post) => post.id);
  const selectedOnPage = currentPageIds.filter((id) => selectedPostIds.includes(id)).length;
  const selectAllState = selectedOnPage === 0 ? false : selectedOnPage === currentPageIds.length ? true : "indeterminate";

  return (
    <main className="studio-dashboard studio-content-page">
      {isDeleting ? <div className="studio-busy-overlay"><Card className="studio-panel"><Card.Content className="flex items-center gap-2 p-4"><Spinner size="sm" />正在处理</Card.Content></Card></div> : null}

      <section className="studio-page-heading">
        <div><p className="studio-eyebrow">Editorial</p><h1>内容管理</h1><p>{allCategories.length} 个分类 · {totalPosts} 篇文章</p></div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="studio-search-field sm:w-72"><Search className="size-4" /><TextField className="flex-1" value={searchKeyword} onChange={setSearchKeyword}><Input placeholder="搜索分类或文章" /></TextField>{searchKeyword ? <Button aria-label="清除搜索" isIconOnly onPress={() => setSearchKeyword("")} size="sm" variant="ghost"><X className="size-4" /></Button> : null}</div>
          <Button onPress={() => openCategoryModal()} variant="outline"><Plus className="size-4" />新建分类</Button>
          <Button onPress={() => router.push(`/studio/posts/create${selectedCategory && selectedCategory.id !== UNCATEGORIZED_ID ? `?categoryId=${selectedCategory.id}` : ""}`)}><FilePlus2 className="size-4" />写文章</Button>
        </div>
      </section>

      <div className="studio-content-workspace">
        <Card className="studio-panel min-h-0 overflow-hidden">
          <Card.Header className="studio-panel-heading"><span><Card.Title className="flex items-center gap-2 text-sm"><Folder className="size-4" />分类目录</Card.Title><Card.Description className="mt-1 text-xs">选择分类查看文章。</Card.Description></span></Card.Header>
          <Card.Content className="studio-category-browser">
            {uncategorized ? <CategoryNode category={uncategorized} selectedId={selectedCategoryId} expandedIds={expandedIds} onSelect={selectCategory} onToggle={() => {}} /> : null}
            {filteredTree.length ? filteredTree.map((category) => <CategoryNode key={category.id} category={category} selectedId={selectedCategoryId} expandedIds={expandedIds} onSelect={selectCategory} onToggle={(id) => setExpandedIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} onCreatePost={(id) => router.push(`/studio/posts/create?categoryId=${id}`)} onAddChild={(id) => openCategoryModal(undefined, id)} onEdit={(category) => openCategoryModal(category)} onDelete={setDeleteCategoryTarget} />) : <div className="studio-empty-state">未找到分类</div>}
          </Card.Content>
        </Card>

        <Card className="studio-panel min-h-0 overflow-hidden">
          <Card.Header className="studio-panel-heading"><span><Card.Title className="flex items-center gap-2 text-sm">{selectedCategory ? <><FolderOpen className="size-4" />{selectedCategory.name}<Chip size="sm" variant="soft">{filteredPosts.length} 篇</Chip></> : "选择分类查看文章"}</Card.Title><Card.Description className="mt-1 text-xs">{selectedCategory?.description || "管理文章、发布时间和分类归属。"}</Card.Description></span>{selectedPostIds.length ? <Button onPress={() => setBatchDeleteOpen(true)} size="sm" variant="danger"><Trash2 className="size-4" />删除 {selectedPostIds.length} 篇</Button> : null}</Card.Header>
          <Card.Content className="studio-content-table">
            {!selectedCategory ? <div className="studio-empty-state flex-col"><FolderOpen className="size-8" />请选择左侧分类</div> : filteredPosts.length ? <>
              <Table><Table.ScrollContainer><Table.Content aria-label={`${selectedCategory.name}文章列表`} className="min-w-[680px]"><Table.Header><Table.Column><Checkbox aria-label="选择当前页全部文章" isIndeterminate={selectAllState === "indeterminate"} isSelected={selectAllState === true} onChange={(checked) => setSelectedPostIds((current) => checked ? [...new Set([...current, ...currentPageIds])] : current.filter((id) => !currentPageIds.includes(id)))} slot="selection"><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control></Checkbox></Table.Column><Table.Column isRowHeader>标题</Table.Column><Table.Column>发布日期</Table.Column><Table.Column>操作</Table.Column></Table.Header><Table.Body>{paginatedPosts.map((post) => <Table.Row key={post.id}>
                <Table.Cell><Checkbox aria-label={`选择 ${post.title}`} isSelected={selectedPostIds.includes(post.id)} onChange={(checked) => setSelectedPostIds((current) => checked ? [...current, post.id] : current.filter((id) => id !== post.id))} slot="selection"><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control></Checkbox></Table.Cell>
                <Table.Cell><Link className="flex items-center gap-2 font-medium hover:underline" href={`/studio/posts/${post.id}`}><FileText className="text-muted size-4" />{post.title}</Link><small className="text-muted mt-0.5 block truncate font-mono">{post.slug}</small></Table.Cell>
                <Table.Cell><span className="text-muted text-sm">{post.pubDate ? format(new Date(post.pubDate), "yyyy-MM-dd", { locale: zhCN }) : "-"}</span></Table.Cell>
                <Table.Cell><div className="flex justify-end gap-1"><Button aria-label={`查看 ${post.title}`} isIconOnly onPress={() => router.push(`/studio/posts/${post.id}`)} size="sm" variant="ghost"><Eye className="size-4" /></Button><Button aria-label={`编辑 ${post.title}`} isIconOnly onPress={() => router.push(`/studio/posts/${post.id}/edit`)} size="sm" variant="ghost"><Pencil className="size-4" /></Button><DeletePostButton id={post.id} title={post.title} variant="icon" onDeleted={fetchData} onDeleteStart={() => setIsDeleting(true)} onDeleteEnd={() => setIsDeleting(false)} /></div></Table.Cell>
              </Table.Row>)}</Table.Body></Table.Content></Table.ScrollContainer></Table>
              <div className="studio-table-pagination"><span>共 {filteredPosts.length} 篇 · 第 {currentPage}/{totalPages} 页</span><div className="flex items-center gap-2"><Select className="w-28" selectedKey={String(pageSize)} onSelectionChange={(key) => { setPageSize(Number(key)); setCurrentPage(1); }}><Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger><Select.Popover><ListBox>{[10,20,50,100].map((size) => <ListBox.Item id={String(size)} key={size} textValue={`${size} 条`}>{size} 条<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover></Select><Button isDisabled={currentPage <= 1} onPress={() => setCurrentPage((page) => page - 1)} size="sm" variant="outline">上一页</Button><Button isDisabled={currentPage >= totalPages} onPress={() => setCurrentPage((page) => page + 1)} size="sm" variant="outline">下一页</Button></div></div>
            </> : <div className="studio-empty-state">{searchKeyword ? "未找到匹配的文章" : "该分类下暂无文章"}</div>}
          </Card.Content>
        </Card>
      </div>

      <CategoryModal open={categoryModalOpen} onClose={closeCategoryModal} category={editingCategory} categories={allCategories} defaultParentId={parentCategoryId} />
      <AlertDialog.Backdrop isOpen={Boolean(deleteCategoryTarget)} onOpenChange={(next) => { if (!next && !isDeleting) setDeleteCategoryTarget(null); }}><AlertDialog.Container><AlertDialog.Dialog className="sm:max-w-[420px]"><AlertDialog.CloseTrigger /><AlertDialog.Header><AlertDialog.Icon status="danger" /><AlertDialog.Heading>删除分类</AlertDialog.Heading></AlertDialog.Header><AlertDialog.Body><p>确定删除“{deleteCategoryTarget?.name}”吗？{deleteCategoryTarget?.totalPostCount ? `该分类及子分类关联 ${deleteCategoryTarget.totalPostCount} 篇文章。` : ""}</p></AlertDialog.Body><AlertDialog.Footer><Button isDisabled={isDeleting} onPress={() => setDeleteCategoryTarget(null)} variant="tertiary">取消</Button><Button isDisabled={isDeleting} onPress={() => deleteCategoryTarget && void deleteCategory(deleteCategoryTarget)} variant="danger">确认删除</Button></AlertDialog.Footer></AlertDialog.Dialog></AlertDialog.Container></AlertDialog.Backdrop>
      <AlertDialog.Backdrop isOpen={batchDeleteOpen} onOpenChange={(next) => { if (!next && !isDeleting) setBatchDeleteOpen(false); }}><AlertDialog.Container><AlertDialog.Dialog className="sm:max-w-[420px]"><AlertDialog.CloseTrigger /><AlertDialog.Header><AlertDialog.Icon status="danger" /><AlertDialog.Heading>批量删除文章</AlertDialog.Heading></AlertDialog.Header><AlertDialog.Body><p>确定删除选中的 {selectedPostIds.length} 篇文章吗？此操作不可撤销。</p></AlertDialog.Body><AlertDialog.Footer><Button isDisabled={isDeleting} onPress={() => setBatchDeleteOpen(false)} variant="tertiary">取消</Button><Button isDisabled={isDeleting} onPress={() => void batchDelete()} variant="danger">确认删除</Button></AlertDialog.Footer></AlertDialog.Dialog></AlertDialog.Container></AlertDialog.Backdrop>
    </main>
  );
}

interface CategoryNodeProps {
  category: Category;
  selectedId: string | null;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onCreatePost?: (id: string) => void;
  onAddChild?: (id: string) => void;
  onEdit?: (category: Category) => void;
  onDelete?: (category: Category) => void;
}

function CategoryNode(props: CategoryNodeProps) {
  const { category, selectedId, expandedIds, onSelect, onToggle, onCreatePost, onAddChild, onEdit, onDelete } = props;
  const expanded = expandedIds.has(category.id);
  const hasChildren = category.children.length > 0;
  const virtual = category.id === UNCATEGORIZED_ID;
  return <div>
    <div className={cn("studio-category-node group", selectedId === category.id && "is-selected")}>
      <Button aria-label={expanded ? "折叠分类" : "展开分类"} isDisabled={!hasChildren} isIconOnly onPress={() => hasChildren && onToggle(category.id)} size="sm" variant="ghost">{hasChildren ? expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" /> : null}</Button>
      <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm" onClick={() => onSelect(category.id)}>{hasChildren && expanded ? <FolderOpen className="size-4 text-amber-500" /> : <Folder className="text-muted size-4" />}<span className="truncate">{category.name}</span><Chip className="ml-auto" size="sm" variant="soft">{category.postCount}</Chip></button>
      {!virtual ? <Dropdown><Button aria-label={`${category.name} 分类操作`} isIconOnly size="sm" variant="ghost"><MoreHorizontal className="size-4" /></Button><Dropdown.Popover placement="bottom end"><Dropdown.Menu onAction={(key) => { if (key === "post") onCreatePost?.(category.id); if (key === "child") onAddChild?.(category.id); if (key === "edit") onEdit?.(category); if (key === "delete") onDelete?.(category); }}><Dropdown.Item id="post" textValue="添加文章"><FilePlus2 className="text-muted size-4" /><Label>添加文章</Label></Dropdown.Item><Dropdown.Item id="child" textValue="添加子分类"><Plus className="text-muted size-4" /><Label>添加子分类</Label></Dropdown.Item><Dropdown.Item id="edit" textValue="编辑分类"><Pencil className="text-muted size-4" /><Label>编辑分类</Label></Dropdown.Item><Dropdown.Item id="delete" textValue="删除分类"><Trash2 className="text-danger size-4" /><Label>删除分类</Label></Dropdown.Item></Dropdown.Menu></Dropdown.Popover></Dropdown> : null}
    </div>
    {hasChildren && expanded ? <div className="studio-category-children">{category.children.map((child) => <CategoryNode key={child.id} {...props} category={child} />)}</div> : null}
  </div>;
}
