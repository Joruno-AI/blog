import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Music2 } from "lucide-react";
import { notFound } from "next/navigation";

import { MarkdownContent } from "@/components/site/markdown-content";
import { getPublicAlbum } from "@/modules/music/application/queries";
import { getRequestViewer } from "@/lib/auth/request-viewer";

export const dynamic = "force-dynamic";

type AlbumPageProps = { params: Promise<{ slug: string }> };

function albumPath(slug: string) {
  return `/music/albums/${decodeURIComponent(slug)}`;
}

export async function generateMetadata({ params }: AlbumPageProps): Promise<Metadata> {
  const { slug } = await params;
  const album = await getPublicAlbum(albumPath(slug), await getRequestViewer());
  if (!album) notFound();
  return {
    title: album.resource.title,
    description: album.resource.description ?? undefined,
    alternates: { canonical: album.resource.path },
  };
}

export default async function AlbumPage({ params }: AlbumPageProps) {
  const { slug } = await params;
  const album = await getPublicAlbum(albumPath(slug), await getRequestViewer());
  if (!album) notFound();

  return (
    <div className="site-shell album-page">
      <Link className="article-back" href="/music">
        <ArrowLeft aria-hidden="true" />
        返回音乐档案
      </Link>

      <header className="album-hero">
        <div className="album-cover" style={{ backgroundColor: album.color ?? undefined }}>
          {album.coverUrl ? (
            <Image
              src={album.coverUrl}
              alt={`${album.resource.title}封面`}
              fill
              sizes="(max-width: 760px) 90vw, 22rem"
            />
          ) : (
            <Music2 aria-hidden="true" />
          )}
        </div>
        <div>
          <p className="site-kicker">Album Archive</p>
          <h1>{album.resource.title}</h1>
          <p className="album-artist">{album.artist}</p>
          {album.resource.description ? <p>{album.resource.description}</p> : null}
          <div className="article-meta">
            <span>{album.tracks.length} 首</span>
            {album.releaseDate ? (
              <time dateTime={album.releaseDate.toISOString()}>
                {new Intl.DateTimeFormat("zh-CN", { dateStyle: "long" }).format(album.releaseDate)}
              </time>
            ) : null}
          </div>
        </div>
      </header>

      <section className="track-list" aria-label={`${album.resource.title}曲目`}>
        {album.tracks.map((track) => {
          const source = track.sourceType === "external" ? track.externalUrl : track.audioUrl;
          return (
            <article className="track-row" key={track.id}>
              <span>{String(track.trackNumber).padStart(2, "0")}</span>
              <div>
                <h2>{track.title}</h2>
                {track.duration ? <p>{track.duration}</p> : null}
              </div>
              {source ? <audio controls preload="none" src={source} /> : <span>暂无音源</span>}
              {track.lyrics ? (
                <details>
                  <summary>歌词</summary>
                  <MarkdownContent content={track.lyrics} />
                </details>
              ) : null}
            </article>
          );
        })}
      </section>
    </div>
  );
}
