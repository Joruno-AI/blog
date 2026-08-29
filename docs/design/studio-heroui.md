# Studio / HeroUI 设计基线

## 产品边界

- C 端继续以原 Astro 站点为唯一视觉、路由和交互验收基线。
- Studio 与 C 端同属一个 Next.js App Router 工程，不再维护独立 CMS 产品。
- Studio 只复用原 CMS 的数据能力和业务流程，不复用原 CMS 的页面设计。
- Studio 新界面统一使用 HeroUI v3 与 HeroUI Pro；现存 shadcn 组件只作为迁移期遗留，按页面逐步移除。

## 视觉语言

- 关键词：编辑感、安静、克制、内容优先。
- 字体：正文沿用系统无衬线；一级标题使用衬线字体，呼应 C 端内容页面。
- 色彩：纸张白 / 墨黑为主，单一绿色强调色；不使用蓝紫渐变和高饱和仪表盘配色。
- 表面：以边线和留白建立层级，避免大面积阴影；圆角只用于交互和分组，不把所有内容做成同尺寸卡片。
- 数据：数字使用等宽字体和 tabular numbers，强调真实内容状态而不是装饰性指标。

## HeroUI 组件映射

- 应用框架：`AppLayout`、`Sidebar`、`Navbar`
- 基础交互：`Button`、`Dropdown`、`Avatar`、`Separator`
- 内容分组：`Card`、`Chip`、`Surface`
- 数据管理：`DataGrid`、`ActionBar`、`EmptyState`
- 编辑体验：`TextField`、`Select`、`Modal`、`Sheet`、`RichTextEditor`

所有交互组件使用 HeroUI 的 `onPress` / `onAction` 事件约定；路由由 Next.js `router.push` 注入 `AppLayout.navigate`，保持客户端导航。

## 迁移顺序

1. Studio Shell、导航、主题与仪表盘。
2. 内容列表、资源中心、分类与标签。
3. 媒体、音乐、个人信息与设置。
4. 文章和专辑编辑器。
5. 删除 Studio 中不再被引用的 shadcn/Radix 组件与主题变量。

## 私有包安装

- 本机密钥存放于系统钥匙串，不进入仓库。
- CI 使用 GitHub Actions Secret `HEROUI_HP_KEY`，在依赖安装后运行 `hpsetup` 写入 HeroUI Pro 包内容。
- `package.json`、lockfile 和 CSS import 均纳入版本控制；任何凭据不得写入这些文件。
