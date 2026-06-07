import { Suspense } from "react";

import { FileManager } from "@/components/file-manager/file-manager";
import { CenterLoading } from "@/components/page-state";

export default function FilesPage() {
  return (
    <Suspense fallback={<CenterLoading />}>
      <FileManager />
    </Suspense>
  );
}
