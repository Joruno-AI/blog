"use client";

import { AlertDialog, Button, Card, Checkbox, Chip, Description, Input, Label, ListBox, Modal, Select, Spinner, Table, TextArea, TextField } from "@heroui/react";
import { Archive, FileStack, Pencil, Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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

function statusColor(status: StudioResource["status"]) {
  if (status === "published") return "success" as const;
  if (status === "scheduled") return "warning" as const;
  return "default" as const;
}

export default function ResourceCenterPage() {
  const [resources, setResources] = useState<StudioResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StudioResource | null>(null);
  const [form, setForm] = useState<ResourceForm>(emptyForm);
  const [page, setPage] = useState(1);
  const [archiveTarget, setArchiveTarget] = useState<StudioResource | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);

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

  async function remove() {
    if (!archiveTarget) return;
    setArchiveLoading(true);
    try {
      const response = await fetch(`/api/resources/${archiveTarget.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("归档失败");
      toast.success("资源已归档");
      setArchiveTarget(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "归档失败");
    } finally {
      setArchiveLoading(false);
    }
  }

  return (
    <main className="studio-dashboard studio-resources-page">
      <section className="studio-page-heading">
        <div><p className="studio-eyebrow">Content model</p><h1>资源中心</h1><p>管理文档、项目、工具、课程、照片和短内容；文章与音乐继续使用专用编辑器。</p></div>
        <div className="flex gap-2"><Button isDisabled={loading} onPress={() => void load()} variant="outline"><RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />刷新</Button><Button onPress={beginCreate}><Plus className="size-4" />新建资源</Button></div>
      </section>

      <Card className="studio-panel">
        <Card.Header className="studio-panel-heading"><span><Card.Title className="flex items-center gap-2 text-sm"><FileStack className="size-4" />全部资源</Card.Title><Card.Description className="mt-1 text-xs">当前共 {resources.length} 项非文章、非音乐资源。</Card.Description></span>{loading ? <Spinner size="sm" /> : null}</Card.Header>
        <Card.Content className="p-0">
          {!loading && !visibleResources.length ? <div className="studio-empty-state">暂无资源</div> : <Table><Table.ScrollContainer><Table.Content aria-label="资源列表" className="min-w-[780px]"><Table.Header><Table.Column>类型</Table.Column><Table.Column isRowHeader>标题</Table.Column><Table.Column>版本</Table.Column><Table.Column>状态</Table.Column><Table.Column>更新时间</Table.Column><Table.Column>操作</Table.Column></Table.Header><Table.Body>{visibleResources.map((resource) => <Table.Row key={resource.id}>
            <Table.Cell><Chip size="sm" variant="soft">{resource.type}</Chip></Table.Cell>
            <Table.Cell><strong className="block">{resource.title}</strong><small className="text-muted block max-w-xl truncate font-mono">{resource.path}</small></Table.Cell>
            <Table.Cell><span className="font-mono text-xs">v{resource.version}</span></Table.Cell>
            <Table.Cell><Chip color={statusColor(resource.status)} size="sm" variant="soft">{resource.status}</Chip></Table.Cell>
            <Table.Cell><span className="text-muted text-sm">{new Date(resource.updatedAt).toLocaleString("zh-CN")}</span></Table.Cell>
            <Table.Cell><div className="flex justify-end gap-1"><Button aria-label={`编辑 ${resource.title}`} isIconOnly onPress={() => beginEdit(resource)} size="sm" variant="ghost"><Pencil className="size-4" /></Button><Button aria-label={`归档 ${resource.title}`} isIconOnly onPress={() => setArchiveTarget(resource)} size="sm" variant="ghost"><Archive className="text-danger size-4" /></Button></div></Table.Cell>
          </Table.Row>)}</Table.Body></Table.Content></Table.ScrollContainer></Table>}
          {resources.length > PAGE_SIZE ? <div className="studio-table-pagination"><span>第 {page} / {totalPages} 页</span><div className="flex gap-2"><Button isDisabled={page === 1} onPress={() => setPage((value) => value - 1)} size="sm" variant="outline">上一页</Button><Button isDisabled={page === totalPages} onPress={() => setPage((value) => value + 1)} size="sm" variant="outline">下一页</Button></div></div> : null}
        </Card.Content>
      </Card>

      <Modal.Backdrop isOpen={open} onOpenChange={(next) => { if (!saving) setOpen(next); }}><Modal.Container><Modal.Dialog className="sm:max-w-3xl"><Modal.CloseTrigger />
        <Modal.Header><Modal.Icon className="bg-accent-soft text-accent-soft-foreground"><FileStack className="size-5" /></Modal.Icon><Modal.Heading>{editing ? "编辑资源" : "新建资源"}</Modal.Heading></Modal.Header>
        <Modal.Body className="studio-resource-form">
          <p className="text-muted text-sm">内容会保存为带版本记录的统一资源，并根据状态进入公开站点。</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select isDisabled={Boolean(editing)} selectedKey={form.type} onSelectionChange={(key) => updateForm("type", String(key) as ResourceForm["type"])}><Label>类型</Label><Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger><Select.Popover><ListBox>{editableTypes.map((value) => <ListBox.Item id={value} key={value} textValue={value}>{value}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover></Select>
            <Select selectedKey={form.visibility} onSelectionChange={(key) => updateForm("visibility", String(key) as ResourceForm["visibility"])}><Label>可见性</Label><Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger><Select.Popover><ListBox>{visibilityOptions.map((value) => <ListBox.Item id={value} key={value} textValue={value}>{value}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover></Select>
          </div>
          <TextField isRequired value={form.title} onChange={(value) => updateForm("title", value)}><Label>标题</Label><Input autoFocus /></TextField>
          <div className="grid gap-4 sm:grid-cols-2"><TextField value={form.slug} onChange={(value) => updateForm("slug", value)}><Label>Slug</Label><Input placeholder="留空时由标题生成" /></TextField><TextField value={form.path} onChange={(value) => updateForm("path", value)}><Label>公开路径</Label><Input placeholder="留空时按类型生成" /></TextField></div>
          <TextField value={form.description} onChange={(value) => updateForm("description", value)}><Label>摘要</Label><TextArea className="min-h-20" /></TextField>
          <Select selectedKey={form.contentFormat} onSelectionChange={(key) => updateForm("contentFormat", String(key) as ResourceForm["contentFormat"])}><Label>内容格式</Label><Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger><Select.Popover><ListBox>{contentFormatOptions.map((value) => <ListBox.Item id={value} key={value} textValue={value}>{value}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover></Select>
          <TextField value={form.content} onChange={(value) => updateForm("content", value)}><Label>正文</Label><TextArea className="min-h-64 font-mono" /></TextField>
          <TextField value={form.metadataJson} onChange={(value) => updateForm("metadataJson", value)}><Label>扩展元数据（JSON）</Label><TextArea className="min-h-28 font-mono" /></TextField>
          <div className="grid gap-4 sm:grid-cols-2"><Checkbox isSelected={form.published} onChange={(checked) => updateForm("published", checked)}><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Content><span className="block text-sm font-medium">立即发布</span><span className="text-muted block text-xs">关闭时保存为草稿。</span></Checkbox.Content></Checkbox><TextField type="datetime-local" value={form.scheduledAt} onChange={(value) => updateForm("scheduledAt", value)}><Label>定时发布（可选）</Label><Input /><Description>未来时间优先按计划发布。</Description></TextField></div>
        </Modal.Body>
        <Modal.Footer><Button isDisabled={saving} onPress={() => setOpen(false)} variant="tertiary">取消</Button><Button isDisabled={saving} onPress={() => void save()}>{saving ? <Spinner color="current" size="sm" /> : null}保存</Button></Modal.Footer>
      </Modal.Dialog></Modal.Container></Modal.Backdrop>

      <AlertDialog.Backdrop isOpen={Boolean(archiveTarget)} onOpenChange={(next) => { if (!next && !archiveLoading) setArchiveTarget(null); }}><AlertDialog.Container><AlertDialog.Dialog className="sm:max-w-[420px]"><AlertDialog.CloseTrigger /><AlertDialog.Header><AlertDialog.Icon status="danger" /><AlertDialog.Heading>归档资源</AlertDialog.Heading></AlertDialog.Header><AlertDialog.Body><p>归档“{archiveTarget?.title}”后，公开地址会立即下线，历史版本仍会保留。</p></AlertDialog.Body><AlertDialog.Footer><Button isDisabled={archiveLoading} onPress={() => setArchiveTarget(null)} variant="tertiary">取消</Button><Button isDisabled={archiveLoading} onPress={() => void remove()} variant="danger">{archiveLoading ? <Spinner color="current" size="sm" /> : null}确认归档</Button></AlertDialog.Footer></AlertDialog.Dialog></AlertDialog.Container></AlertDialog.Backdrop>
    </main>
  );
}
