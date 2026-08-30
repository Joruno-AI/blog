import type { Metadata } from "next";
import Link from "next/link";

import { HomeRevealController } from "@/components/site/home-reveal-controller";
import { PageStructuredData } from "@/components/site/page-structured-data";
import { legacyMetadata } from "@/lib/parity/legacy-metadata";
import "@/app/home-parity.css";

const description = "Joruno 的个人博客，记录 Web 开发、Agent 工具与编程实践。";

function HeadingAnchor({ id, label }: { id: string; label: string }) {
  return (
    <a
      className="header-anchor"
      tabIndex={0}
      aria-hidden="false"
      aria-label={`Link to ${label}`}
      data-pagefind-ignore=""
      href={`#${id}`}
    >
      #
    </a>
  );
}

export const metadata: Metadata = legacyMetadata({
  title: "Joruno",
  description,
  path: "/",
  image: "/og-images/og-image.png",
});

export default function HomePage() {
  return (
    <>
      <PageStructuredData path="/" title="Joruno" />
      <HomeRevealController />
      <article className="slide-enter-content prose">
        <div className="home-shell">
          <p className="home-kicker">Personal workbench · Web / Design / Agent</p>
          <h1 id="joruno-jobāna">Joruno <em>Jobāna</em><HeadingAnchor id="joruno-jobāna" label="Joruno Jobāna" /></h1>
          <p className="home-lead">我做 Web，也做一些让人与软件更容易相处的东西。</p>
          <h2 id="这里写什么">这里写什么<HeadingAnchor id="这里写什么" label="这里写什么" /></h2>
          <p>这个站点是我的公开工作台。我把做过的实验、查清的问题，以及那些值得再想一次的技术选择留在这里。</p>
          <p>文章不追求把一切讲完。我更在意它能不能把一个模糊的问题变得具体，给出可复现的路径，并且说清楚为什么这样做。所有长文都在<Link href="/blog">博客</Link>里。</p>
          <h2 id="正在关注">正在关注<HeadingAnchor id="正在关注" label="正在关注" /></h2>
          <p>我长期关注前端工程、交互设计和 Agent 工具。比起追新名词，我更喜欢把一个工具真正用进工作流，看它究竟节省了什么，又引入了什么新问题。</p>
          <p>代码之外，我也听歌、弹琴，偶尔把一段不着急得出结论的时间留给书和纪录片。</p>
          <h2 id="联系">联系<HeadingAnchor id="联系" label="联系" /></h2>
          <p>如果你想讨论一个技术问题，或者只是想打个招呼：<a href="mailto:wsl1710642275@gmail.com">wsl1710642275@gmail.com</a></p>
        </div>
      </article>
    </>
  );
}
