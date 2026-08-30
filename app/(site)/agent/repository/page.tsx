import type { Metadata } from "next";

import { AgentRepositoryFromQuery } from "@/components/site/agent-aggregate-islands";
import { legacyMetadata } from "@/lib/parity/legacy-metadata";

export const metadata: Metadata = legacyMetadata({
  title: "Agent 知识库",
  description: "基于仓库源码生成的站内知识库、架构地图与文件浏览器",
  path: "/agent/repository/",
  image: "/og-images/agent/repository.png",
});

export default function Page() {
  return <AgentRepositoryFromQuery />;
}
