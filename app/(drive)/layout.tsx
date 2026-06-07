import { AppShell } from "@/components/app-shell";
import { AuthGate, AuthProvider } from "@/contexts/auth-context";
import type * as React from "react";

export default function DriveLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGate>
        <AppShell>{children}</AppShell>
      </AuthGate>
    </AuthProvider>
  );
}
