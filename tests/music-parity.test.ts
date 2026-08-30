import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildLegacyMusicCatalog,
  firstPlayableTrack,
  formatMusicTime,
  isExactMusicRoute,
  legacyMusicSongState,
  parseMusicDuration,
  parseLrc,
  resolveAdjacentTrack,
  type PublicMusicAlbum,
} from "../lib/parity/music";
import { publicMusicCatalogFromBuildRows } from "../lib/parity/public-music-build";
import { getPublicContentSnapshot } from "../lib/parity/public-content-snapshot";
import { ASTRO_PUBLIC_CONTENT_BASELINE_REVISION } from "../lib/parity/public-content-snapshot-types";

const fixture: PublicMusicAlbum = {
  id: "album",
  name: "Album",
  artist: "Artist",
  description: null,
  cover: null,
  color: "#1a1a2e",
  releaseDate: null,
  songs: [
    { id: "0", name: "Unavailable", duration: "0:00", url: null, hasLyrics: false, quality: null },
    { id: "1", name: "One", duration: "1:00", url: "/music/one.mp3", hasLyrics: true, quality: null },
    { id: "2", name: "Two", duration: "2:00", url: "/music/two.mp3", hasLyrics: false, quality: null },
  ],
};

test("parses multi-timestamp LRC and preserves chronological lyric seeking", () => {
  assert.deepEqual(parseLrc("[00:05.20][00:07.00]First\n[00:03.00]Earlier\n[ar:Artist]"), [
    { time: 3, text: "Earlier" },
    { time: 5.2, text: "First" },
    { time: 7, text: "First" },
  ]);
  assert.equal(formatMusicTime(65.9), "1:05");
  assert.equal(parseMusicDuration("4:19"), 259);
  assert.equal(parseMusicDuration("1:02:03"), 3723);
  assert.equal(parseMusicDuration("invalid"), 0);
});

test("emits the exact production /music/data.json field contract", () => {
  const verifiedId = "e7101fbf-79c8-4447-b594-8c16ebe310ed";
  const verifiedUrl = "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/music/songs/e7101fbf-79c8-4447-b594-8c16ebe310ed-%25E5%258F%25AF%25E7%2588%25B1%25E5%25A5%25B3%25E4%25BA%25BA.mp3";
  const payload = buildLegacyMusicCatalog([{
    slug: "jay-chou-535790918",
    name: "Jay",
    artist: "周杰伦",
    description: "  album introduction  ",
    cover: null,
    color: null,
    releaseDate: new Date("2000-11-07T00:00:00.000Z"),
    songs: [
      {
        id: `track:${verifiedId}`,
        name: "可爱女人",
        duration: "3:59",
        sourceType: "upload",
        url: verifiedUrl,
        externalUrl: null,
      },
      {
        id: "track:not-in-production-map",
        name: "Unavailable",
        duration: null,
        sourceType: "external",
        url: null,
        externalUrl: null,
      },
    ],
  }]);

  assert.deepEqual(Object.keys(payload), ["albums"]);
  assert.deepEqual(Object.keys(payload.albums[0]), [
    "id", "name", "artist", "description", "cover", "color", "releaseDate", "songs",
  ]);
  assert.deepEqual(Object.keys(payload.albums[0].songs[0]), [
    "id", "name", "duration", "url", "hasLyrics", "quality",
  ]);
  assert.equal(payload.albums[0].description, "album introduction");
  assert.equal(payload.albums[0].color, "#1a1a2e");
  assert.equal(payload.albums[0].releaseDate, "2000-11-07T00:00:00.000Z");
  assert.equal(payload.albums[0].songs[0].id, verifiedId);
  assert.equal(payload.albums[0].songs[0].url, verifiedUrl);
  assert.equal(payload.albums[0].songs[0].hasLyrics, true);
  assert.deepEqual(payload.albums[0].songs[0].quality, {
    incomplete: false,
    lyricsMismatch: false,
    actualSeconds: 0,
    expectedSeconds: 0,
    studioStatus: "verified-studio-master",
    fingerprintSimilarity: 0.9175,
    lyricsAlignmentStatus: "verified-aligned",
  });
  assert.deepEqual(payload.albums[0].songs[1], {
    id: "not-in-production-map",
    name: "Unavailable",
    duration: "0:00",
    url: null,
    hasLyrics: false,
    quality: null,
  });
});

test("generates the static music endpoint from published revision snapshots", () => {
  const catalog = publicMusicCatalogFromBuildRows(
    [
      {
        id: "album:later",
        title: "Later",
        slug: "later",
        description: null,
        metadataJson: JSON.stringify({ order: 2, artist: "Revision artist", cover: null }),
        artist: "Draft artist",
        cover: "/draft-cover.jpg",
        color: null,
        releaseDate: null,
        sortOrder: 0,
        createdAt: 20,
      },
      {
        id: "album:first",
        title: "First",
        slug: "first",
        description: null,
        metadataJson: JSON.stringify({ order: 1 }),
        artist: "First artist",
        cover: null,
        color: "#123456",
        releaseDate: null,
        sortOrder: 9,
        createdAt: 10,
      },
    ],
    [
      {
        id: "track:second",
        albumId: "album:first",
        title: "Second",
        metadataJson: JSON.stringify({ trackNumber: 2, duration: "2:02" }),
        lyrics: "",
        duration: "9:09",
        durationSeconds: 0,
        audioUrl: "/second.mp3",
        externalUrl: null,
        sourceType: "upload",
        trackNumber: 1,
      },
      {
        id: "track:first",
        albumId: "album:first",
        title: "First",
        metadataJson: JSON.stringify({ trackNumber: 1, sourceType: "external", externalUrl: "https://example.test/first.mp3" }),
        lyrics: "[00:00.00]First",
        duration: "1:01",
        durationSeconds: 61,
        audioUrl: null,
        externalUrl: null,
        sourceType: "upload",
        trackNumber: 2,
      },
    ],
  );

  assert.deepEqual(catalog.albums.map((album) => album.id), ["first", "later"]);
  assert.equal(catalog.albums[1].artist, "Revision artist");
  assert.equal(catalog.albums[1].cover, null);
  assert.deepEqual(catalog.albums[0].songs.map((song) => song.id), ["first", "second"]);
  assert.equal(catalog.albums[0].songs[0].url, "https://example.test/first.mp3");
  assert.equal(catalog.albums[0].songs[1].duration, "2:02");
});

test("pins all 634 production audio-quality and lyric-validation records", () => {
  const raw = readFileSync(
    path.join(process.cwd(), "lib/parity/data/music-quality-data.json"),
    "utf8",
  );
  assert.equal(
    createHash("sha256").update(raw).digest("hex"),
    "13d63a14507f5c4b88c57d004e70da9cb90984b8ca4ff1ccd36dc6279a1eeca3",
  );
  assert.equal(Object.keys(JSON.parse(raw) as object).length, 634);

  const legacyUrl = "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/music/songs/0271c235-a8dd-4b09-97a8-85dbc86610a5-%25E5%25A8%2598%25E5%25AD%2590.mp3";
  const unavailable = legacyMusicSongState({
    id: "track:0271c235-a8dd-4b09-97a8-85dbc86610a5",
    url: legacyUrl,
  });
  assert.equal(unavailable.id, "0271c235-a8dd-4b09-97a8-85dbc86610a5");
  assert.equal(unavailable.url, null);
  assert.equal(unavailable.hasLyrics, false);
  assert.equal(unavailable.quality?.studioStatus, "correct-master-wrong-length");

  const migratedUnavailable = legacyMusicSongState({
    id: "track:0271c235-a8dd-4b09-97a8-85dbc86610a5",
    url: null,
    metadataJson: JSON.stringify({
      legacySongId: "0271c235-a8dd-4b09-97a8-85dbc86610a5",
    }),
  });
  assert.equal(migratedUnavailable.url, null);
  assert.equal(migratedUnavailable.hasLyrics, false);
  assert.equal(
    migratedUnavailable.quality?.studioStatus,
    "correct-master-wrong-length",
  );

  const cmsReplacement = legacyMusicSongState({
    id: "track:0271c235-a8dd-4b09-97a8-85dbc86610a5",
    url: "https://example.test/cms-replacement.mp3",
    lyrics: "[00:00.00]CMS lyrics",
  });
  assert.equal(cmsReplacement.url, "https://example.test/cms-replacement.mp3");
  assert.equal(cmsReplacement.hasLyrics, true);
  assert.equal(cmsReplacement.quality, null);
});

test("matches the Astro playable-track rules for order, shuffle and repeat-all", () => {
  assert.equal(firstPlayableTrack(fixture), 1);
  assert.equal(resolveAdjacentTrack({ album: fixture, currentIndex: 1, direction: 1, mode: "order" }), 2);
  assert.equal(resolveAdjacentTrack({ album: fixture, currentIndex: 2, direction: 1, mode: "order" }), null);
  assert.equal(resolveAdjacentTrack({ album: fixture, currentIndex: 2, direction: 1, mode: "repeat-all" }), 1);
  assert.equal(resolveAdjacentTrack({ album: fixture, currentIndex: 1, direction: -1, mode: "repeat-all" }), 2);
  assert.equal(resolveAdjacentTrack({ album: fixture, currentIndex: 1, direction: 1, mode: "shuffle", random: () => 0 }), 2);
});

test("shows the immersive shell only on the exact music route", () => {
  assert.equal(isExactMusicRoute("/music"), true);
  assert.equal(isExactMusicRoute("/music/"), true);
  assert.equal(isExactMusicRoute("/music/albums/jay"), false);
  assert.equal(isExactMusicRoute("/blog"), false);
});

test("mounts one persistent audio engine in SiteLayout instead of the route page", () => {
  const root = process.cwd();
  const layout = readFileSync(path.join(root, "app/(site)/layout.tsx"), "utf8");
  const page = readFileSync(path.join(root, "app/(site)/music/page.tsx"), "utf8");
  const player = readFileSync(path.join(root, "components/site/global-music-player.tsx"), "utf8");

  assert.equal((layout.match(/<GlobalMusicPlayer\s*\/>/g) ?? []).length, 1);
  assert.match(layout, /import "\.\.\/music-parity\.css"/);
  assert.doesNotMatch(page, /getAlbumsWithSongs|MusicExperience|<audio/);
  assert.match(player, /data-persistent-audio-engine="true"/);
  assert.match(player, /data-global-music-audio="true"/);
  assert.match(player, /usePathname\(\)/);
  assert.match(player, /className=\{`music-page-wrapper\$\{visible/);
});

test("serves the immutable Astro catalog as a zero-CPU static asset and keeps lyrics gated", () => {
  const root = process.cwd();
  const endpoint = readFileSync(path.join(root, "public/music/data.json"), "utf8");
  const lyrics = readFileSync(path.join(root, "app/(site)/music/lyrics/[file]/route.ts"), "utf8");

  const catalog = JSON.parse(endpoint) as { albums: PublicMusicAlbum[] };
  assert.ok(Array.isArray(catalog.albums));
  assert.ok(catalog.albums.every((album) => Array.isArray(album.songs)));
  assert.equal(getPublicContentSnapshot().contentRevision, ASTRO_PUBLIC_CONTENT_BASELINE_REVISION);
  assert.equal(
    createHash("sha256").update(endpoint).digest("hex"),
    "5a4dd47778d0075370068d561414e789905b10bf5b81d6f694c4fa07ae98f85d",
  );
  assert.equal(catalog.albums.length, 55);
  assert.equal(catalog.albums.reduce((total, album) => total + album.songs.length, 0), 634);
  assert.equal(Object.keys(catalog).join(","), "albums");
  assert.match(lyrics, /legacyMusicSongState/);
  assert.match(lyrics, /Object\.fromEntries/);
  assert.match(lyrics, /state\.hasLyrics/);
  assert.match(lyrics, /song\.lyrics!\.trim\(\)/);
});

test("ports the original corridor, vinyl, lyrics, queue and dock interactions", () => {
  const root = process.cwd();
  const gallery = readFileSync(path.join(root, "components/site/music-album-gallery.tsx"), "utf8");
  const stage = readFileSync(path.join(root, "components/site/music-now-playing.tsx"), "utf8");
  const player = readFileSync(path.join(root, "components/site/global-music-player.tsx"), "utf8");
  const css = readFileSync(path.join(root, "app/music-parity.css"), "utf8");

  assert.match(gallery, /\[0, 1, 2\]\.flatMap/);
  assert.match(gallery, /setPointerCapture/);
  assert.match(gallery, /velocity \+= delta \* 0\.08/);
  assert.match(stage, /className="vinyl-disc"/);
  assert.match(stage, /className="lyrics-scroll"/);
  assert.match(stage, /className=\{`track-panel/);
  assert.match(player, /MUSIC_PLAYBACK_RATES\.map/);
  assert.match(player, /repeat-one/);
  assert.match(player, /role="slider"/);
  assert.match(player, /event\.key === "ArrowLeft"/);
  assert.match(css, /\.corridor-cell/);
  assert.match(css, /-webkit-box-reflect:\s*below 2px/);
  assert.match(css, /\.stage-vinyl\.is-playing \.vinyl-disc/);
  assert.match(css, /\.playback-hub\.is-collapsed/);
  assert.match(css, /@media \(max-width: 767px\)/);
});
