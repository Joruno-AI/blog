"use client";

import { Bot, Loader2, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

import { RichTextEditor } from "./rich-text-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-start"><div><h1 className="text-2xl font-semibold tracking-tight">{post ? "编辑文章" : "创建文章"}</h1><p className="mt-1 text-sm text-muted-foreground">{post ? `修改《${post.title}》` : "撰写新的博客文章"}</p></div><div className="flex flex-wrap gap-2">{headerExtra}{!post && <Button variant="outline" onClick={() => setAiOpen(true)}><Bot className="size-4" />AI 生成</Button>}<Button form="post-form" type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{submitLabel}</Button><Button variant="outline" disabled={isSubmitting} onClick={() => router.back()}><X className="size-4" />取消</Button></div></div>
    <form id="post-form" className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
      <div className="grid gap-5 lg:grid-cols-2"><Card><CardHeader><CardTitle className="text-base">基本信息</CardTitle><CardDescription>文章标题、副标题和列表摘要。</CardDescription></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label htmlFor="post-title">标题</Label><Input id="post-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="文章标题" required /></div><div className="space-y-2"><Label htmlFor="post-subtitle">副标题</Label><Input id="post-subtitle" value={subtitle} onChange={(event) => setSubtitle(event.target.value)} placeholder="文章副标题" /></div><div className="space-y-2"><Label htmlFor="post-excerpt">摘要</Label><Textarea id="post-excerpt" value={excerpt} onChange={(event) => setExcerpt(event.target.value)} rows={3} placeholder="文章摘要，用于列表展示" /></div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">发布设置</CardTitle><CardDescription>发布日期、分类与标签。</CardDescription></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label htmlFor="post-date">发布日期</Label><Input id="post-date" name="pubDate" type="date" defaultValue={inputDate(post?.pubDate)} /></div><div className="space-y-2"><Label>分类</Label><Select value={categoryId} onValueChange={setCategoryId}><SelectTrigger className="w-full"><SelectValue placeholder="选择分类" /></SelectTrigger><SelectContent><SelectItem value="none">未分类</SelectItem>{categoryOptions.map((category) => <SelectItem key={category.id} value={category.id}>{"　".repeat(category.depth)}{category.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>标签</Label>{selectedTags.length > 0 && <div className="flex flex-wrap gap-1.5">{selectedTags.map((tagId) => { const tag = tags.find((item) => item.id === tagId); return tag ? <Badge key={tagId} variant="secondary" className="gap-1">{tag.name}<button type="button" aria-label={`移除标签 ${tag.name}`} onClick={() => setSelectedTags((items) => items.filter((id) => id !== tagId))}><X className="size-3" /></button></Badge> : null; })}</div>}<Select value="" onValueChange={(id) => setSelectedTags((items) => items.includes(id) ? items : [...items, id])}><SelectTrigger className="w-full"><SelectValue placeholder="搜索并添加标签" /></SelectTrigger><SelectContent>{tags.filter((tag) => !selectedTags.includes(tag.id)).map((tag) => <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>)}</SelectContent></Select></div></CardContent></Card></div>
      <Card><CardHeader><CardTitle className="text-base">文章内容</CardTitle><CardDescription>支持标题、列表、代码块、链接和图片。</CardDescription></CardHeader><CardContent><RichTextEditor value={editorContent} onChange={setEditorContent} placeholder="开始编写文章内容…" /></CardContent></Card>
    </form>
    <Dialog open={aiOpen} onOpenChange={(open) => { if (!aiGenerating) setAiOpen(open); }}><DialogContent><DialogHeader><DialogTitle className="flex items-center gap-2"><Bot className="size-5" />AI 生成博客</DialogTitle><DialogDescription>输入主题后，AI 会生成标题、摘要、正文以及匹配的分类和标签。</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="ai-topic">博客主题</Label><Textarea id="ai-topic" rows={4} value={aiTopic} disabled={aiGenerating} onChange={(event) => setAiTopic(event.target.value)} placeholder="例如：如何使用 React Hooks 优化性能" /></div>{aiGenerating && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />AI 正在生成内容，请稍候…</p>}<DialogFooter><Button variant="outline" disabled={aiGenerating} onClick={() => setAiOpen(false)}>取消</Button><Button disabled={!aiTopic.trim() || aiGenerating} onClick={() => void handleAiGenerate()}>{aiGenerating && <Loader2 className="size-4 animate-spin" />}生成</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
