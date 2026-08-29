"use client";

/* eslint-disable @next/next/no-img-element */

import { AlertDialog, Button, Card, Chip, Input, Label, Modal, Spinner, Table, TextField } from "@heroui/react";
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
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

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
      <Button variant="ghost" size="sm" isIconOnly aria-label={copiedId === file.id ? "已复制素材地址" : "复制素材地址"} onPress={() => void copyUrl(file)}>
        <Clipboard className="size-4" />
      </Button>
      <Button variant="ghost" size="sm" isIconOnly aria-label="下载素材" onPress={() => {
        const anchor = document.createElement("a");
        anchor.href = file.url;
        anchor.download = file.name;
        anchor.target = "_blank";
        anchor.rel = "noreferrer";
        anchor.click();
      }}>
        <Download className="size-4" />
      </Button>
      <Button variant="ghost" size="sm" isIconOnly aria-label="重命名素材" onPress={() => startRename(file)}>
        <Pencil className="size-4" />
      </Button>
      <Button variant="ghost" size="sm" isIconOnly aria-label="删除素材" onPress={() => setDeleteFile(file)}>
        <Trash2 className="text-danger size-4" />
      </Button>
    </div>
  );

  const previewFile = previewIndex === null ? null : imageFiles[previewIndex];

  return (
    <main className="studio-dashboard studio-media-page">
      <section className="studio-page-heading">
        <div><p className="studio-eyebrow">Asset library</p><h1>媒体库</h1><p>集中管理图片、音频、视频和文档素材。</p></div>
        <div className="flex items-center gap-2"><div className="studio-view-toggle"><Button aria-label="网格视图" isIconOnly onPress={() => setViewMode("grid")} size="sm" variant={viewMode === "grid" ? "secondary" : "ghost"}><Grid2X2 className="size-4" /></Button><Button aria-label="列表视图" isIconOnly onPress={() => setViewMode("list")} size="sm" variant={viewMode === "list" ? "secondary" : "ghost"}><List className="size-4" /></Button></div><input ref={fileInputRef} className="hidden" type="file" accept={ACCEPTED_FILES} multiple onChange={(event) => handleFiles(event.target.files)} /><Button onPress={() => fileInputRef.current?.click()}><Upload className="size-4" />上传素材</Button></div>
      </section>

      {uploadingFiles.length ? <Card className="studio-panel"><Card.Header className="studio-panel-heading"><span><Card.Title className="text-sm">上传任务</Card.Title><Card.Description className="mt-1 text-xs">{uploadingFiles.length} 个文件正在处理</Card.Description></span></Card.Header><Card.Content className="grid gap-3 p-4">{uploadingFiles.map((file) => <div className="studio-upload-task" key={file.id}><div className="studio-upload-thumb">{file.thumbnail ? <img src={file.thumbnail} alt="" /> : <FileIcon className="size-5" />}</div><div className="min-w-0 flex-1"><div className="mb-1 flex items-center justify-between gap-3 text-sm"><strong className="truncate">{file.name}</strong><span className="text-muted shrink-0">{file.progress}%</span></div><div className="studio-upload-track"><div className={cn("studio-upload-progress", file.status === "error" && "is-error")} style={{ width: `${file.progress}%` }} /></div></div>{file.status === "uploading" ? <Button aria-label="取消上传" isIconOnly onPress={() => cancelUpload(file.id)} size="sm" variant="ghost"><X className="size-4" /></Button> : null}</div>)}</Card.Content></Card> : null}

      <Card className="studio-panel">
        <Card.Header className="studio-panel-heading"><span><Card.Title>全部素材</Card.Title><Card.Description className="mt-1 text-xs">共 {mediaFiles.length} 个素材，每页最多展示 {PAGE_SIZE} 个</Card.Description></span>{isLoading ? <Spinner size="sm" /> : null}</Card.Header>
        <Card.Content className="p-0">
          {!isLoading && !mediaFiles.length ? <div className="studio-empty-state min-h-72 flex-col"><ImageIcon className="size-8" /><strong>还没有素材</strong><span>上传文件后，可在文章、音乐和页面中复用。</span><Button onPress={() => fileInputRef.current?.click()}><Upload className="size-4" />上传第一个素材</Button></div> : viewMode === "grid" ? <div className="studio-media-grid">{visibleFiles.map((file) => <article className="studio-media-card" key={file.id}><button type="button" className="studio-media-preview" onClick={() => openFile(file)}>{isImage(file.type) ? <img src={file.url} alt={file.name} loading="lazy" /> : <MediaGlyph type={file.type} className="size-10" />}<Chip className="absolute left-2 top-2" size="sm" variant="soft">{mediaKind(file.type)}</Chip></button><div className="mt-3 min-w-0"><strong className="block truncate text-sm" title={file.name}>{file.name}</strong><small className="text-muted">{formatFileSize(file.size)}</small></div><div className="mt-2 border-t pt-1">{actions(file)}</div></article>)}</div> : <Table><Table.ScrollContainer><Table.Content aria-label="媒体素材" className="min-w-[720px]"><Table.Header><Table.Column isRowHeader>素材</Table.Column><Table.Column>类型</Table.Column><Table.Column>大小</Table.Column><Table.Column>上传时间</Table.Column><Table.Column>操作</Table.Column></Table.Header><Table.Body>{visibleFiles.map((file) => <Table.Row key={file.id}><Table.Cell><button type="button" className="flex min-w-0 items-center gap-3 text-left" onClick={() => openFile(file)}><span className="studio-media-row-thumb">{isImage(file.type) ? <img src={file.url} alt="" loading="lazy" /> : <MediaGlyph type={file.type} className="size-5" />}</span><strong className="max-w-80 truncate">{file.name}</strong></button></Table.Cell><Table.Cell><Chip size="sm" variant="soft">{mediaKind(file.type)}</Chip></Table.Cell><Table.Cell><span className="text-muted">{formatFileSize(file.size)}</span></Table.Cell><Table.Cell><span className="text-muted">{new Date(file.createdAt).toLocaleDateString("zh-CN")}</span></Table.Cell><Table.Cell>{actions(file)}</Table.Cell></Table.Row>)}</Table.Body></Table.Content></Table.ScrollContainer></Table>}
        </Card.Content>
      </Card>

      {totalPages > 1 ? <div className="studio-table-pagination"><span>第 {page} / {totalPages} 页</span><div className="flex gap-2"><Button isDisabled={page <= 1} onPress={() => setPage((current) => Math.max(1, current - 1))} size="sm" variant="outline"><ChevronLeft className="size-4" />上一页</Button><Button isDisabled={page >= totalPages} onPress={() => setPage((current) => Math.min(totalPages, current + 1))} size="sm" variant="outline">下一页<ChevronRight className="size-4" /></Button></div></div> : null}

      <Modal.Backdrop isOpen={Boolean(editFile)} onOpenChange={(open) => { if (!open && !editLoading) setEditFile(null); }}><Modal.Container><Modal.Dialog className="sm:max-w-md"><Modal.CloseTrigger /><Modal.Header><Modal.Icon className="bg-accent-soft text-accent-soft-foreground"><Pencil className="size-5" /></Modal.Icon><Modal.Heading>重命名素材</Modal.Heading></Modal.Header><Modal.Body><p className="text-muted mb-4 text-sm">只修改媒体库显示名称，不会改变访问地址。</p><TextField value={editName} onChange={setEditName}><Label>素材名称</Label><Input autoFocus maxLength={500} onKeyDown={(event) => { if (event.key === "Enter") void saveRename(); }} /></TextField></Modal.Body><Modal.Footer><Button isDisabled={editLoading} onPress={() => setEditFile(null)} variant="tertiary">取消</Button><Button isDisabled={editLoading || !editName.trim()} onPress={() => void saveRename()}>{editLoading ? <Spinner color="current" size="sm" /> : null}保存</Button></Modal.Footer></Modal.Dialog></Modal.Container></Modal.Backdrop>

      <AlertDialog.Backdrop isOpen={Boolean(deleteFile)} onOpenChange={(open) => { if (!open && !deleteLoading) setDeleteFile(null); }}><AlertDialog.Container><AlertDialog.Dialog className="sm:max-w-[420px]"><AlertDialog.CloseTrigger /><AlertDialog.Header><AlertDialog.Icon status="danger" /><AlertDialog.Heading>删除素材</AlertDialog.Heading></AlertDialog.Header><AlertDialog.Body><p>确定删除“{deleteFile?.name}”吗？若素材仍被内容引用，系统会保留它并提示引用状态。</p></AlertDialog.Body><AlertDialog.Footer><Button isDisabled={deleteLoading} onPress={() => setDeleteFile(null)} variant="tertiary">取消</Button><Button isDisabled={deleteLoading} onPress={() => void confirmDelete()} variant="danger">{deleteLoading ? <Spinner color="current" size="sm" /> : null}确认删除</Button></AlertDialog.Footer></AlertDialog.Dialog></AlertDialog.Container></AlertDialog.Backdrop>

      <Modal.Backdrop isOpen={previewIndex !== null} onOpenChange={(open) => { if (!open) setPreviewIndex(null); }}><Modal.Container><Modal.Dialog className="studio-image-dialog"><Modal.CloseTrigger />{previewFile ? <Modal.Body className="p-0"><div className="studio-lightbox"><img src={previewFile.url} alt={previewFile.name} />{imageFiles.length > 1 ? <><Button aria-label="上一张图片" className="studio-lightbox-prev" isIconOnly onPress={showPreviousImage} variant="secondary"><ChevronLeft className="size-5" /></Button><Button aria-label="下一张图片" className="studio-lightbox-next" isIconOnly onPress={showNextImage} variant="secondary"><ChevronRight className="size-5" /></Button></> : null}<div className="studio-lightbox-caption"><strong>{previewFile.name}</strong><small>{previewIndex! + 1} / {imageFiles.length} · {formatFileSize(previewFile.size)}</small></div></div></Modal.Body> : null}</Modal.Dialog></Modal.Container></Modal.Backdrop>
    </main>
  );
}
