"use client";

/* eslint-disable @next/next/no-img-element */

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { MusicIcon } from "@/components/site/music-icon";
import {
  firstPlayableTrack,
  formatMusicTime,
  parseLrc,
  type PublicMusicAlbum,
} from "@/lib/parity/music";

type MusicNowPlayingProps = {
  album: PublicMusicAlbum | null;
  currentSongIndex: number;
  currentTime: number;
  isPlaying: boolean;
  lyricsMap: Record<string, string>;
  panelOpen: boolean;
  playbackRate: number;
  onPlayAlbum: (album: PublicMusicAlbum, index: number) => void;
  onSeek: (seconds: number) => void;
  onTogglePanel: () => void;
  onTogglePlay: () => void;
};

type FloatingNote = {
  id: number;
  glyph: string;
  style: CSSProperties;
};

function useStageFit(album: PublicMusicAlbum | null) {
  useEffect(() => {
    const wrapper = document.getElementById("music-page-wrapper");
    const stage = document.getElementById("now-playing-stage");
    const stageLeft = stage?.querySelector<HTMLElement>(".stage-left");
    const intro = document.getElementById("listening-intro");
    if (!wrapper || !stage || !stageLeft || !intro) return;

    let frame = 0;
    let settleTimer = 0;
    const update = () => {
      wrapper.classList.remove(
        "stage-compact-intro",
        "stage-hide-intro",
        "stage-hide-description",
        "stage-description-clipped",
      );
      wrapper.style.removeProperty("--stage-player-max-size");
      wrapper.style.removeProperty("--stage-intro-fit");
      wrapper.style.removeProperty("--record-description-max-height");

      const corridor = document.querySelector<HTMLElement>("#album-gallery .corridor-plane");
      const firstCell = corridor?.querySelector<HTMLElement>('.corridor-cell[data-copy="1"]');
      const width = stage.clientWidth || window.innerWidth;

      if (!album) {
        if (corridor && firstCell) {
          const stageRect = stage.getBoundingClientRect();
          const introRect = intro.getBoundingClientRect();
          const cellRect = firstCell.getBoundingClientRect();
          if (introRect.height > 0 && cellRect.height > 0) {
            const gap = width <= 767 ? 28 : width <= 960 ? 40 : 48;
            const targetCardTop = introRect.bottom - stageRect.top + gap;
            const currentCardTop = cellRect.top - stageRect.top;
            const currentTop = Number.parseFloat(getComputedStyle(corridor).top) || 0;
            const nextTop = Math.ceil(currentTop + targetCardTop - currentCardTop);
            const reflection = Math.min(120, cellRect.height * 0.55);
            corridor.style.top = `${nextTop}px`;
            wrapper.style.setProperty(
              "--music-intro-stage-height",
              `${Math.ceil(targetCardTop + cellRect.height + reflection + 48)}px`,
            );
          }
        }
        return;
      }

      corridor?.style.removeProperty("top");
      wrapper.style.removeProperty("--music-intro-stage-height");
      if (firstCell) {
        const stageRect = stage.getBoundingClientRect();
        const playerRect = stageLeft.getBoundingClientRect();
        const cellRect = firstCell.getBoundingClientRect();
        const availableHeight = Math.floor(
          Math.min(cellRect.top - 12, stageRect.bottom - 12) - playerRect.top,
        );
        wrapper.style.setProperty("--stage-player-max-size", `${Math.max(64, availableHeight)}px`);
      }

      if (width <= 767) {
        wrapper.classList.add("stage-hide-intro");
        return;
      }

      const stageRect = stage.getBoundingClientRect();
      const playerRect = stageLeft.getBoundingClientRect();
      const introInset = Math.max(48, Math.min(104, width * 0.06));
      const sectionGap = Math.max(28, width * 0.025);
      const available = Math.floor(playerRect.left - stageRect.left - introInset - sectionGap);
      const minimum = 240;
      wrapper.style.setProperty("--stage-intro-fit", `${Math.max(minimum, Math.min(544, available))}px`);
      wrapper.classList.toggle("stage-hide-intro", available < minimum);
      wrapper.classList.toggle("stage-compact-intro", available >= minimum && available < Math.min(544, width * 0.38));
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      frame = requestAnimationFrame(() => {
        update();
        frame = requestAnimationFrame(update);
      });
      settleTimer = window.setTimeout(() => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(update);
      }, 620);
    };

    const observer = new ResizeObserver(schedule);
    observer.observe(stage);
    observer.observe(intro);
    const corridor = document.querySelector<HTMLElement>("#album-gallery .corridor-plane");
    if (corridor) observer.observe(corridor);
    window.addEventListener("resize", schedule, { passive: true });
    schedule();

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, [album]);
}

export function MusicNowPlaying({
  album,
  currentSongIndex,
  currentTime,
  isPlaying,
  lyricsMap,
  panelOpen,
  playbackRate,
  onPlayAlbum,
  onSeek,
  onTogglePanel,
  onTogglePlay,
}: MusicNowPlayingProps) {
  const lyricsRef = useRef<HTMLDivElement>(null);
  const [selectedLyricIndex, setSelectedLyricIndex] = useState(-1);
  const [notes, setNotes] = useState<FloatingNote[]>([]);
  const currentSong = album?.songs[currentSongIndex] ?? null;
  const lines = useMemo(
    () => parseLrc(currentSong ? lyricsMap[currentSong.id] : null),
    [currentSong, lyricsMap],
  );
  const activeLineIndex = lines.findLastIndex((line) => line.time <= currentTime + 0.25);
  const firstLyricRemaining = lines.length ? lines[0].time - currentTime : -1;
  const countdownVisible = firstLyricRemaining > 0.25 && firstLyricRemaining <= 5.8;
  const activeCountdownDots = countdownVisible
    ? Math.max(1, Math.min(3, Math.ceil((5.85 - firstLyricRemaining) / (5.8 / 3))))
    : 0;

  useStageFit(album);

  useEffect(() => {
    setSelectedLyricIndex(-1);
  }, [currentSong?.id]);

  useEffect(() => {
    if (activeLineIndex < 0 || !lyricsRef.current) return;
    const line = lyricsRef.current.querySelectorAll<HTMLElement>(".lyric-line-shell")[activeLineIndex];
    if (!line) return;
    const top = line.offsetTop - (lyricsRef.current.clientHeight - line.offsetHeight) / 2;
    lyricsRef.current.scrollTo({ top: Math.max(0, top), behavior: "auto" });
  }, [activeLineIndex]);

  useEffect(() => {
    if (!isPlaying || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setNotes([]);
      return;
    }
    let sequence = 0;
    const glyphs = ["♪", "♫", "♩", "♬"];
    const spawn = () => {
      const id = Date.now() + sequence++;
      const duration = 2.2 + Math.random() * 1.6;
      const style = {
        "--note-dur": `${duration}s`,
        "--note-dx": `${(Math.random() * 2 - 0.6) * 3.4}rem`,
        "--note-rot": `${(Math.random() * 2 - 1) * 32}deg`,
        "--note-scale": String(0.8 + Math.random() * 0.7),
        "--note-alpha": String(0.55 + Math.random() * 0.35),
        fontSize: `${0.85 + Math.random() * 0.5}rem`,
      } as CSSProperties;
      setNotes((current) => [...current, { id, glyph: glyphs[id % glyphs.length], style }]);
      window.setTimeout(() => setNotes((current) => current.filter((note) => note.id !== id)), duration * 1000 + 100);
    };
    spawn();
    const timer = window.setInterval(spawn, 700);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const seekLine = (index: number) => {
    if (window.matchMedia("(max-width: 767px)").matches) {
      setSelectedLyricIndex(index);
      window.setTimeout(() => setSelectedLyricIndex((current) => current === index ? -1 : current), 5000);
      return;
    }
    onSeek(lines[index].time);
  };

  const year = album?.releaseDate?.slice(0, 4);
  const panelAvailable = Boolean(album?.songs.some((song) => song.url));

  return (
    <div className="now-playing-stage" id="now-playing-stage">
      <section
        aria-hidden={Boolean(album)}
        aria-labelledby="listening-intro-title"
        className={`listening-intro${album ? " is-hidden" : ""}`}
        id="listening-intro"
      >
        <h1 id="listening-intro-title">
          <span className="intro-title-lead">四种声音</span>
          <span className="intro-title-tail">一个时代</span>
        </h1>
        <p className="listening-intro-copy">
          这里收藏周杰伦、王力宏、陶喆与林俊杰的专辑，也把四位创作者放回完整唱片的语境。陶喆以松弛的律动重塑华语 R&amp;B，周杰伦把说唱、古典与中国式旋律带进流行音乐，王力宏在抒情、摇滚和东方元素之间拓宽制作边界，林俊杰则用细密旋律与宽阔声线记录城市情绪。这里不打乱曲序，也不把专辑压缩成热门单曲；挑一张封面，从第一首听到最后一首，感受开场、中段与尾声如何共同完成一段叙事。
        </p>
        <p className="listening-intro-hint">左右滑动浏览，轻触封面，从第一首开始听</p>
      </section>

      <section
        aria-hidden={!album}
        className={`record-context${album ? " has-album" : ""}`}
        id="record-context"
      >
        <h1 className="record-context-title" id="record-context-title">
          {album?.name ?? "正在播放的唱片"}
        </h1>
        <p className="record-context-meta" id="record-context-meta">
          {album ? [album.artist, year, `${album.songs.length} 首曲目`].filter(Boolean).join(" · ") : null}
        </p>
        <p className="record-context-description" id="record-context-description">
          {album?.description}
        </p>
      </section>

      <div className="stage-left">
        <div
          aria-hidden="true"
          className={`stage-vinyl${isPlaying ? " is-playing" : ""}`}
          id="stage-vinyl"
          style={{ "--spin-duration": `${3.6 / playbackRate}s` } as CSSProperties}
        >
          <div className="vinyl-disc">
            <div
              className="vinyl-label"
              id="vinyl-label"
              style={album?.cover ? { "--vinyl-cover": `url("${album.cover}")` } as CSSProperties : undefined}
            />
            <div className="vinyl-hole" />
          </div>
          <div
            className="tonearm"
            id="tonearm"
            onClick={() => album && onTogglePlay()}
            onKeyDown={(event) => {
              if (album && (event.key === "Enter" || event.key === " ")) onTogglePlay();
            }}
            role="button"
            tabIndex={album ? 0 : -1}
          >
            <div className="tonearm-pivot" />
            <div className="tonearm-rod" />
            <div className="tonearm-head" />
          </div>
          <div className="vinyl-notes" id="vinyl-notes">
            {notes.map((note) => <span className="note" key={note.id} style={note.style}>{note.glyph}</span>)}
          </div>
        </div>

        <div aria-label="歌词" className="lyrics-panel" id="lyrics-panel">
          {!lines.length ? (
            <p className="lyrics-empty" id="lyrics-empty">
              {album ? "这首作品暂未收录歌词" : null}
            </p>
          ) : null}
          <div className="lyrics-scroll" id="lyrics-scroll" ref={lyricsRef} tabIndex={lines.length ? 0 : -1}>
            {lines.length ? (
              <div aria-hidden="true" className={`lyric-countdown${countdownVisible ? " is-visible" : ""}`}>
                {[0, 1, 2].map((dot) => <span className={`countdown-dot${dot < activeCountdownDots ? " is-active" : ""}`} key={dot} />)}
              </div>
            ) : null}
            {lines.map((line, index) => (
              <div className={`lyric-line-shell${selectedLyricIndex === index ? " is-seek-selected" : ""}`} key={`${line.time}-${line.text}`}>
                <button
                  aria-label={`${line.text}，${formatMusicTime(line.time)}`}
                  className={`lyric-line${activeLineIndex === index ? " is-current" : ""}`}
                  onClick={() => seekLine(index)}
                  type="button"
                >
                  {line.text}
                </button>
                <button
                  aria-label={`从 ${formatMusicTime(line.time)} 播放《${line.text}》`}
                  className="lyric-seek-confirm"
                  onClick={() => {
                    onSeek(line.time);
                    setSelectedLyricIndex(-1);
                  }}
                  type="button"
                >
                  <MusicIcon name="play" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside
        aria-label="专辑曲目"
        className={`track-panel${panelAvailable ? " is-available" : ""}${panelOpen ? " is-open" : ""}`}
        id="track-panel"
      >
        <button
          aria-expanded={panelOpen}
          aria-label="展开或收起曲目"
          className="track-panel-handle"
          id="track-panel-handle"
          onClick={onTogglePanel}
          type="button"
        >
          <span className="handle-chevron"><MusicIcon name="chevron-left" /></span>
        </button>
        <div aria-hidden={!panelOpen} className="track-panel-body" id="track-panel-body">
          <header className="track-panel-head">
            <img
              alt={album ? `${album.name} 专辑封面` : "专辑封面"}
              className="panel-cover"
              id="panel-cover"
              src={album?.cover || "/joruno.png"}
            />
            <div className="panel-meta">
              <h2 className="panel-title" id="panel-title">{album?.name ?? "专辑"}</h2>
              <p className="panel-sub" id="panel-sub">
                {album ? [album.artist, year && `${year}年`].filter(Boolean).join(" · ") : null}
              </p>
              <button
                className="panel-play-all"
                disabled={!panelAvailable}
                id="panel-play-all"
                onClick={() => {
                  const first = firstPlayableTrack(album);
                  if (album && first >= 0) onPlayAlbum(album, first);
                }}
                type="button"
              >
                <MusicIcon name="play" /> {panelAvailable ? "播放专辑" : "音频待补充"}
              </button>
            </div>
          </header>
          <ol className="panel-tracks" id="panel-tracks">
            {album?.songs.map((song, index) => (
              <li key={song.id}>
                <button
                  className={`track-row${index === currentSongIndex ? " is-current" : ""}${!song.url ? " is-disabled" : ""}`}
                  data-song-id={song.id}
                  disabled={!song.url}
                  onClick={() => song.url && onPlayAlbum(album, index)}
                  type="button"
                >
                  <span className="track-no">{String(index + 1).padStart(2, "0")}</span>
                  <span className="track-name">{song.name}</span>
                  {!song.url ? <span className="track-tag">待补音频</span> : null}
                  <span className="track-dur">{song.duration}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}
