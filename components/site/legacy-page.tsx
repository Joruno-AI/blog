import Link from "next/link";

export function LegacyPage({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return <section className="prose legacy-page"><header className="standard-header centered"><h1>{title}</h1>{subtitle ? <p className="subtitle">{subtitle}</p> : null}</header>{children}</section>;
}

export function TabbedLegacyPage({ active, subtitle, children }: { active: "changelog" | "feeds" | "streams"; subtitle?: string; children?: React.ReactNode }) {
  const tabs = [["Changelog", "/changelog", "changelog"], ["AstroBlog", "/feeds", "feeds"], ["AstroStreams", "/streams", "streams"]] as const;
  return <section className="prose legacy-page"><nav className="tabbed-title">{tabs.map(([label, href, id]) => <Link className={id === active ? "active" : ""} href={href} key={id}>{label}</Link>)}</nav>{subtitle ? <p className="tabbed-subtitle">{subtitle}</p> : null}{children}</section>;
}
