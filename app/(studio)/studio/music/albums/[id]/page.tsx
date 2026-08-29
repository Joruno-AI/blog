"use client";

/* eslint-disable @next/next/no-img-element */

import { ArrowLeft, CalendarDays, CheckCircle2, Disc3, Loader2, Music2, Pencil, Plus, Trash2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { SongModal } from "@/components/music/song-modal";
import { SongTable } from "@/components/music/song-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteAlbum, toggleAlbumPublish } from "@/lib/actions/albums";
import type { Album, Song } from "@/lib/db/schema";

interface AlbumDetailPageProps { params: Promise<{ id: string }>; }
interface AlbumWithSongs extends Album { songs: Song[]; }

export default function AlbumDetailPage({ params }: AlbumDetailPageProps) {
  const router = useRouter();
  const [album, setAlbum] = useState<AlbumWithSongs | null>(null);
  const [albumId, setAlbumId] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [songModalOpen, setSongModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);

  useEffect(() => { void params.then(({ id }) => setAlbumId(id)); }, [params]);

  const fetchAlbum = useCallback(async () => {
    if (!albumId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/albums/${encodeURIComponent(albumId)}`);
      if (!response.ok) throw new Error("专辑加载失败");
      setAlbum(await response.json() as AlbumWithSongs);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "专辑加载失败");
      setAlbum(null);
    } finally { setLoading(false); }
  }, [albumId]);

  useEffect(() => { void fetchAlbum(); }, [fetchAlbum]);

  const handleTogglePublish = async () => {
    if (!album) return;
    setPending(true);
    try { await toggleAlbumPublish(album.id); toast.success(album.published ? "已取消发布" : "专辑发布成功"); await fetchAlbum(); }
    catch { toast.error("状态更新失败"); }
    finally { setPending(false); }
  };

  const handleDelete = async () => {
    if (!album) return;
    setPending(true);
    try { await deleteAlbum(album.id); toast.success("专辑已删除"); router.push("/studio/music"); }
    catch { toast.error("专辑删除失败"); setPending(false); }
  };

  if (loading) return <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-sm text-muted-foreground"><Loader2 className="size-7 animate-spin" />正在加载专辑…</div>;
  if (!album) return <div className="flex min-h-80 flex-col items-center justify-center gap-4"><Disc3 className="size-10 text-muted-foreground" /><div className="text-center"><p className="font-medium">专辑不存在</p><p className="mt-1 text-sm text-muted-foreground">它可能已被删除或归档。</p></div><Button asChild><Link href="/studio/music">返回音乐管理</Link></Button></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3"><Button variant="outline" size="icon" asChild><Link href="/studio/music" aria-label="返回音乐管理"><ArrowLeft className="size-4" /></Link></Button><div><h1 className="text-2xl font-semibold tracking-tight">专辑详情</h1><p className="mt-1 text-sm text-muted-foreground">维护专辑信息、发布状态和歌曲列表。</p></div></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={pending} onClick={() => void handleTogglePublish()}>{album.published ? <XCircle className="size-4" /> : <CheckCircle2 className="size-4" />}{album.published ? "取消发布" : "发布"}</Button><Button variant="outline" asChild><Link href={`/studio/music/albums/${encodeURIComponent(album.id)}/edit`}><Pencil className="size-4" />编辑</Link></Button><Button variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="size-4" />删除</Button></div>
      </div>

      <Card><CardContent className="p-6"><div className="flex flex-col gap-6 md:flex-row"><div className="flex size-44 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-pink-500 to-rose-400 shadow-sm">{album.cover ? <img src={album.cover} alt={album.name} className="size-full object-cover" /> : <Disc3 className="size-14 text-white/55" />}</div><div className="flex min-w-0 flex-1 flex-col justify-center"><div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-semibold">{album.name}</h2><Badge variant={album.published ? "default" : "secondary"}>{album.published ? "已发布" : "草稿"}</Badge></div><div className="mt-5 grid gap-4 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">艺术家</p><p className="mt-1 font-medium">{album.artist}</p></div><div><p className="text-xs text-muted-foreground">歌曲数量</p><p className="mt-1 flex items-center gap-1.5 font-medium"><Music2 className="size-4" />{album.songs.length} 首</p></div>{album.releaseDate && <div><p className="text-xs text-muted-foreground">发行日期</p><p className="mt-1 flex items-center gap-1.5 font-medium"><CalendarDays className="size-4" />{new Date(album.releaseDate).toLocaleDateString("zh-CN")}</p></div>}</div>{album.description && <p className="mt-5 max-w-3xl text-sm leading-6 text-muted-foreground">{album.description}</p>}</div></div></CardContent></Card>

      <Card><CardHeader className="border-b"><div className="flex items-center justify-between gap-4"><div><CardTitle className="flex items-center gap-2"><Music2 className="size-5" />歌曲列表 <Badge variant="secondary">{album.songs.length} 首</Badge></CardTitle><CardDescription>试听、编辑或删除专辑中的歌曲。</CardDescription></div><Button onClick={() => { setEditingSong(null); setSongModalOpen(true); }}><Plus className="size-4" />添加歌曲</Button></div></CardHeader><CardContent className="p-4">{album.songs.length ? <SongTable songs={album.songs} albumId={album.id} albumName={album.name} albumCover={album.cover} albumArtist={album.artist} onEdit={(song) => { setEditingSong(song); setSongModalOpen(true); }} /> : <div className="flex min-h-52 flex-col items-center justify-center text-center"><Music2 className="size-9 text-muted-foreground" /><p className="mt-4 font-medium">暂无歌曲</p><p className="mt-1 text-sm text-muted-foreground">添加第一首歌曲开始构建这张专辑。</p><Button className="mt-4" onClick={() => setSongModalOpen(true)}><Plus className="size-4" />添加第一首歌曲</Button></div>}</CardContent></Card>

      <SongModal open={songModalOpen} onClose={() => { setSongModalOpen(false); setEditingSong(null); }} albumId={album.id} song={editingSong} onSuccess={() => void fetchAlbum()} />
      <Dialog open={deleteOpen} onOpenChange={(open) => { if (!pending) setDeleteOpen(open); }}><DialogContent><DialogHeader><DialogTitle>删除专辑</DialogTitle><DialogDescription>确定删除“{album.name}”吗？专辑中的所有歌曲也会一并移除。</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" disabled={pending} onClick={() => setDeleteOpen(false)}>取消</Button><Button variant="destructive" disabled={pending} onClick={() => void handleDelete()}>{pending && <Loader2 className="size-4 animate-spin" />}确认删除</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
