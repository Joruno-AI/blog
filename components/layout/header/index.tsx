'use client'

import { usePathname } from 'next/navigation'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { ThemeSwitch } from '@/components/layout/header/theme-switch'

const pageTitles: Record<string, string> = {
  '/studio': '仪表盘',
  '/studio/content': '内容管理',
  '/studio/posts/create': '创建文章',
  '/studio/categories': '分类管理',
  '/studio/tags': '标签管理',
  '/studio/media': '媒体库',
  '/studio/settings': '系统设置',
}

export function SiteHeader() {
  const pathname = usePathname()

  // Get page title based on pathname
  const getPageTitle = () => {
    // Check for exact match first
    if (pageTitles[pathname]) {
      return pageTitles[pathname]
    }

    // Check for edit post page
    if (pathname.match(/^\/studio\/posts\/[^/]+$/)) {
      return '编辑文章'
    }

    // Check for parent routes
    for (const [route, title] of Object.entries(pageTitles)) {
      if (pathname.startsWith(route) && route !== '/studio') {
        return title
      }
    }

    return 'Blog CMS'
  }

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-sm px-4 transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) shadow-[0_1px_3px_0_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-base font-medium">{getPageTitle()}</h1>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <ThemeSwitch />
      </div>
    </header>
  )
}
