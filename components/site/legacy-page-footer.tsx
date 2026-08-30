import type { ReactNode } from "react";
import Link from "next/link";

import styles from "@/components/site/legacy-page-footer.module.css";

export function LegacyPageFooter({ children }: { children?: ReactNode }) {
  return (
    <footer className={`slide-enter prose ${styles.footer}`}>
      {children}
      <br />
      <Link className={styles.backLink} href="/" />
    </footer>
  );
}
