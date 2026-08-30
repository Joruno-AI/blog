import Link from "next/link";
import type { CSSProperties } from "react";

const tabs = [
  { key: "overview", label: "精选", href: "/agent/", iconClass: "i-ri-dashboard-line" },
  { key: "all", label: "项目库", href: "/agent/all/", iconClass: "i-ri-apps-2-line" },
  { key: "scenes", label: "场景", href: "/agent/scenes/", iconClass: "i-ri-compass-3-line" },
  { key: "trending", label: "趋势", href: "/agent/trending/", iconClass: "i-ri-line-chart-line" },
  { key: "masters", label: "创作者", href: "/agent/masters/", iconClass: "i-ri-vip-crown-line" },
] as const;

export type AgentNavKey = (typeof tabs)[number]["key"];

export function AgentNav({ active }: { active: AgentNavKey }) {
  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.key === active));
  const style = {
    "--active-index": activeIndex,
    "--active-track-offset": `${activeIndex * -20}%`,
  } as CSSProperties;

  return (
    <div className="skills-nav-wrap">
      <nav className="skills-nav" aria-label="Agent 能力导航" style={style}>
        <span className="skills-nav-indicator" aria-hidden="true">
          <span className="skills-nav-indicator-track">
            {tabs.map(({ label, iconClass }) => <span className="skills-nav-indicator-item" key={label}><span className={`skills-nav-icon ${iconClass}`} /><span>{label}</span></span>)}
          </span>
        </span>
        {tabs.map(({ key, label, href, iconClass }, index) => (
          <Link className={`site-link no-underline skills-nav-tab ${key === active ? "is-active" : ""}`} data-tab-index={index} href={href} key={key} aria-current={key === active ? "page" : undefined}>
            <span className={`skills-nav-icon ${iconClass}`} aria-hidden="true" /><span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
