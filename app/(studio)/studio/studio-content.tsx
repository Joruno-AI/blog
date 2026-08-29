'use client'

import { Button, Card, Chip } from '@heroui/react'
import { format, formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ArrowRight, FilePlus2, FileText, FolderTree, ImageIcon, Tags } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { NumberTicker } from '@/components/ui/number-ticker'

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

function PanelHeading({ title, description, action }: { title: string; description?: string; action?: () => void }) {
  return (
    <Card.Header className="studio-panel-heading">
      <span className="min-w-0">
        <Card.Title className="text-sm">{title}</Card.Title>
        {description ? <Card.Description className="mt-1 text-xs">{description}</Card.Description> : null}
      </span>
      {action ? <Button aria-label={`查看${title}`} isIconOnly onPress={action} size="sm" variant="ghost"><ArrowRight className="size-4" /></Button> : null}
    </Card.Header>
  )
}

export function DashboardContent({ stats, categoryStats, recentPosts, monthlyPosts, topTags }: DashboardContentProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const maxCategoryPosts = Math.max(...categoryStats.map((category) => category.postCount), 1)
  const maxMonthlyPosts = Math.max(...monthlyPosts.map((month) => month.count), 1)
  const maxTagPosts = Math.max(...topTags.map((tag) => tag.postCount), 1)

  useEffect(() => setMounted(true), [])

  const statCards = [
    { title: '文章总数', value: stats.totalPosts, note: `${stats.publishedPosts} 篇已发布`, icon: FileText },
    { title: '分类', value: stats.categoriesCount, note: `平均 ${stats.categoriesCount ? Math.round(stats.totalPosts / stats.categoriesCount) : 0} 篇/类`, icon: FolderTree },
    { title: '标签', value: stats.tagsCount, note: '内容检索标签', icon: Tags },
    { title: '媒体', value: stats.mediaCount, note: '图片与附件', icon: ImageIcon },
  ]

  return (
    <main className="studio-dashboard">
      <section className="studio-page-heading">
        <div>
          <p className="studio-eyebrow">Overview</p>
          <h1>仪表盘</h1>
          <p>集中查看公开站点的内容、分类与数字资产。</p>
        </div>
        <Button onPress={() => router.push('/studio/posts/create')}><FilePlus2 className="size-4" />写文章</Button>
      </section>

      <section className="studio-stat-grid" aria-label="内容统计">
        {statCards.map(({ title, value, note, icon: Icon }) => (
          <Card key={title} className="studio-stat-card" variant="secondary">
            <Card.Content>
              <div>
                <p className="text-muted text-sm">{title}</p>
                <p className="studio-stat-value">{mounted ? <NumberTicker value={value} /> : value}</p>
                <p className="text-muted mt-1 text-xs">{note}</p>
              </div>
              <span className="studio-stat-icon"><Icon className="size-4" /></span>
            </Card.Content>
          </Card>
        ))}
      </section>

      <section className="studio-primary-grid">
        <Card className="studio-panel studio-chart-panel">
          <PanelHeading title="月度趋势" description="近 12 个月发布的文章数量" />
          <Card.Content className="studio-monthly-chart">
            {monthlyPosts.map((item) => {
              const height = item.count ? Math.max((item.count / maxMonthlyPosts) * 100, 8) : 2
              return (
                <div key={item.month} className="studio-chart-column" title={`${item.month}：${item.count} 篇文章`}>
                  <span className="studio-chart-count">{item.count}</span>
                  <div className="studio-chart-track"><div className="studio-chart-bar" style={{ height: `${mounted ? height : 2}%` }} /></div>
                  <span>{item.month.split('-')[1]}月</span>
                </div>
              )
            })}
          </Card.Content>
        </Card>

        <Card className="studio-panel">
          <PanelHeading title="快速操作" description="高频内容维护入口" />
          <Card.Content className="studio-quick-actions">
            <Button fullWidth onPress={() => router.push('/studio/posts/create')}><FilePlus2 className="size-4" />写新文章</Button>
            <Button fullWidth onPress={() => router.push('/studio/content')} variant="outline"><FolderTree className="size-4" />内容管理</Button>
            <Button fullWidth onPress={() => router.push('/studio/tags')} variant="outline"><Tags className="size-4" />标签管理</Button>
            <Button fullWidth onPress={() => router.push('/studio/media')} variant="outline"><ImageIcon className="size-4" />媒体库</Button>
          </Card.Content>
        </Card>
      </section>

      <section className="studio-detail-grid">
        <Card className="studio-panel">
          <PanelHeading title="分类分布" action={() => router.push('/studio/content')} />
          <Card.Content className="studio-distribution-list">
            {categoryStats.length ? categoryStats.slice(0, 8).map((category) => (
              <div key={category.id}>
                <div className="studio-distribution-label"><span>{category.name}</span><span>{category.postCount} 篇</span></div>
                <div className="studio-progress"><div style={{ width: `${mounted ? (category.postCount / maxCategoryPosts) * 100 : 0}%` }} /></div>
              </div>
            )) : <p className="text-muted text-sm">暂无分类</p>}
          </Card.Content>
        </Card>

        <Card className="studio-panel">
          <PanelHeading title="热门标签" action={() => router.push('/studio/tags')} />
          <Card.Content className="studio-tag-cloud">
            {topTags.length ? topTags.map((tag) => (
              <Chip key={tag.id} color={tag.postCount / maxTagPosts > 0.66 ? 'accent' : 'default'} size="sm" variant="soft">
                {tag.name}<span className="opacity-55">{tag.postCount}</span>
              </Chip>
            )) : <p className="text-muted text-sm">暂无标签</p>}
          </Card.Content>
        </Card>

        <Card className="studio-panel">
          <PanelHeading title="最近动态" action={() => router.push('/studio/content')} />
          <Card.Content className="studio-recent-list">
            {recentPosts.length ? recentPosts.slice(0, 8).map((post) => (
              <button key={post.id} onClick={() => router.push(`/studio/posts/${post.id}`)} type="button">
                <span className="studio-activity-dot" />
                <span className="min-w-0 flex-1">
                  <strong>{post.title}</strong>
                  <small>{post.categoryName ? `${post.categoryName} · ` : ''}{post.updatedAt ? formatDistanceToNow(new Date(post.updatedAt), { addSuffix: true, locale: zhCN }) : format(new Date(post.createdAt), 'MM-dd', { locale: zhCN })}</small>
                </span>
              </button>
            )) : <p className="text-muted p-5 text-sm">暂无文章</p>}
          </Card.Content>
        </Card>
      </section>
    </main>
  )
}
