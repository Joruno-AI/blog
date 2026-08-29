import { notFound } from "next/navigation";
import { AlbumForm } from "@/components/music/album-form";
import { getAlbumById } from "@/lib/db/queries/albums";


interface EditAlbumPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAlbumPage({ params }: EditAlbumPageProps) {
  const { id } = await params;
  const album = await getAlbumById(id);

  if (!album) {
    notFound();
  }

  return (
    <main className="studio-dashboard">
      <section className="studio-page-heading"><div><p className="studio-eyebrow">Music archive</p><h1>编辑专辑</h1><p>修改「{album.name}」的专辑信息</p></div></section>

      <AlbumForm album={album} mode="edit" />
    </main>
  );
}
