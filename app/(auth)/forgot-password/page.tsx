import { Suspense } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { CenterLoading } from "@/components/page-state";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Suspense fallback={<CenterLoading />}>
        <AuthCard mode="forgot" />
      </Suspense>
    </main>
  );
}
