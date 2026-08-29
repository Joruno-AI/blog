"use client";

import { Button, Description, Input, Label, Modal, Spinner, TextField } from "@heroui/react";
import { Tags } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { slugify } from "@/lib/utils";

interface TagData { id: string; name: string; slug: string }
interface TagModalProps { open: boolean; onClose: () => void; tag?: TagData }

export function TagModal({ open, onClose, tag }: TagModalProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => { if (open) setName(tag?.name ?? ""); }, [open, tag]);

  async function submit() {
    const normalizedName = name.trim();
    if (!normalizedName) { toast.error("请输入标签名称"); return; }
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
    } finally { setLoading(false); }
  }

  return (
    <Modal.Backdrop isOpen={open} onOpenChange={(next) => { if (!next && !loading) onClose(); }}>
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-md">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-accent-soft text-accent-soft-foreground"><Tags className="size-5" /></Modal.Icon>
            <Modal.Heading>{tag ? "编辑标签" : "新建标签"}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <TextField className="w-full" isRequired value={name} onChange={setName}>
              <Label>名称</Label>
              <Input autoFocus placeholder="标签名称" onKeyDown={(event) => { if (event.key === "Enter") void submit(); }} />
              <Description>Slug：{name ? slugify(name) : "输入名称后自动生成"}</Description>
            </TextField>
          </Modal.Body>
          <Modal.Footer>
            <Button isDisabled={loading} onPress={onClose} variant="tertiary">取消</Button>
            <Button isDisabled={loading} onPress={() => void submit()}>{loading ? <Spinner color="current" size="sm" /> : null}{tag ? "保存" : "创建"}</Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
