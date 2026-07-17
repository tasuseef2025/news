"use client";

import { QueryProvider } from "@/components/providers/query-provider";
import { ReduxProvider } from "@/components/providers/redux-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ReduxProvider>
        <QueryProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </QueryProvider>
      </ReduxProvider>
    </SessionProvider>
  );
}
