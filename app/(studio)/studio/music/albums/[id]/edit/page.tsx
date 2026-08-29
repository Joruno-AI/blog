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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">编辑专辑</h1>
        <p className="text-gray-500">
          修改「{album.name}」的专辑信息
        </p>
      </div>

      <AlbumForm album={album} mode="edit" />
    </div>
  );
}
