import Image from "next/image";
import Link from "next/link";

import { listPublicPhotos } from "@/modules/photos/application/queries";

export const dynamic = "force-dynamic";

export default async function PhotosPage() {
  const photos = await listPublicPhotos();
  return (
    <div className="site-shell listing-page photo-listing-page astro-photos-index">
      <header className="prose standard-header text-center">
        <h1>Photos</h1>
        <p className="subtitle">Create your personal gallery</p>
      </header>
      {photos.length ? (
        <section className="photo-grid" aria-label="照片列表">
          {photos.map((photo, index) => (
            <Link className="photo-card" href={photo.path} key={photo.id}>
              <Image
                src={photo.url}
                alt={photo.title}
                fill
                sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 33vw"
                priority={index < 3}
              />
              <span className="photo-card__veil" />
              <div>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h2>{photo.title}</h2>
              </div>
            </Link>
          ))}
        </section>
      ) : <div className="site-empty">照片集尚未发布。</div>}
    </div>
  );
}
