import { CircleAlert } from "lucide-react";

export function WarningCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="prose warning-callout-shell">
      <div className="callout" data-callout="warning" data-collapsible="false">
        <div className="callout-title">
          <span className="callout-title-icon" aria-hidden="true"><CircleAlert /></span>
          <span className="callout-title-text">WARNING</span>
        </div>
        <div className="callout-content"><p>{children}</p></div>
      </div>
    </div>
  );
}
