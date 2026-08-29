"use client";

/* eslint-disable @next/next/no-img-element */

import { Button, Card, Checkbox, Description, Input, Label, Spinner, TextArea, TextField } from "@heroui/react";
import { ArrowLeft, Disc3, ImageIcon, Save, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";
import { toast } from "sonner";

import { createAlbum, updateAlbum } from "@/lib/actions/albums";
import type { Album } from "@/lib/db/schema";

interface AlbumFormProps {
  album?: Album;
  mode: "create" | "edit";
}

function dateInputValue(value: Date | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function AlbumForm({ album, mode }: AlbumFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverUrl, setCoverUrl] = useState(album?.cover || "");
  const [published, setPublished] = useState(album?.published ?? false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    formData.set("cover", coverUrl);
    formData.set("color", album?.color || "#1a1a2e");
    formData.set("published", published ? "true" : "false");
    try {
      if (mode === "create") await createAlbum(formData);
      else if (album) await updateAlbum(album.id, formData);
    } catch (error) {
      console.error(error);
      toast.error("专辑保存失败");
      setLoading(false);
    }
  };

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setCoverLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/media", { method: "POST", body: formData });
      if (!response.ok) throw new Error("封面上传失败");
      const payload = await response.json() as { url: string };
      setCoverUrl(payload.url);
      toast.success("封面上传成功");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "封面上传失败");
    } finally {
      setCoverLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <form className="studio-album-form" onSubmit={(event) => void handleSubmit(event)}>
      <Card className="studio-panel">
        <Card.Header className="studio-panel-heading"><span><Card.Title className="text-base">基本信息</Card.Title><Card.Description className="mt-1 text-xs">用于公开音乐页展示的专辑名称、艺术家和简介。</Card.Description></span></Card.Header>
        <Card.Content className="grid gap-5 p-5">
          <div className="grid gap-5 md:grid-cols-2">
            <TextField defaultValue={album?.name ?? ""} isRequired><Label>专辑名称</Label><Input name="name" placeholder="请输入专辑名称" /></TextField>
            <TextField defaultValue={album?.artist ?? ""} isRequired><Label>艺术家</Label><Input name="artist" placeholder="请输入艺术家名称" /></TextField>
          </div>
          <TextField defaultValue={album?.description ?? ""}><Label>专辑简介</Label><TextArea className="min-h-28" name="description" placeholder="请输入专辑简介（可选）" maxLength={500} /></TextField>
        </Card.Content>
      </Card>

      <Card className="studio-panel">
        <Card.Header className="studio-panel-heading"><span><Card.Title className="text-base">封面信息</Card.Title><Card.Description className="mt-1 text-xs">上传专辑封面，并设置可选的发行日期。</Card.Description></span></Card.Header>
        <Card.Content className="grid items-end gap-6 p-5 md:grid-cols-[1fr_260px]">
          <div className="flex items-center gap-4">
            <div className="studio-album-cover-input">{coverUrl ? <img src={coverUrl} alt="专辑封面" /> : <Disc3 className="text-muted size-9" />}</div>
            <div><input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handleUpload(event.target.files?.[0])} /><Button variant="outline" isDisabled={coverLoading} onPress={() => fileInputRef.current?.click()}>{coverLoading ? <Spinner color="current" size="sm" /> : coverUrl ? <ImageIcon className="size-4" /> : <Upload className="size-4" />}{coverUrl ? "更换封面" : "上传封面"}</Button><p className="text-muted mt-2 text-xs">支持常见图片格式，文件会保存到媒体库。</p></div>
          </div>
          <TextField defaultValue={dateInputValue(album?.releaseDate)} type="date"><Label>发行日期</Label><Input name="releaseDate" /></TextField>
        </Card.Content>
      </Card>

      <Card className="studio-panel">
        <Card.Header className="studio-panel-heading"><span><Card.Title className="text-base">发布设置</Card.Title><Card.Description className="mt-1 text-xs">发布后，这张专辑会在 C 端音乐页面展示。</Card.Description></span></Card.Header>
        <Card.Content className="p-5"><Checkbox isSelected={published} onChange={setPublished}><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Content><strong className="block text-sm">公开发布</strong><Description>关闭时保存为草稿，仅在 Studio 中可见。</Description></Checkbox.Content></Checkbox></Card.Content>
      </Card>

      <div className="flex justify-end gap-3 pb-4"><Button variant="outline" isDisabled={loading} onPress={() => router.back()}><ArrowLeft className="size-4" />返回</Button><Button type="submit" isDisabled={loading || coverLoading}>{loading ? <Spinner color="current" size="sm" /> : <Save className="size-4" />}{mode === "create" ? "创建专辑" : "保存修改"}</Button></div>
    </form>
  );
}

export default AlbumForm;
