"use client";

import { Loader2, Pencil, Plus, Search, Tags, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { DeleteTagButton } from "@/components/tags/delete-tag-button";
import { TagModal } from "@/components/tags/tag-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TagData {
  id: string;
  name: string;
  slug: string;
  postCount: number;
}

export default function TagsPage() {
  const [tags, setTags] = useState<TagData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagData | undefined>();
  const [searchQuery, setSearchQuery] = useState("");

  const fetchTags = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/tags");
      if (!response.ok) throw new Error("标签加载失败");
      setTags(await response.json() as TagData[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "标签加载失败");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void fetchTags(); }, [fetchTags]);

  const filteredTags = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return tags;
    return tags.filter((tag) => tag.name.toLocaleLowerCase().includes(query) || tag.slug.toLocaleLowerCase().includes(query));
  }, [searchQuery, tags]);
  const maxPostCount = Math.max(...tags.map((tag) => tag.postCount), 1);

  function createTag() {
    setEditingTag(undefined);
    setModalOpen(true);
  }

  function editTag(tag: TagData) {
    setEditingTag(tag);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingTag(undefined);
    void fetchTags();
  }

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 p-4 md:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Taxonomy</p>
          <h1 className="text-2xl font-semibold tracking-tight">标签管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">共 {tags.length} 个标签，用于内容检索与主题聚合。</p>
        </div>
        <Button onClick={createTag}><Plus />新建标签</Button>
      </div>

      <Card className="gap-0 py-0 shadow-none">
        <CardHeader className="relative border-b px-5 py-4">
          <CardTitle className="flex items-center gap-2 text-sm"><Tags className="size-4" />标签列表</CardTitle>
          <CardDescription>{searchQuery ? `找到 ${filteredTags.length} 个匹配项` : "标签颜色深度表示关联文章数量。"}</CardDescription>
          <div className="relative mt-3 w-full sm:absolute sm:right-5 sm:top-3 sm:mt-0 sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9 pr-9" value={searchQuery} placeholder="搜索名称或 Slug" onChange={(event) => setSearchQuery(event.target.value)} />
            {searchQuery ? <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearchQuery("")}><X className="size-4" /><span className="sr-only">清除搜索</span></button> : null}
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />加载标签</div>
          ) : filteredTags.length ? (
            <div className="flex flex-wrap gap-2.5">
              {filteredTags.map((tag) => {
                const intensity = tag.postCount / maxPostCount;
                return (
                  <div key={tag.id} className={cn(
                    "group flex items-center gap-1 rounded-lg border px-2.5 py-1.5 transition-colors",
                    intensity > 0.66 ? "border-primary/25 bg-primary text-primary-foreground" : intensity > 0.33 ? "border-primary/20 bg-primary/10" : "bg-muted/30",
                  )}>
                    <span className="px-1 text-sm font-medium">{tag.name}</span>
                    <Badge variant={intensity > 0.66 ? "secondary" : "outline"} className="h-5 min-w-6 justify-center px-1.5 font-mono text-[10px]">{tag.postCount}</Badge>
                    <div className="ml-1 flex items-center opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <Button variant="ghost" size="icon" className={cn("size-7", intensity > 0.66 && "hover:bg-primary-foreground/15 hover:text-primary-foreground")} title="编辑标签" onClick={() => editTag(tag)}><Pencil /><span className="sr-only">编辑标签</span></Button>
                      <DeleteTagButton id={tag.id} name={tag.name} onDeleted={fetchTags} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">{searchQuery ? "未找到匹配的标签" : "暂无标签，点击“新建标签”添加"}</div>
          )}
        </CardContent>
      </Card>

      <TagModal open={modalOpen} onClose={closeModal} tag={editingTag} />
    </main>
  );
}
