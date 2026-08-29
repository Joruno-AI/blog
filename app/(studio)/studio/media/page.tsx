"use client";

/* eslint-disable @next/next/no-img-element */

import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Download,
  FileAudio,
  FileIcon,
  FileText,
  FileVideo,
  Grid2X2,
  ImageIcon,
  List,
  Loader2,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface MediaFile {
  id: string;
  url: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
}

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "success" | "error";
  size: number;
  thumbnail?: string;
}

const PAGE_SIZE = 60;
const ACCEPTED_FILES = "image/*,video/*,audio/*,.pdf,.doc,.docx";

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** unit).toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function isImage(type: string) {
  return type === "image" || type.startsWith("image/");
}

function mediaKind(type: string) {
  if (isImage(type)) return "图片";
  if (type === "video" || type.startsWith("video/")) return "视频";
  if (type === "audio" || type.startsWith("audio/")) return "音频";
  if (type === "archive" || /zip|tar|gzip|7z/.test(type)) return "压缩包";
  return "文档";
}

function MediaGlyph({ type, className }: { type: string; className?: string }) {
  const props = { className: cn("size-8 text-muted-foreground", className), "aria-hidden": true };
  if (isImage(type)) return <ImageIcon {...props} />;
  if (type === "video" || type.startsWith("video/")) return <FileVideo {...props} />;
  if (type === "audio" || type.startsWith("audio/")) return <FileAudio {...props} />;
  if (type === "archive" || /zip|tar|gzip|7z/.test(type)) return <Archive {...props} />;
  if (type === "document" || type.startsWith("text/") || type.startsWith("application/")) return <FileText {...props} />;
  return <FileIcon {...props} />;
}

export default function MediaPage() {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [editFile, setEditFile] = useState<MediaFile | null>(null);
  const [editName, setEditName] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [deleteFile, setDeleteFile] = useState<MediaFile | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadsRef = useRef(new Map<string, { xhr: XMLHttpRequest; thumbnail?: string }>());

  const fetchMedia = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/media");
      if (!response.ok) throw new Error("素材加载失败");
      setMediaFiles(await response.json() as MediaFile[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "素材加载失败");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMedia();
  }, [fetchMedia]);

  useEffect(() => () => {
    for (const { xhr, thumbnail } of uploadsRef.current.values()) {
      xhr.abort();
      if (thumbnail) URL.revokeObjectURL(thumbnail);
    }
    uploadsRef.current.clear();
  }, []);

  const imageFiles = useMemo(() => mediaFiles.filter((file) => isImage(file.type)), [mediaFiles]);
  const totalPages = Math.max(1, Math.ceil(mediaFiles.length / PAGE_SIZE));
  const visibleFiles = useMemo(
    () => mediaFiles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [mediaFiles, page],
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const uploadOne = useCallback((file: File) => {
    const id = crypto.randomUUID();
    const thumbnail = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
    const pending: UploadingFile = { id, name: file.name, progress: 0, status: "uploading", size: file.size, thumbnail };
    setUploadingFiles((current) => [pending, ...current]);

    const xhr = new XMLHttpRequest();
    uploadsRef.current.set(id, { xhr, thumbnail });
    xhr.open("POST", "/api/media");
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const progress = Math.min(99, Math.round((event.loaded / event.total) * 100));
      setUploadingFiles((current) => current.map((item) => item.id === id ? { ...item, progress } : item));
    };

    const finish = (status: UploadingFile["status"]) => {
      setUploadingFiles((current) => current.map((item) => item.id === id ? { ...item, progress: status === "success" ? 100 : item.progress, status } : item));
      const upload = uploadsRef.current.get(id);
      uploadsRef.current.delete(id);
      window.setTimeout(() => {
        setUploadingFiles((current) => current.filter((item) => item.id !== id));
        if (upload?.thumbnail) URL.revokeObjectURL(upload.thumbnail);
      }, 1800);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        finish("success");
        toast.success(`${file.name} 上传成功`);
        void fetchMedia();
      } else {
        finish("error");
        let message = "上传失败";
        try {
          const payload = JSON.parse(xhr.responseText) as { error?: string };
          if (payload.error) message = payload.error;
        } catch {
          // Keep the generic message for non-JSON responses.
        }
        toast.error(`${file.name}：${message}`);
      }
    };
    xhr.onerror = () => {
      finish("error");
      toast.error(`${file.name} 上传失败`);
    };
    xhr.onabort = () => {
      const upload = uploadsRef.current.get(id);
      uploadsRef.current.delete(id);
      setUploadingFiles((current) => current.filter((item) => item.id !== id));
      if (upload?.thumbnail) URL.revokeObjectURL(upload.thumbnail);
    };

    const formData = new FormData();
    formData.append("file", file);
    xhr.send(formData);
  }, [fetchMedia]);

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return;
    Array.from(files).forEach(uploadOne);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const cancelUpload = (id: string) => uploadsRef.current.get(id)?.xhr.abort();

  const copyUrl = async (file: MediaFile) => {
    try {
      await navigator.clipboard.writeText(file.url);
      setCopiedId(file.id);
      toast.success("素材地址已复制");
      window.setTimeout(() => setCopiedId((current) => current === file.id ? null : current), 1600);
    } catch {
      toast.error("复制失败，请手动复制素材地址");
    }
  };

  const startRename = (file: MediaFile) => {
    setEditFile(file);
    setEditName(file.name);
  };

  const saveRename = async () => {
    if (!editFile || !editName.trim()) return;
    setEditLoading(true);
    try {
      const response = await fetch(`/api/media/${encodeURIComponent(editFile.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(payload.error || "重命名失败");
      }
      setMediaFiles((current) => current.map((file) => file.id === editFile.id ? { ...file, name: editName.trim() } : file));
      setEditFile(null);
      toast.success("素材已重命名");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "重命名失败");
    } finally {
      setEditLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteFile) return;
    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/media/${encodeURIComponent(deleteFile.id)}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(payload.error || "删除失败");
      }
      setMediaFiles((current) => current.filter((file) => file.id !== deleteFile.id));
      setDeleteFile(null);
      toast.success("素材已删除");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
    } finally {
      setDeleteLoading(false);
    }
  };

  const openFile = (file: MediaFile) => {
    if (isImage(file.type)) {
      setPreviewIndex(imageFiles.findIndex((image) => image.id === file.id));
    } else {
      window.open(file.url, "_blank", "noopener,noreferrer");
    }
  };

  const showPreviousImage = useCallback(() => {
    setPreviewIndex((current) => current === null || imageFiles.length === 0 ? current : (current - 1 + imageFiles.length) % imageFiles.length);
  }, [imageFiles.length]);

  const showNextImage = useCallback(() => {
    setPreviewIndex((current) => current === null || imageFiles.length === 0 ? current : (current + 1) % imageFiles.length);
  }, [imageFiles.length]);

  useEffect(() => {
    if (previewIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") showPreviousImage();
      if (event.key === "ArrowRight") showNextImage();
      if (event.key === "Escape") setPreviewIndex(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewIndex, showNextImage, showPreviousImage]);

  const actions = (file: MediaFile) => (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="icon" aria-label="复制素材地址" title={copiedId === file.id ? "已复制" : "复制地址"} onClick={() => void copyUrl(file)}>
        <Clipboard className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" aria-label="下载素材" title="下载" asChild>
        <a href={file.url} download={file.name} target="_blank" rel="noreferrer"><Download className="size-4" /></a>
      </Button>
      <Button variant="ghost" size="icon" aria-label="重命名素材" title="重命名" onClick={() => startRename(file)}>
        <Pencil className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label="删除素材" title="删除" onClick={() => setDeleteFile(file)}>
        <Trash2 className="size-4" />
      </Button>
    </div>
  );

  const previewFile = previewIndex === null ? null : imageFiles[previewIndex];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">媒体库</h1>
          <p className="mt-1 text-sm text-muted-foreground">集中管理图片、音频、视频和文档素材。</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border p-1">
            <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="size-8" aria-label="网格视图" onClick={() => setViewMode("grid")}><Grid2X2 className="size-4" /></Button>
            <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" className="size-8" aria-label="列表视图" onClick={() => setViewMode("list")}><List className="size-4" /></Button>
          </div>
          <input ref={fileInputRef} className="hidden" type="file" accept={ACCEPTED_FILES} multiple onChange={(event) => handleFiles(event.target.files)} />
          <Button onClick={() => fileInputRef.current?.click()}><Upload className="size-4" />上传素材</Button>
        </div>
      </div>

      {uploadingFiles.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">上传任务</CardTitle>
            <CardDescription>{uploadingFiles.length} 个文件正在处理</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {uploadingFiles.map((file) => (
              <div key={file.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                  {file.thumbnail ? <img src={file.thumbnail} alt="" className="size-full object-cover" /> : <FileIcon className="size-5 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium">{file.name}</span>
                    <span className="shrink-0 text-muted-foreground">{file.progress}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full transition-all", file.status === "error" ? "bg-destructive" : "bg-primary")} style={{ width: `${file.progress}%` }} /></div>
                </div>
                {file.status === "uploading" && <Button variant="ghost" size="icon" aria-label="取消上传" onClick={() => cancelUpload(file.id)}><X className="size-4" /></Button>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>全部素材</CardTitle>
              <CardDescription>共 {mediaFiles.length} 个素材，每页最多展示 {PAGE_SIZE} 个</CardDescription>
            </div>
            {isLoading && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!isLoading && mediaFiles.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted"><ImageIcon className="size-6 text-muted-foreground" /></div>
              <p className="font-medium">还没有素材</p>
              <p className="mt-1 text-sm text-muted-foreground">上传文件后，可在文章、音乐和页面中复用。</p>
              <Button className="mt-5" onClick={() => fileInputRef.current?.click()}><Upload className="size-4" />上传第一个素材</Button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {visibleFiles.map((file) => (
                <article key={file.id} className="group min-w-0 bg-card p-3">
                  <button type="button" className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-muted outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring" onClick={() => openFile(file)}>
                    {isImage(file.type) ? <img src={file.url} alt={file.name} loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" /> : <MediaGlyph type={file.type} className="size-10" />}
                    <Badge variant="secondary" className="absolute left-2 top-2 bg-background/85 backdrop-blur">{mediaKind(file.type)}</Badge>
                  </button>
                  <div className="mt-3 min-w-0">
                    <p className="truncate text-sm font-medium" title={file.name}>{file.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                  <div className="mt-2 border-t pt-1">{actions(file)}</div>
                </article>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>素材</TableHead><TableHead>类型</TableHead><TableHead>大小</TableHead><TableHead>上传时间</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
              <TableBody>
                {visibleFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>
                      <button type="button" className="flex min-w-0 items-center gap-3 text-left" onClick={() => openFile(file)}>
                        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">{isImage(file.type) ? <img src={file.url} alt="" loading="lazy" className="size-full object-cover" /> : <MediaGlyph type={file.type} className="size-5" />}</span>
                        <span className="max-w-80 truncate font-medium">{file.name}</span>
                      </button>
                    </TableCell>
                    <TableCell><Badge variant="outline">{mediaKind(file.type)}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{formatFileSize(file.size)}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(file.createdAt).toLocaleDateString("zh-CN")}</TableCell>
                    <TableCell>{actions(file)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>第 {page} / {totalPages} 页</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft className="size-4" />上一页</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>下一页<ChevronRight className="size-4" /></Button>
          </div>
        </div>
      )}

      <Dialog open={Boolean(editFile)} onOpenChange={(open) => { if (!open && !editLoading) setEditFile(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>重命名素材</DialogTitle><DialogDescription>只修改素材在媒体库中的显示名称，不会改变其访问地址。</DialogDescription></DialogHeader>
          <div className="space-y-2"><Label htmlFor="media-name">素材名称</Label><Input id="media-name" value={editName} autoFocus maxLength={500} onChange={(event) => setEditName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void saveRename(); }} /></div>
          <DialogFooter><Button variant="outline" disabled={editLoading} onClick={() => setEditFile(null)}>取消</Button><Button disabled={editLoading || !editName.trim()} onClick={() => void saveRename()}>{editLoading && <Loader2 className="size-4 animate-spin" />}保存</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteFile)} onOpenChange={(open) => { if (!open && !deleteLoading) setDeleteFile(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>删除素材</DialogTitle><DialogDescription>确定删除“{deleteFile?.name}”吗？若素材仍被内容引用，系统会保留它并提示引用状态。</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" disabled={deleteLoading} onClick={() => setDeleteFile(null)}>取消</Button><Button variant="destructive" disabled={deleteLoading} onClick={() => void confirmDelete()}>{deleteLoading && <Loader2 className="size-4 animate-spin" />}确认删除</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewIndex !== null} onOpenChange={(open) => { if (!open) setPreviewIndex(null); }}>
        <DialogContent className="border-black/30 bg-black p-0 text-white sm:max-w-[90vw]">
          <DialogHeader className="sr-only"><DialogTitle>{previewFile?.name ?? "图片预览"}</DialogTitle><DialogDescription>媒体库图片预览</DialogDescription></DialogHeader>
          {previewFile && (
            <div className="relative flex h-[80vh] items-center justify-center overflow-hidden rounded-lg bg-black">
              <img src={previewFile.url} alt={previewFile.name} className="max-h-full max-w-full object-contain" />
              {imageFiles.length > 1 && <>
                <Button variant="secondary" size="icon" className="absolute left-4 rounded-full bg-black/50 text-white hover:bg-black/70" aria-label="上一张图片" onClick={showPreviousImage}><ChevronLeft className="size-5" /></Button>
                <Button variant="secondary" size="icon" className="absolute right-4 rounded-full bg-black/50 text-white hover:bg-black/70" aria-label="下一张图片" onClick={showNextImage}><ChevronRight className="size-5" /></Button>
              </>}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-5 pb-4 pt-10 text-sm"><p className="truncate font-medium">{previewFile.name}</p><p className="mt-1 text-white/65">{previewIndex! + 1} / {imageFiles.length} · {formatFileSize(previewFile.size)}</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
