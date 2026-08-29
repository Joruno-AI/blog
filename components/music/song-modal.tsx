"use client";

import { Loader2, Music2, Upload } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSong, updateSong } from "@/lib/actions/songs";
import type { Song } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

interface SongModalProps { open: boolean; onClose: () => void; albumId: string; song?: Song | null; onSuccess?: () => void; }

export function SongModal({ open, onClose, albumId, song, onSuccess }: SongModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sourceType, setSourceType] = useState<"upload" | "external">("upload");
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [duration, setDuration] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setSourceType(song?.sourceType === "external" ? "external" : "upload");
    setUploadedUrl(song?.url || "");
    setDuration(song?.duration || "");
  }, [open, song]);

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    const objectUrl = URL.createObjectURL(file);
    try {
      const metadata = new Promise<void>((resolve) => {
        const audio = new Audio(objectUrl);
        audio.onloadedmetadata = () => { if (Number.isFinite(audio.duration)) setDuration(`${Math.floor(audio.duration / 60)}:${Math.floor(audio.duration % 60).toString().padStart(2, "0")}`); resolve(); };
        audio.onerror = () => resolve();
      });
      const formData = new FormData(); formData.append("file", file);
      const response = await fetch("/api/media", { method: "POST", body: formData });
      if (!response.ok) throw new Error("音频上传失败");
      const payload = await response.json() as { url: string };
      setUploadedUrl(payload.url);
      await metadata;
      toast.success("音频上传成功");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "音频上传失败");
    } finally {
      URL.revokeObjectURL(objectUrl);
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("albumId", albumId);
    formData.set("sourceType", sourceType);
    formData.set("url", sourceType === "upload" ? uploadedUrl : "");
    if (sourceType === "upload") formData.set("externalUrl", "");
    if (sourceType === "upload" && !uploadedUrl) { toast.error("请先上传音频文件"); return; }
    setLoading(true);
    try {
      if (song) await updateSong(song.id, formData); else await createSong(formData);
      toast.success(song ? "歌曲已更新" : "歌曲已添加");
      onSuccess?.(); onClose();
    } catch {
      toast.error("歌曲保存失败");
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !loading) onClose(); }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Music2 className="size-5" />{song ? "编辑歌曲" : "添加歌曲"}</DialogTitle><DialogDescription>维护歌曲信息、音频来源和歌词。</DialogDescription></DialogHeader>
        <form id="song-form" className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2"><Label htmlFor="song-name">歌曲名称</Label><Input id="song-name" name="name" key={`${song?.id ?? "new"}-name`} defaultValue={song?.name ?? ""} placeholder="请输入歌曲名称" required /></div>
          <div className="space-y-2"><Label htmlFor="song-duration">时长</Label><Input id="song-duration" name="duration" value={duration} onChange={(event) => setDuration(event.target.value)} placeholder="例如 3:45" pattern="(?:\d+:)?[0-5]?\d:[0-5]\d|\d+:[0-5]\d" /><p className="text-xs text-muted-foreground">上传音频后会自动读取，也可以手动填写。</p></div>
          <div className="space-y-2"><Label>音频来源</Label><div className="grid grid-cols-2 gap-2"><button type="button" className={cn("rounded-lg border px-3 py-2 text-sm", sourceType === "upload" && "border-primary bg-primary/5 text-primary")} onClick={() => setSourceType("upload")}>上传文件</button><button type="button" className={cn("rounded-lg border px-3 py-2 text-sm", sourceType === "external" && "border-primary bg-primary/5 text-primary")} onClick={() => setSourceType("external")}>外部链接</button></div></div>
          {sourceType === "upload" ? <div className="space-y-2"><Label>音频文件</Label><input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={(event) => void handleUpload(event.target.files?.[0])} /><div className="flex items-center gap-3">{uploadedUrl && <audio controls src={uploadedUrl} className="h-10 min-w-0 flex-1" />}<Button type="button" variant="outline" disabled={uploading} onClick={() => fileInputRef.current?.click()}>{uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}{uploadedUrl ? "更换文件" : "上传音频"}</Button></div></div> : <div className="space-y-2"><Label htmlFor="external-url">外部链接</Label><Input id="external-url" name="externalUrl" type="url" key={`${song?.id ?? "new"}-url`} defaultValue={song?.externalUrl ?? ""} placeholder="https://example.com/song.mp3" required /></div>}
          <div className="space-y-2"><Label htmlFor="song-lyrics">歌词</Label><Textarea id="song-lyrics" name="lyrics" key={`${song?.id ?? "new"}-lyrics`} defaultValue={song?.lyrics ?? ""} rows={5} maxLength={5000} placeholder="请输入歌词（可选）" /></div>
        </form>
        <DialogFooter><Button variant="outline" disabled={loading} onClick={onClose}>取消</Button><Button form="song-form" type="submit" disabled={loading || uploading}>{loading && <Loader2 className="size-4 animate-spin" />}保存</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SongModal;
