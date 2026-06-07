import type { Metadata } from "next";
import { Suspense } from "react";

import { DesktopCallbackClient } from "./desktop-callback-client";

export const metadata: Metadata = {
  title: "正在打开糖果盘桌面端"
};

export default function DesktopCallbackPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">正在打开糖果盘桌面端...</div>}>
      <DesktopCallbackClient />
    </Suspense>
  );
}
