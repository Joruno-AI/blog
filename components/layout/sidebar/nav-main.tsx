"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboardIcon,
  FileTextIcon,
  FolderIcon,
  TagIcon,
  ImageIcon,
  SettingsIcon,
  Music2Icon,
  UserIcon,
  DatabaseIcon,
  type LucideIcon,
} from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type NavItem = {
  title: string;
  href: string;
  icon?: LucideIcon;
  badge?: string;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navItems: NavGroup[] = [
  {
    title: "概览",
    items: [
      {
        title: "仪表盘",
        href: "/studio",
        icon: LayoutDashboardIcon,
      },
    ],
  },
  {
    title: "内容管理",
    items: [
      {
        title: "内容管理",
        href: "/studio/content",
        icon: FileTextIcon,
      },
      {
        title: "资源中心",
        href: "/studio/resources",
        icon: DatabaseIcon,
      },
      {
        title: "分类管理",
        href: "/studio/categories",
        icon: FolderIcon,
      },
      {
        title: "标签管理",
        href: "/studio/tags",
        icon: TagIcon,
      },
    ],
  },
  {
    title: "媒体",
    items: [
      {
        title: "媒体库",
        href: "/studio/media",
        icon: ImageIcon,
      },
      {
        title: "音乐管理",
        href: "/studio/music",
        icon: Music2Icon,
      },
    ],
  },
  {
    title: "系统",
    items: [
      {
        title: "个人信息",
        href: "/studio/profile",
        icon: UserIcon,
      },
      {
        title: "设置",
        href: "/studio/settings",
        icon: SettingsIcon,
      },
    ],
  },
];

export function NavMain() {
  const pathname = usePathname();

  return (
    <>
      {navItems.map((nav) => (
        <SidebarGroup key={nav.title}>
          <SidebarGroupLabel>{nav.title}</SidebarGroupLabel>
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {nav.items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    className="hover:text-foreground active:text-foreground hover:bg-primary/10 active:bg-primary/10"
                    isActive={
                      pathname === item.href ||
                      (item.href !== "/studio" && pathname.startsWith(item.href))
                    }
                    tooltip={item.title}
                    asChild
                  >
                    <Link href={item.href}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.badge && (
                    <SidebarMenuBadge className="peer-hover/menu-button:text-foreground">
                      {item.badge}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}
