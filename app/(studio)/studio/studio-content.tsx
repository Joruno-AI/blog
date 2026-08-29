'use client'

import { format, formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ArrowRight, FilePlus2, FileText, FolderTree, ImageIcon, Tags } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NumberTicker } from '@/components/ui/number-ticker'
import { cn } from '@/lib/utils'

interface DashboardContentProps {
  stats: {
    totalPosts: number
    publishedPosts: number
    categoriesCount: number
    tagsCount: number
    mediaCount: number
  }
  categoryStats: Array<{ id: string; name: string; postCount: number }>
  recentPosts: Array<{
    id: string
    title: string
    pubDate: Date | null
    createdAt: Date
    updatedAt: Date | null
    categoryName: string | null
  }>
  monthlyPosts: Array<{ month: string; count: number }>
  topTags: Array<{ id: string; name: string; postCount: number }>
}

const panelClass = 'gap-0 py-0 shadow-none hover:shadow-sm'

function PanelHeading({ title, description, href }: { title: string; description?: string; href?: string }) {
  return (
    <CardHeader className="border-b px-5 py-4">
      <CardTitle className="text-sm">{title}</CardTitle>
      {description ? <CardDescription className="text-xs">{description}</CardDescription> : null}
      {href ? (
        <CardAction>
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <Link href={href}>查看全部<ArrowRight /></Link>
          </Button>
        </CardAction>
      ) : null}
    </CardHeader>
  )
}

export function DashboardContent({ stats, categoryStats, recentPosts, monthlyPosts, topTags }: DashboardContentProps) {
  const [mounted, setMounted] = useState(false)
  const maxCategoryPosts = Math.max(...categoryStats.map((category) => category.postCount), 1)
  const maxMonthlyPosts = Math.max(...monthlyPosts.map((month) => month.count), 1)
  const maxTagPosts = Math.max(...topTags.map((tag) => tag.postCount), 1)

  useEffect(() => setMounted(true), [])

  const statCards = [
    { title: '文章总数', value: stats.totalPosts, note: `${stats.publishedPosts} 篇已发布`, icon: FileText },
    {
      title: '分类',
      value: stats.categoriesCount,
      note: `平均 ${stats.categoriesCount ? Math.round(stats.totalPosts / stats.categoriesCount) : 0} 篇/类`,
      icon: FolderTree,
    },
    { title: '标签', value: stats.tagsCount, note: '内容检索标签', icon: Tags },
    { title: '媒体', value: stats.mediaCount, note: '图片与附件', icon: ImageIcon },
  ]

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 p-4 md:p-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Overview</p>
          <h1 className="text-2xl font-semibold tracking-tight">仪表盘</h1>
          <p className="mt-1 text-sm text-muted-foreground">集中查看公开站点的内容、分类与数字资产。</p>
        </div>
        <Button asChild><Link href="/studio/posts/create"><FilePlus2 />写文章</Link></Button>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="内容统计">
        {statCards.map(({ title, value, note, icon: Icon }) => (
          <Card key={title} className="gap-0 py-0 shadow-none hover:shadow-sm">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{title}</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
                  {mounted ? <NumberTicker value={value} /> : value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{note}</p>
              </div>
              <span className="flex size-10 items-center justify-center rounded-lg border bg-muted/50 text-foreground">
                <Icon className="size-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Card className={cn(panelClass, 'min-h-[300px]')}>
          <PanelHeading title="月度趋势" description="近 12 个月发布的文章数量" />
          <CardContent className="flex min-h-[238px] items-end gap-2 px-5 pb-5 pt-6">
            {monthlyPosts.map((item) => {
              const height = item.count ? Math.max((item.count / maxMonthlyPosts) * 100, 8) : 2
              return (
                <div key={item.month} className="group flex h-48 min-w-0 flex-1 flex-col justify-end" title={`${item.month}：${item.count} 篇文章`}>
                  <span className="mb-2 text-center text-[10px] tabular-nums text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">{item.count}</span>
                  <div className="flex flex-1 items-end">
                    <div className="w-full rounded-t-sm bg-primary/80 transition-colors group-hover:bg-primary" style={{ height: `${mounted ? height : 2}%` }} />
                  </div>
                  <span className="mt-2 truncate text-center text-[10px] text-muted-foreground">{item.month.split('-')[1]}月</span>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card className={panelClass}>
          <PanelHeading title="快速操作" description="高频内容维护入口" />
          <CardContent className="grid gap-2 p-5">
            <Button asChild className="justify-start"><Link href="/studio/posts/create"><FilePlus2 />写新文章</Link></Button>
            <Button asChild variant="outline" className="justify-start"><Link href="/studio/content"><FolderTree />内容管理</Link></Button>
            <Button asChild variant="outline" className="justify-start"><Link href="/studio/tags"><Tags />标签管理</Link></Button>
            <Button asChild variant="outline" className="justify-start"><Link href="/studio/media"><ImageIcon />媒体库</Link></Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <Card className={panelClass}>
          <PanelHeading title="分类分布" href="/studio/content" />
          <CardContent className="space-y-4 p-5">
            {categoryStats.length ? categoryStats.slice(0, 8).map((category) => (
              <div key={category.id}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                  <span className="truncate font-medium">{category.name}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{category.postCount} 篇</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary/75" style={{ width: `${mounted ? (category.postCount / maxCategoryPosts) * 100 : 0}%` }} />
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">暂无分类</p>}
          </CardContent>
        </Card>

        <Card className={panelClass}>
          <PanelHeading title="热门标签" href="/studio/tags" />
          <CardContent className="flex content-start flex-wrap gap-2 p-5">
            {topTags.length ? topTags.map((tag) => {
              const intensity = tag.postCount / maxTagPosts
              return (
                <Badge key={tag.id} variant={intensity > 0.66 ? 'default' : intensity > 0.33 ? 'secondary' : 'outline'} title={`${tag.postCount} 篇文章`}>
                  {tag.name}<span className="opacity-60">{tag.postCount}</span>
                </Badge>
              )
            }) : <p className="text-sm text-muted-foreground">暂无标签</p>}
          </CardContent>
        </Card>

        <Card className={panelClass}>
          <PanelHeading title="最近动态" href="/studio/content" />
          <CardContent className="divide-y p-0">
            {recentPosts.length ? recentPosts.slice(0, 8).map((post) => (
              <Link key={post.id} href={`/studio/posts/${post.id}`} className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-muted/50">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{post.title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {post.categoryName ? `${post.categoryName} · ` : ''}
                    {post.updatedAt
                      ? formatDistanceToNow(new Date(post.updatedAt), { addSuffix: true, locale: zhCN })
                      : format(new Date(post.createdAt), 'MM-dd', { locale: zhCN })}
                  </span>
                </span>
              </Link>
            )) : <p className="p-5 text-sm text-muted-foreground">暂无文章</p>}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
