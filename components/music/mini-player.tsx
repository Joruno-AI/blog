"use client";

/* eslint-disable @next/next/no-img-element */

import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@heroui/react";
import { Disc3, Maximize2, Minimize2, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { useMusicPlayerStore } from "@/lib/stores/music-player-store";

function formatTime(seconds: number) {
  if (!seconds || Number.isNaN(seconds)) return "0:00";
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

export function MiniPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { currentSong, currentAlbum, isPlaying, currentTime, duration, volume, isMuted, isExpanded, togglePlay, nextSong, prevSong, setCurrentTime, setDuration, setVolume, toggleMute, toggleExpanded, closeMiniPlayer } = useMusicPlayerStore();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) void audio.play().catch(console.error); else audio.pause();
  }, [isPlaying, currentSong]);
  useEffect(() => { if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume; }, [volume, isMuted]);

  if (!currentSong || !currentAlbum) return null;
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const seek = (value: number) => { if (!audioRef.current) return; audioRef.current.currentTime = value; setCurrentTime(value); };

  return (
    <>
      <audio ref={audioRef} src={currentSong.url || undefined} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)} onEnded={nextSong} preload="metadata" />
      <AnimatePresence mode="wait">
        {isExpanded ? (
          <motion.aside key="expanded" initial={{ opacity: 0, scale: .94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .94, y: 20 }} className="fixed bottom-6 right-6 z-50 w-80 overflow-hidden rounded-2xl border bg-card shadow-2xl" aria-label="音乐播放器">
            <div className="absolute right-3 top-3 z-10 flex gap-1"><Button variant="secondary" isIconOnly className="size-8 rounded-full bg-black/45 text-white hover:bg-black/65" aria-label="收起播放器" onPress={toggleExpanded}><Minimize2 className="size-4" /></Button><Button variant="secondary" isIconOnly className="size-8 rounded-full bg-black/45 text-white hover:bg-black/65" aria-label="关闭播放器" onPress={closeMiniPlayer}><X className="size-4" /></Button></div>
            <div className="relative aspect-square bg-gradient-to-br from-pink-500 to-rose-400">{currentAlbum.cover ? <img src={currentAlbum.cover} alt={currentAlbum.name} className="size-full object-cover" /> : <div className="flex size-full items-center justify-center"><Disc3 className="size-16 text-white/55" /></div>}<div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" /><div className="absolute inset-x-4 bottom-4 text-white"><h3 className="truncate text-lg font-semibold">{currentSong.name}</h3><p className="truncate text-sm text-white/75">{currentAlbum.artist} · {currentAlbum.name}</p></div></div>
            <div className="space-y-4 p-4"><div><input type="range" min={0} max={duration || 100} step="0.1" value={currentTime} aria-label="播放进度" onChange={(event) => seek(Number(event.target.value))} className="h-1.5 w-full accent-pink-500" /><div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div></div><div className="flex items-center justify-center gap-5"><Button variant="ghost" isIconOnly aria-label="上一首" onPress={prevSong}><SkipBack className="size-5" /></Button><Button isIconOnly className="size-13 rounded-full bg-pink-500 hover:bg-pink-600" aria-label={isPlaying ? "暂停" : "播放"} onPress={togglePlay}>{isPlaying ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}</Button><Button variant="ghost" isIconOnly aria-label="下一首" onPress={nextSong}><SkipForward className="size-5" /></Button></div><div className="flex items-center gap-2"><Button variant="ghost" isIconOnly className="size-8" aria-label={isMuted ? "取消静音" : "静音"} onPress={toggleMute}>{isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}</Button><input type="range" min={0} max={100} value={isMuted ? 0 : volume * 100} aria-label="音量" onChange={(event) => setVolume(Number(event.target.value) / 100)} className="h-1.5 flex-1 accent-pink-500" /></div></div>
          </motion.aside>
        ) : (
          <motion.aside key="mini" initial={{ opacity: 0, y: 40, scale: .9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: .9 }} className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full border bg-card px-3 py-2 shadow-xl" aria-label="迷你音乐播放器">
            <button type="button" className="flex min-w-0 items-center gap-3" onClick={toggleExpanded}><motion.span animate={{ rotate: isPlaying ? 360 : 0 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-pink-500 to-rose-400">{currentAlbum.cover ? <img src={currentAlbum.cover} alt="" className="size-full object-cover" /> : <Disc3 className="size-5 text-white/70" />}</motion.span><span className="min-w-0 max-w-32 text-left"><span className="block truncate text-sm font-medium">{currentSong.name}</span><span className="block truncate text-xs text-muted-foreground">{currentAlbum.artist}</span></span></button>
            <div className="relative flex size-10 items-center justify-center rounded-full" style={{ background: `conic-gradient(rgb(236 72 153) ${progress}%, hsl(var(--muted)) 0)` }}><Button variant="secondary" isIconOnly className="size-8 rounded-full" aria-label={isPlaying ? "暂停" : "播放"} onPress={togglePlay}>{isPlaying ? <Pause className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current" />}</Button></div><Button variant="ghost" isIconOnly className="size-8 rounded-full" aria-label="展开播放器" onPress={toggleExpanded}><Maximize2 className="size-4" /></Button><Button variant="ghost" isIconOnly className="size-8 rounded-full" aria-label="关闭播放器" onPress={closeMiniPlayer}><X className="size-4" /></Button>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

export default MiniPlayer;
