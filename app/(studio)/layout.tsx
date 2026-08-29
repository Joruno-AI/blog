import React from 'react'
import { DashboardLayout } from '@/components/layout/studio-layout'
import { AppProviders } from '@/components/platform/app-providers'

// Studio pages are authenticated, session-aware application routes. Rendering
// them at request time also prevents client-only form and upload libraries from
// being evaluated during static generation.
export const dynamic = 'force-dynamic'

export default async function StudioRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <AppProviders><DashboardLayout>{children}</DashboardLayout></AppProviders>
}
