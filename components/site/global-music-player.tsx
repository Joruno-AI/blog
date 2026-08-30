"use client";

/* eslint-disable @next/next/no-img-element */

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { MusicAlbumGallery } from "@/components/site/music-album-gallery";
import { MusicIcon } from "@/components/site/music-icon";
import { MusicLightRays } from "@/components/site/music-light-rays";
import { MusicNowPlaying } from "@/components/site/music-now-playing";
import {
  firstPlayableTrack,
  formatMusicTime,
  isExactMusicRoute,
  MUSIC_CATALOG_ENDPOINT,
  MUSIC_DEFAULT_COLOR,
  MUSIC_PLAYBACK_RATES,
  parseMusicDuration,
  resolveAdjacentTrack,
  type MusicCatalogPayload,
  type PlaybackMode,
  type PublicMusicAlbum,
} from "@/lib/parity/music";

type FlightState = {
  animation: Animation | null;
  element: HTMLElement | null;
  id: number;
};

async function flyVinylFrom(sourceRect: DOMRect, cover: string | null, state: FlightState) {
  const vinyl = document.getElementById("stage-vinyl");
  if (!vinyl || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const flightId = ++state.id;
  state.animation?.cancel();
  state.element?.remove();
  state.animation = null;
  state.element = null;
  vinyl.style.opacity = "0";

  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  if (flightId !== state.id) return;
  const target = vinyl.getBoundingClientRect();
  const size = Math.min(sourceRect.width, sourceRect.height);
  if (size <= 0 || target.width <= 0 || target.height <= 0) {
    vinyl.style.removeProperty("opacity");
    return;
  }

  const ghost = document.createElement("div");
  state.element = ghost;
  ghost.className = "vinyl-ghost";
  Object.assign(ghost.style, {
    position: "fixed",
    zIndex: "200",
    pointerEvents: "none",
    left: `${sourceRect.left + sourceRect.width / 2 - size / 2}px`,
    top: `${sourceRect.top + sourceRect.height / 2 - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "50%",
    background: "radial-gradient(circle at 50% 50%, transparent 0 17%, rgb(0 0 0 / 35%) 18% 19%, transparent 20%), repeating-radial-gradient(circle, rgba(255,255,255,0.05) 0 1px, transparent 1px 4px), radial-gradient(circle, #202124 0 26%, #0d0e10 27% 100%)",
    boxShadow: "0 1rem 2.4rem rgb(0 0 0 / 55%)",
  });
  const label = document.createElement("div");
  Object.assign(label.style, {
    position: "absolute",
    inset: "31%",
    borderRadius: "50%",
    background: cover ? `url("${cover}") center/cover` : "var(--album-color, #333)",
    boxShadow: "inset 0 0 0 2px rgb(0 0 0 / 35%)",
  });
  ghost.appendChild(label);
  document.body.appendChild(ghost);

  const differenceX = target.left + target.width / 2 - (sourceRect.left + sourceRect.width / 2);
  const differenceY = target.top + target.height / 2 - (sourceRect.top + sourceRect.height / 2);
  const scale = target.width / size;
  const distance = Math.hypot(differenceX, differenceY);
  const lift = Math.min(86, Math.max(28, distance * 0.14));
  const duration = Math.min(1120, Math.max(860, 760 + distance * 0.42));
  const animation = ghost.animate([
    { transform: "translate(0, 0) rotate(0deg) scale(1)", opacity: 1 },
    {
      transform: `translate(${differenceX * 0.52}px, ${differenceY * 0.52 - lift}px) rotate(190deg) scale(${(1 + scale) / 2})`,
      opacity: 1,
      offset: 0.52,
    },
    {
      transform: `translate(${differenceX}px, ${differenceY}px) rotate(360deg) scale(${scale})`,
      opacity: 1,
    },
  ], { duration, easing: "cubic-bezier(0.4, 0, 0.2, 1)" });
  state.animation = animation;
  try {
    await animation.finished;
  } catch {
    // A second album click intentionally cancels the previous flight.
  }
  ghost.remove();
  if (flightId !== state.id) return;
  state.element = null;
  state.animation = null;
  vinyl.style.removeProperty("opacity");
  vinyl.animate([
    { transform: "scale(0.96)", opacity: 0.72 },
    { transform: "scale(1)", opacity: 1 },
  ], { duration: 280, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
}

function validateCatalog(value: unknown): PublicMusicAlbum[] {
  if (!value || typeof value !== "object") return [];
  const albums = (value as Partial<MusicCatalogPayload>).albums;
  if (!Array.isArray(albums)) return [];
  return albums.filter((album): album is PublicMusicAlbum =>
    Boolean(album && typeof album.id === "string" && Array.isArray(album.songs)),
  );
}

export function GlobalMusicPlayer() {
  const pathname = usePathname();
  const visible = isExactMusicRoute(pathname);
  const audioRef = useRef<HTMLAudioElement>(null);
  const selectedAlbumRef = useRef<PublicMusicAlbum | null>(null);
  const songIndexRef = useRef(0);
  const isPlayingRef = useRef(false);
  const modeRef = useRef<PlaybackMode>("order");
  const rateRef = useRef(1);
  const requestRef = useRef(0);
  const catalogRequestedRef = useRef(false);
  const flightRef = useRef<FlightState>({ animation: null, element: null, id: 0 });
  const lyricsCacheRef = useRef(new Map<string, Record<string, string>>());

  const [albums, setAlbums] = useState<PublicMusicAlbum[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>("order");
  const [panelOpen, setPanelOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [lyricsMap, setLyricsMap] = useState<Record<string, string>>({});

  const selectedAlbum = useMemo(
    () => albums.find((album) => album.id === selectedAlbumId) ?? null,
    [albums, selectedAlbumId],
  );
  const currentSong = selectedAlbum?.songs[currentSongIndex] ?? null;
  const displayDuration = duration || parseMusicDuration(currentSong?.duration);
  const progressRatio = displayDuration > 0 ? Math.min(1, currentTime / displayDuration) : 0;

  selectedAlbumRef.current = selectedAlbum;
  songIndexRef.current = currentSongIndex;
  isPlayingRef.current = isPlaying;
  modeRef.current = playbackMode;
  rateRef.current = playbackRate;

  useEffect(() => {
    if (!visible || albums.length || catalogRequestedRef.current) return;
    catalogRequestedRef.current = true;
    void fetch(MUSIC_CATALOG_ENDPOINT)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Music catalog returned HTTP ${response.status}`);
        return response.json() as Promise<unknown>;
      })
      .then((payload) => setAlbums(validateCatalog(payload)))
      .catch((error: unknown) => {
        catalogRequestedRef.current = false;
        console.error("[music] failed to load albums", error);
      });
  }, [albums.length, visible]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--music-album-color", selectedAlbum?.color || MUSIC_DEFAULT_COLOR);
    if (selectedAlbum?.cover) root.style.setProperty("--music-album-cover", `url("${selectedAlbum.cover}")`);
  }, [selectedAlbum]);

  useEffect(() => {
    if (!selectedAlbum) {
      setLyricsMap({});
      return;
    }
    const cached = lyricsCacheRef.current.get(selectedAlbum.id);
    if (cached) {
      setLyricsMap(cached);
      return;
    }
    if (!selectedAlbum.songs.some((song) => song.hasLyrics)) {
      lyricsCacheRef.current.set(selectedAlbum.id, {});
      setLyricsMap({});
      return;
    }
    const controller = new AbortController();
    void fetch(`/music/lyrics/${encodeURIComponent(selectedAlbum.id)}.json`, { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<unknown> : {})
      .then((payload) => {
        const candidate = payload && typeof payload === "object" && "lyrics" in payload
          ? (payload as { lyrics?: unknown }).lyrics
          : payload;
        const map = candidate && typeof candidate === "object" && !Array.isArray(candidate)
          ? candidate as Record<string, string>
          : {};
        lyricsCacheRef.current.set(selectedAlbum.id, map);
        setLyricsMap(map);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) console.warn("[music] failed to load lyrics", error);
      });
    return () => controller.abort();
  }, [selectedAlbum]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => () => {
    flightRef.current.id += 1;
    flightRef.current.animation?.cancel();
    flightRef.current.element?.remove();
  }, []);

  const playTrack = useCallback((album: PublicMusicAlbum, index: number) => {
    const song = album.songs[index];
    const audio = audioRef.current;
    if (!song?.url || !audio) return;
    const request = ++requestRef.current;
    selectedAlbumRef.current = album;
    songIndexRef.current = index;
    setSelectedAlbumId(album.id);
    setCurrentSongIndex(index);
    setCurrentTime(0);
    setDuration(parseMusicDuration(song.duration));
    audio.pause();
    audio.src = song.url;
    audio.playbackRate = rateRef.current;
    audio.load();
    const playPromise = audio.play();
    if (playPromise) {
      void playPromise.then(() => {
        if (request !== requestRef.current) return;
        isPlayingRef.current = true;
        setIsPlaying(true);
      }).catch((error: DOMException) => {
        if (request !== requestRef.current) return;
        isPlayingRef.current = false;
        setIsPlaying(false);
        if (error.name !== "AbortError" && error.name !== "NotAllowedError") {
          console.error("[music-engine] playback error", error);
        }
      });
    }
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    const album = selectedAlbumRef.current;
    if (!audio || !album) return;
    if (isPlayingRef.current) {
      audio.pause();
      isPlayingRef.current = false;
      setIsPlaying(false);
      return;
    }
    if (audio.src) {
      void audio.play().then(() => {
        isPlayingRef.current = true;
        setIsPlaying(true);
      }).catch((error: DOMException) => {
        if (error.name !== "AbortError" && error.name !== "NotAllowedError") {
          console.error("[music-engine] resume error", error);
        }
      });
      return;
    }
    const first = firstPlayableTrack(album);
    if (first >= 0) playTrack(album, first);
  }, [playTrack]);

  const seekToTime = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(seconds)) return;
    const safe = Math.max(0, Math.min(seconds, audio.duration || seconds));
    audio.currentTime = safe;
    setCurrentTime(safe);
    if (!isPlayingRef.current && audio.src) {
      void audio.play().then(() => {
        isPlayingRef.current = true;
        setIsPlaying(true);
      }).catch(() => undefined);
    }
  }, []);

  const seekToRatio = useCallback((ratio: number) => {
    const audio = audioRef.current;
    const safeRatio = Math.max(0, Math.min(1, ratio));
    const availableDuration = audio?.duration
      || parseMusicDuration(selectedAlbumRef.current?.songs[songIndexRef.current]?.duration);
    if (!audio || !availableDuration) return;
    audio.currentTime = safeRatio * availableDuration;
    setCurrentTime(audio.currentTime);
  }, []);

  const adjacentTrack = useCallback((direction: 1 | -1) => {
    const album = selectedAlbumRef.current;
    const next = resolveAdjacentTrack({
      album,
      currentIndex: songIndexRef.current,
      direction,
      mode: modeRef.current,
    });
    if (album && next !== null) playTrack(album, next);
  }, [playTrack]);

  const handleEnded = useCallback(() => {
    const album = selectedAlbumRef.current;
    if (!album) return;
    if (modeRef.current === "repeat-one") {
      playTrack(album, songIndexRef.current);
      return;
    }
    const next = resolveAdjacentTrack({
      album,
      currentIndex: songIndexRef.current,
      direction: 1,
      mode: modeRef.current,
    });
    if (next === null) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      return;
    }
    playTrack(album, next);
  }, [playTrack]);

  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button, [role='slider'], [contenteditable='true']")) return;
      if (event.key === " ") {
        event.preventDefault();
        togglePlay();
      } else if (event.key === "ArrowLeft" && audioRef.current) {
        event.preventDefault();
        seekToTime(Math.max(0, audioRef.current.currentTime - 5));
      } else if (event.key === "ArrowRight" && audioRef.current) {
        event.preventDefault();
        seekToTime(audioRef.current.currentTime + 5);
      } else if (event.key === "Escape") {
        setPanelOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [seekToTime, togglePlay, visible]);

  const openAlbum = useCallback((album: PublicMusicAlbum, sourceRect: DOMRect) => {
    const first = firstPlayableTrack(album);
    setPanelOpen(false);
    if (first < 0) {
      setSelectedAlbumId(album.id);
      setCurrentSongIndex(0);
      setIsPlaying(false);
      return;
    }
    playTrack(album, first);
    void flyVinylFrom(sourceRect, album.cover, flightRef.current);
  }, [playTrack]);

  const changePlaybackMode = (requested: "order" | "shuffle" | "repeat-all") => {
    let next: PlaybackMode = requested;
    if (requested === "repeat-all") {
      next = playbackMode === "repeat-all"
        ? "repeat-one"
        : playbackMode === "repeat-one"
          ? "order"
          : "repeat-all";
    }
    modeRef.current = next;
    setPlaybackMode(next);
  };

  const seekFromPointer = (event: ReactPointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    seekToRatio((event.clientX - rect.left) / rect.width);
  };

  const albumStyle = {
    "--album-color": selectedAlbum?.color || MUSIC_DEFAULT_COLOR,
    "--album-cover": selectedAlbum?.cover ? `url("${selectedAlbum.cover}")` : "none",
  } as CSSProperties;

  return (
    <div data-persistent-audio-engine="true" id="global-music-player">
      <audio
        data-global-music-audio="true"
        onDurationChange={(event) => setDuration(event.currentTarget.duration || parseMusicDuration(currentSong?.duration))}
        onEnded={handleEnded}
        onError={() => {
          isPlayingRef.current = false;
          setIsPlaying(false);
        }}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || parseMusicDuration(currentSong?.duration))}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        preload="metadata"
        ref={audioRef}
      />
      <div
        aria-hidden={!visible}
        className={`music-page-wrapper${visible ? "" : " hidden"}${selectedAlbum ? " has-album" : ""}`}
        data-route-visible={visible || undefined}
        id="music-page-wrapper"
        style={albumStyle}
      >
        <div aria-hidden="true" className="music-ambient">
          <div className="music-ambient-cover" />
          <div className="music-ambient-light" />
          <MusicLightRays />
          <div className="music-ambient-noise" />
        </div>

        <div className="music-player-container">
          <div className="listening-stage">
            <MusicAlbumGallery
              activeAlbumId={selectedAlbumId}
              albums={albums}
              onOpen={openAlbum}
              visible={visible}
            />
            <MusicNowPlaying
              album={selectedAlbum}
              currentSongIndex={currentSongIndex}
              currentTime={currentTime}
              isPlaying={isPlaying}
              lyricsMap={lyricsMap}
              onPlayAlbum={playTrack}
              onSeek={seekToTime}
              onTogglePanel={() => setPanelOpen((open) => !open)}
              onTogglePlay={togglePlay}
              panelOpen={panelOpen}
              playbackRate={playbackRate}
            />
          </div>

          <section
            aria-label="音乐播放控制"
            className={`playback-hub${currentSong ? "" : " is-empty"}${collapsed ? " is-collapsed" : ""}`}
            id="playback-hub"
          >
            <div
              aria-hidden={collapsed}
              className={`now-playing-dock${currentSong ? "" : " is-empty"}`}
              id="mobile-mini-player"
            >
              <div className="mini-track">
                <img alt="" className="mini-track-cover" id="mini-track-cover" src={selectedAlbum?.cover || "/joruno.png"} />
                <div className="mini-track-copy">
                  <span className="mini-track-title" id="mini-track-title">
                    {currentSong?.name ?? "请选择一张唱片"}
                  </span>
                  <span className="mini-track-meta">
                    <span id="mini-track-artist">{selectedAlbum?.artist ?? "等待选曲"}</span>
                  </span>
                </div>
              </div>

              <div className="transport-center">
                <div className="mini-controls">
                  <button aria-label="上一首" className="mini-ctrl-btn" disabled={!currentSong} id="mini-prev" onClick={() => adjacentTrack(-1)} type="button">
                    <MusicIcon name="skip-back" />
                  </button>
                  <button aria-label={isPlaying ? "暂停" : "播放"} className="mini-ctrl-btn mini-play-btn" disabled={!currentSong} id="mini-play" onClick={togglePlay} type="button">
                    <MusicIcon name={isPlaying ? "pause" : "play"} />
                  </button>
                  <button aria-label="下一首" className="mini-ctrl-btn" disabled={!currentSong} id="mini-next" onClick={() => adjacentTrack(1)} type="button">
                    <MusicIcon name="skip-forward" />
                  </button>
                </div>
                <div className="mini-progress-line">
                  <span className="mini-progress-time" id="mini-current-time">{formatMusicTime(currentTime)}</span>
                  <div
                    aria-label="播放进度"
                    aria-orientation="horizontal"
                    aria-valuemax={100}
                    aria-valuemin={0}
                    aria-valuenow={Math.round(progressRatio * 100)}
                    aria-valuetext={`${formatMusicTime(currentTime)} / ${formatMusicTime(displayDuration)}`}
                    className="mini-progress"
                    id="mini-progress"
                    onKeyDown={(event) => {
                      const step = event.shiftKey ? 0.1 : 0.025;
                      if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
                        event.preventDefault();
                        seekToRatio(progressRatio - step);
                      } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
                        event.preventDefault();
                        seekToRatio(progressRatio + step);
                      } else if (event.key === "Home") {
                        event.preventDefault();
                        seekToRatio(0);
                      } else if (event.key === "End") {
                        event.preventDefault();
                        seekToRatio(1);
                      }
                    }}
                    onPointerDown={(event) => {
                      if (event.pointerType === "mouse" && event.button !== 0) return;
                      event.currentTarget.setPointerCapture(event.pointerId);
                      event.currentTarget.classList.add("is-seeking");
                      seekFromPointer(event);
                    }}
                    onPointerMove={(event) => {
                      if (event.currentTarget.hasPointerCapture(event.pointerId)) seekFromPointer(event);
                    }}
                    onPointerUp={(event) => {
                      seekFromPointer(event);
                      event.currentTarget.classList.remove("is-seeking");
                      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                    }}
                    role="slider"
                    tabIndex={currentSong ? 0 : -1}
                  >
                    <div className="mini-progress-fill" id="mini-progress-fill" style={{ width: `${progressRatio * 100}%` }} />
                  </div>
                  <span className="mini-progress-time" id="mini-duration">{formatMusicTime(displayDuration)}</span>
                </div>
              </div>

              <div className="dock-actions">
                <div aria-label="播放模式" className="dock-mode-options" role="group">
                  <button aria-label="顺序播放" aria-pressed={playbackMode === "order"} className={`dock-mode-btn${playbackMode === "order" ? " active" : ""}`} data-mode="order" onClick={() => changePlaybackMode("order")} title="顺序播放" type="button">
                    <MusicIcon name="order" />
                  </button>
                  <button aria-label="随机播放" aria-pressed={playbackMode === "shuffle"} className={`dock-mode-btn${playbackMode === "shuffle" ? " active" : ""}`} data-mode="shuffle" onClick={() => changePlaybackMode("shuffle")} title="随机播放" type="button">
                    <MusicIcon name="shuffle" />
                  </button>
                  <button
                    aria-label={playbackMode === "repeat-one" ? "单曲循环" : "列表循环"}
                    aria-pressed={playbackMode === "repeat-all" || playbackMode === "repeat-one"}
                    className={`dock-mode-btn${playbackMode === "repeat-all" || playbackMode === "repeat-one" ? " active" : ""}${playbackMode === "repeat-one" ? " is-repeat-one" : ""}`}
                    data-mode="repeat-all"
                    onClick={() => changePlaybackMode("repeat-all")}
                    title={playbackMode === "repeat-one" ? "单曲循环" : "列表循环"}
                    type="button"
                  >
                    <span aria-hidden="true" className="dock-repeat-symbol">
                      <MusicIcon name="repeat" /><span className="dock-repeat-one">1</span>
                    </span>
                  </button>
                </div>

                <div aria-label="播放速度" className="dock-speed-options" role="group">
                  {MUSIC_PLAYBACK_RATES.map((rate) => (
                    <button
                      aria-pressed={playbackRate === rate}
                      className={`dock-speed-btn${playbackRate === rate ? " active" : ""}`}
                      data-rate={rate}
                      key={rate}
                      onClick={() => {
                        rateRef.current = rate;
                        setPlaybackRate(rate);
                      }}
                      type="button"
                    >
                      {rate === 0.5 ? ".5" : rate}×
                    </button>
                  ))}
                </div>

                <button aria-label="收起播放条" className="dock-collapse-toggle" id="player-collapse-trigger" onClick={() => setCollapsed(true)} type="button">
                  <MusicIcon name="chevron-down" />
                </button>
              </div>
            </div>

            <button aria-label="展开播放条" className="dock-restore" id="player-expand-trigger" onClick={() => setCollapsed(false)} type="button">
              <MusicIcon name="chevron-up" />
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
