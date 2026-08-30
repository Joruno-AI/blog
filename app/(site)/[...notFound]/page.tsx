import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { legacyMetadata } from "@/lib/parity/legacy-metadata";

export const metadata: Metadata = legacyMetadata({ title: "404", description: "Page not found", path: "/404/" });

export default function UnknownSitePath() {
  notFound();
}
