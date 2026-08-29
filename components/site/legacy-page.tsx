import Link from "next/link";

const agentTabs = [
  ["精选", "/agent"], ["全部", "/agent/all"], ["趋势", "/agent/trending"],
  ["创作者", "/agent/masters"], ["场景", "/agent/scenes"], ["分析", "/agent/analyzer"],
] as const;

export function LegacyPage({ title, subtitle, children, agentNav = false }: { title: string; subtitle?: string; children?: React.ReactNode; agentNav?: boolean }) {
  return <section className="prose legacy-page"><header className="standard-header centered"><h1>{title}</h1>{subtitle ? <p className="subtitle">{subtitle}</p> : null}{agentNav ? <nav className="legacy-tabs">{agentTabs.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}</nav> : null}</header>{children}</section>;
}

export function TabbedLegacyPage({ active, subtitle, children }: { active: "changelog" | "feeds" | "streams"; subtitle?: string; children?: React.ReactNode }) {
  const tabs = [["Changelog", "/changelog", "changelog"], ["AstroBlog", "/feeds", "feeds"], ["AstroStreams", "/streams", "streams"]] as const;
  return <section className="prose legacy-page"><nav className="tabbed-title">{tabs.map(([label, href, id]) => <Link className={id === active ? "active" : ""} href={href} key={id}>{label}</Link>)}</nav>{subtitle ? <p className="tabbed-subtitle">{subtitle}</p> : null}{children}</section>;
}
