import Link from "next/link";
import { AppWindow, Compass, Crown, LayoutDashboard, TrendingUp } from "lucide-react";

const tabs = [
  { key: "overview", label: "精选", href: "/agent", icon: LayoutDashboard },
  { key: "all", label: "项目库", href: "/agent/all", icon: AppWindow },
  { key: "scenes", label: "场景", href: "/agent/scenes", icon: Compass },
  { key: "trending", label: "趋势", href: "/agent/trending", icon: TrendingUp },
  { key: "masters", label: "创作者", href: "/agent/masters", icon: Crown },
] as const;

export type AgentNavKey = (typeof tabs)[number]["key"];

export function AgentNav({ active }: { active: AgentNavKey }) {
  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.key === active));
  return (
    <div className="skills-nav-wrap">
      <nav className="skills-nav" aria-label="Agent 能力导航" style={{ "--active-index": activeIndex } as React.CSSProperties}>
        <span className="skills-nav-indicator" aria-hidden="true">
          <span className="skills-nav-indicator-track">
            {tabs.map(({ label, icon: Icon }) => <span className="skills-nav-indicator-item" key={label}><Icon /><span>{label}</span></span>)}
          </span>
        </span>
        {tabs.map(({ key, label, href, icon: Icon }) => (
          <Link className="skills-nav-tab" href={href} key={key} aria-current={key === active ? "page" : undefined}>
            <Icon aria-hidden="true" /><span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
