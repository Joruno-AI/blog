"use client";

import { AlertDialog, Button, Chip, Spinner, Table } from "@heroui/react";
import { GripVertical, Music2, Pause, Pencil, Play, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
      <Table><Table.ScrollContainer><Table.Content aria-label="专辑歌曲" className="min-w-[760px]"><Table.Header><Table.Column>排序</Table.Column><Table.Column>序号</Table.Column><Table.Column isRowHeader>歌曲名称</Table.Column><Table.Column>时长</Table.Column><Table.Column>来源</Table.Column><Table.Column>播放</Table.Column><Table.Column>操作</Table.Column></Table.Header>
          <Table.Body>{localSongs.map((song) => {
            const url = songUrl(song);
            const isCurrent = current(song);
            return <Table.Row key={song.id} className={cn(isCurrent && "studio-song-current")}><Table.Cell><GripVertical className="text-muted size-4" /></Table.Cell><Table.Cell>{isCurrent ? <Music2 className="text-accent size-4 animate-pulse" /> : song.trackNumber}</Table.Cell><Table.Cell><div className="flex items-center gap-2"><strong className={cn(isCurrent && "text-accent")}>{song.name}</strong>{!url ? <Chip size="sm" variant="soft">无音频</Chip> : null}</div></Table.Cell><Table.Cell><span className="text-muted">{song.duration || "-"}</span></Table.Cell><Table.Cell><Chip size="sm" variant="soft">{song.sourceType === "upload" ? "上传" : "外链"}</Chip></Table.Cell><Table.Cell>{url ? <Button aria-label={`${isCurrent && isPlaying ? "暂停" : "播放"}${song.name}`} isIconOnly onPress={() => handlePlay(song)} size="sm" variant="ghost">{isCurrent && isPlaying ? <Pause className="text-accent size-4" /> : <Play className={cn("size-4", isCurrent && "text-accent")} />}</Button> : <span className="text-muted">-</span>}</Table.Cell><Table.Cell><div className="flex justify-end gap-1"><Button aria-label={`编辑${song.name}`} isIconOnly onPress={() => onEdit?.(song)} size="sm" variant="ghost"><Pencil className="size-4" /></Button><Button aria-label={`删除${song.name}`} isIconOnly onPress={() => setDeleteTarget(song)} size="sm" variant="ghost"><Trash2 className="text-danger size-4" /></Button></div></Table.Cell></Table.Row>;
          })}</Table.Body></Table.Content></Table.ScrollContainer></Table>
      <AlertDialog.Backdrop isOpen={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null); }}><AlertDialog.Container><AlertDialog.Dialog className="sm:max-w-[420px]"><AlertDialog.CloseTrigger /><AlertDialog.Header><AlertDialog.Icon status="danger" /><AlertDialog.Heading>删除歌曲</AlertDialog.Heading></AlertDialog.Header><AlertDialog.Body><p>确定删除“{deleteTarget?.name}”吗？此操作会从专辑中移除这首歌曲。</p></AlertDialog.Body><AlertDialog.Footer><Button isDisabled={deleting} onPress={() => setDeleteTarget(null)} variant="tertiary">取消</Button><Button isDisabled={deleting} onPress={() => void handleDelete()} variant="danger">{deleting ? <Spinner color="current" size="sm" /> : null}确认删除</Button></AlertDialog.Footer></AlertDialog.Dialog></AlertDialog.Container></AlertDialog.Backdrop>
    </>
  );
}

export default SongTable;
