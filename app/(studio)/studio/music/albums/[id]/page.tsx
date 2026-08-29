"use client";

/* eslint-disable @next/next/no-img-element */

import { AlertDialog, Button, Card, Chip, Spinner } from "@heroui/react";
import { ArrowLeft, CalendarDays, CheckCircle2, Disc3, Music2, Pencil, Plus, Trash2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { SongModal } from "@/components/music/song-modal";
import { SongTable } from "@/components/music/song-table";
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

  if (loading) return <div className="studio-empty-state min-h-80"><Spinner size="sm" />正在加载专辑…</div>;
  if (!album) return <div className="studio-empty-state min-h-80 flex-col"><Disc3 className="size-10" /><strong>专辑不存在</strong><span>它可能已被删除或归档。</span><Button onPress={() => router.push("/studio/music")}>返回音乐管理</Button></div>;

  return (
    <main className="studio-dashboard studio-album-detail">
      <section className="studio-page-heading"><div className="flex items-center gap-3"><Button aria-label="返回音乐管理" isIconOnly onPress={() => router.push("/studio/music")} variant="outline"><ArrowLeft className="size-4" /></Button><div><p className="studio-eyebrow">Music archive</p><h1>专辑详情</h1><p>维护专辑信息、发布状态和歌曲列表。</p></div></div><div className="flex flex-wrap gap-2"><Button isDisabled={pending} onPress={() => void handleTogglePublish()} variant="outline">{album.published ? <XCircle className="size-4" /> : <CheckCircle2 className="size-4" />}{album.published ? "取消发布" : "发布"}</Button><Button onPress={() => router.push(`/studio/music/albums/${encodeURIComponent(album.id)}/edit`)} variant="outline"><Pencil className="size-4" />编辑</Button><Button onPress={() => setDeleteOpen(true)} variant="danger"><Trash2 className="size-4" />删除</Button></div></section>

      <Card className="studio-panel"><Card.Content className="p-6"><div className="flex flex-col gap-6 md:flex-row"><div className="studio-album-hero-art">{album.cover ? <img src={album.cover} alt={album.name} /> : <Disc3 className="size-14 text-white/55" />}</div><div className="flex min-w-0 flex-1 flex-col justify-center"><div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-semibold">{album.name}</h2><Chip color={album.published ? "success" : "default"} size="sm" variant="soft">{album.published ? "已发布" : "草稿"}</Chip></div><div className="mt-5 grid gap-4 sm:grid-cols-3"><div><p className="text-muted text-xs">艺术家</p><p className="mt-1 font-medium">{album.artist}</p></div><div><p className="text-muted text-xs">歌曲数量</p><p className="mt-1 flex items-center gap-1.5 font-medium"><Music2 className="size-4" />{album.songs.length} 首</p></div>{album.releaseDate ? <div><p className="text-muted text-xs">发行日期</p><p className="mt-1 flex items-center gap-1.5 font-medium"><CalendarDays className="size-4" />{new Date(album.releaseDate).toLocaleDateString("zh-CN")}</p></div> : null}</div>{album.description ? <p className="text-muted mt-5 max-w-3xl text-sm leading-6">{album.description}</p> : null}</div></div></Card.Content></Card>

      <Card className="studio-panel"><Card.Header className="studio-panel-heading"><span><Card.Title className="flex items-center gap-2"><Music2 className="size-5" />歌曲列表 <Chip size="sm" variant="soft">{album.songs.length} 首</Chip></Card.Title><Card.Description className="mt-1 text-xs">试听、编辑或删除专辑中的歌曲。</Card.Description></span><Button onPress={() => { setEditingSong(null); setSongModalOpen(true); }}><Plus className="size-4" />添加歌曲</Button></Card.Header><Card.Content className="p-4">{album.songs.length ? <SongTable songs={album.songs} albumId={album.id} albumName={album.name} albumCover={album.cover} albumArtist={album.artist} onEdit={(song) => { setEditingSong(song); setSongModalOpen(true); }} /> : <div className="studio-empty-state min-h-52 flex-col"><Music2 className="size-9" /><strong>暂无歌曲</strong><span>添加第一首歌曲开始构建这张专辑。</span><Button onPress={() => setSongModalOpen(true)}><Plus className="size-4" />添加第一首歌曲</Button></div>}</Card.Content></Card>

      <SongModal open={songModalOpen} onClose={() => { setSongModalOpen(false); setEditingSong(null); }} albumId={album.id} song={editingSong} onSuccess={() => void fetchAlbum()} />
      <AlertDialog.Backdrop isOpen={deleteOpen} onOpenChange={(open) => { if (!pending) setDeleteOpen(open); }}><AlertDialog.Container><AlertDialog.Dialog className="sm:max-w-[420px]"><AlertDialog.CloseTrigger /><AlertDialog.Header><AlertDialog.Icon status="danger" /><AlertDialog.Heading>删除专辑</AlertDialog.Heading></AlertDialog.Header><AlertDialog.Body><p>确定删除“{album.name}”吗？专辑中的所有歌曲也会一并移除。</p></AlertDialog.Body><AlertDialog.Footer><Button isDisabled={pending} onPress={() => setDeleteOpen(false)} variant="tertiary">取消</Button><Button isDisabled={pending} onPress={() => void handleDelete()} variant="danger">{pending ? <Spinner color="current" size="sm" /> : null}确认删除</Button></AlertDialog.Footer></AlertDialog.Dialog></AlertDialog.Container></AlertDialog.Backdrop>
    </main>
  );
}
