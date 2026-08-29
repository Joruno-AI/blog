"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot, Database, ExternalLink, FileText, FolderTree, Image, LayoutDashboard,
  LogOut, Music2, Settings, Tags, User, UserRound,
} from "lucide-react";

import { MiniPlayer } from "@/components/music/mini-player";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarProvider, SidebarRail, SidebarSeparator, SidebarTrigger,
} from "@/components/ui/sidebar";
import { signOut } from "@/lib/auth/client";

const navigation = [
  { href: "/studio", label: "仪表盘", icon: LayoutDashboard },
  { href: "/studio/content", label: "内容管理", icon: FolderTree },
  { href: "/studio/resources", label: "资源中心", icon: Database },
  { href: "/studio/tags", label: "标签管理", icon: Tags },
  { href: "/studio/media", label: "媒体库", icon: Image },
  { href: "/studio/music", label: "音乐管理", icon: Music2 },
];

const accountNavigation = [
  { href: "/studio/profile", label: "个人信息", icon: UserRound },
  { href: "/studio/settings/ai", label: "AI 助手", icon: Bot },
  { href: "/studio/settings", label: "设置", icon: Settings },
];

function isCurrent(pathname: string, href: string) {
  if (href === "/studio") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const current = [...navigation, ...accountNavigation].find((item) => isCurrent(pathname, item.href));

  async function logout() {
    try {
      await signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/login"; } } });
    } catch {
      window.location.href = "/login";
    }
  }

  return (
    <SidebarProvider className="studio-shell">
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="lg" tooltip="数字产品工作台">
                <Link href="/studio">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><FileText className="size-4" /></span>
                  <span className="grid flex-1 text-left leading-tight"><strong className="truncate text-sm">数字产品工作台</strong><small className="truncate text-xs text-muted-foreground">Joruno Studio</small></span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>内容与资产</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{navigation.map(({ href, label, icon: Icon }) => <SidebarMenuItem key={href}><SidebarMenuButton asChild isActive={isCurrent(pathname, href)} tooltip={label}><Link href={href}><Icon /><span>{label}</span></Link></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>账户与系统</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{accountNavigation.map(({ href, label, icon: Icon }) => <SidebarMenuItem key={href}><SidebarMenuButton asChild isActive={isCurrent(pathname, href)} tooltip={label}><Link href={href}><Icon /><span>{label}</span></Link></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu><SidebarMenuItem><SidebarMenuButton asChild size="lg" tooltip="个人账户"><Link href="/studio/profile"><Avatar className="size-8"><AvatarFallback>W</AvatarFallback></Avatar><span className="grid flex-1 text-left leading-tight"><strong className="truncate text-sm">wsl1710642275</strong><small className="truncate text-xs text-muted-foreground">管理员</small></span></Link></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-h-svh overflow-hidden">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-background/92 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75">
          <SidebarTrigger />
          <div className="h-4 w-px bg-border" />
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-foreground">{current?.label || "数字产品工作台"}</p><p className="hidden truncate text-xs text-muted-foreground sm:block">统一维护公开站点、内容和数字资产</p></div>
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link href="/" target="_blank">查看站点<ExternalLink /></Link></Button>
          <AnimatedThemeToggler />
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full"><Avatar className="size-7"><AvatarFallback><User className="size-3.5" /></AvatarFallback></Avatar><span className="sr-only">打开账户菜单</span></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52"><DropdownMenuLabel>管理员账户</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem asChild><Link href="/studio/profile"><UserRound />个人信息</Link></DropdownMenuItem><DropdownMenuItem asChild><Link href="/studio/settings"><Settings />设置</Link></DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onSelect={logout}><LogOut />退出登录</DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu>
        </header>
        <div className="min-h-0 flex-1 overflow-auto bg-muted/25">{children}</div>
        <MiniPlayer />
      </SidebarInset>
    </SidebarProvider>
  );
}
