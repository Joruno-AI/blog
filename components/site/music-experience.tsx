"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  Disc3,
  ListMusic,
  ListOrdered,
  Pause,
  Play,
  Repeat2,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type PublicMusicSong = {
  id: string;
  name: string;
  duration: string | null;
  durationSeconds: number | null;
  url: string | null;
  lyrics: string | null;
};

export type PublicMusicAlbum = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  artist: string;
  cover: string | null;
  color: string | null;
  releaseDate: string | null;
  songs: PublicMusicSong[];
};

type PlaybackMode = "order" | "shuffle" | "repeat";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

function lrcLines(source: string | null) {
  if (!source) return [];
  return source.split(/\r?\n/).flatMap((line) => {
    const matches = [...line.matchAll(/\[(\d{1,3}):(\d{2}(?:\.\d+)?)\]/g)];
    const text = line.replace(/\[[^\]]+\]/g, "").trim();
    return matches.map((match) => ({ time: Number(match[1]) * 60 + Number(match[2]), text }));
  }).filter((line) => line.text).sort((a, b) => a.time - b.time);
}

export function MusicExperience({ albums }: { albums: PublicMusicAlbum[] }) {
  const [albumIndex, setAlbumIndex] = useState<number | null>(null);
  const [songIndex, setSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mode, setMode] = useState<PlaybackMode>("order");
  const [rate, setRate] = useState(1);
  const [panelOpen, setPanelOpen] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const selectedAlbum = albumIndex === null ? null : albums[albumIndex];
  const selectedSong = selectedAlbum?.songs[songIndex] ?? null;
  const lyrics = useMemo(() => lrcLines(selectedSong?.lyrics ?? null), [selectedSong?.lyrics]);
  const activeLyric = Math.max(0, lyrics.findLastIndex((line) => line.time <= currentTime));

  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = before; };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = rate;
  }, [rate]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !selectedSong?.url) return;
    if (isPlaying) void audio.play().catch(() => setIsPlaying(false));
    else audio.pause();
  }, [isPlaying, selectedSong]);

  function selectAlbum(index: number) {
    setAlbumIndex(index);
    setSongIndex(0);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setPanelOpen(true);
  }

  function playSong(index: number) {
    if (!selectedAlbum?.songs[index]?.url) return;
    setSongIndex(index);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(true);
  }

  function nextSong() {
    if (!selectedAlbum?.songs.length) return;
    if (mode === "shuffle") {
      let next = songIndex;
      if (selectedAlbum.songs.length > 1) while (next === songIndex) next = Math.floor(Math.random() * selectedAlbum.songs.length);
      playSong(next);
      return;
    }
    const next = songIndex + 1;
    if (next < selectedAlbum.songs.length) playSong(next);
    else if (mode === "repeat") playSong(0);
    else setIsPlaying(false);
  }

  function previousSong() {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    if (!selectedAlbum?.songs.length) return;
    playSong(songIndex === 0 ? selectedAlbum.songs.length - 1 : songIndex - 1);
  }

  function seek(value: number) {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value;
    setCurrentTime(value);
  }

  return (
    <div
      className={`music-experience${selectedAlbum ? " has-album" : ""}`}
      style={{
        "--music-album-color": selectedAlbum?.color || "#9e8057",
        "--music-album-cover": selectedAlbum?.cover ? `url("${selectedAlbum.cover}")` : "none",
      } as React.CSSProperties}
    >
      <audio
        ref={audioRef}
        src={selectedSong?.url || undefined}
        preload="metadata"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || selectedSong?.durationSeconds || 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onEnded={nextSong}
      />
      <div className="music-ambient" aria-hidden="true"><span /><i /><b /></div>

      <section className={`music-intro${selectedAlbum ? " is-hidden" : ""}`} aria-labelledby="music-intro-title">
        <h1 id="music-intro-title"><strong>四种声音</strong><span>一个时代</span></h1>
        <p>这里收藏周杰伦、王力宏、陶喆与林俊杰的专辑，也把四位创作者放回完整唱片的语境。陶喆以松弛的律动重塑华语 R&amp;B，周杰伦把说唱、古典与中国式旋律带进流行音乐，王力宏在抒情、摇滚和东方元素之间拓宽制作边界，林俊杰则用细密旋律与宽阔声线记录城市情绪。这里不打乱曲序，也不把专辑压缩成热门单曲；挑一张封面，从第一首听到最后一首，感受开场、中段与尾声如何共同完成一段叙事。</p>
        <small>左右滑动浏览，轻触封面，从第一首开始听</small>
      </section>

      {selectedAlbum ? (
        <section className="music-record-context" aria-live="polite">
          <h1>{selectedAlbum.name}</h1>
          <p>{selectedAlbum.artist}{selectedAlbum.releaseDate ? ` · ${selectedAlbum.releaseDate.slice(0, 4)}` : ""}</p>
          {selectedAlbum.description ? <span>{selectedAlbum.description}</span> : null}
          <Link href={`/music/albums/${selectedAlbum.slug}`}>查看唱片资料</Link>
        </section>
      ) : null}

      {selectedAlbum ? (
        <section className="music-vinyl-stage" aria-label="正在播放">
          <div className={`music-vinyl${isPlaying ? " is-playing" : ""}`}>
            <span className="music-vinyl__grooves" />
            <span className="music-vinyl__label" style={selectedAlbum.cover ? { backgroundImage: `url("${selectedAlbum.cover}")` } : undefined} />
            <span className="music-vinyl__hole" />
          </div>
          <div className={`music-tonearm${isPlaying ? " is-playing" : ""}`} aria-hidden="true"><span /><i /><b /></div>
          <div className="music-lyrics" aria-label="歌词">
            {lyrics.length ? lyrics.slice(Math.max(0, activeLyric - 2), activeLyric + 4).map((line) => (
              <button className={line === lyrics[activeLyric] ? "active" : undefined} key={`${line.time}-${line.text}`} onClick={() => seek(line.time)} type="button">{line.text}</button>
            )) : <p>{selectedSong ? "这首歌暂时没有时间轴歌词" : "选择一首歌曲开始播放"}</p>}
          </div>
        </section>
      ) : null}

      <section className={`music-track-panel${panelOpen ? " is-open" : ""}`} aria-label="专辑曲目">
        {selectedAlbum ? (
          <>
            <button className="music-track-panel__handle" onClick={() => setPanelOpen((value) => !value)} type="button" aria-label="展开或收起曲目" aria-expanded={panelOpen}><ChevronLeft /></button>
            <div className="music-track-panel__body" aria-hidden={!panelOpen}>
              <header>
                {selectedAlbum.cover ? <img src={selectedAlbum.cover} alt={`${selectedAlbum.name}封面`} /> : <span><Disc3 /></span>}
                <div><h2>{selectedAlbum.name}</h2><p>{selectedAlbum.artist} · {selectedAlbum.songs.length} 首</p><button type="button" onClick={() => playSong(0)} disabled={!selectedAlbum.songs[0]?.url}><Play />播放专辑</button></div>
              </header>
              <ol>
                {selectedAlbum.songs.map((song, index) => (
                  <li key={song.id} className={index === songIndex ? "active" : undefined}>
                    <button type="button" onClick={() => playSong(index)} disabled={!song.url}>
                      <span>{index === songIndex && isPlaying ? <Pause /> : String(index + 1).padStart(2, "0")}</span>
                      <strong>{song.name}</strong>
                      <small>{song.duration || "—"}</small>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          </>
        ) : null}
      </section>

      <section className="music-album-gallery" aria-label="专辑长廊">
        <div className="music-album-band">
          {albums.map((album, index) => (
            <button className={index === albumIndex ? "active" : undefined} key={album.id} onClick={() => selectAlbum(index)} type="button">
              <span>{album.cover ? <img src={album.cover} alt={`${album.name}封面`} /> : <Disc3 />}</span>
              <strong>{album.name}</strong>
            </button>
          ))}
        </div>
      </section>

      {selectedAlbum ? (
        <section className={`music-playback-hub${dockCollapsed ? " is-collapsed" : ""}`} aria-label="音乐播放控制">
          {dockCollapsed ? <button className="music-dock-restore" type="button" onClick={() => setDockCollapsed(false)} aria-label="展开播放条"><ChevronDown /></button> : (
            <div className="music-dock">
              <div className="music-dock__track">
                {selectedAlbum.cover ? <img src={selectedAlbum.cover} alt="" /> : <Disc3 />}
                <span><strong>{selectedSong?.name || "请选择歌曲"}</strong><small>{selectedAlbum.artist} · {selectedAlbum.name}</small></span>
              </div>
              <div className="music-dock__transport">
                <div><button type="button" onClick={previousSong} aria-label="上一首"><SkipBack /></button><button className="music-dock__play" type="button" onClick={() => selectedSong?.url ? setIsPlaying((value) => !value) : playSong(0)} aria-label={isPlaying ? "暂停" : "播放"}>{isPlaying ? <Pause /> : <Play />}</button><button type="button" onClick={nextSong} aria-label="下一首"><SkipForward /></button></div>
                <label><span>{formatTime(currentTime)}</span><input aria-label="播放进度" type="range" min={0} max={duration || 1} step="0.1" value={Math.min(currentTime, duration || 0)} onChange={(event) => seek(Number(event.target.value))} /><span>{formatTime(duration || selectedSong?.durationSeconds || 0)}</span></label>
              </div>
              <div className="music-dock__actions">
                <div role="group" aria-label="播放模式"><button className={mode === "order" ? "active" : undefined} onClick={() => setMode("order")} type="button" aria-label="顺序播放"><ListOrdered /></button><button className={mode === "shuffle" ? "active" : undefined} onClick={() => setMode("shuffle")} type="button" aria-label="随机播放"><Shuffle /></button><button className={mode === "repeat" ? "active" : undefined} onClick={() => setMode("repeat")} type="button" aria-label="循环播放"><Repeat2 /></button></div>
                <div role="group" aria-label="播放速度">{[0.5, 1, 1.5, 2].map((value) => <button className={rate === value ? "active" : undefined} key={value} onClick={() => setRate(value)} type="button">{value === 0.5 ? ".5" : value}×</button>)}</div>
                <button type="button" onClick={() => setPanelOpen((value) => !value)} aria-label="曲目列表"><ListMusic /></button>
                <button type="button" onClick={() => setDockCollapsed(true)} aria-label="收起播放条"><ChevronDown /></button>
              </div>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
