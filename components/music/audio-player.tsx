"use client";

/* eslint-disable @next/next/no-img-element */

import { Button, Spinner } from "@heroui/react";
import { Pause, Play, Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";


interface AudioPlayerProps { src: string; title?: string; artist?: string; cover?: string; color?: string; onEnded?: () => void; mini?: boolean; autoPlay?: boolean; }
function formatTime(seconds: number) { if (!Number.isFinite(seconds)) return "0:00"; return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`; }

export function AudioPlayer({ src, title, artist, cover, color = "#ec4899", onEnded, mini = false, autoPlay = false }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [error, setError] = useState(false);
  const togglePlay = useCallback(async () => { const audio = audioRef.current; if (!audio) return; try { if (isPlaying) { audio.pause(); setIsPlaying(false); } else { setLoading(true); await audio.play(); setIsPlaying(true); } } catch { setError(true); } finally { setLoading(false); } }, [isPlaying]);
  useEffect(() => { setCurrentTime(0); setIsPlaying(false); setError(false); if (autoPlay && audioRef.current) void audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {}); }, [src, autoPlay]);
  const seek = (value: number) => { if (audioRef.current) audioRef.current.currentTime = value; setCurrentTime(value); };
  if (!src) return <p className="p-4 text-center text-sm text-muted-foreground">暂无音频</p>;
  return <div className={mini ? "flex w-full items-center gap-2" : "rounded-xl border p-5"} style={!mini ? { background: `linear-gradient(135deg, ${color}15, ${color}05)` } : undefined}><audio ref={audioRef} src={src} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)} onEnded={() => { setIsPlaying(false); setCurrentTime(0); onEnded?.(); }} onError={() => setError(true)} />{!mini && cover && <img src={cover} alt={title || ""} className="mb-4 size-16 rounded-full object-cover" />}<div className={mini ? "contents" : "space-y-4"}>{!mini && <div>{title && <h4 className="font-semibold">{title}</h4>}{artist && <p className="text-sm text-muted-foreground">{artist}</p>}</div>}<Button variant={mini ? "ghost" : "primary"} isIconOnly className="shrink-0 rounded-full" isDisabled={error} aria-label={isPlaying ? "暂停" : "播放"} onPress={() => void togglePlay()}>{loading ? <Spinner color="current" size="sm" /> : isPlaying ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}</Button><div className={mini ? "min-w-0 flex-1" : "space-y-1"}><input type="range" min={0} max={duration || 100} step=".1" value={currentTime} aria-label="播放进度" onChange={(event) => seek(Number(event.target.value))} className="h-1.5 w-full" style={{ accentColor: color }} /><div className="flex justify-between text-xs text-muted-foreground"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div></div>{!mini && <div className="flex items-center gap-2"><Volume2 className="size-4 text-muted-foreground" /><input type="range" min={0} max={100} value={volume} aria-label="音量" onChange={(event) => { const next = Number(event.target.value); setVolume(next); if (audioRef.current) audioRef.current.volume = next / 100; }} className="w-28" style={{ accentColor: color }} /></div>}</div>{error && <p className="mt-2 text-sm text-destructive">音频加载失败</p>}</div>;
}

export default AudioPlayer;
