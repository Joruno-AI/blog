"use client";

import { Archive, FileStack, Loader2, Pencil, Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const editableTypes = [
  "document",
  "photo",
  "podcast",
  "course",
  "lesson",
  "tool",
  "project",
  "short",
  "download",
  "collection",
] as const;

const visibilityOptions = ["public", "unlisted", "private"] as const;
const contentFormatOptions = ["markdown", "json", "text", "html"] as const;
const PAGE_SIZE = 20;

type StudioResource = {
  id: string;
  type: (typeof editableTypes)[number];
  title: string;
  slug: string;
  path: string;
  description: string | null;
  visibility: (typeof visibilityOptions)[number];
  status: "draft" | "review" | "scheduled" | "published";
  version: number;
  content: string;
  contentFormat: (typeof contentFormatOptions)[number];
  metadataJson: string;
  scheduledAt: string | null;
  updatedAt: string;
};

type ResourceForm = {
  type: StudioResource["type"];
  title: string;
  slug: string;
  path: string;
  description: string;
  visibility: StudioResource["visibility"];
  content: string;
  contentFormat: StudioResource["contentFormat"];
  metadataJson: string;
  published: boolean;
  scheduledAt: string;
};

const emptyForm: ResourceForm = {
  type: "document",
  title: "",
  slug: "",
  path: "",
  description: "",
  visibility: "public",
  content: "",
  contentFormat: "markdown",
  metadataJson: "{}",
  published: false,
  scheduledAt: "",
};

function localDateTimeValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function statusVariant(status: StudioResource["status"]) {
  if (status === "published") return "success" as const;
  if (status === "scheduled") return "secondary" as const;
  return "outline" as const;
}

export default function ResourceCenterPage() {
  const [resources, setResources] = useState<StudioResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StudioResource | null>(null);
  const [form, setForm] = useState<ResourceForm>(emptyForm);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/resources?types=${editableTypes.join(",")}&limit=100`);
      if (!response.ok) throw new Error("资源加载失败");
      const data = await response.json() as { resources?: StudioResource[] };
      setResources(data.resources ?? []);
      setPage(1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "资源加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(resources.length / PAGE_SIZE));
  const visibleResources = useMemo(
    () => resources.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [page, resources],
  );

  function beginCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function beginEdit(resource: StudioResource) {
    setEditing(resource);
    setForm({
      type: resource.type,
      title: resource.title,
      slug: resource.slug,
      path: resource.path,
      description: resource.description ?? "",
      visibility: resource.visibility,
      content: resource.content,
      contentFormat: resource.contentFormat,
      metadataJson: resource.metadataJson,
      published: resource.status === "published",
      scheduledAt: localDateTimeValue(resource.scheduledAt),
    });
    setOpen(true);
  }

  function updateForm<K extends keyof ResourceForm>(key: K, value: ResourceForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (!form.title.trim()) {
      toast.error("请输入标题");
      return;
    }
    let metadata: Record<string, unknown>;
    try {
      metadata = JSON.parse(form.metadataJson || "{}");
    } catch {
      toast.error("扩展元数据必须是有效 JSON");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(editing ? `/api/resources/${editing.id}` : "/api/resources", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          title: form.title.trim(),
          description: form.description || null,
          slug: form.slug || undefined,
          path: form.path || undefined,
          metadata,
          scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "保存失败");
      toast.success(editing ? "资源已更新" : "资源已创建");
      setOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function remove(resource: StudioResource) {
    if (!window.confirm(`归档「${resource.title}」？\n归档后公开地址将立即下线，历史版本会保留。`)) return;
    try {
      const response = await fetch(`/api/resources/${resource.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("归档失败");
      toast.success("资源已归档");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "归档失败");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 p-4 md:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Content model</p>
          <h1 className="text-2xl font-semibold tracking-tight">资源中心</h1>
          <p className="mt-1 text-sm text-muted-foreground">管理文档、项目、工具、课程、照片和短内容；文章与音乐继续使用专用编辑器。</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : ""} />刷新
          </Button>
          <Button onClick={beginCreate}><Plus />新建资源</Button>
        </div>
      </div>

      <Card className="gap-0 overflow-hidden py-0 shadow-none">
        <CardHeader className="border-b px-5 py-4">
          <CardTitle className="flex items-center gap-2 text-sm"><FileStack className="size-4" />全部资源</CardTitle>
          <CardDescription>当前共 {resources.length} 项非文章、非音乐资源。</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">类型</TableHead>
                  <TableHead>标题</TableHead>
                  <TableHead className="w-20">版本</TableHead>
                  <TableHead className="w-28">状态</TableHead>
                  <TableHead className="w-44">更新时间</TableHead>
                  <TableHead className="w-28 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="h-48 text-center text-muted-foreground"><Loader2 className="mr-2 inline size-4 animate-spin" />加载资源</TableCell></TableRow>
                ) : visibleResources.length ? visibleResources.map((resource) => (
                  <TableRow key={resource.id}>
                    <TableCell><Badge variant="outline" className="font-mono font-normal">{resource.type}</Badge></TableCell>
                    <TableCell>
                      <p className="font-medium">{resource.title}</p>
                      <p className="mt-0.5 max-w-xl truncate font-mono text-xs text-muted-foreground">{resource.path}</p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">v{resource.version}</TableCell>
                    <TableCell><Badge variant={statusVariant(resource.status)}>{resource.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(resource.updatedAt).toLocaleString("zh-CN")}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" title="编辑" onClick={() => beginEdit(resource)}><Pencil /><span className="sr-only">编辑</span></Button>
                        <Button variant="ghost" size="icon" title="归档" className="text-destructive hover:text-destructive" onClick={() => void remove(resource)}><Archive /><span className="sr-only">归档</span></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={6} className="h-48 text-center text-muted-foreground">暂无资源</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {resources.length > PAGE_SIZE ? (
            <div className="flex items-center justify-between border-t px-5 py-3 text-sm text-muted-foreground">
              <span>第 {page} / {totalPages} 页</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>上一页</Button>
                <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((value) => value + 1)}>下一页</Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(next) => !saving && setOpen(next)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑资源" : "新建资源"}</DialogTitle>
            <DialogDescription>内容会保存为带版本记录的统一资源，并根据状态进入公开站点。</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="类型">
                <Select value={form.type} disabled={Boolean(editing)} onValueChange={(value) => updateForm("type", value as ResourceForm["type"])}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{editableTypes.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="可见性">
                <Select value={form.visibility} onValueChange={(value) => updateForm("visibility", value as ResourceForm["visibility"])}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{visibilityOptions.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="标题" required><Input value={form.title} onChange={(event) => updateForm("title", event.target.value)} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Slug"><Input value={form.slug} placeholder="留空时由标题生成" onChange={(event) => updateForm("slug", event.target.value)} /></Field>
              <Field label="公开路径"><Input value={form.path} placeholder="留空时按类型生成" onChange={(event) => updateForm("path", event.target.value)} /></Field>
            </div>
            <Field label="摘要"><Textarea rows={2} value={form.description} onChange={(event) => updateForm("description", event.target.value)} /></Field>
            <Field label="内容格式">
              <Select value={form.contentFormat} onValueChange={(value) => updateForm("contentFormat", value as ResourceForm["contentFormat"])}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{contentFormatOptions.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="正文"><Textarea rows={10} className="font-mono" value={form.content} onChange={(event) => updateForm("content", event.target.value)} /></Field>
            <Field label="扩展元数据（JSON）"><Textarea rows={3} className="font-mono" value={form.metadataJson} onChange={(event) => updateForm("metadataJson", event.target.value)} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-md border p-3">
                <Checkbox id="resource-published" checked={form.published} onCheckedChange={(checked) => updateForm("published", checked === true)} />
                <Label htmlFor="resource-published" className="cursor-pointer">立即发布</Label>
              </div>
              <Field label="定时发布（可选）" description="未来时间优先按计划发布。">
                <Input type="datetime-local" value={form.scheduledAt} onChange={(event) => updateForm("scheduledAt", event.target.value)} />
              </Field>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>取消</Button>
            <Button onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : null}保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Field({ label, description, required, children }: { label: string; description?: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}{required ? <span className="ml-1 text-destructive">*</span> : null}</Label>
      {children}
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
    </div>
  );
}
