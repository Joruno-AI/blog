"use client";

/* eslint-disable @next/next/no-img-element */

import { AlertDialog, Button, Card, Chip, Dropdown, Label, Separator, Spinner, Table } from "@heroui/react";
import { CheckCircle2, Disc3, Eye, Grid2X2, List, MoreHorizontal, Music2, Pencil, Plus, Trash2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { deleteAlbum, toggleAlbumPublish } from "@/lib/actions/albums";

type ViewMode = "gallery" | "list";
interface Album { id: string; name: string; slug: string; description: string | null; artist: string; cover: string | null; color: string | null; published: boolean; order: number; releaseDate: string | null; createdAt: string; updatedAt: string; songCount: number }

function AlbumArtwork({ album, className }: { album: Album; className?: string }) {
  return <div className={`studio-album-art ${className ?? ""}`} style={!album.cover ? { background: `linear-gradient(135deg, ${album.color || "#18201f"}, ${album.color || "#18201f"}99)` } : undefined}>
    {album.cover ? <img src={album.cover} alt={album.name} /> : <Disc3 className="size-10 text-white/55" />}
  </div>;
}

export default function MusicPage() {
  const router = useRouter();
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
    } catch (error) { toast.error(error instanceof Error ? error.message : "专辑加载失败"); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { void fetchAlbums(); }, [fetchAlbums]);
  const stats = useMemo(() => ({ albums: albums.length, songs: albums.reduce((total, album) => total + album.songCount, 0), published: albums.filter((album) => album.published).length }), [albums]);

  async function handleTogglePublish(album: Album) {
    setPendingAlbumId(album.id);
    try { await toggleAlbumPublish(album.id); toast.success(album.published ? "已取消发布" : "专辑发布成功"); await fetchAlbums(); }
    catch { toast.error("状态更新失败"); }
    finally { setPendingAlbumId(null); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try { await deleteAlbum(deleteTarget.id); toast.success("专辑已删除"); setDeleteTarget(null); await fetchAlbums(); }
    catch { toast.error("专辑删除失败"); }
    finally { setDeleteLoading(false); }
  }

  function AlbumActions({ album }: { album: Album }) {
    return <Dropdown>
      <Button aria-label={`管理专辑 ${album.name}`} isIconOnly size="sm" variant="ghost"><MoreHorizontal className="size-4" /></Button>
      <Dropdown.Popover placement="bottom end"><Dropdown.Menu onAction={(key) => {
        if (key === "view") router.push(`/studio/music/albums/${album.id}`);
        if (key === "edit") router.push(`/studio/music/albums/${album.id}/edit`);
        if (key === "publish") void handleTogglePublish(album);
        if (key === "delete") setDeleteTarget(album);
      }}>
        <Dropdown.Item id="view" textValue="查看详情"><Eye className="text-muted size-4" /><Label>查看详情</Label></Dropdown.Item>
        <Dropdown.Item id="edit" textValue="编辑专辑"><Pencil className="text-muted size-4" /><Label>编辑专辑</Label></Dropdown.Item>
        <Dropdown.Item id="publish" isDisabled={pendingAlbumId === album.id} textValue={album.published ? "取消发布" : "发布专辑"}>{album.published ? <XCircle className="text-muted size-4" /> : <CheckCircle2 className="text-muted size-4" />}<Label>{album.published ? "取消发布" : "发布专辑"}</Label></Dropdown.Item>
        <Separator />
        <Dropdown.Item id="delete" textValue="删除专辑"><Trash2 className="text-danger size-4" /><Label>删除专辑</Label></Dropdown.Item>
      </Dropdown.Menu></Dropdown.Popover>
    </Dropdown>;
  }

  return (
    <main className="studio-dashboard studio-music-page">
      <section className="studio-page-heading">
        <div><p className="studio-eyebrow">Music archive</p><h1>音乐管理</h1><p>管理公开音乐页中的专辑、歌曲和发布状态。</p></div>
        <div className="flex items-center gap-2"><div className="studio-view-toggle"><Button aria-label="画廊视图" isIconOnly onPress={() => setViewMode("gallery")} size="sm" variant={viewMode === "gallery" ? "secondary" : "ghost"}><Grid2X2 className="size-4" /></Button><Button aria-label="列表视图" isIconOnly onPress={() => setViewMode("list")} size="sm" variant={viewMode === "list" ? "secondary" : "ghost"}><List className="size-4" /></Button></div><Button onPress={() => router.push("/studio/music/albums/create")}><Plus className="size-4" />新建专辑</Button></div>
      </section>

      <section className="studio-music-stats">
        {[['专辑总数', stats.albums, '张'], ['歌曲总数', stats.songs, '首'], ['已发布专辑', stats.published, `/ ${stats.albums} 张`]].map(([label, value, unit]) => <Card className="studio-panel" key={label}><Card.Content className="p-4"><p className="text-muted text-xs">{label}</p><p className="mt-1 font-mono text-3xl font-semibold">{value}<small className="text-muted ml-1 text-xs font-normal">{unit}</small></p></Card.Content></Card>)}
      </section>

      <Card className="studio-panel">
        <Card.Header className="studio-panel-heading"><span><Card.Title className="flex items-center gap-2 text-sm"><Music2 className="size-4" />全部专辑</Card.Title><Card.Description className="mt-1 text-xs">所有音乐专辑及其内容状态</Card.Description></span>{isLoading ? <Spinner size="sm" /> : null}</Card.Header>
        <Card.Content className={viewMode === "gallery" ? "studio-album-grid" : "p-0"}>
          {!isLoading && !albums.length ? <div className="studio-empty-state flex-col"><Disc3 className="size-7" /><strong>暂无专辑</strong><span>创建第一张专辑并添加歌曲。</span><Button onPress={() => router.push("/studio/music/albums/create")}><Plus className="size-4" />创建第一张专辑</Button></div> : viewMode === "gallery" ? albums.map((album) => <article className="studio-album-card" key={album.id}>
            <Link href={`/studio/music/albums/${album.id}`}><AlbumArtwork album={album} className="aspect-[4/3]" /><Chip className="absolute right-3 top-3" color={album.published ? "success" : "default"} size="sm" variant="soft">{album.published ? "已发布" : "草稿"}</Chip></Link>
            <div><span className="min-w-0"><Link href={`/studio/music/albums/${album.id}`}><strong>{album.name}</strong></Link><small>{album.artist}</small><small>{album.songCount} 首歌曲</small></span><AlbumActions album={album} /></div>
          </article>) : <Table><Table.ScrollContainer><Table.Content aria-label="音乐专辑" className="min-w-[680px]"><Table.Header><Table.Column isRowHeader>专辑</Table.Column><Table.Column>艺术家</Table.Column><Table.Column>歌曲</Table.Column><Table.Column>状态</Table.Column><Table.Column>操作</Table.Column></Table.Header><Table.Body>{albums.map((album) => <Table.Row key={album.id}><Table.Cell><Link className="flex items-center gap-3" href={`/studio/music/albums/${album.id}`}><AlbumArtwork album={album} className="size-11 shrink-0 rounded-md" /><strong>{album.name}</strong></Link></Table.Cell><Table.Cell>{album.artist}</Table.Cell><Table.Cell>{album.songCount} 首</Table.Cell><Table.Cell><Chip color={album.published ? "success" : "default"} size="sm" variant="soft">{album.published ? "已发布" : "草稿"}</Chip></Table.Cell><Table.Cell><AlbumActions album={album} /></Table.Cell></Table.Row>)}</Table.Body></Table.Content></Table.ScrollContainer></Table>}
        </Card.Content>
      </Card>

      <AlertDialog.Backdrop isOpen={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open && !deleteLoading) setDeleteTarget(null); }}><AlertDialog.Container><AlertDialog.Dialog className="sm:max-w-[420px]"><AlertDialog.CloseTrigger /><AlertDialog.Header><AlertDialog.Icon status="danger" /><AlertDialog.Heading>删除专辑</AlertDialog.Heading></AlertDialog.Header><AlertDialog.Body><p>确定删除“{deleteTarget?.name}”吗？这张专辑中的歌曲也会一并移除。</p></AlertDialog.Body><AlertDialog.Footer><Button isDisabled={deleteLoading} onPress={() => setDeleteTarget(null)} variant="tertiary">取消</Button><Button isDisabled={deleteLoading} onPress={() => void handleDelete()} variant="danger">{deleteLoading ? <Spinner color="current" size="sm" /> : null}确认删除</Button></AlertDialog.Footer></AlertDialog.Dialog></AlertDialog.Container></AlertDialog.Backdrop>
    </main>
  );
}
