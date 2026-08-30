"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  scriptProps,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      {...props}
      scriptProps={{
        ...scriptProps,
        // RootLayout owns the executable, pre-hydration theme bootstrap. The
        // next-themes copy is deliberately inert: Next's server minifier can
        // otherwise serialize a helper reference outside this inline script.
        type: "application/json",
        "data-theme-bootstrap": "inert-next-themes",
      }}
    >
      {children}
    </NextThemesProvider>
  );
}
