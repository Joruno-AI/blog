import { SectionPage } from "@/components/site/section-page";

export const dynamic = "force-dynamic";

export default function KnowledgePage() {
  return (
    <SectionPage
      kicker="Knowledge System"
      title="知识"
      description="把散落的研究、方法和课程整理成有结构、可检索、可继续生长的知识系统。"
      types={["document", "course", "lesson", "collection"]}
      empty="知识库正在整理，第一批文档发布后会出现在这里。"
    />
  );
}
