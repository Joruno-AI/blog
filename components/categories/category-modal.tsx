"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/utils";

import type { TreeCategory } from "./category-tree";

interface EditableCategory {
  id: string;
  name: string;
  description?: string | null;
  parentId: string | null;
}

interface CategoryModalProps {
  open: boolean;
  onClose: () => void;
  category?: EditableCategory;
  categories: TreeCategory[];
  defaultParentId?: string;
}

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
        if (candidate.parentId && blocked.has(candidate.parentId) && !blocked.has(candidate.id)) {
          blocked.add(candidate.id);
          changed = true;
        }
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
    if (!normalizedName) {
      toast.error("请输入分类名称");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(category ? `/api/categories/${category.id}` : "/api/categories", {
        method: category ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: normalizedName,
          slug: slugify(normalizedName),
          description: description.trim() || null,
          parentId: parentId === "__none__" ? null : parentId,
        }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "保存失败");
      toast.success(category ? "分类已更新" : "分类已创建");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !loading && !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{category ? "编辑分类" : "新建分类"}</DialogTitle>
          <DialogDescription>分类层级会同步用于文章导航、公开路径与内容筛选。</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="category-name">名称</Label>
            <Input id="category-name" value={name} placeholder="分类名称" autoFocus onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category-description">描述</Label>
            <Textarea id="category-description" rows={3} value={description} placeholder="分类描述" onChange={(event) => setDescription(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>父级分类</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="无（顶级分类）" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">无（顶级分类）</SelectItem>
                {categories.map((item) => (
                  <SelectItem key={item.id} value={item.id} disabled={blockedParentIds.has(item.id)}>
                    <span style={{ paddingLeft: Math.max(0, item.level) * 10 }}>{item.name}{item.level > 0 ? ` · /${item.path}` : ""}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              路径预览：/{selectedParent ? `${selectedParent.path}/` : ""}{name ? slugify(name) : "新分类"}/
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>取消</Button>
          <Button onClick={() => void submit()} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : null}{category ? "保存" : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
