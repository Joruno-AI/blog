"use client";

import { GripVertical, Loader2, Music2, Pause, Pencil, Play, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteSong } from "@/lib/actions/songs";
import type { Song } from "@/lib/db/schema";
import { useMusicPlayerStore } from "@/lib/stores/music-player-store";
import { cn } from "@/lib/utils";

interface SongTableProps {
  songs: Song[];
  albumId?: string;
  albumName?: string;
  albumCover?: string | null;
  albumArtist?: string;
  onEdit?: (song: Song) => void;
}

export function SongTable({ songs, albumId, albumName, albumCover, albumArtist, onEdit }: SongTableProps) {
  const [localSongs, setLocalSongs] = useState(songs);
  const [deleteTarget, setDeleteTarget] = useState<Song | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { currentSong, isPlaying, playSong, pauseSong, resumeSong } = useMusicPlayerStore();

  useEffect(() => setLocalSongs(songs), [songs]);

  const songUrl = (song: Song) => song.sourceType === "upload" ? song.url : song.externalUrl;
  const current = (song: Song) => currentSong?.id === song.id;

  const handlePlay = (song: Song) => {
    const url = songUrl(song);
    if (!url) return;
    if (current(song)) {
      if (isPlaying) pauseSong(); else resumeSong();
      return;
    }
    const playlist = localSongs.filter((item) => songUrl(item)).map((item) => ({ id: item.id, name: item.name, duration: item.duration, durationSeconds: item.durationSeconds, url: songUrl(item) }));
    playSong({ id: song.id, name: song.name, duration: song.duration, durationSeconds: song.durationSeconds, url }, { id: albumId || "unknown", name: albumName || "Unknown Album", artist: albumArtist || "Unknown Artist", cover: albumCover || null }, playlist);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSong(deleteTarget.id);
      setLocalSongs((items) => items.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success("歌曲已删除");
    } catch {
      toast.error("歌曲删除失败");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader><TableRow><TableHead className="w-10" /><TableHead className="w-16 text-center">序号</TableHead><TableHead>歌曲名称</TableHead><TableHead className="w-24 text-center">时长</TableHead><TableHead className="w-24 text-center">来源</TableHead><TableHead className="w-20 text-center">播放</TableHead><TableHead className="w-28 text-right">操作</TableHead></TableRow></TableHeader>
          <TableBody>{localSongs.map((song) => {
            const url = songUrl(song);
            const isCurrent = current(song);
            return <TableRow key={song.id} className={cn(isCurrent && "bg-pink-50/70 dark:bg-pink-950/20")}><TableCell><GripVertical className="size-4 text-muted-foreground" /></TableCell><TableCell className="text-center">{isCurrent ? <Music2 className="mx-auto size-4 animate-pulse text-pink-500" /> : song.trackNumber}</TableCell><TableCell><div className="flex items-center gap-2"><span className={cn("font-medium", isCurrent && "text-pink-500")}>{song.name}</span>{!url && <Badge variant="outline">无音频</Badge>}</div></TableCell><TableCell className="text-center text-muted-foreground">{song.duration || "-"}</TableCell><TableCell className="text-center"><Badge variant="secondary">{song.sourceType === "upload" ? "上传" : "外链"}</Badge></TableCell><TableCell className="text-center">{url ? <Button variant="ghost" size="icon" aria-label={`${isCurrent && isPlaying ? "暂停" : "播放"}${song.name}`} onClick={() => handlePlay(song)}>{isCurrent && isPlaying ? <Pause className="size-4 text-pink-500" /> : <Play className={cn("size-4", isCurrent && "text-pink-500")} />}</Button> : <span className="text-muted-foreground">-</span>}</TableCell><TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" aria-label={`编辑${song.name}`} onClick={() => onEdit?.(song)}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label={`删除${song.name}`} onClick={() => setDeleteTarget(song)}><Trash2 className="size-4" /></Button></div></TableCell></TableRow>;
          })}</TableBody>
        </Table>
      </div>
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null); }}><DialogContent><DialogHeader><DialogTitle>删除歌曲</DialogTitle><DialogDescription>确定删除“{deleteTarget?.name}”吗？此操作会从专辑中移除这首歌曲。</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" disabled={deleting} onClick={() => setDeleteTarget(null)}>取消</Button><Button variant="destructive" disabled={deleting} onClick={() => void handleDelete()}>{deleting && <Loader2 className="size-4 animate-spin" />}确认删除</Button></DialogFooter></DialogContent></Dialog>
    </>
  );
}

export default SongTable;
