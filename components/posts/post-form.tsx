"use client";

import { Button, Card, Chip, Input, Label, ListBox, Modal, Select, Spinner, TextArea, TextField } from "@heroui/react";
import { Bot, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

import { RichTextEditor } from "./rich-text-editor";

interface Category { id: string; name: string; slug: string; parentId?: string | null; children?: Category[]; [key: string]: unknown; }
interface TagData { id: string; name: string; slug: string; [key: string]: unknown; }
interface PostTagItem { tag: TagData; [key: string]: unknown; }
interface PostData { id?: string; slug?: string; title: string; subtitle?: string | null; content: string; excerpt?: string | null; categoryId?: string | null; pubDate: Date | null; postTags?: PostTagItem[]; [key: string]: unknown; }
interface PostFormProps { post?: PostData; categories: Category[]; tags: TagData[]; submitLabel: string; headerExtra?: React.ReactNode; defaultCategoryId?: string; }
interface CategoryOption { id: string; name: string; depth: number; }

function flattenCategories(categories: Category[], depth = 0): CategoryOption[] { return categories.flatMap((category) => [{ id: category.id, name: category.name, depth }, ...flattenCategories(category.children ?? [], depth + 1)]); }
function inputDate(value: Date | null | undefined) { const date = value ? new Date(value) : new Date(); return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10); }

export function PostForm({ post, categories, tags, submitLabel, headerExtra, defaultCategoryId }: PostFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTags, setSelectedTags] = useState(post?.postTags?.map((item) => item.tag.id) ?? []);
  const [categoryId, setCategoryId] = useState(post?.categoryId || defaultCategoryId || "none");
  const [title, setTitle] = useState(post?.title || "");
  const [subtitle, setSubtitle] = useState(post?.subtitle || "");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [editorContent, setEditorContent] = useState(post?.content || "");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const categoryOptions = useMemo(() => flattenCategories(categories), [categories]);

  const handleAiGenerate = async () => {
    if (!aiTopic.trim()) { toast.error("请输入博客主题"); return; }
    setAiGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: aiTopic }) });
      const data = await response.json() as { error?: string; title?: string; subtitle?: string; excerpt?: string; categoryId?: string; content?: string; tagIds?: string[] };
      if (!response.ok) throw new Error(data.error || "生成失败");
      setTitle(data.title || ""); setSubtitle(data.subtitle || ""); setExcerpt(data.excerpt || ""); setCategoryId(data.categoryId || "none"); setEditorContent(data.content || ""); setSelectedTags(data.tagIds || []); setAiOpen(false); setAiTopic(""); toast.success("AI 内容已生成，请检查后发布");
    } catch (error) { toast.error(error instanceof Error ? error.message : "生成失败，请稍后重试"); }
    finally { setAiGenerating(false); }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editorContent.trim()) { toast.error("请输入文章内容"); return; }
    const form = new FormData(event.currentTarget);
    const payload = { title, slug: post?.slug, subtitle: subtitle || null, content: editorContent, excerpt: excerpt || null, categoryId: categoryId === "none" ? null : categoryId, pubDate: String(form.get("pubDate") || new Date().toISOString().slice(0, 10)), draft: false, toc: true, share: true, giscus: true, search: true, tagIds: selectedTags };
    setIsSubmitting(true);
    try {
      const response = await fetch(post?.id ? `/api/posts/${encodeURIComponent(post.id)}` : "/api/posts", { method: post?.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) { const data = await response.json().catch(() => ({})) as { error?: string }; throw new Error(data.error || "保存失败"); }
      toast.success(post?.id ? "文章已更新" : "文章已发布"); router.push("/studio/content");
    } catch (error) { toast.error(error instanceof Error ? error.message : "保存失败"); setIsSubmitting(false); }
  };

  return <main className="studio-dashboard studio-post-form">
    <section className="studio-page-heading"><div><p className="studio-eyebrow">Editorial</p><h1>{post ? "编辑文章" : "创建文章"}</h1><p>{post ? `修改《${post.title}》` : "撰写新的博客文章"}</p></div><div className="flex flex-wrap gap-2">{headerExtra}{!post ? <Button onPress={() => setAiOpen(true)} variant="outline"><Bot className="size-4" />AI 生成</Button> : null}<Button form="post-form" type="submit" isDisabled={isSubmitting}>{isSubmitting ? <Spinner color="current" size="sm" /> : <Save className="size-4" />}{submitLabel}</Button><Button isDisabled={isSubmitting} onPress={() => router.back()} variant="outline"><X className="size-4" />取消</Button></div></section>
    <form id="post-form" className="grid gap-5" onSubmit={(event) => void handleSubmit(event)}>
      <div className="grid gap-5 lg:grid-cols-2"><Card className="studio-panel"><Card.Header className="studio-panel-heading"><span><Card.Title className="text-base">基本信息</Card.Title><Card.Description className="mt-1 text-xs">文章标题、副标题和列表摘要。</Card.Description></span></Card.Header><Card.Content className="grid gap-4 p-5"><TextField isRequired value={title} onChange={setTitle}><Label>标题</Label><Input placeholder="文章标题" /></TextField><TextField value={subtitle} onChange={setSubtitle}><Label>副标题</Label><Input placeholder="文章副标题" /></TextField><TextField value={excerpt} onChange={setExcerpt}><Label>摘要</Label><TextArea className="min-h-24" placeholder="文章摘要，用于列表展示" /></TextField></Card.Content></Card>
        <Card className="studio-panel"><Card.Header className="studio-panel-heading"><span><Card.Title className="text-base">发布设置</Card.Title><Card.Description className="mt-1 text-xs">发布日期、分类与标签。</Card.Description></span></Card.Header><Card.Content className="grid gap-4 p-5"><TextField defaultValue={inputDate(post?.pubDate)} type="date"><Label>发布日期</Label><Input name="pubDate" /></TextField><Select selectedKey={categoryId} onSelectionChange={(key) => setCategoryId(String(key))}><Label>分类</Label><Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger><Select.Popover><ListBox><ListBox.Item id="none" textValue="未分类">未分类<ListBox.ItemIndicator /></ListBox.Item>{categoryOptions.map((category) => <ListBox.Item id={category.id} key={category.id} textValue={category.name}><span style={{ paddingLeft: category.depth * 12 }}>{category.name}</span><ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover></Select><div className="grid gap-2"><Label>标签</Label>{selectedTags.length ? <div className="flex flex-wrap gap-1.5">{selectedTags.map((tagId) => { const tag = tags.find((item) => item.id === tagId); return tag ? <Chip key={tagId} size="sm" variant="soft">{tag.name}<button type="button" aria-label={`移除标签 ${tag.name}`} onClick={() => setSelectedTags((items) => items.filter((id) => id !== tagId))}><X className="size-3" /></button></Chip> : null; })}</div> : null}<Select placeholder="搜索并添加标签" onSelectionChange={(key) => { const id=String(key); setSelectedTags((items) => items.includes(id) ? items : [...items,id]); }}><Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger><Select.Popover><ListBox>{tags.filter((tag) => !selectedTags.includes(tag.id)).map((tag) => <ListBox.Item id={tag.id} key={tag.id} textValue={tag.name}>{tag.name}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover></Select></div></Card.Content></Card></div>
      <Card className="studio-panel"><Card.Header className="studio-panel-heading"><span><Card.Title className="text-base">文章内容</Card.Title><Card.Description className="mt-1 text-xs">支持标题、列表、代码块、链接和图片。</Card.Description></span></Card.Header><Card.Content className="p-5"><RichTextEditor value={editorContent} onChange={setEditorContent} placeholder="开始编写文章内容…" /></Card.Content></Card>
    </form>
    <Modal.Backdrop isOpen={aiOpen} onOpenChange={(open) => { if (!aiGenerating) setAiOpen(open); }}><Modal.Container><Modal.Dialog className="sm:max-w-lg"><Modal.CloseTrigger /><Modal.Header><Modal.Icon className="bg-accent-soft text-accent-soft-foreground"><Bot className="size-5" /></Modal.Icon><Modal.Heading>AI 生成博客</Modal.Heading></Modal.Header><Modal.Body><p className="text-muted mb-4 text-sm">输入主题后，AI 会生成标题、摘要、正文以及匹配的分类和标签。</p><TextField value={aiTopic} onChange={setAiTopic}><Label>博客主题</Label><TextArea className="min-h-28" disabled={aiGenerating} placeholder="例如：如何使用 React Hooks 优化性能" /></TextField>{aiGenerating ? <p className="text-muted mt-3 flex items-center gap-2 text-sm"><Spinner size="sm" />AI 正在生成内容，请稍候…</p> : null}</Modal.Body><Modal.Footer><Button isDisabled={aiGenerating} onPress={() => setAiOpen(false)} variant="tertiary">取消</Button><Button isDisabled={!aiTopic.trim() || aiGenerating} onPress={() => void handleAiGenerate()}>{aiGenerating ? <Spinner color="current" size="sm" /> : null}生成</Button></Modal.Footer></Modal.Dialog></Modal.Container></Modal.Backdrop>
  </main>;
}
