"use client";

import { Button, Card, Chip } from "@heroui/react";
import { CalendarDays, Clock3, Code2, FileText, Folder, Pencil, Tags, View } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DeletePostButton } from "@/components/posts/delete-post-button";
import { ExportPostButton } from "@/components/posts/export-post-button";
import { MarkdownPreview } from "@/components/posts/markdown-preview";

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
    <motion.main initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="studio-dashboard studio-post-detail">
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div className="flex min-w-0 items-start gap-3">
          <Button aria-label="返回内容管理" isIconOnly onPress={() => router.push("/studio/content")} variant="outline"><span aria-hidden>←</span></Button>
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
          <Button onPress={() => router.push(`/studio/posts/${post.id}/edit`)}><Pencil className="size-4" />编辑</Button>
          <DeletePostButton id={post.id} title={post.title} />
        </div>
      </header>

      {post.excerpt ? <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground"><strong className="text-foreground">摘要：</strong>{post.excerpt}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="studio-panel min-w-0">
          <Card.Header className="studio-panel-heading"><span><Card.Title className="text-sm">文章内容</Card.Title><Card.Description className="mt-1 text-xs">在渲染预览和原始 Markdown 之间切换。</Card.Description></span><div className="studio-view-toggle"><Button onPress={() => setViewMode("preview")} size="sm" variant={viewMode === "preview" ? "secondary" : "ghost"}><View className="size-4" />预览</Button><Button onPress={() => setViewMode("source")} size="sm" variant={viewMode === "source" ? "secondary" : "ghost"}><Code2 className="size-4" />源码</Button></div></Card.Header>
          <Card.Content className="p-4 md:p-5">
            {viewMode === "preview" ? (
              <div className="post-detail-preview max-h-[calc(100vh-260px)] overflow-auto rounded-lg border bg-muted/20 p-4">
                <MarkdownPreview content={post.content} emptyText="暂无内容" />
              </div>
            ) : (
              <pre className="m-0 max-h-[calc(100vh-260px)] overflow-auto whitespace-pre-wrap break-words rounded-lg border bg-muted/20 p-4 font-mono text-xs leading-6">{post.content}</pre>
            )}
          </Card.Content>
        </Card>

        <aside className="grid content-start gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <InfoCard title="文章信息">
            <InfoRow label="分类"><Chip size="sm" variant="soft">{categoryName}</Chip></InfoRow>
            <InfoRow label="发布日期">{date(post.pubDate, true)}</InfoRow>
            <InfoRow label="更新日期">{date(post.updatedAt, true)}</InfoRow>
            <InfoRow label="创建日期">{date(post.createdAt, true)}</InfoRow>
          </InfoCard>
          <InfoCard title="标签">
            {post.postTags?.length ? <div className="flex flex-wrap gap-2">{post.postTags.map(({ tag }) => <Chip key={tag.id} size="sm" variant="soft"><Tags className="size-3" />{tag.name}</Chip>)}</div> : <p className="text-sm text-muted-foreground">暂无标签</p>}
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

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card className="studio-panel"><Card.Header className="studio-panel-heading"><Card.Title className="text-sm">{title}</Card.Title></Card.Header><Card.Content className="grid gap-3 p-4 text-sm">{children}</Card.Content></Card>;
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className="text-right">{children}</span></div>;
}
