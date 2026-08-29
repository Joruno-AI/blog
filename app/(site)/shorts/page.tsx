import { SectionPage } from "@/components/site/section-page";

export const dynamic = "force-dynamic";

export default function ShortsPage() {
  return (
    <SectionPage
      kicker="Short Form"
      title="短内容"
      description="快速记录一个判断、一段实验或一条值得保留的线索。"
      types={["short"]}
      empty="短内容尚未发布。"
    />
  );
}
