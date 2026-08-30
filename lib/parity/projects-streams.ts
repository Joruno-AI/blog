import type { PublishedResource } from "@/modules/resources/infrastructure/resource-repository";

export type AstroProject = {
  id: string;
  link: string;
  desc: string;
  icon: string;
  category: string;
};

export type AstroStream = {
  id: string;
  pubDate: string;
  link: string;
  video: boolean;
  radio: boolean;
  platform: string;
};

type ResourceMetadata = {
  externalUrl?: unknown;
  icon?: unknown;
  category?: unknown;
  order?: unknown;
  video?: unknown;
  radio?: unknown;
  platform?: unknown;
};

/** Exact order and public fields from d1ec7b0:src/content/projects/data.json. */
export const ASTRO_PROJECTS: readonly AstroProject[] = [
  {
    id: "OutfitAI",
    link: "https://www.outfit-mksaas.site/",
    desc: "用 AI 生成虚拟试衣效果，快速预览不同服装的上身表现",
    icon: "i-ph-dress-duotone",
    category: "SaaS",
  },
  {
    id: "TypeCN",
    link: "https://type-cn-supabase.vercel.app/",
    desc: "通过互动练习和游戏化反馈，循序渐进地掌握中文打字",
    icon: "i-ph-translate-duotone",
    category: "SaaS",
  },
  {
    id: "Travel China Guide",
    link: "https://www.wangshengliang.site/",
    desc: "面向旅行者的中国城市、路线与实用信息指南",
    icon: "i-ph-map-trifold-duotone",
    category: "SaaS",
  },
  {
    id: "ui-comp-cli",
    link: "https://github.com/Joruno-AI/ui-comp-cli",
    desc: "快速创建 UI 组件和项目模板的命令行工具",
    icon: "i-ph-squares-four-duotone",
    category: "npm",
  },
  {
    id: "ai-tool-navigation-website",
    link: "https://github.com/Joruno-AI/ai-tool-navigation-website",
    desc: "按用途整理和发现 AI 产品的工具导航站",
    icon: "i-ph-compass-rose-duotone",
    category: "导航站",
  },
  {
    id: "qrcode-stitch",
    link: "https://qrcode-stitch.vercel.app/",
    desc: "在浏览器中完成二维码拼接与导出的轻量工具",
    icon: "i-ph-qr-code-duotone",
    category: "工具站",
  },
  {
    id: "vibe-guide",
    link: "https://vibe-guide-seven.vercel.app/",
    desc: "帮助团队生成和维护 Vibe Coding 规范文档",
    icon: "i-ph-notebook-duotone",
    category: "工具站",
  },
  {
    id: "midjourney-supabase-app",
    link: "https://github.com/Joruno-AI/midjourney-supabase-app",
    desc: "围绕 Midjourney 图片生成与作品管理构建的应用",
    icon: "i-ph-sparkle-duotone",
    category: "工具站",
  },
  {
    id: "chrome-extension-zhihu",
    link: "https://github.com/Joruno-AI/chrome-extension-zhihu",
    desc: "改善知乎阅读和浏览体验的浏览器扩展",
    icon: "i-ph-puzzle-piece-duotone",
    category: "浏览器插件",
  },
  {
    id: "ai-gallery",
    link: "https://github.com/Joruno-AI/ai-gallery",
    desc: "用于浏览、整理和展示 AI 图片的小程序",
    icon: "i-ph-images-duotone",
    category: "小程序",
  },
  {
    id: "todo-supabase-app",
    link: "https://github.com/Joruno-AI/todo-supabase-app",
    desc: "基于 Supabase 构建的轻量待办事项管理应用",
    icon: "i-ph-check-circle-duotone",
    category: "工具站",
  },
  {
    id: "vscode-git-user-config",
    link: "https://github.com/Joruno-AI/vscode-git-user-config",
    desc: "在 VS Code 中快速查看和切换 Git 用户配置",
    icon: "i-skill-icons-vscode-dark",
    category: "vscode插件",
  },
  {
    id: "weather-ootd",
    link: "https://github.com/Joruno-AI/weather-ootd",
    desc: "结合实时天气给出每日穿搭建议的小程序",
    icon: "i-ph-rainbow-cloud-duotone",
    category: "小程序",
  },
  {
    id: "happyaicoding",
    link: "https://github.com/Joruno-AI/happyaicoding-template",
    desc: "面向初学者的 AI 编程学习与实践网站",
    icon: "i-ph-code-block-duotone",
    category: "工具站",
  },
  {
    id: "deps-cli",
    link: "https://github.com/Joruno-AI/deps-cli",
    desc: "在终端中检查、整理和维护项目依赖",
    icon: "i-ph-package-duotone",
    category: "npm",
  },
  {
    id: "vistoso",
    link: "https://github.com/Joruno-AI/vistoso",
    desc: "面向开发者的颜色查询与转换命令行工具",
    icon: "i-ph-paint-bucket-duotone",
    category: "npm",
  },
  {
    id: "use-fns",
    link: "https://github.com/Joruno-AI/use-fns",
    desc: "沉淀常用逻辑的 Hooks 与函数集合库",
    icon: "i-ph-webhooks-logo-duotone",
    category: "npm",
  },
  {
    id: "locale-pkg",
    link: "https://github.com/Joruno-AI/locale-pkg",
    desc: "快速查看本地依赖包版本与元信息",
    icon: "i-ph-globe-hemisphere-east-duotone",
    category: "npm",
  },
  {
    id: "pkg-installer",
    link: "https://github.com/Joruno-AI/pkg-installer",
    desc: "统一不同包管理器操作的命令行安装工具",
    icon: "i-ph-terminal-window-duotone",
    category: "npm",
  },
  {
    id: "VoiceAccountClient",
    link: "https://github.com/Joruno-AI/VoiceAccountClient",
    desc: "通过自然语言快速记录收支的 iOS 客户端",
    icon: "i-ph-waveform-duotone",
    category: "iOS",
  },
  {
    id: "VoiceAccountServer",
    link: "https://github.com/Joruno-AI/VoiceAccountServer",
    desc: "为语音记账提供解析、同步与数据服务的后端",
    icon: "i-ph-coins-duotone",
    category: "iOS",
  },
] as const;

/** Exact order and public fields from d1ec7b0:src/content/streams/data.json. */
export const ASTRO_STREAMS: readonly AstroStream[] = [
  { id: "Astro in 100 Seconds", pubDate: "2021-07-16", link: "https://www.youtube.com/watch?v=dsTXcSeAZq8", video: true, radio: false, platform: "YouTube" },
  { id: "I Tried Astro and I LOVE IT - 5 Reasons You Will TOO!", pubDate: "2022-08-30", link: "https://www.youtube.com/watch?v=wND4lSml31A", video: true, radio: false, platform: "YouTube" },
  { id: "Everything You Need to Know about Astro", pubDate: "2023-09-19", link: "https://www.youtube.com/watch?v=rRxuVOutmFQ", video: true, radio: false, platform: "YouTube" },
  { id: "You Don’t Know How to SSR", pubDate: "2024-02-16", link: "https://gitnation.com/contents/you-dont-know-how-to-ssr", video: true, radio: false, platform: "GitNation" },
  { id: "View Transitions: Fact vs. Fiction", pubDate: "2023-10-20", link: "https://www.youtube.com/watch?v=iT-3amHK7tA", video: true, radio: false, platform: "YouTube" },
  { id: "Astro and MDX for digital gardening", pubDate: "2023-11-08", link: "https://podrocket.logrocket.com/astro-mdx-kathleen-mcmahon", video: false, radio: true, platform: "PodRocket" },
  { id: "Astro Launches an Integrated Database", pubDate: "2024-03-18", link: "https://shoptalkshow.com/607/", video: false, radio: true, platform: "ShopTalk" },
  { id: "Building faster websites with Astro", pubDate: "2023-01-20", link: "https://www.youtube.com/watch?v=0eka27P4Pr4", video: true, radio: false, platform: "YouTube" },
  { id: "Astro Web Framework Crash Course", pubDate: "2023-09-29", link: "https://www.youtube.com/watch?v=e-hTm5VmofI", video: true, radio: false, platform: "YouTube" },
  { id: "Astro Quick Start Course | Build an SSR Blog", pubDate: "2023-12-19", link: "https://www.youtube.com/watch?v=XoIHKO6AkoM", video: true, radio: false, platform: "YouTube" },
] as const;

export const ASTRO_PROJECT_CATEGORIES = [
  "SaaS",
  "npm",
  "导航站",
  "工具站",
  "浏览器插件",
  "小程序",
  "vscode插件",
  "iOS",
] as const;

function metadata(resource: PublishedResource): ResourceMetadata {
  try {
    const value: unknown = JSON.parse(resource.metadataJson);
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as ResourceMetadata
      : {};
  } catch {
    return {};
  }
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function resourceOrder(resource: PublishedResource) {
  const order = metadata(resource).order;
  return typeof order === "number" && Number.isFinite(order) ? order : Number.POSITIVE_INFINITY;
}

function orderedResources(resources: readonly PublishedResource[]) {
  return [...resources].sort((left, right) => {
    const leftOrder = resourceOrder(left);
    const rightOrder = resourceOrder(right);
    if (leftOrder !== rightOrder) return leftOrder < rightOrder ? -1 : 1;
    const byDate = (left.publishedAt?.valueOf() ?? 0) - (right.publishedAt?.valueOf() ?? 0);
    return byDate || left.title.localeCompare(right.title, "en", { numeric: true });
  });
}

/** Maps the current published D1 rows to the exact Astro presentation shape. */
export function restoreAstroProjects(resources: readonly PublishedResource[]): AstroProject[] {
  return orderedResources(resources).flatMap((resource) => {
    const meta = metadata(resource);
    const link = stringValue(meta.externalUrl);
    const category = stringValue(meta.category);
    if (!resource.title.trim() || !link || !category) return [];
    return [{
      id: resource.title.trim(),
      link,
      desc: resource.description?.trim() || "",
      icon: stringValue(meta.icon) ?? "i-ph-package-duotone",
      category,
    }];
  });
}

export function restoreAstroStreams(resources: readonly PublishedResource[]): AstroStream[] {
  return orderedResources(resources).flatMap((resource) => {
    const meta = metadata(resource);
    const publishedAt = resource.publishedAt;
    const link = stringValue(meta.externalUrl);
    const platform = stringValue(meta.platform);
    if (!resource.title.trim() || !publishedAt || Number.isNaN(publishedAt.valueOf()) || !link || !platform) return [];
    return [{
      id: resource.title.trim(),
      pubDate: publishedAt.toISOString().slice(0, 10),
      link,
      video: meta.video === true,
      radio: meta.radio === true,
      platform,
    }];
  });
}

export function projectAnchorId(category: string) {
  return category.toLowerCase().replace(/[\s\\/]+/g, "-");
}

export function projectLinkKind(link: string) {
  try {
    const hostname = new URL(link).hostname;
    return hostname === "github.com" || hostname.endsWith(".github.com") ? "GitHub" : "网站";
  } catch {
    return "链接";
  }
}

export function groupAstroProjects(projects: readonly AstroProject[]) {
  const grouped = new Map<string, AstroProject[]>();
  for (const project of projects) {
    grouped.set(project.category, [...(grouped.get(project.category) ?? []), project]);
  }
  return [...grouped.entries()].map(([category, items]) => ({ category, items }));
}

const streamDateFormatter = new Intl.DateTimeFormat("zh-Hans", {
  month: "short",
  day: "numeric",
});

export function formatAstroStreamDate(date: Date | string) {
  const value = typeof date === "string" ? new Date(`${date}T00:00:00Z`) : date;
  if (Number.isNaN(value.valueOf())) throw new Error("Invalid Date");
  return streamDateFormatter.format(value);
}

export function sortAstroStreams(streams: readonly AstroStream[]) {
  return [...streams].sort((left, right) =>
    new Date(`${right.pubDate}T00:00:00Z`).valueOf() - new Date(`${left.pubDate}T00:00:00Z`).valueOf()
  );
}

export function groupAstroStreams(streams: readonly AstroStream[]) {
  const groups: Array<{ year: string; startIndex: number; items: AstroStream[] }> = [];
  for (const [index, stream] of sortAstroStreams(streams).entries()) {
    const year = stream.pubDate.slice(0, 4);
    const last = groups.at(-1);
    if (last?.year === year) last.items.push(stream);
    else groups.push({ year, startIndex: index, items: [stream] });
  }
  return groups;
}
