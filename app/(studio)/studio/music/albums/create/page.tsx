import { Disc3 } from "lucide-react";

import { AlbumForm } from "@/components/music/album-form";

export default function CreateAlbumPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight"><Disc3 className="size-6 text-pink-500" />新建专辑</h1><p className="mt-1 text-sm text-muted-foreground">创建一张新专辑，添加封面和基本信息。</p></div>
      <AlbumForm mode="create" />
    </div>
  );
}
