"use client";

import { Button, Description, Input, Label, ListBox, Modal, Select, Spinner, TextArea, TextField } from "@heroui/react";
import { FolderTree } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { slugify } from "@/lib/utils";
import type { TreeCategory } from "./category-tree";

interface EditableCategory { id: string; name: string; description?: string | null; parentId: string | null }
interface CategoryModalProps { open: boolean; onClose: () => void; category?: EditableCategory; categories: TreeCategory[]; defaultParentId?: string }

export function CategoryModal({ open, onClose, category, categories, defaultParentId }: CategoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("__none__");

  const blockedParentIds = useMemo(() => {
    const blocked = new Set<string>();
    if (!category) return blocked;
    blocked.add(category.id);
    let changed = true;
    while (changed) {
      changed = false;
      for (const candidate of categories) {
        if (candidate.parentId && blocked.has(candidate.parentId) && !blocked.has(candidate.id)) { blocked.add(candidate.id); changed = true; }
      }
    }
    return blocked;
  }, [categories, category]);

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setDescription(category?.description ?? "");
    setParentId(category?.parentId ?? defaultParentId ?? "__none__");
  }, [category, defaultParentId, open]);

  const selectedParent = parentId === "__none__" ? null : categories.find((item) => item.id === parentId);

  async function submit() {
    const normalizedName = name.trim();
    if (!normalizedName) { toast.error("请输入分类名称"); return; }
    setLoading(true);
    try {
      const response = await fetch(category ? `/api/categories/${category.id}` : "/api/categories", {
        method: category ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: normalizedName, slug: slugify(normalizedName), description: description.trim() || null, parentId: parentId === "__none__" ? null : parentId }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "保存失败");
      toast.success(category ? "分类已更新" : "分类已创建");
      onClose();
    } catch (error) { toast.error(error instanceof Error ? error.message : "保存失败"); }
    finally { setLoading(false); }
  }

  return (
    <Modal.Backdrop isOpen={open} onOpenChange={(next) => { if (!next && !loading) onClose(); }}>
      <Modal.Container><Modal.Dialog className="sm:max-w-lg">
        <Modal.CloseTrigger />
        <Modal.Header><Modal.Icon className="bg-accent-soft text-accent-soft-foreground"><FolderTree className="size-5" /></Modal.Icon><Modal.Heading>{category ? "编辑分类" : "新建分类"}</Modal.Heading></Modal.Header>
        <Modal.Body className="grid gap-4">
          <TextField isRequired value={name} onChange={setName}><Label>名称</Label><Input autoFocus placeholder="分类名称" /></TextField>
          <TextField value={description} onChange={setDescription}><Label>描述</Label><TextArea className="min-h-24" placeholder="分类描述" /></TextField>
          <Select fullWidth placeholder="无（顶级分类）" selectedKey={parentId} onSelectionChange={(key) => setParentId(String(key))}>
            <Label>父级分类</Label>
            <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
            <Select.Popover><ListBox>
              <ListBox.Item id="__none__" textValue="无（顶级分类）">无（顶级分类）<ListBox.ItemIndicator /></ListBox.Item>
              {categories.map((item) => <ListBox.Item id={item.id} isDisabled={blockedParentIds.has(item.id)} key={item.id} textValue={item.name}><span style={{ paddingLeft: Math.max(0, item.level) * 10 }}>{item.name}{item.level > 0 ? ` · /${item.path}` : ""}</span><ListBox.ItemIndicator /></ListBox.Item>)}
            </ListBox></Select.Popover>
            <Description>路径预览：/{selectedParent ? `${selectedParent.path}/` : ""}{name ? slugify(name) : "新分类"}/</Description>
          </Select>
        </Modal.Body>
        <Modal.Footer><Button isDisabled={loading} onPress={onClose} variant="tertiary">取消</Button><Button isDisabled={loading} onPress={() => void submit()}>{loading ? <Spinner color="current" size="sm" /> : null}{category ? "保存" : "创建"}</Button></Modal.Footer>
      </Modal.Dialog></Modal.Container>
    </Modal.Backdrop>
  );
}
