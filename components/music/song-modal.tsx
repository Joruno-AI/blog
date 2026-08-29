"use client";

import { Button, Description, Input, Label, Modal, Spinner, TextArea, TextField } from "@heroui/react";
import { Music2, Upload } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { createSong, updateSong } from "@/lib/actions/songs";
import type { Song } from "@/lib/db/schema";

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
    <Modal.Backdrop isOpen={open} onOpenChange={(next) => { if (!next && !loading) onClose(); }}><Modal.Container><Modal.Dialog className="sm:max-w-xl"><Modal.CloseTrigger /><Modal.Header><Modal.Icon className="bg-accent-soft text-accent-soft-foreground"><Music2 className="size-5" /></Modal.Icon><Modal.Heading>{song ? "编辑歌曲" : "添加歌曲"}</Modal.Heading></Modal.Header><Modal.Body><p className="text-muted mb-5 text-sm">维护歌曲信息、音频来源和歌词。</p><form id="song-form" className="grid gap-5" onSubmit={(event) => void handleSubmit(event)}>
      <TextField defaultValue={song?.name ?? ""} isRequired key={`${song?.id ?? "new"}-name`}><Label>歌曲名称</Label><Input name="name" placeholder="请输入歌曲名称" /></TextField>
      <TextField value={duration} onChange={setDuration}><Label>时长</Label><Input name="duration" placeholder="例如 3:45" pattern="(?:\d+:)?[0-5]?\d:[0-5]\d|\d+:[0-5]\d" /><Description>上传音频后会自动读取，也可以手动填写。</Description></TextField>
      <div><Label>音频来源</Label><div className="mt-2 grid grid-cols-2 gap-2"><Button onPress={() => setSourceType("upload")} variant={sourceType === "upload" ? "secondary" : "outline"}>上传文件</Button><Button onPress={() => setSourceType("external")} variant={sourceType === "external" ? "secondary" : "outline"}>外部链接</Button></div></div>
      {sourceType === "upload" ? <div><Label>音频文件</Label><input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={(event) => void handleUpload(event.target.files?.[0])} /><div className="mt-2 flex items-center gap-3">{uploadedUrl ? <audio controls src={uploadedUrl} className="h-10 min-w-0 flex-1" /> : null}<Button isDisabled={uploading} onPress={() => fileInputRef.current?.click()} variant="outline">{uploading ? <Spinner color="current" size="sm" /> : <Upload className="size-4" />}{uploadedUrl ? "更换文件" : "上传音频"}</Button></div></div> : <TextField defaultValue={song?.externalUrl ?? ""} isRequired key={`${song?.id ?? "new"}-url`} type="url"><Label>外部链接</Label><Input name="externalUrl" placeholder="https://example.com/song.mp3" /></TextField>}
      <TextField defaultValue={song?.lyrics ?? ""} key={`${song?.id ?? "new"}-lyrics`}><Label>歌词</Label><TextArea name="lyrics" className="min-h-36" maxLength={5000} placeholder="请输入歌词（可选）" /></TextField>
    </form></Modal.Body><Modal.Footer><Button isDisabled={loading} onPress={onClose} variant="tertiary">取消</Button><Button form="song-form" type="submit" isDisabled={loading || uploading}>{loading ? <Spinner color="current" size="sm" /> : null}保存</Button></Modal.Footer></Modal.Dialog></Modal.Container></Modal.Backdrop>
  );
}

export default SongModal;
