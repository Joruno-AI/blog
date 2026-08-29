import { PhotoGallery, type GalleryPhoto } from "@/components/site/photo-gallery";
import { listPublicPhotos } from "@/modules/photos/application/queries";

export const dynamic = "force-dynamic";

export default async function PhotosPage() {
  const photos = await listPublicPhotos();
  const galleryPhotos: GalleryPhoto[] = photos.map((photo) => ({
    id: photo.id,
    title: photo.title,
    description: photo.description,
    url: photo.url,
    width: photo.width,
    height: photo.height,
  }));
  return (
    <div className="site-shell listing-page photo-listing-page astro-photos-index">
      <header className="prose standard-header text-center">
        <h1>Photos</h1>
        <p className="subtitle">Create your personal gallery</p>
      </header>
      {photos.length ? (
        <PhotoGallery photos={galleryPhotos} />
      ) : <div className="site-empty">照片集尚未发布。</div>}
    </div>
  );
}
