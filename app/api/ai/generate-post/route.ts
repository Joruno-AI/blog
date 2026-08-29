import { NextRequest, NextResponse } from 'next/server'
import { getSetting } from '@/lib/db/queries/settings'
import { getCategories } from '@/lib/db/queries/categories'


const DEFAULT_SYSTEM_PROMPT = `# Role：资深技术博客主笔（Astro MDX）

## Background：面向前端/全栈工程师与技术负责人，持续产出可直接发布的中文技术博客，严格遵循 Astro MDX 规范。文章以可运行的最小可行示例和端到端流程为主线，强调版本一致性、环境标注与可复现性，同时兼顾 SEO、可读性与事实准确性，避免"AI腔"和空话。

## Attention：优先保障读者能跑通示例，形成从背景→问题→实践→验证→边界的闭环；以"证据化写作"支撑结论；通过结构化输出与固定模板降低波动；在不牺牲深度的前提下优化扫描性；全程锁定版本与环境，确保复现成功率和出版可控性。

## Profile：
- Author: prompt-optimizer
- Version: 1.0
- Language: 中文
- Description: 生产符合 Astro MDX 规范的深度技术博客，围绕最小可行示例与端到端演示组织内容，覆盖工程化与跨栈代码，兼顾 SEO、可读性与出版流程化，确保内容真实、可运行、可复现。

## Skills:
- 选题落地与结构化拆解：从宽泛主题抽取问题域，产出分层大纲与可执行模块
- 示例驱动写作：提供可复制运行的 TypeScript/Bash/配置片段，覆盖安装、运行与验证
- Astro MDX 精准掌握：Frontmatter 规范、标题层级、组件/图片/资源引用与语法细节
- SEO 与可读性工程：标题与描述优化、关键词布局、内链策略、信息密度与视觉引导
- 事实校验与可复现保障：版本锁定、依赖标注、闭环测试、引用与来源管理

## Goals:
- 生成一篇可直接发布的技术文章，含完整元信息
- 提供最小可行 demo 与端到端流程，读者可按步骤复现并验证结果
- 覆盖背景、核心概念、实现细节、边界条件与常见陷阱，术语统一
- 达成良好 SEO 与高可读性，兼顾扫描与深入学习需求
- 完成质量自检：去 AI 化、事实准确、代码可运行、版本与环境一致

## Constrains:
- 深度与广度并重：背景/概念/实现/边界/陷阱需呼应且不可缺失
- 去 AI 化表达：自然口吻；过渡词适度；避免"综上所述/由此可见/总而言之/值得注意的是/本文将"等模板化表达
- 准确与可追溯：不捏造；性能/兼容性/限制需实测或权威来源
- 版本与环境一致性：锁定 Node/包管理器/依赖版本，显式标注环境与差异
- 避免营销与人设输出：不自夸、不带推广色彩

## OutputFormat:
- 正文结构：以二级标题为主，必要时使用三级标题，避免四级及更深层级
- 关键概念加粗；列表/表格增强扫描性；适度使用 🙋🎯✅🔶🤔
- 包含"快速上手/核心实践/进阶实践"与"问题驱动"结构
- 代码与命令可运行：显式标注语言与版本；提供安装/运行步骤`

interface GeneratedPost {
  title: string
  subtitle: string
  excerpt: string
  content: string
  categoryId: string | null
  tagIds: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { topic } = body

    if (!topic) {
      return NextResponse.json({ error: '请输入博客主题' }, { status: 400 })
    }

    const apiKey = await getSetting('ai_api_key')
    let apiUrl = await getSetting('ai_api_url') || 'https://openrouter.ai/api/v1'
    const model = await getSetting('ai_model') || 'anthropic/claude-3.5-sonnet'
    const systemPrompt = await getSetting('ai_system_prompt') || DEFAULT_SYSTEM_PROMPT

    if (!apiKey) {
      return NextResponse.json({
        error: '请先在设置中配置 AI API Key'
      }, { status: 400 })
    }

    // Ensure API URL ends with /chat/completions
    if (!apiUrl.endsWith('/chat/completions')) {
      apiUrl = apiUrl.replace(/\/$/, '') + '/chat/completions'
    }

    const isOpenRouter = apiUrl.includes('openrouter.ai')

    const [categories, tags] = await Promise.all([
      getCategories(),
      (await import('@/lib/db/queries/tags')).getTags(),
    ])

    const categoryList = categories.map(c => `${c.id}: ${c.name}`).join('\n')
    const tagList = tags.map(t => `${t.id}: ${t.name}`).join('\n')

    const userPrompt = `请根据以下主题生成一篇深度技术博客文章：

主题：${topic}

## 文章结构要求：
1. **快速上手**：最小可行示例，让读者快速跑通
2. **核心实践**：深入讲解原理和最佳实践
3. **进阶实践**：边界条件、性能优化、常见陷阱

## 写作要求：
- 以二级标题为主，必要时使用三级标题
- 关键概念加粗，适度使用 emoji（🙋🎯✅🔶🤔）
- 代码块标注语言，提供可运行的完整示例
- 锁定版本号和环境要求
- 避免 AI 腔：不使用"综上所述/由此可见/总而言之/值得注意的是/本文将"
- 自然口吻，像高级工程师写给同事的技术分享

## 输出格式：
请以 JSON 格式返回，包含以下字段：
{
  "title": "SEO 友好的文章标题（含主关键词）",
  "subtitle": "副标题（一句话概括文章价值）",
  "excerpt": "文章摘要（150-250字，包含关键词，吸引读者点击）",
  "content": "完整的 Markdown 格式文章内容（至少2000字）",
  "categoryId": "最适合的分类 ID",
  "tagIds": ["相关标签 ID 数组"]
}

可用分类列表：
${categoryList || '暂无分类'}

可用标签列表：
${tagList || '暂无标签'}

只返回 JSON，不要包含其他内容。`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }

    // Add OpenRouter specific headers
    if (isOpenRouter) {
      headers['HTTP-Referer'] = process.env.NEXT_PUBLIC_SITE_URL || 'https://blog-cms.local'
      headers['X-Title'] = 'Blog CMS'
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('AI API error:', errorData)
      return NextResponse.json({
        error: `AI 服务请求失败: ${response.status}`
      }, { status: 500 })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return NextResponse.json({ error: 'AI 未返回有效内容' }, { status: 500 })
    }

    let generatedPost: GeneratedPost
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('无法解析 JSON')
      }
      generatedPost = JSON.parse(jsonMatch[0])
    } catch {
      console.error('Failed to parse AI response:', content)
      return NextResponse.json({
        error: 'AI 返回格式错误，请重试'
      }, { status: 500 })
    }

    if (generatedPost.categoryId && !categories.find(c => c.id === generatedPost.categoryId)) {
      generatedPost.categoryId = null
    }
    generatedPost.tagIds = (generatedPost.tagIds || []).filter(
      id => tags.find(t => t.id === id)
    )

    return NextResponse.json(generatedPost)
  } catch (error) {
    console.error('Error generating post:', error)
    return NextResponse.json({
      error: '生成失败，请稍后重试'
    }, { status: 500 })
  }
}
