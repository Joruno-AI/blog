"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
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
import { slugify } from "@/lib/utils";

interface TagData {
  id: string;
  name: string;
  slug: string;
}

interface TagModalProps {
  open: boolean;
  onClose: () => void;
  tag?: TagData;
}

export function TagModal({ open, onClose, tag }: TagModalProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) setName(tag?.name ?? "");
  }, [open, tag]);

  async function submit() {
    const normalizedName = name.trim();
    if (!normalizedName) {
      toast.error("请输入标签名称");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(tag ? `/api/tags/${tag.id}` : "/api/tags", {
        method: tag ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: normalizedName, slug: slugify(normalizedName) }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "保存失败");
      toast.success(tag ? "标签已更新" : "标签已创建");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !loading && !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tag ? "编辑标签" : "新建标签"}</DialogTitle>
          <DialogDescription>标签用于内容筛选、检索和相关内容聚合。</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          <Label htmlFor="tag-name">名称</Label>
          <Input id="tag-name" value={name} placeholder="标签名称" autoFocus onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void submit()} />
          <p className="text-xs text-muted-foreground">Slug：{name ? slugify(name) : "输入名称后自动生成"}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={loading} onClick={onClose}>取消</Button>
          <Button disabled={loading} onClick={() => void submit()}>{loading ? <Loader2 className="animate-spin" /> : null}{tag ? "保存" : "创建"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
