import { AgentNav, type AgentNavKey } from "@/components/site/agent-nav";

export function AgentPageShell({ active, title, subtitle, children }: {
  active: AgentNavKey;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="agent-page-shell">
      <header className="agent-page-head">
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <AgentNav active={active} />
      </header>
      {children}
    </main>
  );
}
