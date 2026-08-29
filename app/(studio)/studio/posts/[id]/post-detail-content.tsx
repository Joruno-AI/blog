"use client";

import { CalendarDays, Clock3, Code2, FileText, Folder, Pencil, Tags, View } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DeletePostButton } from "@/components/posts/delete-post-button";
import { ExportPostButton } from "@/components/posts/export-post-button";
import { MarkdownPreview } from "@/components/posts/markdown-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PostTag { tag: { id: string; name: string } }

interface Post {
  id: string;
  title: string;
  slug: string;
  subtitle?: string | null;
  content: string;
  excerpt?: string | null;
  pubDate: Date | null;
  updatedAt: Date | null;
  createdAt: Date;
  category?: { id: string; name: string; slug: string } | null;
  postTags?: PostTag[];
}

export function PostDetailContent({ post }: { post: Post }) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"preview" | "source">("preview");
  const categoryName = post.category?.name || "未分类";
  const wordCount = post.content.length;
  const readingTime = Math.ceil(wordCount / 500);
  const date = (value: Date | null, includeTime = false) => value ? format(new Date(value), includeTime ? "yyyy-MM-dd HH:mm" : "yyyy-MM-dd", { locale: zhCN }) : "-";

  const facts = [
    { icon: Folder, value: categoryName },
    { icon: CalendarDays, value: post.pubDate ? date(post.pubDate) : "未发布" },
    { icon: FileText, value: `${wordCount.toLocaleString()} 字` },
    { icon: Clock3, value: `约 ${readingTime} 分钟` },
  ];

  return (
    <motion.main initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 p-4 md:p-6">
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div className="flex min-w-0 items-start gap-3">
          <Button variant="outline" size="icon" title="返回内容管理" onClick={() => router.push("/studio/content")}><span aria-hidden>←</span><span className="sr-only">返回内容管理</span></Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{post.title}</h1>
            {post.subtitle ? <p className="mt-1 text-sm text-muted-foreground">{post.subtitle}</p> : null}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
              {facts.map(({ icon: Icon, value }) => <span key={value} className="flex items-center gap-1.5"><Icon className="size-3.5" />{value}</span>)}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportPostButton id={post.id} slug={post.slug} />
          <Button asChild><Link href={`/studio/posts/${post.id}/edit`}><Pencil />编辑</Link></Button>
          <DeletePostButton id={post.id} title={post.title} />
        </div>
      </header>

      {post.excerpt ? <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground"><strong className="text-foreground">摘要：</strong>{post.excerpt}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="min-w-0 gap-0 py-0 shadow-none">
          <CardHeader className="border-b px-5 py-4">
            <CardTitle className="text-sm">文章内容</CardTitle>
            <CardDescription>在渲染预览和原始 Markdown 之间切换。</CardDescription>
            <CardAction className="flex rounded-md border bg-muted/40 p-0.5">
              <ModeButton active={viewMode === "preview"} onClick={() => setViewMode("preview")}><View />预览</ModeButton>
              <ModeButton active={viewMode === "source"} onClick={() => setViewMode("source")}><Code2 />源码</ModeButton>
            </CardAction>
          </CardHeader>
          <CardContent className="p-4 md:p-5">
            {viewMode === "preview" ? (
              <div className="post-detail-preview max-h-[calc(100vh-260px)] overflow-auto rounded-lg border bg-muted/20 p-4">
                <MarkdownPreview content={post.content} emptyText="暂无内容" />
              </div>
            ) : (
              <pre className="m-0 max-h-[calc(100vh-260px)] overflow-auto whitespace-pre-wrap break-words rounded-lg border bg-muted/20 p-4 font-mono text-xs leading-6">{post.content}</pre>
            )}
          </CardContent>
        </Card>

        <aside className="grid content-start gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <InfoCard title="文章信息">
            <InfoRow label="分类"><Badge variant="secondary">{categoryName}</Badge></InfoRow>
            <InfoRow label="发布日期">{date(post.pubDate, true)}</InfoRow>
            <InfoRow label="更新日期">{date(post.updatedAt, true)}</InfoRow>
            <InfoRow label="创建日期">{date(post.createdAt, true)}</InfoRow>
          </InfoCard>
          <InfoCard title="标签">
            {post.postTags?.length ? <div className="flex flex-wrap gap-2">{post.postTags.map(({ tag }) => <Badge key={tag.id} variant="outline"><Tags />{tag.name}</Badge>)}</div> : <p className="text-sm text-muted-foreground">暂无标签</p>}
          </InfoCard>
          <InfoCard title="统计">
            <InfoRow label="字数">{wordCount.toLocaleString()} 字</InfoRow>
            <InfoRow label="预计阅读">约 {readingTime} 分钟</InfoRow>
          </InfoCard>
        </aside>
      </div>
    </motion.main>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" className={cn("flex h-7 items-center gap-1.5 rounded px-2.5 text-xs transition-colors", active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")} onClick={onClick}>{children}</button>;
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card className="gap-0 py-0 shadow-none"><CardHeader className="border-b px-4 py-3"><CardTitle className="text-sm">{title}</CardTitle></CardHeader><CardContent className="grid gap-3 p-4 text-sm">{children}</CardContent></Card>;
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className="text-right">{children}</span></div>;
}
