import { AuthProvider } from "@/contexts/auth-context";
import type * as React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
