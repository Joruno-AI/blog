"use client";

/* eslint-disable @next/next/no-img-element */

import { CheckCircle2, Disc3, Eye, Grid2X2, List, Loader2, MoreHorizontal, Music2, Pencil, Plus, Trash2, XCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteAlbum, toggleAlbumPublish } from "@/lib/actions/albums";

type ViewMode = "gallery" | "list";

interface Album {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  artist: string;
  cover: string | null;
  color: string | null;
  published: boolean;
  order: number;
  releaseDate: string | null;
  createdAt: string;
  updatedAt: string;
  songCount: number;
}

function AlbumArtwork({ album, className }: { album: Album; className?: string }) {
  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-muted ${className ?? ""}`} style={!album.cover ? { background: `linear-gradient(135deg, ${album.color || "#1a1a2e"}, ${album.color || "#1a1a2e"}99)` } : undefined}>
      {album.cover ? <img src={album.cover} alt={album.name} className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" /> : <Disc3 className="size-12 text-white/55" />}
    </div>
  );
}

export default function MusicPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("gallery");
  const [deleteTarget, setDeleteTarget] = useState<Album | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [pendingAlbumId, setPendingAlbumId] = useState<string | null>(null);

  const fetchAlbums = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/albums?limit=100");
      if (!response.ok) throw new Error("专辑加载失败");
      const payload = await response.json() as { albums?: Album[] };
      setAlbums(payload.albums ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "专辑加载失败");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void fetchAlbums(); }, [fetchAlbums]);

  const stats = useMemo(() => ({
    albums: albums.length,
    songs: albums.reduce((total, album) => total + album.songCount, 0),
    published: albums.filter((album) => album.published).length,
  }), [albums]);

  const handleTogglePublish = async (album: Album) => {
    setPendingAlbumId(album.id);
    try {
      await toggleAlbumPublish(album.id);
      toast.success(album.published ? "已取消发布" : "专辑发布成功");
      await fetchAlbums();
    } catch {
      toast.error("状态更新失败");
    } finally {
      setPendingAlbumId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteAlbum(deleteTarget.id);
      toast.success("专辑已删除");
      setDeleteTarget(null);
      await fetchAlbums();
    } catch {
      toast.error("专辑删除失败");
    } finally {
      setDeleteLoading(false);
    }
  };

  const albumActions = (album: Album) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`管理专辑 ${album.name}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild><Link href={`/studio/music/albums/${album.id}`}><Eye className="size-4" />查看详情</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href={`/studio/music/albums/${album.id}/edit`}><Pencil className="size-4" />编辑专辑</Link></DropdownMenuItem>
        <DropdownMenuItem disabled={pendingAlbumId === album.id} onClick={() => void handleTogglePublish(album)}>{album.published ? <XCircle className="size-4" /> : <CheckCircle2 className="size-4" />}{album.published ? "取消发布" : "发布专辑"}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(album)}><Trash2 className="size-4" />删除专辑</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div><h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight"><Music2 className="size-6 text-pink-500" />音乐管理</h1><p className="mt-1 text-sm text-muted-foreground">管理公开音乐页中的专辑、歌曲和发布状态。</p></div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border p-1"><Button variant={viewMode === "gallery" ? "secondary" : "ghost"} size="icon" className="size-8" aria-label="画廊视图" onClick={() => setViewMode("gallery")}><Grid2X2 className="size-4" /></Button><Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" className="size-8" aria-label="列表视图" onClick={() => setViewMode("list")}><List className="size-4" /></Button></div>
          <Button asChild><Link href="/studio/music/albums/create"><Plus className="size-4" />新建专辑</Link></Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardDescription>专辑总数</CardDescription><CardTitle className="text-3xl">{stats.albums}<span className="ml-1 text-sm font-normal text-muted-foreground">张</span></CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>歌曲总数</CardDescription><CardTitle className="text-3xl">{stats.songs}<span className="ml-1 text-sm font-normal text-muted-foreground">首</span></CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>已发布专辑</CardDescription><CardTitle className="text-3xl">{stats.published}<span className="ml-1 text-sm font-normal text-muted-foreground">/ {stats.albums} 张</span></CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader className="border-b"><div className="flex items-center justify-between gap-3"><div><CardTitle>全部专辑</CardTitle><CardDescription>所有音乐专辑及其内容状态</CardDescription></div>{isLoading && <Loader2 className="size-5 animate-spin text-muted-foreground" />}</div></CardHeader>
        <CardContent className={viewMode === "gallery" ? "p-4" : "p-0"}>
          {!isLoading && albums.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center text-center"><span className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted"><Disc3 className="size-6 text-muted-foreground" /></span><p className="font-medium">暂无专辑</p><p className="mt-1 text-sm text-muted-foreground">创建第一张专辑并添加歌曲。</p><Button asChild className="mt-5"><Link href="/studio/music/albums/create"><Plus className="size-4" />创建第一张专辑</Link></Button></div>
          ) : viewMode === "gallery" ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
              {albums.map((album) => <article key={album.id} className="group overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"><Link href={`/studio/music/albums/${album.id}`} className="relative block"><AlbumArtwork album={album} className="aspect-[4/3]" /><Badge variant={album.published ? "default" : "secondary"} className="absolute right-3 top-3">{album.published ? "已发布" : "草稿"}</Badge></Link><div className="flex items-start justify-between gap-3 p-4"><div className="min-w-0"><Link href={`/studio/music/albums/${album.id}`} className="block truncate font-medium hover:underline">{album.name}</Link><p className="mt-1 truncate text-sm text-muted-foreground">{album.artist}</p><p className="mt-2 text-xs text-muted-foreground">{album.songCount} 首歌曲</p></div>{albumActions(album)}</div></article>)}
            </div>
          ) : (
            <Table><TableHeader><TableRow><TableHead>专辑</TableHead><TableHead>艺术家</TableHead><TableHead>歌曲</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader><TableBody>{albums.map((album) => <TableRow key={album.id}><TableCell><Link href={`/studio/music/albums/${album.id}`} className="flex items-center gap-3"><AlbumArtwork album={album} className="size-11 shrink-0 rounded-md" /><span className="font-medium hover:underline">{album.name}</span></Link></TableCell><TableCell className="text-muted-foreground">{album.artist}</TableCell><TableCell className="text-muted-foreground">{album.songCount} 首</TableCell><TableCell><Badge variant={album.published ? "default" : "secondary"}>{album.published ? "已发布" : "草稿"}</Badge></TableCell><TableCell><div className="flex justify-end">{albumActions(album)}</div></TableCell></TableRow>)}</TableBody></Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open && !deleteLoading) setDeleteTarget(null); }}><DialogContent><DialogHeader><DialogTitle>删除专辑</DialogTitle><DialogDescription>确定删除“{deleteTarget?.name}”吗？删除后将同时移除这张专辑中的所有歌曲。</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" disabled={deleteLoading} onClick={() => setDeleteTarget(null)}>取消</Button><Button variant="destructive" disabled={deleteLoading} onClick={() => void handleDelete()}>{deleteLoading && <Loader2 className="size-4 animate-spin" />}确认删除</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
