import { SectionPage } from "@/components/site/section-page";

export const dynamic = "force-dynamic";

export default function ShortsPage() {
  return (
    <SectionPage
      kicker="Short Form"
      title="Shorts"
      description="Share your short notes or quick thoughts"
      types={["short"]}
      empty="No content available for display."
    />
  );
}
