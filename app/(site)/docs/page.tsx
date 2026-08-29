import { SectionPage } from "@/components/site/section-page";

export const dynamic = "force-dynamic";

export default function DocsPage() {
  return (
    <SectionPage
      kicker="Documentation"
      title="文档"
      description="项目说明、接口文档和可以直接复用的实施手册。"
      types={["document"]}
      empty="公开文档尚未发布。"
    />
  );
}
