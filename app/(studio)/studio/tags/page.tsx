"use client";

import { Button, Card, Chip, SearchField, Spinner } from "@heroui/react";
import { Pencil, Plus, Tags } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { DeleteTagButton } from "@/components/tags/delete-tag-button";
import { TagModal } from "@/components/tags/tag-modal";

interface TagData { id: string; name: string; slug: string; postCount: number }

export default function TagsPage() {
  const [tags, setTags] = useState<TagData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagData>();
  const [searchQuery, setSearchQuery] = useState("");

  const fetchTags = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/tags");
      if (!response.ok) throw new Error("标签加载失败");
      setTags(await response.json() as TagData[]);
    } catch (error) { toast.error(error instanceof Error ? error.message : "标签加载失败"); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { void fetchTags(); }, [fetchTags]);
  const filteredTags = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return query ? tags.filter((tag) => tag.name.toLocaleLowerCase().includes(query) || tag.slug.toLocaleLowerCase().includes(query)) : tags;
  }, [searchQuery, tags]);
  const maxPostCount = Math.max(...tags.map((tag) => tag.postCount), 1);

  function createTag() { setEditingTag(undefined); setModalOpen(true); }
  function editTag(tag: TagData) { setEditingTag(tag); setModalOpen(true); }
  function closeModal() { setModalOpen(false); setEditingTag(undefined); void fetchTags(); }

  return (
    <main className="studio-dashboard studio-management-page">
      <section className="studio-page-heading">
        <div><p className="studio-eyebrow">Taxonomy</p><h1>标签管理</h1><p>共 {tags.length} 个标签，用于内容检索与主题聚合。</p></div>
        <Button onPress={createTag}><Plus className="size-4" />新建标签</Button>
      </section>

      <Card className="studio-panel">
        <Card.Header className="studio-panel-heading studio-management-toolbar">
          <span><Card.Title className="flex items-center gap-2 text-sm"><Tags className="size-4" />标签列表</Card.Title><Card.Description className="mt-1 text-xs">{searchQuery ? `找到 ${filteredTags.length} 个匹配项` : "颜色深度表示关联文章数量。"}</Card.Description></span>
          <SearchField aria-label="搜索标签" value={searchQuery} onChange={setSearchQuery} variant="secondary">
            <SearchField.Group><SearchField.SearchIcon /><SearchField.Input className="w-64" placeholder="搜索名称或 Slug" /><SearchField.ClearButton /></SearchField.Group>
          </SearchField>
        </Card.Header>
        <Card.Content className="studio-taxonomy-content">
          {isLoading ? <div className="studio-empty-state"><Spinner size="sm" />加载标签</div> : filteredTags.length ? (
            <div className="studio-tag-list">
              {filteredTags.map((tag) => {
                const intensity = tag.postCount / maxPostCount;
                return <article key={tag.id} className="studio-tag-item" data-intensity={intensity > .66 ? "high" : intensity > .33 ? "medium" : "low"}>
                  <Chip color={intensity > .66 ? "accent" : "default"} variant={intensity > .33 ? "soft" : "secondary"}>{tag.name}</Chip>
                  <span className="studio-tag-slug">/{tag.slug}</span>
                  <span className="studio-tag-count">{tag.postCount} 篇</span>
                  <div className="studio-row-actions"><Button aria-label={`编辑标签 ${tag.name}`} isIconOnly onPress={() => editTag(tag)} size="sm" variant="ghost"><Pencil className="size-3.5" /></Button><DeleteTagButton id={tag.id} name={tag.name} onDeleted={fetchTags} /></div>
                </article>;
              })}
            </div>
          ) : <div className="studio-empty-state">{searchQuery ? "未找到匹配的标签" : "暂无标签，点击“新建标签”添加"}</div>}
        </Card.Content>
      </Card>
      <TagModal open={modalOpen} onClose={closeModal} tag={editingTag} />
    </main>
  );
}
