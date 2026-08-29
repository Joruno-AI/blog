import { Disc3 } from "lucide-react";

import { AlbumForm } from "@/components/music/album-form";

export default function CreateAlbumPage() {
  return (
    <main className="studio-dashboard">
      <section className="studio-page-heading"><div><p className="studio-eyebrow">Music archive</p><h1 className="flex items-center gap-2"><Disc3 className="size-6" />新建专辑</h1><p>创建一张新专辑，添加封面和基本信息。</p></div></section>
      <AlbumForm mode="create" />
    </main>
  );
}
