import type { Metadata } from "next";

import { LegacyPageFooter } from "@/components/site/legacy-page-footer";
import { legacyMetadata } from "@/lib/parity/legacy-metadata";
import "@/app/not-found-parity.css";

// Next reserves `/404` for its framework fallback. This ordinary route is the
// private render target used by the Worker and middleware; its URL is never a
// public document and its canonical metadata therefore always points to /404/.
export const metadata: Metadata = legacyMetadata({
  title: "404",
  description: "Page not found",
  path: "/404/",
});

export default function InternalLegacyNotFoundPage() {
  return (
    <>
      <header className="prose mx-auto legacy-not-found-header">
        <h1>404</h1>
      </header>
      <article className="slide-enter-content prose mx-auto legacy-not-found-body">
        <p>Nice to meet you tho!</p>
      </article>
      <LegacyPageFooter />
    </>
  );
}
