import { SectionPage } from "@/components/site/section-page";

export const dynamic = "force-dynamic";

export default function MusicPage() {
  return (
    <SectionPage
      kicker="Listening Archive"
      title="音乐"
      description="以专辑为线索整理声音、歌词和记忆。这里不是播放器列表，而是一份持续生长的听觉档案。"
      types={["album"]}
      empty="音乐档案正在整理。"
    />
  );
}
