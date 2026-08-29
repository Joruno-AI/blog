import { redirect } from "next/navigation";

import { docsCourseById, docsCourseUrl } from "@/lib/docs/catalog";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const course = docsCourseById(decodeURIComponent((await params).id));
  redirect(course ? docsCourseUrl(course) : "/docs");
}
