import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "内容未找到",
  robots: { index: false, follow: true },
};

export default function NotFoundPage() {
  return (
    <section className="site-shell site-state">
      <p className="site-kicker">404</p>
      <h1>这份内容还不在这里</h1>
      <p>它可能已经移动，或仍在工作台里继续生长。</p>
      <Link className="site-button site-button--primary" href="/">
        返回首页
      </Link>
    </section>
  );
}
