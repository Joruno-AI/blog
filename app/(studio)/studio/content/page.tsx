"use client";

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
  Loader2,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    const articles = category.totalPostCount ? `该分类及子分类下关联 ${category.totalPostCount} 篇文章。` : "";
    if (!window.confirm(`确定删除分类「${category.name}」吗？${articles}`)) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("删除分类失败");
      toast.success("分类已删除");
      if (selectedCategoryId === category.id) setSelectedCategoryId(null);
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除分类失败");
    } finally {
      setIsDeleting(false);
    }
  }

  async function batchDelete() {
    if (!selectedPostIds.length || !window.confirm(`确定删除选中的 ${selectedPostIds.length} 篇文章吗？`)) return;
    setIsDeleting(true);
    try {
      const response = await fetch("/api/posts/batch-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedPostIds }),
      });
      if (!response.ok) throw new Error("批量删除失败");
      toast.success(`已删除 ${selectedPostIds.length} 篇文章`);
      setSelectedPostIds([]);
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "批量删除失败");
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading && !data) return <div className="flex h-[calc(100vh-64px)] items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 size-5 animate-spin" />加载内容</div>;
  if (!data) return <div className="flex h-[calc(100vh-64px)] flex-col items-center justify-center gap-3 text-sm text-muted-foreground"><p>暂无数据</p><Button variant="outline" onClick={() => void fetchData()}>重新加载</Button></div>;

  const totalPosts = allCategories.reduce((sum, category) => sum + category.postCount, 0) + data.uncategorizedPosts.length;
  const currentPageIds = paginatedPosts.map((post) => post.id);
  const selectedOnPage = currentPageIds.filter((id) => selectedPostIds.includes(id)).length;
  const selectAllState = selectedOnPage === 0 ? false : selectedOnPage === currentPageIds.length ? true : "indeterminate";

  return (
    <main className="relative mx-auto flex h-[calc(100vh-64px)] w-full max-w-[1700px] flex-col gap-5 overflow-hidden p-4 md:p-6">
      {isDeleting ? <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/75 backdrop-blur-sm"><div className="rounded-lg border bg-card px-5 py-4 text-sm shadow-lg"><Loader2 className="mr-2 inline size-5 animate-spin" />正在处理</div></div> : null}

      <header className="flex shrink-0 flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Editorial</p>
          <h1 className="text-2xl font-semibold tracking-tight">内容管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">{allCategories.length} 个分类 · {totalPosts} 篇文章</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9 pr-9" value={searchKeyword} placeholder="搜索分类或文章" onChange={(event) => setSearchKeyword(event.target.value)} />
            {searchKeyword ? <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearchKeyword("")}><X className="size-4" /><span className="sr-only">清除搜索</span></button> : null}
          </div>
          <Button variant="outline" onClick={() => openCategoryModal()}><Plus />新建分类</Button>
          <Button asChild><Link href={`/studio/posts/create${selectedCategory && selectedCategory.id !== UNCATEGORIZED_ID ? `?categoryId=${selectedCategory.id}` : ""}`}><FilePlus2 />写文章</Link></Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="min-h-0 gap-0 overflow-hidden py-0 shadow-none">
          <CardHeader className="border-b px-4 py-4">
            <CardTitle className="flex items-center gap-2 text-sm"><Folder className="size-4" />分类目录</CardTitle>
            <CardDescription>选择分类查看文章。</CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto p-2">
            {uncategorized ? <CategoryNode category={uncategorized} selectedId={selectedCategoryId} expandedIds={expandedIds} onSelect={selectCategory} onToggle={() => {}} /> : null}
            {filteredTree.length ? filteredTree.map((category) => (
              <CategoryNode
                key={category.id}
                category={category}
                selectedId={selectedCategoryId}
                expandedIds={expandedIds}
                onSelect={selectCategory}
                onToggle={(id) => setExpandedIds((current) => {
                  const next = new Set(current);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })}
                onCreatePost={(id) => router.push(`/studio/posts/create?categoryId=${id}`)}
                onAddChild={(id) => openCategoryModal(undefined, id)}
                onEdit={(category) => openCategoryModal(category)}
                onDelete={(category) => void deleteCategory(category)}
              />
            )) : <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">未找到分类</div>}
          </CardContent>
        </Card>

        <Card className="min-h-0 gap-0 overflow-hidden py-0 shadow-none">
          <CardHeader className="border-b px-5 py-4">
            <CardTitle className="flex items-center gap-2 text-sm">{selectedCategory ? <><FolderOpen className="size-4" />{selectedCategory.name}<Badge variant="secondary">{filteredPosts.length} 篇</Badge></> : "选择分类查看文章"}</CardTitle>
            <CardDescription>{selectedCategory?.description || "管理文章、发布时间和分类归属。"}</CardDescription>
            {selectedPostIds.length ? <CardAction><Button size="sm" variant="destructive" onClick={() => void batchDelete()}><Trash2 />删除 {selectedPostIds.length} 篇</Button></CardAction> : null}
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            {!selectedCategory ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-muted-foreground"><FolderOpen className="size-10 opacity-30" />请从左侧选择一个分类</div>
            ) : filteredPosts.length ? (
              <>
                <div className="min-h-0 flex-1 overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-background">
                      <TableRow>
                        <TableHead className="w-12"><Checkbox checked={selectAllState} aria-label="选择当前页全部文章" onCheckedChange={(checked) => setSelectedPostIds((current) => checked === true ? [...new Set([...current, ...currentPageIds])] : current.filter((id) => !currentPageIds.includes(id)))} /></TableHead>
                        <TableHead>标题</TableHead>
                        <TableHead className="w-32">发布日期</TableHead>
                        <TableHead className="w-36 text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPosts.map((post) => (
                        <TableRow key={post.id} data-state={selectedPostIds.includes(post.id) ? "selected" : undefined}>
                          <TableCell><Checkbox checked={selectedPostIds.includes(post.id)} aria-label={`选择 ${post.title}`} onCheckedChange={(checked) => setSelectedPostIds((current) => checked === true ? [...current, post.id] : current.filter((id) => id !== post.id))} /></TableCell>
                          <TableCell><Link href={`/studio/posts/${post.id}`} className="flex items-center gap-2 font-medium hover:underline"><FileText className="size-4 text-muted-foreground" />{post.title}</Link><p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{post.slug}</p></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{post.pubDate ? format(new Date(post.pubDate), "yyyy-MM-dd", { locale: zhCN }) : "-"}</TableCell>
                          <TableCell><div className="flex justify-end gap-1"><Button asChild variant="ghost" size="icon" className="size-8"><Link href={`/studio/posts/${post.id}`} title="查看"><Eye /><span className="sr-only">查看</span></Link></Button><Button asChild variant="ghost" size="icon" className="size-8"><Link href={`/studio/posts/${post.id}/edit`} title="编辑"><Pencil /><span className="sr-only">编辑</span></Link></Button><DeletePostButton id={post.id} title={post.title} variant="icon" onDeleted={fetchData} onDeleteStart={() => setIsDeleting(true)} onDeleteEnd={() => setIsDeleting(false)} /></div></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <span>共 {filteredPosts.length} 篇 · 第 {currentPage}/{totalPages} 页</span>
                  <div className="flex items-center gap-2">
                    <Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setCurrentPage(1); }}><SelectTrigger size="sm" className="w-24"><SelectValue /></SelectTrigger><SelectContent>{[10, 20, 50, 100].map((size) => <SelectItem key={size} value={String(size)}>{size} 条</SelectItem>)}</SelectContent></Select>
                    <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => page - 1)}>上一页</Button>
                    <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => page + 1)}>下一页</Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">{searchKeyword ? "未找到匹配的文章" : "该分类下暂无文章"}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <CategoryModal open={categoryModalOpen} onClose={closeCategoryModal} category={editingCategory} categories={allCategories} defaultParentId={parentCategoryId} />
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
  return (
    <div>
      <div className={cn("group flex items-center gap-1 rounded-md px-1 py-1 transition-colors", selectedId === category.id ? "bg-accent text-accent-foreground" : "hover:bg-muted/60")}>
        <button type="button" className="flex size-7 items-center justify-center rounded text-muted-foreground" disabled={!hasChildren} onClick={() => hasChildren && onToggle(category.id)}>{hasChildren ? expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" /> : null}</button>
        <button type="button" className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left text-sm" onClick={() => onSelect(category.id)}>{hasChildren && expanded ? <FolderOpen className="size-4 text-amber-500" /> : <Folder className="size-4 text-muted-foreground" />}<span className="truncate">{category.name}</span><Badge variant="secondary" className="ml-auto h-5 min-w-6 justify-center px-1.5 text-[10px]">{category.postCount}</Badge></button>
        {!virtual ? <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-7 opacity-50 group-hover:opacity-100"><MoreHorizontal /><span className="sr-only">分类操作</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => onCreatePost?.(category.id)}><FilePlus2 />添加文章</DropdownMenuItem><DropdownMenuItem onClick={() => onAddChild?.(category.id)}><Plus />添加子分类</DropdownMenuItem><DropdownMenuItem onClick={() => onEdit?.(category)}><Pencil />编辑分类</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onClick={() => onDelete?.(category)}><Trash2 />删除分类</DropdownMenuItem></DropdownMenuContent></DropdownMenu> : null}
      </div>
      {hasChildren && expanded ? <div className="ml-4 border-l pl-1">{category.children.map((child) => <CategoryNode key={child.id} {...props} category={child} />)}</div> : null}
    </div>
  );
}
