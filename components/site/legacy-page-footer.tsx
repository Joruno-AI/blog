import type { ReactNode } from "react";
import Link from "next/link";

export function LegacyPageFooter({ children }: { children?: ReactNode }) {
  return (
    <footer className="slide-enter prose legacy-page-footer">
      {children}
      <br />
      <Link prefetch={false} className="legacy-page-footer-back-link" href="/" />
    </footer>
  );
}
