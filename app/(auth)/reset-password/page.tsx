import { Suspense } from "react";

import { ResetPasswordCard } from "@/components/auth/reset-password-card";
import { CenterLoading } from "@/components/page-state";

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Suspense fallback={<CenterLoading />}>
        <ResetPasswordCard />
      </Suspense>
    </main>
  );
}
