"use client";

/* eslint-disable @next/next/no-img-element */

import { ArrowLeft, Disc3, ImageIcon, Loader2, Save, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    <form className="space-y-6" onSubmit={(event) => void handleSubmit(event)}>
      <Card>
        <CardHeader><CardTitle className="text-base">基本信息</CardTitle><CardDescription>用于公开音乐页展示的专辑名称、艺术家和简介。</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="album-name">专辑名称</Label><Input id="album-name" name="name" defaultValue={album?.name ?? ""} placeholder="请输入专辑名称" required /></div>
            <div className="space-y-2"><Label htmlFor="album-artist">艺术家</Label><Input id="album-artist" name="artist" defaultValue={album?.artist ?? ""} placeholder="请输入艺术家名称" required /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="album-description">专辑简介</Label><Textarea id="album-description" name="description" defaultValue={album?.description ?? ""} placeholder="请输入专辑简介（可选）" rows={4} maxLength={500} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">封面信息</CardTitle><CardDescription>上传专辑封面，并设置可选的发行日期。</CardDescription></CardHeader>
        <CardContent className="grid items-end gap-6 md:grid-cols-[1fr_260px]">
          <div className="flex items-center gap-4">
            <div className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">{coverUrl ? <img src={coverUrl} alt="专辑封面" className="size-full object-cover" /> : <Disc3 className="size-9 text-muted-foreground" />}</div>
            <div><input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handleUpload(event.target.files?.[0])} /><Button type="button" variant="outline" disabled={coverLoading} onClick={() => fileInputRef.current?.click()}>{coverLoading ? <Loader2 className="size-4 animate-spin" /> : coverUrl ? <ImageIcon className="size-4" /> : <Upload className="size-4" />}{coverUrl ? "更换封面" : "上传封面"}</Button><p className="mt-2 text-xs text-muted-foreground">支持常见图片格式，文件会保存到媒体库。</p></div>
          </div>
          <div className="space-y-2"><Label htmlFor="release-date">发行日期</Label><Input id="release-date" name="releaseDate" type="date" defaultValue={dateInputValue(album?.releaseDate)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">发布设置</CardTitle><CardDescription>发布后，这张专辑会在 C 端音乐页面展示。</CardDescription></CardHeader>
        <CardContent><label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4"><Checkbox checked={published} onCheckedChange={(checked) => setPublished(checked === true)} /><span><span className="block text-sm font-medium">公开发布</span><span className="mt-1 block text-xs text-muted-foreground">关闭时保存为草稿，仅在 Studio 中可见。</span></span></label></CardContent>
      </Card>

      <div className="flex justify-end gap-3 pb-4"><Button type="button" variant="outline" disabled={loading} onClick={() => router.back()}><ArrowLeft className="size-4" />返回</Button><Button type="submit" disabled={loading || coverLoading}>{loading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{mode === "create" ? "创建专辑" : "保存修改"}</Button></div>
    </form>
  );
}

export default AlbumForm;
