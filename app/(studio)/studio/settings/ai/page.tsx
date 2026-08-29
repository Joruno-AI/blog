"use client";

import { Bot, KeyRound, Loader2, RefreshCw, Save, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ModelOption {
  id: string;
  name: string;
  description?: string;
  contextLength?: number;
}

type AIForm = {
  ai_api_key: string;
  ai_api_url: string;
  ai_model: string;
  ai_system_prompt: string;
};

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
- 代码与命令可运行：显式标注语言与版本；提供安装/运行步骤`;

const initialForm: AIForm = {
  ai_api_key: "",
  ai_api_url: "https://openrouter.ai/api/v1",
  ai_model: "anthropic/claude-3.5-sonnet",
  ai_system_prompt: DEFAULT_SYSTEM_PROMPT,
};

export default function AISettingsPage() {
  const [form, setForm] = useState<AIForm>(initialForm);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  const loadModels = useCallback(async () => {
    setModelsLoading(true);
    try {
      const response = await fetch("/api/ai/models");
      if (!response.ok) throw new Error("模型列表加载失败");
      const data = await response.json() as { models?: ModelOption[] };
      setModels(data.models ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "模型列表加载失败");
    } finally {
      setModelsLoading(false);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/settings?keys=ai_api_key,ai_api_url,ai_model,ai_system_prompt");
      if (!response.ok) throw new Error("AI 设置加载失败");
      const data = await response.json() as Partial<AIForm>;
      setForm({
        ai_api_key: data.ai_api_key ?? "",
        ai_api_url: data.ai_api_url ?? initialForm.ai_api_url,
        ai_model: data.ai_model ?? initialForm.ai_model,
        ai_system_prompt: data.ai_system_prompt ?? DEFAULT_SYSTEM_PROMPT,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI 设置加载失败");
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadSettings(), loadModels()]);
  }, [loadModels, loadSettings]);

  function update<K extends keyof AIForm>(key: K, value: AIForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form.ai_api_key.trim()) {
      toast.error("请输入 API Key");
      return;
    }
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(form)) {
        const response = await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value: value || null }),
        });
        if (!response.ok) throw new Error(`保存 ${key} 失败`);
      }
      toast.success("AI 设置已保存");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  if (initialLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 size-5 animate-spin" />加载 AI 设置</div>;
  }

  return (
    <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 p-4 md:p-6">
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Assistant</p>
        <h1 className="text-2xl font-semibold tracking-tight">AI 助手</h1>
        <p className="mt-1 text-sm text-muted-foreground">配置兼容 OpenAI API 的写作服务、模型与系统提示词。</p>
      </div>

      <form className="grid gap-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.8fr)]" onSubmit={save}>
        <Card className="h-fit gap-0 py-0 shadow-none">
          <CardHeader className="border-b px-5 py-4">
            <CardTitle className="flex items-center gap-2 text-sm"><KeyRound className="size-4" />API 配置</CardTitle>
            <CardDescription>密钥仅用于服务端生成接口，不会出现在公开页面。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-5">
            <Field label="API Key" description="支持 OpenAI、DeepSeek、OpenRouter 等兼容接口。">
              <Input type="password" value={form.ai_api_key} placeholder="sk-xxxxxxxx" autoComplete="off" onChange={(event) => update("ai_api_key", event.target.value)} />
            </Field>
            <Field label="API 地址" description="例如 https://openrouter.ai/api/v1">
              <Input type="url" value={form.ai_api_url} onChange={(event) => update("ai_api_url", event.target.value)} />
            </Field>
            <Field label="模型" description={models.length ? `已加载 ${models.length} 个可用模型，可输入名称搜索。` : "可直接填写模型 ID。"}>
              <div className="flex gap-2">
                <Input list="ai-model-options" value={form.ai_model} placeholder="选择或输入模型 ID" onChange={(event) => update("ai_model", event.target.value)} />
                <Button type="button" variant="outline" size="icon" title="刷新模型" disabled={modelsLoading} onClick={() => void loadModels()}><RefreshCw className={modelsLoading ? "animate-spin" : ""} /><span className="sr-only">刷新模型</span></Button>
              </div>
              <datalist id="ai-model-options">{models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</datalist>
            </Field>
            <Button type="submit" disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <Save />}保存设置</Button>
          </CardContent>
        </Card>

        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className="border-b px-5 py-4">
            <CardTitle className="flex items-center gap-2 text-sm"><Sparkles className="size-4" />系统提示词</CardTitle>
            <CardDescription>定义 AI 生成文章时的结构、写作风格、技术边界与质量要求。</CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <Textarea className="min-h-[620px] resize-y font-mono text-xs leading-relaxed" value={form.ai_system_prompt} placeholder={DEFAULT_SYSTEM_PROMPT} onChange={(event) => update("ai_system_prompt", event.target.value)} />
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><Bot className="size-3.5" />基于 Astro MDX 的内容规范</span><span>{form.ai_system_prompt.length.toLocaleString()} 字符</span></div>
          </CardContent>
        </Card>
      </form>
    </main>
  );
}

function Field({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return <div className="grid gap-2"><Label>{label}</Label>{children}<p className="text-xs text-muted-foreground">{description}</p></div>;
}
