"use client";

import { Avatar, Button, Dropdown, Label, Separator } from "@heroui/react";
import { AppLayout, Navbar, Sidebar } from "@heroui-pro/react";
import {
  Bot, Database, ExternalLink, FileText, FolderTree, Image, LayoutDashboard,
  LogOut, Moon, Music2, Settings, Sun, Tags, UserRound,
} from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { MiniPlayer } from "@/components/music/mini-player";
import { signOut } from "@/lib/auth/client";

const navigation = [
  { href: "/studio", label: "仪表盘", icon: LayoutDashboard },
  { href: "/studio/content", label: "内容管理", icon: FolderTree },
  { href: "/studio/resources", label: "资源中心", icon: Database },
  { href: "/studio/categories", label: "分类管理", icon: FolderTree },
  { href: "/studio/tags", label: "标签管理", icon: Tags },
  { href: "/studio/media", label: "媒体库", icon: Image },
  { href: "/studio/music", label: "音乐管理", icon: Music2 },
] as const;

const accountNavigation = [
  { href: "/studio/profile", label: "个人信息", icon: UserRound },
  { href: "/studio/settings/ai", label: "AI 助手", icon: Bot },
  { href: "/studio/settings", label: "设置", icon: Settings },
] as const;

function isCurrent(pathname: string, href: string) {
  if (href === "/studio") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function StudioBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-1 py-2">
      <span className="studio-mark" aria-hidden="true"><FileText className="size-3.5" /></span>
      <span className="min-w-0" data-sidebar={compact ? undefined : "label"}>
        <strong className="block truncate text-sm font-semibold tracking-[-0.02em]">Joruno Studio</strong>
        <small className="text-muted block truncate text-[11px]">个人数字产品平台</small>
      </span>
    </div>
  );
}

function StudioMenu({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const MenuRoot = mobile ? Sidebar.Mobile : Sidebar;

  return (
    <MenuRoot>
      <Sidebar.Header><StudioBrand compact={mobile} /></Sidebar.Header>
      <Sidebar.Content>
        <Sidebar.Group>
          <Sidebar.GroupLabel>内容与资产</Sidebar.GroupLabel>
          <Sidebar.Menu aria-label="内容与资产">
            {navigation.map(({ href, label, icon: Icon }) => (
              <Sidebar.MenuItem href={href} id={href} isCurrent={isCurrent(pathname, href)} key={href} textValue={label}>
                <Sidebar.MenuIcon><Icon className="size-4" /></Sidebar.MenuIcon>
                <Sidebar.MenuLabel>{label}</Sidebar.MenuLabel>
              </Sidebar.MenuItem>
            ))}
          </Sidebar.Menu>
        </Sidebar.Group>
        <Sidebar.Group>
          <Sidebar.GroupLabel>账户与系统</Sidebar.GroupLabel>
          <Sidebar.Menu aria-label="账户与系统">
            {accountNavigation.map(({ href, label, icon: Icon }) => (
              <Sidebar.MenuItem href={href} id={href} isCurrent={isCurrent(pathname, href)} key={href} textValue={label}>
                <Sidebar.MenuIcon><Icon className="size-4" /></Sidebar.MenuIcon>
                <Sidebar.MenuLabel>{label}</Sidebar.MenuLabel>
              </Sidebar.MenuItem>
            ))}
          </Sidebar.Menu>
        </Sidebar.Group>
      </Sidebar.Content>
      <Sidebar.Footer>
        <Sidebar.Menu aria-label="账户">
          <Sidebar.MenuItem href="/studio/profile" id="studio-account" textValue="管理员账户">
            <Sidebar.MenuIcon><UserRound className="size-4" /></Sidebar.MenuIcon>
            <Sidebar.MenuLabel>
              <span className="grid leading-tight"><strong className="truncate text-xs font-medium">wsl1710642275</strong><small className="text-muted truncate text-[11px]">管理员</small></span>
            </Sidebar.MenuLabel>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.Footer>
      {mobile ? null : <Sidebar.Rail />}
    </MenuRoot>
  );
}

function ThemeButton() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";

  return (
    <Button aria-label={dark ? "切换到浅色模式" : "切换到深色模式"} isIconOnly onPress={() => setTheme(dark ? "light" : "dark")} size="sm" variant="ghost">
      {dark ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </Button>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const current = [...navigation, ...accountNavigation].find((item) => isCurrent(pathname, item.href));

  async function logout() {
    try {
      await signOut({ fetchOptions: { onSuccess: () => router.replace("/login") } });
    } catch {
      router.replace("/login");
    }
  }

  const navbar = (
    <Navbar className="studio-navbar" maxWidth="full">
      <Navbar.Header>
        <AppLayout.MenuToggle aria-label="打开导航" className="lg:hidden" />
        <Sidebar.Trigger />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{current?.label || "数字产品工作台"}</p>
          <p className="text-muted hidden truncate text-xs sm:block">统一维护公开站点、内容与数字资产</p>
        </div>
        <Navbar.Spacer />
        <Navbar.Content>
          <Button aria-label="查看公开站点" isIconOnly onPress={() => window.open("/", "_blank", "noopener,noreferrer")} size="sm" variant="ghost"><ExternalLink className="size-4" /></Button>
          <ThemeButton />
          <Navbar.Separator />
          <Dropdown>
            <Button aria-label="打开账户菜单" isIconOnly size="sm" variant="ghost"><Avatar className="size-7" variant="soft"><Avatar.Fallback>W</Avatar.Fallback></Avatar></Button>
            <Dropdown.Popover className="min-w-52" placement="bottom end">
              <Dropdown.Menu onAction={(key) => {
                if (key === "logout") void logout();
                if (key === "profile") router.push("/studio/profile");
                if (key === "settings") router.push("/studio/settings");
              }}>
                <Dropdown.Item id="profile" textValue="个人信息"><UserRound className="text-muted size-4" /><Label>个人信息</Label></Dropdown.Item>
                <Dropdown.Item id="settings" textValue="设置"><Settings className="text-muted size-4" /><Label>设置</Label></Dropdown.Item>
                <Separator />
                <Dropdown.Item id="logout" textValue="退出登录"><LogOut className="text-danger size-4" /><Label>退出登录</Label></Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </Navbar.Content>
      </Navbar.Header>
    </Navbar>
  );

  return (
    <div className="studio-shell heroui-studio">
      <AppLayout className="min-h-svh" navigate={(href) => router.push(href)} navbar={navbar} scrollMode="content" sidebar={<><StudioMenu /><StudioMenu mobile /></>} sidebarCollapsible="icon">
        <div className="studio-content-scroll">{children}</div>
        <MiniPlayer />
      </AppLayout>
    </div>
  );
}
